#!/usr/bin/env python3
"""
Train UMAP + HDBSCAN player archetype clustering.

Aggregates player stats across all matches, projects to 2D with UMAP,
then clusters with HDBSCAN to find natural archetypes.

Output: cluster labels + 2D embeddings + archetype descriptions.

Usage:
    python train_clustering.py --demos-dir D:/aics2-data/demos/pro --output-dir D:/aics2-data
"""

import argparse
import json
import logging
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).parent))


def build_player_dataset(demos_dir: Path):
    """Aggregate stats per player across all demos."""
    from src.services.demo_parser import parse_demo

    dem_files = sorted(demos_dir.glob("*.dem"))
    logger.info("Aggregating player stats from %d demos", len(dem_files))

    players_data = defaultdict(lambda: {
        "name": "",
        "matches": 0,
        "total_rounds": 0,
        "kills": 0, "deaths": 0, "assists": 0,
        "headshot_kills": 0, "first_kills": 0, "first_deaths": 0,
        "trade_kills": 0, "trade_deaths": 0,
        "kast_rounds": 0, "rounds_survived": 0,
        "multi_3k": 0, "multi_4k": 0, "multi_5k": 0,
        "clutch_wins": 0, "flash_assists": 0,
        "damage": 0, "utility_damage": 0,
    })

    for i, dem_path in enumerate(dem_files):
        try:
            parsed = parse_demo(dem_path)
        except Exception:
            continue

        for p in parsed.players:
            d = players_data[p.steam_id]
            d["name"] = p.name
            d["matches"] += 1
            d["total_rounds"] += parsed.total_rounds
            d["kills"] += p.kills
            d["deaths"] += p.deaths
            d["assists"] += p.assists
            d["headshot_kills"] += p.headshot_kills
            d["first_kills"] += p.first_kills
            d["first_deaths"] += p.first_deaths
            d["trade_kills"] += p.trade_kills
            d["trade_deaths"] += p.trade_deaths
            d["kast_rounds"] += p.kast_rounds
            d["rounds_survived"] += p.rounds_survived
            d["multi_3k"] += p.multi_kills_3k
            d["multi_4k"] += p.multi_kills_4k
            d["multi_5k"] += p.multi_kills_5k
            d["clutch_wins"] += p.clutch_wins
            d["flash_assists"] += p.flash_assists
            d["damage"] += p.damage
            d["utility_damage"] += p.utility_damage

        if (i + 1) % 20 == 0:
            logger.info("  [%d/%d] %d unique players", i + 1, len(dem_files), len(players_data))

    # Filter players with enough matches
    players_data = {sid: d for sid, d in players_data.items() if d["matches"] >= 2}

    # Build feature matrix (rates, not counts)
    steam_ids = []
    names = []
    features = []

    for sid, d in players_data.items():
        rounds = max(d["total_rounds"], 1)
        kills = max(d["kills"], 1)
        feat = [
            d["kills"] / rounds,           # KPR
            d["deaths"] / rounds,          # DPR
            d["assists"] / rounds,
            d["kills"] / max(d["deaths"], 1),  # KD
            d["headshot_kills"] / kills,   # HS%
            d["kast_rounds"] / rounds,     # KAST%
            d["rounds_survived"] / rounds, # survival
            d["first_kills"] / rounds,     # opening KR
            d["first_deaths"] / rounds,    # opening DR
            d["trade_kills"] / rounds,
            d["trade_deaths"] / rounds,
            d["multi_3k"] / rounds,
            d["multi_4k"] / rounds,
            d["clutch_wins"] / rounds,
            d["flash_assists"] / rounds,
            d["damage"] / rounds,          # ADR
            d["utility_damage"] / rounds,
        ]
        steam_ids.append(sid)
        names.append(d["name"])
        features.append(feat)

    X = np.array(features, dtype=np.float32)
    logger.info("Feature matrix: %d players, %d features", len(X), X.shape[1])
    return X, steam_ids, names


