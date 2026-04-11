'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Skull } from 'lucide-react'
import * as matchesApi from '@/lib/api/matches'
import * as predictionApi from '@/lib/api/prediction'
import { QUERY_KEYS } from '@/lib/constants'
import { MapCanvas } from '@/components/maps/map-canvas'
import { PlayerDots, type PlayerSnapshot } from '@/components/maps/player-dots'
import { ReplayerControls } from '@/components/maps/replayer-controls'
import { useReplayer } from '@/hooks/use-replayer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const TICKS_PER_ROUND = 64 // Synthetic — each tick = ~1 second of round time

interface ReplayerEngineProps {
  matchId: string
}

/**
 * 2D round-aware replayer.
 *
 * Note: until the backend exposes real per-tick player positions, this engine
 * mocks player movement deterministically based on round number + steam id.
 * The architecture (use-replayer hook + map-canvas + player-dots) is ready to
 * accept real tick data from /matches/{id}/replay?round=N once available.
 */
export function ReplayerEngine({ matchId }: ReplayerEngineProps) {
  const t = useTranslations('match')

  const { data: match, isLoading } = useQuery({
    queryKey: QUERY_KEYS.match(matchId),
    queryFn: () => matchesApi.get(matchId),
  })

  const { data: prediction } = useQuery({
    queryKey: QUERY_KEYS.matchPrediction(matchId),
    queryFn: () => predictionApi.getMatchPrediction(matchId),
  })

  const totalRounds = match?.total_rounds ?? 24

  const replayer = useReplayer({
    totalRounds,
    ticksPerRound: TICKS_PER_ROUND,
  })

  const snapshots = useMemo<PlayerSnapshot[]>(() => {
    if (!match) return []
    // Synthesize 10 player positions on the map. Distinct positions per round
    // and tick using a stable hash so the playback feels consistent.
    return match.player_stats.slice(0, 10).map((p, i) => {
      const seed = (p.player_steam_id?.charCodeAt(0) ?? i) + replayer.currentRound * 7
      const phase = (replayer.currentTick / TICKS_PER_ROUND) * Math.PI * 2
      const radius = 0.18 + ((seed * 17) % 30) / 100
      const baseX = 0.5 + Math.cos(seed * 0.7) * radius
      const baseY = 0.5 + Math.sin(seed * 0.7) * radius
      const x = baseX + Math.cos(phase + i) * 0.04
      const y = baseY + Math.sin(phase + i) * 0.04
      return {
        steam_id: p.player_steam_id,
        name: p.player_name,
        team: p.team_side === 'CT' ? 'CT' : 'T',
        x: Math.max(0.05, Math.min(0.95, x)),
        y: Math.max(0.05, Math.min(0.95, y)),
        health: 100,
        alive: true,
      }
    })
  }, [match, replayer.currentRound, replayer.currentTick])

  const currentRoundData = match?.rounds.find((r) => r.round_number === replayer.currentRound)
  const currentPrediction = prediction?.per_round[replayer.currentRound - 1]

  if (isLoading || !match) return <Skeleton className="aspect-square w-full max-w-2xl" />

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="flex justify-center">
          <MapCanvas map={match.map} size={640}>
            <PlayerDots players={snapshots} />
          </MapCanvas>
        </div>
        <ReplayerControls
          isPlaying={replayer.isPlaying}
          onPlayPause={replayer.toggle}
          onStepBack={replayer.stepBack}
          onStepForward={replayer.stepForward}
          onJumpBack={replayer.jumpBack}
          onJumpForward={replayer.jumpForward}
          speed={replayer.speed}
          onSpeedChange={replayer.setSpeed}
          currentRound={replayer.currentRound}
          totalRounds={totalRounds}
          onRoundChange={replayer.setRound}
          scrubMin={0}
          scrubMax={TICKS_PER_ROUND - 1}
          scrubValue={replayer.currentTick}
          onScrub={replayer.setTick}
          scrubLabel={`${String(Math.floor(replayer.currentTick * (115 / TICKS_PER_ROUND))).padStart(2, '0')}s`}
        />
      </div>

      <div className="space-y-3">
        {/* Round info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Round {replayer.currentRound} / {totalRounds}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {currentRoundData && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-mono">
                    {currentRoundData.team1_score} - {currentRoundData.team2_score}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Winner</span>
                  {currentRoundData.winner_side ? (
                    <Badge
                      variant={currentRoundData.winner_side === 'T' ? 'warning' : 'minor'}
                    >
                      {currentRoundData.winner_side}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="text-xs">{currentRoundData.win_reason ?? '—'}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Live prediction */}
        {currentPrediction && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Win probability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-amber-400">
                <span>T</span>
                <span className="font-mono">
                  {Math.round(currentPrediction.win_prob_t * 100)}%
                </span>
              </div>
              <Progress value={currentPrediction.win_prob_t * 100} />
              <div className="mt-3 flex items-center justify-between text-sky-400">
                <span>CT</span>
                <span className="font-mono">
                  {Math.round(currentPrediction.win_prob_ct * 100)}%
                </span>
              </div>
              <Progress value={currentPrediction.win_prob_ct * 100} />
            </CardContent>
          </Card>
        )}

        {/* Players */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Players</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {match.player_stats.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-xs"
              >
                <span
                  className={
                    p.team_side === 'CT'
                      ? 'text-sky-400'
                      : 'text-amber-400'
                  }
                >
                  {p.player_name}
                </span>
                <span className="font-mono text-muted-foreground">
                  {p.kills}/{p.deaths}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Kill feed (synthetic) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Skull className="h-4 w-4" />
              {t('killFeed')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <p className="italic">
              Live tick events available once backend exposes per-tick replay data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
