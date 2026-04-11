import { api } from '@/lib/api-client'
import type { Demo, DemoDetail, PaginatedResponse } from '@/types/demo'

export const list = (params?: { page?: number; page_size?: number; status?: string }) => {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.page_size) search.set('page_size', String(params.page_size))
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  return api.get<PaginatedResponse<Demo>>(`/demos${qs ? `?${qs}` : ''}`)
}

export const get = (id: string) => api.get<DemoDetail>(`/demos/${id}`)

export const upload = (file: File, onProgress?: (pct: number) => void) =>
  api.upload<Demo>('/demos', file, onProgress)

export const remove = (id: string) => api.delete<void>(`/demos/${id}`)
