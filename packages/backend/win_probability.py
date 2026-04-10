#!/usr/bin/env python3
"""
Win Probability Model for automatic positioning error labeling.

Trains a simple model to predict round winner from game state snapshots,
then uses the win probability delta at each death to label positioning errors.

High negative delta = death that significantly hurt team's chances = positioning error.
Low delta = death that didn't matter much = normal/acceptable death.

Usage:
    python win_probability.py --demos-dir D:/aics2-data/demos/pro --output-dir D:/aics2-data
"""

import argparse
import logging
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).parent))


def _count_alive_at_tick(raw_ticks: list, round_num: int, tick: int, side: str) -> int:
    """Count players alive on a side at a given tick (±64 tick window)."""
    alive = set()
    for t in raw_ticks:
        if t.get("round_num") != round_num:
            continue
        if abs(t.get("tick", 0) - tick) > 64:
            continue
        if (t.get("health") or 0) > 0 and t.get("side") == side:
            alive.add(t["steamid"])
    return len(alive)


def build_win_prob_dataset(demos_dir: Path) -> tuple[np.ndarray, np.ndarray]:
    """Build training data for win probability model from parsed demos.

    For each kill event, creates a snapshot of the game state BEFORE the kill:
    Features: [alive_t, alive_ct, kill_is_t_victim, round_number_norm, score_diff_norm]
    Label: 1 if T wins the round, 0 if CT wins
    """
    from src.services.demo_parser import parse_demo

    dem_files = sorted(demos_dir.glob("*.dem"))
    logger.info("Building win prob dataset from %d demos", len(dem_files))

    features_list = []
    labels_list = []

    for i, dem_path in enumerate(dem_files):
        logger.info("[%d/%d] %s", i + 1, len(dem_files), dem_path.name)
        try:
            parsed = parse_demo(dem_path)
        except Exception as e:
            logger.error("  Failed to parse: %s", e)
            continue
        except SystemError:
            logger.error("  System error (OOM?) parsing %s, skipping", dem_path.name)
            continue

        if not parsed.raw_kills or not parsed.raw_ticks or not parsed.rounds:
            continue

        # Free memory hint
        import gc
        gc.collect()

        # Build round outcome map: round_num → winner_side
        round_winners = {}
        for r in parsed.rounds:
            if r.winner_side:
                round_winners[r.round_number] = r.winner_side

        # For each kill, create a game state snapshot
        kills_sorted = sorted(parsed.raw_kills, key=lambda k: k.get("tick", 0))

        for kill in kills_sorted:
            round_num = kill.get("round_num", 0)
            kill_tick = kill.get("tick", 0)
            victim_side = kill.get("victim_side", "")

            if round_num not in round_winners:
                continue

            # Count alive BEFORE this kill
            alive_t = _count_alive_at_tick(parsed.raw_ticks, round_num, kill_tick - 1, "t")
            alive_ct = _count_alive_at_tick(parsed.raw_ticks, round_num, kill_tick - 1, "ct")

            # Clamp to valid range
            alive_t = max(min(alive_t, 5), 0)
            alive_ct = max(min(alive_ct, 5), 0)

            # Features
            kill_is_t_victim = 1.0 if victim_side == "t" else 0.0
            round_norm = round_num / 30.0
            total_rounds = len(parsed.rounds)
            t_score = sum(1 for r in parsed.rounds if r.round_number < round_num and r.winner_side == "t")
            ct_score = sum(1 for r in parsed.rounds if r.round_number < round_num and r.winner_side == "ct")
            score_diff = (t_score - ct_score) / max(total_rounds, 1)

            feat = [
                alive_t / 5.0,
                alive_ct / 5.0,
                kill_is_t_victim,
                round_norm,
                score_diff,
            ]
            features_list.append(feat)

            # Label: did T win this round?
            t_wins = 1 if round_winners[round_num] == "t" else 0
            labels_list.append(t_wins)

    X = np.array(features_list, dtype=np.float32)
    y = np.array(labels_list, dtype=np.int32)
    logger.info("Win prob dataset: %d snapshots", len(X))
    return X, y


