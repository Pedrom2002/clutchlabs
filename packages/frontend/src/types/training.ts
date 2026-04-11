export type TrainingPriority = 'high' | 'medium' | 'low'

export interface TrainingDrill {
  id: string
  title: string
  description: string
  map: string | null
  est_minutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
}

export interface TrainingArea {
  id: string
  area: string // e.g. "peek_discipline", "utility_usage"
  display_name: string
  priority: TrainingPriority
  current_value: number
  target_value: number
  pro_value: number
  // Lower is better for some metrics; we encode direction so the UI can compute progress correctly
  direction: 'lower-is-better' | 'higher-is-better'
  drills: TrainingDrill[]
  rationale: string
}

export interface TrainingProgressPoint {
  date: string
  value: number
}

export interface TrainingPlan {
  player_steam_id: string
  player_name: string
  generated_at: string
  areas: TrainingArea[]
  progress_history: Record<string, TrainingProgressPoint[]>
}

export interface WeaknessProfile {
  primary: {
    label: string
    description: string
    confidence: number
  }
  secondary: {
    label: string
    description: string
    confidence: number
  } | null
}
