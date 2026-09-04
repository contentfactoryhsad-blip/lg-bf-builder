/**
 * LG.com banner slots — the six dark-mode sizes, transcribed from Figma.
 *
 * Source: `miJcDQgz0yJMskLE5a5HHj`, page "Banner Template",
 * section `Black Friday_LG.com › Dark mode › LG.com` (`4071:3410`).
 *
 * Each slot is the same three-layer stack the Figma frame uses:
 *
 *   1. black frame background            (every frame is #000000, clipped)
 *   2. the KV artwork                    (`art`, absolute px inside the frame)
 *   3. an optional left-edge scrim        (`GRAD`, per asset, black → clear)
 *   4. the layout copy + CTA             (`text`, `cta`)
 *
 * The layout components carry no background of their own — they are transparent
 * overlays — so the copy is rebuilt here rather than exported as flat art. That
 * also keeps it editable, which is where this is heading.
 *
 * Figma's hidden `Guide` and `Icon Row` layers are deliberately not represented.
 *
 * 🔴 Art placement is **per asset per size** and hand-placed in Figma — the 15
 * key visuals are framed differently enough that one placement per size does not
 * suit them all. `ART` below is that 15 × 6 table, read straight off the boards
 * `LG.com — {asset}` on the Banner Template page. It is not derivable: re-read it
 * from Figma rather than guessing when the design moves.
 */

export type Device = 'PC' | 'MO';

export type SlotId =
  | 'ST0001-pc-1920x720'
  | 'ST0001-pc-1600x400'
  | 'ST0001-mo-720x960'
  | 'ST0001-mo-720x830'
  | 'ST0044-mo-656x436'
  | 'ST0044-pc-342x228';


export interface SlotText {
  role: 'eyebrow' | 'headline' | 'subcopy' | 'disclaimer';
  /** Frame-space box, in the slot's own pixels. */
  x: number;
  y: number;
  w: number;
  /** Figma line-height, as a percentage of font size. */
  size: number;
  lineHeightPct: number;
  /** Letter-spacing as a percentage of font size, as Figma reports it. */
  trackingPct: number;
  /**
   * Cap on rendered lines for a growing (bottom-anchored) text — lines beyond
   * it clip. The two ST0001 hero disclaimers carry one (2).
   */
  maxLines?: number;
  weight: 400 | 600;
  /**
   * Fixed box height, when Figma gave the node one. The disclaimer sits in such
   * a box and is bottom-aligned inside it — anchoring it to the box top instead
   * lifts it ~15px on PC and ~16px on mobile.
   */
  h?: number;
  vAlign?: 'top' | 'bottom';
  /** Headline uses LG EI Headline on ST0001; ST0044 uses the text face. */
  face: 'headline' | 'text';
  align: 'left' | 'center';
  text: string;
}

export interface LgcomSlot {
  id: SlotId;
  /** Slot code as it appears in the trafficking sheet. */
  code: 'ST0001' | 'ST0044';
  device: Device;
  w: number;
  h: number;
  /**
   * The hero placement. When the chosen asset ships a motion file, this slot
   * plays it instead of the still. The two ST0001 hero sizes carry it; the other
   * four stay on the still so six 10 MB videos never decode at once.
   */
  hero?: boolean;
  /**
   * The two hero sizes carry two extra layers on the Figma board that the other
   * four do not: a full-bleed indicator artwork and a row of benefit icons.
   * Both are optional in output — a slot can be shipped as background only —
   * so the edit panel toggles them.
   */
  indicator?: string;
  iconRow?: { x: number; y: number; w: number; h: number };
  text: SlotText[];
  cta: { x: number; y: number; w: number; h: number; radius: number; size: number; label: string };
}

const CTA_RED = '#FD312E';
export const SLOT_BG = '#000000';
export const CTA_COLOR = CTA_RED;


