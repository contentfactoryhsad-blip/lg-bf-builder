/**
 * Content Template Builder — asset + channel registry.
 *
 * Source art lives in `content template builder source/` (3000×3000 PNGs) and is
 * derived into `public/content-template/{thumb,preview}/` by
 * `npm run assets:content-template`. Ids here are the derived filenames minus
 * the extension, so adding art is: drop the file in, re-run the script, add a
 * row below.
 *
 * Groups mirror the Figma palette (`fUup3vSq71f6eUIRpmzz8s`, page
 * "Content Template Builder"): KEY VISUAL → DEAL TYPE → AD CREATIVE, then the
 * CHANNEL row beneath the divider.
 */

import { ASSET_STAMP } from './assetStamp';

export type AssetGroupKey = 'key-visual' | 'deal-type' | 'dynamic' | 'ad-creative' | 'shorts' | 'upload';

export const CUSTOM_ASSET_ID = 'custom-upload';

/**
 * The uploaded artwork, as an object URL. Module-level rather than React state
 * so the URL helpers below stay plain functions; the builder owns the lifecycle
 * (set on upload, revoke + clear on replace). 🔴 Returned raw — never append
 * the `?v=` stamp to it, blob URLs with query strings fail to fetch.
 */
let customArtUrl: string | null = null;
export const setCustomArt = (url: string | null) => { customArtUrl = url; };
export const hasCustomArt = () => customArtUrl !== null;


export interface ContentAsset {
  /** Stable key for selection. Unique across groups. */
  id: string;
  /** Palette caption. */
  label: string;
  group: AssetGroupKey;
  /**
   * Derived-file stem for the artwork, when it differs from `id` — Teasing
   * Content is an Ad Creative that reuses the Key Visual's still, so the two
   * entries share art while staying separately selectable.
   */
  src?: string;
  /** Derived stem of a motion file in `public/content-template/motion/`. */
  motion?: string;
  /**
   * Hidden in the Figma palette, so hidden here. Kept in the registry — with its
   * art, placements and slot boxes intact — because hiding is a presentation
   * decision the designer can reverse; deleting the rows would throw away the
   * per-size work behind them.
   */
  hidden?: boolean;
  /**
   * No artwork delivered yet. Figma draws these as flat black tiles, so the
   * palette does too — a placeholder that is honestly empty beats a stand-in
   * that could be mistaken for the real thing.
   */
  blank?: boolean;
  /**
   * Shorts type key (`a1`…). The asset is a finished vertical video, one file
   * per output size: `motion/shorts-{video}-{w}x{h}.mp4` — see `shortsVideoUrl`.
   */
  video?: string;
}

/**
 * One line of tiles under its own heading.
 *
 * The palette is not a uniform grid. Figma gives every row an explicit tile
 * width (`26:2` → "Assets — selection sources"): key visuals sit on 140×64
 * letterbox tiles two-up, deal types on 66×64 tiles four-up, and Ad Creative
 * mixes a 136-wide Teasing tile with two 66-wide ones. `tileW` is that Figma
 * width and drives the CSS grid directly, so a row's tiles keep their designed
 * shape instead of stretching to fill the rail.
 */
export interface AssetRow {
  key: string;
  /** Row heading, e.g. `KEY VISUAL_Main`. */
  label: string;
  /** Figma tile widths, in order. */
  tiles: { id: string; w: number }[];
  /** Figma tile height for this row. Shorts are portrait (81x124). */
  tileH?: number;
  /**
   * Figma clips the first tile of every Key Visual row to 64px, which cuts its
   * caption off — the row heading already names it ("KEY VISUAL_PD Centric" →
   * the first tile is PD Centric), and only the variant beside it needs a label.
   */
  captionFromIndex?: number;
}

/** Default tile height. Figma: 64, except the portrait Shorts row. */
export const TILE_H = 64;

