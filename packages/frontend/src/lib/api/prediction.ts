import { api, USE_MOCKS } from '@/lib/api-client'
import type { MatchPrediction } from '@/types/prediction'
import * as mocks from '@/lib/mocks/prediction'

export const getMatchPrediction = async (matchId: string): Promise<MatchPrediction> => {
  if (USE_MOCKS) return mocks.getMatchPrediction(matchId)
  return api.get<MatchPrediction>(`/matches/${matchId}/prediction`)
}
