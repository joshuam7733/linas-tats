import BookButton from '@/components/booking/BookButton';
import BookingDialog from '@/components/booking/BookingDialog';
import CollectionGrid from '@/components/CollectionGrid';
import Reveal from '@/components/Reveal';
import ScrollFilm, { type FilmCaption } from '@/components/ScrollFilm';
import SiteHeader from '@/components/SiteHeader';
import StudioPhoto from '@/components/StudioPhoto';
import TattooPreview from '@/components/preview/TattooPreview';
import { instagramUrl, mapsUrl, site } from '@/config/site';
import { BONE, designDataUrl, getDesign } from '@/lib/designs';
import { filmManifest } from '@/lib/film';

const STEPS = [
  { title: 'Choose', text: 'Pick a design from the collection, or upload your own sketch or reference.' },
  { title: 'Place', text: 'Tap a body part or the body itself, then set the scale, angle and position.' },
  { title: 'Book', text: 'Download your concept and send it to the studio when you book your session.' },
];

/** Large line art used where a studio photo hasn't been added yet. */
function ArtFallback({ id, className = '', opacity = 0.14 }: { id: string; className?: string; opacity?: number }) {
  const design = getDesign(id)!;
  return (
    <div className={`grain absolute inset-0 overflow-hidden bg-ink-900 ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_40%,#24211e,transparent_75%)]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={designDataUrl(design, BONE)} alt="" className="drift absolute left-1/2 top-1/2 h-[78%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2" style={{ opacity }} />
    </div>
  );
}

export default function Home() {
  const { contact } = site;
  const film = filmManifest();

  const heroContent = (
    <div className="mx-auto w-full max-w-[1400px] px-5 pb-14 pt-32 sm:px-8 sm:pb-20 lg:px-12">
      <p className="label reveal flex items-center gap-3 !text-bone-dim">
        <span className="h-px w-8 bg-red" aria-hidden="true" />
        {site.fullName} · {site.location}
      </p>
      <h1 className="reveal mt-6 font-display text-[clamp(3.2rem,9vw,8rem)] font-medium leading-[0.92] tracking-[-0.03em] text-bone [animation-delay:80ms]">
        Your story.
        <br />
        <em className="font-normal text-bone/80">Before the ink.</em>
      </h1>
      <div className="reveal mt-8 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between [animation-delay:160ms]">
        <p className="max-w-sm text-lg leading-relaxed text-bone-dim">Explore your next tattoo. Find the placement that feels like you.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href="#try-on" className="btn-bone !min-h-14 !px-8">
            Try your tattoo
          </a>
          <BookButton className="btn-line !min-h-14 !px-8">Book an appointment</BookButton>
        </div>
      </div>
    </div>
  );

  const filmCaptions: FilmCaption[] = [
    { label: 'Acacia Plot 1 · Bukoto Street', title: 'Step inside.' },
    { label: 'The lounge', title: 'Pull up a seat.' },
    {
      label: 'The studio',
      title: 'This is where it happens.',
      action: <BookButton className="btn-bone !min-h-14 !px-8">Book an appointment</BookButton>,
    },
  ];

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero: the scroll-driven studio film, or the photo slot if the film frames are missing */}
        {film ? (
          <ScrollFilm manifest={film} captions={filmCaptions}>
            {heroContent}
          </ScrollFilm>
        ) : (
          <section id="top" className="relative flex min-h-[100svh] items-end overflow-hidden">
            <div className="absolute inset-0">
              <StudioPhoto
                slot="hero"
                alt={`Inside ${site.fullName}, ${site.location}`}
                sizes="100vw"
                priority
                hintClassName="left-5 top-20 sm:left-8 lg:left-12"
                fallback={<ArtFallback id="sigil" opacity={0.11} />}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,7,0.55)_0%,rgba(7,7,7,0.1)_35%,rgba(7,7,7,0.85)_100%)]" />
            </div>
            <div className="relative w-full">{heroContent}</div>
          </section>
        )}

        {/* Statement */}
        <section aria-label="Forever" className="relative flex h-[78svh] min-h-[480px] items-end justify-center overflow-hidden border-y border-line">
          <StudioPhoto slot="work" alt="A healed tattoo by LinusTats" sizes="100vw" fallback={<ArtFallback id="sun" opacity={0.2} />} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(7,7,7,0.85)_100%)]" />
          <Reveal className="relative pb-16 text-center">
            <p className="wordmark text-[clamp(1.6rem,4vw,2.6rem)] !tracking-[0.6em] text-bone">Forever</p>
            <p className="mt-4 text-sm text-bone-dim">Ink is permanent. Your preview doesn&rsquo;t have to be.</p>
          </Reveal>
        </section>

        {/* Style ticker */}
        <div className="overflow-hidden border-b border-line bg-ink-900 py-5" aria-hidden="true">
          <div className="marquee">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {['Realism', 'Tribal', 'Fine line', 'Cyber sigil', 'Traditional', 'Blackwork', 'Custom pieces', 'Bukoto · Kampala'].map((word) => (
                  <span key={word} className="flex items-center font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold uppercase tracking-tight text-bone/90">
                    <span className="px-6">{word}</span>
                    <span className="h-2.5 w-2.5 rotate-45 bg-red" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Try on */}
        <section id="try-on" aria-labelledby="try-on-title" className="relative isolate">
          <div className="flash-wall" aria-hidden="true" />
          <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
            <Reveal className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="label flex items-center gap-3">
                  <span className="h-px w-8 bg-red" aria-hidden="true" />
                  Try on
                </p>
                <h2 id="try-on-title" className="mt-4 font-display text-[clamp(2.8rem,7vw,5.5rem)] font-medium leading-[0.95] text-bone">
                  See it on the body
                </h2>
              </div>
              <p className="max-w-sm text-bone-dim">
                Choose a design, place it on the body and adjust it until it feels right. Everything happens in your browser.
              </p>
            </Reveal>
            <TattooPreview />
          </div>
        </section>

        {/* How it works */}
        <section aria-label="How the preview works" className="relative isolate border-y border-line bg-ink-900">
          <div className="flash-wall" style={{ backgroundPosition: '-300px -180px' }} aria-hidden="true" />
          <ol className="mx-auto grid max-w-[1400px] px-5 sm:px-8 md:grid-cols-3 lg:px-12">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-line py-10 md:border-l md:px-10 md:py-14 md:first:border-l-0 md:first:pl-0 [&:not(:first-child)]:border-t md:[&:not(:first-child)]:border-t-0">
                <Reveal delay={i * 90}>
                  <p className="label">
                    <span className="label-num">0{i + 1}</span> · {step.title}
                  </p>
                  <p className="mt-4 max-w-xs text-lg leading-relaxed text-bone-dim">{step.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* Collection */}
        <section id="collection" aria-labelledby="collection-title" className="relative isolate">
          <div className="flash-wall" style={{ backgroundPosition: '-420px -40px' }} aria-hidden="true" />
          <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
            <Reveal className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="label flex items-center gap-3">
                  <span className="h-px w-8 bg-red" aria-hidden="true" />
                  Collection
                </p>
                <h2 id="collection-title" className="mt-4 font-display text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[0.95] text-bone">
                  Flash to try on
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-mute">
                Sample designs in five styles to try on, not client work.{' '}
                {instagramUrl && (
                  <>
                    See the studio&rsquo;s real work on{' '}
                    <a href={instagramUrl} target="_blank" rel="noreferrer" className="text-bone underline underline-offset-4">
                      Instagram
                    </a>
                    .
                  </>
                )}
              </p>
            </Reveal>
            <CollectionGrid />
          </div>
        </section>

        {/* Studio */}
        <section id="studio" aria-labelledby="studio-title" className="relative isolate border-t border-line">
          <div className="flash-wall" style={{ backgroundPosition: '-120px -520px' }} aria-hidden="true" />
          <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-12">
            <Reveal>
              <p className="label flex items-center gap-3">
                <span className="h-px w-8 bg-red" aria-hidden="true" />
                The studio
              </p>
              <h2 id="studio-title" className="mt-4 font-display text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[0.95] text-bone">
                Bukoto Street, Kampala.
              </h2>
              <p className="mt-8 max-w-md text-lg leading-relaxed text-bone-dim">{site.intro}</p>
              <ul className="mt-10 max-w-md divide-y divide-line border-y border-line">
                {['Bold blackwork', 'Fine line', 'Black & grey realism', 'Tattoo parties & events'].map((item) => (
                  <li key={item} className="flex items-center justify-between py-4">
                    <span className="font-display text-2xl text-bone">{item}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-red" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120} className="grid grid-cols-2 gap-4">
              <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-[24px] border border-line">
                <StudioPhoto slot="studio1" alt={`Inside ${site.fullName}`} sizes="(min-width: 1024px) 55vw, 100vw" fallback={<ArtFallback id="halo" opacity={0.16} />} />
              </div>
              <div className="relative aspect-square overflow-hidden rounded-[24px] border border-line">
                <StudioPhoto slot="studio2" alt="An artist at work at LinusTats" sizes="(min-width: 1024px) 27vw, 50vw" fallback={<ArtFallback id="dagger" opacity={0.18} />} />
              </div>
              <div className="relative aspect-square overflow-hidden rounded-[24px] border border-line">
                <StudioPhoto slot="studio3" alt="A finished piece by LinusTats" sizes="(min-width: 1024px) 27vw, 50vw" fallback={<ArtFallback id="flames" opacity={0.18} />} />
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-x-3 bottom-3 rounded-full bg-ink-950/80 px-4 py-3 text-center backdrop-blur-sm transition-colors hover:bg-ink-950"
                    aria-label={`See the studio's work on Instagram, @${contact.instagram}`}
                  >
                    <span className="label !text-bone">Instagram ↗</span>
                  </a>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Classes */}
        <section id="classes" aria-labelledby="classes-title" className="relative isolate border-t border-line bg-ink-900">
          <div className="flash-wall" style={{ backgroundPosition: '-560px -300px' }} aria-hidden="true" />
          <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-20 sm:px-8 md:grid-cols-[1fr_auto] md:items-end md:py-24 lg:px-12">
            <Reveal>
              <p className="label flex items-center gap-3">
                <span className="h-px w-8 bg-red" aria-hidden="true" />
                Classes
              </p>
              <h2 id="classes-title" className="mt-4 font-display text-[clamp(2.4rem,5.5vw,4rem)] font-medium leading-[0.95] text-bone">
                Learn to tattoo.
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-bone-dim">Tattoo classes at the studio in Bukoto, at every level.</p>
              <ul className="mt-8 flex flex-wrap gap-2">
                {site.classes.levels.map((level) => (
                  <li key={level} className="pill pointer-events-none flex items-center">
                    {level}
                  </li>
                ))}
              </ul>
            </Reveal>
            {site.classes.phone && (
              <Reveal delay={100}>
                <a href={`tel:${site.classes.phone.tel}`} className="btn-bone !min-h-14 !px-8">
                  Ask about classes · {site.classes.phone.display}
                </a>
              </Reveal>
            )}
          </div>
        </section>

        {/* Book */}
        <section id="book" aria-labelledby="book-title" className="relative isolate border-t border-line">
          <div className="flash-wall" style={{ backgroundPosition: '-240px -640px' }} aria-hidden="true" />
          <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
            <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="label flex items-center gap-3">
                  <span className="h-px w-8 bg-red" aria-hidden="true" />
                  Book
                </p>
                <h2 id="book-title" className="mt-4 font-display text-[clamp(2.8rem,7vw,5.5rem)] font-medium leading-[0.95] text-bone">
                  Bring your concept in.
                </h2>
              </div>
              <div className="flex max-w-sm flex-col items-start gap-6">
                <p className="text-bone-dim">
                  Download your concept from the preview and send it with your message. It makes the first conversation easy.
                </p>
                <BookButton className="btn-red !min-h-14 !px-8">Book an appointment on WhatsApp</BookButton>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-px overflow-hidden rounded-[24px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {contact.phones.map((phone, i) => (
                <a key={phone.tel} href={`tel:${phone.tel}`} className="group bg-ink-950 p-7 transition-colors hover:bg-ink-850">
                  <p className="label">Call {contact.phones.length > 1 ? `· Line ${i + 1}` : ''}</p>
                  <p className="mt-6 font-display text-3xl text-bone">{phone.display}</p>
                  <p className="label mt-6 !text-bone-dim group-hover:!text-bone">Tap to call →</p>
                </a>
              ))}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noreferrer" className="group bg-ink-950 p-7 transition-colors hover:bg-ink-850">
                  <p className="label">Instagram</p>
                  <p className="mt-6 font-display text-3xl leading-tight text-bone">
                    @
                    {contact.instagram!.split('_').map((part, i, all) => (
                      <span key={i}>
                        {part}
                        {i < all.length - 1 && (
                          <>
                            _<wbr />
                          </>
                        )}
                      </span>
                    ))}
                  </p>
                  <p className="label mt-6 !text-bone-dim group-hover:!text-bone">Send a message →</p>
                </a>
              )}
              {contact.address && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="group bg-ink-950 p-7 transition-colors hover:bg-ink-850">
                  <p className="label">Visit</p>
                  <p className="mt-6 font-display text-3xl leading-tight text-bone">{contact.address}</p>
                  <p className="label mt-6 !text-bone-dim group-hover:!text-bone">Get directions →</p>
                </a>
              )}
            </div>
            {(contact.email || contact.hours || site.bookingUrl) && (
              <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4">
                {contact.hours && <p className="text-bone-dim">Hours · {contact.hours}</p>}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="text-bone underline-offset-4 hover:underline">
                    {contact.email}
                  </a>
                )}
                {site.bookingUrl && (
                  <a href={site.bookingUrl} target="_blank" rel="noreferrer" className="btn-red !min-h-14 !px-8">
                    Book online
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <BookingDialog />

      <footer className="border-t border-line bg-ink-900">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12">
          <div>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-badge.png" alt="" width={72} height={72} className="h-[72px] w-[72px]" />
              <p className="wordmark text-2xl text-bone">{site.name}</p>
            </div>
            <p className="mt-2 text-sm text-mute">
              {site.fullName} · {site.location}
            </p>
            <p className="mt-1 text-sm text-faint">© {new Date().getFullYear()} {site.name}</p>
          </div>
          <div className="max-w-xl space-y-1.5 text-xs leading-relaxed text-faint md:text-right">
            <p>3D bodies: CC0 MakeHuman/MPFB-derived base meshes published by Innerscene. Public domain.</p>
            <p>Collection designs are original sample artwork made for this site. The preview is a visual reference only.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
