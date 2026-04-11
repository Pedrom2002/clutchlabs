import { api } from '@/lib/api-client'
import type { AuthResponse, LoginRequest, RegisterRequest, TokenResponse } from '@/types/auth'

export const login = (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data)
export const register = (data: RegisterRequest) => api.post<AuthResponse>('/auth/register', data)
export const refresh = (refresh_token: string) =>
  api.post<TokenResponse>('/auth/refresh', { refresh_token })
export const logout = (refresh_token: string) =>
  api.post<void>('/auth/logout', { refresh_token })
export const invite = (email: string, role: string) =>
  api.post<{ token: string }>('/auth/invite', { email, role })
