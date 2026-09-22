import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The domain package ships TypeScript source so web and future Expo clients
  // compile the same rules rather than a drifting published build.
  transpilePackages: ['@gymgo/domain'],
  eslint: {
    dirs: ['src'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // No precise location, review evidence or identifiers are sent to
          // third parties, so no third-party origins are permitted by default.
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default config;
