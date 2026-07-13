import type { NextConfig } from 'next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: frontendRoot,
  // The standalone ESLint CLI runs before `next build` (see package.json).
  // This avoids running the deprecated framework-integrated lint step twice.
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
  },
  // Serve frontend at /dashboard root path
  basePath: process.env.NODE_ENV === 'production' ? '' : '',
};

export default nextConfig;
