'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Loader2, Target } from 'lucide-react'
import { scoutApi, type ScoutReport } from '@/lib/api-client'
import { TrainingPlanCard } from '@/components/analytics/training-plan-card'
import { WeaknessProfile } from '@/components/analytics/weakness-profile'

export default function PlayerTrainingPage() {
  const { steamId } = useParams<{ steamId: string }>()
  const router = useRouter()
  const t = useTranslations('training')
  const tc = useTranslations('common')

  const { data, isLoading } = useQuery({
    queryKey: ['scout', 'player', steamId],
    queryFn: async (): Promise<ScoutReport | null> => {
      try {
        const list = await scoutApi.list({ player_steam_id: steamId })
        if (list.length === 0) return null
        // Return the most recent one (first if sorted desc, else sort)
        return list.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      } catch {
        return null
      }
    },
    enabled: !!steamId,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 text-text-muted animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-text-muted hover:text-text text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc('back')}
      </button>

      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {t('title')}
        </h1>
        <p className="text-text-muted text-sm mt-1">{t('subtitle')}</p>
      </div>

      {!data ? (
        <div className="text-center py-16 text-text-muted text-sm">{t('noPlan')}</div>
      ) : (
        <>
          <WeaknessProfile weaknesses={data.weaknesses} strengths={data.strengths} />
          <TrainingPlanCard items={data.training_plan} />
        </>
      )}
    </div>
  )
}
