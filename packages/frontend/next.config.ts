import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // output: 'standalone', // Enable for Docker builds (requires symlink support)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
