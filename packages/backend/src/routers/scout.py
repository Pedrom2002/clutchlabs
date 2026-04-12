"""Scout report CRUD endpoints — per-organization player scouting notes."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: TC002

from src.database import get_db
from src.middleware.auth import get_current_user
from src.models.player_match_stats import PlayerMatchStats
from src.models.scout_report import ScoutReport
from src.schemas.scout import ScoutReportCreate, ScoutReportList, ScoutReportResponse

if TYPE_CHECKING:
    from src.schemas.auth import TokenPayload

router = APIRouter(prefix="/scout", tags=["scout"])


async def _compute_report_fields(db: AsyncSession, org_id: uuid.UUID, player_steam_id: str) -> dict:
    """Aggregate per-org player stats to produce rating/strengths/weaknesses.

    Derived from PlayerMatchStats — if the player has no stats for the org,
    returns a neutral baseline (rating=50, empty lists).
    """
    stmt = select(
        func.coalesce(func.sum(PlayerMatchStats.kills), 0),
        func.coalesce(func.sum(PlayerMatchStats.deaths), 0),
        func.coalesce(func.sum(PlayerMatchStats.assists), 0),
        func.coalesce(func.sum(PlayerMatchStats.headshot_kills), 0),
        func.coalesce(func.sum(PlayerMatchStats.damage), 0),
        func.coalesce(func.sum(PlayerMatchStats.first_kills), 0),
        func.coalesce(func.sum(PlayerMatchStats.first_deaths), 0),
        func.coalesce(func.sum(PlayerMatchStats.clutch_wins), 0),
        func.coalesce(func.sum(PlayerMatchStats.multi_kills_3k), 0),
        func.coalesce(func.sum(PlayerMatchStats.multi_kills_4k), 0),
        func.coalesce(func.sum(PlayerMatchStats.multi_kills_5k), 0),
        func.coalesce(func.sum(PlayerMatchStats.kast_rounds), 0),
        func.coalesce(func.sum(PlayerMatchStats.utility_damage), 0),
        func.coalesce(func.sum(PlayerMatchStats.flash_assists), 0),
        func.coalesce(func.count(PlayerMatchStats.id), 0),
    ).where(
        PlayerMatchStats.org_id == org_id,
        PlayerMatchStats.player_steam_id == player_steam_id,
    )
    result = await db.execute(stmt)
    row = result.one()
    (
        kills,
        deaths,
        assists,
        hs,
        damage,
        first_kills,
        first_deaths,
        clutch_wins,
        mk3,
        mk4,
        mk5,
        kast_rounds,
        util_dmg,
        flash_assists,
        match_count,
    ) = row

    if match_count == 0:
        return {
            "rating": 50.0,
            "strengths": [],
            "weaknesses": ["No match data available for this player yet"],
            "training_plan": ["Upload matches with this player to generate a full report"],
        }

    # Assume an average of 24 rounds per match; fallback 1 for division safety
    approx_rounds = max(match_count * 24, 1)

    kd = kills / max(deaths, 1)
    hs_pct = hs / max(kills, 1) * 100
    adr = damage / approx_rounds
    kast_pct = kast_rounds / approx_rounds * 100
    multi_total = mk3 + mk4 + mk5
    first_kill_rate = first_kills / approx_rounds * 100
    util_dmg_pr = util_dmg / approx_rounds

    # 0-100 rating
    rating = min(
        100.0,
        max(
            0.0,
            kd * 25 + hs_pct * 0.3 + adr * 0.2 + kast_pct * 0.2 + first_kill_rate * 0.5,
        ),
    )

    strengths: list[str] = []
    weaknesses: list[str] = []
    training_plan: list[str] = []

    if kd >= 1.2:
        strengths.append("Positive K/D ratio indicates strong fragging")
    else:
        weaknesses.append("K/D below 1.2 — inconsistent fragging")
        training_plan.append("Aim training: 30 min deathmatch + aim_botz warm-up daily")

    if hs_pct >= 50:
        strengths.append(f"Headshot rate of {hs_pct:.0f}% shows strong aim precision")
    elif hs_pct < 35:
        weaknesses.append(f"Headshot rate of {hs_pct:.0f}% is below average")
        training_plan.append("Crosshair placement drills on aim_botz (headshot-only mode)")

    if adr >= 80:
        strengths.append(f"ADR of {adr:.0f} shows consistent damage output")
    elif adr < 65:
        weaknesses.append(f"ADR of {adr:.0f} is below competitive baseline")
        training_plan.append("Review demos — focus on trading damage before dying")

    if kast_pct >= 70:
        strengths.append(f"KAST of {kast_pct:.0f}% — impactful every round")
    elif kast_pct < 60:
        weaknesses.append(f"KAST of {kast_pct:.0f}% suggests low round impact")
        training_plan.append("Play more supportively — secure assists / stay alive")

    if clutch_wins >= max(1, match_count // 5):
        strengths.append(f"{clutch_wins} clutch wins across {match_count} matches")
    if multi_total >= match_count:
        strengths.append(f"Averaging 1+ multi-kill round per match ({multi_total} total)")

    if first_kill_rate >= 12:
        strengths.append("Strong opening duel presence")
    elif first_kill_rate < 5:
        weaknesses.append("Rarely secures opening kills")
        training_plan.append("Practice entry fragging — peek timing and pre-aim angles")

    if util_dmg_pr < 3 and match_count >= 3:
        weaknesses.append("Low utility damage per round")
        training_plan.append("Learn 5 key map nades (smokes/mollys) for preferred role")

    if not strengths:
        strengths.append("Solid baseline — no major red flags in aggregate stats")
    if not weaknesses:
        weaknesses.append("No obvious weaknesses in aggregate stats")
    if not training_plan:
        training_plan.append("Maintain current regimen — review demos weekly")

    return {
        "rating": round(rating, 1),
        "strengths": strengths,
        "weaknesses": weaknesses,
        "training_plan": training_plan,
    }


@router.post("", response_model=ScoutReportResponse, status_code=201)
async def create_scout_report(
    payload: ScoutReportCreate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a scout report for a player within the current organization."""
    org_id = uuid.UUID(current_user.org_id)
    derived = await _compute_report_fields(db, org_id, payload.player_steam_id)

    report = ScoutReport(
        org_id=org_id,
        author_user_id=uuid.UUID(current_user.sub),
        player_steam_id=payload.player_steam_id,
        notes=payload.notes,
        rating=derived["rating"],
        strengths=derived["strengths"],
        weaknesses=derived["weaknesses"],
        training_plan=derived["training_plan"],
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.get("", response_model=ScoutReportList)
async def list_scout_reports(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    player_steam_id: str | None = Query(default=None),
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List scout reports for the current organization."""
    org_id = uuid.UUID(current_user.org_id)
    query = select(ScoutReport).where(ScoutReport.org_id == org_id)
    if player_steam_id:
        query = query.where(ScoutReport.player_steam_id == player_steam_id)

    total_stmt = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(total_stmt)
    total = int(total_res.scalar() or 0)

    query = (
        query.order_by(ScoutReport.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    res = await db.execute(query)
    items = res.scalars().all()

    return ScoutReportList(
        items=[ScoutReportResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{report_id}", response_model=ScoutReportResponse)
async def get_scout_report(
    report_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single scout report by id (scoped to org)."""
    org_id = uuid.UUID(current_user.org_id)
    res = await db.execute(
        select(ScoutReport).where(ScoutReport.id == report_id, ScoutReport.org_id == org_id)
    )
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Scout report not found")
    return report


@router.delete("/{report_id}", status_code=204)
async def delete_scout_report(
    report_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a scout report (scoped to org)."""
    org_id = uuid.UUID(current_user.org_id)
    res = await db.execute(
        select(ScoutReport).where(ScoutReport.id == report_id, ScoutReport.org_id == org_id)
    )
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Scout report not found")

    await db.delete(report)
    await db.commit()
    return None
