import { api } from '@/lib/api-client'
import type { PaginatedResponse } from '@/types/demo'

export interface ProMatch {
  id: string
  team1_name: string
  team2_name: string
  team1_score: number
  team2_score: number
  map: string
  event: string | null
  match_date: string
  hltv_url: string | null
}

export interface ProMatchListParams {
  page?: number
  page_size?: number
  team?: string
  map?: string
  event?: string
}

export const list = (params: ProMatchListParams = {}) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
  })
  const qs = search.toString()
  return api.get<PaginatedResponse<ProMatch>>(`/pro/matches${qs ? `?${qs}` : ''}`)
}

export const get = (id: string) => api.get<ProMatch>(`/pro/matches/${id}`)
