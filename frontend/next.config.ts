import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
  },
  // Serve frontend at /dashboard root path
  basePath: process.env.NODE_ENV === 'production' ? '' : '',
};

export default nextConfig;
