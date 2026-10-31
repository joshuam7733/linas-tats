'use client';

import { useGLTF, useProgress } from '@react-three/drei';
import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AREA_LABELS,
  AREA_MAX_CM,
  AREAS,
  BODY_LABELS,
  DEFAULT_CONCEPT,
  SIZE_RANGE,
  SKIN_TONES,
  loadSavedConcept,
  saveConcept,
  type AreaId,
  type BodyId,
  type Concept,
  type CustomArtwork,
  type Placement,
} from '@/lib/concept';
import { CATEGORIES, designDataUrl, designs, getDesign, INK, type CategoryId } from '@/lib/designs';
import { composePreviewPng, downloadBlob } from '@/lib/exportPreview';
import { designTexture, imageTexture, type TattooTexture } from '@/lib/textures';
import { ACCEPTED_TYPES, isOpaque, readArtwork, UploadError } from '@/lib/upload';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { openBooking, type BookingConcept } from '../booking/events';
import { BODIES, type CameraView } from './bodies';
import { TRY_DESIGN_EVENT } from './events';
import type { ViewerApi } from './Viewer';

const Viewer = dynamic(() => import('./Viewer'), { ssr: false });

type WebGLState = 'checking' | 'ok' | 'unavailable';

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

class ModelErrorBoundary extends Component<{ onRetry(): void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="absolute inset-0 grid place-items-center p-8 text-center">
        <div className="max-w-sm">
          <p className="font-display text-3xl text-bone">The 3D body didn&rsquo;t load</p>
          <p className="mt-3 text-sm leading-relaxed text-mute">This is usually a network hiccup. Check your connection and try again.</p>
          <button
            type="button"
            className="btn-bone mt-6"
            onClick={() => {
              this.setState({ failed: false });
              this.props.onRetry();
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

function LoadingOverlay() {
  const { progress } = useProgress();
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <span className="loader-ring" aria-hidden="true" />
        <span className="label">Preparing the body · {Math.round(progress)}%</span>
      </div>
    </div>
  );
}

const VIEW_LABELS: Record<CameraView, string> = { front: 'Front', back: 'Back', left: 'Left', right: 'Right' };

export default function TattooPreview() {
  const reducedMotion = useReducedMotion();
  const api = useRef<ViewerApi | null>(null);
  const [webgl, setWebgl] = useState<WebGLState>('checking');
  const [readyBody, setReadyBody] = useState<BodyId | null>(null);
  const [viewerKey, setViewerKey] = useState(0);
  const [concept, setConcept] = useState<Concept>(DEFAULT_CONCEPT);
  const [tattoo, setTattoo] = useState<TattooTexture | null>(null);
  const [status, setStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [removeLight, setRemoveLight] = useState(false);
  const [busy, setBusy] = useState<'upload' | 'download' | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const lastFile = useRef<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  /** Area to re-place on once the next body finishes loading (after a Woman/Man switch or restore). */
  const pendingArea = useRef<AreaId | null>('chest');

  const ready = readyBody === concept.body;
  const [category, setCategory] = useState<CategoryId>(getDesign(DEFAULT_CONCEPT.designId)?.category ?? 'realism');

  useEffect(() => {
    setWebgl(detectWebGL() ? 'ok' : 'unavailable');
    setHasSaved(Boolean(loadSavedConcept()));
  }, []);

  const update = useCallback((patch: Partial<Concept>) => setConcept((c) => ({ ...c, ...patch })), []);

  // Build the tattoo texture whenever the artwork changes; dispose the one it replaces.
  const artworkKey =
    concept.designId === 'custom' ? `custom:${concept.custom?.dataUrl.length}:${concept.custom?.dataUrl.slice(-32)}` : concept.designId;
  useEffect(() => {
    let cancelled = false;
    let created: TattooTexture | null = null;
    const design = getDesign(concept.designId);
    const job =
      concept.designId === 'custom' && concept.custom
        ? imageTexture(concept.custom.dataUrl, concept.custom.width, concept.custom.height)
        : design
          ? designTexture(design)
          : null;
    if (!job) {
      setTattoo(null);
      return;
    }
    job
      .then((result) => {
        if (cancelled) {
          result.texture.dispose();
          return;
        }
        created = result;
        setTattoo(result);
      })
      .catch(() => {
        if (!cancelled) setStatus("That design couldn't be prepared. Please try another one.");
      });
    return () => {
      cancelled = true;
      if (created) created.texture.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworkKey]);

  // Called by the viewer once a body's surface is ready: re-place the tattoo on the same area.
  const handleReady = useCallback((body: BodyId) => {
    setReadyBody(body);
    const area = pendingArea.current;
    pendingArea.current = null;
    if (!area || !api.current) return;
    const placement = api.current.placeAtArea(area, false);
    if (placement) setConcept((c) => (c.body === body ? { ...c, placement, sizeCm: Math.min(c.sizeCm, AREA_MAX_CM[area]) } : c));
  }, []);

  // Collection "Try it on" links dispatch this event.
  useEffect(() => {
    const onTry = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const design = getDesign(id);
      if (!design) return;
      setCategory(design.category);
      setConcept((c) => ({
        ...c,
        designId: id,
        sizeCm: c.placement && c.placement.area !== 'custom' ? Math.min(design.suggestedCm, AREA_MAX_CM[c.placement.area]) : design.suggestedCm,
      }));
      setStatus(`${design.name} selected.`);
    };
    window.addEventListener(TRY_DESIGN_EVENT, onTry);
    return () => window.removeEventListener(TRY_DESIGN_EVENT, onTry);
  }, []);

  const selectedDesign = getDesign(concept.designId);
  const designName = concept.designId === 'custom' ? (concept.custom?.name ?? 'Your design') : (selectedDesign?.name ?? '');
  const designStyle = concept.designId === 'custom' ? 'Your upload' : (selectedDesign?.style ?? '');
  const skin = SKIN_TONES.find((t) => t.id === concept.skinTone) ?? SKIN_TONES[1];
  const placedArea = concept.placement ? AREA_LABELS[concept.placement.area] : null;

  const selectDesign = (id: string) => {
    const design = getDesign(id);
    if (!design) return;
    setConcept((c) => ({
      ...c,
      designId: id,
      sizeCm: c.placement && c.placement.area !== 'custom' ? Math.min(design.suggestedCm, AREA_MAX_CM[c.placement.area]) : design.suggestedCm,
    }));
    setStatus(`${design.name} selected.`);
  };

  const placeArea = (area: AreaId) => {
    const placement = api.current?.placeAtArea(area);
    if (!placement) {
      setStatus('The body is still loading. Try again in a moment.');
      return;
    }
    setConcept((c) => ({ ...c, placement, sizeCm: Math.min(c.sizeCm, AREA_MAX_CM[area]) }));
    setStatus(`Placed on the ${AREA_LABELS[area].toLowerCase()}.`);
  };

  const switchBody = (body: BodyId) => {
    if (body === concept.body) return;
    const area = concept.placement?.area;
    pendingArea.current = area && area !== 'custom' ? area : null;
    setConcept((c) => ({ ...c, body, placement: null }));
    setStatus(
      area === 'custom' ? `${BODY_LABELS[body]} selected. Tap the body to place the tattoo again.` : `${BODY_LABELS[body]} selected.`,
    );
  };

  const onPlace = useCallback(
    (placement: Placement) => {
      update({ placement });
      setStatus('Placed where you tapped.');
    },
    [update],
  );

  const nudge = (dx: number, dy: number) => {
    if (!concept.placement) return;
    // Move relative to the body (head = up), not the tattoo's own rotation.
    const next = api.current?.nudge(concept.placement, dx, dy, 0);
    if (next) update({ placement: next });
    else setStatus('The tattoo has reached the edge of this area.');
  };

  const processFile = async (file: File, removeBackground: boolean) => {
    setUploadError('');
    setUploadNote('');
    setBusy('upload');
    try {
      const art: CustomArtwork = await readArtwork(file, removeBackground);
      lastFile.current = file;
      const opaque = !removeBackground && (await isOpaque(art.dataUrl));
      if (opaque) {
        setUploadNote(
          'This image has a solid background, so it shows as a patch on the skin. A transparent PNG works best, or turn on light-background removal.',
        );
      }
      setConcept((c) => ({
        ...c,
        designId: 'custom',
        custom: art,
        placement: c.placement ?? api.current?.placeAtArea('forearm') ?? null,
      }));
      setStatus(`Your design “${art.name}” is ready.`);
    } catch (error) {
      setUploadError(error instanceof UploadError ? error.message : 'Something went wrong reading that image. Please try another file.');
    } finally {
      setBusy(null);
    }
  };

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void processFile(file, removeLight);
    if (fileInput.current) fileInput.current.value = '';
  };

  const toggleRemoveLight = (checked: boolean) => {
    setRemoveLight(checked);
    if (lastFile.current && concept.designId === 'custom') void processFile(lastFile.current, checked);
  };

  const reset = () => {
    setConcept((c) => ({ ...DEFAULT_CONCEPT, body: c.body, custom: c.custom, placement: api.current?.placeAtArea('chest', false) ?? null }));
    api.current?.setView('front');
    setStatus('Preview reset.');
  };

  const save = () => {
    const result = saveConcept(concept);
    if (result.ok) {
      setHasSaved(true);
      setStatus('Concept saved on this device.');
    } else {
      setStatus(
        result.reason === 'quota'
          ? 'Your uploaded image is too large to save on this device. Try a smaller file.'
          : 'Saving is blocked in this browser (private mode or storage disabled).',
      );
    }
  };

  const restore = () => {
    const saved = loadSavedConcept();
    if (!saved) {
      setHasSaved(false);
      setStatus('No saved concept was found on this device.');
      return;
    }
    const savedDesign = getDesign(saved.designId);
    if (savedDesign) setCategory(savedDesign.category);
    if (saved.body !== concept.body) {
      // The saved point belongs to the other body; it is re-found once that body has loaded.
      pendingArea.current = saved.placement && saved.placement.area !== 'custom' ? saved.placement.area : null;
      setConcept({ ...saved, placement: null });
    } else {
      setConcept(saved);
      if (saved.placement?.area && saved.placement.area !== 'custom') api.current?.placeAtArea(saved.placement.area);
    }
    setStatus('Saved concept restored.');
  };

  const bookingSummary = (): BookingConcept => {
    // Frame the tattoo so the snapshot shows it clearly (capture() finishes the camera move first).
    if (concept.placement) api.current?.frame(concept.placement);
    return summary();
  };

  const summary = (): BookingConcept => ({
    designName,
    placement: placedArea ?? '—',
    sizeCm: concept.sizeCm,
    rotation: concept.rotation,
    skinTone: skin.label,
    body: BODY_LABELS[concept.body],
    snapshot: api.current?.capture() ?? null,
  });

  const download = async (details: BookingConcept = summary()) => {
    if (!details.snapshot) {
      setStatus('The preview image could not be captured in this browser.');
      return;
    }
    setBusy('download');
    try {
      const blob = await composePreviewPng(details.snapshot, details);
      downloadBlob(blob, `linus-tats-concept-${new Date().toISOString().slice(0, 10)}.png`);
      setStatus('Concept image downloaded.');
    } catch {
      setStatus('The concept image could not be created. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const onViewerKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => api.current?.rotate(-20, 0),
      ArrowRight: () => api.current?.rotate(20, 0),
      ArrowUp: () => api.current?.rotate(0, -10),
      ArrowDown: () => api.current?.rotate(0, 10),
      '+': () => api.current?.zoom(0.8),
      '=': () => api.current?.zoom(0.8),
      '-': () => api.current?.zoom(1.25),
    };
    const action = keys[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  const retryModel = () => {
    useGLTF.clear(BODIES.man.url);
    useGLTF.clear(BODIES.woman.url);
    setReadyBody(null);
    pendingArea.current = concept.placement && concept.placement.area !== 'custom' ? concept.placement.area : 'chest';
    setViewerKey((k) => k + 1);
  };

  const hasTattoo = Boolean(concept.placement);
  const fill = (value: number, min: number, max: number) => ({ '--fill': `${((value - min) / (max - min)) * 100}%` }) as React.CSSProperties;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.22fr)_minmax(0,1fr)] lg:gap-12">
      {/* Viewer column */}
      <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <div
          className="viewer-stage relative aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-line sm:aspect-[5/6] lg:aspect-auto lg:h-[min(76vh,720px)]"
          tabIndex={0}
          role="application"
          aria-roledescription="3D tattoo preview"
          aria-label="3D body preview. Drag to rotate, pinch or scroll to zoom, tap the body to place the tattoo. With the keyboard, use arrow keys to rotate and plus or minus to zoom."
          onKeyDown={onViewerKey}
        >
          {webgl === 'ok' && (
            <ModelErrorBoundary onRetry={retryModel}>
              <Viewer
                key={viewerKey}
                apiRef={api}
                body={concept.body}
                skinColor={skin.color}
                tattoo={tattoo}
                placement={concept.placement}
                sizeCm={concept.sizeCm}
                rotation={concept.rotation}
                reducedMotion={reducedMotion}
                onPlace={onPlace}
                onReady={handleReady}
              />
              {!ready && <LoadingOverlay />}
            </ModelErrorBoundary>
          )}
          {webgl === 'unavailable' && (
            <div role="alert" className="absolute inset-0 grid place-items-center p-8 text-center">
              <div className="max-w-sm">
                <p className="font-display text-3xl text-bone">3D preview unavailable</p>
                <p className="mt-3 text-sm leading-relaxed text-mute">
                  Your browser or device has WebGL turned off, which the 3D body needs. Try a recent version of Chrome, Safari,
                  Firefox or Edge, or turn on hardware acceleration. You can still browse the collection below.
                </p>
              </div>
            </div>
          )}

          {webgl === 'ok' && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3 sm:p-4">
                <div className="segmented pointer-events-auto" role="group" aria-label="Camera view">
                  {(Object.keys(VIEW_LABELS) as CameraView[]).map((view) => (
                    <button key={view} type="button" onClick={() => api.current?.setView(view)} disabled={!ready}>
                      {VIEW_LABELS[view]}
                    </button>
                  ))}
                </div>
                <div className="segmented pointer-events-auto ml-auto" role="group" aria-label="Body">
                  {(Object.keys(BODY_LABELS) as BodyId[]).map((body) => (
                    <button key={body} type="button" aria-pressed={concept.body === body} onClick={() => switchBody(body)}>
                      {BODY_LABELS[body]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-4">
                <p className="label rounded-full bg-ink-950/70 px-3 py-2 backdrop-blur-sm">
                  {placedArea ? (
                    <span className="flex items-center gap-2 text-bone">
                      <span className="h-1.5 w-1.5 rounded-full bg-red" aria-hidden="true" />
                      Placed · {placedArea}
                    </span>
                  ) : (
                    'Pick a body part or tap the body'
                  )}
                </p>
                <div className="pointer-events-auto flex gap-2">
                  <button type="button" className="icon-btn" aria-label="Zoom out" title="Zoom out" onClick={() => api.current?.zoom(1.25)} disabled={!ready}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M3.5 8h9" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button type="button" className="icon-btn" aria-label="Zoom in" title="Zoom in" onClick={() => api.current?.zoom(0.8)} disabled={!ready}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M3.5 8h9M8 3.5v9" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button type="button" className="icon-btn" aria-label="Show the whole body" title="Show the whole body" onClick={() => api.current?.setView('front')} disabled={!ready}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Body part">
          {AREAS.map((area) => (
            <button key={area} type="button" className="pill" aria-pressed={concept.placement?.area === area} onClick={() => placeArea(area)} disabled={!ready}>
              {AREA_LABELS[area]}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-faint">
          A visual reference, not an exact measurement or a promise of how a tattoo will look on your skin. Your artist will
          talk sizing and placement through with you.
        </p>
      </div>

      {/* Controls column */}
      <div className="flex min-w-0 flex-col">
        <Step num="01" title="Design" first>
          <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Design style">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" className="chip-tab" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <div
            key={category}
            className="fade-in no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 pt-1 pr-10 [mask-image:linear-gradient(to_right,#000_calc(100%-48px),transparent)]"
            role="group"
            aria-label={`${CATEGORIES.find((c) => c.id === category)?.label} designs`}
          >
            {designs.filter((d) => d.category === category).map((d) => (
              <button key={d.id} type="button" className="tile" aria-pressed={concept.designId === d.id} aria-label={d.name} title={d.name} onClick={() => selectDesign(d.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={designDataUrl(d, INK)} alt="" />
              </button>
            ))}
            {concept.custom && (
              <button
                type="button"
                className="tile"
                aria-pressed={concept.designId === 'custom'}
                aria-label={`Your design: ${concept.custom.name}`}
                title={concept.custom.name}
                onClick={() => update({ designId: 'custom' })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={concept.custom.dataUrl} alt="" />
              </button>
            )}
            <button
              type="button"
              className="tile grid place-items-center !bg-transparent text-bone ring-1 ring-line-strong ring-inset"
              aria-label="Upload your own design"
              title="Upload your own design"
              onClick={() => fileInput.current?.click()}
              disabled={busy === 'upload'}
            >
              {busy === 'upload' ? (
                <span className="loader-ring !h-5 !w-5" aria-hidden="true" />
              ) : (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M11 4v14M4 11h14" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-4">
            <p className="font-display text-3xl font-semibold leading-tight tracking-tight text-bone">{designName}</p>
            <p className="label shrink-0">{designStyle}</p>
          </div>
          <button
            type="button"
            className="text-btn mt-1 !text-red-bright hover:!text-bone"
            aria-haspopup="dialog"
            onClick={() => openBooking(hasTattoo && ready ? bookingSummary() : undefined)}
          >
            Love it? Book an appointment →
          </button>

          <div
            className="mt-5 rounded-2xl border border-dashed border-line-strong px-4 py-3.5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFiles(e.dataTransfer.files);
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="label">Or upload your own</span>
              <button type="button" className="text-btn !text-bone underline-offset-4 hover:underline" onClick={() => fileInput.current?.click()} disabled={busy === 'upload'}>
                {busy === 'upload' ? 'Reading image…' : 'Choose image'}
              </button>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-mute">
              PNG, JPG or WebP up to 12 MB, or drop it here. Transparent PNGs work best. Your image stays on this device.
            </p>
            {concept.custom && (
              <label className="mt-3 flex items-start gap-2.5 text-xs text-bone-dim">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-red)]" checked={removeLight} onChange={(e) => toggleRemoveLight(e.target.checked)} />
                <span>
                  Remove light background <span className="text-mute">(optional, may soften pale details)</span>
                </span>
              </label>
            )}
            {uploadError && (
              <p role="alert" className="mt-3 text-sm text-red-bright">
                {uploadError}
              </p>
            )}
            {uploadNote && <p className="mt-3 text-xs leading-relaxed text-bone-dim">{uploadNote}</p>}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-label="Upload a PNG, JPG or WebP tattoo design"
            onChange={(e) => onFiles(e.target.files)}
          />
        </Step>

        <div className="grid gap-x-8 sm:grid-cols-2">
          <Step num="02" title="Scale" aside={`≈ ${concept.sizeCm} cm`}>
            <input
              type="range"
              className="range"
              aria-label="Scale, longest side in centimetres"
              min={SIZE_RANGE.min}
              max={SIZE_RANGE.max}
              step={SIZE_RANGE.step}
              value={concept.sizeCm}
              style={fill(concept.sizeCm, SIZE_RANGE.min, SIZE_RANGE.max)}
              disabled={!hasTattoo}
              onChange={(e) => update({ sizeCm: Number(e.target.value) })}
            />
          </Step>
          <Step num="03" title="Rotation" aside={`${concept.rotation}°`}>
            <input
              type="range"
              className="range"
              aria-label="Rotation in degrees"
              min={-180}
              max={180}
              step={1}
              value={concept.rotation}
              style={fill(concept.rotation, -180, 180)}
              disabled={!hasTattoo}
              onChange={(e) => update({ rotation: Number(e.target.value) })}
            />
          </Step>
        </div>

        <div className="grid gap-x-8 sm:grid-cols-[1fr_auto]">
          <Step num="04" title="Skin" aside={skin.label}>
            <div className="flex flex-wrap gap-3" role="group" aria-label="Skin tone">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  className="swatch"
                  style={{ backgroundColor: tone.color }}
                  aria-pressed={concept.skinTone === tone.id}
                  aria-label={tone.label}
                  title={tone.label}
                  onClick={() => update({ skinTone: tone.id })}
                />
              ))}
            </div>
          </Step>
          <Step num="05" title="Position">
            <div className="flex gap-1.5" role="group" aria-label="Move tattoo">
              <Nudge label="Move left" onClick={() => nudge(-1, 0)} disabled={!hasTattoo} d="M10 3.5 5.5 8l4.5 4.5" />
              <Nudge label="Move up" onClick={() => nudge(0, 1)} disabled={!hasTattoo} d="M3.5 10 8 5.5l4.5 4.5" />
              <Nudge label="Move down" onClick={() => nudge(0, -1)} disabled={!hasTattoo} d="M3.5 6 8 10.5 12.5 6" />
              <Nudge label="Move right" onClick={() => nudge(1, 0)} disabled={!hasTattoo} d="M6 3.5 10.5 8 6 12.5" />
            </div>
          </Step>
        </div>

        <div className="border-t border-line pt-6">
          <button
            type="button"
            className={`w-full ${hasTattoo ? 'btn-bone' : 'btn-line opacity-60'} !min-h-14`}
            disabled={!hasTattoo || !ready}
            onClick={() => openBooking(bookingSummary())}
          >
            {hasTattoo ? `Book an appointment · ${placedArea}` : 'Place the design to continue'}
          </button>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
            <button type="button" className="text-btn" onClick={() => void download()} disabled={!ready || busy === 'download'}>
              {busy === 'download' ? 'Preparing…' : 'Download image'}
            </button>
            <button type="button" className="text-btn" onClick={save}>
              Save
            </button>
            {hasSaved && (
              <button type="button" className="text-btn" onClick={restore} disabled={!ready}>
                Restore saved
              </button>
            )}
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                update({ placement: null });
                setStatus('Tattoo removed.');
              }}
              disabled={!hasTattoo}
            >
              Remove
            </button>
            <button type="button" className="text-btn" onClick={reset} disabled={!ready}>
              Reset
            </button>
          </div>
          <p className="mt-2 min-h-5 text-sm text-bone-dim" role="status" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({ num, title, aside, first, children }: { num: string; title: string; aside?: string; first?: boolean; children: ReactNode }) {
  return (
    <section className={first ? 'pb-6' : 'border-t border-line py-6'} aria-label={title}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="label">
          <span className="label-num">{num}</span> · {title}
        </h3>
        {aside && <span className="text-xs tabular-nums text-bone-dim">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Nudge({ label, d, onClick, disabled }: { label: string; d: string; onClick(): void; disabled?: boolean }) {
  return (
    <button type="button" className="icon-btn !bg-transparent" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  );
}
