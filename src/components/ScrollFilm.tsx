'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { FilmManifest } from '@/lib/film';
import { useReducedMotion } from '@/lib/useReducedMotion';

const SCROLL_SCREENS = 4.5; // how many screen-heights of scrolling the film spans
const BASE = '/film';
const frameUrl = (variant: string, i: number) => `${BASE}/${variant}/${String(i).padStart(4, '0')}.webp`;

export interface FilmCaption {
  label: string;
  title: string;
  /** Optional call to action under the caption (e.g. booking on the last scene). */
  action?: ReactNode;
}

/**
 * The studio film as a scroll-driven "one shot": the section pins to the screen and scrolling moves the camera
 * from the street into the studio. Frames are still images (so scrubbing is smooth in every browser), loaded
 * coarse-to-fine so scrolling works almost immediately; neighbouring frames are blended for fluid motion.
 * Reduced-motion visitors get the opening still instead.
 */
export default function ScrollFilm({
  manifest,
  captions,
  children,
}: {
  manifest: FilmManifest;
  /** One caption per scene, shown as the camera moves through it. */
  captions: FilmCaption[];
  /** The hero content shown over the opening frame. */
  children: ReactNode;
}) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bar = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const el = section.current;
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!el || !cv || !ctx) return;
    const g: CanvasRenderingContext2D = ctx;

    const { count, scenes } = manifest;
    const frames: (HTMLImageElement | null)[] = new Array(count).fill(null);
    let variant = '';
    let current = 0;
    let target = 0;
    let raf = 0;
    let cancelled = false;

    const pickVariant = () => (cv.clientWidth / Math.max(1, cv.clientHeight) < 0.9 ? 'mobile' : 'desktop');

    // Load every 8th frame first, then fill in, so the whole film is scrubbable early. Save-Data: a third.
    const load = (v: string) => {
      frames.fill(null);
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
      const order: number[] = [];
      const seen = new Set<number>();
      for (const stride of saveData ? [9, 3] : [8, 4, 2, 1]) {
        for (let i = 0; i < count; i += stride) if (!seen.has(i)) (seen.add(i), order.push(i));
      }
      if (!seen.has(count - 1)) order.push(count - 1);
      let next = 0;
      const pump = () => {
        if (cancelled || v !== variant || next >= order.length) return;
        const i = order[next++];
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          if (v !== variant) return;
          frames[i] = img;
          if (Math.abs(i - current) < 9) draw();
          pump();
        };
        img.onerror = pump;
        img.src = frameUrl(v, i);
      };
      for (let k = 0; k < 6; k++) pump();
    };

    const nearest = (i: number) => {
      for (let d = 0; d < count; d++) {
        if (frames[i - d]) return frames[i - d];
        if (frames[i + d]) return frames[i + d];
      }
      return null;
    };

    const paint = (img: HTMLImageElement, alpha: number) => {
      const scale = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      g.globalAlpha = alpha;
      g.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
    };

    function draw() {
      const i0 = Math.floor(current);
      const frac = current - i0;
      const a = frames[i0] ?? nearest(i0);
      if (!a) return;
      paint(a, 1);
      const b = frames[i0 + 1];
      if (b && frames[i0] && frac > 0.02) paint(b, frac);
      g.globalAlpha = 1;
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(cv.clientWidth * dpr);
      cv.height = Math.round(cv.clientHeight * dpr);
      const v = pickVariant();
      if (v !== variant) {
        variant = v;
        load(v);
      }
      draw();
    };

    const fade = (node: HTMLElement | null, value: number) => {
      if (!node) return;
      node.style.opacity = String(value);
      node.style.transform = `translateY(${(1 - value) * 14}px)`;
      node.style.pointerEvents = value > 0.5 ? 'auto' : 'none';
    };
    const window01 = (p: number, from: number, to: number, edge = 0.035) =>
      Math.max(0, Math.min(1, (p - from) / edge, (to - p) / edge));

    const update = () => {
      const rect = el.getBoundingClientRect();
      const range = Math.max(1, rect.height - window.innerHeight);
      const p = Math.max(0, Math.min(1, -rect.top / range));
      target = p * (count - 1);
      // Overlays follow the scroll directly; only the picture eases.
      fade(intro.current, 1 - Math.max(0, Math.min(1, (p - 0.02) / 0.07)));
      if (cue.current) cue.current.style.opacity = String(Math.max(0, 1 - p / 0.03));
      captions.forEach((_, k) => {
        const start = (k === 0 ? 0.1 : scenes[k] ?? 1) + 0.02;
        // The last caption (with its call to action) stays up until the film releases the page.
        const end = k === captions.length - 1 ? 2 : (scenes[k + 1] ?? 1) - 0.03;
        fade(captionRefs.current[k], window01(p, start, end));
      });
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      raf = 0;
      const delta = target - current;
      current = Math.abs(delta) < 0.01 ? target : current + delta * 0.2;
      draw();
      if (current !== target) raf = requestAnimationFrame(tick);
    };

    resize();
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('resize', update);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', update);
    };
  }, [manifest, captions, reducedMotion]);

  return (
    <section
      id="top"
      ref={section}
      aria-label="The studio, from Bukoto Street to the workspace"
      className="relative"
      style={{ height: reducedMotion ? '100svh' : `${SCROLL_SCREENS * 100}svh` }}
    >
      <div className="sticky top-0 flex h-[100svh] items-end overflow-hidden">
        {/* Opening frame: visible before the canvas paints, and the whole picture for reduced motion. */}
        <picture className="absolute inset-0">
          <source media="(max-aspect-ratio: 9/10)" srcSet={frameUrl('mobile', 0)} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frameUrl('desktop', 0)} alt="" className="h-full w-full object-cover" fetchPriority="high" />
        </picture>
        {!reducedMotion && <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden="true" />}
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,7,0.55)_0%,rgba(7,7,7,0.12)_35%,rgba(7,7,7,0.85)_100%),linear-gradient(90deg,rgba(7,7,7,0.55)_0%,rgba(7,7,7,0.15)_60%)]"
          aria-hidden="true"
        />

        <div ref={intro} className="relative w-full will-change-[opacity,transform]">
          {children}
        </div>

        {!reducedMotion &&
          captions.map((caption, k) => (
            <div
              key={caption.title}
              ref={(node) => {
                captionRefs.current[k] = node;
              }}
              className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-[1400px] px-5 pb-20 opacity-0 sm:px-8 lg:px-12"
            >
              <p className="label flex items-center gap-3 !text-bone-dim">
                <span className="h-px w-8 bg-red" aria-hidden="true" />
                {caption.label}
              </p>
              <p className="mt-4 max-w-3xl font-display text-[clamp(2.6rem,7vw,6rem)] font-semibold leading-[0.95] tracking-tight text-bone">
                {caption.title}
              </p>
              {caption.action && <div className="mt-8">{caption.action}</div>}
            </div>
          ))}

        {!reducedMotion && (
          <>
            <div ref={cue} className="pointer-events-none absolute inset-x-0 bottom-5 hidden justify-center sm:flex" aria-hidden="true">
              <span className="label flex flex-col items-center gap-2 !text-bone-dim">
                Scroll to walk in
                <span className="h-8 w-px bg-bone/50" />
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-bone/10" aria-hidden="true">
              <div ref={bar} className="h-full origin-left scale-x-0 bg-red" />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
