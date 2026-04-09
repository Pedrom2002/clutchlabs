"""Player stats endpoints."""

import math
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.middleware.auth import get_current_user
from src.models.player_match_stats import PlayerMatchStats
from src.schemas.auth import TokenPayload
from src.schemas.common import PaginatedResponse
from src.schemas.player import (
    MatchEconomyResponse,
    PlayerAggregatedStatsResponse,
    PlayerListItemResponse,
)
from src.services import player_service

router = APIRouter(tags=["players"])


@router.get("/players", response_model=PaginatedResponse[PlayerListItemResponse])
async def list_players(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all players in the organization with summary stats."""
    org_id = uuid.UUID(current_user.org_id)

    base_query = (
        select(
            PlayerMatchStats.player_steam_id,
            PlayerMatchStats.player_name,
            func.count(PlayerMatchStats.id).label("total_matches"),
            func.sum(PlayerMatchStats.kills).label("total_kills"),
            func.sum(PlayerMatchStats.deaths).label("total_deaths"),
            func.avg(PlayerMatchStats.adr).label("avg_adr"),
            func.avg(PlayerMatchStats.overall_rating).label("avg_rating"),
        )
        .where(PlayerMatchStats.org_id == org_id)
        .group_by(PlayerMatchStats.player_steam_id, PlayerMatchStats.player_name)
    )

    if search:
        base_query = base_query.where(PlayerMatchStats.player_name.ilike(f"%{search}%"))

    # Count
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Page
    rows = await db.execute(
        base_query.order_by(func.avg(PlayerMatchStats.overall_rating).desc().nullslast())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    items = []
    for row in rows:
        total_kills = row.total_kills or 0
        total_deaths = row.total_deaths or 0
        items.append(
            PlayerListItemResponse(
                player_steam_id=row.player_steam_id,
                player_name=row.player_name,
                total_matches=row.total_matches,
                total_kills=total_kills,
                total_deaths=total_deaths,
                kd_ratio=round(total_kills / max(total_deaths, 1), 2),
                avg_adr=round(row.avg_adr or 0, 1),
                avg_rating=round(row.avg_rating or 0, 2) if row.avg_rating else None,
            )
        )

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get(
    "/players/{steam_id}/stats",
    response_model=PlayerAggregatedStatsResponse,
)
async def get_player_stats(
    steam_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated stats for a player across all matches."""
    stats = await player_service.get_player_aggregated_stats(
        db=db,
        org_id=uuid.UUID(current_user.org_id),
        steam_id=steam_id,
    )
    if stats is None:
        raise HTTPException(status_code=404, detail="Player not found")

    return stats


@router.get(
    "/matches/{match_id}/economy",
    response_model=MatchEconomyResponse,
)
async def get_match_economy(
    match_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get economy data for all rounds in a match."""
    economy = await player_service.get_match_economy(
        db=db,
        org_id=uuid.UUID(current_user.org_id),
        match_id=match_id,
    )
    if economy is None:
        raise HTTPException(status_code=404, detail="Match not found")
    return economy


@router.get("/matches/{match_id}/strategies")
async def get_match_strategies(
    match_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get strategy classifications for each round in a match."""
    from sqlalchemy import select

    from src.models.match_strategy import MatchStrategy

    result = await db.execute(
        select(MatchStrategy)
        .where(MatchStrategy.match_id == match_id)
        .order_by(MatchStrategy.round_number)
    )
    strategies = result.scalars().all()

    return {
        "match_id": str(match_id),
        "rounds": [
            {
                "round_number": s.round_number,
                "side": s.side,
                "strategy_label": s.strategy_label,
                "confidence": s.confidence,
            }
            for s in strategies
        ],
    }
