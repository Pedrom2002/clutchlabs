'use client'

import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'

interface ReplayerControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  onPrev: () => void
  onNext: () => void
  speed: number
  onSpeedChange: (s: number) => void
  currentTick: number
  maxTick: number
  onSeek: (tick: number) => void
}

const SPEEDS = [0.5, 1, 2, 4]

export function ReplayerControls({
  isPlaying,
  onPlayPause,
  onPrev,
  onNext,
  speed,
  onSpeedChange,
  currentTick,
  maxTick,
  onSeek,
}: ReplayerControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="p-1.5 rounded bg-bg-elevated hover:bg-bg-elevated/80"
          aria-label="Previous"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onPlayPause}
          className="p-2 rounded bg-primary text-white hover:bg-primary/80"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          onClick={onNext}
          className="p-1.5 rounded bg-bg-elevated hover:bg-bg-elevated/80"
          aria-label="Next"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-1 ml-2">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                speed === s ? 'bg-primary text-white' : 'bg-bg-elevated text-text-dim'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
        <span className="text-xs text-text-muted ml-auto tabular-nums">
          {currentTick} / {maxTick}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={maxTick}
        value={currentTick}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-full"
        aria-label="Seek"
      />
    </div>
  )
}
