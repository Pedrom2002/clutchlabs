import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // output: 'standalone', // Enable for Docker builds (requires symlink support)
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.steamstatic.com' },
      { protocol: 'https', hostname: 'www.hltv.org' },
      { protocol: 'https', hostname: 'img-cdn.hltv.org' },
    ],
  },
}

export default withNextIntl(nextConfig)
