export type ScoutReportStatus = 'queued' | 'processing' | 'ready' | 'failed'

export interface ScoutOpponent {
  id: string
  name: string
  logo_url: string | null
  region: string | null
}

export interface MapWinRate {
  map: string
  matches_played: number
  win_rate: number
  avg_rounds_won: number
}

export interface TacticalTrend {
  id: string
  map: string
  side: 'T' | 'CT'
  category: 'execute' | 'default' | 'rotation' | 'utility' | 'eco' | 'force'
  description: string
  frequency: number // 0..1
  success_rate: number // 0..1
}

export interface KeyPlayer {
  steam_id: string
  name: string
  role: string
  rating: number
  primary_strength: string
  primary_weakness: string
}

export interface CounterStrategy {
  id: string
  title: string
  description: string
  applies_to_maps: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  expected_win_rate_delta: number // e.g. 0.07 for +7%
}

export interface ScoutReport {
  id: string
  opponent: ScoutOpponent
  status: ScoutReportStatus
  created_at: string
  matches_analyzed: number
  maps: MapWinRate[]
  strong_maps: string[]
  weak_maps: string[]
  tactical_trends: TacticalTrend[]
  key_players: KeyPlayer[]
  counter_strategies: CounterStrategy[]
  summary: string
}

export interface ScoutReportSummary {
  id: string
  opponent_name: string
  status: ScoutReportStatus
  created_at: string
  matches_analyzed: number
}
