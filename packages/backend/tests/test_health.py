import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_aggregate(client: AsyncClient):
    """Aggregate health — 200 if db+redis reachable, 503 if either is down."""
    response = await client.get("/api/v1/health")
    assert response.status_code in (200, 503)
    data = response.json()
    assert "version" in data
    assert data["status"] in ("ok", "degraded")
    assert "checks" in data
    assert "db" in data["checks"]
    assert "redis" in data["checks"]
    # DB should always be ok in tests (SQLite in-memory)
    assert data["checks"]["db"] == "ok"


@pytest.mark.asyncio
async def test_health_liveness(client: AsyncClient):
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_metrics_endpoint(client: AsyncClient):
    # Prime the counters
    await client.get("/api/v1/health/live")
    resp = await client.get("/metrics")
    assert resp.status_code == 200
    body = resp.text
    assert "http_requests_total" in body
    assert "http_request_duration_seconds" in body
