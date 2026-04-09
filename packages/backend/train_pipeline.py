#!/usr/bin/env python3
"""
Standalone training pipeline runner.
Run from packages/backend/ to avoid namespace conflicts.

Usage:
    python train_pipeline.py --demos-dir D:/aics2-data/demos/pro --output-dir D:/aics2-data
"""

import argparse
import logging
import os
import sys
from pathlib import Path

import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# Ensure backend src is importable
sys.path.insert(0, str(Path(__file__).parent))


def _dist_3d(x1, y1, z1, x2, y2, z2) -> float:
    return ((x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2) ** 0.5


def generate_dataset(demos_dir: Path, output_dir: Path) -> dict:
    """Parse demos and generate .npz training windows using real tick data.

    Labeling based on research (FDG 2022, Leetify, CSKnow):
    - Isolated deaths (no teammates within trade range) → error
    - Traded deaths with nearby support → no error
    - Multi-enemy exposure, velocity at death → severity
    """
    from src.services.demo_parser import parse_demo

    TRADE_RANGE = 800.0  # units — max distance for a teammate to trade
    CLOSE_RANGE = 500.0  # units — enemies dangerously close

    pos_dir = output_dir / "positioning"
    pos_dir.mkdir(parents=True, exist_ok=True)

    dem_files = sorted(demos_dir.glob("*.dem"))
    logger.info("Found %d demo files", len(dem_files))

    stats = {"total": 0, "no_error": 0, "minor": 0, "critical": 0, "failed": 0}

    for i, dem_path in enumerate(dem_files):
        logger.info("[%d/%d] Parsing %s", i + 1, len(dem_files), dem_path.name)
        try:
            parsed = parse_demo(dem_path)
        except Exception as e:
            logger.error("  Failed to parse: %s", e)
            stats["failed"] += 1
            continue

        if not parsed.raw_ticks or not parsed.raw_kills:
            logger.warning("  No tick/kill data, skipping")
            continue

        # Index ticks by (steamid, round_num) for fast lookup
        ticks_by_player_round: dict[tuple, list[dict]] = {}
        for t in parsed.raw_ticks:
            key = (t["steamid"], t.get("round_num", 0))
            ticks_by_player_round.setdefault(key, []).append(t)

        # Compute trades from kill sequence (victim traded if killer dies within 5s/320 ticks)
        kills_sorted = sorted(parsed.raw_kills, key=lambda k: k.get("tick", 0))
        traded_sids: set[str] = set()
        for ki, k1 in enumerate(kills_sorted):
            k1_victim = str(k1.get("victim_steamid", ""))
            k1_tick = k1.get("tick", 0)
            k1_side = k1.get("victim_side", "")
            # Check if attacker (who killed k1_victim) dies within 320 ticks
            k1_attacker = str(k1.get("attacker_steamid", ""))
            for k2 in kills_sorted[ki + 1:]:
                if k2.get("tick", 0) - k1_tick > 320:
                    break
                if str(k2.get("victim_steamid", "")) == k1_attacker:
                    traded_sids.add(k1_victim)
                    break

        # For each kill, build feature window + label
        window_count = 0
        for kill in parsed.raw_kills:
            victim_sid = kill.get("victim_steamid", "")
            round_num = kill.get("round_num", 0)
            kill_tick = kill.get("tick", 0)
            if not victim_sid:
                continue

            victim_x = kill.get("victim_X", 0) or 0
            victim_y = kill.get("victim_Y", 0) or 0
            victim_z = kill.get("victim_Z", 0) or 0
            victim_side = kill.get("victim_side", "")
            kill_dist = kill.get("distance", 1000.0) or 1000.0

            # --- Compute labeling signals from tick snapshot at death ---

            # Find all players alive at death tick in same round
            teammates_nearby = 0  # within TRADE_RANGE
            teammates_close = 0   # within CLOSE_RANGE
            enemies_close = 0     # within CLOSE_RANGE
            enemies_nearby = 0    # within TRADE_RANGE

            # Snapshot: all ticks within ~1 second of kill in this round
            for t in parsed.raw_ticks:
                if t.get("round_num") != round_num:
                    continue
                if abs(t.get("tick", 0) - kill_tick) > 64:
                    continue
                if (t.get("health") or 0) <= 0:
                    continue
                if t.get("steamid") == victim_sid:
                    continue

                px, py, pz = t.get("X", 0), t.get("Y", 0), t.get("Z", 0)
                d = _dist_3d(victim_x, victim_y, victim_z, px, py, pz)

                if t.get("side") == victim_side:
                    # Teammate
                    if d <= TRADE_RANGE:
                        teammates_nearby += 1
                    if d <= CLOSE_RANGE:
                        teammates_close += 1
                else:
                    # Enemy
                    if d <= TRADE_RANGE:
                        enemies_nearby += 1
                    if d <= CLOSE_RANGE:
                        enemies_close += 1

            was_traded = str(victim_sid) in traded_sids

            # --- Get victim's last 64 ticks for features ---
            key = (victim_sid, round_num)
            player_ticks = ticks_by_player_round.get(key, [])
            if len(player_ticks) < 5:
                continue

            pre_death = [t for t in player_ticks if t["tick"] <= kill_tick]
            pre_death.sort(key=lambda t: t["tick"])
            pre_death = pre_death[-64:]

            # Compute velocity from last ticks
            velocity = 0.0
            if len(pre_death) >= 2:
                t1, t2 = pre_death[-2], pre_death[-1]
                dt = max(t2["tick"] - t1["tick"], 1)
                dx = t2.get("X", 0) - t1.get("X", 0)
                dy = t2.get("Y", 0) - t1.get("Y", 0)
                velocity = (dx ** 2 + dy ** 2) ** 0.5 / dt * 64  # units/sec approx

            # --- Build 18-feature matrix ---
            features = np.zeros((64, 18), dtype=np.float32)
            offset = 64 - len(pre_death)

            for j, t in enumerate(pre_death):
                idx = offset + j
                features[idx, 0] = t.get("X", 0) / 3000.0
                features[idx, 1] = t.get("Y", 0) / 3000.0
                features[idx, 2] = t.get("Z", 0) / 500.0
                features[idx, 3] = t.get("health", 100) / 100.0
                features[idx, 4] = 1.0 if t.get("side") == "ct" else 0.0

            # Context features (constant across timesteps)
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

            # --- LABEL based on research criteria ---
            # Critical (2): isolated AND not traded AND vulnerable
            #   - No teammates within trade range OR multiple enemies close
            # Minor (1): partial support but suboptimal
            #   - Not traded, few teammates, or caught moving
            # No error (0): good positioning, fair duel
            #   - Traded, or teammates nearby for support

            if was_traded and teammates_nearby >= 1:
                # Good: died but was traded with team support
                label = 0
                stats["no_error"] += 1
            elif teammates_nearby == 0 and not was_traded:
                # Isolated and not traded = positioning error
                if enemies_close >= 2 or velocity > 200:
                    label = 2  # critical: multi-exposed or caught rotating
                    stats["critical"] += 1
                else:
                    label = 1  # minor: isolated but not worst case
                    stats["minor"] += 1
            elif not was_traded and teammates_nearby <= 1 and enemies_nearby >= 2:
                # Outnumbered without trade
                label = 2  # critical
                stats["critical"] += 1
            elif not was_traded and teammates_nearby <= 1:
                # Weak support, not traded
                label = 1  # minor
                stats["minor"] += 1
            elif was_traded and teammates_nearby == 0:
                # Traded but was alone (still a positioning concern)
                label = 1  # minor
                stats["minor"] += 1
            else:
                # Had support, was traded or had teammates
                label = 0
                stats["no_error"] += 1

            # Save
            sid_str = str(victim_sid)[-6:]
            window_id = f"{dem_path.stem}_r{round_num}_t{kill_tick}_{sid_str}"
            np.savez_compressed(
                pos_dir / f"{window_id}.npz",
                features=features,
                label=np.array(label, dtype=np.int64),
            )
            window_count += 1

        stats["total"] += window_count
        logger.info(
            "  %s: %d rounds, %d players, %d windows (0=%d 1=%d 2=%d)",
            parsed.map_name,
            parsed.total_rounds,
            len(parsed.players),
            window_count,
            stats["no_error"],
            stats["minor"],
            stats["critical"],
        )

    logger.info(
        "Dataset complete: %d windows (no_error=%d, minor=%d, critical=%d, failed=%d)",
        stats["total"],
        stats["no_error"],
        stats["minor"],
        stats["critical"],
        stats["failed"],
    )
    return stats


def train_positioning(data_dir: Path, output_dir: Path, epochs: int = 30):
    """Train the positioning Mamba model."""
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.utils.data import DataLoader, Dataset, random_split

    # Inline Mamba model (avoids importlib issues with dataclass)
    class MambaConfig:
        seq_len: int = 64
        input_dim: int = 18
        d_model: int = 128
        d_state: int = 16
        d_conv: int = 4
        expand: int = 2
        n_layers: int = 2
        num_classes: int = 3
        dropout: float = 0.1

    class SelectiveSSM(nn.Module):
        def __init__(self, d_model, d_state=16, d_conv=4, expand=2):
            super().__init__()
            d_inner = d_model * expand
            self.d_inner = d_inner
            self.d_state = d_state
            self.in_proj = nn.Linear(d_model, d_inner * 2, bias=False)
            self.conv1d = nn.Conv1d(d_inner, d_inner, d_conv, padding=d_conv - 1, groups=d_inner)
            self.x_proj = nn.Linear(d_inner, d_state * 2, bias=False)
            self.dt_proj = nn.Linear(d_state, d_inner, bias=True)
            A = torch.arange(1, d_state + 1, dtype=torch.float32).unsqueeze(0).expand(d_inner, -1)
            self.A_log = nn.Parameter(torch.log(A))
            self.D = nn.Parameter(torch.ones(d_inner))
            self.out_proj = nn.Linear(d_inner, d_model, bias=False)

        def forward(self, x):
            b, l, d = x.shape
            xz = self.in_proj(x)
            x_part, z = xz.chunk(2, dim=-1)
            x_conv = self.conv1d(x_part.transpose(1, 2))[:, :, :l].transpose(1, 2)
            x_conv = F.silu(x_conv)
            x_dbl = self.x_proj(x_conv)
            delta, B_val = x_dbl.split(self.d_state, dim=-1)
            delta = F.softplus(self.dt_proj(delta))
            A = -torch.exp(self.A_log)
            y = torch.zeros_like(x_conv)
            h = torch.zeros(b, self.d_inner, self.d_state, device=x.device)
            for i in range(l):
                h = h * torch.exp(delta[:, i].unsqueeze(-1) * A.unsqueeze(0)) + \
                    B_val[:, i].unsqueeze(1) * x_conv[:, i].unsqueeze(-1)
                y[:, i] = (h * B_val[:, i].unsqueeze(1)).sum(-1) + self.D * x_conv[:, i]
            return self.out_proj(y * F.silu(z))

    class MambaBlock(nn.Module):
        def __init__(self, d_model, **kwargs):
            super().__init__()
            self.norm = nn.LayerNorm(d_model)
            self.ssm = SelectiveSSM(d_model, **kwargs)

        def forward(self, x):
            return x + self.ssm(self.norm(x))

    class PositioningMamba(nn.Module):
        def __init__(self):
            super().__init__()
            d_model = 64  # smaller for 5k samples
            self.input_proj = nn.Linear(18, d_model)
            self.layers = nn.ModuleList([
                MambaBlock(d_model, d_state=8, d_conv=4, expand=2)
                for _ in range(2)
            ])
            self.head = nn.Sequential(
                nn.Linear(d_model, 32),
                nn.ReLU(),
                nn.Dropout(0.25),
                nn.Linear(32, 3),
            )

        def forward(self, x):
            x = self.input_proj(x)
            for layer in self.layers:
                x = layer(x)
            x = x.mean(dim=1)
            return self.head(x)

    class FocalLoss(nn.Module):
        def __init__(self, gamma=1.0, alpha=None):
            super().__init__()
            self.gamma = gamma
            self.alpha = alpha  # tensor of per-class weights

        def forward(self, inputs, targets):
            ce = F.cross_entropy(inputs, targets, weight=self.alpha, reduction='none')
            pt = torch.exp(-ce)
            return ((1 - pt) ** self.gamma * ce).mean()

    class NpzDataset(Dataset):
        def __init__(self, npz_dir: Path):
            self.files = sorted(npz_dir.glob("*.npz"))
            logger.info("Found %d training samples", len(self.files))

        def __len__(self):
            return len(self.files)

        def __getitem__(self, idx):
            data = np.load(self.files[idx])
            return (
                torch.from_numpy(data["features"]),
                torch.tensor(int(data["label"]), dtype=torch.long),
            )

    pos_dir = data_dir / "positioning"
    if not pos_dir.exists() or not list(pos_dir.glob("*.npz")):
        logger.error("No training data in %s", pos_dir)
        return

    dataset = NpzDataset(pos_dir)

    # Split by match (prevent data leakage)
    demo_stems = [f.stem.rsplit("_r", 1)[0] for f in dataset.files]
    unique_stems = sorted(set(demo_stems))
    np.random.shuffle(unique_stems)
    split_idx = int(0.8 * len(unique_stems))
    train_stems = set(unique_stems[:split_idx])

    train_indices = [i for i, s in enumerate(demo_stems) if s in train_stems]
    val_indices = [i for i, s in enumerate(demo_stems) if s not in train_stems]

    train_ds = torch.utils.data.Subset(dataset, train_indices)
    val_ds = torch.utils.data.Subset(dataset, val_indices)
    logger.info(
        "Split by match: %d train (%d matches), %d val (%d matches)",
        len(train_ds), split_idx, len(val_ds), len(unique_stems) - split_idx,
    )

    # Compute class weights from training data (inverse frequency)
    train_labels = [int(np.load(dataset.files[i])["label"]) for i in train_indices]
    from collections import Counter
    label_counts = Counter(train_labels)
    total_train = len(train_labels)
    class_weights = torch.tensor([
        total_train / max(label_counts.get(c, 1) * 3, 1) for c in range(3)
    ], dtype=torch.float32)
    class_weights = class_weights / class_weights.sum() * 3  # normalize
    logger.info("Class weights: %s (counts: %s)", class_weights.tolist(), dict(label_counts))

    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False, num_workers=0)

    model = PositioningMamba()
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=0.02)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    criterion = FocalLoss(gamma=1.0, alpha=class_weights)

    checkpoint_dir = output_dir / "checkpoints" / "positioning"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    best_val_loss = float("inf")
    patience = 15
    no_improve = 0

    for epoch in range(epochs):
        # Train
        model.train()
        train_loss = 0
        train_correct = 0
        train_total = 0
        for features, labels in train_loader:
            optimizer.zero_grad()
            logits = model(features)
            loss = criterion(logits, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item() * features.size(0)
            train_correct += (logits.argmax(1) == labels).sum().item()
            train_total += features.size(0)

        # Validate
        model.eval()
        val_loss = 0
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for features, labels in val_loader:
                logits = model(features)
                loss = criterion(logits, labels)
                val_loss += loss.item() * features.size(0)
                val_correct += (logits.argmax(1) == labels).sum().item()
                val_total += features.size(0)

        scheduler.step()

        avg_train_loss = train_loss / max(train_total, 1)
        avg_val_loss = val_loss / max(val_total, 1)
        train_acc = train_correct / max(train_total, 1)
        val_acc = val_correct / max(val_total, 1)

        logger.info(
            "Epoch %d/%d — train_loss=%.4f train_acc=%.3f val_loss=%.4f val_acc=%.3f",
            epoch + 1,
            epochs,
            avg_train_loss,
            train_acc,
            avg_val_loss,
            val_acc,
        )

        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            no_improve = 0
            torch.save(model.state_dict(), checkpoint_dir / "best_model.pt")
            logger.info("  Saved best model (val_loss=%.4f)", best_val_loss)
        else:
            no_improve += 1
            if no_improve >= patience:
                logger.info("  Early stopping at epoch %d (no improvement for %d epochs)", epoch + 1, patience)
                break

    # Save final
    torch.save(model.state_dict(), checkpoint_dir / "final_model.pt")
    logger.info("Training complete. Best val_loss=%.4f", best_val_loss)
    logger.info("Model saved to %s", checkpoint_dir)


def train_utility(data_dir: Path, output_dir: Path):
    """Train the utility LightGBM model using synthetic data (grenade extraction not available)."""
    try:
        import lightgbm as lgb
    except ImportError:
        logger.error("LightGBM not installed. pip install lightgbm")
        return

    # Generate synthetic utility training data
    logger.info("Generating synthetic utility training data (grenade extraction not yet available)")
    n = 5000
    features = np.random.randn(n, 25).astype(np.float32)
    # Simulate: effective (35%), suboptimal (25%), wasted (30%), harmful (10%)
    labels = np.random.choice([0, 1, 2, 3], size=n, p=[0.35, 0.25, 0.30, 0.10])

    # Train
    from sklearn.model_selection import train_test_split

    X_train, X_val, y_train, y_val = train_test_split(features, labels, test_size=0.2)

    train_data = lgb.Dataset(X_train, label=y_train)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

    params = {
        "objective": "multiclass",
        "num_class": 4,
        "metric": "multi_logloss",
        "learning_rate": 0.05,
        "num_leaves": 63,
        "max_depth": 6,
        "verbose": -1,
    }

    model = lgb.train(
        params,
        train_data,
        num_boost_round=200,
        valid_sets=[val_data],
        callbacks=[lgb.early_stopping(20), lgb.log_evaluation(50)],
    )

    checkpoint_dir = output_dir / "checkpoints" / "utility"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    model.save_model(str(checkpoint_dir / "model.lgb"))
    logger.info("Utility model saved to %s", checkpoint_dir / "model.lgb")


def main():
    parser = argparse.ArgumentParser(description="ML Training Pipeline")
    parser.add_argument("--demos-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--skip-generate", action="store_true")
    parser.add_argument("--skip-train", action="store_true")
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("ML TRAINING PIPELINE")
    logger.info("  Demos: %s", args.demos_dir)
    logger.info("  Output: %s", args.output_dir)
    logger.info("=" * 60)

    if not args.skip_generate:
        logger.info("\n[1/3] GENERATING DATASET")
        stats = generate_dataset(args.demos_dir, args.output_dir)
        if stats["total"] == 0:
            logger.error("No training data generated. Aborting.")
            sys.exit(1)

    if not args.skip_train:
        logger.info("\n[2/3] TRAINING POSITIONING MODEL")
        train_positioning(args.output_dir, args.output_dir, epochs=args.epochs)

        logger.info("\n[3/3] TRAINING UTILITY MODEL")
        train_utility(args.output_dir, args.output_dir)

    logger.info("\n" + "=" * 60)
    logger.info("PIPELINE COMPLETE")
    logger.info("  Checkpoints: %s/checkpoints/", args.output_dir)
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
