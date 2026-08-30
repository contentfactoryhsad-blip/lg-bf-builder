/**
 * Paid-media banner placement for the key visuals that have their own boards.
 *
 * `PAID_SLOTS` records the Key Visual _Main board. Every other key visual was
 * laid out on a board of its own, framing the artwork differently and making its
 * own call on the soft-edge gradation — so those sizes override the Main
 * placement rather than reusing it. One table per board, all reached through
 * `paidPlacementFor`.
 *
 * ---- PD Slot ----
 *
 * The PD Slot key visuals are laid out on two Figma boards in
 * `miJcDQgz0yJMskLE5a5HHj` / page "Banner Template":
 *
 *   001 (`6183:71382`) — two-line lockup, a row of four plates beneath it
 *   002 (`6183:70328`) — Main-style lockup, two plates down each side of it
 *
 * 🔴 The two boards are complementary, not alternatives. Every size is turned on
 * in exactly one of them and off in the other, so the pair reads as a single
 * 41-size set — which is why this is one table keyed by size rather than two.
 * `ver` records which board a size came from, and therefore which artwork it was
 * designed against; the character cut of that artwork uses the same placement.
 *
 * 🔴 The artwork sits differently here than on the Key Visual _Main board, so
 * `art` overrides `PaidSlot.art` rather than reusing it. Plates are in frame
 * pixels (not fractions of the art square as on LG.com) because they are drawn
 * on the frame, not baked into the artwork.
 *
 * The 15 sizes hidden in `PAID_SLOTS` are hidden on both boards too and carry no
 * placement. Turning one back on means placing it in Figma first.
 *
 * Plate order is reading order on the board: left to right for the 001 row, and
 * left pair top-to-bottom then right pair for the 002 columns. Product 1 fills
 * the first plate in that order.
 */
import type { PaidArt, PaidMask } from './paidSlots';

/** What a board says about one size. */
export interface BoardPlacement {
  art: PaidArt;
  /**
   * The soft edge, read off that board's own `gradation` rectangle. Absent where
   * the board has none or has switched it off — which is most of the PD Slot
   * sizes, and is why `PaidSlot.mask` cannot be reused: that one comes from the
   * Key Visual _Main board, where the same sizes do carry a mask.
   */
  mask?: PaidMask;
  /** Drawn product plates. Only the PD Slot boards have them. */
  plates?: PdPlate[];
}

/** One drawn plate, in frame pixels. `r` is the corner radius. */
export interface PdPlate { x: number; y: number; w: number; h: number; r: number }

export interface PdSlotPlacement extends BoardPlacement {
  /** Which board the size came from — picks the artwork. */
  ver: 'v1' | 'v2';
  plates: PdPlate[];
}

/** The plate fill on both boards. The colour control starts here. */
export const PD_PLATE_FILL = '#333333';

const P = (x: number, y: number, s: number, r: number): PdPlate => ({ x, y, w: s, h: s, r });

