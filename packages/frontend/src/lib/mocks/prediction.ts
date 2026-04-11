import type { MatchPrediction } from '@/types/prediction'

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms))
}

export async function getMatchPrediction(matchId: string): Promise<MatchPrediction> {
  // Generate a synthetic per-round prediction curve
  const totalRounds = 24
  const per_round = Array.from({ length: totalRounds }, (_, i) => {
    const round_number = i + 1
    // Sinusoidal noise to simulate momentum swings
    const base = 0.5 + Math.sin(i * 0.6) * 0.25 + (Math.random() - 0.5) * 0.1
    const win_prob_t = Math.max(0.05, Math.min(0.95, base))
    return {
      round_number,
      tick: 0,
      win_prob_t,
      win_prob_ct: 1 - win_prob_t,
      factors: [
        {
          name: 'equip_diff',
          display_name: 'Equipment differential',
          value: Math.round((Math.random() - 0.5) * 5000),
          contribution: (Math.random() - 0.5) * 0.4,
        },
        {
          name: 'players_alive_diff',
          display_name: 'Players alive Δ',
          value: Math.round((Math.random() - 0.5) * 4),
          contribution: (Math.random() - 0.5) * 0.5,
        },
        {
          name: 'bomb_planted',
          display_name: 'Bomb planted',
          value: Math.random() > 0.5 ? 1 : 0,
          contribution: (Math.random() - 0.5) * 0.3,
        },
        {
          name: 'site_control',
          display_name: 'Site control',
          value: Math.random(),
          contribution: (Math.random() - 0.5) * 0.25,
        },
      ],
    }
  })
  return delay({ match_id: matchId, per_round }, 150)
}
