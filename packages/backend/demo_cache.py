"""Persistent cache for parsed demos.

Caches the result of parse_demo() to disk so multiple training scripts
can reuse the parsed data without re-parsing every time.

Usage:
    from demo_cache import parse_demo_cached
    parsed = parse_demo_cached(dem_path, cache_dir=Path("D:/aics2-data/parse-cache"))
"""

from __future__ import annotations

import logging
import pickle
from pathlib import Path

logger = logging.getLogger(__name__)

DEFAULT_CACHE_DIR = Path("D:/aics2-data/parse-cache")


def parse_demo_cached(dem_path: Path, cache_dir: Path = DEFAULT_CACHE_DIR):
    """Parse demo with disk cache. Returns the same ParsedDemo object as parse_demo()."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path = cache_dir / f"{dem_path.stem}.pkl"

    # Check cache
    if cache_path.exists():
        try:
            with open(cache_path, "rb") as f:
                return pickle.load(f)
        except Exception as e:
            logger.warning("Cache read failed for %s: %s, re-parsing", dem_path.name, e)

    # Parse fresh
    from src.services.demo_parser import parse_demo

    parsed = parse_demo(dem_path)

    # Save to cache
    try:
        with open(cache_path, "wb") as f:
            pickle.dump(parsed, f, protocol=pickle.HIGHEST_PROTOCOL)
    except Exception as e:
        logger.warning("Cache write failed for %s: %s", dem_path.name, e)

    return parsed
