import { useAuthStore } from '@/stores/auth-store'
import type { TokenResponse } from '@/types/auth'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true'

let refreshPromise: Promise<string | null> | null = null

class ApiClient {
  private getTokens() {
    if (typeof window === 'undefined') return null
    const state = useAuthStore.getState()
    return {
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    // Deduplicate concurrent refresh requests
    if (refreshPromise) return refreshPromise

    refreshPromise = this._doRefresh()
    try {
      return await refreshPromise
    } finally {
      refreshPromise = null
    }
  }

  private async _doRefresh(): Promise<string | null> {
    const tokens = this.getTokens()
    if (!tokens?.refreshToken) return null

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refreshToken }),
      })

      if (!res.ok) {
        useAuthStore.getState().clear()
        return null
      }

      const data: TokenResponse = await res.json()
      // Update Zustand store directly (syncs localStorage too)
      useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
      return data.access_token
    } catch {
      return null
    }
  }

  async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const tokens = this.getTokens()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`
    }

    let res = await fetch(`${API_BASE}${path}`, { ...options, headers })

    // Auto-refresh on 401
    if (res.status === 401 && tokens?.refreshToken) {
      const newToken = await this.refreshAccessToken()
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`
        res = await fetch(`${API_BASE}${path}`, { ...options, headers })
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }))
      throw new ApiError(res.status, error.detail || 'Request failed')
    }

    if (res.status === 204) return undefined as T
    return res.json()
  }

  get<T>(path: string) {
    return this.fetch<T>(path)
  }

  post<T>(path: string, body?: unknown) {
    return this.fetch<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  put<T>(path: string, body?: unknown) {
    return this.fetch<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  delete<T>(path: string) {
    return this.fetch<T>(path, { method: 'DELETE' })
  }

  async upload<T>(path: string, file: File, _onProgress?: (pct: number) => void): Promise<T> {
    const tokens = this.getTokens()

    const buildFormData = () => {
      const fd = new FormData()
      fd.append('file', file)
      return fd
    }

    const headers: Record<string, string> = {}
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`
    }

    let res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: buildFormData(),
    })

    if (res.status === 401 && tokens?.refreshToken) {
      const newToken = await this.refreshAccessToken()
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`
        res = await fetch(`${API_BASE}${path}`, {
          method: 'POST',
          headers,
          body: buildFormData(),
        })
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new ApiError(res.status, error.detail || 'Upload failed')
    }

    return res.json()
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = new ApiClient()

// ---------------------------------------------------------------------------
// Domain types for new endpoints
// ---------------------------------------------------------------------------

export type TacticsStrategyType = 'default' | 'rush' | 'eco' | 'force' | 'execute'

export interface TacticsRound {
  round_number: number
  side: 'CT' | 'T'
  strategy_type: TacticsStrategyType
  confidence: number
  key_players: string[]
  description: string
}

export interface TacticsResponse {
  match_id: string
  rounds: TacticsRound[]
  team_tendencies: {
    ct_preferred_sites: string[]
    t_preferred_executes: string[]
  }
}

export interface ScoutReport {
  id: string
  player_steam_id: string
  rating: number
  weaknesses: string[]
  strengths: string[]
  training_plan: string[]
  created_at: string
}

export interface ScoutListParams {
  player_steam_id?: string
  limit?: number
  offset?: number
}

export interface CreateScoutInput {
  player_steam_id: string
  rating: number
  weaknesses: string[]
  strengths: string[]
  training_plan: string[]
}

export interface PlayerCompareRow {
  player_steam_id: string
  player_name: string
  rating: number
  kd: number
  hs_pct: number
  adr: number
  util_damage: number
}

export interface PlayerCompareResponse {
  players: PlayerCompareRow[]
}

// ---------------------------------------------------------------------------
// Endpoint helpers — thin wrappers around the typed client
// ---------------------------------------------------------------------------

export const matchesApi = {
  getTactics: (matchId: string) =>
    api.get<TacticsResponse>(`/matches/${matchId}/tactics`),
}

export const scoutApi = {
  list: (params: ScoutListParams = {}) => {
    const search = new URLSearchParams()
    if (params.player_steam_id) search.set('player_steam_id', params.player_steam_id)
    if (params.limit != null) search.set('limit', String(params.limit))
    if (params.offset != null) search.set('offset', String(params.offset))
    const qs = search.toString()
    return api.get<ScoutReport[]>(`/scout${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => api.get<ScoutReport>(`/scout/${id}`),
  create: (data: CreateScoutInput) => api.post<ScoutReport>(`/scout`, data),
  delete: (id: string) => api.delete<void>(`/scout/${id}`),
}

export const playersApi = {
  compare: (steamIds: string[]) => {
    const qs = steamIds.map((id) => `steam_ids=${encodeURIComponent(id)}`).join('&')
    return api.get<PlayerCompareResponse>(`/players/compare?${qs}`)
  },
}
