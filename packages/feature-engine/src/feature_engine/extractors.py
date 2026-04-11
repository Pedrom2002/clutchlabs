"""Feature extractors for rounds, players, and teams.

All extractors accept either mapping-like objects (dicts) or objects with
matching attributes (dataclasses, SQLAlchemy models). They return
immutable dataclass vectors suitable for downstream ML ingestion.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Iterable, Mapping


def _get(obj: Any, key: str, default: Any = None) -> Any:
    """Field access that works for dicts and attribute-style objects."""
    if obj is None:
        return default
    if isinstance(obj, Mapping):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _safe_div(a: float, b: float, default: float = 0.0) -> float:
    try:
        return a / b if b else default
    except (TypeError, ZeroDivisionError):
        return default


# --------------------------------------------------------------------------- #
# Round features
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class RoundFeatureVector:
    """Feature vector for a single round."""

    round_number: int
    winner_side: str | None
    win_reason: str | None
    duration_seconds: float
    t_economy: int
    ct_economy: int
    t_equipment_value: int
    ct_equipment_value: int
    t_buy_type: str
    ct_buy_type: str
    economy_delta: int  # t_economy - ct_economy
    equipment_delta: int
    bomb_planted: bool
    bomb_defused: bool
    plant_site: str | None
    is_pistol_round: bool
    is_eco_round: bool
    is_force_round: bool
    is_full_buy: bool
    score_delta: int  # team1_score - team2_score at end of round

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


_ECO_THRESHOLD = 5_000
_FORCE_THRESHOLD = 12_000
_FULL_BUY_THRESHOLD = 20_000


def _classify_buy(equipment_value: int | None, money: int | None) -> str:
    """Derive buy type from money/equipment value when not explicit."""
    ev = equipment_value or 0
    m = money or 0
    if ev < _ECO_THRESHOLD:
        return "eco"
    if ev < _FORCE_THRESHOLD:
        return "force"
    if m > _FULL_BUY_THRESHOLD or ev >= _FULL_BUY_THRESHOLD:
        return "full"
    return "force"


def extract_round_features(round: Any) -> RoundFeatureVector:
    """Extract features from a single round.

    Accepts a Round SQLAlchemy model, dict, or any object with equivalent
    attributes. Missing fields are filled with sensible defaults.
    """
    round_number = int(_get(round, "round_number", 0) or 0)
    winner_side = _get(round, "winner_side")
    win_reason = _get(round, "win_reason")
    duration = float(_get(round, "duration_seconds", 0.0) or 0.0)

    t_economy = int(_get(round, "t_economy", 0) or 0)
    ct_economy = int(_get(round, "ct_economy", 0) or 0)
    t_equip = int(_get(round, "t_equipment_value", 0) or 0)
    ct_equip = int(_get(round, "ct_equipment_value", 0) or 0)

    t_buy = _get(round, "t_buy_type") or _classify_buy(t_equip, t_economy)
    ct_buy = _get(round, "ct_buy_type") or _classify_buy(ct_equip, ct_economy)

    bomb_planted = bool(_get(round, "bomb_planted", False) or False)
    bomb_defused = bool(_get(round, "bomb_defused", False) or False)
    plant_site = _get(round, "plant_site")

    team1_score = int(_get(round, "team1_score", 0) or 0)
    team2_score = int(_get(round, "team2_score", 0) or 0)

    is_pistol = round_number in (1, 13)  # MR12 pistol rounds
    is_eco = t_buy == "eco" or ct_buy == "eco"
    is_force = t_buy == "force" or ct_buy == "force"
    is_full = t_buy == "full" and ct_buy == "full"

    return RoundFeatureVector(
        round_number=round_number,
        winner_side=winner_side,
        win_reason=win_reason,
        duration_seconds=duration,
        t_economy=t_economy,
        ct_economy=ct_economy,
        t_equipment_value=t_equip,
        ct_equipment_value=ct_equip,
        t_buy_type=t_buy,
        ct_buy_type=ct_buy,
        economy_delta=t_economy - ct_economy,
        equipment_delta=t_equip - ct_equip,
        bomb_planted=bomb_planted,
        bomb_defused=bomb_defused,
        plant_site=plant_site,
        is_pistol_round=is_pistol,
        is_eco_round=is_eco,
        is_force_round=is_force,
        is_full_buy=is_full,
        score_delta=team1_score - team2_score,
    )


# --------------------------------------------------------------------------- #
# Player features
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class PlayerFeatureVector:
    """Feature vector for a single player in a match."""

    player_steam_id: str
    player_name: str
    kills: int
    deaths: int
    assists: int
    adr: float
    kd_ratio: float
    kpr: float
    dpr: float
    headshot_pct: float
    kast_pct: float
    survival_rate: float
    first_kill_rate: float
    opening_win_rate: float
    multi_kill_rate: float
    clutch_wins: int
    trade_kill_pct: float
    utility_damage_per_round: float
    flash_assists_per_round: float
    impact_score: float  # 0-100 composite

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def extract_player_features(player_stats: Any, total_rounds: int | None = None) -> PlayerFeatureVector:
    """Extract features from a player's match stats.

    `player_stats` can be a PlayerMatchStats SQLAlchemy model or a dict.
    `total_rounds` overrides the value on the object when provided.
    """
    steam_id = str(_get(player_stats, "player_steam_id", "") or "")
    name = str(_get(player_stats, "player_name", "") or "")

    kills = int(_get(player_stats, "kills", 0) or 0)
    deaths = int(_get(player_stats, "deaths", 0) or 0)
    assists = int(_get(player_stats, "assists", 0) or 0)
    hs = int(_get(player_stats, "headshot_kills", 0) or 0)
    damage = int(_get(player_stats, "damage", 0) or 0)

    flash_assists = int(_get(player_stats, "flash_assists", 0) or 0)
    utility_dmg = int(_get(player_stats, "utility_damage", 0) or 0)

    first_kills = int(_get(player_stats, "first_kills", 0) or 0)
    first_deaths = int(_get(player_stats, "first_deaths", 0) or 0)
    trade_kills = int(_get(player_stats, "trade_kills", 0) or 0)
    trade_deaths = int(_get(player_stats, "trade_deaths", 0) or 0)

    clutch_wins = int(_get(player_stats, "clutch_wins", 0) or 0)
    mk3 = int(_get(player_stats, "multi_kills_3k", 0) or 0)
    mk4 = int(_get(player_stats, "multi_kills_4k", 0) or 0)
    mk5 = int(_get(player_stats, "multi_kills_5k", 0) or 0)

    kast_rounds = int(_get(player_stats, "kast_rounds", 0) or 0)
    rounds_survived = int(_get(player_stats, "rounds_survived", 0) or 0)

    tr = int(total_rounds or _get(player_stats, "total_rounds", 0) or 0)
    tr_safe = max(tr, 1)

    adr_value = _get(player_stats, "adr")
    if adr_value is None:
        adr_value = _safe_div(damage, tr_safe)

    kpr = round(_safe_div(kills, tr_safe), 3)
    dpr = round(_safe_div(deaths, tr_safe), 3)
    kd = round(_safe_div(kills, max(deaths, 1)), 3)
    hs_pct = round(_safe_div(hs, max(kills, 1)) * 100, 1)

    kast_pct = round(_safe_div(kast_rounds, tr_safe) * 100, 1)
    survival = round(_safe_div(rounds_survived, tr_safe) * 100, 1)

    opening_attempts = first_kills + first_deaths
    opening_wr = round(_safe_div(first_kills, max(opening_attempts, 1)) * 100, 1)
    fk_rate = round(_safe_div(first_kills, tr_safe) * 100, 1)

    multi_total = mk3 + mk4 + mk5
    multi_rate = round(_safe_div(multi_total, tr_safe) * 100, 1)

    trade_kill_pct = round(_safe_div(trade_kills, max(deaths, 1)) * 100, 1)

    util_dmg_pr = round(_safe_div(utility_dmg, tr_safe), 2)
    flash_pr = round(_safe_div(flash_assists, tr_safe), 3)

    # Composite impact score: rough HLTV-inspired 0-100 scale
    impact = (
        kpr * 25
        + _safe_div(first_kills, tr_safe) * 20
        + _safe_div(clutch_wins, tr_safe) * 25
        + _safe_div(multi_total, tr_safe) * 15
        + _safe_div(float(adr_value or 0.0), 150.0) * 15
    )
    impact_score = round(min(100.0, max(0.0, impact)), 1)

    return PlayerFeatureVector(
        player_steam_id=steam_id,
        player_name=name,
        kills=kills,
        deaths=deaths,
        assists=assists,
        adr=round(float(adr_value or 0.0), 1),
        kd_ratio=kd,
        kpr=kpr,
        dpr=dpr,
        headshot_pct=hs_pct,
        kast_pct=kast_pct,
        survival_rate=survival,
        first_kill_rate=fk_rate,
        opening_win_rate=opening_wr,
        multi_kill_rate=multi_rate,
        clutch_wins=clutch_wins,
        trade_kill_pct=trade_kill_pct,
        utility_damage_per_round=util_dmg_pr,
        flash_assists_per_round=flash_pr,
        impact_score=impact_score,
    )


# --------------------------------------------------------------------------- #
# Team features
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class TeamFeatureVector:
    """Aggregated team-level feature vector."""

    team_name: str
    players: int
    total_kills: int
    total_deaths: int
    total_damage: int
    avg_kd: float
    avg_adr: float
    avg_kast: float
    avg_impact: float
    opening_duel_win_rate: float
    utility_damage_per_round: float
    best_player_steam_id: str | None
    best_player_impact: float

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def extract_team_features(team: Any) -> TeamFeatureVector:
    """Extract team-level features.

    `team` may be a dict with keys {name, player_stats, total_rounds} or any
    object exposing equivalent attributes. `player_stats` should be an
    iterable of player stat objects/dicts (as consumed by
    extract_player_features).
    """
    name = str(_get(team, "name", "") or _get(team, "team_name", "") or "")
    total_rounds = int(_get(team, "total_rounds", 0) or 0)
    player_stats_iter: Iterable[Any] = _get(team, "player_stats") or _get(team, "players_stats") or []

    vectors: list[PlayerFeatureVector] = [
        extract_player_features(ps, total_rounds=total_rounds)
        for ps in player_stats_iter
    ]

    if not vectors:
        return TeamFeatureVector(
            team_name=name,
            players=0,
            total_kills=0,
            total_deaths=0,
            total_damage=0,
            avg_kd=0.0,
            avg_adr=0.0,
            avg_kast=0.0,
            avg_impact=0.0,
            opening_duel_win_rate=0.0,
            utility_damage_per_round=0.0,
            best_player_steam_id=None,
            best_player_impact=0.0,
        )

    n = len(vectors)
    total_kills = sum(v.kills for v in vectors)
    total_deaths = sum(v.deaths for v in vectors)
    total_damage_est = sum(int(v.adr * max(total_rounds, 1)) for v in vectors)

    avg_kd = round(_safe_div(sum(v.kd_ratio for v in vectors), n), 3)
    avg_adr = round(_safe_div(sum(v.adr for v in vectors), n), 1)
    avg_kast = round(_safe_div(sum(v.kast_pct for v in vectors), n), 1)
    avg_impact = round(_safe_div(sum(v.impact_score for v in vectors), n), 1)
    avg_opening = round(_safe_div(sum(v.opening_win_rate for v in vectors), n), 1)
    util_pr = round(_safe_div(sum(v.utility_damage_per_round for v in vectors), n), 2)

    best = max(vectors, key=lambda v: v.impact_score)

    return TeamFeatureVector(
        team_name=name,
        players=n,
        total_kills=total_kills,
        total_deaths=total_deaths,
        total_damage=total_damage_est,
        avg_kd=avg_kd,
        avg_adr=avg_adr,
        avg_kast=avg_kast,
        avg_impact=avg_impact,
        opening_duel_win_rate=avg_opening,
        utility_damage_per_round=util_pr,
        best_player_steam_id=best.player_steam_id or None,
        best_player_impact=best.impact_score,
    )
