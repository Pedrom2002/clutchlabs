'use client'

import * as React from 'react'
import { getMapConfig } from '@/lib/map-coordinates'
import { cn } from '@/lib/utils'

interface MapCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  map: string
  size?: number
  /** Children rendered inside the map (overlays, dots, etc.) — positioned absolute */
  children?: React.ReactNode
}

/**
 * Renders the radar overview of a CS2 map. Falls back to a styled grid when
 * the radar PNG is missing from /public/maps/.
 */
export const MapCanvas = React.forwardRef<HTMLDivElement, MapCanvasProps>(
  ({ map, size = 600, className, children, ...rest }, ref) => {
    const cfg = getMapConfig(map)
    const [imageOk, setImageOk] = React.useState(true)

    return (
      <div
        ref={ref}
        className={cn(
          'relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-secondary',
          className
        )}
        style={{ maxWidth: size }}
        {...rest}
      >
        {cfg && imageOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cfg.radarImage}
            alt={`${cfg.displayName} radar`}
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            onError={() => setImageOk(false)}
          />
        ) : (
          <FallbackGrid />
        )}
        <div className="absolute inset-0">{children}</div>
        <div className="absolute bottom-2 right-2 rounded-md bg-background/70 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
          {cfg?.displayName ?? map}
        </div>
      </div>
    )
  }
)
MapCanvas.displayName = 'MapCanvas'

function FallbackGrid() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-border"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.4"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
        fill="currentColor"
        opacity="0.5"
      >
        Add radar PNG to /public/maps/
      </text>
    </svg>
  )
}
