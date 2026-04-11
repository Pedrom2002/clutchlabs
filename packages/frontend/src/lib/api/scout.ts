import { api, USE_MOCKS } from '@/lib/api-client'
import type { ScoutReport, ScoutReportSummary } from '@/types/scout'
import * as mocks from '@/lib/mocks/scout'

export interface CreateReportInput {
  opponent_id: string
  maps: string[]
  matches_to_analyze: number
}

export const list = async (): Promise<ScoutReportSummary[]> => {
  if (USE_MOCKS) return mocks.listScoutReports()
  return api.get<ScoutReportSummary[]>('/scout/reports')
}

export const get = async (id: string): Promise<ScoutReport> => {
  if (USE_MOCKS) return mocks.getScoutReport(id)
  return api.get<ScoutReport>(`/scout/reports/${id}`)
}

export const create = async (input: CreateReportInput): Promise<ScoutReportSummary> => {
  if (USE_MOCKS) return mocks.createScoutReport(input)
  return api.post<ScoutReportSummary>('/scout/reports', input)
}

export const opponents = async () => {
  if (USE_MOCKS) return mocks.listOpponents()
  return api.get<{ id: string; name: string; logo_url: string | null }[]>('/scout/opponents')
}
