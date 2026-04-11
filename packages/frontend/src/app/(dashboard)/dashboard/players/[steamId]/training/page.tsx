'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import * as trainingApi from '@/lib/api/training'
import { QUERY_KEYS } from '@/lib/constants'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TrainingPlanCard } from '@/components/analytics/training-plan-card'

export default function PlayerTrainingPage() {
  const { steamId } = useParams<{ steamId: string }>()
  const router = useRouter()
  const t = useTranslations('player')
  const tCommon = useTranslations('common')

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.playerTraining(steamId),
    queryFn: () => trainingApi.getPlan(steamId),
  })

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        {tCommon('back')}
      </Button>

      <PageHeader title={t('trainingPlan')} description={data?.player_name} />

      {isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.areas.map((area) => (
            <TrainingPlanCard key={area.id} area={area} />
          ))}
        </div>
      )}
    </div>
  )
}
