'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileText, Plus } from 'lucide-react'
import * as scoutApi from '@/lib/api/scout'
import { QUERY_KEYS } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/format'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  ready: 'success',
  processing: 'warning',
  queued: 'secondary',
  failed: 'destructive',
}

export default function ScoutListPage() {
  const t = useTranslations('scout')

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.scoutReports,
    queryFn: () => scoutApi.list(),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button asChild>
            <Link href="/dashboard/scout/new">
              <Plus className="h-4 w-4" />
              {t('newReport')}
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('noReports')}
          description={t('noReportsDesc')}
          actionLabel={t('newReport')}
          actionHref="/dashboard/scout/new"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((r) => (
            <Card key={r.id} className="transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{r.opponent_name}</CardTitle>
                  <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'}>
                    {t(r.status === 'ready' ? 'ready' : r.status === 'processing' ? 'processing' : 'status')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(r.created_at)} · {r.matches_analyzed} matches
                </p>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/dashboard/scout/${r.id}`}>
                    {t('viewReport')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
