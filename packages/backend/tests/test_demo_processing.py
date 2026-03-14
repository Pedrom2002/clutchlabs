"""Tests for the demo processing pipeline (DB storage)."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from src.services.demo_parser import ParsedDemo, PlayerData, RoundData


def _make_parsed_demo() -> ParsedDemo:
    """Create a realistic ParsedDemo for testing."""
    return ParsedDemo(
        map_name="de_mirage",
        tickrate=64,
        duration_seconds=2400.5,
        team1_name=None,
        team2_name=None,
        team1_score=13,
        team2_score=10,
        total_rounds=23,
        overtime_rounds=0,
        rounds=[
            RoundData(
                round_number=i + 1,
                winner_side="T" if i % 2 == 0 else "CT",
                win_reason="elimination",
                team1_score=(i + 1) // 2 + (1 if i % 2 == 0 else 0),
                team2_score=(i + 1) // 2 + (0 if i % 2 == 0 else 1),
                start_tick=i * 4000,
                end_tick=(i + 1) * 4000 - 500,
                duration_seconds=54.7,
            )
            for i in range(23)
        ],
        players=[
            PlayerData(
                steam_id="76561198000000001",
                name="s1mple",
                team_side="CT",
                kills=28,
                deaths=15,
                assists=4,
                headshot_kills=14,
                damage=2100,
                adr=91.3,
                flash_assists=2,
                enemies_flashed=5,
                utility_damage=120,
                first_kills=6,
                first_deaths=2,
            ),
            PlayerData(
                steam_id="76561198000000002",
                name="ZywOo",
                team_side="T",
                kills=22,
                deaths=18,
                assists=6,
                headshot_kills=10,
                damage=1800,
                adr=78.3,
                flash_assists=3,
                enemies_flashed=4,
                utility_damage=80,
                first_kills=4,
                first_deaths=3,
            ),
        ],
    )


_register_counter = 0


async def register_and_get_token(client: AsyncClient, email: str | None = None) -> str:
    global _register_counter  # noqa: PLW0603
    _register_counter += 1
    email = email or f"proc{_register_counter}@test.com"
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "org_name": f"Processing Test Team {_register_counter}",
            "email": email,
            "password": "securepassword123",
            "display_name": "Test User",
        },
    )
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_upload_parse_and_view_match(client: AsyncClient):
    """Full pipeline: upload demo -> mock parse -> view match detail."""
    token = await register_and_get_token(client)

    parsed = _make_parsed_demo()

    mock_upload = AsyncMock(return_value="abc123def456")
    mock_delay = lambda *args, **kwargs: None  # noqa: E731

    # Upload the demo
    with (
        patch("src.services.demo_service.upload_to_minio", mock_upload),
        patch("src.tasks.demo_processing.process_demo.delay", mock_delay),
    ):
        upload_resp = await client.post(
            "/api/v1/demos",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test_match.dem", b"fake demo content", "application/octet-stream")},
        )
    assert upload_resp.status_code == 201
    demo_id = upload_resp.json()["id"]

    # Simulate what the Celery task does: store match data
    # We need to get org_id from the demo
    from src.tasks.demo_processing import _get_demo_org_id, _store_match_data, _update_demo_status

    org_id = await _get_demo_org_id(demo_id)
    assert org_id is not None

    match_id = await _store_match_data(demo_id, org_id, parsed)
    await _update_demo_status(demo_id, "completed")

    # Verify demo detail shows the match
    demo_resp = await client.get(
        f"/api/v1/demos/{demo_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert demo_resp.status_code == 200
    demo_data = demo_resp.json()
    assert demo_data["status"] == "completed"
    assert demo_data["match"] is not None
    assert demo_data["match"]["map"] == "de_mirage"
    assert demo_data["match"]["team1_score"] == 13
    assert demo_data["match"]["team2_score"] == 10

    # Verify match detail endpoint
    match_resp = await client.get(
        f"/api/v1/demos/matches/{match_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert match_resp.status_code == 200
    match_data = match_resp.json()
    assert match_data["map"] == "de_mirage"
    assert match_data["total_rounds"] == 23
    assert len(match_data["rounds"]) == 23
    assert len(match_data["player_stats"]) == 2

    # Verify player stats
    players = sorted(match_data["player_stats"], key=lambda p: p["kills"], reverse=True)
    assert players[0]["player_name"] == "s1mple"
    assert players[0]["kills"] == 28
    assert players[0]["deaths"] == 15
    assert players[0]["adr"] == 91.3
    assert players[0]["headshot_kills"] == 14

    assert players[1]["player_name"] == "ZywOo"
    assert players[1]["kills"] == 22


@pytest.mark.asyncio
async def test_round_data_integrity(client: AsyncClient):
    """Verify round data is stored correctly with win reasons and scores."""
    token = await register_and_get_token(client)
    parsed = _make_parsed_demo()
    # Customize specific rounds
    parsed.rounds[0].win_reason = "bomb_exploded"
    parsed.rounds[0].bomb_planted = True
    parsed.rounds[0].plant_site = "A"
    parsed.rounds[1].win_reason = "defuse"
    parsed.rounds[1].bomb_planted = True
    parsed.rounds[1].bomb_defused = True
    parsed.rounds[1].plant_site = "B"

    mock_upload = AsyncMock(return_value="abc123")
    mock_delay = lambda *args, **kwargs: None  # noqa: E731

    with (
        patch("src.services.demo_service.upload_to_minio", mock_upload),
        patch("src.tasks.demo_processing.process_demo.delay", mock_delay),
    ):
        upload_resp = await client.post(
            "/api/v1/demos",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("rounds_test.dem", b"fake", "application/octet-stream")},
        )
    demo_id = upload_resp.json()["id"]

    from src.tasks.demo_processing import _get_demo_org_id, _store_match_data

    org_id = await _get_demo_org_id(demo_id)
    match_id = await _store_match_data(demo_id, org_id, parsed)

    match_resp = await client.get(
        f"/api/v1/demos/matches/{match_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    rounds = match_resp.json()["rounds"]
    assert rounds[0]["win_reason"] == "bomb_exploded"
    assert rounds[0]["plant_site"] == "A"
    assert rounds[1]["win_reason"] == "defuse"
    assert rounds[1]["bomb_defused"] is True
    assert rounds[1]["plant_site"] == "B"
