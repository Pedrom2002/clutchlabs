import { api, USE_MOCKS } from '@/lib/api-client'
import type { TrainingPlan, WeaknessProfile } from '@/types/training'
import * as mocks from '@/lib/mocks/training'

export const getPlan = async (steamId: string): Promise<TrainingPlan> => {
  if (USE_MOCKS) return mocks.getTrainingPlan(steamId)
  return api.get<TrainingPlan>(`/players/${steamId}/training-plan`)
}

export const getWeakness = async (steamId: string): Promise<WeaknessProfile> => {
  if (USE_MOCKS) return mocks.getWeaknessProfile(steamId)
  return api.get<WeaknessProfile>(`/players/${steamId}/weakness-profile`)
}
