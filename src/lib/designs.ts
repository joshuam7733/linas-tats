import studioArt from '../../public/art/tattoos/manifest.json';
import { asset } from './asset';

/**
 * Sample tattoo designs, grouped into five styles.
 * - Studio designs (see STUDIO below) are the studio's own design sheets, turned into ink on transparent
 *   (colour kept) by `npm run art`.
 * - Drawn designs are original SVG made for this site. `ink` is substituted at render time so the same
 *   artwork can be shown in bone on the page and in dark ink on the 3D body. The sigil-style pieces are built
 *   from tapered strokes (thick at the root, needle-sharp at the tip).
 */
export type CategoryId = 'realism' | 'tribal' | 'fineline' | 'sigil' | 'blackwork';

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'realism', label: 'Realism' },
  { id: 'tribal', label: 'Tribal' },
  { id: 'fineline', label: 'Fine line' },
  { id: 'sigil', label: 'Cyber sigil' },
  { id: 'blackwork', label: 'Blackwork' },
];

export interface TattooDesign {
  id: string;
  name: string;
  style: string;
  category: CategoryId;
  width: number;
  height: number;
  /** Suggested on-body size (longest side) in centimetres. */
  suggestedCm: number;
  /** Vector artwork, drawn in the given ink colour. */
  body?: (ink: string) => string;
  /** Raster artwork: ink on transparent (realism pieces). */
  image?: string;
  /** Credit for artwork that isn't original to this site. */
  credit?: string;
}

type P = [number, number];

const f = (n: number) => n.toFixed(1);

function bezier(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function tangent(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const u = 1 - t;
  return [
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]),
  ];
}

/** A filled stroke along a cubic Bézier whose half-width goes from `w0` to `w1`. */
function taper(p0: P, p1: P, p2: P, p3: P, w0: number, w1 = 0, steps = 28): string {
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = bezier(p0, p1, p2, p3, t);
    const [dx, dy] = tangent(p0, p1, p2, p3, t);
    const len = Math.hypot(dx, dy) || 1;
    const w = w0 + (w1 - w0) * Math.pow(t, 0.85);
    left.push(`${f(x - (dy / len) * w)} ${f(y + (dx / len) * w)}`);
    right.push(`${f(x + (dy / len) * w)} ${f(y - (dx / len) * w)}`);
  }
  return `<path d="M${left.join('L')}L${right.reverse().join('L')}Z"/>`;
}

/** Mirror artwork across a vertical axis at `cx` (for symmetrical sigils). */
const mirrored = (art: string, cx: number) => `${art}<g transform="translate(${cx * 2} 0) scale(-1 1)">${art}</g>`;

