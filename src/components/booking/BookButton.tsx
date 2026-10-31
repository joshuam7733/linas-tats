'use client';

import type { ReactNode } from 'react';
import { openBooking } from './events';

/** Opens the "Book an appointment" dialog from anywhere on the page. */
export default function BookButton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => openBooking()} aria-haspopup="dialog">
      {children}
    </button>
  );
}
