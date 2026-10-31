# Linus Tats

Website for LinusTats Tattoo Studio (Bukoto, Kampala), built around a 3D try-on: pick a design, place it on a woman or man body, adjust it, and send the concept to the studio.

Built with Next.js (App Router), TypeScript, Tailwind CSS v4, Three.js, React Three Fiber and Drei.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Production build:

```bash
npm run build
npm start
```

## Add the studio's photos

The hero, the "Forever" section and the studio grid have photo slots. Until a photo is added, each slot shows a designed line-art fallback, and in development it also shows a small red label naming the file to add. Put photos in `public/studio/` with these names (`.jpg`, `.jpeg`, `.png` or `.webp`), then rebuild:

| File | Where it shows | Suggested shot |
| --- | --- | --- |
| `hero.jpg` | Full-screen opening | The studio front or interior, landscape |
| `work.jpg` | "Forever" section | A close-up of a healed tattoo |
| `studio-1.jpg` | Studio section, wide | Inside the studio |
| `studio-2.jpg` | Studio section, square | An artist at work |
| `studio-3.jpg` | Studio section, square | A finished piece |

Use your own photos (for example the originals behind your Instagram posts). Large photos are resized automatically.

## Studio film (scroll walk-through)

The top of the homepage is a scroll-driven film: the screen pins and scrolling walks the camera from Bukoto Street into the lounge and the workspace. Scroll back and it walks back out. The source is three Google Flow clips in `assets/film/` (exterior → lounge → workspace), joined with a dissolve so they read as one move.

Scroll-scrubbing an MP4 directly stutters in most browsers, so the film is turned into still frames in `public/film/`:

- `desktop/`: 196 frames, 1280×720 WebP, about 14 MB in total.
- `mobile/`: 196 frames, a 540×960 portrait crop, about 6.5 MB in total.

Frames load coarse-to-fine: every 8th frame first (about 1.8 MB on desktop, 0.8 MB on phones), so scrolling works almost at once and the rest fills in. Data Saver loads a third of the frames. Reduced-motion visitors see the opening still instead.

To rebuild the frames (for example after making a true one-shot in Google Flow):

1. Put the clip(s) in `assets/film/` and list them, in order, in `CLIPS` in `scripts/film/extract-film.mjs`.
2. Run `npm run film` and open http://localhost:4570 in Chrome. It writes the frames and `public/film/manifest.json`, then shows "Done".
3. The captions ("Step inside.", "Pull up a seat.", "This is where it happens.") are in `src/app/page.tsx` (`filmCaptions`), one per clip.

If `public/film/` is missing, the hero falls back to its photo slot.

## Designs, art and logo

The collection and the try-on group the designs into five styles: Realism, Tribal, Fine line, Cyber sigil and Blackwork. They're defined in `src/lib/designs.ts`, with the studio's own designs listed first in each style.

- **Studio designs** (19) are the studio's design sheets in `assets/designs/`. They're converted to ink on a transparent background in `public/art/tattoos/`: black and grey become ink, white becomes skin, and colour (the red heart, the tiger's eye) stays colour.
- **Drawn designs** are SVG drawn in code (sigils, tribal, fine line, dagger, swallow and others).

`npm run art` (then open http://localhost:4571) rebuilds the art from `assets/`:

- the studio designs, plus `public/art/tattoos/manifest.json` with their sizes;
- the 3D viewer's sketch-wall backdrop (`public/art/viewer-backdrop.webp`);
- the logo files (`public/brand/logo-badge.png`, `src/app/icon.png`).

To add a studio design:

1. Save it as `assets/designs/<id>.jpg`, on a white or light background.
2. Add its id to `DESIGNS` in `scripts/art/process-art.html` and re-run the tool.
3. Add a line to `STUDIO` in `src/lib/designs.ts` with its name, style label, category and suggested size.

## Booking

"Book an appointment" opens a short form (name, preferred date and time, idea, notes). Submitting it opens WhatsApp with the request already written to the studio's number (`NEXT_PUBLIC_WHATSAPP`, default 0755 817178). The visitor checks the message and taps send. When the booking comes from the try-on, the design, placement and size are included, and the visitor can save the concept image to attach. Nothing is sent by the site itself.

The form opens from the header's "Book now", the hero, the end of the studio film, the try-on ("Love it? Book an appointment" and the main button) and the Book section.

## Studio details

The name, address, phones and Instagram handle live in `src/config/site.ts`. They come from the studio's Instagram profile. To override them, or to add an email, opening hours or an online booking page, copy `.env.example` to `.env.local`:

| Variable | Shows |
| --- | --- |
| `NEXT_PUBLIC_CONTACT_PHONES` | Phone numbers, comma-separated |
| `NEXT_PUBLIC_WHATSAPP` | Number that receives booking requests on WhatsApp |
| `NEXT_PUBLIC_INSTAGRAM` | Instagram handle |
| `NEXT_PUBLIC_STUDIO_ADDRESS` | Address (also used for the directions link) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Email link |
| `NEXT_PUBLIC_STUDIO_HOURS` | Opening hours |
| `NEXT_PUBLIC_BOOKING_URL` | "Continue to booking" / "Book online" buttons |

Restart the dev server after changing `.env.local`.

## Project layout

- `src/app/page.tsx`: page sections (hero, statement, try-on, how it works, collection, studio, classes, book).
- `src/components/preview/TattooPreview.tsx`: try-on controls, state, upload, save and download.
- `src/components/preview/Viewer.tsx`: 3D scene, camera controls, bodies, clothing and tattoo rendering.
- `src/components/preview/bodies.ts`: per-body placement rays, camera views and clothing lines.
- `src/components/preview/BookingSheet.tsx`: the "Book this design" sheet.
- `src/lib/surface.ts`: surface-following tattoo projection.
- `src/lib/designs.ts`: the original collection designs (SVG).
- `src/config/site.ts`: studio details.
- `public/models/`: optimized bodies. Rebuild them from `assets/` with `npm run optimize-model`.

## How the tattoo projection works

When a tattoo is placed, the app gathers the nearby skin triangles that face the same way and projects the artwork onto them with Three.js `DecalGeometry`, so it wraps around curved skin. Only outward-facing skin within a shallow depth is used, so the design never shows through on the far side of a limb. Ink fades where the skin turns away (instead of smearing) and wherever the shorts or top cover the skin. Replaced decal geometry and textures are disposed.

## Assets

See [ATTRIBUTION.md](ATTRIBUTION.md).