/** Deterministic pseudo-random numbers so generated pieces render identically every time. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const drawn: TattooDesign[] = [
  {
    id: 'sigil',
    category: 'sigil',
    name: 'Sigil',
    style: 'Cyber sigil',
    width: 200,
    height: 300,
    suggestedCm: 12,
    body: (ink) => {
      const half = [
        taper([104, 64], [130, 60], [150, 42], [148, 10], 3.4),
        taper([118, 52], [126, 44], [126, 34], [119, 26], 1.6),
        taper([106, 104], [150, 98], [178, 118], [166, 152], 3.8),
        taper([150, 104], [160, 96], [172, 96], [180, 88], 1.5),
        taper([110, 150], [148, 148], [168, 164], [194, 150], 3.2),
        taper([106, 196], [146, 200], [166, 226], [148, 258], 3.8),
        taper([140, 206], [152, 210], [164, 206], [172, 196], 1.6),
        taper([102, 238], [120, 240], [128, 252], [124, 266], 2.2),
        taper([102, 34], [116, 32], [120, 22], [114, 12], 1.8),
      ].join('');
      return `<g fill="${ink}">
${mirrored(half, 100)}
${taper([100, 150], [100, 110], [100, 60], [100, 4], 4.2)}
${taper([100, 150], [100, 190], [100, 240], [100, 296], 4.2)}
<path d="M100 122L113 150L100 178L87 150Z"/>
</g>`;
    },
  },
  {
    id: 'halo',
    category: 'sigil',
    name: 'Halo',
    style: 'Thorn halo',
    width: 200,
    height: 200,
    suggestedCm: 9,
    body: (ink) => {
      const c = 100;
      const r = 62;
      const k = 0.5523 * r;
      // Four calligraphic quarter-arcs, swelling and thinning around the ring.
      const arcs = [
        taper([c, c - r], [c + k, c - r], [c + r, c - k], [c + r, c], 1.2, 4.2),
        taper([c + r, c], [c + r, c + k], [c + k, c + r], [c, c + r], 4.2, 1.2),
        taper([c, c + r], [c - k, c + r], [c - r, c + k], [c - r, c], 1.2, 4.2),
        taper([c - r, c], [c - r, c - k], [c - k, c - r], [c, c - r], 4.2, 1.2),
      ].join('');
      const thorns = Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
        const long = i % 2 === 0;
        const out = long ? 96 : 82;
        const sweep = long ? 0.42 : 0.3;
        const at = (rad: number, ang: number): P => [c + Math.cos(ang) * rad, c + Math.sin(ang) * rad];
        const outer = taper(at(r, a), at(r + 12, a + 0.05), at(out - 10, a + sweep * 0.6), at(out, a + sweep), long ? 3.4 : 2.4);
        const inner = i % 3 === 0 ? taper(at(r, a + 0.12), at(r - 8, a + 0.16), at(r - 16, a + 0.3), at(r - 20, a + 0.4), 1.6) : '';
        return outer + inner;
      }).join('');
      return `<g fill="${ink}">${arcs}${thorns}<circle cx="100" cy="100" r="4"/></g>`;
    },
  },
  {
    id: 'spine',
    category: 'sigil',
    name: 'Spine',
    style: 'Sigil back piece',
    width: 140,
    height: 380,
    suggestedCm: 22,
    body: (ink) => {
      const cx = 70;
      const rows = [
        [44, 16],
        [80, 26],
        [118, 36],
        [158, 44],
        [200, 48],
        [242, 42],
        [282, 32],
        [318, 22],
        [348, 12],
      ];
      const half = rows
        .map(([y, len]) => taper([cx + 3, y], [cx + len * 0.4, y - 2], [cx + len * 0.8, y - len * 0.3], [cx + len, y - len * 0.65], 2.6))
        .join('');
      const dots = rows.map(([y]) => `<circle cx="${cx}" cy="${y + 18}" r="2"/>`).join('');
      return `<g fill="${ink}">
${mirrored(half, cx)}
${taper([cx, 190], [cx, 130], [cx, 60], [cx, 4], 3.6)}
${taper([cx, 190], [cx, 250], [cx, 320], [cx, 376], 3.6)}
<path d="M${cx} 176L${cx + 9} 196L${cx} 216L${cx - 9} 196Z"/>
${dots}
</g>`;
    },
  },
  {
    id: 'dagger',
    category: 'blackwork',
    name: 'Dagger',
    style: 'Neo-trad dagger',
    width: 140,
    height: 320,
    suggestedCm: 11,
    body: (ink) => {
      const vine = [
        taper([62, 150], [86, 160], [88, 182], [70, 196], 2.2, 1.2),
        taper([70, 196], [50, 210], [48, 228], [68, 240], 1.2, 2),
        taper([68, 240], [86, 250], [88, 262], [80, 274], 2, 0.4),
        taper([84, 168], [96, 166], [104, 158], [106, 148], 1.4),
        taper([52, 216], [40, 214], [32, 206], [30, 196], 1.4),
        taper([84, 256], [96, 258], [102, 266], [102, 276], 1.2),
      ].join('');
      return `<g fill="${ink}">
<path d="M70 26L78 38L70 50L62 38Z"/>
<rect x="64" y="52" width="12" height="62" rx="3"/>
${mirrored(taper([70, 120], [56, 120], [36, 116], [24, 98], 5) + taper([40, 117], [34, 124], [28, 126], [22, 124], 1.6), 70)}
<rect x="54" y="114" width="32" height="10" rx="5"/>
</g>
<g fill="none" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round">
  <path d="M70 126L84 142L76 284L70 306L64 284L56 142Z"/>
  <path d="M70 140V280" stroke-width="1.4"/>
</g>
<g fill="${ink}">${vine}</g>`;
    },
  },
  {
    id: 'flames',
    category: 'tribal',
    name: 'Wildfire',
    style: 'Tribal flames',
    width: 200,
    height: 250,
    suggestedCm: 10,
    body: (ink) => {
      // S-curved tongues that lick sideways at the tip, plus small curling licks off the sides.
      const tongues: [P, P, P, P, number][] = [
        [[100, 246], [62, 176], [150, 96], [104, 8], 18],
        [[72, 246], [38, 200], [84, 128], [36, 60], 14],
        [[128, 246], [170, 196], [118, 126], [168, 50], 14],
        [[48, 246], [18, 214], [46, 168], [8, 126], 10],
        [[152, 246], [186, 212], [156, 164], [194, 118], 10],
        [[88, 246], [112, 202], [68, 170], [90, 118], 7],
      ];
      const licks = [
        taper([60, 154], [44, 146], [40, 128], [26, 120], 3.2),
        taper([142, 150], [158, 140], [162, 122], [176, 112], 3.2),
        taper([112, 104], [130, 96], [134, 80], [146, 74], 2.6),
      ].join('');
      const art = tongues.map(([p0, p1, p2, p3, w]) => taper(p0, p1, p2, p3, w)).join('');
      return `<g fill="${ink}">${art}${licks}</g>`;
    },
  },
  {
    id: 'shatter',
    category: 'sigil',
    name: 'Shatter',
    style: 'Abstract blackwork',
    width: 200,
    height: 200,
    suggestedCm: 8,
    body: (ink) => {
      const rand = seeded(7);
      const shards: string[] = [];
      const pieces = 16;
      for (let i = 0; i < pieces; i++) {
        const a0 = (i / pieces) * Math.PI * 2 + 0.03;
        const a1 = ((i + 1) / pieces) * Math.PI * 2 - 0.03;
        const am = (a0 + a1) / 2;
        const burst = i % 4 === 1 ? 14 + rand() * 10 : 0;
        const ox = Math.cos(am) * burst;
        const oy = Math.sin(am) * burst;
        const rIn = 44 + rand() * 6;
        const rOut = 74 + rand() * 8;
        const pt = (rad: number, ang: number) => `${f(100 + ox + Math.cos(ang) * rad)} ${f(100 + oy + Math.sin(ang) * rad)}`;
        const tip = rOut + 6 + rand() * 10;
        shards.push(`<path d="M${pt(rIn, a0)}L${pt(rOut, a0 + 0.02)}L${pt(tip, am)}L${pt(rOut, a1 - 0.02)}L${pt(rIn, a1)}Z"/>`);
      }
      for (let i = 0; i < 7; i++) {
        const a = rand() * Math.PI * 2;
        const d = 96 + rand() * 4;
        const s = 3 + rand() * 4;
        const x = 100 + Math.cos(a) * d * 0.94;
        const y = 100 + Math.sin(a) * d * 0.94;
        shards.push(`<path d="M${f(x)} ${f(y - s)}L${f(x + s * 0.8)} ${f(y + s * 0.6)}L${f(x - s * 0.8)} ${f(y + s * 0.4)}Z"/>`);
      }
      return `<g fill="${ink}">${shards.join('')}<circle cx="100" cy="100" r="12"/></g>`;
    },
  },
  {
    id: 'sun',
    category: 'tribal',
    name: 'Black sun',
    style: 'Blackwork',
    width: 200,
    height: 200,
    suggestedCm: 9,
    body: (ink) => {
      const rays = Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8;
        const long = i % 2 === 0;
        const r1 = 46;
        const r2 = long ? 94 : 72;
        const w = long ? 0.13 : 0.1;
        const pt = (rad: number, t: number) => `${(100 + Math.cos(t) * rad).toFixed(1)} ${(100 + Math.sin(t) * rad).toFixed(1)}`;
        return `<path d="M${pt(r1, a - w)}L${pt(r2, a)}L${pt(r1, a + w)}Z"/>`;
      }).join('');
      const dots = Array.from({ length: 16 }, (_, i) => {
        const a = ((i + 0.5) * Math.PI) / 8;
        return `<circle cx="${(100 + Math.cos(a) * 84).toFixed(1)}" cy="${(100 + Math.sin(a) * 84).toFixed(1)}" r="2.6"/>`;
      }).join('');
      return `
<defs>
  <mask id="sun-ring" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
    <rect width="200" height="200" fill="#fff"/>
    <circle cx="100" cy="100" r="29" fill="none" stroke="#000" stroke-width="3.2"/>
    <circle cx="100" cy="100" r="9" fill="#000"/>
  </mask>
</defs>
<g fill="${ink}">
  <circle cx="100" cy="100" r="38" mask="url(#sun-ring)"/>
  ${rays}${dots}
</g>`;
    },
  },
  {
    id: 'band',
    category: 'tribal',
    name: 'Tribal band',
    style: 'Blackwork band',
    width: 300,
    height: 92,
    suggestedCm: 12,
    body: (ink) => {
      const teeth = Array.from({ length: 10 }, (_, i) => {
        const x = i * 30;
        return `<path d="M${x} 15H${x + 30}L${x + 15} 42Z"/><path d="M${x + 15} 77H${x + 45}L${x + 30} 50Z"/>`;
      }).join('');
      const dots = Array.from({ length: 10 }, (_, i) => `<circle cx="${i * 30 + 15}" cy="60" r="2.4"/><circle cx="${i * 30 + 30}" cy="32" r="2.4"/>`).join('');
      return `
<defs><clipPath id="band-clip"><rect width="300" height="92"/></clipPath></defs>
<g fill="${ink}" clip-path="url(#band-clip)">
  <rect width="300" height="9"/>
  <rect y="83" width="300" height="9"/>
  ${teeth}${dots}
  <rect y="45" width="300" height="2.2"/>
</g>`;
    },
  },
  // Fine line
  {
    id: 'floral',
    category: 'fineline',
    name: 'Wild bloom',
    style: 'Fine-line floral',
    width: 200,
    height: 260,
    suggestedCm: 9,
    body: (ink) => `
<g fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M100 112C96 150 108 185 98 252"/>
  <path d="M101 160C120 140 148 138 162 146C146 166 122 171 101 160Z"/>
  <path d="M101 160C124 156 142 151 162 146" stroke-width="1.4"/>
  <path d="M99 205C80 186 52 184 38 192C54 210 78 215 99 205Z"/>
  <path d="M99 205C76 201 58 197 38 192" stroke-width="1.4"/>
  <path d="M102 132C118 120 130 104 134 86"/>
  <path d="M134 88C123 78 127 63 138 56C147 65 146 79 134 88Z"/>
  <path d="M134 88C132 77 134 66 138 56" stroke-width="1.4"/>
  <g transform="translate(100 70)">
    ${petals(5, 0, 'M0 0C-17 -14 -15 -44 0 -50C15 -44 17 -14 0 0Z')}
    <g stroke-width="1.2">${petals(5, 0, 'M0 -12L0 -38')}</g>
    ${petals(5, 36, 'M0 0C-9 -8 -8 -25 0 -29C8 -25 9 -8 0 0Z')}
    <circle r="7" fill="${ink}"/>
  </g>
</g>`,
  },
  {
    id: 'moth',
    category: 'fineline',
    name: 'Night moth',
    style: 'Fine-line butterfly',
    width: 220,
    height: 180,
    suggestedCm: 8,
    body: (ink) => {
      const half = `
  <path d="M106 72C90 42 60 14 30 18C10 22 8 50 22 66C36 82 70 88 104 82Z"/>
  <path d="M104 90C80 94 52 106 46 128C42 148 62 160 80 150C96 140 104 118 106 96Z"/>
  <path d="M104 78C80 60 56 44 34 34M104 80C76 74 50 66 26 56M104 94C86 108 72 122 62 140" stroke-width="1.3"/>
  <path fill="${ink}" d="M30 18C10 22 8 50 22 66C26 52 32 36 46 22C40 18 35 17 30 18Z"/>
  <circle cx="52" cy="48" r="4.5"/>
  <circle cx="72" cy="136" r="6"/>
  <circle cx="72" cy="136" r="2" fill="${ink}"/>
  <path d="M106 54C100 36 92 26 84 22"/>
  <circle cx="83" cy="21" r="2.2" fill="${ink}"/>`;
      return `
<g fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <g>${half}</g>
  <g transform="translate(220 0) scale(-1 1)">${half}</g>
</g>
<ellipse cx="110" cy="96" rx="5" ry="32" fill="${ink}"/>
<circle cx="110" cy="60" r="6.5" fill="${ink}"/>`;
    },
  },
  {
    id: 'moon',
    category: 'fineline',
    name: 'Crescent',
    style: 'Dotwork moon',
    width: 200,
    height: 220,
    suggestedCm: 8,
    body: (ink) => `
<defs>
  <mask id="moon-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="220">
    <rect width="200" height="220" fill="#fff"/>
    <circle cx="130" cy="95" r="66" fill="#000"/>
  </mask>
  <clipPath id="moon-clip"><circle cx="100" cy="110" r="80"/></clipPath>
</defs>
<circle cx="100" cy="110" r="80" fill="none" stroke="${ink}" stroke-width="2.6" mask="url(#moon-cut)"/>
<circle cx="130" cy="95" r="66" fill="none" stroke="${ink}" stroke-width="1.6" clip-path="url(#moon-clip)"/>
<g fill="${ink}">${moonDots()}</g>
${sparkle(156, 44, 11, ink)}${sparkle(172, 150, 6, ink)}${sparkle(140, 196, 4, ink)}`,
  },
  {
    id: 'triad',
    category: 'fineline',
    name: 'Triad',
    style: 'Minimal symbol',
    width: 200,
    height: 200,
    suggestedCm: 5,
    body: (ink) => `
<g fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M100 32L166 150H34Z"/>
  <circle cx="100" cy="112" r="30"/>
  <path d="M100 8V192" stroke-width="1.5"/>
</g>
<g fill="${ink}"><circle cx="100" cy="112" r="4"/><circle cx="100" cy="8" r="3"/><circle cx="100" cy="192" r="3"/></g>`,
  },
  // Traditional
  {
    id: 'serpent',
    category: 'blackwork',
    name: 'Coiled serpent',
    style: 'Old-school serpent',
    width: 200,
    height: 280,
    suggestedCm: 11,
    body: (ink) => {
      const spine = 'M72 258C30 238 38 198 90 188C150 176 166 140 120 120C70 100 50 70 90 52C106 45 116 42 124 38';
      return `
<defs>
  <mask id="serpent-hollow" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="280">
    <rect width="200" height="280" fill="#fff"/>
    <path d="${spine}" fill="none" stroke="#000" stroke-width="13" stroke-linecap="round"/>
    <circle cx="141" cy="25" r="2.6" fill="#000"/>
  </mask>
</defs>
<g mask="url(#serpent-hollow)">
  <path d="${spine}" fill="none" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
  <path fill="${ink}" d="M118 42C116 28 128 16 144 14C155 14 160 21 155 28C148 37 134 44 118 42Z"/>
</g>
<path d="${spine}" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-dasharray="0.5 8"/>
<path d="M120 266C98 276 80 272 72 262" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>
<path d="M155 22L167 15M167 15L174 10M167 15L175 16" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`;
    },
  },
  {
    id: 'swallow',
    category: 'blackwork',
    name: 'Swallow',
    style: 'Old-school swallow',
    width: 220,
    height: 170,
    suggestedCm: 8,
    body: (ink) => `<g fill="${ink}">
${taper([142, 74], [112, 40], [88, 22], [56, 6], 15)}
${taper([134, 78], [104, 54], [80, 42], [46, 34], 9)}
${taper([128, 90], [112, 120], [96, 142], [70, 162], 13)}
${taper([120, 92], [98, 112], [80, 124], [48, 132], 7)}
${taper([78, 100], [56, 98], [30, 94], [4, 86], 6)}
${taper([78, 104], [56, 110], [34, 122], [10, 134], 6)}
<path d="M198 79Q190 68 174 66Q148 62 120 76Q96 88 74 102Q100 106 128 99Q162 94 186 88Q194 85 198 79Z"/>
<path d="M197 77L214 79L196 84Z"/>
</g>`,
  },
];

/**
 * The studio's own design sheets: images in public/art/tattoos/, converted from assets/designs/ by `npm run art`
 * (which also writes their pixel sizes to manifest.json).
 */
