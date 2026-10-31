import type { Metadata, Viewport } from 'next';
import { Manrope, Montserrat } from 'next/font/google';
import { site } from '@/config/site';
import { asset } from '@/lib/asset';
import './globals.css';

// Background images used in globals.css, set here so they pick up the deploy base path.
const assetUrls = {
  '--flash-wall-url': `url('${asset('/art/flash-wall.svg')}')`,
  '--viewer-backdrop-url': `url('${asset('/art/viewer-backdrop.webp')}')`,
} as React.CSSProperties;

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-montserrat',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${site.name} · Tattoo Studio, ${site.location}`,
  description: `${site.fullName} in ${site.location}. Try tattoo designs on a 3D body and find the placement that feels like you.`,
};

export const viewport: Viewport = {
  themeColor: '#070707',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${manrope.variable}`} style={assetUrls}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
