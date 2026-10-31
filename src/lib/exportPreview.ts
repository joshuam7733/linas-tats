import { site } from '@/config/site';
import { loadImage } from './upload';

export interface ExportDetails {
  designName: string;
  placement: string;
  sizeCm: number;
  rotation: number;
  skinTone: string;
  body: string;
}

const COLORS = {
  bg: '#0a0a0a',
  bone: '#efe8dc',
  muted: '#a39d92',
  faint: '#6f6a62',
  red: '#c4302b',
  line: 'rgba(239, 232, 220, 0.16)',
};

function cssFont(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number, align: 'left' | 'right' = 'left') {
  const chars = [...text];
  const width = chars.reduce((w, c) => w + ctx.measureText(c).width + tracking, -tracking);
  const start = align === 'right' ? x - width : x;
  let cx = start;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + tracking;
  }
  return start;
}

/** Composes the 3D snapshot with Linus Tats branding, the concept details and the studio's contacts. */
export async function composePreviewPng(snapshot: string, details: ExportDetails): Promise<Blob> {
  const shot = await loadImage(snapshot);
  await document.fonts?.ready;
  const serif = cssFont('--font-display', 'Georgia, serif');
  const sans = cssFont('--font-sans', 'system-ui, sans-serif');

  const W = 1200;
  const pad = 64;
  const shotW = W - pad * 2;
  const shotH = Math.round((shot.naturalHeight / shot.naturalWidth) * shotW);
  const header = 150;
  const footer = 300;
  const H = header + shotH + footer;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Header: wordmark and label
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.bone;
  ctx.font = `500 40px ${serif}`;
  spaced(ctx, site.name.toUpperCase(), pad, 92, 12);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `700 15px ${sans}`;
  const labelStart = spaced(ctx, 'TATTOO CONCEPT', W - pad, 92, 4.5, 'right');
  ctx.fillStyle = COLORS.red;
  ctx.beginPath();
  ctx.arc(labelStart - 18, 86.5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, 122);
  ctx.lineTo(W - pad, 122);
  ctx.stroke();

  // Snapshot on a soft studio backdrop
  const y0 = header;
  const grad = ctx.createRadialGradient(W / 2, y0 + shotH * 0.45, 40, W / 2, y0 + shotH * 0.5, shotH * 0.8);
  grad.addColorStop(0, '#2a2622');
  grad.addColorStop(1, '#111010');
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pad, y0, shotW, shotH, 28);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(pad, y0, shotW, shotH);
  ctx.drawImage(shot, pad, y0, shotW, shotH);
  ctx.restore();

  // Details
  const rows: [string, string][] = [
    ['Design', details.designName],
    ['Placement', details.placement],
    ['Size', `≈ ${details.sizeCm} cm`],
    ['Rotation', `${details.rotation}°`],
    ['Body', details.body],
    ['Skin', details.skinTone],
  ];
  const y = y0 + shotH + 62;
  const colW = (W - pad * 2) / 3;
  rows.forEach(([label, value], i) => {
    const x = pad + (i % 3) * colW;
    const yy = y + Math.floor(i / 3) * 70;
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 13px ${sans}`;
    spaced(ctx, label.toUpperCase(), x, yy, 3);
    ctx.fillStyle = COLORS.bone;
    ctx.font = `500 28px ${serif}`;
    ctx.fillText(value.length > 30 ? `${value.slice(0, 29)}…` : value, x, yy + 34);
  });

  // Studio contacts and disclaimer
  const contactBits = [
    site.contact.phones.map((p) => p.display).join(' / '),
    site.contact.instagram ? `@${site.contact.instagram}` : '',
    site.location,
  ].filter(Boolean);
  ctx.fillStyle = COLORS.bone;
  ctx.font = `600 16px ${sans}`;
  ctx.fillText(contactBits.join('   ·   '), pad, y + 178);
  ctx.fillStyle = COLORS.faint;
  ctx.font = `400 14px ${sans}`;
  ctx.fillText('Visual reference only. Not an exact measurement or a guarantee of how a tattoo will look on skin.', pad, y + 208);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png'),
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
