'use client'

import { useEffect, useRef } from 'react'

export interface PlayerDot {
  steam_id: string
  name: string
  side: 'T' | 'CT'
  x: number // 0..1 normalized on map
  y: number // 0..1 normalized on map
  alive: boolean
}

interface MapCanvasProps {
  width?: number
  height?: number
  mapName?: string
  players: PlayerDot[]
  highlightSteamId?: string | null
}

/**
 * Thin canvas-based map renderer. Does not load an actual radar image —
 * draws a grid background so it stays useful even when the real radar
 * asset isn't bundled. Player positions are expected as normalized 0..1
 * coordinates so the caller stays pixel-agnostic.
 */
export function MapCanvas({
  width = 520,
  height = 520,
  mapName,
  players,
  highlightSteamId,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#0c0c14'
    ctx.fillRect(0, 0, width, height)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    const step = 32
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Map label
    if (mapName) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(mapName.toUpperCase(), 12, 22)
    }

    // Dots
    for (const p of players) {
      const cx = p.x * width
      const cy = p.y * height
      const color = p.side === 'T' ? '#f59e0b' : '#3b82f6'
      ctx.globalAlpha = p.alive ? 1 : 0.35

      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      if (highlightSteamId === p.steam_id) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, 12, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px sans-serif'
      ctx.fillText(p.name, cx + 10, cy + 3)
    }
  }, [width, height, players, mapName, highlightSteamId])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg border border-border bg-bg-card"
      style={{ width, height }}
    />
  )
}
