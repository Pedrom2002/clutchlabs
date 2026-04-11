import type { ScoutReport, ScoutReportSummary } from '@/types/scout'

const OPPONENTS = [
  { id: 'navi', name: 'Natus Vincere', logo_url: null, region: 'EU' },
  { id: 'faze', name: 'FaZe Clan', logo_url: null, region: 'EU' },
  { id: 'g2', name: 'G2 Esports', logo_url: null, region: 'EU' },
  { id: 'vitality', name: 'Team Vitality', logo_url: null, region: 'EU' },
  { id: 'astralis', name: 'Astralis', logo_url: null, region: 'EU' },
  { id: 'ence', name: 'ENCE', logo_url: null, region: 'EU' },
  { id: 'liquid', name: 'Team Liquid', logo_url: null, region: 'NA' },
  { id: 'mibr', name: 'MIBR', logo_url: null, region: 'BR' },
]

const SAMPLE_REPORTS: ScoutReportSummary[] = [
  {
    id: 'rpt-001',
    opponent_name: 'Natus Vincere',
    status: 'ready',
    created_at: '2026-04-08T10:30:00Z',
    matches_analyzed: 12,
  },
  {
    id: 'rpt-002',
    opponent_name: 'FaZe Clan',
    status: 'ready',
    created_at: '2026-04-05T14:15:00Z',
    matches_analyzed: 8,
  },
  {
    id: 'rpt-003',
    opponent_name: 'G2 Esports',
    status: 'processing',
    created_at: '2026-04-09T09:00:00Z',
    matches_analyzed: 0,
  },
]

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms))
}

export async function listScoutReports(): Promise<ScoutReportSummary[]> {
  return delay(SAMPLE_REPORTS)
}

export async function listOpponents() {
  return delay(OPPONENTS)
}

export async function createScoutReport(input: {
  opponent_id: string
  maps: string[]
  matches_to_analyze: number
}): Promise<ScoutReportSummary> {
  const opp = OPPONENTS.find((o) => o.id === input.opponent_id) || OPPONENTS[0]
  const report: ScoutReportSummary = {
    id: `rpt-${Date.now()}`,
    opponent_name: opp.name,
    status: 'processing',
    created_at: new Date().toISOString(),
    matches_analyzed: 0,
  }
  SAMPLE_REPORTS.unshift(report)
  // Simulate processing
  setTimeout(() => {
    report.status = 'ready'
    report.matches_analyzed = input.matches_to_analyze
  }, 3000)
  return delay(report, 500)
}

export async function getScoutReport(id: string): Promise<ScoutReport> {
  const summary = SAMPLE_REPORTS.find((r) => r.id === id) || SAMPLE_REPORTS[0]
  const opp = OPPONENTS.find((o) => o.name === summary.opponent_name) || OPPONENTS[0]

  const report: ScoutReport = {
    id: summary.id,
    opponent: opp,
    status: 'ready',
    created_at: summary.created_at,
    matches_analyzed: summary.matches_analyzed || 12,
    summary: `${opp.name} mostra preferência por execução rápida em A-site no lado T (62% das rondas), com baixa rotação para B. CT sólido em Mirage e Inferno mas frágil em Anubis. Recomenda-se default lento para forçar erros de timing.`,
    maps: [
      { map: 'de_mirage', matches_played: 18, win_rate: 0.72, avg_rounds_won: 11.3 },
      { map: 'de_inferno', matches_played: 15, win_rate: 0.68, avg_rounds_won: 10.7 },
      { map: 'de_anubis', matches_played: 12, win_rate: 0.42, avg_rounds_won: 8.8 },
      { map: 'de_dust2', matches_played: 14, win_rate: 0.61, avg_rounds_won: 10.2 },
      { map: 'de_nuke', matches_played: 9, win_rate: 0.38, avg_rounds_won: 8.1 },
      { map: 'de_overpass', matches_played: 11, win_rate: 0.55, avg_rounds_won: 9.5 },
      { map: 'de_vertigo', matches_played: 7, win_rate: 0.5, avg_rounds_won: 9.0 },
    ],
    strong_maps: ['de_mirage', 'de_inferno'],
    weak_maps: ['de_anubis', 'de_nuke'],
    tactical_trends: [
      {
        id: 'tt-1',
        map: 'de_mirage',
        side: 'T',
        category: 'execute',
        description: 'Execute rápido A com 2x flash + smoke jungle',
        frequency: 0.62,
        success_rate: 0.71,
      },
      {
        id: 'tt-2',
        map: 'de_mirage',
        side: 'T',
        category: 'default',
        description: 'Mid control com sniper + rotação tardia',
        frequency: 0.34,
        success_rate: 0.48,
      },
      {
        id: 'tt-3',
        map: 'de_inferno',
        side: 'CT',
        category: 'utility',
        description: 'Spam de molly em apartments para atrasar push',
        frequency: 0.55,
        success_rate: 0.66,
      },
      {
        id: 'tt-4',
        map: 'de_anubis',
        side: 'CT',
        category: 'rotation',
        description: 'Rotação lenta entre A e B (falha de comunicação)',
        frequency: 0.28,
        success_rate: 0.31,
      },
    ],
    key_players: [
      {
        steam_id: 'STEAM_1:1:1234',
        name: 's1mple',
        role: 'AWPer',
        rating: 1.32,
        primary_strength: 'Hold passivo de longas distâncias',
        primary_weakness: 'Vulnerável a flashes coordenadas',
      },
      {
        steam_id: 'STEAM_1:1:5678',
        name: 'b1t',
        role: 'Entry',
        rating: 1.18,
        primary_strength: 'Aim mecânico em duels curtos',
        primary_weakness: 'Overaggression em rondas eco',
      },
      {
        steam_id: 'STEAM_1:1:9012',
        name: 'electronic',
        role: 'Lurker',
        rating: 1.12,
        primary_strength: 'Flank timings',
        primary_weakness: 'Utility usage abaixo da média',
      },
    ],
    counter_strategies: [
      {
        id: 'cs-1',
        title: 'Default lento + fake A',
        description:
          'Forçar erros de rotação no Anubis com 60s de default antes de execute. Aproveitar o ponto fraco do CT em rotações entre sites.',
        applies_to_maps: ['de_anubis'],
        difficulty: 'medium',
        expected_win_rate_delta: 0.09,
      },
      {
        id: 'cs-2',
        title: 'Flash duplo coordenada vs AWPer',
        description:
          'No Mirage, usar 2 flashes pop simultâneas de stairs e palace para neutralizar o hold passivo de window.',
        applies_to_maps: ['de_mirage'],
        difficulty: 'hard',
        expected_win_rate_delta: 0.12,
      },
      {
        id: 'cs-3',
        title: 'Anti-eco aggressive',
        description:
          'Forçar trades em rondas eco do opponent — entry b1t é overaggressive, fácil de punir com pré-aim.',
        applies_to_maps: ['de_mirage', 'de_inferno', 'de_dust2'],
        difficulty: 'easy',
        expected_win_rate_delta: 0.05,
      },
    ],
  }
  return delay(report, 400)
}
