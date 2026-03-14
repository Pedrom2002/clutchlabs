from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.middleware.auth import get_current_user
from src.schemas.auth import TokenPayload


async def set_tenant_context(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
) -> AsyncSession:
    """Set the org_id context for Row-Level Security policies."""
    await db.execute(
        text("SET LOCAL app.current_org_id = :org_id"),
        {"org_id": str(current_user.org_id)},
    )
    return db
