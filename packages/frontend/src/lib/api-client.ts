import { useAuthStore } from '@/stores/auth-store'
import type { TokenResponse } from '@/types/auth'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true'

let refreshPromise: Promise<string | null> | null = null

export class ApiError extends Error {
  status: number
  code?: string
  detail?: unknown

  constructor(status: number, message: string, opts?: { code?: string; detail?: unknown }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    if (opts?.code !== undefined) this.code = opts.code
    if (opts?.detail !== undefined) this.detail = opts.detail
  }

  get isUnauthorized() {
    return this.status === 401
  }
  get isForbidden() {
    return this.status === 403
  }
  get isNotFound() {
    return this.status === 404
  }
  get isServerError() {
    return this.status >= 500
  }
}

interface FetchOptions extends RequestInit {
  retry?: number
  timeout?: number
}

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
      useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
      return data.access_token
    } catch {
      return null
    }
  }

  async fetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { retry = 2, timeout = 30000, ...init } = options
    const tokens = this.getTokens()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    }

    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      let res: Response
      let attempt = 0

      while (true) {
        try {
          res = await fetch(`${API_BASE}${path}`, {
            ...init,
            headers,
            signal: controller.signal,
          })
        } catch (err) {
          if (attempt < retry && !(err instanceof DOMException && err.name === 'AbortError')) {
            attempt++
            await new Promise((r) => setTimeout(r, 200 * 2 ** attempt))
            continue
          }
          throw err
        }

        // Auto-refresh on 401
        if (res.status === 401 && tokens?.refreshToken) {
          const newToken = await this.refreshAccessToken()
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`
            res = await fetch(`${API_BASE}${path}`, {
              ...init,
              headers,
              signal: controller.signal,
            })
          }
        }

        // Retry on 5xx
        if (res.status >= 500 && attempt < retry) {
          attempt++
          await new Promise((r) => setTimeout(r, 300 * 2 ** attempt))
          continue
        }

        break
      }

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ detail: res.statusText || 'Request failed' }))
        throw new ApiError(res.status, error.detail || error.message || 'Request failed', {
          code: error.code,
          detail: error,
        })
      }

      if (res.status === 204) return undefined as T
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) return undefined as T
      return res.json()
    } finally {
      clearTimeout(timeoutId)
    }
  }

  get<T>(path: string, options?: FetchOptions) {
    return this.fetch<T>(path, options)
  }

  post<T>(path: string, body?: unknown, options?: FetchOptions) {
    return this.fetch<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  put<T>(path: string, body?: unknown, options?: FetchOptions) {
    return this.fetch<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  patch<T>(path: string, body?: unknown, options?: FetchOptions) {
    return this.fetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  delete<T>(path: string, options?: FetchOptions) {
    return this.fetch<T>(path, { ...options, method: 'DELETE' })
  }

  async upload<T>(
    path: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<T> {
    const tokens = this.getTokens()

    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const fd = new FormData()
      fd.append('file', file)

      xhr.open('POST', `${API_BASE}${path}`)
      if (tokens?.accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${tokens.accessToken}`)
      }

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        })
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch {
            resolve(undefined as T)
          }
        } else {
          let detail: string = xhr.statusText
          try {
            const parsed = JSON.parse(xhr.responseText)
            detail = parsed.detail || detail
          } catch {}
          reject(new ApiError(xhr.status, detail))
        }
      })
      xhr.addEventListener('error', () => reject(new ApiError(0, 'Network error')))
      xhr.addEventListener('abort', () => reject(new ApiError(0, 'Upload aborted')))
      xhr.send(fd)
    })
  }
}

export const api = new ApiClient()
