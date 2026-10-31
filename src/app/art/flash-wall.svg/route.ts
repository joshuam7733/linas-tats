import { flashWallSvg } from '@/lib/flashWall';

export const dynamic = 'force-static';

/** The repeating tattoo-flash background tile, generated once at build time. */
export function GET() {
  return new Response(flashWallSvg(), {
    headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' },
  });
}