export const PD_SLOT_PLACEMENT: Record<string, PdSlotPlacement> = {
  /* ---- 001 · row of four under the lockup ------------------------------ */
  'criteo-800x1200': { ver: 'v1', art: { x: -534, y: -124, size: 1876 },
    plates: [P(53, 949, 165.65, 13.08), P(229.12, 949, 165.65, 13.08), P(405.23, 949, 165.65, 13.08), P(581.34, 949, 165.65, 13.08)] },
  'criteo-1200x628': { ver: 'v1', art: { x: 65, y: -483, size: 1594 },
    plates: [P(546, 425, 143.99, 11.34), P(698.67, 425, 143.99, 11.34), P(851.34, 425, 143.99, 11.34), P(1004.01, 425, 143.99, 11.34)] },
  'criteo-1024x768': { ver: 'v1', art: { x: -135, y: -445, size: 1658 },
    plates: [P(417, 510, 127.62, 10.05), P(552.31, 510, 127.62, 10.05), P(687.63, 510, 127.62, 10.05), P(822.94, 510, 127.62, 10.05)] },
  'criteo-768x1024': { ver: 'v1', art: { x: -365, y: -65, size: 1498 },
    plates: [P(75.01, 802.13, 147.82, 11.65), P(231.73, 802.13, 147.82, 11.65), P(388.45, 802.13, 147.82, 11.65), P(545.18, 802.13, 147.82, 11.65)] },
  'criteo-480x320': { ver: 'v1', art: { x: -73, y: -227, size: 786 },
    plates: [P(189.36, 221.7, 62.31, 4.91), P(255.42, 221.7, 62.31, 4.91), P(321.48, 221.7, 62.31, 4.91), P(387.54, 221.7, 62.31, 4.91)] },
  'criteo-320x480': { ver: 'v1', art: { x: -205, y: -40, size: 730 },
    plates: [P(20.98, 375.2, 66.4, 5.23), P(91.38, 375.2, 66.4, 5.23), P(161.77, 375.2, 66.4, 5.23), P(232.18, 375.2, 66.4, 5.23)] },
  'criteo-300x600': { ver: 'v1', art: { x: -221, y: 0, size: 746 },
    plates: [P(19.88, 429, 62.25, 4.9), P(85.88, 429, 62.25, 4.9), P(151.88, 429, 62.25, 4.9), P(217.88, 429, 62.25, 4.9)] },
  'criteo-160x600': { ver: 'v1', art: { x: -117, y: 69, size: 395 },
    plates: [P(47, 300, 65.78, 5.18), P(47, 369.74, 65.78, 5.18), P(47, 439.48, 65.78, 5.18), P(47, 509.22, 65.78, 5.18)] },
  'criteo-120x600': { ver: 'v1', art: { x: -90, y: 118, size: 300 },
    plates: [P(28, 298, 65, 5.12), P(28, 366.91, 65, 5.12), P(28, 435.83, 65, 5.12), P(28, 504.75, 65, 5.12)] },
  'dv360-120x60': { ver: 'v1', art: { x: 20, y: -34, size: 133 },
    mask: { angle: 90, stops: [[0, 0], [0.25, 0], [0.51, 1], [1, 1]] },
    plates: [P(60, 43, 12.63, 0.99), P(73.39, 43, 12.63, 0.99), P(86.78, 43, 12.63, 0.99), P(100.17, 43, 12.63, 0.99)] },
  'dv360-120x240': { ver: 'v1', art: { x: -85, y: 13, size: 294 },
    plates: [P(8, 183, 24.9, 1.96), P(34.4, 183, 24.9, 1.96), P(60.8, 183, 24.9, 1.96), P(87.2, 183, 24.9, 1.96)] },
  'dv360-970x90': { ver: 'v1', art: { x: 511, y: -123, size: 356 },
    plates: [P(514, 17.1, 56.61, 4.46), P(574.02, 17.1, 56.61, 4.46), P(743, 17.1, 56.61, 4.46), P(803.02, 17.1, 56.61, 4.46)] },
  'dv360-300x1050': { ver: 'v1', art: { x: -221, y: 64, size: 744 },
    plates: [P(88, 492, 124, 9.77), P(88, 623.47, 124, 9.77), P(88, 754.94, 124, 9.77), P(88, 886.41, 124, 9.77)] },
  'dv360-160x600': { ver: 'v1', art: { x: -117, y: 69, size: 395 },
    plates: [P(47, 300, 65.78, 5.18), P(47, 369.74, 65.78, 5.18), P(47, 439.48, 65.78, 5.18), P(47, 509.22, 65.78, 5.18)] },
  'dv360-360x640': { ver: 'v1', art: { x: -274, y: -38, size: 912 },
    plates: [P(23.85, 490, 74.7, 5.89), P(103.05, 490, 74.7, 5.89), P(182.25, 490, 74.7, 5.89), P(261.45, 490, 74.7, 5.89)] },
  'dv360-300x600': { ver: 'v1', art: { x: -225, y: -2, size: 756 },
    plates: [P(20.88, 434, 62.25, 4.9), P(86.88, 434, 62.25, 4.9), P(152.88, 434, 62.25, 4.9), P(218.88, 434, 62.25, 4.9)] },
  'dv360-120x600': { ver: 'v1', art: { x: -90, y: 118, size: 300 },
    plates: [P(28, 298, 65, 5.12), P(28, 366.91, 65, 5.12), P(28, 435.83, 65, 5.12), P(28, 504.75, 65, 5.12)] },
  'pmax-960x1200': { ver: 'v1', art: { x: -469, y: -179, size: 1898 },
    plates: [P(63.85, 915.8, 199.2, 15.69), P(275.05, 915.8, 199.2, 15.69), P(486.25, 915.8, 199.2, 15.69), P(697.45, 915.8, 199.2, 15.69)] },
  'pmax-1200x628': { ver: 'v1', art: { x: 36, y: -508, size: 1665 },
    plates: [P(556, 441, 143.99, 11.34), P(708.67, 441, 143.99, 11.34), P(861.34, 441, 143.99, 11.34), P(1014.01, 441, 143.99, 11.34)] },
  'meta-1080x1920': { ver: 'v1', art: { x: -774, y: -171, size: 2648 },
    plates: [P(72, 1352, 224.1, 17.66), P(309.6, 1352, 224.1, 17.66), P(547.2, 1352, 224.1, 17.66), P(784.8, 1352, 224.1, 17.66)] },

  /* ---- 002 · two plates down each side of the lockup ------------------- */
  'criteo-1200x1200': { ver: 'v2', art: { x: -388, y: -181, size: 1998 },
    plates: [P(46.5, 541, 245.74, 19.4), P(46.5, 802.26, 245.74, 19.4), P(907.76, 541, 245.74, 19.4), P(907.76, 802.26, 245.74, 19.4)] },
  'criteo-468x60': { ver: 'v2', art: { x: 281, y: -55, size: 170 },
    mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.69, 1], [0.85, 1], [0.91, 0], [1, 0]] },
    plates: [P(310, 5, 24.03, 1.9), P(310, 30.54, 24.03, 1.9), P(393.98, 5, 24.03, 1.9), P(393.98, 30.54, 24.03, 1.9)] },
  'criteo-970x250': { ver: 'v2', art: { x: 329, y: -224, size: 699 },
    mask: { angle: 90, stops: [[0, 0], [0.4, 0], [0.61, 1], [1, 1]] },
    plates: [P(470.39, 33, 89.07, 7.03), P(470.39, 127.7, 89.07, 7.03), P(781.73, 33, 89.07, 7.03), P(781.73, 127.7, 89.07, 7.03)] },
  'criteo-728x90': { ver: 'v2', art: { x: 430, y: -83, size: 258 },
    mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.7, 1], [0.85, 1], [0.91, 0], [1, 0]] },
    plates: [P(477.07, 8.63, 35.58, 2.81), P(477.07, 46.45, 35.58, 2.81), P(601.42, 8.63, 35.58, 2.81), P(601.42, 46.45, 35.58, 2.81)] },
  'criteo-336x280': { ver: 'v2', art: { x: -92, y: -82, size: 527 },
    plates: [P(13.02, 110, 63.22, 4.99), P(13.02, 177.21, 63.22, 4.99), P(259.77, 110, 63.22, 4.99), P(259.77, 177.21, 63.22, 4.99)] },
  'criteo-320x100': { ver: 'v2', art: { x: 82, y: -81, size: 261 },
    mask: { angle: 90, stops: [[0, 0], [0.36, 0], [0.51, 1], [1, 1]] },
    plates: [P(145.41, 22.99, 29.57, 2.33), P(145.41, 54.43, 29.57, 2.33), P(248.76, 22.99, 29.57, 2.33), P(248.76, 54.43, 29.57, 2.33)] },
  'criteo-320x50': { ver: 'v2', art: { x: 181, y: -41, size: 133 },
    mask: { angle: 90, stops: [[0, 0], [0.59, 0], [0.71, 1], [1, 1]] },
    plates: [P(212, 9, 15.47, 1.22), P(212, 25.44, 15.47, 1.22), P(266.06, 9, 15.47, 1.22), P(266.06, 25.44, 15.47, 1.22)] },
  'criteo-300x250': { ver: 'v2', art: { x: -78, y: -67, size: 462 },
    plates: [P(11.63, 101, 53.42, 4.22), P(11.63, 157.79, 53.42, 4.22), P(234.96, 101, 53.42, 4.22), P(234.96, 157.79, 53.42, 4.22)] },
  'dv360-125x125': { ver: 'v2', art: { x: -58, y: -40, size: 241 },
    plates: [P(4.84, 52, 25.67, 2.03), P(4.84, 79.3, 25.67, 2.03), P(94.48, 52, 25.67, 2.03), P(94.48, 79.3, 25.67, 2.03)] },
  'dv360-1200x270': { ver: 'v2', art: { x: 423, y: -261, size: 793 },
    mask: { angle: 90, stops: [[0, 0], [0.35, 0.5], [0.52, 1], [1, 1]] },
    plates: [P(563, 23, 111.81, 8.83), P(563, 141.87, 111.81, 8.83), P(953.8, 23, 111.81, 8.83), P(953.8, 141.87, 111.81, 8.83)] },
  'dv360-336x280': { ver: 'v2', art: { x: -109, y: -98, size: 560 },
    plates: [P(13.02, 109, 63.22, 4.99), P(13.02, 176.21, 63.22, 4.99), P(259.77, 109, 63.22, 4.99), P(259.77, 176.21, 63.22, 4.99)] },
  'dv360-320x320': { ver: 'v2', art: { x: -160, y: -116, size: 640 },
    plates: [P(12.4, 132, 65.72, 5.19), P(12.4, 201.88, 65.72, 5.19), P(241.88, 132, 65.72, 5.19), P(241.88, 201.88, 65.72, 5.19)] },
  'dv360-320x100': { ver: 'v2', art: { x: 74, y: -90, size: 279 },
    mask: { angle: 90, stops: [[0, 0], [0.36, 0], [0.51, 1], [1, 1]] },
    plates: [P(143, 19, 30.05, 2.37), P(143, 50.95, 30.05, 2.37), P(248.03, 19, 30.05, 2.37), P(248.03, 50.95, 30.05, 2.37)] },
  'dv360-320x50': { ver: 'v2', art: { x: 180, y: -43, size: 137 },
    mask: { angle: 90, stops: [[0, 0], [0.59, 0], [0.71, 1], [1, 1]] },
    plates: [P(209.52, 8, 16.57, 1.31), P(209.52, 25.61, 16.57, 1.31), P(267.43, 8, 16.57, 1.31), P(267.43, 25.61, 16.57, 1.31)] },
  'dv360-970x250': { ver: 'v2', art: { x: 326, y: -225, size: 700 },
    plates: [P(467, 32, 89.87, 7.1), P(467, 127.55, 89.87, 7.1), P(781.13, 32, 89.87, 7.1), P(781.13, 127.55, 89.87, 7.1)] },
  'dv360-728x90': { ver: 'v2', art: { x: 432, y: -85, size: 260 },
    mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.7, 1], [0.85, 1], [0.91, 0], [1, 0]] },
    plates: [P(473.07, 6, 38.25, 3.02), P(473.07, 46.66, 38.25, 3.02), P(606.75, 6, 38.25, 3.02), P(606.75, 46.66, 38.25, 3.02)] },
  'dv360-300x250': { ver: 'v2', art: { x: -91, y: -77, size: 484 },
    plates: [P(11.63, 103, 53.42, 4.22), P(11.63, 159.79, 53.42, 4.22), P(234.96, 103, 53.42, 4.22), P(234.96, 159.79, 53.42, 4.22)] },
  'dv360-250x250': { ver: 'v2', art: { x: -114, y: -78, size: 478 },
    plates: [P(9.69, 104, 51.35, 4.05), P(9.69, 158.59, 51.35, 4.05), P(188.97, 104, 51.35, 4.05), P(188.97, 158.59, 51.35, 4.05)] },
  'pmax-1200x1200': { ver: 'v2', art: { x: -369, y: -176, size: 1978 },
    plates: [P(46.5, 537, 245.74, 19.4), P(46.5, 798.26, 245.74, 19.4), P(907.76, 537, 245.74, 19.4), P(907.76, 798.26, 245.74, 19.4)] },
  'meta-1080x1080': { ver: 'v2', art: { x: -329, y: -129, size: 1754 },
    plates: [P(41.85, 538, 202.65, 16), P(41.85, 753.45, 202.65, 16), P(835.5, 538, 202.65, 16), P(835.5, 753.45, 202.65, 16)] },
  'meta-398x208': { ver: 'v2', art: { x: 87, y: -51, size: 377 },
    mask: { angle: 90, stops: [[0, 0], [0.36, 0], [0.51, 1], [1, 1]] },
    plates: [P(158, 89, 50.15, 3.96), P(158, 142.32, 50.15, 3.96), P(333.28, 89, 50.15, 3.96), P(333.28, 142.32, 50.15, 3.96)] },
};

