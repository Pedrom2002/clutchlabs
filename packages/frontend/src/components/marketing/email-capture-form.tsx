'use client'

import { useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export function EmailCaptureForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch(`${API_BASE}/beta/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing' }),
      })
      const data = await res.json()
      setStatus('success')
      setMessage(data.message)
      setEmail('')
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return <p className="text-success text-sm font-medium">{message}</p>
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-md w-full">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 bg-bg-card border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          {status === 'loading' ? 'Joining...' : 'Join Beta'}
        </button>
      </form>
      {status === 'error' && <p className="text-danger text-sm">{message}</p>}
    </div>
  )
}
