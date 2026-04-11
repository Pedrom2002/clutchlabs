'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

export interface RadarPoint {
  label: string
  value: number // 0..100
}

interface RadarChartProps {
  data: RadarPoint[]
  size?: number
  levels?: number
  className?: string
  /** Optional second series rendered on top, for compare views */
  compare?: RadarPoint[]
}

export function RadarChart({
  data,
  size = 280,
  levels = 5,
  className,
  compare,
}: RadarChartProps) {
  const id = useId()
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 40

  const angleStep = (2 * Math.PI) / data.length
  const startAngle = -Math.PI / 2

  const point = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  })

  const ring = (lvl: number) => {
    const r = (radius / levels) * (lvl + 1)
    return data
      .map((_, j) => {
        const p = point(startAngle + j * angleStep, r)
        return `${p.x},${p.y}`
      })
      .join(' ')
  }

  const polygonOf = (series: RadarPoint[]) => {
    const pts = series.map((d, i) => {
      const r = Math.max(0, Math.min(1, d.value / 100)) * radius
      return point(startAngle + i * angleStep, r)
    })
    return {
      pts,
      str: pts.map((p) => `${p.x},${p.y}`).join(' '),
    }
  }

  const main = polygonOf(data)
  const cmp = compare ? polygonOf(compare) : null

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${size} ${size}`}
      className={cn('text-muted-foreground', className)}
      role="img"
      aria-label="Performance radar chart"
    >
      <defs>
        <radialGradient id={`${id}-grad`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(24 100% 50%)" stopOpacity={0.5} />
          <stop offset="100%" stopColor="hsl(24 100% 50%)" stopOpacity={0.1} />
        </radialGradient>
      </defs>

      {Array.from({ length: levels }).map((_, lvl) => (
        <polygon
          key={lvl}
          points={ring(lvl)}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeWidth={1}
        />
      ))}

      {data.map((d, i) => {
        const angle = startAngle + i * angleStep
        const end = point(angle, radius)
        const labelPos = point(angle, radius + 20)
        return (
          <g key={d.label}>
            <line
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeOpacity={0.18}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fill="currentColor"
              className="font-medium"
            >
              {d.label}
            </text>
          </g>
        )
      })}

      <polygon
        points={main.str}
        fill={`url(#${id}-grad)`}
        stroke="hsl(24 100% 50%)"
        strokeWidth={2}
      />
      {main.pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="hsl(24 100% 50%)" />
      ))}

      {cmp && (
        <>
          <polygon
            points={cmp.str}
            fill="hsl(192 100% 50% / 0.15)"
            stroke="hsl(192 100% 50%)"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
          {cmp.pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="hsl(192 100% 50%)" />
          ))}
        </>
      )}
    </svg>
  )
}
