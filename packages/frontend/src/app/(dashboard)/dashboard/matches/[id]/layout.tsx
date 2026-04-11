'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock } from 'lucide-react'
import * as matchesApi from '@/lib/api/matches'
import { QUERY_KEYS, mapName } from '@/lib/constants'
import { formatDuration } from '@/lib/format'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

const TABS = ['overview', 'errors', 'winprob', 'tactics', 'economy', 'replay'] as const

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('match')

  const { data: match, isLoading } = useQuery({
    queryKey: QUERY_KEYS.match(id),
    queryFn: () => matchesApi.get(id),
    retry: false,
  })

  const baseHref = `/dashboard/matches/${id}`
  const activeTab =
    TABS.find((tab) =>
      tab === 'overview' ? pathname === baseHref : pathname.startsWith(`${baseHref}/${tab}`)
    ) ?? 'overview'

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !match ? (
            <p className="text-sm text-muted-foreground">Match not found</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{match.team1_name || 'Team 1'}</p>
                  <p className="font-mono text-3xl font-bold">{match.team1_score}</p>
                </div>
                <span className="font-mono text-lg text-muted-foreground">vs</span>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{match.team2_name || 'Team 2'}</p>
                  <p className="font-mono text-3xl font-bold">{match.team2_score}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                <Badge variant="secondary">{mapName(match.map)}</Badge>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(match.duration_seconds ?? 0)}
                </span>
                <span>{match.total_rounds} rounds · {match.tickrate} tick</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto md:w-fit">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              onClick={() =>
                router.push(`${baseHref}${tab === 'overview' ? '' : `/${tab}`}`)
              }
            >
              {tab === 'winprob' ? 'Win Prob' : t(`tab${tab[0].toUpperCase()}${tab.slice(1)}` as
                | 'tabOverview'
                | 'tabErrors'
                | 'tabTactics'
                | 'tabEconomy'
                | 'tabReplay')}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div>{children}</div>
    </div>
  )
}