export const LGCOM_SLOTS: LgcomSlot[] = [  {
    id: 'ST0001-pc-1920x720',
    indicator: 'indicator-pc',
    iconRow: { x: 240, y: 486, w: 424, h: 60 },
    code: 'ST0001',
    device: 'PC',
    w: 1920,
    h: 720,
    hero: true,
    text: [
      { role: 'eyebrow',    x: 240, y: 72,  w: 542, size: 20, lineHeightPct: 110, trackingPct: 2, weight: 400, face: 'text',     align: 'left', text: 'Lorem ipsumdolor sit amet' },
      { role: 'headline',   x: 240, y: 94,  w: 542, h: 124, size: 56, lineHeightPct: 110, trackingPct: 2, weight: 600, face: 'headline', align: 'left', text: 'Lorem ipsum dolor sit\nametap consectetur' },
      { role: 'subcopy',    x: 240, y: 228, w: 542, h: 18,  size: 16, lineHeightPct: 110, trackingPct: 2, weight: 400, face: 'text',     align: 'left', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { role: 'disclaimer', x: 240, y: 658, w: 1147, h: 30, maxLines: 2, vAlign: 'bottom', size: 14, lineHeightPct: 110, trackingPct: 0, weight: 400, face: 'text',     align: 'left', text: '*T&C’s apply' },
    ],
    cta: { x: 240, y: 275, w: 110.6, h: 44, radius: 9.03, size: 16.93, label: 'Shop now' },
  },  {
    id: 'ST0001-mo-720x960',
    indicator: 'indicator-mo',
    iconRow: { x: 34, y: 762, w: 510, h: 72 },
    code: 'ST0001',
    device: 'MO',
    w: 720,
    h: 960,
    hero: true,
    text: [
      { role: 'eyebrow',    x: 32, y: 50,  w: 656, size: 32,   lineHeightPct: 110, trackingPct: 0, weight: 400, face: 'text',     align: 'left', text: 'Lorem ipsumdolor sit amet' },
      { role: 'headline',   x: 32, y: 101, w: 656, h: 124, size: 56.04, lineHeightPct: 110, trackingPct: 0, weight: 600, face: 'headline', align: 'left', text: 'Lorem ipsum dolor sit ametap consectetur' },
      { role: 'subcopy',    x: 32, y: 241, w: 656, h: 70,  size: 32.02, lineHeightPct: 110, trackingPct: 0, weight: 400, face: 'text',     align: 'left', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { role: 'disclaimer', x: 32, y: 884, w: 656, h: 44, vAlign: 'bottom', maxLines: 2, size: 18, lineHeightPct: 156, trackingPct: 0, weight: 400, face: 'text',     align: 'left', text: '*T&C’s apply' },
    ],
    cta: { x: 32, y: 339, w: 181.7, h: 72.2, radius: 14.81, size: 27.77, label: 'Shop now' },
  },  {
    id: 'ST0001-pc-1600x400',
    code: 'ST0001',
    device: 'PC',
    w: 1600,
    h: 400,
    text: [
      { role: 'eyebrow',    x: 80, y: 48,  w: 542, size: 20, lineHeightPct: 110, trackingPct: 2, weight: 400, face: 'text',     align: 'left', text: 'Lorem ipsumdolor sit amet' },
      { role: 'headline',   x: 80, y: 70,  w: 542, h: 124, size: 56, lineHeightPct: 110, trackingPct: 2, weight: 600, face: 'headline', align: 'left', text: 'Lorem ipsum dolor sit\nametap consectetur' },
      { role: 'subcopy',    x: 80, y: 196, w: 542, h: 18,  size: 16, lineHeightPct: 110, trackingPct: 2, weight: 400, face: 'text',     align: 'left', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { role: 'disclaimer', x: 80, y: 322, w: 820, h: 30, vAlign: 'bottom', size: 14, lineHeightPct: 110, trackingPct: 0, weight: 400, face: 'text',     align: 'left', text: '*T&C’s apply' },
    ],
    cta: { x: 80, y: 238, w: 110.6, h: 44, radius: 9.03, size: 16.93, label: 'Shop now' },
  },  {
    id: 'ST0001-mo-720x830',
    code: 'ST0001',
    device: 'MO',
    w: 720,
    h: 830,
    text: [
      { role: 'eyebrow',    x: 32, y: 50,  w: 656, size: 32,    lineHeightPct: 110, trackingPct: 0, weight: 400, face: 'text',     align: 'left', text: 'Lorem ipsumdolor sit amet' },
      { role: 'headline',   x: 32, y: 101, w: 656, h: 124, size: 56.04, lineHeightPct: 110, trackingPct: 0, weight: 600, face: 'headline', align: 'left', text: 'Lorem ipsum dolor sit ametap consectetur' },
      { role: 'subcopy',    x: 32, y: 241, w: 656, h: 70,  size: 32.02, lineHeightPct: 110, trackingPct: 0, weight: 400, face: 'text',     align: 'left', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { role: 'disclaimer', x: 32, y: 754, w: 656, h: 44, vAlign: 'bottom', size: 24.02, lineHeightPct: 117, trackingPct: 0, weight: 400, face: 'text',     align: 'left', text: '*T&C’s apply' },
    ],
    cta: { x: 32, y: 339, w: 181.7, h: 72.2, radius: 14.81, size: 27.77, label: 'Shop now' },
  },  {
    id: 'ST0044-mo-656x436',
    code: 'ST0044',
    device: 'MO',
    w: 656,
    h: 436,
    text: [
      { role: 'headline', x: 32, y: 236, w: 592, h: 80, vAlign: 'bottom', size: 36, lineHeightPct: 110, trackingPct: 0, weight: 600, face: 'text', align: 'center', text: 'Lorem ipsum dolor sit ametap consectetur' },
    ],
    cta: { x: 238, y: 337, w: 180, h: 72, radius: 14.81, size: 27.77, label: 'Shop now' },
  },  {
    id: 'ST0044-pc-342x228',
    code: 'ST0044',
    device: 'PC',
    w: 342,
    h: 228,
    text: [
      { role: 'headline', x: 32, y: 104, w: 278, h: 52, vAlign: 'bottom', size: 24, lineHeightPct: 110, trackingPct: 0, weight: 600, face: 'text', align: 'center', text: 'Lorem ipsum dolor sit ametap consectetur' },
    ],
    cta: { x: 126, y: 172, w: 90.6, h: 36, radius: 7.38, size: 13.85, label: 'Shop now' },
  },
];

/** Dimensions and device only — the ST00xx trafficking code is not shown here. */
/** Placement of the artwork square inside each frame: `[x, y, size]`. */
export interface Placement {
  x: number;
  y: number;
  size: number;
  /**
   * Artwork stem for this size, when it is not the asset's own.
   *
   * 🔴 One palette tile can hide two artworks. The Figma board for PD Slot
   * carries two master components: the wide PC sizes use the art with a row of
   * four plates, and the four mobile/small sizes use the 2x2 art — that is the
   * whole reason the board has two masters rather than one. So the art source
   * is a property of the *size*, not only of the asset.
   */
  src?: string;
}

/**
 * Asset id → slot id → placement, transcribed from the Figma boards.
 * Assets sharing artwork (Teasing Content reuses Main's still) still get
 * their own row, because their boards are tuned independently.
 */
const ART: Record<string, Partial<Record<SlotId, Placement>>> = {
  'kv-main':                   { 'ST0001-pc-1920x720': { x: 385, y: -631, size: 1961 }, 'ST0001-pc-1600x400': { x: 524, y: -448, size: 1296 }, 'ST0001-mo-720x960': { x: -355, y: -131, size: 1431 }, 'ST0001-mo-720x830': { x: -289, y: -68, size: 1298 }, 'ST0044-mo-656x436': { x: -29, y: -234, size: 714 }, 'ST0044-pc-342x228': { x: -9, y: -121, size: 360 } },
  'kv-main-character':         { 'ST0001-pc-1920x720': { x: 385, y: -631, size: 1961 }, 'ST0001-pc-1600x400': { x: 524, y: -448, size: 1296 }, 'ST0001-mo-720x960': { x: -355, y: -131, size: 1431 }, 'ST0001-mo-720x830': { x: -289, y: -68, size: 1298 }, 'ST0044-mo-656x436': { x: -29, y: -234, size: 714 }, 'ST0044-pc-342x228': { x: -9, y: -121, size: 360 } },
  'kv-product-centric-1':      { 'ST0001-pc-1920x720': { x: 385, y: -631, size: 1961 }, 'ST0001-pc-1600x400': { x: 524, y: -448, size: 1296 }, 'ST0001-mo-720x960': { x: -342, y: -119, size: 1405 }, 'ST0001-mo-720x830': { x: -289, y: -68, size: 1298 }, 'ST0044-mo-656x436': { x: -29, y: -234, size: 714 }, 'ST0044-pc-342x228': { x: -9, y: -121, size: 360 } },
  'kv-product-centric-2':      { 'ST0001-pc-1920x720': { x: 385, y: -631, size: 1961 }, 'ST0001-pc-1600x400': { x: 524, y: -448, size: 1296 }, 'ST0001-mo-720x960': { x: -342, y: -119, size: 1405 }, 'ST0001-mo-720x830': { x: -289, y: -68, size: 1298 }, 'ST0044-mo-656x436': { x: -29, y: -234, size: 714 }, 'ST0044-pc-342x228': { x: -9, y: -121, size: 360 } },
  'kv-product-slot':           { 'ST0001-pc-1920x720': { x: 411, y: -594, size: 1873, src: 'kv-product-slot-clean' }, 'ST0001-pc-1600x400': { x: 644, y: -349, size: 1092, src: 'kv-product-slot-clean' }, 'ST0001-mo-720x960': { x: -344, y: -67, size: 1409 , src: 'kv-product-slot2-clean' }, 'ST0001-mo-720x830': { x: -295, y: -50, size: 1315 , src: 'kv-product-slot2-clean' }, 'ST0044-mo-656x436': { x: -59, y: -266, size: 786 , src: 'kv-product-slot2-clean' }, 'ST0044-pc-342x228': { x: -7, y: -124, size: 365 , src: 'kv-product-slot2-clean' } },
  'kv-product-slot-character': { 'ST0001-pc-1920x720': { x: 411, y: -594, size: 1873, src: 'kv-product-slot-character-clean' }, 'ST0001-pc-1600x400': { x: 644, y: -349, size: 1092, src: 'kv-product-slot-character-clean' }, 'ST0001-mo-720x960': { x: -344, y: -67, size: 1409 , src: 'kv-product-slot2-character-clean' }, 'ST0001-mo-720x830': { x: -295, y: -50, size: 1315 , src: 'kv-product-slot2-character-clean' }, 'ST0044-mo-656x436': { x: -59, y: -266, size: 786 , src: 'kv-product-slot2-character-clean' }, 'ST0044-pc-342x228': { x: -7, y: -124, size: 365 , src: 'kv-product-slot2-character-clean' } },
  'kv-product-slot2':          { 'ST0001-pc-1920x720': { x: 300, y: -673, size: 2075 }, 'ST0001-pc-1600x400': { x: 495, y: -441, size: 1298 }, 'ST0001-mo-720x960': { x: -342, y: -45, size: 1396 }, 'ST0001-mo-720x830': { x: -291, y: -51, size: 1296 }, 'ST0044-mo-656x436': { x: -90, y: -284, size: 836 }, 'ST0044-pc-342x228': { x: -18, y: -128, size: 378 } },
  'kv-product-slot2-character': { 'ST0001-pc-1920x720': { x: 300, y: -673, size: 2075 }, 'ST0001-pc-1600x400': { x: 495, y: -441, size: 1298 }, 'ST0001-mo-720x960': { x: -342, y: -45, size: 1396 }, 'ST0001-mo-720x830': { x: -291, y: -51, size: 1296 }, 'ST0044-mo-656x436': { x: -90, y: -284, size: 836 }, 'ST0044-pc-342x228': { x: -18, y: -128, size: 378 } },
  'deal-type-bundle':          { 'ST0001-pc-1920x720': { x: 409, y: -645, size: 2009 }, 'ST0001-pc-1600x400': { x: 529, y: -446, size: 1296 }, 'ST0001-mo-720x960': { x: -289, y: -67, size: 1307 }, 'ST0001-mo-720x830': { x: -262, y: -28, size: 1250 }, 'ST0044-mo-656x436': { x: -66, y: -270, size: 788 }, 'ST0044-pc-342x228': { x: -18, y: -132, size: 378 } },
  'deal-type-time-sale':       { 'ST0001-pc-1920x720': { x: 454, y: -598, size: 1919 }, 'ST0001-pc-1600x400': { x: 590, y: -376, size: 1174 }, 'ST0001-mo-720x960': { x: -247, y: -33, size: 1223 }, 'ST0001-mo-720x830': { x: -262, y: -30, size: 1250 }, 'ST0044-mo-656x436': { x: -58, y: -257, size: 772 }, 'ST0044-pc-342x228': { x: 0, y: -112, size: 342 } },
  'deal-type-gift':            { 'ST0001-pc-1920x720': { x: 377, y: -697, size: 2073 }, 'ST0001-pc-1600x400': { x: 529, y: -446, size: 1296 }, 'ST0001-mo-720x960': { x: -422, y: -220, size: 1573 }, 'ST0001-mo-720x830': { x: -320, y: -80, size: 1366 }, 'ST0044-mo-656x436': { x: -66, y: -270, size: 788 }, 'ST0044-pc-342x228': { x: -18, y: -132, size: 378 } },
  'deal-type-hot-deal':        { 'ST0001-pc-1920x720': { x: 409, y: -657, size: 1995 }, 'ST0001-pc-1600x400': { x: 529, y: -446, size: 1296 }, 'ST0001-mo-720x960': { x: -350, y: -148, size: 1429 }, 'ST0001-mo-720x830': { x: -262, y: -28, size: 1250 }, 'ST0044-mo-656x436': { x: -66, y: -270, size: 788 }, 'ST0044-pc-342x228': { x: -18, y: -132, size: 378 } },
  // Teasing is the Main artwork with a motion cut, so it is framed like Main at
  // every size. The `LG.com — Teasing Content` board was rebuilt on 2026-08-29
  // (`6210:73073`, replacing `6018:40892`) and now matches Main at all six sizes,
  // 720×960 included — so this row is what Figma says, not an override.
  'ad-teasing':                { 'ST0001-pc-1920x720': { x: 385, y: -631, size: 1961 }, 'ST0001-pc-1600x400': { x: 524, y: -448, size: 1296 }, 'ST0001-mo-720x960': { x: -355, y: -131, size: 1431 }, 'ST0001-mo-720x830': { x: -289, y: -68, size: 1298 }, 'ST0044-mo-656x436': { x: -29, y: -234, size: 714 }, 'ST0044-pc-342x228': { x: -9, y: -121, size: 360 } },
  'ad-joy-ryder':              { 'ST0001-pc-1920x720': { x: 317, y: -715, size: 2105 }, 'ST0001-pc-1600x400': { x: 513, y: -446, size: 1296 }, 'ST0001-mo-720x960': { x: -439, y: -232, size: 1599 }, 'ST0001-mo-720x830': { x: -331, y: -108, size: 1382 }, 'ST0044-mo-656x436': { x: -94, y: -296, size: 844 }, 'ST0044-pc-342x228': { x: -9, y: -125, size: 360 } },
  'ad-benefit':                { 'ST0001-pc-1920x720': { x: 389, y: -612, size: 1917 }, 'ST0001-pc-1600x400': { x: 513, y: -443, size: 1296 }, 'ST0001-mo-720x960': { x: -313, y: -78, size: 1347 }, 'ST0001-mo-720x830': { x: -265, y: -28, size: 1250 }, 'ST0044-mo-656x436': { x: -29, y: -239, size: 714 }, 'ST0044-pc-342x228': { x: -9, y: -122, size: 360 } },
};

/** Where this asset's art sits in this slot. Falls back to the Main framing. */
export function artFor(assetId: string, slot: SlotId): Placement {
  const row = ART[assetId] ?? ART['kv-main'];
  return row[slot] ?? ART['kv-main'][slot]!;
}

/** Left-edge scrim on the two wide PC sizes: black, opaque to `stop`, then out. */
export interface Gradation { x: number; y: number; w: number; h: number; stop: number }

/**
 * Also per asset — the scrim is pulled wider for the deal-type objects so their
 * art clears the copy. Sizes without an entry simply have no scrim.
 */
const GRAD: Record<string, Partial<Record<SlotId, Gradation>>> = {
  'kv-main':                   { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 994, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 721, h: 397, stop: 0.441 } },
  'kv-main-character':         { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 994, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 721, h: 397, stop: 0.441 } },
  'kv-product-centric-1':      { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 994, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 721, h: 397, stop: 0.441 } },
  'kv-product-centric-2':      { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 994, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 721, h: 397, stop: 0.441 } },
  'kv-product-slot':           { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 994, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 721, h: 397, stop: 0.441 } },
  'kv-product-slot-character': { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 994, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 721, h: 397, stop: 0.441 } },
  'kv-product-slot2':          { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 832, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 721, h: 397, stop: 0.441 } },
  'kv-product-slot2-character': { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 806, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 721, h: 397, stop: 0.441 } },
  'deal-type-bundle':          { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 1268, h: 717, stop: 0.565 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 1052, h: 397, stop: 0.54 } },
  'deal-type-time-sale':       { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 1296, h: 717, stop: 0.512 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 1072, h: 397, stop: 0.543 } },
  'deal-type-gift':            { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 1300, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 1016, h: 397, stop: 0.591 } },
  'deal-type-hot-deal':        { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 1320, h: 717, stop: 0.518 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 1132, h: 397, stop: 0.555 } },
  'ad-teasing':                { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 994, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 721, h: 397, stop: 0.441 } },
  'ad-joy-ryder':              { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 994, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 721, h: 397, stop: 0.441 } },
  'ad-benefit':                { 'ST0001-pc-1920x720': { x: 4, y: 3, w: 1252, h: 717, stop: 0.441 }, 'ST0001-pc-1600x400': { x: 4, y: 3, w: 1090, h: 397, stop: 0.441 } },
};