/** The key visuals these placements are for — the plain cut and its character cut. */
export const PD_SLOT_ASSETS = new Set(['kv-product-slot', 'kv-product-slot-character']);

export const isPdSlotAsset = (assetId: string) => PD_SLOT_ASSETS.has(assetId);

/**
 * 🔴 Board 002 still carries the Key Visual _Main artwork, byte for byte — the
 * Ver.2 art is being adapted from it and has not landed. Its plates were placed
 * against that lockup, so pointing these sizes at the existing
 * `kv-product-slot2` files renders a different picture from the board and lets
 * that artwork's own baked-in plates show through beside the drawn ones.
 *
 * So v2 loads Main until the real file ships. Swap these two ids then; the
 * placements above do not change.
 */
const V2_ART = { plain: 'kv-main', character: 'kv-main-character' } as const;

/**
 * 🔴 Not `kv-product-slot` — that is the older cut still sitting on the
 * `PD Slot 01` board. Board 001 was re-arted, and its files came over as
 * `lg-bf-kv-product-slot001…`; both match the board byte for byte. The two are
 * close enough to pass a glance, so compare bytes rather than eyes if this ever
 * looks off again.
 */
const V1_ART = { plain: 'kv-product-slot001', character: 'kv-product-slot001-character' } as const;

