'use client'

/**
 * Generic SVG radar chart for comparing multiple entities across shared metrics.
 * No external dependencies — pure SVG so it works server-rendered and in any
 * Tailwind theme. Values are expected already normalized to 0..100.
 */
export interface RadarSeries {
  label: string
  color: string
  values: number[] // same length as metrics
}

export interface RadarChartProps {
  metrics: string[]
  series: RadarSeries[]
  size?: number
}

export function RadarChart({ metrics, series, size = 320 }: RadarChartProps) {
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.35
  const levels = 5
  const angleStep = (2 * Math.PI) / metrics.length
  const startAngle = -Math.PI / 2

  const point = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  })

  const rings = Array.from({ length: levels }, (_, i) => {
    const r = (radius / levels) * (i + 1)
    return metrics
      .map((_, j) => {
        const p = point(startAngle + j * angleStep, r)
        return `${p.x},${p.y}`
      })
      .join(' ')
  })

  const axes = metrics.map((label, i) => {
    const angle = startAngle + i * angleStep
    const end = point(angle, radius + 12)
    const labelPos = point(angle, radius + 26)
    return { end, labelPos, label }
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
      role="img"
      aria-label="Radar chart"
    >
      {rings.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}
      {axes.map((a, i) => (
        <g key={i}>
          <line
            x1={cx}
            y1={cy}
            x2={a.end.x}
            y2={a.end.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <text
            x={a.labelPos.x}
            y={a.labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-text-muted"
            fontSize="10"
          >
            {a.label}
          </text>
        </g>
      ))}
      {series.map((s, idx) => {
        const pts = s.values.map((v, i) => {
          const r = (Math.max(0, Math.min(100, v)) / 100) * radius
          return point(startAngle + i * angleStep, r)
        })
        const path = pts.map((p) => `${p.x},${p.y}`).join(' ')
        return (
          <g key={idx}>
            <polygon points={path} fill={`${s.color}33`} stroke={s.color} strokeWidth="2" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={s.color} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}
