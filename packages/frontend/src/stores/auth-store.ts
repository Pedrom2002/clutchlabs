'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponse, LoginRequest, Organization, RegisterRequest, User } from '@/types/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

interface AuthState {
  user: User | null
  organization: Organization | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean

  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  setTokens: (accessToken: string, refreshToken: string) => void
  clear: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      login: async (data) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Login failed' }))
          throw new Error(err.detail)
        }
        const auth: AuthResponse = await res.json()
        set({
          user: auth.user,
          organization: auth.organization,
          accessToken: auth.access_token,
          refreshToken: auth.refresh_token,
          isAuthenticated: true,
        })
      },

      register: async (data) => {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Registration failed' }))
          throw new Error(err.detail)
        }
        const auth: AuthResponse = await res.json()
        set({
          user: auth.user,
          organization: auth.organization,
          accessToken: auth.access_token,
          refreshToken: auth.refresh_token,
          isAuthenticated: true,
        })
      },

      logout: async () => {
        const { refreshToken } = get()
        if (refreshToken) {
          await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }).catch(() => {})
        }
        set({
          user: null,
          organization: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      clear: () =>
        set({
          user: null,
          organization: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.getState().setHasHydrated(true)
      },
    }
  )
)
