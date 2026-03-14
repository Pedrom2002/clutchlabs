-- ClickHouse tables for CS2 tick data and events

CREATE DATABASE IF NOT EXISTS cs2analytics;

CREATE TABLE IF NOT EXISTS cs2analytics.tick_data (
    match_id UUID,
    round_num UInt8,
    tick UInt32,
    steamid String,
    team String,
    side String,
    x Float32,
    y Float32,
    z Float32,
    yaw Float32,
    pitch Float32,
    velocity_x Float32,
    velocity_y Float32,
    velocity_z Float32,
    health UInt8,
    armor UInt8,
    is_alive UInt8,
    is_scoped UInt8,
    is_walking UInt8,
    is_ducking UInt8,
    active_weapon String,
    has_helmet UInt8,
    has_defuser UInt8,
    money UInt16,
    equipment_value UInt16,
    flash_duration Float32,
    ping UInt16
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(toDate(now()))
ORDER BY (match_id, round_num, tick, steamid)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS cs2analytics.events (
    match_id UUID,
    round_num UInt8,
    tick UInt32,
    event_type String,
    attacker_steamid String,
    victim_steamid String,
    assister_steamid String,
    weapon String,
    damage UInt16,
    hit_group UInt8,
    is_headshot UInt8,
    is_wallbang UInt8,
    penetrated_objects UInt8,
    x Float32,
    y Float32,
    z Float32,
    attacker_x Float32,
    attacker_y Float32,
    attacker_z Float32,
    event_data String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(toDate(now()))
ORDER BY (match_id, round_num, tick, event_type)
SETTINGS index_granularity = 8192;

-- Materialized view for player round stats
CREATE TABLE IF NOT EXISTS cs2analytics.player_round_stats (
    match_id UUID,
    round_num UInt8,
    steamid String,
    kills UInt8,
    deaths UInt8,
    assists UInt8,
    damage UInt16,
    headshot_kills UInt8,
    flash_assists UInt8,
    utility_damage UInt16,
    first_kill UInt8,
    first_death UInt8,
    clutch_attempt UInt8,
    clutch_won UInt8,
    traded UInt8
) ENGINE = MergeTree()
ORDER BY (match_id, round_num, steamid)
SETTINGS index_granularity = 8192;
