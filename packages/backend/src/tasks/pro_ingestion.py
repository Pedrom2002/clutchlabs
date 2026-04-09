"""Celery tasks for automatic pro demo ingestion.

Runs on Celery Beat schedule (every 30 minutes) to scrape and ingest
professional CS2 demos from HLTV and FACEIT.
"""

import asyncio
import logging
import os
import sys
from datetime import datetime

from src.config import settings
from src.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _get_ingester_path() -> str:
    """Get the path to the pro-demo-ingester package."""
    return os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "pro-demo-ingester")
    )


def _ensure_ingester_importable():
    """Add pro-demo-ingester to sys.path if not already present."""
    ingester_path = _get_ingester_path()
    if ingester_path not in sys.path:
        sys.path.insert(0, ingester_path)


async def _check_pro_match_exists(source: str, source_match_id: str) -> bool:
    """Check if a pro match already exists in the database."""
    from sqlalchemy import select

    from src.database import _get_engine, _get_session_factory
    from src.models.pro_match import ProMatch

    _get_engine()
    async with _get_session_factory()() as session:
        result = await session.execute(
            select(ProMatch.id).where(
                ProMatch.source == source,
                ProMatch.source_match_id == source_match_id,
            )
        )
        return result.scalar_one_or_none() is not None


async def _store_pro_match(
    source: str,
    source_match_id: str,
    team1_name: str,
    team2_name: str,
    team1_score: int | None,
    team2_score: int | None,
    map_name: str,
    event_name: str | None,
    match_date: datetime,
    status: str = "pending",
) -> str:
    """Store a new pro match record in the database."""
    from src.database import _get_engine, _get_session_factory
    from src.models.pro_match import ProMatch

    _get_engine()
    async with _get_session_factory()() as session:
        pro_match = ProMatch(
            source=source,
            source_match_id=source_match_id,
            team1_name=team1_name,
            team2_name=team2_name,
            team1_score=team1_score,
            team2_score=team2_score,
            map=map_name,
            event_name=event_name,
            match_date=match_date,
            status=status,
        )
        session.add(pro_match)
        await session.commit()
        return str(pro_match.id)


async def _run_hltv_ingestion(pages: int = 2) -> int:
    """Run HLTV match scraping and storage."""
    _ensure_ingester_importable()

    try:
        from src.scrapers.hltv import HLTVScraper
    except ImportError:
        logger.error(
            "Cannot import HLTVScraper. Ensure pro-demo-ingester package is installed: "
            "pip install -e packages/pro-demo-ingester"
        )
        return 0

    scraper = HLTVScraper()
    matches = await scraper.get_recent_matches(pages=pages)

    new_count = 0
    for match in matches:
        source_id = str(match.match_id)
        if await _check_pro_match_exists("hltv", source_id):
            continue

        await _store_pro_match(
            source="hltv",
            source_match_id=source_id,
            team1_name=match.team1_name,
            team2_name=match.team2_name,
            team1_score=match.team1_score,
            team2_score=match.team2_score,
            map_name=match.map_name,
            event_name=match.event_name,
            match_date=match.match_date,
        )
        new_count += 1

    return new_count


async def _run_faceit_ingestion() -> int:
    """Run FACEIT match fetching and storage."""
    hub_ids = [h.strip() for h in settings.FACEIT_HUB_IDS.split(",") if h.strip()]
    if not hub_ids:
        return 0

    if not settings.FACEIT_API_KEY:
        logger.debug("No FACEIT API key configured, skipping")
        return 0

    _ensure_ingester_importable()

    try:
        from src.clients.faceit import FACEITClient
    except ImportError:
        logger.error(
            "Cannot import FACEITClient. Ensure pro-demo-ingester package is installed: "
            "pip install -e packages/pro-demo-ingester"
        )
        return 0

    client = FACEITClient(api_key=settings.FACEIT_API_KEY)
    total_new = 0

    for hub_id in hub_ids:
        matches = await client.get_hub_matches(hub_id, limit=20)
        for match in matches:
            if match.status != "finished":
                continue
            if await _check_pro_match_exists("faceit", match.match_id):
                continue

            await _store_pro_match(
                source="faceit",
                source_match_id=match.match_id,
                team1_name=match.team1_name,
                team2_name=match.team2_name,
                team1_score=match.team1_score,
                team2_score=match.team2_score,
                map_name=match.map_name,
                event_name=None,
                match_date=match.match_date,
            )
            total_new += 1

    return total_new


@celery_app.task(name="src.tasks.pro_ingestion.ingest_hltv")
def ingest_hltv():
    """Periodic task: scrape recent HLTV matches and store new ones."""
    logger.info("Starting HLTV pro demo ingestion")
    try:
        new_count = asyncio.run(_run_hltv_ingestion(pages=2))
        logger.info("HLTV ingestion complete: %d new matches", new_count)
        return new_count
    except Exception as exc:
        logger.exception("HLTV ingestion failed")
        return {"error": str(exc)}


@celery_app.task(name="src.tasks.pro_ingestion.ingest_faceit")
def ingest_faceit():
    """Periodic task: fetch recent FACEIT matches and store new ones."""
    logger.info("Starting FACEIT pro demo ingestion")
    try:
        total_new = asyncio.run(_run_faceit_ingestion())
        logger.info("FACEIT ingestion complete: %d new matches", total_new)
        return total_new
    except Exception as exc:
        logger.exception("FACEIT ingestion failed")
        return {"error": str(exc)}


@celery_app.task(name="src.tasks.pro_ingestion.backfill_hltv")
def backfill_hltv(pages: int = 30):
    """One-time task: backfill last ~3 months of HLTV matches.

    Usage:
        from src.tasks.pro_ingestion import backfill_hltv
        backfill_hltv.delay(pages=30)
    """
    logger.info("Starting HLTV backfill (%d pages)", pages)
    try:
        new_count = asyncio.run(_run_hltv_ingestion(pages=pages))
        logger.info("HLTV backfill complete: %d new matches", new_count)
        return new_count
    except Exception as exc:
        logger.exception("HLTV backfill failed")
        return {"error": str(exc)}
