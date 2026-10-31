import { designs } from './designs';

/**
 * A repeating "flash wall" tile: tattoo flash and graffiti-style marks scattered like the studio's wall art.
 * Served once as /art/flash-wall and shown faintly behind sections (see `.flash-wall` in globals.css).
 */
const TILE = 760;
const INK = '#efe8dc';

const EXTRA: Record<string, { w: number; h: number; body: string }> = {
  bolt: { w: 24, h: 42, body: `<path fill="${INK}" d="M12 0L0 24H10L5 42L24 15H13L19 0Z"/>` },
  sparkle: { w: 40, h: 40, body: `<path fill="${INK}" d="M20 0Q20 20 40 20Q20 20 20 40Q20 20 0 20Q20 20 20 0Z"/>` },
  heart: {
    w: 44,
    h: 40,
    body: `<path fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" d="M22 37C8 27 2 19 2 11C2 5 7 2 12 2C17 2 20 6 22 9C24 6 27 2 32 2C37 2 42 5 42 11C42 19 36 27 22 37Z"/><path fill="none" stroke="${INK}" stroke-width="1.6" d="M8 8L36 30"/>`,
  },
  eye: {
    w: 60,
    h: 30,
    body: `<path fill="none" stroke="${INK}" stroke-width="2.4" d="M2 15C14 2 46 2 58 15C46 28 14 28 2 15Z"/><circle cx="30" cy="15" r="7" fill="${INK}"/><path stroke="${INK}" stroke-width="1.6" d="M30 0V-6M18 3L15 -2M42 3L45 -2"/>`,
  },
  brush: {
    w: 220,
    h: 60,
    body: `<path fill="${INK}" d="M4 44C40 20 90 10 140 14C170 16 196 24 216 34C190 28 160 26 130 28C88 31 46 40 4 44Z"/><path fill="${INK}" d="M30 52C70 40 120 38 170 46C130 46 80 48 30 52Z"/>`,
  },
  drip: {
    w: 80,
    h: 110,
    body: `<path fill="${INK}" d="M0 6C20 0 60 0 80 6V12C74 12 72 16 72 26C72 40 66 44 64 30C62 18 58 14 50 14C46 14 44 20 44 46C44 80 34 80 34 46C34 22 30 14 24 14C18 14 16 20 16 34C16 46 8 46 8 30C8 18 4 12 0 12Z"/>`,
  },
};

type Item = { id: string; x: number; y: number; size: number; rotate: number };

// Hand-placed so motifs never touch and the tile repeats without visible seams.
const ITEMS: Item[] = [
  { id: 'sigil', x: 40, y: 30, size: 200, rotate: -8 },
  { id: 'halo', x: 300, y: 70, size: 130, rotate: 0 },
  { id: 'bolt', x: 520, y: 40, size: 70, rotate: 14 },
  { id: 'dagger', x: 600, y: 120, size: 190, rotate: 22 },
  { id: 'eye', x: 250, y: 260, size: 110, rotate: -6 },
  { id: 'sparkle', x: 180, y: 300, size: 40, rotate: 0 },
  { id: 'brush', x: 420, y: 300, size: 230, rotate: -12 },
  { id: 'flames', x: 40, y: 400, size: 150, rotate: 6 },
  { id: 'heart', x: 260, y: 420, size: 70, rotate: -14 },
  { id: 'shatter', x: 420, y: 470, size: 140, rotate: 18 },
  { id: 'sparkle', x: 640, y: 420, size: 28, rotate: 0 },
  { id: 'drip', x: 640, y: 560, size: 90, rotate: 0 },
  { id: 'spine', x: 210, y: 560, size: 190, rotate: 80 },
  { id: 'bolt', x: 20, y: 660, size: 50, rotate: -20 },
  { id: 'sparkle', x: 560, y: 700, size: 22, rotate: 0 },
];

function art(id: string) {
  const design = designs.find((d) => d.id === id);
  if (design?.body) return { w: design.width, h: design.height, body: design.body(INK) };
  return EXTRA[id];
}

export function flashWallSvg() {
  const items = ITEMS.map(({ id, x, y, size, rotate }) => {
    const a = art(id);
    if (!a) return '';
    const scale = size / Math.max(a.w, a.h);
    const w = a.w * scale;
    const h = a.h * scale;
    return `<g transform="rotate(${rotate} ${x + w / 2} ${y + h / 2})"><svg x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="0 0 ${a.w} ${a.h}" overflow="visible">${a.body}</svg></g>`;
  }).join('');
  // Faintness is baked in, so the tile can be layered straight onto any background.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}"><g opacity="0.075">${items}</g></svg>`;
}
