'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

const ReplayerEngine = dynamic(
  () => import('@/components/maps/replayer-engine').then((m) => m.ReplayerEngine),
  {
    ssr: false,
    loading: () => <Skeleton className="aspect-square w-full" />,
  }
)

export default function MatchReplayPage() {
  const { id } = useParams<{ id: string }>()
  return <ReplayerEngine matchId={id} />
}
