"""CS2 demo parser wrapper around awpy v2.

Parses a .dem file and returns structured data ready for DB insertion.
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class PlayerData:
    steam_id: str
    name: str
    team_side: str | None  # starting side: "T" or "CT"
    kills: int = 0
    deaths: int = 0
    assists: int = 0
    headshot_kills: int = 0
    damage: int = 0
    adr: float | None = None
    flash_assists: int = 0
    enemies_flashed: int = 0
    utility_damage: int = 0
    first_kills: int = 0
    first_deaths: int = 0


@dataclass
class RoundData:
    round_number: int
    winner_side: str | None  # "T" or "CT"
    win_reason: str | None
    team1_score: int = 0
    team2_score: int = 0
    bomb_planted: bool | None = None
    bomb_defused: bool | None = None
    plant_site: str | None = None
    start_tick: int | None = None
    end_tick: int | None = None
    duration_seconds: float | None = None


@dataclass
class ParsedDemo:
    map_name: str
    tickrate: int
    duration_seconds: float | None
    team1_name: str | None
    team2_name: str | None
    team1_score: int
    team2_score: int
    total_rounds: int
    overtime_rounds: int
    rounds: list[RoundData] = field(default_factory=list)
    players: list[PlayerData] = field(default_factory=list)


def _classify_win_reason(reason: str | None) -> str | None:
    """Normalize awpy win_reason strings to our schema values."""
    if reason is None:
        return None
    r = reason.lower()
    if "bomb" in r and "explo" in r:
        return "bomb_exploded"
    if "defus" in r:
        return "defuse"
    if "elim" in r or "death" in r or "kill" in r:
        return "elimination"
    if "time" in r or "timer" in r:
        return "time"
    if "surrender" in r:
        return "surrender"
    return reason[:30]


def _get_awpy_demo_class():
    """Lazy import of awpy.Demo to avoid hard dependency at import time."""
    from awpy import Demo
    return Demo


def parse_demo(dem_path: str | Path, _demo_cls=None) -> ParsedDemo:
    """Parse a CS2 .dem file and return structured data.

    Requires awpy>=2.0.0 to be installed.
    """
    dem_path = Path(dem_path)
    if not dem_path.exists():
        raise FileNotFoundError(f"Demo file not found: {dem_path}")

    Demo = _demo_cls or _get_awpy_demo_class()  # noqa: N806

    logger.info("Parsing demo: %s", dem_path.name)
    dem = Demo(str(dem_path))
    dem.parse()

    # --- Header ---
    header = dem.header
    map_name = header.get("map_name", "unknown") if isinstance(header, dict) else "unknown"

    # --- Rounds ---
    rounds_df = dem.rounds
    rounds: list[RoundData] = []
    t_score = 0
    ct_score = 0

    if rounds_df is not None and len(rounds_df) > 0:
        for row in rounds_df.iter_rows(named=True):
            round_num = row.get("round_num", len(rounds) + 1)
            winner = row.get("winner")

            if winner == "T":
                t_score += 1
            elif winner == "CT":
                ct_score += 1

            start_tick = row.get("start")
            end_tick = row.get("end")
            duration = None
            if start_tick is not None and end_tick is not None:
                # Approximate duration using 64 tick default
                duration = (end_tick - start_tick) / 64.0

            bomb_plant_tick = row.get("bomb_plant")
            bomb_site = row.get("bomb_site")

            rounds.append(
                RoundData(
                    round_number=round_num,
                    winner_side=winner,
                    win_reason=_classify_win_reason(row.get("reason")),
                    team1_score=t_score,
                    team2_score=ct_score,
                    bomb_planted=bomb_plant_tick is not None and bomb_plant_tick > 0,
                    bomb_defused="defus" in row.get("reason", "").lower() if row.get("reason") else None,
                    plant_site=bomb_site if bomb_site else None,
                    start_tick=start_tick,
                    end_tick=end_tick,
                    duration_seconds=round(duration, 2) if duration else None,
                )
            )

    total_rounds = len(rounds)
    overtime_rounds = max(0, total_rounds - 30) if total_rounds > 30 else 0

    # --- Kills analysis ---
    kills_df = dem.kills
    player_kills: dict[str, int] = {}
    player_deaths: dict[str, int] = {}
    player_assists: dict[str, int] = {}
    player_hs_kills: dict[str, int] = {}
    player_flash_assists: dict[str, int] = {}
    player_first_kills: dict[str, int] = {}
    player_first_deaths: dict[str, int] = {}
    player_names: dict[str, str] = {}

    if kills_df is not None and len(kills_df) > 0:
        # Track first kills/deaths per round
        seen_rounds: set[int] = set()

        for row in kills_df.iter_rows(named=True):
            killer_sid = str(row.get("steamid", ""))
            victim_sid = str(row.get("victim_steamid", ""))
            killer_name = row.get("name", "")
            victim_name = row.get("victim_name", "")
            round_num = row.get("round_num")

            if killer_sid and killer_sid != "0":
                player_kills[killer_sid] = player_kills.get(killer_sid, 0) + 1
                player_names[killer_sid] = killer_name

                # Check headshot via weapon or event data
                if row.get("headshot", False):
                    player_hs_kills[killer_sid] = player_hs_kills.get(killer_sid, 0) + 1

            if victim_sid and victim_sid != "0":
                player_deaths[victim_sid] = player_deaths.get(victim_sid, 0) + 1
                player_names[victim_sid] = victim_name

            # Assists
            assister_sid = str(row.get("assister_steamid", "")) if row.get("assister_steamid") else ""
            if assister_sid and assister_sid != "0":
                player_assists[assister_sid] = player_assists.get(assister_sid, 0) + 1
                if row.get("assistedflash", False):
                    player_flash_assists[assister_sid] = player_flash_assists.get(assister_sid, 0) + 1

            # First kill/death per round
            if round_num is not None and round_num not in seen_rounds:
                seen_rounds.add(round_num)
                if killer_sid and killer_sid != "0":
                    player_first_kills[killer_sid] = player_first_kills.get(killer_sid, 0) + 1
                if victim_sid and victim_sid != "0":
                    player_first_deaths[victim_sid] = player_first_deaths.get(victim_sid, 0) + 1

    # --- Damage analysis ---
    damages_df = dem.damages
    player_damage: dict[str, int] = {}
    player_utility_dmg: dict[str, int] = {}

    if damages_df is not None and len(damages_df) > 0:
        for row in damages_df.iter_rows(named=True):
            attacker_sid = str(row.get("steamid", "") or row.get("attacker_steamid", ""))
            dmg = row.get("dmg_health_real", 0) or 0

            if attacker_sid and attacker_sid != "0" and dmg > 0:
                player_damage[attacker_sid] = player_damage.get(attacker_sid, 0) + dmg
                if attacker_sid in player_names:
                    pass  # name already known
                attacker_name = row.get("attacker_name", "") or row.get("name", "")
                if attacker_name:
                    player_names[attacker_sid] = attacker_name

                # Utility damage (grenades, molotov, etc.)
                weapon = str(row.get("weapon", "")).lower()
                if weapon in ("hegrenade", "molotov", "incgrenade", "inferno", "flashbang", "smokegrenade"):
                    player_utility_dmg[attacker_sid] = player_utility_dmg.get(attacker_sid, 0) + dmg

    # --- Build player list ---
    all_steam_ids = set(player_kills.keys()) | set(player_deaths.keys()) | set(player_damage.keys())

    # Try to determine team sides from ticks data
    player_sides: dict[str, str] = {}
    ticks_df = dem.ticks
    if ticks_df is not None and len(ticks_df) > 0:
        # Get side from first round tick data if available
        try:
            cols = ticks_df.columns
            if "side" in cols or "team" in cols:
                side_col = "side" if "side" in cols else "team"
                first_round = ticks_df.filter(ticks_df["round_num"] == 1)
                if len(first_round) > 0:
                    for row in first_round.unique(subset=["steamid"]).iter_rows(named=True):
                        sid = str(row.get("steamid", ""))
                        side = row.get(side_col, "")
                        if sid and side:
                            player_sides[sid] = str(side).upper()
        except Exception:
            logger.debug("Could not extract team sides from ticks data")

    players: list[PlayerData] = []
    for sid in all_steam_ids:
        name = player_names.get(sid, f"Player_{sid[-4:]}")
        kills = player_kills.get(sid, 0)
        deaths = player_deaths.get(sid, 0)
        damage = player_damage.get(sid, 0)
        adr = round(damage / total_rounds, 1) if total_rounds > 0 else None

        players.append(
            PlayerData(
                steam_id=sid,
                name=name,
                team_side=player_sides.get(sid),
                kills=kills,
                deaths=deaths,
                assists=player_assists.get(sid, 0),
                headshot_kills=player_hs_kills.get(sid, 0),
                damage=damage,
                adr=adr,
                flash_assists=player_flash_assists.get(sid, 0),
                enemies_flashed=0,  # Not directly available from kills/damages
                utility_damage=player_utility_dmg.get(sid, 0),
                first_kills=player_first_kills.get(sid, 0),
                first_deaths=player_first_deaths.get(sid, 0),
            )
        )

    # Sort players by kills descending
    players.sort(key=lambda p: p.kills, reverse=True)

    # Estimate total duration
    total_duration = None
    if rounds and rounds[-1].end_tick and rounds[0].start_tick:
        total_duration = round((rounds[-1].end_tick - rounds[0].start_tick) / 64.0, 1)

    return ParsedDemo(
        map_name=map_name,
        tickrate=64,  # CS2 uses 64 tick (sub-tick system)
        duration_seconds=total_duration,
        team1_name=None,  # awpy doesn't provide team names directly
        team2_name=None,
        team1_score=t_score,
        team2_score=ct_score,
        total_rounds=total_rounds,
        overtime_rounds=overtime_rounds,
        rounds=rounds,
        players=players,
    )
