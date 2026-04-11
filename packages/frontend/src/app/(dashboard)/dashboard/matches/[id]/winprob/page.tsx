'use client'

import { useParams } from 'next/navigation'
import { WinProbChart } from '@/components/matches/win-prob-chart'

export default function MatchWinProbPage() {
  const { id } = useParams<{ id: string }>()
  return <WinProbChart matchId={id} />
}
