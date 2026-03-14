import { FileUp } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <EmptyState
        icon={FileUp}
        title="Upload Your First Demo"
        description="Get started by uploading a CS2 demo file (.dem). Our AI will analyze every round and deliver actionable insights."
        actionLabel="Upload Demo"
        actionHref="/dashboard/demos"
      />
    </div>
  )
}