/** The scrim for this asset in this slot, if the slot has one. */
export function gradFor(assetId: string, slot: SlotId): Gradation | undefined {
  return (GRAD[assetId] ?? GRAD['kv-main'])[slot] ?? GRAD['kv-main'][slot];
}

/** CSS for a scrim, keeping Figma's three stops. */
export const gradCss = (g: Gradation) =>
  `linear-gradient(90deg, #000 0%, #000 ${(g.stop * 100).toFixed(1)}%, rgba(0,0,0,0) 100%)`;

/* ------------------------------------------------------------------ */
/* Product slots                                                       */
/* ------------------------------------------------------------------ */

/**
 * A product placeholder inside the artwork, as fractions of the artwork square.
 * `r` is the corner radius on the same scale — Figma draws it in frame pixels,
 * so it is not a constant across sizes.
 */
export interface SlotBox { x: number; y: number; w: number; h: number; r: number }

export const SLOT_BOX_FILL = '#333333';

/**
 * Where the products sit on the PD Slot key visuals.
 *
 * 🔴 Read off the plates drawn on the Figma boards, not detected from the art —
 * the plates baked into the source are portrait and were redrawn square by hand.
 * Values are fractions of the artwork square, so a product dropped into plate
 * *n* lands in the same spot at every banner size once mapped through `artFor`.
 *
 * 🔴 Keyed by size, not just by asset. The plates were drawn by hand on each of
 * the six frames, so the same asset's fractions differ by up to 0.0025 between
 * sizes (Ver.2 runs 0.10072 wide on 1920×720 and 0.10317 on 342×228). Collapsing
 * them to one value per asset put every size but 1920×720 off by 2–5px.
 *
 * Re-read from Figma rather than re-deriving when the plates move. Assets not
 * listed here have no product slots.
 */
