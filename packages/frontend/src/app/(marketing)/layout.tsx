import Link from 'next/link'
import { Crosshair } from 'lucide-react'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Crosshair className="h-6 w-6 text-primary" />
            <span>AI CS2 Analytics</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Join Beta
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-text-dim">
          &copy; {new Date().getFullYear()} AI CS2 Analytics. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
