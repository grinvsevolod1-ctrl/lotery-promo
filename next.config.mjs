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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
