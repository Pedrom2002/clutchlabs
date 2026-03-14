import Link from 'next/link'
import { Crosshair } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Crosshair className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">AI CS2 Analytics</span>
        </Link>
        <div className="bg-bg-card border border-border rounded-xl p-8">{children}</div>
      </div>
    </div>
  )
}
