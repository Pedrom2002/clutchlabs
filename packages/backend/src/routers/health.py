"""Health probes — liveness + aggregate readiness with db/redis checks."""

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db

router = APIRouter(prefix="/health", tags=["health"])


async def _check_db(db: AsyncSession) -> str:
    try:
        result = await db.execute(text("SELECT 1"))
        return "ok" if result.scalar() == 1 else "fail"
    except Exception:
        return "fail"


async def _check_redis() -> str:
    try:
        r = aioredis.from_url(settings.REDIS_URL)
        try:
            await r.ping()
            return "ok"
        finally:
            await r.aclose()
    except Exception:
        return "fail"


@router.get("")
async def health(
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Aggregate health — returns 503 if any critical dependency is down."""
    db_status = await _check_db(db)
    redis_status = await _check_redis()

    checks = {"db": db_status, "redis": redis_status}
    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"

    if overall != "ok":
        response.status_code = 503

    return {
        "status": overall,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "checks": checks,
    }


@router.get("/live")
async def liveness():
    """Lightweight liveness probe — returns 200 if process is alive."""
    return {"status": "ok"}


@router.get("/db")
async def health_db(db: AsyncSession = Depends(get_db)):
    status = await _check_db(db)
    return {"status": "ok" if status == "ok" else "error", "db": status}


@router.get("/redis")
async def health_redis():
    status = await _check_redis()
    return {"status": "ok" if status == "ok" else "error", "redis": status}
