#!/usr/bin/env python3
"""
Smart labeling with 10 contextual variables for positioning error detection.

Uses win probability model + game context to create realistic labels:
- Entry frag in execute → no_error (role)
- Caught rotating alone, full buy → critical
- Died in 1v4, round already lost → no_error (irrelevant)
- Over-peeked after getting a kill → minor/critical
- Eco round death → no_error (economic disadvantage, not positioning)

Variables used:
1. Win probability delta (from trained model)
2. Teammates nearby (trade range)
3. Was traded (kill sequence)
4. Bomb state at death (planted or not)
5. Economy context (eco/force/full buy)
6. Kills before dying (in same round)
7. Alive count (was it already lost?)
8. Round phase (early/mid/late)
9. Weapon matchup (pistol vs rifle?)
10. Velocity at death (caught moving?)

Usage:
    python smart_labeling.py --demos-dir D:/aics2-data/demos/pro --output-dir D:/aics2-data
"""

import argparse
import gc
import logging
import sys
from pathlib import Path

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).parent))

TRADE_RANGE = 800.0
CLOSE_RANGE = 500.0

# Weapon categories for matchup analysis
PISTOLS = {"glock", "usp_silencer", "hkp2000", "p250", "tec9", "fiveseven", "deagle", "revolver", "cz75a", "elite"}
RIFLES = {"ak47", "m4a1", "m4a1_silencer", "sg556", "aug", "famas", "galilar"}
AWPS = {"awp", "ssg08"}
SMGS = {"mp9", "mac10", "mp7", "ump45", "p90", "mp5sd", "bizon"}


