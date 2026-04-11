export const ACTIVE_DUTY_MAPS = [
  'de_mirage',
  'de_inferno',
  'de_anubis',
  'de_dust2',
  'de_nuke',
  'de_overpass',
  'de_vertigo',
] as const

export type Map = (typeof ACTIVE_DUTY_MAPS)[number]

export const MAP_DISPLAY_NAMES: Record<string, string> = {
  de_mirage: 'Mirage',
  de_inferno: 'Inferno',
  de_anubis: 'Anubis',
  de_dust2: 'Dust 2',
  de_nuke: 'Nuke',
  de_overpass: 'Overpass',
  de_vertigo: 'Vertigo',
  de_train: 'Train',
  de_ancient: 'Ancient',
}

export function mapName(map: string): string {
  return MAP_DISPLAY_NAMES[map] ?? map
}

export const BUY_TYPE_LABELS: Record<string, string> = {
  full_buy: 'Full buy',
  force_buy: 'Force buy',
  semi_buy: 'Semi buy',
  eco: 'Eco',
  pistol: 'Pistol',
}

export const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
}

export const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-severity-critical',
  major: 'text-severity-major',
  minor: 'text-severity-minor',
}

export const TEAM_COLORS = {
  T: '#F39200',
  CT: '#00B0F0',
} as const

export const QUERY_KEYS = {
  demos: ['demos'] as const,
  demo: (id: string) => ['demos', id] as const,
  matches: ['matches'] as const,
  match: (id: string) => ['matches', id] as const,
  matchErrors: (id: string) => ['matches', id, 'errors'] as const,
  matchEconomy: (id: string) => ['matches', id, 'economy'] as const,
  matchHeatmap: (id: string) => ['matches', id, 'heatmap'] as const,
  matchReplay: (id: string, round?: number) =>
    ['matches', id, 'replay', round] as const,
  matchPrediction: (id: string) => ['matches', id, 'prediction'] as const,
  players: ['players'] as const,
  player: (steamId: string) => ['players', steamId] as const,
  playerStats: (steamId: string) => ['players', steamId, 'stats'] as const,
  playerErrors: (steamId: string) => ['players', steamId, 'errors'] as const,
  playerHistory: (steamId: string) => ['players', steamId, 'history'] as const,
  playerWeakness: (steamId: string) => ['players', steamId, 'weakness'] as const,
  playerTraining: (steamId: string) => ['players', steamId, 'training'] as const,
  pro: ['pro'] as const,
  proMatches: ['pro', 'matches'] as const,
  scout: ['scout'] as const,
  scoutReports: ['scout', 'reports'] as const,
  scoutReport: (id: string) => ['scout', 'reports', id] as const,
  billingUsage: ['billing', 'usage'] as const,
} as const
