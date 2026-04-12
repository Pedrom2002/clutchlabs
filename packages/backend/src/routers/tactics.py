"""Tactical analysis endpoints — derives strategies from round data."""

from __future__ import annotations

import uuid
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: TC002
from sqlalchemy.orm import selectinload

from src.database import get_db
from src.models.match import Match
from src.models.player_match_stats import PlayerMatchStats

router = APIRouter(tags=["tactics"])


# --------------------------------------------------------------------------- #
# Strategy heuristics
# --------------------------------------------------------------------------- #


_ECO_EQUIP_MAX = 5_000
_FORCE_EQUIP_MAX = 12_000


def _infer_buy_type(equipment_value: int | None, explicit: str | None) -> str:
    if explicit:
        return explicit.lower()
    ev = equipment_value or 0
    if ev < _ECO_EQUIP_MAX:
        return "eco"
    if ev < _FORCE_EQUIP_MAX:
        return "force"
    return "full"


def _classify_round_strategy(
    side: str,
    buy_type: str,
    duration_seconds: float | None,
    bomb_planted: bool,
    plant_site: str | None,
    round_number: int,
) -> tuple[str, float, str]:
    """Classify a round's strategy, returning (type, confidence, description)."""
    dur = float(duration_seconds or 0.0)

    # Economic strategies dominate when applicable
    if buy_type == "eco":
        return (
            "eco",
            0.9,
            f"{side} eco round — saving economy for next buy",
        )
    if buy_type == "force":
        return (
            "force",
            0.8,
            f"{side} force-buy — committing partial economy",
        )

    # Full-buy rounds: classify by tempo
    if side == "T":
        if bomb_planted and dur and dur < 40:
            site = plant_site or "a site"
            return (
                "execute",
                0.85,
                f"Fast {site.upper() if isinstance(site, str) and len(site) == 1 else site} execute — plant under 40s",
            )
        if dur and dur < 25:
            return (
                "rush",
                0.8,
                "Rush strategy — early contact, short round",
            )
        if bomb_planted:
            return (
                "execute",
                0.7,
                f"Executed onto {plant_site or 'site'} after setup",
            )
        return ("default", 0.6, "Default T setup — map control before commitment")

    # CT side
    if dur and dur < 20:
        return (
            "rush",
            0.75,
            "Fast CT aggression — early contact won the round quickly",
        )
    return ("default", 0.6, "Default CT setup — standard retake posture")


def _side_for_round(round_number: int, total_rounds: int) -> str:
    """Team-1 side for a given round. Assumes MR12 (side switch at round 13)."""
    half = 12 if total_rounds >= 24 else max(total_rounds // 2, 1)
    return "T" if round_number <= half else "CT"


@router.get("/matches/{match_id}/tactics")
async def match_tactics(
    match_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return per-round strategy classification and team tendencies."""
    try:
        match_uuid = uuid.UUID(match_id)
    except (ValueError, AttributeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid match id") from exc

    res = await db.execute(
        select(Match).where(Match.id == match_uuid).options(selectinload(Match.rounds))
    )
    match = res.scalar_one_or_none()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")

    rounds_sorted = sorted(match.rounds, key=lambda r: r.round_number)

    # Pull top-impact players per side for key_players
    stats_res = await db.execute(
        select(PlayerMatchStats).where(PlayerMatchStats.match_id == match_uuid)
    )
    stats = list(stats_res.scalars().all())
    stats_by_side: dict[str, list[PlayerMatchStats]] = {"T": [], "CT": []}
    for ps in stats:
        if ps.team_side in stats_by_side:
            stats_by_side[ps.team_side].append(ps)
    top_t = sorted(
        stats_by_side["T"], key=lambda s: (s.kills or 0) - (s.deaths or 0), reverse=True
    )[:2]
    top_ct = sorted(
        stats_by_side["CT"], key=lambda s: (s.kills or 0) - (s.deaths or 0), reverse=True
    )[:2]

    round_entries = []
    ct_site_counter: Counter[str] = Counter()
    t_execute_counter: Counter[str] = Counter()

    for rnd in rounds_sorted:
        round_number = rnd.round_number
        # Use team1 starting side assumption to derive perspective side per round
        side = _side_for_round(round_number, match.total_rounds or len(rounds_sorted))
        buy_type_raw = rnd.t_buy_type if side == "T" else rnd.ct_buy_type
        equip = rnd.t_equipment_value if side == "T" else rnd.ct_equipment_value
        buy_type = _infer_buy_type(equip, buy_type_raw)

        strategy_type, confidence, description = _classify_round_strategy(
            side=side,
            buy_type=buy_type,
            duration_seconds=rnd.duration_seconds,
            bomb_planted=bool(rnd.bomb_planted),
            plant_site=rnd.plant_site,
            round_number=round_number,
        )

        if side == "T" and strategy_type == "execute" and rnd.plant_site:
            t_execute_counter[rnd.plant_site.upper()] += 1
        if side == "CT" and rnd.plant_site:
            ct_site_counter[rnd.plant_site.upper()] += 1

        key_players_pool = top_t if side == "T" else top_ct
        key_players = [str(ps.player_steam_id) for ps in key_players_pool]

        round_entries.append(
            {
                "round_number": round_number,
                "side": side,
                "strategy_type": strategy_type,
                "confidence": round(confidence, 2),
                "key_players": key_players,
                "description": description,
            }
        )

    ct_preferred = [site for site, _ in ct_site_counter.most_common(2)] or ["A", "B"]
    t_executes = [f"{site} site execute" for site, _ in t_execute_counter.most_common(3)] or []

    return {
        "match_id": str(match.id),
        "rounds": round_entries,
        "team_tendencies": {
            "ct_preferred_sites": ct_preferred,
            "t_preferred_executes": t_executes,
        },
    }
