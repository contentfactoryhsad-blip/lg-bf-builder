/**
 * Off-site Banner — shipped asset libraries.
 *
 * Backdrops, podiums and props come from the design team as fixed sets, so all
 * three are pick-from-library first and upload second. Adding an asset means
 * dropping the file into `public/off-site/{backgrounds,podiums,objects}/` and
 * adding a row here — nothing else.
 *
 * Files must live under `public/` (same-origin): html-to-image inlines every
 * image into the exported PNG, and a cross-origin URL without CORS fails that
 * step, silently leaving a hole in the export.
 *
 * A backdrop is ONE 1300² square scene serving both delivery sizes. Each size places
 * it at its own scale and offset and shows it through its blind — see
 * `OffSiteLayout.backdrop` / `.blind`.
 */

export interface LibraryAsset {
  id: string;
  label: string;
  src: string;
  /** Small stand-in for picker grids. Falls back to `src` when absent — only
   *  worth shipping for assets whose full file is measured in hundreds of KB. */
  thumb?: string;
}

const ASSET_ROOT = '/off-site/';
const BG = ASSET_ROOT + 'backgrounds/';
const PODIUM = ASSET_ROOT + 'podiums/';
const OBJECT = ASSET_ROOT + 'objects/';

/**
 * 1300×1300 scenes — the square places them at 1:1 bleeding 50 past every
 * edge; the wide takes a window of them at 0.696.
 *
 * Shipped as JPEG: the sources are opaque studio renders, so the alpha channel
 * a PNG pays for is dead weight — 140 KB against 1.2 MB, at ~47 dB PSNR.
 */
export const BACKGROUND_LIBRARY: LibraryAsset[] = [
  { id: 'bg-a', label: 'EI shape background A', src: BG + 'background-a.jpg', thumb: BG + 'background-a-thumb.jpg' },
  { id: 'bg-b', label: 'EI shape background B', src: BG + 'background-b.jpg', thumb: BG + 'background-b-thumb.jpg' },
  { id: 'bg-c', label: 'EI shape background C', src: BG + 'background-c.jpg', thumb: BG + 'background-c-thumb.jpg' },
  { id: 'bg-d', label: 'EI shape background D', src: BG + 'background-d.jpg', thumb: BG + 'background-d-thumb.jpg' },
];

export const PODIUM_LIBRARY: LibraryAsset[] = [
  { id: 'podium-a', label: 'Podium A', src: PODIUM + 'podium-a.png' },
  { id: 'podium-b', label: 'Podium B', src: PODIUM + 'podium-b.png' },
  { id: 'podium-c', label: 'Podium C', src: PODIUM + 'podium-c.png' },
  { id: 'podium-d', label: 'Podium D', src: PODIUM + 'podium-d.png' },
  { id: 'podium-e', label: 'Podium E', src: PODIUM + 'podium-e.png' },
  { id: 'podium-f', label: 'Podium F', src: PODIUM + 'podium-f.png' },
  { id: 'podium-g', label: 'Podium G', src: PODIUM + 'podium-g.png' },
];

/** Decorative props — the spheres and shapes the Figma frames set beside the
 *  podium. Placed like any other layer. */
export const OBJECT_LIBRARY: LibraryAsset[] = [
  { id: 'object-a', label: 'Object A', src: OBJECT + 'object-a.png' },
  { id: 'object-b', label: 'Object B', src: OBJECT + 'object-b.png' },
];

/**
 * Layered source for anyone building a backdrop of their own.
 *
 * Drop the file at `public/off-site/` under this name — Vite copies `public/`
 * into `dist/` verbatim and the Express server serves `dist/` statically, so
 * nothing else has to be registered. Note that a `.psd` here is committed to
 * the repo and shipped in the build, so keep it flattened to what the guide
 * actually needs.
 */
export const BACKDROP_PSD_GUIDE = ASSET_ROOT + 'off-site-banner-guide.psd';

export const DEFAULT_BACKGROUND = BACKGROUND_LIBRARY[0].src;
export const DEFAULT_PODIUM = PODIUM_LIBRARY[0].src;