/**
 * Which artwork file a size loads. The board decides the version; the chosen
 * asset decides whether the character is in the frame.
 */
export function pdSlotArtId(assetId: string, ver: 'v1' | 'v2'): string {
  const key = assetId.endsWith('-character') ? 'character' : 'plain';
  return ver === 'v2' ? V2_ART[key] : V1_ART[key];
}

export const pdSlotFor = (assetId: string, sizeKey: string): PdSlotPlacement | null =>
  isPdSlotAsset(assetId) ? PD_SLOT_PLACEMENT[sizeKey] ?? null : null;

/** Most sizes carry four plates; `dv360-970x90` carries two. */
export const pdPlateCount = (assetId: string) =>
  isPdSlotAsset(assetId)
    ? Object.values(PD_SLOT_PLACEMENT).reduce((m, p) => Math.max(m, p.plates.length), 0)
    : 0;

/* ==================================================================== */
/* PD Centric                                                           */
/* ==================================================================== */

/**
 * `External Banner Black Friday_Key Visual_PD Centric` (`6104:53546`).
 *
 * One board, two variants — PD Centric and PD Centric (Non AC) — sharing every
 * placement, exactly as the Key Visual _Main board does. No product plates: the
 * products are in the artwork.
 *
 * Its "Dark mode" section holds 84 frames because the Criteo and META blocks are
 * duplicated on the canvas. Every duplicate carries identical values, so this is
 * deduped by size key; a conflict check found none.
 */