export const ASSET_ROWS: AssetRow[] = [
  {
    key: 'kv-main',
    label: 'KEY VISUAL_Main',
    captionFromIndex: 1,
    tiles: [{ id: 'kv-main', w: 140 }, { id: 'kv-main-character', w: 140 }],
  },
  {
    key: 'kv-pd-centric',
    label: 'KEY VISUAL_PD Centric',
    captionFromIndex: 1,
    tiles: [{ id: 'kv-product-centric-1', w: 140 }, { id: 'kv-product-centric-2', w: 140 }],
  },
  {
    key: 'kv-pd-slot',
    label: 'KEY VISUAL_PD Slot',
    captionFromIndex: 1,
    tiles: [
      { id: 'kv-product-slot', w: 140 },
      { id: 'kv-product-slot-character', w: 140 },
      // hidden in Figma — see ContentAsset.hidden
      { id: 'kv-product-slot2', w: 66 },
      { id: 'kv-product-slot2-character', w: 66 },
    ],
  },
  {
    key: 'deal-type',
    label: 'DEAL TYPE',
    tiles: [
      { id: 'deal-type-bundle', w: 66 },
      { id: 'deal-type-time-sale', w: 66 },
      { id: 'deal-type-gift', w: 66 },
      { id: 'deal-type-hot-deal', w: 66 },
    ],
  },
  {
    // The motion piece stands alone — its row heading names it, so the tile
    // itself carries no caption, same as the Key Visual rows.
    key: 'dynamic',
    label: 'DYNAMIC',
    captionFromIndex: 1,
    tiles: [{ id: 'ad-teasing', w: 136 }],
  },
  {
    key: 'ad-creative',
    label: 'AD CREATIVE',
    tiles: [
      { id: 'ad-joy-ryder', w: 66 },
      { id: 'ad-benefit', w: 66 },
    ],
  },
  {
    key: 'shorts',
    label: 'SHORTS',
    tileH: 124,
    tiles: [
      { id: 'shorts-01', w: 81 },
      { id: 'shorts-02', w: 81 },
      { id: 'shorts-03', w: 81 },
    ],
  },
];

export const CONTENT_ASSETS: ContentAsset[] = [
  // KEY VISUAL — laid out by ASSET_GROUPS.rows, not as one grid
  { id: 'kv-main', label: 'Main', group: 'key-visual' },
  { id: 'kv-main-character', label: 'Joy & Ryder', group: 'key-visual' },
  { id: 'kv-product-centric-1', label: 'PD Centric', group: 'key-visual' },
  { id: 'kv-product-centric-2', label: 'Non AC', group: 'key-visual' },
  { id: 'kv-product-slot', label: 'PD Slot Ver.1', group: 'key-visual' },
  { id: 'kv-product-slot-character', label: 'Joy & Ryder', group: 'key-visual' },
  { id: 'kv-product-slot2', label: 'PD Slot Ver.2', group: 'key-visual', hidden: true },
  { id: 'kv-product-slot2-character', label: 'PD Slot Ver.2 (Character)', group: 'key-visual', hidden: true },

  // DEAL TYPE — 4-up
  { id: 'deal-type-bundle', label: 'Bundle', group: 'deal-type' },
  { id: 'deal-type-time-sale', label: 'Time Sale', group: 'deal-type' },
  { id: 'deal-type-gift', label: 'Gift', group: 'deal-type' },
  { id: 'deal-type-hot-deal', label: 'Hot Deal', group: 'deal-type' },

  // DYNAMIC — the motion piece (Main artwork + motion cut), its own group
  // since 2026-08-31 so it can ride alongside an ad-creative pick.
  { id: 'ad-teasing', label: 'Teasing Content', group: 'dynamic', src: 'kv-main', motion: 'kv-main-motion' },

  // AD CREATIVE — the `-2` source variants are held back until a concept calls
  // for them.
  { id: 'ad-joy-ryder', label: 'Joy & Ryder', group: 'ad-creative', src: 'ad-creative-a-1' },
  { id: 'ad-benefit', label: 'Benefit', group: 'ad-creative', src: 'ad-creative-b-1' },

  // SHORTS — vertical video cuts, one file per size (9:16 and 3:4). The videos
  // live in `content template builder source/shorts/` and are copied verbatim
  // into `public/content-template/motion/shorts-{type}-{size}.mp4`; the palette
  // thumbs are poster frames pulled from the 9:16 cut (ffmpeg → sharp).
  { id: 'shorts-01', label: 'LGNESS', group: 'shorts', video: 'a1' },
  { id: 'shorts-02', label: 'LGNESS PD', group: 'shorts', video: 'a2' },
  { id: 'shorts-03', label: 'CUBE', group: 'shorts', video: 'a3' },

  // UPLOAD — the operator's own 3000×3000 square, laid out with the Key Visual
  // _Main skeleton on every channel. The file itself lives in `customArtUrl`
  // below; until one is chosen the palette shows a dropzone, not this asset.
  { id: CUSTOM_ASSET_ID, label: 'Uploaded image', group: 'upload' },
];

/** Artwork stem for an asset — `src` when it borrows another asset's art. */
export const artOf = (a: ContentAsset) => a.src ?? a.id;

/**
 * Cache buster for the derived files.
 *
 * 🔴 Replacing the art in `content template builder source/` keeps every derived
 * filename identical, so a browser that has already loaded one keeps showing the
 * old picture — which reads as "the build didn't pick up my new image" when the
 * files on disk are in fact correct. `npm run assets:content-template` stamps
 * `manifest.json` with the newest source mtime; appending it here makes the URL
 * change whenever the art does, and stay stable in between.
 */
const V = `?v=${ASSET_STAMP}`;

export const thumbUrl = (a: ContentAsset) =>
  a.id === CUSTOM_ASSET_ID && customArtUrl ? customArtUrl : `/content-template/thumb/${artOf(a)}.webp${V}`;
