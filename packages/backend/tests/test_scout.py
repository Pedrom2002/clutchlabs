"""Integration tests for scout report CRUD."""

import uuid

import pytest
from httpx import AsyncClient


async def _register(client: AsyncClient, email: str = "scout@test.com") -> str:
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "org_name": "ScoutOrg",
            "email": email,
            "password": "testpassword123",
            "display_name": "ScoutUser",
        },
    )
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_create_and_list_scout_report(client: AsyncClient):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/v1/scout",
        headers=headers,
        json={"player_steam_id": "76561198000000001", "notes": "Promising AWPer"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["player_steam_id"] == "76561198000000001"
    assert 0.0 <= body["rating"] <= 100.0
    assert isinstance(body["strengths"], list)
    assert isinstance(body["weaknesses"], list)
    assert isinstance(body["training_plan"], list)
    report_id = body["id"]

    list_resp = await client.get("/api/v1/scout", headers=headers)
    assert list_resp.status_code == 200
    list_body = list_resp.json()
    assert list_body["total"] == 1
    assert list_body["items"][0]["id"] == report_id

    detail_resp = await client.get(f"/api/v1/scout/{report_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == report_id

    del_resp = await client.delete(f"/api/v1/scout/{report_id}", headers=headers)
    assert del_resp.status_code == 204

    after = await client.get("/api/v1/scout", headers=headers)
    assert after.json()["total"] == 0


@pytest.mark.asyncio
async def test_scout_requires_auth(client: AsyncClient):
    resp = await client.post(
        "/api/v1/scout",
        json={"player_steam_id": "76561198000000001"},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_scout_detail_404(client: AsyncClient):
    token = await _register(client, email="scout2@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    fake_id = uuid.uuid4()
    resp = await client.get(f"/api/v1/scout/{fake_id}", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_scout_org_isolation(client: AsyncClient):
    token_a = await _register(client, email="orga@test.com")
    resp = await client.post(
        "/api/v1/scout",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"player_steam_id": "76561198000000002"},
    )
    report_id = resp.json()["id"]

    token_b = await _register(client, email="orgb@test.com")
    other = await client.get(
        f"/api/v1/scout/{report_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert other.status_code == 404
