// Server-only: reads the filesystem at build time.
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Studio photo slots. Drop real photos into `public/studio/` using these names (jpg, jpeg, png or webp)
 * and rebuild; until then each slot renders a designed fallback instead of a stock image.
 */
export const PHOTO_SLOTS = {
  hero: { name: 'hero', hint: 'The studio front or interior, landscape' },
  work: { name: 'work', hint: 'A close-up of a healed tattoo' },
  studio1: { name: 'studio-1', hint: 'Inside the studio' },
  studio2: { name: 'studio-2', hint: 'An artist at work' },
  studio3: { name: 'studio-3', hint: 'A finished piece' },
} as const;

export type PhotoSlot = keyof typeof PHOTO_SLOTS;

const EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png'];

/** Public URL of the photo for a slot, or null when the file hasn't been added yet. */
export function photo(slot: PhotoSlot): string | null {
  const { name } = PHOTO_SLOTS[slot];
  for (const ext of EXTENSIONS) {
    if (existsSync(path.join(process.cwd(), 'public', 'studio', `${name}.${ext}`))) return `/studio/${name}.${ext}`;
  }
  return null;
}
