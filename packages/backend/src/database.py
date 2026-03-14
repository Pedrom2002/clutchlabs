from collections.abc import AsyncGenerator
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@lru_cache(maxsize=1)
def _get_engine():
    from src.config import settings

    return create_async_engine(
        settings.DATABASE_URL,
        echo=settings.ENVIRONMENT == "dev",
        pool_size=20,
        max_overflow=10,
    )


@lru_cache(maxsize=1)
def _get_session_factory():
    return async_sessionmaker(
        bind=_get_engine(),
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _get_session_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
