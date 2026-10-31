// Server-only: reads the film manifest at build time.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Frame sequence written by `npm run film` (see scripts/film/extract-film.mjs). */
export interface FilmManifest {
  fps: number;
  count: number;
  duration: number;
  /** Where each scene starts, as a fraction of the film (exterior, lounge, workspace). */
  scenes: number[];
  desktop: { width: number; height: number };
  mobile: { width: number; height: number };
}

export function filmManifest(): FilmManifest | null {
  const file = path.join(process.cwd(), 'public', 'film', 'manifest.json');
  if (!existsSync(file)) return null;
  try {
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as FilmManifest;
    return manifest.count > 1 ? manifest : null;
  } catch {
    return null;
  }
}
