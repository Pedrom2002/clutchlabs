'use client'

import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { scoutApi } from '@/lib/api-client'
import { ScoutReportView } from '@/components/analytics/scout-report-view'
import { WeaknessProfile } from '@/components/analytics/weakness-profile'
import { TrainingPlanCard } from '@/components/analytics/training-plan-card'

export default function ScoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const t = useTranslations('scout')
  const tc = useTranslations('common')

  const { data, isLoading, error } = useQuery({
    queryKey: ['scout', id],
    queryFn: () => scoutApi.get(id),
    enabled: !!id,
    retry: false,
  })

  const deleteMutation = useMutation({
    mutationFn: () => scoutApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scout'] })
      router.push('/dashboard/scout')
    },
  })

  const handleDelete = () => {
    if (window.confirm(t('deleteConfirm'))) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 text-text-muted animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted text-sm mb-4">{tc('notFound')}</p>
        <button
          onClick={() => router.back()}
          className="text-primary text-sm hover:underline"
        >
          {tc('back')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-text-muted hover:text-text text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('back')}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {tc('delete')}
        </button>
      </div>

      <ScoutReportView report={data} />
      <WeaknessProfile weaknesses={data.weaknesses} strengths={data.strengths} />
      <TrainingPlanCard title={t('trainingPlan')} items={data.training_plan} />
    </div>
  )
}
