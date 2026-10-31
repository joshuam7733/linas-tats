import type { ReactNode } from 'react';

/**
 * Fades content up as it scrolls into view, using CSS scroll-driven animations (see `.reveal-on-scroll`).
 * Browsers without support, and reduced-motion users, simply see the content: it can never get stuck hidden.
 */
export default function Reveal({ children, className = '' }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={`reveal-on-scroll ${className}`}>{children}</div>;
}
