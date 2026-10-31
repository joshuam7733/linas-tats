'use client';

import { useEffect, useState } from 'react';
import { site } from '@/config/site';
import { openBooking } from './booking/events';

const NAV = [
  { href: '#collection', label: 'Collection' },
  { href: '#try-on', label: 'Try on' },
  { href: '#studio', label: 'Studio' },
  { href: '#classes', label: 'Classes' },
  { href: '#book', label: 'Contact' },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 ${
        solid ? 'border-b border-line bg-ink-950/85 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-bone focus:px-4 focus:py-2 focus:text-ink-950"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-3 text-bone" aria-label={`${site.name}, back to top`}>
          <span className="logo-badge block h-12 w-12 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-badge.png" alt="" width={48} height={48} className="logo-badge-spin h-full w-full object-contain" />
          </span>
          <span className="wordmark hidden text-[0.95rem] lg:inline">{site.name}</span>
        </a>
        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="label !text-bone-dim transition-colors hover:!text-bone">
              {item.label}
            </a>
          ))}
          <button type="button" className="btn-red !min-h-10 !px-5 !text-[0.6875rem]" onClick={() => openBooking()} aria-haspopup="dialog">
            Book now
          </button>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <button type="button" className="btn-red !min-h-11 !px-4 !text-[0.625rem]" onClick={() => openBooking()} aria-haspopup="dialog">
            Book now
          </button>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-line text-bone md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {open ? <path d="M4 4l10 10M14 4L4 14" /> : <path d="M2.5 6.5h13M2.5 11.5h13" />}
          </svg>
        </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="fade-in border-t border-line px-5 pb-8 pt-2 md:hidden">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.href} className="border-b border-line">
                <a href={item.href} className="block py-4 font-display text-3xl text-bone" onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#try-on" className="btn-bone mt-6 w-full" onClick={() => setOpen(false)}>
            Try your tattoo
          </a>
        </nav>
      )}
    </header>
  );
}
