# Lippan Studio

A fully client-side studio for Lippan (Kutchi mud-and-mirror) artists: photograph your unpainted
clay-relief board and your acrylic jars, then experiment with color schemes, ridge finishes and
mirror (aabhla) layouts — before committing real paint. No accounts, no backend, no API calls;
everything runs in your browser and autosaves locally.

## Run it

```bash
npm install
npm run gen:demo   # regenerates public/demo-relief.png + demo-palette.json (already committed)
npm run dev        # http://localhost:5173
```

Quality gates:

```bash
npm run typecheck  # TypeScript strict
npm run lint       # ESLint (no-explicit-any enforced)
npm test           # Vitest unit tests (flood fill, color math, k-means, RLE, history)
npm run e2e        # Playwright smoke (needs: npx playwright install chromium)
npm run build      # typecheck + static build into dist/
```

## Deploy to any static host

`npm run build` produces a self-contained `dist/` folder. Upload it to Netlify, GitHub Pages,
Cloudflare Pages, nginx — anything that serves static files. No server config is needed beyond
serving `index.html`; the app uses no routing and no external requests (fonts are bundled).

## 60-second walkthrough

1. **Try the demo** on the welcome screen (or drop in your own JPG — portrait phone photos are
   auto-rotated). Crop to the round board; nudge brightness/contrast if the photo is washed out.
2. Boundaries are detected automatically and shown as an orange overlay. Where the white-on-white
   clay fooled the detector, **seal gaps with the Boundary pen (B)** and erase noise with E. Tune
   the *Edge sensitivity* / *Boundary thickness* sliders and re-run if needed.
3. Open **Palette**, photograph your paint jars and tap each one (or load the *Fevicryl pastel 6*
   preset). Toggle **Only my paints** to keep every color honest.
4. Tap regions with **F** to paint them — clay texture stays visible through the paint (Strength
   slider). If paint floods the board, the leak guard reverts it and points you to the pen.
5. Pick a **ridge finish** (white, gold, copper…), then open **Mirrors** and *Add 12 mirrors on a
   ring*. Set your real board diameter so millimetres are true to scale.
6. Save **Variants**, compare them side by side or against the unpainted photo, preview on a wall,
   then **Export** PNGs and print the one-page **material list**.

Prefer instant gratification? Switch to **Templates** — six built-in mandalas with flawless
regions and radial-symmetry painting.

## Architecture notes

- Vite + React 18 + TypeScript strict + Tailwind (design tokens from `DESIGN.md` only — no default
  palette), Zustand for state.
- Photo rendering is four stacked canvases (base photo / paint / ridge tint / boundary overlay)
  plus an SVG overlay for mirrors. Templates are pure SVG.
- All heavy pixel work (Sobel boundary detection, scanline flood fill, luminance-preserving
  colorize, k-means palette extraction) runs in a **Web Worker** (`src/worker`), with a synchronous
  main-thread fallback when Workers are unavailable. Pixel buffers move as transferables.
- Undo/redo is a command pattern (`src/state/history.ts`, ≥50 steps) covering paint, boundary
  edits, ridge tint, mirror operations, variants and shuffle.
- Autosave: debounced (~1s) to `localStorage`; palettes persist independently of projects.
  Projects export/import as `.lippan.json` (downscaled base image as dataURL, boundary mask as
  RLE, fills re-run from recorded seeds on load).

## Assumptions made (autonomy log)

- **Worker transport over OffscreenCanvas**: pixel ops exchange transferable `ArrayBuffer`s with
  the worker, which is equivalent in performance to OffscreenCanvas for this workload and works in
  every modern browser; a main-thread fallback covers the rest.
- **Exports use the working image** (≤1800px, 1× or 2×), not the original photo resolution — the
  paint/boundary data lives in working coordinates and 3600px output is ample for sharing/printing.
- **Circle crop corners** are filled with the stage's mud-wall color so the round board sits
  seamlessly on the backdrop (and JPEG persistence stays small).
- **Mirror resize is always uniform** (mirrors are physical objects with one size); the Shift key
  is therefore not required for uniform scaling.
- **Radial arrays**: editing N/radius lives in the Mirrors tab with live sliders; member mirrors
  regenerate while the array is grouped, and *Explode* releases them to individual editing.
- **"Compare frame" export** uses unpainted vs. current (the before/after pair); two-variant
  comparison is available on screen in the Compare modal.
- **Demo palette** loads only when your palette is empty, so it never overwrites your paints.
- **HEIC** is rejected with guidance (browsers can't decode it without native help; converting to
  JPG is one tap on iOS share sheet).
- Region **lock** is per painted region (photo) / per template region, shown in the chip that
  appears when you click a region with the Select tool; Shuffle respects locks in both modes.

## Non-goals (by design)

Accounts, cloud sync, backends, AI/API calls, image generation, social features, native wrappers,
collaboration.
