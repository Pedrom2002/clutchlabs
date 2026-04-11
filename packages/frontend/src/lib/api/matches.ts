import { api } from '@/lib/api-client'
import type {
  MatchDetail,
  MatchEconomy,
  MatchErrorsResponse,
  MatchSummary,
  PaginatedResponse,
} from '@/types/demo'

export interface MatchListParams {
  page?: number
  page_size?: number
  map?: string
  result?: 'won' | 'lost' | 'draw'
  date_from?: string
  date_to?: string
  opponent?: string
  sort?: 'date' | 'rating' | 'errors'
  order?: 'asc' | 'desc'
}

/**
 * The backend doesn't yet expose a dedicated `/matches` listing endpoint, so we
 * derive a paginated match list from the demos endpoint by filtering completed
 * demos and unwrapping their `match` payload. When the backend gains a real
 * `/matches` route this should be replaced with a direct call.
 */
export const list = async (params: MatchListParams = {}): Promise<PaginatedResponse<MatchSummary>> => {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  search.set('status', 'completed')
  const qs = search.toString()
  const demos = await api.get<PaginatedResponse<{ id: string; match?: MatchSummary | null }>>(
    `/demos${qs ? `?${qs}` : ''}`
  )
  return {
    items: demos.items.map((d) => d.match).filter((m): m is MatchSummary => Boolean(m)),
    total: demos.total,
    page: demos.page,
    page_size: demos.page_size,
    pages: demos.pages,
  }
}

export const get = (id: string) => api.get<MatchDetail>(`/demos/matches/${id}`)

export const errors = (id: string) =>
  api.get<MatchErrorsResponse>(`/matches/${id}/errors`)

export const economy = (id: string) => api.get<MatchEconomy>(`/matches/${id}/economy`)

export const heatmap = (id: string, options?: { type?: string; side?: string }) => {
  const qs = new URLSearchParams()
  if (options?.type) qs.set('type', options.type)
  if (options?.side) qs.set('side', options.side)
  const s = qs.toString()
  return api.get<{
    map: string
    points: Array<{ x: number; y: number; weight: number; player?: string }>
  }>(`/matches/${id}/heatmap${s ? `?${s}` : ''}`)
}

export const replay = (id: string, round?: number) => {
  const qs = round != null ? `?round=${round}` : ''
  return api.get<{
    match_id: string
    map: string
    rounds: Array<{
      round_number: number
      duration: number
      ticks: Array<{
        tick: number
        time: number
        players: Array<{
          steam_id: string
          name: string
          team: 'T' | 'CT'
          x: number
          y: number
          z: number
          health: number
          armor: number
          weapon: string | null
          alive: boolean
        }>
        events: Array<{
          type: string
          actor?: string
          target?: string
          weapon?: string
          headshot?: boolean
        }>
      }>
    }>
  }>(`/matches/${id}/replay${qs}`)
}
