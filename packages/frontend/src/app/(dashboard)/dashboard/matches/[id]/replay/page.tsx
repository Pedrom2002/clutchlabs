'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Info, Loader2, Play as PlayIcon } from 'lucide-react'
import { api } from '@/lib/api-client'
import type { MatchDetail } from '@/types/demo'
import { MapCanvas, type PlayerDot } from '@/components/charts/map-canvas'
import { ReplayerControls } from '@/components/charts/replayer-controls'

interface PositionFrame {
  tick: number
  players: PlayerDot[]
}

interface ReplayPayload {
  match_id: string
  map: string
  frames: PositionFrame[]
}

/**
 * Generate a deterministic mock trajectory so the replayer is visually
 * useful even when the backend hasn't emitted positional data. Players
 * orbit the map around offset seeds, alternating sides.
 */
function buildMockReplay(match: MatchDetail): ReplayPayload {
  const players = match.player_stats.slice(0, 10)
  const frameCount = 120
  const frames: PositionFrame[] = []

  for (let f = 0; f < frameCount; f++) {
    const t = f / frameCount
    frames.push({
      tick: f,
      players: players.map((p, idx) => {
        const seed = (idx + 1) * 0.13
        const phase = t * Math.PI * 2 + seed * 6
        const radius = 0.18 + (idx % 3) * 0.06
        return {
          steam_id: p.player_steam_id,
          name: p.player_name,
          side: (p.team_side === 'CT' ? 'CT' : 'T') as 'CT' | 'T',
          x: 0.5 + Math.cos(phase) * radius + (idx % 5) * 0.02 - 0.04,
          y: 0.5 + Math.sin(phase) * radius + (idx % 5) * 0.02 - 0.04,
          alive: true,
        }
      }),
    })
  }

  return { match_id: match.id, map: match.map, frames }
}

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('replay')

  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const matchQuery = useQuery({
    queryKey: ['match', id, 'detail'],
    queryFn: () => api.get<MatchDetail>(`/demos/matches/${id}`),
    enabled: !!id,
  })

  const replayQuery = useQuery({
    queryKey: ['match', id, 'replay-payload'],
    queryFn: async () => {
      try {
        return await api.get<ReplayPayload>(`/matches/${id}/replay-frames`)
      } catch {
        return null
      }
    },
    enabled: !!id,
    retry: false,
  })

  const payload: ReplayPayload | null = useMemo(() => {
    if (replayQuery.data) return replayQuery.data
    if (matchQuery.data) return buildMockReplay(matchQuery.data)
    return null
  }, [replayQuery.data, matchQuery.data])

  const isMock = !replayQuery.data && !!matchQuery.data

  // Playback loop
  useEffect(() => {
    if (!playing || !payload) return
    const interval = 1000 / (10 * speed)
    const timer = setInterval(() => {
      setTick((prev) => {
        const next = prev + 1
        if (next >= payload.frames.length) {
          setPlaying(false)
          return payload.frames.length - 1
        }
        return next
      })
    }, interval)
    return () => clearInterval(timer)
  }, [playing, payload, speed])

  if (matchQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 text-text-muted animate-spin" />
      </div>
    )
  }

  if (matchQuery.error || !payload) {
    return (
      <div className="text-center py-16 text-text-muted text-sm">{t('noData')}</div>
    )
  }

  const currentFrame = payload.frames[Math.min(tick, payload.frames.length - 1)]
  const maxTick = payload.frames.length - 1

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <PlayIcon className="h-5 w-5 text-primary" />
          {t('title')}
        </h1>
        <p className="text-text-muted text-sm mt-1">{t('subtitle')}</p>
      </div>

      {isMock && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{t('mockNotice')}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-3">
          <MapCanvas
            mapName={payload.map}
            players={currentFrame.players}
            width={520}
            height={520}
          />
        </div>
        <div className="space-y-3">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <ReplayerControls
              isPlaying={playing}
              onPlayPause={() => setPlaying((p) => !p)}
              onPrev={() => setTick((t) => Math.max(0, t - 1))}
              onNext={() => setTick((t) => Math.min(maxTick, t + 1))}
              speed={speed}
              onSpeedChange={setSpeed}
              currentTick={tick}
              maxTick={maxTick}
              onSeek={setTick}
            />
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-text-muted mb-2">{t('round')}</div>
            <div className="space-y-1">
              {currentFrame.players.map((p) => (
                <div
                  key={p.steam_id}
                  className="flex justify-between items-center text-xs py-1 border-b border-border last:border-0"
                >
                  <span
                    className={p.side === 'T' ? 'text-amber-400' : 'text-blue-400'}
                  >
                    {p.name}
                  </span>
                  <span className="text-text-dim tabular-nums">
                    {p.x.toFixed(2)}, {p.y.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