const STUDIO: [id: string, name: string, style: string, category: CategoryId, suggestedCm: number][] = [
  ['lion', 'Lion', 'Black & grey realism', 'realism', 14],
  ['roaring-lion', 'Roaring lion', 'Black & grey realism', 'realism', 16],
  ['ace', 'Ace of spades', 'Black & grey realism', 'realism', 14],
  ['liberty', 'Lady Liberty', 'Chicano realism', 'realism', 18],
  ['angel-demon', 'Angel & demon', 'Black & grey realism', 'realism', 22],
  ['scales', 'Balance', 'Black & grey realism', 'realism', 18],
  ['winged-heart', 'Winged heart', 'Tribal with colour', 'tribal', 14],
  ['butterfly-moon', 'Moon butterfly', 'Fine-line ornamental', 'fineline', 14],
  ['sun-moon-lily', 'Sun, moon & lily', 'Fine-line celestial', 'fineline', 16],
  ['lotus', 'Lotus unalome', 'Fine-line spine piece', 'fineline', 22],
  ['capricorn', 'Capricorn', 'Fine-line zodiac', 'fineline', 14],
  ['hourglass', 'Hourglass', 'Illustrative linework', 'fineline', 16],
  ['thorn-cross', 'Thorn cross', 'Cyber sigil', 'sigil', 14],
  ['symbiote', 'Symbiote', 'Dark blackwork', 'sigil', 16],
  ['clown', 'Crowned clown', 'Chicano blackwork', 'blackwork', 12],
  ['money-rose', 'Money rose', 'Chicano blackwork', 'blackwork', 10],
  ['tiger-eye', 'Tiger eye', 'Illustrative linework', 'blackwork', 16],
  ['lion-line', 'Lion linework', 'Illustrative linework', 'blackwork', 14],
  ['yin-yang', 'Yin-yang tree', 'Blackwork dotwork', 'blackwork', 12],
];

