'use client'

import { Pause, Play, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SPEEDS = [0.5, 1, 2, 4]

interface Props {
  isPlaying: boolean
  onPlayPause: () => void
  onStepBack: () => void
  onStepForward: () => void
  onJumpBack: () => void
  onJumpForward: () => void
  speed: number
  onSpeedChange: (s: number) => void
  currentRound: number
  totalRounds: number
  onRoundChange: (r: number) => void
  scrubMin: number
  scrubMax: number
  scrubValue: number
  onScrub: (v: number) => void
  scrubLabel?: string
}

export function ReplayerControls({
  isPlaying,
  onPlayPause,
  onStepBack,
  onStepForward,
  onJumpBack,
  onJumpForward,
  speed,
  onSpeedChange,
  currentRound,
  totalRounds,
  onRoundChange,
  scrubMin,
  scrubMax,
  scrubValue,
  onScrub,
  scrubLabel,
}: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon" variant="ghost" onClick={onJumpBack} aria-label="Jump back">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onStepBack} aria-label="Step back">
          <StepBack className="h-4 w-4" />
        </Button>
        <Button size="icon" onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onStepForward} aria-label="Step forward">
          <StepForward className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onJumpForward} aria-label="Jump forward">
          <SkipForward className="h-4 w-4" />
        </Button>

        <Select value={String(speed)} onValueChange={(v) => onSpeedChange(Number(v))}>
          <SelectTrigger className="ml-2 h-8 w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPEEDS.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(currentRound)}
          onValueChange={(v) => onRoundChange(Number(v))}
        >
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: totalRounds }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                Round {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {scrubLabel && (
          <span className="ml-auto font-mono text-xs text-muted-foreground">{scrubLabel}</span>
        )}
      </div>

      <input
        type="range"
        min={scrubMin}
        max={scrubMax}
        value={scrubValue}
        onChange={(e) => onScrub(Number(e.target.value))}
        className="w-full accent-primary"
        aria-label="Tick scrubber"
      />
    </div>
  )
}