export const SLOT_BOXES: Record<string, Partial<Record<SlotId, SlotBox[]>>> = {
  'kv-product-slot': {
    'ST0001-pc-1920x720': [
      { x: 0.31800, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.41111, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.50422, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.59733, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
    ],
    'ST0001-pc-1600x400': [
      { x: 0.31800, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.41111, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.50422, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.59733, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
    ],
    'ST0001-mo-720x960': [
      { x: 0.26686, y: 0.39035, w: 0.10149, h: 0.10149, r: 0.00544 },
      { x: 0.26686, y: 0.49965, w: 0.10149, h: 0.10149, r: 0.00544 },
      { x: 0.62952, y: 0.39035, w: 0.10149, h: 0.10149, r: 0.00544 },
      { x: 0.62952, y: 0.49965, w: 0.10149, h: 0.10149, r: 0.00544 },
    ],
    'ST0001-mo-720x830': [
      { x: 0.26540, y: 0.39087, w: 0.10114, h: 0.10038, r: 0.00423 },
      { x: 0.26540, y: 0.49962, w: 0.10114, h: 0.10038, r: 0.00423 },
      { x: 0.62814, y: 0.39087, w: 0.10114, h: 0.10038, r: 0.00423 },
      { x: 0.62814, y: 0.49962, w: 0.10114, h: 0.10038, r: 0.00423 },
    ],
    'ST0044-mo-656x436': [
      { x: 0.26336, y: 0.39059, w: 0.10051, h: 0.10051, r: 0.00423 },
      { x: 0.26336, y: 0.50000, w: 0.10051, h: 0.10051, r: 0.00423 },
      { x: 0.62595, y: 0.39059, w: 0.10051, h: 0.10051, r: 0.00423 },
      { x: 0.62595, y: 0.50000, w: 0.10051, h: 0.10051, r: 0.00423 },
    ],
    'ST0044-pc-342x228': [
      { x: 0.26027, y: 0.39178, w: 0.10137, h: 0.10137, r: 0.00403 },
      { x: 0.26027, y: 0.49863, w: 0.10137, h: 0.10137, r: 0.00403 },
      { x: 0.62192, y: 0.39178, w: 0.10137, h: 0.10137, r: 0.00403 },
      { x: 0.62192, y: 0.49863, w: 0.10137, h: 0.10137, r: 0.00403 },
    ],
  },
  'kv-product-slot-character': {
    'ST0001-pc-1920x720': [
      { x: 0.31800, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.41111, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.50422, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.59733, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
    ],
    'ST0001-pc-1600x400': [
      { x: 0.31800, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.41111, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.50422, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
      { x: 0.59733, y: 0.57067, w: 0.08467, h: 0.08433, r: 0.00467 },
    ],
    'ST0001-mo-720x960': [
      { x: 0.26686, y: 0.39035, w: 0.10149, h: 0.10149, r: 0.00544 },
      { x: 0.26686, y: 0.49965, w: 0.10149, h: 0.10149, r: 0.00544 },
      { x: 0.62952, y: 0.39035, w: 0.10149, h: 0.10149, r: 0.00544 },
      { x: 0.62952, y: 0.49965, w: 0.10149, h: 0.10149, r: 0.00544 },
    ],
    'ST0001-mo-720x830': [
      { x: 0.26540, y: 0.39087, w: 0.10114, h: 0.10038, r: 0.00423 },
      { x: 0.26540, y: 0.49962, w: 0.10114, h: 0.10038, r: 0.00423 },
      { x: 0.62814, y: 0.39087, w: 0.10114, h: 0.10038, r: 0.00423 },
      { x: 0.62814, y: 0.49962, w: 0.10114, h: 0.10038, r: 0.00423 },
    ],
    'ST0044-mo-656x436': [
      { x: 0.26336, y: 0.39059, w: 0.10051, h: 0.10051, r: 0.00423 },
      { x: 0.26336, y: 0.50000, w: 0.10051, h: 0.10051, r: 0.00423 },
      { x: 0.62595, y: 0.39059, w: 0.10051, h: 0.10051, r: 0.00423 },
      { x: 0.62595, y: 0.50000, w: 0.10051, h: 0.10051, r: 0.00423 },
    ],
    'ST0044-pc-342x228': [
      { x: 0.26027, y: 0.39178, w: 0.10137, h: 0.10137, r: 0.00403 },
      { x: 0.26027, y: 0.49863, w: 0.10137, h: 0.10137, r: 0.00403 },
      { x: 0.62192, y: 0.39178, w: 0.10137, h: 0.10137, r: 0.00403 },
      { x: 0.62192, y: 0.49863, w: 0.10137, h: 0.10137, r: 0.00403 },
    ],
  },
  'kv-product-slot2': {
    'ST0001-pc-1920x720': [
      { x: 0.27036, y: 0.39084, w: 0.10072, h: 0.10072, r: 0.00467 },
      { x: 0.27036, y: 0.49928, w: 0.10072, h: 0.10072, r: 0.00467 },
      { x: 0.63325, y: 0.39084, w: 0.10072, h: 0.10072, r: 0.00467 },
      { x: 0.63325, y: 0.49928, w: 0.10072, h: 0.10072, r: 0.00467 },
    ],
    'ST0001-pc-1600x400': [
      { x: 0.26965, y: 0.38983, w: 0.10169, h: 0.10169, r: 0.00467 },
      { x: 0.26965, y: 0.49923, w: 0.10169, h: 0.10169, r: 0.00467 },
      { x: 0.63328, y: 0.38983, w: 0.10169, h: 0.10169, r: 0.00467 },
      { x: 0.63328, y: 0.49923, w: 0.10169, h: 0.10169, r: 0.00467 },
    ],
    'ST0001-mo-720x960': [
      { x: 0.27006, y: 0.39040, w: 0.10172, h: 0.10172, r: 0.00573 },
      { x: 0.27006, y: 0.49857, w: 0.10172, h: 0.10172, r: 0.00573 },
      { x: 0.63395, y: 0.39040, w: 0.10172, h: 0.10172, r: 0.00573 },
      { x: 0.63395, y: 0.49857, w: 0.10172, h: 0.10172, r: 0.00573 },
    ],
    'ST0001-mo-720x830': [
      { x: 0.27006, y: 0.39043, w: 0.10185, h: 0.10185, r: 0.00467 },
      { x: 0.27006, y: 0.49923, w: 0.10185, h: 0.10185, r: 0.00467 },
      { x: 0.63349, y: 0.39043, w: 0.10185, h: 0.10185, r: 0.00467 },
      { x: 0.63349, y: 0.49923, w: 0.10185, h: 0.10185, r: 0.00467 },
    ],
    'ST0044-mo-656x436': [
      { x: 0.26914, y: 0.38995, w: 0.10167, h: 0.10167, r: 0.00467 },
      { x: 0.26914, y: 0.49880, w: 0.10167, h: 0.10167, r: 0.00467 },
      { x: 0.63397, y: 0.38995, w: 0.10167, h: 0.10167, r: 0.00467 },
      { x: 0.63397, y: 0.49880, w: 0.10167, h: 0.10167, r: 0.00467 },
    ],
    'ST0044-pc-342x228': [
      { x: 0.26984, y: 0.38889, w: 0.10317, h: 0.10317, r: 0.00467 },
      { x: 0.26984, y: 0.49735, w: 0.10317, h: 0.10317, r: 0.00467 },
      { x: 0.63228, y: 0.38889, w: 0.10317, h: 0.10317, r: 0.00467 },
      { x: 0.63228, y: 0.49735, w: 0.10317, h: 0.10317, r: 0.00467 },
    ],
  },
  'kv-product-slot2-character': {
    'ST0001-pc-1920x720': [
      { x: 0.27036, y: 0.39084, w: 0.10072, h: 0.10072, r: 0.00467 },
      { x: 0.27036, y: 0.49928, w: 0.10072, h: 0.10072, r: 0.00467 },
      { x: 0.63325, y: 0.39084, w: 0.10072, h: 0.10072, r: 0.00467 },
      { x: 0.63325, y: 0.49928, w: 0.10072, h: 0.10072, r: 0.00467 },
    ],
    'ST0001-pc-1600x400': [
      { x: 0.26965, y: 0.38983, w: 0.10169, h: 0.10169, r: 0.00467 },
      { x: 0.26965, y: 0.49923, w: 0.10169, h: 0.10169, r: 0.00467 },
      { x: 0.63328, y: 0.38983, w: 0.10169, h: 0.10169, r: 0.00467 },
      { x: 0.63328, y: 0.49923, w: 0.10169, h: 0.10169, r: 0.00467 },
    ],
    'ST0001-mo-720x960': [
      { x: 0.27006, y: 0.39040, w: 0.10172, h: 0.10172, r: 0.00573 },
      { x: 0.27006, y: 0.49857, w: 0.10172, h: 0.10172, r: 0.00573 },
      { x: 0.63395, y: 0.39040, w: 0.10172, h: 0.10172, r: 0.00573 },
      { x: 0.63395, y: 0.49857, w: 0.10172, h: 0.10172, r: 0.00573 },
    ],
    'ST0001-mo-720x830': [
      { x: 0.27006, y: 0.39043, w: 0.10185, h: 0.10185, r: 0.00467 },
      { x: 0.27006, y: 0.49923, w: 0.10185, h: 0.10185, r: 0.00467 },
      { x: 0.63349, y: 0.39043, w: 0.10185, h: 0.10185, r: 0.00467 },
      { x: 0.63349, y: 0.49923, w: 0.10185, h: 0.10185, r: 0.00467 },
    ],
    'ST0044-mo-656x436': [
      { x: 0.26914, y: 0.38995, w: 0.10167, h: 0.10167, r: 0.00467 },
      { x: 0.26914, y: 0.49880, w: 0.10167, h: 0.10167, r: 0.00467 },
      { x: 0.63397, y: 0.38995, w: 0.10167, h: 0.10167, r: 0.00467 },
      { x: 0.63397, y: 0.49880, w: 0.10167, h: 0.10167, r: 0.00467 },
    ],
    'ST0044-pc-342x228': [
      { x: 0.26984, y: 0.38889, w: 0.10317, h: 0.10317, r: 0.00467 },
      { x: 0.26984, y: 0.49735, w: 0.10317, h: 0.10317, r: 0.00467 },
      { x: 0.63228, y: 0.38889, w: 0.10317, h: 0.10317, r: 0.00467 },
      { x: 0.63228, y: 0.49735, w: 0.10317, h: 0.10317, r: 0.00467 },
    ],
  },
};

export const slotBoxesFor = (assetId: string, slotId: SlotId): SlotBox[] =>
  SLOT_BOXES[assetId]?.[slotId] ?? [];
/** How many products this asset takes — the count is the same at every size. */
export const productSlotCount = (assetId: string) =>
  Object.values(SLOT_BOXES[assetId] ?? {})[0]?.length ?? 0;
export const hasProductSlots = (assetId: string) => productSlotCount(assetId) > 0;

export const slotLabel = (s: LgcomSlot) => `${s.w}×${s.h} | ${s.device}`;

/**
 * Sizes delivered as artwork and benefit icons only — no eyebrow, headline,
 * subcopy, CTA, disclaimer or indicator. LG.com sets the copy live on those two
 * placements, so baking it into the file would double it up. Same pair as
 * `hero`, but kept separate: one is about motion, this one about what ships.
 */
/**
 * Disclaimer rule (2026-09-01): a size with either dimension at 1000px or more
 * carries the long, editable disclaimer, bottom-anchored so extra lines grow
 * upward. Every smaller size is locked to the short "*T&C's apply" — the copy
 * field does not reach it.
 */
export const longDisclaimer = (w: number, h: number) => w >= 1000 || h >= 1000;

/**
 * Which LG.com slots take the typed disclaimer. The ≥1000px rule, plus the
 * 720×960 hero — editable by exception, capped at two lines via the spec's
 * `maxLines`.
 */
export const lgcomDisclaimerEditable = (slot: { id: string; w: number; h: number }) =>
  longDisclaimer(slot.w, slot.h) || slot.id === 'ST0001-mo-720x960';
export const SHORT_DISCLAIMER = '*T&C\u2019s apply';

/**
 * How much of the typed disclaimer a size renders. Only the widened 1920×720
 * takes the full 400-character field; every other long-disclaimer size cuts at
 * 180 — the field accepts 400 so the wide hero keeps its tail.
 */
export const disclaimerMaxChars = (slotId?: string) =>
  slotId === 'ST0001-pc-1920x720' ? 400 : 180;

export const bareOnExport = (slotId: string) =>
  slotId === 'ST0001-pc-1920x720' || slotId === 'ST0001-mo-720x960';

/**
 * Which LG.com sizes an asset runs at all. The Dynamic (motion) asset ships
 * video, and video goes out on the two hero placements only — the
 * `LG.com — Dynamic` board (`6210:73073`) hides the other four frames, and the
 * hero flag marks exactly that pair. Everything else runs the full set.
 */
export const lgcomSlotsFor = (assetId: string): LgcomSlot[] =>
  assetId === 'ad-teasing' ? LGCOM_SLOTS.filter(s => s.hero) : LGCOM_SLOTS;

/* ------------------------------------------------------------------ */
/* Icon row                                                            */
/* ------------------------------------------------------------------ */

/**
 * The icon row is the only element the edit panel can switch off. Everything
 * else a slot carries — eyebrow, headline, subcopy, CTA, disclaimer and the
 * carousel indicator — is part of the layout and is always drawn, at every
 * size. Figma ships the icon row hidden, so it starts off and the operator
 * turns it on per campaign.
 *
 * The PD Slot key visuals never get one: their product plates take the room the
 * icons would need, so the Figma boards for them drop the icon row and move the
 * artwork down 40px at 720×960 to close the gap. `ContentTemplateBuilder` keys
 * that off `productSlotCount`, which is non-zero for exactly those assets.
 */
export const DEFAULT_ICON_ROW = false;

/**
 * Icon row styles, matching the four variants of Figma's `Icon Row` set.
 *
 * Four real files, rendered from the SVG exports in
 * `content template builder source/icon row/` — a brightness-inversion shortcut
 * was tried first and got Solid black wrong (its tiles are dark but its glyphs
 * and labels stay white, which no uniform filter can produce).
 */
export const ICON_ROW_STYLES = [
  { key: 'solid-white', label: 'Solid white', file: 'icon-row-solid-white' },
  { key: 'solid-black', label: 'Solid black', file: 'icon-row-solid-black' },
  { key: 'line-white', label: 'Line white', file: 'icon-row-line-white' },
  { key: 'line-black', label: 'Line black', file: 'icon-row-line-black' },
] as const;

export type IconRowStyle = (typeof ICON_ROW_STYLES)[number]['key'];

export const iconRowStyle = (key: IconRowStyle) =>
  ICON_ROW_STYLES.find(s => s.key === key) ?? ICON_ROW_STYLES[0];

export const overlayUrl = (file: string) => `/content-template/overlay/${file}.png`;
