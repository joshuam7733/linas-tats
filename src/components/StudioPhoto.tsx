import Image from 'next/image';
import type { ReactNode } from 'react';
import { photo, PHOTO_SLOTS, type PhotoSlot } from '@/lib/photos';

/**
 * A studio photo slot: shows `public/studio/<slot>.(webp|jpg|png)` when it exists, otherwise the designed
 * fallback. In development, empty slots are labelled with the file to add.
 */
export default function StudioPhoto({
  slot,
  alt,
  sizes,
  priority,
  className = '',
  hintClassName = 'left-3 top-3',
  fallback,
}: {
  hintClassName?: string;
  slot: PhotoSlot;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallback: ReactNode;
}) {
  const src = photo(slot);
  if (src) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
  }
  return (
    <>
      {fallback}
      {process.env.NODE_ENV === 'development' && (
        <span className={`absolute ${hintClassName} z-10 rounded-full border border-dashed border-red/70 bg-ink-950/80 px-3 py-1 text-[10px] font-semibold tracking-wide text-red-bright`}>
          Add public/studio/{PHOTO_SLOTS[slot].name}.jpg · {PHOTO_SLOTS[slot].hint}
        </span>
      )}
    </>
  );
}
