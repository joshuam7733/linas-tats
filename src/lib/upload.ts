import type { CustomArtwork } from './concept';

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 1024;

export class UploadError extends Error {}

/** Decodes an uploaded file locally, downscales it and returns a PNG data URL. Nothing leaves the browser. */
export async function readArtwork(file: File, removeLightBackground: boolean): Promise<CustomArtwork> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new UploadError('Please choose a PNG, JPG or WebP image.');
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError('That image is larger than 12 MB. Please choose a smaller file.');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UploadError("We couldn't read that image. It may be damaged or in an unsupported format.");
  }
  if (bitmap.width < 16 || bitmap.height < 16) {
    bitmap.close();
    throw new UploadError('That image is too small to use as a tattoo design.');
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new UploadError('Your browser could not process this image.');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  if (removeLightBackground) knockOutLightBackground(ctx, width, height);
  return {
    name: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Your design',
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
  };
}

/**
 * Optional: fades near-white, low-saturation pixels to transparent with a soft ramp,
 * so anti-aliased line edges survive. Only used when the visitor opts in.
 */
function knockOutLightBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    const saturation = max === 0 ? 0 : (max - min) / max;
    if (saturation > 0.18) continue;
    const lightness = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    const fade = Math.min(1, Math.max(0, (lightness - 0.82) / 0.13));
    d[i + 3] = Math.round(d[i + 3] * (1 - fade));
  }
  ctx.putImageData(image, 0, 0);
}

/** True when the image has no meaningful transparency (common for JPGs and screenshots). */
export async function isOpaque(dataUrl: string) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const w = (canvas.width = Math.min(128, img.naturalWidth));
  const h = (canvas.height = Math.min(128, img.naturalHeight));
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let transparent = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 200) transparent++;
  return transparent / (w * h) < 0.02;
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = src;
  });
}
