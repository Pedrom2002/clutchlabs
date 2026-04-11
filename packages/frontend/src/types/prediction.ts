export interface RoundPrediction {
  round_number: number
  tick: number
  win_prob_t: number
  win_prob_ct: number
  factors: PredictionFactor[]
}

export interface PredictionFactor {
  name: string
  display_name: string
  value: number
  contribution: number // -1 to 1
}

export interface MatchPrediction {
  match_id: string
  per_round: RoundPrediction[]
}
