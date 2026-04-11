import { api } from '@/lib/api-client'
import type {
  PaginatedResponse,
  PlayerAggregatedStats,
  PlayerErrorSummary,
} from '@/types/demo'

export interface PlayerListItem {
  player_steam_id: string
  player_name: string
  total_matches: number
  avg_hltv_rating: number
  avg_kd_ratio: number
}

export const list = (params?: { page?: number; page_size?: number; q?: string }) => {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.page_size) search.set('page_size', String(params.page_size))
  if (params?.q) search.set('q', params.q)
  const qs = search.toString()
  return api.get<PaginatedResponse<PlayerListItem>>(`/players${qs ? `?${qs}` : ''}`)
}

export const stats = (steamId: string) =>
  api.get<PlayerAggregatedStats>(`/players/${steamId}/stats`)

export const errorsSummary = (steamId: string) =>
  api.get<PlayerErrorSummary>(`/players/${steamId}/errors`)

export interface PlayerRatingPoint {
  date: string
  rating: number
  match_id: string
  map: string
}
export const ratingHistory = (steamId: string) =>
  api.get<PlayerRatingPoint[]>(`/players/${steamId}/rating-history`)