export const previewUrl = (a: ContentAsset) =>
  a.id === CUSTOM_ASSET_ID && customArtUrl ? customArtUrl : `/content-template/preview/${artOf(a)}.webp${V}`;
/** The delivered frame, uncropped — what the edit panel shows. */
export const sourceUrl = (a: ContentAsset) =>
  a.id === CUSTOM_ASSET_ID && customArtUrl ? customArtUrl : `/content-template/source/${artOf(a)}.webp${V}`;
/**
 * Same frame at 3000px. Banner slots place it as large as 1809px, and the
 * Figma placements were judged against the 3000px original, so slots read this
 * one rather than the 800px `source` copy.
 */
export const fullUrl = (a: ContentAsset) =>
  a.id === CUSTOM_ASSET_ID && customArtUrl ? customArtUrl : `/content-template/full/${artOf(a)}.webp${V}`;
/**
 * Same, for a stem chosen per banner size — see `Placement.src`. A PD Slot tile
 * renders the row-of-four art at PC sizes and the 2x2 art at the rest, so the
 * slot, not the asset, decides which file to load.
 */
export const artUrl = (stem: string) =>
  stem === CUSTOM_ASSET_ID && customArtUrl ? customArtUrl : `/content-template/full/${stem}.webp${V}`;
export const motionUrl = (a: ContentAsset) =>
  a.motion ? `/content-template/motion/${a.motion}.mp4${V}` : null;
/** The finished Shorts cut for one output size (`1080x1920` / `1080x1440`). */
export const shortsVideoUrl = (a: ContentAsset, sizeKey: string) =>
  a.video ? `/content-template/motion/shorts-${a.video}-${sizeKey}.mp4${V}` : null;

export function assetsInGroup(group: AssetGroupKey): ContentAsset[] {
  return CONTENT_ASSETS.filter(a => a.group === group);
}

/** The rows as the palette should draw them — hidden tiles dropped. */
export const visibleRows = (): AssetRow[] =>
  ASSET_ROWS.map(r => ({ ...r, tiles: r.tiles.filter(tl => !getAsset(tl.id)?.hidden) }))
    .filter(r => r.tiles.length > 0);

export function getAsset(id: string | null): ContentAsset | undefined {
  return id ? CONTENT_ASSETS.find(a => a.id === id) : undefined;
}

/* ------------------------------------------------------------------ */
/* Channels                                                            */
/* ------------------------------------------------------------------ */

export interface ChannelSize {
  /** Slot code as it appears in the trafficking sheet, e.g. `ST0001`. */
  code?: string;
  width: number;
  height: number;
  /** Device the slot targets — shown next to the dimensions. */
  device?: 'PC' | 'MO';
}

export interface Channel {
  key: string;
  label: string;
  /** LG.com is owned inventory; the rest are bought. Rendered as separate rows. */
  kind: 'owned' | 'paid';
  sizes: ChannelSize[];
}

/**
 * LG.com sizes are read off the Memberdays reference screens. The paid-media
 * channels are placeholders until the real trafficking specs land — they are
 * marked in the UI so nobody exports against a guessed size.
 */
export const CHANNELS: Channel[] = [
  {
    key: 'lgcom',
    label: 'LG.com',
    kind: 'owned',
    sizes: [
      { code: 'ST0001', width: 1920, height: 720, device: 'PC' },
      { code: 'ST0001', width: 720, height: 960, device: 'MO' },
      { code: 'ST0044', width: 1600, height: 400, device: 'PC' },
      { code: 'ST0001', width: 720, height: 830, device: 'MO' },
    ],
  },
  { key: 'criteo', label: 'Criteo', kind: 'paid', sizes: [] },
  { key: 'dv360', label: 'DV360', kind: 'paid', sizes: [] },
  { key: 'pmax', label: 'Pmax', kind: 'paid', sizes: [] },
  { key: 'meta', label: 'Meta', kind: 'paid', sizes: [] },
];

/**
 * Shorts do not go to a channel — they go out at a fixed pair of sizes, so the
 * panel below the divider swaps from CHANNEL to SIZE (Figma: the same frame,
 * `Channel — output targets`, relabelled with two pills).
 */
export interface ShortsSize { key: string; label: string; width: number; height: number }

export const SHORTS_SIZES: ShortsSize[] = [
  { key: '1080x1920', label: '1080x1920 (9:16)', width: 1080, height: 1920 },
  { key: '1080x1440', label: '1080x1440 (3:4)', width: 1080, height: 1440 },
];

/** Which output picker this asset takes below the divider. */
export const outputKindOf = (a: ContentAsset | undefined) =>
  a && a.group === 'shorts' ? 'size' : 'channel';

export function getChannel(key: string): Channel {
  return CHANNELS.find(c => c.key === key) ?? CHANNELS[0];
}
