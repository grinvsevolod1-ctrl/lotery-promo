/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig = {
  poweredByHeader: false,
  // Lets open tabs detect a new build and reload instead of calling server actions that no longer exist.
  deploymentId: process.env.DEPLOYMENT_VERSION || undefined,
  // The Docker image runs the self-contained server; PM2 keeps using `next start`.
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  compress: true,
  experimental: {
    // Job applications upload up to 3 × 4 MB attachments through a server action.
    serverActions: { bodySizeLimit: '16mb', allowedOrigins: ['bytoloto.com', 'jobs.bytoloto.com'] },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 414, 640, 768, 1080, 1280, 1920],
  },
  async headers() {
    const longCache = [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }]
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      { source: '/:file(.*\\.(?:webp|png|jpg|jpeg|svg|ico|avif|woff2))', headers: longCache },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ]
  },
}

export default nextConfig
