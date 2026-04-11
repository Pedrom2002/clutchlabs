'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { Bomb, Crosshair, Skull, Users } from 'lucide-react'
import * as matchesApi from '@/lib/api/matches'
import { QUERY_KEYS } from '@/lib/constants'
import type { PlayerStats } from '@/types/demo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function PlayerRow({ player }: { player: PlayerStats }) {
  const kd = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2)
  const hsPercent = player.kills > 0 ? Math.round((player.headshot_kills / player.kills) * 100) : 0
  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link href={`/dashboard/players/${player.player_steam_id}`} className="hover:text-primary">
          {player.player_name}
        </Link>
      </TableCell>
      <TableCell className="text-center font-mono">{player.kills}</TableCell>
      <TableCell className="text-center font-mono">{player.assists}</TableCell>
      <TableCell className="text-center font-mono">{player.deaths}</TableCell>
      <TableCell className="text-center font-mono">{kd}</TableCell>
      <TableCell className="text-center font-mono">{player.adr?.toFixed(0) ?? '—'}</TableCell>
      <TableCell className="text-center font-mono">{hsPercent}%</TableCell>
      <TableCell className="text-center font-mono">{player.first_kills}</TableCell>
      <TableCell className="text-center font-mono font-bold text-primary">
        {player.overall_rating?.toFixed(2) ?? '—'}
      </TableCell>
    </TableRow>
  )
}

export default function MatchOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('match')

  const { data: match, isLoading } = useQuery({
    queryKey: QUERY_KEYS.match(id),
    queryFn: () => matchesApi.get(id),
  })

  if (isLoading || !match) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const team1Players = match.player_stats.filter((p) => p.team_side === 'T' || !p.team_side)
  const team2Players = match.player_stats.filter((p) => p.team_side === 'CT')
  const hasTeamSides = match.player_stats.some((p) => p.team_side)
  const teams = hasTeamSides
    ? [
        { name: match.team1_name || 'Team 1', players: team1Players },
        { name: match.team2_name || 'Team 2', players: team2Players },
      ]
    : [{ name: 'All players', players: match.player_stats }]

  return (
    <div className="space-y-6">
      {/* Player tables */}
      {teams.map((team) => (
        <Card key={team.name}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              {team.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('playerStats')}</TableHead>
                  <TableHead className="text-center">K</TableHead>
                  <TableHead className="text-center">A</TableHead>
                  <TableHead className="text-center">D</TableHead>
                  <TableHead className="text-center">K/D</TableHead>
                  <TableHead className="text-center">{t('adr')}</TableHead>
                  <TableHead className="text-center">HS</TableHead>
                  <TableHead className="text-center">FK</TableHead>
                  <TableHead className="text-center">{t('rating')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.players.map((p) => (
                  <PlayerRow key={p.id} player={p} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Round timeline */}
      {match.rounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crosshair className="h-4 w-4 text-primary" />
              {t('rounds')} timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {match.rounds.map((r) => {
                const isT = r.winner_side === 'T'
                const isCT = r.winner_side === 'CT'
                const bombRelated =
                  r.win_reason === 'bomb_exploded' || r.win_reason === 'defuse'
                return (
                  <div
                    key={r.id}
                    title={`R${r.round_number} · ${r.winner_side ?? '?'} · ${r.win_reason ?? ''}`}
                    className={
                      'flex h-8 w-8 items-center justify-center rounded border text-xs font-medium ' +
                      (isT
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                        : isCT
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                          : 'border-border text-muted-foreground')
                    }
                  >
                    {bombRelated ? (
                      <Bomb className="h-3 w-3" />
                    ) : r.win_reason === 'elimination' ? (
                      <Skull className="h-3 w-3" />
                    ) : (
                      r.round_number
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <Badge variant="warning">T</Badge>
              <Badge variant="minor">CT</Badge>
              <span className="inline-flex items-center gap-1">
                <Bomb className="h-3 w-3" /> bomb
              </span>
              <span className="inline-flex items-center gap-1">
                <Skull className="h-3 w-3" /> elimination
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
