"""Integration tests for the tactics endpoint."""

import uuid

import pytest
from httpx import AsyncClient

from src.models.match import Match
from src.models.organization import Organization
from src.models.player_match_stats import PlayerMatchStats
from src.models.round import Round
from tests.conftest import TestSessionLocal


async def _seed_match() -> uuid.UUID:
    """Create a match with a handful of rounds covering different buy types."""
    async with TestSessionLocal() as session:
        org = Organization(name="TacticOrg", slug=f"tactic-{uuid.uuid4().hex[:6]}")
        session.add(org)
        await session.flush()

        # Match needs a demo FK; we bypass by creating a fake one via raw insert
        from src.models.demo import Demo, DemoStatus

        demo = Demo(
            id=uuid.uuid4(),
            org_id=org.id,
            uploaded_by=None,
            s3_key="k",
            original_filename="test.dem",
            file_size_bytes=1,
            checksum_sha256="0" * 64,
            status=DemoStatus.completed,
        )
        session.add(demo)
        await session.flush()

        match = Match(
            demo_id=demo.id,
            org_id=org.id,
            map="de_mirage",
            total_rounds=4,
        )
        session.add(match)
        await session.flush()

        rounds_data = [
            dict(
                round_number=1,
                winner_side="CT",
                t_buy_type="eco",
                ct_buy_type="eco",
                t_equipment_value=1000,
                ct_equipment_value=1500,
                duration_seconds=35.0,
                bomb_planted=False,
                plant_site=None,
            ),
            dict(
                round_number=2,
                winner_side="T",
                t_buy_type="full",
                ct_buy_type="full",
                t_equipment_value=22000,
                ct_equipment_value=20000,
                duration_seconds=22.0,
                bomb_planted=True,
                plant_site="A",
            ),
            dict(
                round_number=3,
                winner_side="CT",
                t_buy_type="force",
                ct_buy_type="full",
                t_equipment_value=8000,
                ct_equipment_value=20000,
                duration_seconds=60.0,
                bomb_planted=False,
                plant_site=None,
            ),
            dict(
                round_number=4,
                winner_side="T",
                t_buy_type="full",
                ct_buy_type="full",
                t_equipment_value=22000,
                ct_equipment_value=22000,
                duration_seconds=36.0,
                bomb_planted=True,
                plant_site="B",
            ),
        ]
        for rd in rounds_data:
            session.add(Round(match_id=match.id, **rd))

        # Seed two player stats on each side
        for steam_id, side, kills in [
            ("76561198000000001", "T", 22),
            ("76561198000000002", "T", 14),
            ("76561198000000003", "CT", 20),
            ("76561198000000004", "CT", 10),
        ]:
            session.add(
                PlayerMatchStats(
                    match_id=match.id,
                    org_id=org.id,
                    player_steam_id=steam_id,
                    player_name=f"p_{steam_id[-1]}",
                    team_side=side,
                    kills=kills,
                    deaths=10,
                    assists=3,
                    headshot_kills=kills // 2,
                    damage=kills * 85,
                )
            )

        match_id = match.id
        await session.commit()
        return match_id


@pytest.mark.asyncio
async def test_tactics_happy_path(client: AsyncClient):
    match_id = await _seed_match()
    resp = await client.get(f"/api/v1/matches/{match_id}/tactics")
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["match_id"] == str(match_id)
    assert isinstance(body["rounds"], list)
    assert len(body["rounds"]) == 4
    for entry in body["rounds"]:
        assert set(entry.keys()) == {
            "round_number",
            "side",
            "strategy_type",
            "confidence",
            "key_players",
            "description",
        }
        assert entry["strategy_type"] in {
            "default",
            "rush",
            "eco",
            "force",
            "execute",
        }
        assert 0.0 <= entry["confidence"] <= 1.0

    # Round 1 should classify as eco
    assert body["rounds"][0]["strategy_type"] == "eco"

    assert "team_tendencies" in body
    assert isinstance(body["team_tendencies"]["ct_preferred_sites"], list)
    assert isinstance(body["team_tendencies"]["t_preferred_executes"], list)


@pytest.mark.asyncio
async def test_tactics_match_not_found(client: AsyncClient):
    fake_id = uuid.uuid4()
    resp = await client.get(f"/api/v1/matches/{fake_id}/tactics")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_tactics_invalid_uuid(client: AsyncClient):
    resp = await client.get("/api/v1/matches/not-a-uuid/tactics")
    assert resp.status_code == 400
