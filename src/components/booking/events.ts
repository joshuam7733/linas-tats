import type { ExportDetails } from '@/lib/exportPreview';

/** Dispatched on window to open the booking dialog; `detail` carries the try-on concept when there is one. */
export const BOOK_EVENT = 'linus:book';

export interface BookingConcept extends ExportDetails {
  /** PNG data URL of the concept view, or null if the browser couldn't capture it. */
  snapshot: string | null;
}

export function openBooking(concept?: BookingConcept) {
  window.dispatchEvent(new CustomEvent<BookingConcept | undefined>(BOOK_EVENT, { detail: concept }));
}
