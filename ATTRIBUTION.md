# Asset attribution

## 3D bodies

Both bodies are public domain (CC0 1.0): free to use, modify and redistribute, including commercially, with no credit required. Credit is given here and in the site footer anyway.

**Man** (`public/models/man.glb`)
- **Asset:** "Human base mesh with editable 53-bone rig" by Innerscene: https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1
- **Origin:** built from MakeHuman/MPFB CC0 body, rig and skin assets.
- **Original file:** `assets/human-base-rigged.glb`.

**Woman** (`public/models/woman.glb`)
- **Asset:** Innerscene's "Female base mesh" (163-bone, MakeHuman-derived, CC0).
- **Source:** downloaded from the copy bundled in the MIT-licensed project https://github.com/AntiPhoton47/3D-Tattoo-Simulator (`assets/female-base-mesh-base_female.glb`), whose README states the bundled model remains CC0 1.0.
- **Original file:** `assets/female-base-mesh.glb`.

**Changes for the web:** rig and animation data removed, surfaces welded and meshopt-compressed by `scripts/optimize-model.mjs` (`npm run optimize-model`). The shorts and top are painted in a shader at runtime and are not part of the original models.

## Tattoo designs

The collection designs are samples, not client work.

- **Studio designs:** the 19 designs in `assets/designs/` (Lion, Roaring lion, Ace of spades, Lady Liberty, Angel & demon, Balance, Winged heart, Moon butterfly, Sun, moon & lily, Lotus unalome, Capricorn, Hourglass, Thorn cross, Symbiote, Crowned clown, Money rose, Tiger eye, Lion linework, Yin-yang tree) were supplied by the studio owner. Before publishing, confirm the studio has the right to show each one. "Symbiote" closely resembles Marvel's Venom character.
- **Original SVG designs:** the remaining designs and the flash-wall background motifs were drawn for this project in `src/lib/designs.ts` and `src/lib/flashWall.ts`.
- **3D viewer's sketch-wall backdrop:** made from public-domain (CC0) works in the Art Institute of Chicago's open-access collection. The source scans are in `assets/art/`:
  - Eugène Delacroix, *Royal Tiger* (*Tigre royal*), 1829, lithograph (AIC 41095).
  - Raphael, *Upraised Right Hand, with Palm Facing Outward*, chalk (AIC 114932).
  - *Six Sketches of Wolf Heads*, unknown artist, graphite (AIC 85824).
  - Eugène Delacroix, *Tiger Ready to Spring*, etching (AIC 92343).
  - Eugène Delacroix, *Sheet of Sketches*, lithograph (AIC 14446).

## Logo

The LinusTats Tattoo Studio badge (`assets/brand/linustats-logo.jpg`) was supplied by the studio. `npm run art` produces the light-on-dark version (`public/brand/logo-badge.png`) and the app icon (`src/app/icon.png`).

## Studio film

The scroll film frames in `public/film/` are made from the studio's own Google Flow clips (`assets/film/`), supplied by the owner.

## Studio details

The name, address, phone numbers and Instagram handle come from the studio's public Instagram profile (@linustats_tattoo_studio). The owner approved them for the site.

## Fonts

Cormorant Garamond and Manrope, both under the SIL Open Font License, served through `next/font/google` (self-hosted at build time).

## Libraries

Next.js, React, Three.js, React Three Fiber, Drei and Tailwind CSS. All are MIT licensed.
