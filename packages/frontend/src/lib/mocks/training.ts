import type { TrainingPlan, WeaknessProfile } from '@/types/training'

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms))
}

export async function getTrainingPlan(steamId: string): Promise<TrainingPlan> {
  const today = new Date()
  const history = (start: number, slope: number, n = 12) =>
    Array.from({ length: n }, (_, i) => ({
      date: new Date(today.getTime() - (n - i) * 7 * 86_400_000).toISOString(),
      value: Math.max(0.05, start + slope * i + (Math.random() - 0.5) * 0.02),
    }))

  const plan: TrainingPlan = {
    player_steam_id: steamId,
    player_name: 'Player',
    generated_at: today.toISOString(),
    areas: [
      {
        id: 'area-peek',
        area: 'peek_discipline',
        display_name: 'Peek discipline',
        priority: 'high',
        current_value: 0.35,
        target_value: 0.2,
        pro_value: 0.12,
        direction: 'lower-is-better',
        rationale:
          'Mortes em peeks sem flash 3x acima da média de jogadores do mesmo rating. Maior contribuidor para erros críticos.',
        drills: [
          {
            id: 'drill-peek-1',
            title: 'DM com flash obrigatória',
            description:
              'Modo deathmatch com regra: cada engagement tem que começar com flashbang. 3 séries de 15min.',
            map: null,
            est_minutes: 45,
            difficulty: 'medium',
            category: 'aim',
          },
          {
            id: 'drill-peek-2',
            title: 'Prefire maps',
            description: 'Prefire workshop maps em Mirage (palace, ramp, jungle). 30 runs cada.',
            map: 'de_mirage',
            est_minutes: 30,
            difficulty: 'easy',
            category: 'positioning',
          },
        ],
      },
      {
        id: 'area-utility',
        area: 'utility_usage',
        display_name: 'Utility usage',
        priority: 'medium',
        current_value: 0.28,
        target_value: 0.15,
        pro_value: 0.08,
        direction: 'lower-is-better',
        rationale:
          '28% das mortes ocorrem com 2+ granadas não utilizadas. Perda económica significativa.',
        drills: [
          {
            id: 'drill-util-1',
            title: '3 lineups por mapa',
            description:
              'Aprender 3 lineups consistentes por mapa active duty (smoke + molly + flash). Workshop.',
            map: null,
            est_minutes: 60,
            difficulty: 'medium',
            category: 'utility',
          },
          {
            id: 'drill-util-2',
            title: 'Eco execute drill',
            description: 'Em retake server: usar 100% das granadas em cada ronda antes de morrer.',
            map: null,
            est_minutes: 30,
            difficulty: 'easy',
            category: 'utility',
          },
        ],
      },
      {
        id: 'area-clutch',
        area: 'clutch_decision',
        display_name: 'Clutch decision making',
        priority: 'medium',
        current_value: 0.18,
        target_value: 0.28,
        pro_value: 0.34,
        direction: 'higher-is-better',
        rationale:
          'Win rate em 1v1 e 1v2 abaixo da média da equipa. Tendência a decisões impulsivas.',
        drills: [
          {
            id: 'drill-clutch-1',
            title: '1v1 ranked',
            description: '20 jogos de 1v1 community servers, foco em economia de tempo e som.',
            map: null,
            est_minutes: 40,
            difficulty: 'medium',
            category: 'gamesense',
          },
        ],
      },
      {
        id: 'area-economy',
        area: 'economy_management',
        display_name: 'Economy management',
        priority: 'low',
        current_value: 0.92,
        target_value: 0.96,
        pro_value: 0.98,
        direction: 'higher-is-better',
        rationale: 'Pequenos desperdícios em rondas force-buy.',
        drills: [
          {
            id: 'drill-eco-1',
            title: 'Review econ',
            description: 'Rever 5 matches recentes e marcar todas as compras questionáveis.',
            map: null,
            est_minutes: 30,
            difficulty: 'easy',
            category: 'review',
          },
        ],
      },
    ],
    progress_history: {
      peek_discipline: history(0.45, -0.008),
      utility_usage: history(0.34, -0.005),
      clutch_decision: history(0.14, 0.003),
      economy_management: history(0.88, 0.003),
    },
  }
  return delay(plan, 200)
}

export async function getWeaknessProfile(_steamId: string): Promise<WeaknessProfile> {
  return delay(
    {
      primary: {
        label: 'Overaggressive Peeker',
        description:
          'Tendência a peek sem informação ou utilitário. Timing demasiado cedo em rondas com alvo definido.',
        confidence: 0.82,
      },
      secondary: {
        label: 'Utility Hoarder',
        description:
          'Frequentemente morre com 2+ granadas no inventário, indicando desperdício de recursos.',
        confidence: 0.45,
      },
    },
    150
  )
}
