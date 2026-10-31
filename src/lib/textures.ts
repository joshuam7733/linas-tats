import * as THREE from 'three';
import { designSvg, INK, type TattooDesign } from './designs';
import { loadImage } from './upload';

const TEXTURE_EDGE = 1024;

export interface TattooTexture {
  texture: THREE.Texture;
  /** width / height */
  aspect: number;
}

async function rasterize(src: string, naturalWidth: number, naturalHeight: number): Promise<TattooTexture> {
  const img = await loadImage(src);
  const scale = TEXTURE_EDGE / Math.max(naturalWidth, naturalHeight);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(img, 0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return { texture, aspect: width / height };
}

export function designTexture(design: TattooDesign) {
  if (design.image) return rasterize(design.image, design.width, design.height);
  const svg = designSvg(design, INK);
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  return rasterize(blobUrl, design.width, design.height).finally(() => URL.revokeObjectURL(blobUrl));
}

export function imageTexture(dataUrl: string, width: number, height: number) {
  return rasterize(dataUrl, width, height);
}