def cluster_players(X, steam_ids, names, output_dir: Path):
    """UMAP + HDBSCAN clustering."""
    try:
        import hdbscan
        import umap
    except ImportError as e:
        logger.error("Missing libs: %s. Run: pip install umap-learn hdbscan", e)
        return None

    from sklearn.preprocessing import StandardScaler

    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # UMAP
    logger.info("Running UMAP...")
    reducer = umap.UMAP(
        n_components=2,
        n_neighbors=min(15, len(X) - 1),
        min_dist=0.1,
        random_state=42,
    )
    embedding = reducer.fit_transform(X_scaled)

    # HDBSCAN
    logger.info("Running HDBSCAN...")
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=max(5, len(X) // 20),
        min_samples=3,
    )
    cluster_labels = clusterer.fit_predict(embedding)

    n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
    n_noise = (cluster_labels == -1).sum()
    logger.info("Found %d clusters, %d noise points", n_clusters, n_noise)

    # Compute archetype profile for each cluster
    archetypes = {}
    feat_names = [
        "KPR", "DPR", "APR", "KD", "HS%", "KAST%", "survival",
        "opening_KR", "opening_DR", "trade_KR", "trade_DR",
        "multi_3k_R", "multi_4k_R", "clutch_R", "flash_R",
        "ADR", "util_dmg",
    ]

    for cluster_id in set(cluster_labels):
        if cluster_id == -1:
            continue
        mask = cluster_labels == cluster_id
        cluster_X = X[mask]
        cluster_means = cluster_X.mean(axis=0)
        global_means = X.mean(axis=0)
        global_stds = X.std(axis=0) + 1e-6

        # Z-scores for each feature
        z_scores = (cluster_means - global_means) / global_stds
        top_features = sorted(
            zip(feat_names, z_scores),
            key=lambda x: -abs(x[1]),
        )[:5]

        # Generate archetype name from top features
        name_hints = []
        for fname, z in top_features:
            if abs(z) < 0.5:
                continue
            direction = "high" if z > 0 else "low"
            name_hints.append(f"{direction}_{fname}")

        archetype_name = _name_archetype(top_features)

        archetypes[int(cluster_id)] = {
            "name": archetype_name,
            "size": int(mask.sum()),
            "top_features": [
                {"feature": f, "z_score": round(float(z), 2)}
                for f, z in top_features
            ],
            "sample_players": [names[i] for i in np.where(mask)[0][:5]],
        }

    # Save results
    output = {
        "n_clusters": n_clusters,
        "n_players": len(X),
        "n_noise": int(n_noise),
        "archetypes": archetypes,
        "players": [
            {
                "steam_id": sid,
                "name": name,
                "cluster": int(label),
                "x": float(embedding[i, 0]),
                "y": float(embedding[i, 1]),
            }
            for i, (sid, name, label) in enumerate(zip(steam_ids, names, cluster_labels))
        ],
    }

    checkpoint_dir = output_dir / "checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    out_path = checkpoint_dir / "player_clusters.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    logger.info("Saved clusters to %s", out_path)

    # Print archetypes
    logger.info("=" * 60)
    logger.info("DISCOVERED ARCHETYPES")
    logger.info("=" * 60)
    for cid, info in archetypes.items():
        logger.info("Cluster %d: %s (%d players)", cid, info["name"], info["size"])
        for f in info["top_features"][:3]:
            logger.info("  %s: z=%.2f", f["feature"], f["z_score"])
        logger.info("  Players: %s", ", ".join(info["sample_players"][:3]))
        logger.info("")


def _name_archetype(top_features) -> str:
    """Generate archetype name from top z-scores."""
    high_kpr = any(f == "KPR" and z > 0.5 for f, z in top_features)
    high_dpr = any(f == "DPR" and z > 0.5 for f, z in top_features)
    low_dpr = any(f == "DPR" and z < -0.5 for f, z in top_features)
    high_opening = any(f == "opening_KR" and z > 0.5 for f, z in top_features)
    high_clutch = any(f == "clutch_R" and z > 0.5 for f, z in top_features)
    high_kast = any(f == "KAST%" and z > 0.5 for f, z in top_features)
    high_flash = any(f == "flash_R" and z > 0.5 for f, z in top_features)
    high_util = any(f == "util_dmg" and z > 0.5 for f, z in top_features)
    high_survival = any(f == "survival" and z > 0.5 for f, z in top_features)

    if high_opening and high_kpr:
        return "Entry Fragger"
    if high_clutch and high_survival:
        return "Lurker / Clutcher"
    if high_kast and low_dpr:
        return "Consistent Anchor"
    if high_flash or high_util:
        return "Support / IGL"
    if high_kpr and high_dpr:
        return "Aggressive Star"
    if high_survival and not high_kpr:
        return "Passive Anchor"
    if low_dpr and high_kast:
        return "Smart Player"
    return "Balanced Player"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--demos-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("PLAYER ARCHETYPE CLUSTERING (UMAP + HDBSCAN)")
    logger.info("=" * 60)

    X, steam_ids, names = build_player_dataset(args.demos_dir)
    if len(X) < 10:
        logger.error("Not enough players to cluster (got %d)", len(X))
        sys.exit(1)

    cluster_players(X, steam_ids, names, args.output_dir)


if __name__ == "__main__":
    main()