export const PD_CENTRIC_ASSETS = new Set(['kv-product-centric-1', 'kv-product-centric-2']);

export const PD_CENTRIC_PLACEMENT: Record<string, BoardPlacement> = {
  'criteo-800x1200': { art: { x: -500, y: -96, size: 1800 } },
  'criteo-1200x1200': { art: { x: -419, y: -215, size: 2038 } },
  'criteo-1200x628': { art: { x: 12, y: -483, size: 1601 } },
  'criteo-1024x768': { art: { x: -117, y: -423, size: 1614 } },
  'criteo-768x1024': { art: { x: -344, y: -32, size: 1456 } },
  'criteo-480x320': { art: { x: -38, y: -208, size: 726 } },
  'criteo-468x60': { art: { x: 291, y: -51, size: 162 }, mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.69, 1], [0.85, 1], [0.91, 0], [1, 0]] } },
  'criteo-970x250': { art: { x: 386, y: -191, size: 633 }, mask: { angle: 90, stops: [[0, 0], [0.4, 0], [0.61, 1], [1, 1]] } },
  'criteo-728x90': { art: { x: 441, y: -73, size: 236 }, mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.7, 1], [0.85, 1], [0.91, 0], [1, 0]] } },
  'criteo-336x280': { art: { x: -67, y: -57, size: 469 } },
  'criteo-320x480': { art: { x: -181, y: -17, size: 682 } },
  'criteo-320x100': { art: { x: 95, y: -80, size: 253 }, mask: { angle: 90, stops: [[0, 0], [0.36, 0], [0.51, 1], [1, 1]] } },
  'criteo-320x50': { art: { x: 187, y: -41, size: 133 }, mask: { angle: 90, stops: [[0, 0], [0.59, 0], [0.71, 1], [1, 1]] } },
  'criteo-300x600': { art: { x: -223, y: 15, size: 747 } },
  'criteo-300x250': { art: { x: -49, y: -40, size: 398 } },
  'criteo-160x600': { art: { x: -121, y: 164, size: 401 } },
  'criteo-120x600': { art: { x: -92, y: 230, size: 304 } },
  'dv360-120x60': { art: { x: 24, y: -29, size: 123 }, mask: { angle: 90, stops: [[0, 0], [0.25, 0], [0.51, 1], [1, 1]] } },
  'dv360-125x125': { art: { x: -44, y: -30, size: 214 } },
  'dv360-120x240': { art: { x: -87, y: 10, size: 294 } },
  'dv360-970x90': { art: { x: 586, y: -69, size: 220 } },
  'dv360-1200x270': { art: { x: 511, y: -209, size: 670 }, mask: { angle: 90, stops: [[0, 0], [0.35, 0.5], [0.52, 1], [1, 1]] } },
  'dv360-300x1050': { art: { x: -221, y: 241, size: 739 } },
  'dv360-160x600': { art: { x: -121, y: 183, size: 401 } },
  'dv360-336x280': { art: { x: -96, y: -82, size: 528 } },
  'dv360-320x320': { art: { x: -121, y: -85, size: 562 } },
  'dv360-360x640': { art: { x: -264, y: -13, size: 888 } },
  'dv360-320x100': { art: { x: 77, y: -87, size: 273 }, mask: { angle: 90, stops: [[0, 0], [0.36, 0], [0.51, 1], [1, 1]] } },
  'dv360-320x50': { art: { x: 185, y: -43, size: 137 }, mask: { angle: 90, stops: [[0, 0], [0.59, 0], [0.71, 1], [1, 1]] } },
  'dv360-970x250': { art: { x: 383, y: -188, size: 608 } },
  'dv360-728x90': { art: { x: 441, y: -73, size: 236 }, mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.7, 1], [0.85, 1], [0.91, 0], [1, 0]] } },
  'dv360-300x600': { art: { x: -218, y: 30, size: 734 } },
  'dv360-120x600': { art: { x: -89, y: 231, size: 296 } },
  'dv360-300x250': { art: { x: -83, y: -68, size: 466 } },
  'dv360-250x250': { art: { x: -82, y: -51, size: 414 } },
  'pmax-960x1200': { art: { x: -513, y: -175, size: 1987 } },
  'pmax-1200x1200': { art: { x: -434, y: -220, size: 2077 } },
  'pmax-1200x628': { art: { x: 0, y: -489, size: 1607 } },
  'meta-1080x1080': { art: { x: -329, y: -129, size: 1754 } },
  'meta-398x208': { art: { x: 112, y: -52, size: 377 }, mask: { angle: 90, stops: [[0, 0], [0.36, 0], [0.51, 1], [1, 1]] } },
  'meta-1080x1920': { art: { x: -777, y: -168, size: 2642 } },
};

