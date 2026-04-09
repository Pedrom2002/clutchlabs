import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-text-dim mb-4">404</h1>
        <p className="text-lg text-text-muted mb-6">Page not found</p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/80"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
