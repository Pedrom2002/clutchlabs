"""CS2 feature extraction — round/player/team level extractors.

Lightweight, pure-Python extractors operating on mapping-like objects
(dicts, dataclasses, SQLAlchemy rows). They intentionally do not depend
on the backend models to keep the package usable from notebooks, ML
training pipelines, and tests.

Usage::

    from feature_engine import (
        extract_round_features,
        extract_player_features,
        extract_team_features,
    )
"""

from feature_engine.extractors import (
    PlayerFeatureVector,
    RoundFeatureVector,
    TeamFeatureVector,
    extract_player_features,
    extract_round_features,
    extract_team_features,
)

__all__ = [
    "PlayerFeatureVector",
    "RoundFeatureVector",
    "TeamFeatureVector",
    "extract_player_features",
    "extract_round_features",
    "extract_team_features",
]

__version__ = "0.1.0"
