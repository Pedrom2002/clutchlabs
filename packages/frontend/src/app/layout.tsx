import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/lib/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'AI CS2 Analytics — AI-Powered Counter-Strike 2 Analysis',
  description:
    'Transform your CS2 gameplay with AI-powered demo analysis. Get tactical insights, player ratings, positioning heatmaps, and economy optimization.',
  keywords: ['CS2', 'Counter-Strike 2', 'analytics', 'esports', 'AI', 'demo analysis'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-bg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
