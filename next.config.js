
/** @type {import('next').NextConfig} */
// This configuration correctly uses the src/app directory by default.
const nextConfig = {
  /* App Hosting runs Next in standalone mode. Tracing that reads one file under
     public/ (the open-graph icon) otherwise leaves a partial public directory,
     and the adapter then skips the rest. Include every public file in the trace. */
  output: 'standalone',
  outputFileTracingIncludes: {
    '/**': ['./public/**/*'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    const fresh = 'private, no-cache, no-store, max-age=0, must-revalidate';
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/',
        headers: [{ key: 'Cache-Control', value: fresh }],
      },
      {
        source: '/login',
        headers: [{ key: 'Cache-Control', value: fresh }],
      },
      {
        source: '/signup',
        headers: [{ key: 'Cache-Control', value: fresh }],
      },
      {
        source: '/dashboard/:path*',
        headers: [{ key: 'Cache-Control', value: fresh }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
