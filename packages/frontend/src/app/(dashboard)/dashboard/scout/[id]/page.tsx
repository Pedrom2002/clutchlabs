'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import * as scoutApi from '@/lib/api/scout'
import { QUERY_KEYS } from '@/lib/constants'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScoutReportView } from '@/components/analytics/scout-report-view'

export default function ScoutReportPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const tCommon = useTranslations('common')

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.scoutReport(id),
    queryFn: () => scoutApi.get(id),
  })

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        {tCommon('back')}
      </Button>

      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <PageHeader title={data.opponent.name} description={`vs ${data.opponent.region ?? '—'}`} />
          <ScoutReportView report={data} />
        </>
      )}
    </div>
  )
}
