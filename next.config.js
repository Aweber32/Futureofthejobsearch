/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  trailingSlash: false,  // Changed to false to avoid trailing slash on API routes
  images: {
    unoptimized: true
  },
  async rewrites() {
    // In production on Azure, the backend is at the same origin
    // In development, proxy to localhost:5000
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Note: modern browsers use CSP frame-ancestors for framing control.
          // Keeping this minimal in dev; adjust as needed for specific parents.
          // Example to allow only self (same-origin) frames:
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig