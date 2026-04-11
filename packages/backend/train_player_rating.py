#!/usr/bin/env python3
"""
Train CatBoost Player Rating model.

Calibrates against HLTV Rating 2.0 formula as ground truth.
Features: 30+ aggregated stats per player per match.

Usage:
    python train_player_rating.py --demos-dir D:/aics2-data/demos/pro --output-dir D:/aics2-data
"""

import argparse
import logging
import sys
from pathlib import Path

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).parent))


def hltv_rating_2(kpr, dpr, kast_pct, impact, adr) -> float:
    """HLTV Rating 2.0 approximation formula.

    Source: https://www.hltv.org/news/20695/introducing-rating-20
    """
    return (
        0.0073 * kast_pct +
        0.3591 * kpr -
        0.5329 * dpr +
        0.2372 * impact +
        0.0032 * adr +
        0.1587
    )


def build_dataset(demos_dir: Path):
    """Extract per-player per-match features + HLTV rating label."""
    from src.services.demo_parser import parse_demo

    dem_files = sorted(demos_dir.glob("*.dem"))
    logger.info("Building player rating dataset from %d demos", len(dem_files))

    features_list = []
    labels_list = []
    feat_names = None

    for i, dem_path in enumerate(dem_files):
        try:
            parsed = parse_demo(dem_path)
        except Exception as e:
            logger.error("[%d] Failed: %s", i + 1, e)
            continue

        total_rounds = parsed.total_rounds or 1

        for p in parsed.players:
            kills = p.kills
            deaths = p.deaths
            assists = p.assists
            adr = p.adr or 0.0
            kpr = kills / total_rounds
            dpr = deaths / total_rounds
            apr = assists / total_rounds
            hs_pct = (p.headshot_kills / max(kills, 1)) * 100
            kast = (p.kast_rounds / total_rounds) * 100
            survival = (p.rounds_survived / total_rounds) * 100
            opening_kr = p.first_kills / total_rounds
            opening_dr = p.first_deaths / total_rounds
            trade_kr = p.trade_kills / total_rounds
            trade_dr = p.trade_deaths / total_rounds
            multi_3k_r = p.multi_kills_3k / total_rounds
            multi_4k_r = p.multi_kills_4k / total_rounds
            multi_5k_r = p.multi_kills_5k / total_rounds
            clutch_r = p.clutch_wins / total_rounds
            flash_r = p.flash_assists / total_rounds
            util_dmg_r = p.utility_damage / total_rounds
            kd = kills / max(deaths, 1)

            # Impact = multi_kills weighted + opening kills + clutches
            impact = (
                2.13 * multi_4k_r +
                1.5 * multi_3k_r +
                1.0 * opening_kr +
                0.42 * clutch_r
            )

            # HLTV Rating 2.0 (label)
            rating = hltv_rating_2(kpr, dpr, kast, impact, adr)

            features = [
                kpr, dpr, apr, kd, hs_pct, kast, survival,
                opening_kr, opening_dr, trade_kr, trade_dr,
                multi_3k_r, multi_4k_r, multi_5k_r,
                clutch_r, flash_r, util_dmg_r,
                adr, impact,
                kills, deaths, assists,  # raw counts
                p.headshot_kills, p.first_kills, p.first_deaths,
                p.trade_kills, p.trade_deaths,
                p.kast_rounds, p.rounds_survived,
                total_rounds,
            ]

            if feat_names is None:
                feat_names = [
                    "kpr", "dpr", "apr", "kd", "hs_pct", "kast", "survival",
                    "opening_kr", "opening_dr", "trade_kr", "trade_dr",
                    "multi_3k_r", "multi_4k_r", "multi_5k_r",
                    "clutch_r", "flash_r", "util_dmg_r",
                    "adr", "impact",
                    "kills", "deaths", "assists",
                    "headshot_kills", "first_kills", "first_deaths",
                    "trade_kills", "trade_deaths",
                    "kast_rounds", "rounds_survived",
                    "total_rounds",
                ]

            features_list.append(features)
            labels_list.append(rating)

        if (i + 1) % 20 == 0:
            logger.info("  [%d/%d] %d player-match samples", i + 1, len(dem_files), len(features_list))

    X = np.array(features_list, dtype=np.float32)
    y = np.array(labels_list, dtype=np.float32)
    logger.info("Player rating dataset: %d samples, %d features", len(X), X.shape[1])
    return X, y, feat_names


def train(X, y, feat_names, output_dir: Path):
    """Train CatBoost regressor."""
    try:
        from catboost import CatBoostRegressor
    except ImportError:
        logger.error("CatBoost not installed. Run: pip install catboost")
        return None

    from sklearn.metrics import mean_absolute_error, r2_score
    from sklearn.model_selection import train_test_split

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

    model = CatBoostRegressor(
        iterations=500,
        learning_rate=0.05,
        depth=6,
        loss_function="RMSE",
        eval_metric="MAE",
        random_seed=42,
        early_stopping_rounds=30,
        verbose=50,
    )

    model.fit(X_train, y_train, eval_set=(X_val, y_val))

    y_pred = model.predict(X_val)
    mae = mean_absolute_error(y_val, y_pred)
    r2 = r2_score(y_val, y_pred)
    correlation = np.corrcoef(y_val, y_pred)[0, 1]

    logger.info("=" * 60)
    logger.info("PLAYER RATING — MAE: %.4f, R²: %.3f, Correlation: %.3f", mae, r2, correlation)
    logger.info("=" * 60)

    # Top features
    importances = sorted(
        zip(feat_names, model.get_feature_importance()),
        key=lambda x: -x[1],
    )
    logger.info("Top 10 features:")
    for name, imp in importances[:10]:
        logger.info("  %s: %.2f", name, imp)

    checkpoint_dir = output_dir / "checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    model_path = checkpoint_dir / "player_rating.cbm"
    model.save_model(str(model_path))
    logger.info("Saved to %s", model_path)
    return model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--demos-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("PLAYER RATING TRAINING (CatBoost)")
    logger.info("=" * 60)

    X, y, feat_names = build_dataset(args.demos_dir)
    if len(X) == 0:
        logger.error("No data extracted")
        sys.exit(1)

    train(X, y, feat_names, args.output_dir)


if __name__ == "__main__":
    main()
