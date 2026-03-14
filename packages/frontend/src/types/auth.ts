export interface User {
  id: string
  email: string
  display_name: string
  role: string
  steam_id: string | null
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
}

export interface Organization {
  id: string
  name: string
  slug: string
  tier: string
  max_demos_per_month: number
  logo_url: string | null
}

export interface AuthResponse {
  user: User
  organization: Organization
  access_token: string
  refresh_token: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface RegisterRequest {
  org_name: string
  email: string
  password: string
  display_name: string
}

export interface LoginRequest {
  email: string
  password: string
}
