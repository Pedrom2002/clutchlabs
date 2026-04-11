import { api } from '@/lib/api-client'

export interface BillingUsage {
  tier: string
  demos_used: number
  demos_limit: number
  billing_period_start: string
  billing_period_end: string
}

export const usage = () => api.get<BillingUsage>('/billing/usage')

export const checkout = (price_id: string) =>
  api.post<{ url: string }>('/billing/checkout', { price_id })

export const portal = () => api.post<{ url: string }>('/billing/portal', {})
