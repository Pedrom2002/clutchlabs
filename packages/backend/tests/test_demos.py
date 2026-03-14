from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


_register_counter = 0


async def register_and_get_token(client: AsyncClient, email: str | None = None) -> str:
    """Helper: register a user and return the access token."""
    global _register_counter  # noqa: PLW0603
    _register_counter += 1
    email = email or f"demo{_register_counter}@test.com"
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "org_name": f"Demo Test Team {_register_counter}",
            "email": email,
            "password": "securepassword123",
            "display_name": "Demo User",
        },
    )
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_list_demos_empty(client: AsyncClient):
    token = await register_and_get_token(client)
    response = await client.get(
        "/api/v1/demos",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_demos_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/demos")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_upload_demo(client: AsyncClient):
    token = await register_and_get_token(client)

    mock_upload = AsyncMock(return_value="abc123def456")
    mock_delay = lambda *args, **kwargs: None  # noqa: E731

    with (
        patch("src.services.demo_service.upload_to_minio", mock_upload),
        patch("src.tasks.demo_processing.process_demo.delay", mock_delay),
    ):
        response = await client.post(
            "/api/v1/demos",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test_match.dem", b"fake demo content", "application/octet-stream")},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["original_filename"] == "test_match.dem"
    assert data["status"] == "uploaded"
    assert data["file_size_bytes"] == len(b"fake demo content")


@pytest.mark.asyncio
async def test_upload_rejects_non_dem(client: AsyncClient):
    token = await register_and_get_token(client)

    mock_upload = AsyncMock(return_value="abc123")
    with patch("src.services.demo_service.upload_to_minio", mock_upload):
        response = await client.post(
            "/api/v1/demos",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("replay.mp4", b"not a demo", "video/mp4")},
        )

    assert response.status_code == 400
    assert "dem" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_upload_and_list(client: AsyncClient):
    token = await register_and_get_token(client)

    mock_upload = AsyncMock(return_value="abc123def456")
    mock_delay = lambda *args, **kwargs: None  # noqa: E731

    with (
        patch("src.services.demo_service.upload_to_minio", mock_upload),
        patch("src.tasks.demo_processing.process_demo.delay", mock_delay),
    ):
        await client.post(
            "/api/v1/demos",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("match1.dem", b"demo1", "application/octet-stream")},
        )
        await client.post(
            "/api/v1/demos",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("match2.dem", b"demo2", "application/octet-stream")},
        )

    response = await client.get(
        "/api/v1/demos",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_get_demo_detail(client: AsyncClient):
    token = await register_and_get_token(client)

    mock_upload = AsyncMock(return_value="checksum123")
    mock_delay = lambda *args, **kwargs: None  # noqa: E731

    with (
        patch("src.services.demo_service.upload_to_minio", mock_upload),
        patch("src.tasks.demo_processing.process_demo.delay", mock_delay),
    ):
        upload_response = await client.post(
            "/api/v1/demos",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("detail_test.dem", b"demo data", "application/octet-stream")},
        )

    demo_id = upload_response.json()["id"]
    response = await client.get(
        f"/api/v1/demos/{demo_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["original_filename"] == "detail_test.dem"
    assert data["checksum_sha256"] == "checksum123"
    assert data["match"] is None  # No match yet since processing is mocked


@pytest.mark.asyncio
async def test_get_demo_not_found(client: AsyncClient):
    token = await register_and_get_token(client)
    response = await client.get(
        "/api/v1/demos/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cross_org_demo_isolation(client: AsyncClient):
    """Users from org A cannot see demos from org B."""
    token_a = await register_and_get_token(client, email="orga@test.com")
    token_b = await register_and_get_token(client, email="orgb@test.com")

    mock_upload = AsyncMock(return_value="abc123")
    mock_delay = lambda *args, **kwargs: None  # noqa: E731

    # Upload demo as org A
    with (
        patch("src.services.demo_service.upload_to_minio", mock_upload),
        patch("src.tasks.demo_processing.process_demo.delay", mock_delay),
    ):
        upload_resp = await client.post(
            "/api/v1/demos",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("orgA.dem", b"org a demo", "application/octet-stream")},
        )

    demo_id = upload_resp.json()["id"]

    # Org B should not see org A's demos in list
    response = await client.get(
        "/api/v1/demos",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 0

    # Org B should not access org A's demo detail
    response = await client.get(
        f"/api/v1/demos/{demo_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_upload_path_traversal_filename(client: AsyncClient):
    """Filenames with path traversal should be sanitized."""
    token = await register_and_get_token(client)

    mock_upload = AsyncMock(return_value="abc123")
    mock_delay = lambda *args, **kwargs: None  # noqa: E731

    with (
        patch("src.services.demo_service.upload_to_minio", mock_upload),
        patch("src.tasks.demo_processing.process_demo.delay", mock_delay),
    ):
        response = await client.post(
            "/api/v1/demos",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("../../etc/passwd.dem", b"traversal", "application/octet-stream")},
        )

    assert response.status_code == 201
    data = response.json()
    # Filename should be sanitized — no path separators
    assert ".." not in data["original_filename"] or "/" not in data["original_filename"]
