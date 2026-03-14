export type DemoStatus =
  | 'uploaded'
  | 'queued'
  | 'downloading'
  | 'parsing'
  | 'extracting_features'
  | 'running_models'
  | 'completed'
  | 'failed'
  | 'error'

export interface Demo {
  id: string
  original_filename: string
  file_size_bytes: number
  status: DemoStatus
  error_message: string | null
  created_at: string
  parsing_started_at: string | null
  processing_completed_at: string | null
}

export interface DemoDetail extends Demo {
  s3_key: string
  checksum_sha256: string
  parsing_completed_at: string | null
  processing_started_at: string | null
  match: MatchSummary | null
}

export interface MatchSummary {
  id: string
  map: string
  match_date: string | null
  team1_name: string | null
  team2_name: string | null
  team1_score: number
  team2_score: number
  total_rounds: number
  duration_seconds: number | null
}

export interface RoundData {
  id: string
  round_number: number
  winner_side: string | null
  win_reason: string | null
  team1_score: number
  team2_score: number
  t_economy: number | null
  ct_economy: number | null
  t_equipment_value: number | null
  ct_equipment_value: number | null
  t_buy_type: string | null
  ct_buy_type: string | null
  bomb_planted: boolean | null
  bomb_defused: boolean | null
  plant_site: string | null
  duration_seconds: number | null
}

export interface PlayerStats {
  id: string
  player_steam_id: string
  player_name: string
  team_side: string | null
  kills: number
  deaths: number
  assists: number
  headshot_kills: number
  damage: number
  adr: number | null
  flash_assists: number
  enemies_flashed: number
  utility_damage: number
  first_kills: number
  first_deaths: number
  clutch_wins: number
  multi_kills_3k: number
  multi_kills_4k: number
  multi_kills_5k: number
  overall_rating: number | null
  aim_rating: number | null
  positioning_rating: number | null
  utility_rating: number | null
  game_sense_rating: number | null
  clutch_rating: number | null
}

export interface MatchDetail extends MatchSummary {
  match_type: string | null
  tickrate: number
  overtime_rounds: number
  rounds: RoundData[]
  player_stats: PlayerStats[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}