/* ==================================================================== */
/* Deal Type & AD                                                       */
/* ==================================================================== */

/**
 * `External Banner Black Friday_Deal Type & AD` (`6065:43994`).
 *
 * One board for six key visuals — four deal types and two ad creatives — held
 * as the six variants of its `Black Friday Image` set. Placement is per size and
 * shared by all six, the same arrangement the Key Visual _Main board uses, so a
 * single table covers every one of them. No product plates.
 *
 * Artwork is not overridden here: each asset loads its own file, which for the
 * two ad creatives means the `src` on the asset (`ad-creative-a-1` / `-b-1`).
 */
export const DEAL_AD_ASSETS = new Set([
  'deal-type-bundle', 'deal-type-time-sale', 'deal-type-gift', 'deal-type-hot-deal',
  'ad-joy-ryder', 'ad-benefit',
]);

export const DEAL_AD_PLACEMENT: Record<string, BoardPlacement> = {
  'criteo-800x1200': { art: { x: -608, y: -183, size: 2016 } },
  'criteo-1200x1200': { art: { x: -630, y: -415, size: 2460 } },
  'criteo-1200x628': { art: { x: -80, y: -577, size: 1802 }, mask: { angle: 90, stops: [[0, 0], [0.25, 0.5], [0.47, 1], [1, 1]] } },
  'criteo-1024x768': { art: { x: -89, y: -413, size: 1595 }, mask: { angle: 90, stops: [[0, 0], [0.25, 0.5], [0.44, 1], [1, 1]] } },
  'criteo-768x1024': { art: { x: -560, y: -241, size: 1888 } },
  'criteo-480x320': { art: { x: -18, y: -180, size: 680 } },
  'criteo-468x60': { art: { x: 276, y: -66, size: 192 }, mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.69, 1], [0.85, 1], [0.91, 0], [1, 0]] } },
  'criteo-970x250': { art: { x: 325, y: -261, size: 773 }, mask: { angle: 90, stops: [[0, 0], [0.4, 0], [0.61, 1], [1, 1]] } },
  'criteo-728x90': { art: { x: 418, y: -96, size: 282 }, mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.7, 1], [0.85, 1], [0.91, 0], [1, 0]] } },
  'criteo-336x280': { art: { x: -105, y: -89, size: 545 } },
  'criteo-320x480': { art: { x: -276, y: -107, size: 872 } },
  'criteo-320x100': { art: { x: 65, y: -105, size: 309 }, mask: { angle: 90, stops: [[0, 0], [0.36, 0], [0.51, 1], [1, 1]] } },
  'criteo-320x50': { art: { x: 177, y: -50, size: 153 }, mask: { angle: 90, stops: [[0, 0], [0.59, 0], [0.71, 1], [1, 1]] } },
  'criteo-300x600': { art: { x: -370, y: -131, size: 1040 }, mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] } },
  'criteo-300x250': { art: { x: -113, y: -96, size: 526 } },
  'criteo-160x600': { art: { x: -211, y: 91, size: 583 }, mask: { angle: 180, stops: [[0, 0], [0.37, 0], [0.52, 1], [1, 1]] } },
  'criteo-120x600': { art: { x: -156, y: 180, size: 432 }, mask: { angle: 180, stops: [[0, 0], [0.46, 0], [0.55, 1], [1, 1]] } },
  'dv360-120x60': { art: { x: 20, y: -31, size: 131 }, mask: { angle: 90, stops: [[0, 0], [0.25, 0], [0.51, 1], [1, 1]] } },
  'dv360-125x125': { art: { x: -53, y: -35, size: 231 } },
  'dv360-120x240': { art: { x: -116, y: -15, size: 352 }, mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] } },
  'dv360-970x90': { art: { x: 566, y: -93, size: 276 }, mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.68, 1], [0.78, 1], [0.85, 0], [1, 0]] } },
  'dv360-1200x270': { art: { x: 453, y: -256, size: 787 }, mask: { angle: 90, stops: [[0, 0], [0.4, 0], [0.56, 1], [1, 1]] } },
  'dv360-300x1050': { art: { x: -306, y: 151, size: 920 }, mask: { angle: 180, stops: [[0, 0], [0.37, 0], [0.49, 1], [1, 1]] } },
  'dv360-160x600': { art: { x: -153, y: 159, size: 470 }, mask: { angle: 180, stops: [[0, 0], [0.37, 0], [0.52, 1], [1, 1]] } },
  'dv360-336x280': { art: { x: -104, y: -90, size: 544 } },
  'dv360-320x320': { art: { x: -148, y: -107, size: 616 } },
  'dv360-360x640': { art: { x: -294, y: -43, size: 948 } },
  'dv360-320x100': { art: { x: 62, y: -101, size: 303 }, mask: { angle: 90, stops: [[0, 0], [0.36, 0], [0.51, 1], [1, 1]] } },
  'dv360-320x50': { art: { x: 179, y: -48, size: 146 }, mask: { angle: 90, stops: [[0, 0], [0.59, 0], [0.71, 1], [1, 1]] } },
  'dv360-970x250': { art: { x: 322, y: -240, size: 730 }, mask: { angle: 90, stops: [[0, 0], [0.4, 0], [0.61, 1], [1, 1]] } },
  'dv360-728x90': { art: { x: 428, y: -86, size: 262 }, mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.7, 1], [0.85, 1], [0.91, 0], [1, 0]] } },
  'dv360-300x600': { art: { x: -270, y: -24, size: 842 }, mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] } },
  'dv360-120x600': { art: { x: -148, y: 183, size: 418 }, mask: { angle: 180, stops: [[0, 0], [0.46, 0], [0.55, 1], [1, 1]] } },
  'dv360-300x250': { art: { x: -77, y: -60, size: 454 } },
  'dv360-250x250': { art: { x: -100, y: -69, size: 450 } },
  'pmax-960x1200': { art: { x: -531, y: -200, size: 2024 } },
  'pmax-1200x1200': { art: { x: -561, y: -330, size: 2324 } },
  'pmax-1200x628': { art: { x: -33, y: -554, size: 1737 }, mask: { angle: 90, stops: [[0, 0], [0.25, 0.5], [0.47, 1], [1, 1]] } },
  'meta-1080x1080': { art: { x: -428, y: -212, size: 1936 } },
  'meta-398x208': { art: { x: 102, y: -72, size: 413 }, mask: { angle: 90, stops: [[0, 0], [0.36, 0], [0.51, 1], [1, 1]] } },
  'meta-1080x1920': { art: { x: -1041, y: -431, size: 3204 } },
};

