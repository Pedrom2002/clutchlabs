import asyncio
import logging

from src.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _update_demo_status(demo_id: str, status: str, error_message: str | None = None):
    """Update demo status in the database."""
    from datetime import UTC, datetime

    from sqlalchemy import update

    from src.database import _get_engine, _get_session_factory
    from src.models.demo import Demo

    # Ensure engine exists
    _get_engine()
    async with _get_session_factory()() as session:
        values: dict = {"status": status, "updated_at": datetime.now(UTC)}

        if status == "parsing":
            values["parsing_started_at"] = datetime.now(UTC)
        elif status == "extracting_features":
            values["parsing_completed_at"] = datetime.now(UTC)
            values["processing_started_at"] = datetime.now(UTC)
        elif status == "completed":
            values["processing_completed_at"] = datetime.now(UTC)
        elif status in ("failed", "error"):
            values["error_message"] = error_message

        result = await session.execute(
            update(Demo).where(Demo.id == demo_id).values(**values)
        )
        await session.commit()

        if result.rowcount == 0:
            logger.warning("Demo %s not found when updating status to %s", demo_id, status)


async def _check_demo_exists(demo_id: str) -> bool:
    """Check if a demo record exists in the database."""
    from sqlalchemy import select

    from src.database import _get_engine, _get_session_factory
    from src.models.demo import Demo

    _get_engine()
    async with _get_session_factory()() as session:
        result = await session.execute(select(Demo.id).where(Demo.id == demo_id))
        return result.scalar_one_or_none() is not None


@celery_app.task(bind=True, max_retries=3, name="src.tasks.demo_processing.process_demo")
def process_demo(self, demo_id: str, s3_key: str):
    """
    Process a CS2 demo file.

    Pipeline:
    1. Download .dem from MinIO
    2. Parse with awpy
    3. Extract match metadata (map, teams, scores)
    4. Store rounds, player stats in PostgreSQL
    5. Store tick-level events in ClickHouse
    6. Update demo status -> completed
    """
    logger.info("Processing demo %s from %s", demo_id, s3_key)

    try:
        # Verify demo exists before processing
        if not asyncio.run(_check_demo_exists(demo_id)):
            logger.error("Demo %s not found in database, aborting", demo_id)
            return {"demo_id": demo_id, "status": "not_found"}

        # Step 1: Mark as parsing
        asyncio.run(_update_demo_status(demo_id, "parsing"))

        # Step 2: Download from MinIO
        # TODO: Download file from MinIO using s3_key
        logger.info("Downloading demo %s from %s", demo_id, s3_key)

        # Step 3: Parse with awpy
        # TODO: from awpy import Demo as AwpyDemo
        # parsed = AwpyDemo(path=local_path)
        logger.info("Parsing demo %s", demo_id)

        # Step 4: Extract features
        asyncio.run(_update_demo_status(demo_id, "extracting_features"))
        logger.info("Extracting features from demo %s", demo_id)

        # TODO: Extract match metadata, rounds, player stats
        # TODO: Create Match, Round, PlayerMatchStats records in PostgreSQL

        # Step 5: Store tick data in ClickHouse
        # TODO: Insert tick_data and events into ClickHouse

        # Step 6: Mark as completed
        asyncio.run(_update_demo_status(demo_id, "completed"))
        logger.info("Demo %s processing completed", demo_id)

        return {"demo_id": demo_id, "status": "completed"}

    except Exception as exc:
        logger.exception("Failed to process demo %s", demo_id)
        try:
            asyncio.run(_update_demo_status(demo_id, "failed", str(exc)[:500]))
        except Exception:
            logger.exception("Failed to update demo %s status to failed", demo_id)
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1)) from exc
