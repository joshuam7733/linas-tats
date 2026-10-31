'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { instagramUrl, site, whatsappUrl } from '@/config/site';
import { composePreviewPng, downloadBlob } from '@/lib/exportPreview';
import { BOOK_EVENT, type BookingConcept } from './events';

const TIMES = ['Any time', 'Morning', 'Afternoon', 'Evening'];

const field =
  'mt-2 w-full rounded-2xl border border-line-strong bg-ink-950/60 px-4 py-3 text-[0.95rem] text-bone placeholder:text-faint transition-colors focus:border-bone focus:outline-none';

function formatDate(value: string) {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * "Book an appointment": a short form that opens WhatsApp with the request already written to the studio.
 * Nothing is sent by the site itself; the visitor reviews the message and taps send in WhatsApp.
 */
export default function BookingDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const ids = useId();
  const [concept, setConcept] = useState<BookingConcept | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState(TIMES[0]);
  const [idea, setIdea] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState('');
  const [sentUrl, setSentUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [today, setToday] = useState('');

  useEffect(() => {
    const onBook = (e: Event) => {
      setConcept((e as CustomEvent<BookingConcept | undefined>).detail ?? null);
      setSentUrl(null);
      setNameError('');
      const now = new Date();
      setToday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      if (!dialog.current?.open) dialog.current?.showModal();
      requestAnimationFrame(() => nameInput.current?.focus());
    };
    window.addEventListener(BOOK_EVENT, onBook);
    return () => window.removeEventListener(BOOK_EVENT, onBook);
  }, []);

  const close = () => dialog.current?.close();

  const conceptLine = concept
    ? `${concept.designName} on the ${concept.placement.toLowerCase()} (≈ ${concept.sizeCm} cm, ${concept.body.toLowerCase()} body, ${concept.skinTone.toLowerCase()} skin)`
    : '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Please add your name so the studio knows who is booking.');
      nameInput.current?.focus();
      return;
    }
    const lines = [
      `Hi ${site.name}! I'd like to book an appointment.`,
      `Name: ${name.trim()}`,
      date || time !== TIMES[0] ? `Preferred: ${[formatDate(date), time !== TIMES[0] ? time.toLowerCase() : ''].filter(Boolean).join(', ')}` : '',
      concept ? `Tattoo: ${conceptLine}` : idea.trim() ? `Idea: ${idea.trim()}` : '',
      notes.trim() ? `Notes: ${notes.trim()}` : '',
      concept ? "(I'll attach my concept image from your website.)" : '',
    ].filter(Boolean);
    const url = whatsappUrl(lines.join('\n'));
    if (!url) return;
    setSentUrl(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const download = async () => {
    if (!concept?.snapshot) return;
    setDownloading(true);
    try {
      const blob = await composePreviewPng(concept.snapshot, concept);
      downloadBlob(blob, `linus-tats-concept-${new Date().toISOString().slice(0, 10)}.png`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${ids}-title`}
      className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-bone backdrop:bg-ink-950/80 backdrop:backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="pointer-events-none flex min-h-full items-end justify-center sm:items-center sm:p-6">
        <div className="sheet-in pointer-events-auto relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-line bg-ink-900 sm:rounded-[28px]">
          <div className="relative isolate overflow-hidden px-6 pb-8 pt-8 sm:px-9 sm:pt-10">
            <div className="flash-wall opacity-60" aria-hidden="true" />
            <p className="label flex items-center gap-3">
              <span className="h-px w-8 bg-red" aria-hidden="true" />
              Book
            </p>
            <h2 id={`${ids}-title`} className="mt-3 pr-12 font-display text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl">
              Book an appointment
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-bone-dim">
              Fill this in and WhatsApp opens with your request ready to send to {site.contact.whatsapp?.display}. The studio
              confirms your slot there.
            </p>

            {concept && (
              <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-ink-950/60 p-3">
                {concept.snapshot && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={concept.snapshot} alt="" className="viewer-stage h-20 w-20 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="label !text-[0.625rem]">Your concept</p>
                  <p className="mt-1 truncate font-display text-lg font-semibold">{concept.designName}</p>
                  <p className="text-xs text-mute">
                    {concept.placement} · ≈ {concept.sizeCm} cm
                  </p>
                </div>
                {concept.snapshot && (
                  <button type="button" className="text-btn shrink-0 !text-bone underline-offset-4 hover:underline" onClick={() => void download()} disabled={downloading}>
                    {downloading ? 'Saving…' : 'Save image'}
                  </button>
                )}
              </div>
            )}

            {sentUrl ? (
              <div className="mt-8 rounded-2xl border border-line-strong p-6" role="status">
                <p className="font-display text-2xl font-semibold">Almost there.</p>
                <p className="mt-2 text-sm leading-relaxed text-bone-dim">
                  WhatsApp should have opened with your message. Check it and tap send.
                  {concept?.snapshot && ' Attach your saved concept image so the artist can see it.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href={sentUrl} target="_blank" rel="noreferrer" className="btn-red">
                    Open WhatsApp
                  </a>
                  <button type="button" className="btn-line" onClick={close}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form className="mt-7 grid gap-5" onSubmit={submit} noValidate>
                <div>
                  <label htmlFor={`${ids}-name`} className="label !text-bone-dim">
                    Your name
                  </label>
                  <input
                    ref={nameInput}
                    id={`${ids}-name`}
                    className={field}
                    value={name}
                    autoComplete="name"
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={nameError ? `${ids}-name-error` : undefined}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    onBlur={() => !name.trim() && name !== '' && setNameError('Please add your name.')}
                  />
                  {nameError && (
                    <p id={`${ids}-name-error`} className="mt-2 text-sm text-red-bright">
                      {nameError}
                    </p>
                  )}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${ids}-date`} className="label !text-bone-dim">
                      Preferred date <span className="normal-case tracking-normal text-faint">(optional)</span>
                    </label>
                    <input id={`${ids}-date`} type="date" min={today} className={`${field} [color-scheme:dark]`} value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor={`${ids}-time`} className="label !text-bone-dim">
                      Time of day
                    </label>
                    <select id={`${ids}-time`} className={`${field} [color-scheme:dark]`} value={time} onChange={(e) => setTime(e.target.value)}>
                      {TIMES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {!concept && (
                  <div>
                    <label htmlFor={`${ids}-idea`} className="label !text-bone-dim">
                      Your idea <span className="normal-case tracking-normal text-faint">(optional)</span>
                    </label>
                    <input
                      id={`${ids}-idea`}
                      className={field}
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="e.g. a small sigil on my forearm"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor={`${ids}-notes`} className="label !text-bone-dim">
                    Anything else <span className="normal-case tracking-normal text-faint">(optional)</span>
                  </label>
                  <textarea id={`${ids}-notes`} rows={2} className={`${field} resize-none`} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <button type="submit" className="btn-red !min-h-14 w-full">
                  Send request on WhatsApp
                </button>
                <p className="text-center text-xs text-mute">
                  Prefer to talk?{' '}
                  {site.contact.phones.map((phone, i) => (
                    <span key={phone.tel}>
                      {i > 0 && ' or '}
                      <a href={`tel:${phone.tel}`} className="text-bone underline-offset-4 hover:underline">
                        call {phone.display}
                      </a>
                    </span>
                  ))}
                  {instagramUrl && (
                    <>
                      {', or '}
                      <a href={instagramUrl} target="_blank" rel="noreferrer" className="text-bone underline-offset-4 hover:underline">
                        DM on Instagram
                      </a>
                    </>
                  )}
                  .
                </p>
              </form>
            )}
          </div>
          <button type="button" className="icon-btn absolute right-4 top-4" aria-label="Close" onClick={close}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>
      </div>
    </dialog>
  );
}