def _dist_3d(x1, y1, z1, x2, y2, z2) -> float:
    return ((x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2) ** 0.5


def _weapon_tier(weapon: str) -> int:
    """0=pistol, 1=smg, 2=rifle, 3=awp, 4=other"""
    w = (weapon or "").lower()
    if w in PISTOLS:
        return 0
    if w in SMGS:
        return 1
    if w in RIFLES:
        return 2
    if w in AWPS:
        return 3
    return 1  # knife, shotgun, etc


def build_and_train_win_prob(demos_dir: Path):
    """Build win prob dataset and train model (same as win_probability.py)."""
    from src.services.demo_parser import parse_demo

    try:
        import lightgbm as lgb
    except ImportError:
        logger.error("LightGBM not installed")
        return None

    from sklearn.model_selection import train_test_split

    dem_files = sorted(demos_dir.glob("*.dem"))
    logger.info("Building win prob from %d demos", len(dem_files))

    features_list = []
    labels_list = []

    for i, dem_path in enumerate(dem_files):
        try:
            parsed = parse_demo(dem_path)
        except Exception:
            continue

        if not parsed.raw_kills or not parsed.raw_ticks or not parsed.rounds:
            continue

        round_winners = {}
        for r in parsed.rounds:
            if r.winner_side:
                round_winners[r.round_number] = r.winner_side

        for kill in parsed.raw_kills:
            round_num = kill.get("round_num", 0)
            kill_tick = kill.get("tick", 0)
            victim_side = kill.get("victim_side", "")
            if round_num not in round_winners:
                continue

            # Count alive before kill (simple scan)
            alive_t = 0
            alive_ct = 0
            seen = set()
            for t in parsed.raw_ticks:
                if t.get("round_num") != round_num:
                    continue
                if abs(t.get("tick", 0) - kill_tick) > 64:
                    continue
                sid = t.get("steamid")
                if sid in seen or (t.get("health") or 0) <= 0:
                    continue
                seen.add(sid)
                if t.get("side") == "t":
                    alive_t += 1
                else:
                    alive_ct += 1

            alive_t = min(alive_t, 5)
            alive_ct = min(alive_ct, 5)

            total_rounds = len(parsed.rounds)
            t_score = sum(1 for r in parsed.rounds if r.round_number < round_num and r.winner_side == "t")
            ct_score = sum(1 for r in parsed.rounds if r.round_number < round_num and r.winner_side == "ct")

            feat = [
                alive_t / 5.0,
                alive_ct / 5.0,
                1.0 if victim_side == "t" else 0.0,
                round_num / 30.0,
                (t_score - ct_score) / max(total_rounds, 1),
            ]
            features_list.append(feat)
            labels_list.append(1 if round_winners[round_num] == "t" else 0)

        gc.collect()
        if (i + 1) % 10 == 0:
            logger.info("  Win prob dataset: %d/%d demos, %d snapshots", i + 1, len(dem_files), len(features_list))

    X = np.array(features_list, dtype=np.float32)
    y = np.array(labels_list, dtype=np.int32)
    logger.info("Win prob dataset: %d snapshots", len(X))

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    train_data = lgb.Dataset(X_train, label=y_train)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

    model = lgb.train(
        {"objective": "binary", "metric": "binary_logloss", "learning_rate": 0.05,
         "num_leaves": 31, "max_depth": 5, "verbose": -1},
        train_data, num_boost_round=300, valid_sets=[val_data],
        callbacks=[lgb.early_stopping(20), lgb.log_evaluation(100)],
    )

    from sklearn.metrics import accuracy_score, roc_auc_score
    y_pred = model.predict(X_val)
    logger.info("Win Prob — Acc: %.3f, AUC: %.3f",
                accuracy_score(y_val, (y_pred > 0.5).astype(int)),
                roc_auc_score(y_val, y_pred))
    return model


def smart_label_demos(demos_dir: Path, output_dir: Path, win_prob_model) -> dict:
    """Label deaths using 10 contextual variables."""
    from src.services.demo_parser import parse_demo

    pos_dir = output_dir / "positioning"
    pos_dir.mkdir(parents=True, exist_ok=True)

    dem_files = sorted(demos_dir.glob("*.dem"))
    stats = {"total": 0, "no_error": 0, "minor": 0, "critical": 0, "failed": 0}

    for i, dem_path in enumerate(dem_files):
        logger.info("[%d/%d] %s", i + 1, len(dem_files), dem_path.name)
        try:
            parsed = parse_demo(dem_path)
        except Exception as e:
            logger.error("  Failed: %s", e)
            stats["failed"] += 1
            continue

        if not parsed.raw_ticks or not parsed.raw_kills or not parsed.rounds:
            continue

        # --- Pre-compute round context ---
        round_winners = {}
        round_buy_type = {}
        round_bomb_planted = {}
        for r in parsed.rounds:
            if r.winner_side:
                round_winners[r.round_number] = r.winner_side
            round_buy_type[r.round_number] = {
                "t": r.t_buy_type or "unknown",
                "ct": r.ct_buy_type or "unknown",
            }
            round_bomb_planted[r.round_number] = r.bomb_planted or False

        # Index ticks
        ticks_by_player_round: dict[tuple, list[dict]] = {}
        for t in parsed.raw_ticks:
            key = (t["steamid"], t.get("round_num", 0))
            ticks_by_player_round.setdefault(key, []).append(t)

        # Compute trades
        kills_sorted = sorted(parsed.raw_kills, key=lambda k: k.get("tick", 0))
        traded_sids: set[str] = set()
        for ki, k1 in enumerate(kills_sorted):
            k1_victim = str(k1.get("victim_steamid", ""))
            k1_tick = k1.get("tick", 0)
            k1_attacker = str(k1.get("attacker_steamid", ""))
            for k2 in kills_sorted[ki + 1:]:
                if k2.get("tick", 0) - k1_tick > 320:
                    break
                if str(k2.get("victim_steamid", "")) == k1_attacker:
                    traded_sids.add(k1_victim)
                    break

        # Round start ticks (approximate)
        round_start_ticks: dict[int, int] = {}
        for t in parsed.raw_ticks[:1000]:
            rn = t.get("round_num", 0)
            if rn not in round_start_ticks:
                round_start_ticks[rn] = t.get("tick", 0)

        # Pre-compute kills per player per round (for "kills before dying")
        kills_by_player_round: dict[tuple, list[int]] = {}
        for k in kills_sorted:
            attacker_sid = k.get("attacker_steamid", "")
            rn = k.get("round_num", 0)
            key = (str(attacker_sid), rn)
            kills_by_player_round.setdefault(key, []).append(k.get("tick", 0))

        window_count = 0
        for kill in parsed.raw_kills:
            victim_sid = kill.get("victim_steamid", "")
            round_num = kill.get("round_num", 0)
            kill_tick = kill.get("tick", 0)
            victim_side = kill.get("victim_side", "")
            if not victim_sid or round_num not in round_winners:
                continue

            victim_x = kill.get("victim_X", 0) or 0
            victim_y = kill.get("victim_Y", 0) or 0
            victim_z = kill.get("victim_Z", 0) or 0
            kill_dist = kill.get("distance", 1000.0) or 1000.0

            # ===== 10 CONTEXTUAL VARIABLES =====

            # 1. Win probability delta
            alive_t = 0
            alive_ct = 0
            seen_alive = set()
            teammates_nearby = 0
            teammates_close = 0
            enemies_nearby = 0
            enemies_close = 0

            for t in parsed.raw_ticks:
                if t.get("round_num") != round_num:
                    continue
                if abs(t.get("tick", 0) - kill_tick) > 64:
                    continue
                if (t.get("health") or 0) <= 0:
                    continue
                sid = t.get("steamid")
                if sid not in seen_alive:
                    seen_alive.add(sid)
                    if t.get("side") == "t":
                        alive_t += 1
                    else:
                        alive_ct += 1

                if sid == victim_sid:
                    continue
                px, py, pz = t.get("X", 0), t.get("Y", 0), t.get("Z", 0)
                d = _dist_3d(victim_x, victim_y, victim_z, px, py, pz)
                if t.get("side") == victim_side:
                    if d <= TRADE_RANGE:
                        teammates_nearby += 1
                    if d <= CLOSE_RANGE:
                        teammates_close += 1
                else:
                    if d <= TRADE_RANGE:
                        enemies_nearby += 1
                    if d <= CLOSE_RANGE:
                        enemies_close += 1

            alive_t = min(alive_t, 5)
            alive_ct = min(alive_ct, 5)

            total_rounds = len(parsed.rounds)
            t_score = sum(1 for r in parsed.rounds if r.round_number < round_num and r.winner_side == "t")
            ct_score = sum(1 for r in parsed.rounds if r.round_number < round_num and r.winner_side == "ct")
            score_diff = (t_score - ct_score) / max(total_rounds, 1)
            round_norm = round_num / 30.0

            feat_before = np.array([[alive_t / 5.0, alive_ct / 5.0, 0.0, round_norm, score_diff]], dtype=np.float32)
            if victim_side == "t":
                feat_after = np.array([[max(alive_t - 1, 0) / 5.0, alive_ct / 5.0, 1.0, round_norm, score_diff]], dtype=np.float32)
            else:
                feat_after = np.array([[alive_t / 5.0, max(alive_ct - 1, 0) / 5.0, 0.0, round_norm, score_diff]], dtype=np.float32)

            prob_before = win_prob_model.predict(feat_before)[0]
            prob_after = win_prob_model.predict(feat_after)[0]
            if victim_side == "t":
                win_delta = prob_before - prob_after
            else:
                win_delta = (1 - prob_before) - (1 - prob_after)

            # 2. Teammates nearby — already computed above

            # 3. Was traded
            was_traded = str(victim_sid) in traded_sids

            # 4. Bomb state
            bomb_planted = round_bomb_planted.get(round_num, False)

            # 5. Economy — was this an eco/force round for victim's team?
            buy_types = round_buy_type.get(round_num, {"t": "unknown", "ct": "unknown"})
            victim_buy = buy_types.get(victim_side, "unknown")
            is_eco = victim_buy in ("eco", "pistol")
            is_force = victim_buy == "force"

            # 6. Kills before dying (same round)
            victim_kills_this_round = kills_by_player_round.get((str(victim_sid), round_num), [])
            kills_before_death = sum(1 for kt in victim_kills_this_round if kt < kill_tick)

            # 7. Alive count — was the round already lost?
            if victim_side == "t":
                team_alive = alive_t
                enemy_alive = alive_ct
            else:
                team_alive = alive_ct
                enemy_alive = alive_t
            round_already_lost = team_alive <= 1 and enemy_alive >= 4  # 1vN

            # 8. Round phase (0=early <30%, 1=mid, 2=late >70%)
            start_tick = round_start_ticks.get(round_num, kill_tick - 5000)
            round_progress = min((kill_tick - start_tick) / max(kill_tick - start_tick + 3000, 1), 1.0)
            is_early = round_progress < 0.3
            is_late = round_progress > 0.7

            # 9. Weapon matchup
            victim_weapon_tier = _weapon_tier(kill.get("weapon", ""))
            attacker_weapon = kill.get("weapon", "")
            attacker_weapon_tier = _weapon_tier(attacker_weapon)
            weapon_disadvantage = attacker_weapon_tier - victim_weapon_tier  # positive = attacker had better weapon

            # 10. Velocity
            key = (victim_sid, round_num)
            player_ticks = ticks_by_player_round.get(key, [])
            pre_death = [t for t in player_ticks if t["tick"] <= kill_tick]
            pre_death.sort(key=lambda t: t["tick"])
            pre_death = pre_death[-64:]

            velocity = 0.0
            if len(pre_death) >= 2:
                t1, t2 = pre_death[-2], pre_death[-1]
                dt = max(t2["tick"] - t1["tick"], 1)
                dx = t2.get("X", 0) - t1.get("X", 0)
                dy = t2.get("Y", 0) - t1.get("Y", 0)
                velocity = (dx ** 2 + dy ** 2) ** 0.5 / dt * 64

            # ===== SMART LABELING LOGIC =====

            # --- Automatic NO_ERROR cases ---
            if round_already_lost:
                # Round was already lost (1v4+), death doesn't matter
                label = 0
                stats["no_error"] += 1
            elif is_eco and weapon_disadvantage >= 2:
                # Eco round, died to much better weapon — economic not positional
                label = 0
                stats["no_error"] += 1
            elif was_traded and teammates_nearby >= 1:
                # Traded with support — plan worked
                label = 0
                stats["no_error"] += 1
            elif kills_before_death >= 2:
                # Got 2+ kills before dying — impactful, not an error
                label = 0
                stats["no_error"] += 1
            elif bomb_planted and victim_side == "ct" and is_late:
                # CT died retaking bomb late round — forced engagement
                label = 0
                stats["no_error"] += 1
            elif is_early and kills_before_death >= 1 and was_traded:
                # Entry frag: got a kill, was traded — role executed
                label = 0
                stats["no_error"] += 1

            # --- CRITICAL cases ---
            elif win_delta > 0.15 and teammates_nearby == 0 and not was_traded:
                # High impact, isolated, not traded
                label = 2
                stats["critical"] += 1
            elif teammates_nearby == 0 and velocity > 200 and not was_traded and win_delta > 0.05:
                # Caught rotating alone, meaningful round
                label = 2
                stats["critical"] += 1
            elif kills_before_death >= 1 and not was_traded and teammates_nearby == 0 and win_delta > 0.10:
                # Over-peek: got a kill, should have fallen back, died isolated
                label = 2
                stats["critical"] += 1
            elif enemies_close >= 2 and teammates_nearby == 0 and win_delta > 0.10:
                # Multiple enemies close, no support
                label = 2
                stats["critical"] += 1

            # --- MINOR cases ---
            elif win_delta > 0.05 and not was_traded:
                # Moderate impact, not traded
                label = 1
                stats["minor"] += 1
            elif teammates_nearby == 0 and not was_traded:
                # Isolated but low impact round
                label = 1
                stats["minor"] += 1

            # --- Default: NO_ERROR ---
            else:
                label = 0
                stats["no_error"] += 1

            # ===== BUILD FEATURE WINDOW =====
            if len(pre_death) < 5:
                continue

            features = np.zeros((64, 18), dtype=np.float32)
            offset = 64 - len(pre_death)
            for j, t in enumerate(pre_death):
                idx = offset + j
                features[idx, 0] = t.get("X", 0) / 3000.0
                features[idx, 1] = t.get("Y", 0) / 3000.0
                features[idx, 2] = t.get("Z", 0) / 500.0
                features[idx, 3] = t.get("health", 100) / 100.0
                features[idx, 4] = 1.0 if t.get("side") == "ct" else 0.0

            features[:, 5] = kill_dist / 3000.0
            features[:, 6] = 1.0 if kill.get("headshot") else 0.0
            features[:, 7] = 1.0 if kill.get("thrusmoke") else 0.0
            features[:, 8] = teammates_nearby / 4.0
            features[:, 9] = teammates_close / 4.0
            features[:, 10] = enemies_nearby / 4.0
            features[:, 11] = enemies_close / 4.0
            features[:, 12] = 1.0 if was_traded else 0.0
            features[:, 13] = min(velocity, 500.0) / 500.0
            features[:, 14] = win_delta  # normalized already (0-1 range)
            features[:, 15] = kills_before_death / 3.0  # 0-1 normalized
            features[:, 16] = 1.0 if is_eco else (0.5 if is_force else 0.0)
            features[:, 17] = team_alive / 5.0

            sid_str = str(victim_sid)[-6:]
            window_id = f"{dem_path.stem}_r{round_num}_t{kill_tick}_{sid_str}"
            np.savez_compressed(
                pos_dir / f"{window_id}.npz",
                features=features,
                label=np.array(label, dtype=np.int64),
            )
            window_count += 1

        stats["total"] += window_count
        gc.collect()

        logger.info("  %d windows (0=%d 1=%d 2=%d)",
                     window_count, stats["no_error"], stats["minor"], stats["critical"])

    total = stats["total"]
    logger.info(
        "\nSMART LABELING COMPLETE: %d windows\n  no_error: %d (%.0f%%)\n  minor: %d (%.0f%%)\n  critical: %d (%.0f%%)\n  failed: %d demos",
        total,
        stats["no_error"], stats["no_error"] * 100 / max(total, 1),
        stats["minor"], stats["minor"] * 100 / max(total, 1),
        stats["critical"], stats["critical"] * 100 / max(total, 1),
        stats["failed"],
    )
    return stats


def main():
    parser = argparse.ArgumentParser(description="Smart Labeling Pipeline")
    parser.add_argument("--demos-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("SMART LABELING PIPELINE (10 variables)")
    logger.info("=" * 60)

    # Step 1: Train win prob model
    logger.info("\n[1/2] Training win probability model...")
    win_prob_model = build_and_train_win_prob(args.demos_dir)
    if win_prob_model is None:
        sys.exit(1)

    # Step 2: Smart relabel
    logger.info("\n[2/2] Smart labeling with 10 contextual variables...")
    import shutil
    pos_dir = args.output_dir / "positioning"
    if pos_dir.exists():
        shutil.rmtree(pos_dir)
    stats = smart_label_demos(args.demos_dir, args.output_dir, win_prob_model)

    logger.info("\n" + "=" * 60)
    logger.info("DONE — Now retrain: python train_pipeline.py --skip-generate --output-dir %s --epochs 100", args.output_dir)
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
