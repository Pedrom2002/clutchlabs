"""Tests for feature_engine extractors."""

from feature_engine import (
    PlayerFeatureVector,
    RoundFeatureVector,
    TeamFeatureVector,
    extract_player_features,
    extract_round_features,
    extract_team_features,
)


def test_extract_round_features_eco():
    feats = extract_round_features(
        {
            "round_number": 1,
            "winner_side": "CT",
            "duration_seconds": 30.0,
            "t_equipment_value": 1000,
            "ct_equipment_value": 1500,
            "team1_score": 0,
            "team2_score": 1,
        }
    )
    assert isinstance(feats, RoundFeatureVector)
    assert feats.round_number == 1
    assert feats.t_buy_type == "eco"
    assert feats.ct_buy_type == "eco"
    assert feats.is_eco_round is True
    assert feats.is_pistol_round is True
    assert feats.score_delta == -1


def test_extract_round_features_full_buy():
    feats = extract_round_features(
        {
            "round_number": 5,
            "t_equipment_value": 22000,
            "ct_equipment_value": 22000,
            "duration_seconds": 45.0,
            "bomb_planted": True,
            "plant_site": "A",
        }
    )
    assert feats.t_buy_type == "full"
    assert feats.ct_buy_type == "full"
    assert feats.is_full_buy is True
    assert feats.bomb_planted is True
    assert feats.plant_site == "A"


def test_extract_player_features_basic():
    feats = extract_player_features(
        {
            "player_steam_id": "76561198000000001",
            "player_name": "s1mple",
            "kills": 25,
            "deaths": 12,
            "assists": 5,
            "headshot_kills": 13,
            "damage": 2100,
            "flash_assists": 3,
            "utility_damage": 100,
            "first_kills": 6,
            "first_deaths": 2,
            "trade_kills": 3,
            "trade_deaths": 1,
            "clutch_wins": 2,
            "multi_kills_3k": 3,
            "multi_kills_4k": 1,
            "multi_kills_5k": 0,
            "kast_rounds": 20,
            "rounds_survived": 15,
        },
        total_rounds=24,
    )
    assert isinstance(feats, PlayerFeatureVector)
    assert feats.kills == 25
    assert feats.deaths == 12
    assert feats.kd_ratio > 2.0
    assert feats.opening_win_rate == 75.0  # 6/8
    assert 0 <= feats.impact_score <= 100
    assert feats.adr > 0


def test_extract_player_features_zero_rounds_safe():
    feats = extract_player_features(
        {
            "player_steam_id": "1",
            "player_name": "test",
            "kills": 0,
            "deaths": 0,
        }
    )
    assert feats.kpr == 0.0
    assert feats.kd_ratio == 0.0
    assert feats.impact_score >= 0.0


def test_extract_team_features_aggregates_players():
    team = {
        "name": "NaVi",
        "total_rounds": 24,
        "player_stats": [
            {
                "player_steam_id": f"7656119800000000{i}",
                "player_name": f"p{i}",
                "kills": 20 + i,
                "deaths": 15,
                "headshot_kills": 10,
                "damage": 1500,
                "first_kills": 3,
                "first_deaths": 2,
            }
            for i in range(5)
        ],
    }
    feats = extract_team_features(team)
    assert isinstance(feats, TeamFeatureVector)
    assert feats.team_name == "NaVi"
    assert feats.players == 5
    assert feats.total_kills == sum(20 + i for i in range(5))
    assert feats.best_player_steam_id is not None
    assert feats.best_player_impact >= 0


def test_extract_team_features_empty():
    feats = extract_team_features({"name": "Empty", "player_stats": []})
    assert feats.players == 0
    assert feats.best_player_steam_id is None
    assert feats.avg_kd == 0.0
