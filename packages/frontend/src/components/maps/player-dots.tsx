'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PlayerSnapshot {
  steam_id: string
  name: string
  team: 'T' | 'CT'
  /** Normalized 0..1 coordinates relative to the map canvas */
  x: number
  y: number
  health: number
  alive: boolean
}

interface PlayerDotsProps {
  players: PlayerSnapshot[]
  highlightSteamId?: string | null
}

export function PlayerDots({ players, highlightSteamId }: PlayerDotsProps) {
  return (
    <>
      {players.map((p) => {
        const left = `${(p.x * 100).toFixed(2)}%`
        const top = `${(p.y * 100).toFixed(2)}%`
        const isHighlight = p.steam_id === highlightSteamId
        return (
          <div
            key={p.steam_id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
            style={{ left, top }}
            aria-label={p.name}
          >
            {p.alive ? (
              <div className="relative">
                <div
                  className={cn(
                    'h-3 w-3 rounded-full ring-2 ring-offset-1 ring-offset-background',
                    p.team === 'T'
                      ? 'bg-amber-500 ring-amber-300'
                      : 'bg-sky-500 ring-sky-300',
                    isHighlight && 'h-4 w-4 ring-4'
                  )}
                />
                {isHighlight && (
                  <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">
                    {p.name}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-destructive">
                <DeadIcon />
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function DeadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