const studio: TattooDesign[] = STUDIO.filter(([id]) => id in studioArt).map(([id, name, style, category, suggestedCm]) => ({
  id,
  name,
  style,
  category,
  suggestedCm,
  width: studioArt[id as keyof typeof studioArt].w,
  height: studioArt[id as keyof typeof studioArt].h,
  image: asset(`/art/tattoos/${id}.png`),
}));

/** Studio designs first in every style, then the drawn ones. */
export const designs: TattooDesign[] = CATEGORIES.flatMap(({ id }) => [...studio, ...drawn].filter((d) => d.category === id));

export const getDesign = (id: string) => designs.find((d) => d.id === id);

export function designSvg(design: TattooDesign, ink: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${design.width} ${design.height}" width="${design.width}" height="${design.height}">${design.body?.(ink) ?? ''}</svg>`;
}

/** Image URL for showing a design: the SVG in the given ink, or the realism image as it is. */
export function designDataUrl(design: TattooDesign, ink: string) {
  if (design.image) return design.image;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(designSvg(design, ink))}`;
}

function petals(count: number, offset: number, path: string) {
  return Array.from({ length: count }, (_, i) => `<path d="${path}" transform="rotate(${offset + (i * 360) / count})"/>`).join('');
}

function sparkle(x: number, y: number, s: number, ink: string) {
  return `<path fill="${ink}" d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z"/>`;
}

function moonDots() {
  const rand = seeded(42);
  const dots: string[] = [];
  let tries = 0;
  while (dots.length < 230 && tries < 6000) {
    tries++;
    const x = 20 + rand() * 160;
    const y = 30 + rand() * 160;
    const dOuter = Math.hypot(x - 100, y - 110);
    const dInner = Math.hypot(x - 130, y - 95);
    if (dOuter > 76 || dInner < 70) continue;
    // Denser near the outer edge for a soft, shaded crescent.
    const edge = (dOuter - 30) / 46;
    if (rand() > edge * edge) continue;
    dots.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.8 + rand() * 0.9)}"/>`);
  }
  return dots.join('');
}

export const INK = '#141414';
export const BONE = '#efe8dc';