/* ==================================================================== */
/* Lookup                                                               */
/* ==================================================================== */

/** What a size renders: where the art goes, its mask, its plates, which file. */
export interface PaidPlacement extends BoardPlacement {
  /**
   * Artwork stem to load, when the board decides it rather than the asset. Only
   * the PD Slot pair needs this — its sizes are split across two artworks. Left
   * undefined elsewhere, and the caller falls back to the asset's own file.
   */
  artId?: string;
}

/** Which key visuals have a board of their own beyond Key Visual _Main. */
export const hasPaidBoard = (assetId: string) =>
  isPdSlotAsset(assetId) || PD_CENTRIC_ASSETS.has(assetId) || DEAL_AD_ASSETS.has(assetId);

/**
 * The board's word on one size, or null when the asset has no board of its own
 * and should fall back to the `PAID_SLOTS` row.
 */
export function paidPlacementFor(assetId: string, sizeKey: string): PaidPlacement | null {
  if (isPdSlotAsset(assetId)) {
    const p = PD_SLOT_PLACEMENT[sizeKey];
    return p ? { ...p, artId: pdSlotArtId(assetId, p.ver) } : null;
  }
  if (PD_CENTRIC_ASSETS.has(assetId)) return PD_CENTRIC_PLACEMENT[sizeKey] ?? null;
  if (DEAL_AD_ASSETS.has(assetId)) return DEAL_AD_PLACEMENT[sizeKey] ?? null;
  return null;
}
