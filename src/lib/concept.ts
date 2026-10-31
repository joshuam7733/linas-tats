export type AreaId = 'chest' | 'ribs' | 'upperBack' | 'lowerBack' | 'neck' | 'upperArm' | 'forearm' | 'thigh' | 'calf';

export type BodyId = 'woman' | 'man';

export interface Placement {
  point: [number, number, number];
  normal: [number, number, number];
  /** Named area, or 'custom' when placed by clicking the body. */
  area: AreaId | 'custom';
}

export interface CustomArtwork {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface Concept {
  body: BodyId;
  designId: string; // a design id, or 'custom' for an uploaded image
  custom?: CustomArtwork;
  sizeCm: number;
  rotation: number;
  skinTone: string;
  placement: Placement | null;
}

export const SKIN_TONES = [
  { id: 'deep', label: 'Deep', color: '#3f261b' },
  { id: 'brown', label: 'Brown', color: '#6b4230' },
  { id: 'umber', label: 'Umber', color: '#8d5b3f' },
  { id: 'olive', label: 'Olive', color: '#b07e57' },
  { id: 'light', label: 'Light', color: '#d9ab8b' },
  { id: 'fair', label: 'Fair', color: '#efcfba' },
] as const;

export const AREA_LABELS: Record<AreaId | 'custom', string> = {
  chest: 'Chest',
  ribs: 'Ribs',
  upperBack: 'Upper back',
  lowerBack: 'Lower back',
  neck: 'Neck',
  upperArm: 'Upper arm',
  forearm: 'Forearm',
  thigh: 'Thigh',
  calf: 'Calf',
  custom: 'Custom spot',
};

/** Largest size (cm) that reads well on each area; picking an area trims anything bigger. */
export const AREA_MAX_CM: Record<AreaId, number> = {
  chest: 16,
  ribs: 14,
  upperBack: 26,
  lowerBack: 18,
  neck: 6,
  upperArm: 10,
  forearm: 7,
  thigh: 12,
  calf: 10,
};

export const AREAS: AreaId[] = ['chest', 'ribs', 'upperBack', 'lowerBack', 'neck', 'upperArm', 'forearm', 'thigh', 'calf'];

export const BODY_LABELS: Record<BodyId, string> = { woman: 'Woman', man: 'Man' };

export const SIZE_RANGE = { min: 3, max: 30, step: 0.5 };

export const DEFAULT_CONCEPT: Concept = {
  body: 'man',
  designId: 'sigil',
  sizeCm: 9,
  rotation: 0,
  skinTone: 'brown',
  placement: null,
};

const STORAGE_KEY = 'linustats:concept:v2';

function isConcept(value: unknown): value is Concept {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Concept>;
  return (
    (v.body === 'woman' || v.body === 'man') &&
    typeof v.designId === 'string' &&
    typeof v.sizeCm === 'number' &&
    typeof v.rotation === 'number' &&
    typeof v.skinTone === 'string'
  );
}

export function loadSavedConcept(): Concept | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConcept(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

export function saveConcept(concept: Concept): SaveResult {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(concept));
    return { ok: true };
  } catch (error) {
    const quota = error instanceof DOMException && /quota/i.test(error.name);
    return { ok: false, reason: quota ? 'quota' : 'unavailable' };
  }
}
