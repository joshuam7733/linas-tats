import type { NextConfig } from 'next';

// Set NEXT_PUBLIC_BASE_PATH (e.g. /linas-tats) to build a static export for GitHub Pages.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig: NextConfig = basePath
  ? {
      reactStrictMode: true,
      output: 'export',
      basePath,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      reactStrictMode: true,
      async headers() {
        return [
          {
            source: '/models/:path*',
            headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
          },
        ];
      },
    };

export default nextConfig;
