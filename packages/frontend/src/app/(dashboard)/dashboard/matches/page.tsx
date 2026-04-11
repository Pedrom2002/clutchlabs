'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BarChart3 } from 'lucide-react'
import * as matchesApi from '@/lib/api/matches'
import { ACTIVE_DUTY_MAPS, mapName, QUERY_KEYS } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { useUrlNumber, useUrlState } from '@/hooks/use-url-state'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'

export default function MatchesListPage() {
  const t = useTranslations('match')
  const tCommon = useTranslations('common')
  const [page, setPage] = useUrlNumber('page', 1)
  const [map, setMap] = useUrlState('map', 'all')
  const [result, setResult] = useUrlState('result', 'all')

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.matches, page, map, result],
    queryFn: () =>
      matchesApi.list({
        page,
        page_size: 20,
        ...(map !== 'all' ? { map } : {}),
        ...(result !== 'all' ? { result: result as 'won' | 'lost' } : {}),
      }),
  })

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('subtitle')} />

      <div className="flex flex-wrap gap-2">
        <Select value={map} onValueChange={(v) => setMap(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filterByMap')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon('all')}</SelectItem>
            {ACTIVE_DUTY_MAPS.map((m) => (
              <SelectItem key={m} value={m}>
                {mapName(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={result} onValueChange={(v) => setResult(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filterByResult')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon('all')}</SelectItem>
            <SelectItem value="won">{t('won')}</SelectItem>
            <SelectItem value="lost">{t('lost')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={t('noMatches')}
          description="Carrega uma demo para começares a ver matches aqui."
          actionLabel={tCommon('view')}
          actionHref="/dashboard/demos"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('matchDate')}</TableHead>
                  <TableHead>Map</TableHead>
                  <TableHead>{t('ourTeam')}</TableHead>
                  <TableHead>{t('opponent')}</TableHead>
                  <TableHead className="text-center">{t('rounds')}</TableHead>
                  <TableHead className="text-center">{tCommon('status')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((m) => {
                  const won = m.team1_score > m.team2_score
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.match_date ? formatDate(m.match_date) : '—'}
                      </TableCell>
                      <TableCell className="font-medium">{mapName(m.map)}</TableCell>
                      <TableCell>{m.team1_name || '—'}</TableCell>
                      <TableCell>{m.team2_name || '—'}</TableCell>
                      <TableCell className="text-center font-mono">
                        {m.team1_score} - {m.team2_score}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={won ? 'success' : 'destructive'}>
                          {won ? t('won') : t('lost')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/matches/${m.id}`}>
                            {tCommon('view')}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {tCommon('page')} {page} {tCommon('of')} {data.pages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {tCommon('previous')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= data.pages}
              onClick={() => setPage(page + 1)}
            >
              {tCommon('next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
