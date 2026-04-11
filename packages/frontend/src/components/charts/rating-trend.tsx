'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface Point {
  date: string
  rating: number
}

interface RatingTrendChartProps {
  data: Point[]
  height?: number
}

export function RatingTrendChart({ data, height = 240 }: RatingTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(24 100% 50%)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(24 100% 50%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 18%)" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) =>
            new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          }
          tick={{ fontSize: 11, fill: 'hsl(240 8% 60%)' }}
          stroke="hsl(240 12% 18%)"
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 11, fill: 'hsl(240 8% 60%)' }}
          stroke="hsl(240 12% 18%)"
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(240 14% 8%)',
            border: '1px solid hsl(240 12% 18%)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(d) => new Date(d).toLocaleDateString()}
          formatter={(v) => [Number(v).toFixed(2), 'Rating']}
        />
        <Area
          type="monotone"
          dataKey="rating"
          stroke="hsl(24 100% 50%)"
          strokeWidth={2}
          fill="url(#ratingGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