def train_win_prob_model(X: np.ndarray, y: np.ndarray):
    """Train XGBoost/LightGBM model to predict round winner."""
    try:
        import lightgbm as lgb
    except ImportError:
        logger.error("LightGBM not installed")
        return None

    from sklearn.model_selection import train_test_split

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

    train_data = lgb.Dataset(X_train, label=y_train)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

    params = {
        "objective": "binary",
        "metric": "binary_logloss",
        "learning_rate": 0.05,
        "num_leaves": 31,
        "max_depth": 5,
        "verbose": -1,
    }

    model = lgb.train(
        params,
        train_data,
        num_boost_round=300,
        valid_sets=[val_data],
        callbacks=[lgb.early_stopping(20), lgb.log_evaluation(50)],
    )

    # Evaluate
    from sklearn.metrics import accuracy_score, roc_auc_score

    y_pred_proba = model.predict(X_val)
    y_pred = (y_pred_proba > 0.5).astype(int)
    acc = accuracy_score(y_val, y_pred)
    auc = roc_auc_score(y_val, y_pred_proba)
    logger.info("Win Prob Model — Accuracy: %.3f, AUC: %.3f", acc, auc)

    return model


def relabel_with_win_prob(
    demos_dir: Path, output_dir: Path, win_prob_model
) -> dict:
    """Relabel positioning windows using win probability impact.

    For each death:
    1. Compute win_prob BEFORE death (with victim alive)
    2. Compute win_prob AFTER death (victim dead)
    3. delta = before - after
    4. High delta (>0.15) + isolated → critical
    5. Medium delta (>0.05) + not traded → minor
    6. Low delta → no_error
    """
    from src.services.demo_parser import parse_demo

    pos_dir = output_dir / "positioning"
    pos_dir.mkdir(parents=True, exist_ok=True)

    dem_files = sorted(demos_dir.glob("*.dem"))
    stats = {"total": 0, "no_error": 0, "minor": 0, "critical": 0, "failed": 0}

    TRADE_RANGE = 800.0
    CLOSE_RANGE = 500.0

    for i, dem_path in enumerate(dem_files):
        logger.info("[%d/%d] %s", i + 1, len(dem_files), dem_path.name)
        try:
            parsed = parse_demo(dem_path)
        except Exception as e:
            logger.error("  Failed to parse: %s", e)
            stats["failed"] += 1
            continue
        except SystemError:
            logger.error("  System error (OOM?) parsing %s, skipping", dem_path.name)
            stats["failed"] += 1
            continue

        if not parsed.raw_ticks or not parsed.raw_kills or not parsed.rounds:
            continue

        import gc
        gc.collect()

        # Round outcomes
        round_winners = {}
        for r in parsed.rounds:
            if r.winner_side:
                round_winners[r.round_number] = r.winner_side

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

            # Count alive before/after death
            alive_t_before = _count_alive_at_tick(parsed.raw_ticks, round_num, kill_tick - 1, "t")
            alive_ct_before = _count_alive_at_tick(parsed.raw_ticks, round_num, kill_tick - 1, "ct")
            alive_t_before = max(min(alive_t_before, 5), 0)
            alive_ct_before = max(min(alive_ct_before, 5), 0)

            # After death: reduce victim's team by 1
            if victim_side == "t":
                alive_t_after = max(alive_t_before - 1, 0)
                alive_ct_after = alive_ct_before
            else:
                alive_t_after = alive_t_before
                alive_ct_after = max(alive_ct_before - 1, 0)

            # Score context
            total_rounds = len(parsed.rounds)
            t_score = sum(1 for r in parsed.rounds if r.round_number < round_num and r.winner_side == "t")
            ct_score = sum(1 for r in parsed.rounds if r.round_number < round_num and r.winner_side == "ct")
            score_diff = (t_score - ct_score) / max(total_rounds, 1)
            round_norm = round_num / 30.0

            # Win prob BEFORE death
            feat_before = np.array([[
                alive_t_before / 5.0, alive_ct_before / 5.0,
                0.0, round_norm, score_diff,
            ]], dtype=np.float32)
            prob_before = win_prob_model.predict(feat_before)[0]

            # Win prob AFTER death
            feat_after = np.array([[
                alive_t_after / 5.0, alive_ct_after / 5.0,
                1.0 if victim_side == "t" else 0.0, round_norm, score_diff,
            ]], dtype=np.float32)
            prob_after = win_prob_model.predict(feat_after)[0]

            # Delta from victim's team perspective
            if victim_side == "t":
                delta = prob_before - prob_after  # positive = bad for T
            else:
                delta = (1 - prob_before) - (1 - prob_after)  # positive = bad for CT

            # Teammate proximity
            teammates_nearby = 0
            teammates_close = 0
            enemies_nearby = 0
            enemies_close = 0

            for t in parsed.raw_ticks:
                if t.get("round_num") != round_num:
                    continue
                if abs(t.get("tick", 0) - kill_tick) > 64:
                    continue
                if (t.get("health") or 0) <= 0 or t.get("steamid") == victim_sid:
                    continue

                px, py, pz = t.get("X", 0), t.get("Y", 0), t.get("Z", 0)
                d = ((victim_x - px)**2 + (victim_y - py)**2 + (victim_z - pz)**2) ** 0.5

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

            was_traded = str(victim_sid) in traded_sids

            # --- LABEL based on win probability impact ---
            # High impact death (>15% swing) + isolated = critical
            # Medium impact (>5% swing) + not traded = minor
            # Low impact or well-supported = no_error
            if delta > 0.15 and teammates_nearby == 0:
                label = 2  # critical: high-impact isolated death
                stats["critical"] += 1
            elif delta > 0.15 and not was_traded:
                label = 2  # critical: high-impact not traded
                stats["critical"] += 1
            elif delta > 0.05 and not was_traded:
                label = 1  # minor: moderate impact, no trade
                stats["minor"] += 1
            elif delta > 0.05 and teammates_nearby == 0:
                label = 1  # minor: moderate impact, isolated
                stats["minor"] += 1
            else:
                label = 0  # no_error: low impact or well-supported
                stats["no_error"] += 1

            # --- Build feature window (same as train_pipeline.py) ---
            key = (victim_sid, round_num)
            player_ticks = ticks_by_player_round.get(key, [])
            if len(player_ticks) < 5:
                continue

            pre_death = [t for t in player_ticks if t["tick"] <= kill_tick]
            pre_death.sort(key=lambda t: t["tick"])
            pre_death = pre_death[-64:]

            velocity = 0.0
            if len(pre_death) >= 2:
                t1, t2 = pre_death[-2], pre_death[-1]
                dt = max(t2["tick"] - t1["tick"], 1)
                dx = t2.get("X", 0) - t1.get("X", 0)
                dy = t2.get("Y", 0) - t1.get("Y", 0)
                velocity = (dx**2 + dy**2) ** 0.5 / dt * 64

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
            features[:, 14] = 1.0 if kill.get("attackerblind") else 0.0
            features[:, 15] = 1.0 if kill.get("noscope") else 0.0
            features[:, 16] = 1.0 if kill.get("penetrated") else 0.0
            features[:, 17] = 1.0 if kill.get("attackerinair") else 0.0

            sid_str = str(victim_sid)[-6:]
            window_id = f"{dem_path.stem}_r{round_num}_t{kill_tick}_{sid_str}"
            np.savez_compressed(
                pos_dir / f"{window_id}.npz",
                features=features,
                label=np.array(label, dtype=np.int64),
            )
            window_count += 1

        stats["total"] += window_count
        logger.info("  %d windows (0=%d 1=%d 2=%d)",
                     window_count, stats["no_error"], stats["minor"], stats["critical"])

    total = stats["total"]
    logger.info(
        "Relabeling complete: %d windows (no_error=%d [%.0f%%], minor=%d [%.0f%%], critical=%d [%.0f%%])",
        total,
        stats["no_error"], stats["no_error"] * 100 / max(total, 1),
        stats["minor"], stats["minor"] * 100 / max(total, 1),
        stats["critical"], stats["critical"] * 100 / max(total, 1),
    )
    return stats


def main():
    parser = argparse.ArgumentParser(description="Win Probability Labeling Pipeline")
    parser.add_argument("--demos-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("WIN PROBABILITY LABELING PIPELINE")
    logger.info("=" * 60)

    # Step 1: Build win prob dataset
    logger.info("\n[1/3] Building win probability dataset...")
    X, y = build_win_prob_dataset(args.demos_dir)

    # Step 2: Train win prob model
    logger.info("\n[2/3] Training win probability model...")
    model = train_win_prob_model(X, y)
    if model is None:
        logger.error("Failed to train win prob model")
        sys.exit(1)

    # Step 3: Relabel positioning windows using win prob impact
    logger.info("\n[3/3] Relabeling positioning windows with win probability impact...")
    import shutil
    pos_dir = args.output_dir / "positioning"
    if pos_dir.exists():
        shutil.rmtree(pos_dir)
    stats = relabel_with_win_prob(args.demos_dir, args.output_dir, model)

    logger.info("\n" + "=" * 60)
    logger.info("PIPELINE COMPLETE — Now retrain with: python train_pipeline.py --skip-generate ...")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
