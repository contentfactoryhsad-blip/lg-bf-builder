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
import type { PaidArt, PaidMask, PaidSlot } from './paidSlots';
import type { TaglineRatios } from './kvTagline';

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
    plates: [P(53, 949, 165.65, 13.08), P(229.12, 949, 165.65, 13.08), P(405.23, 949, 165.65, 13.08), P(581.35, 949, 165.65, 13.08)] },
  'criteo-1200x628': { ver: 'v1', art: { x: 65, y: -483, size: 1594 },
    plates: [P(546, 425, 143.99, 11.34), P(698.67, 425, 143.99, 11.34), P(851.34, 425, 143.99, 11.34), P(1004.01, 425, 143.99, 11.34)] },
  'criteo-1024x768': { ver: 'v1', art: { x: -135, y: -445, size: 1658 },
    plates: [P(417, 510, 127.62, 10.05), P(552.31, 510, 127.62, 10.05), P(687.63, 510, 127.62, 10.05), P(822.94, 510, 127.62, 10.05)] },
  'criteo-768x1024': { ver: 'v1', art: { x: -364.99, y: -65, size: 1497.99 },
    plates: [P(75.01, 802.13, 147.82, 11.65), P(231.73, 802.13, 147.82, 11.65), P(388.46, 802.13, 147.82, 11.65), P(545.18, 802.13, 147.82, 11.65)] },
  'criteo-480x320': { ver: 'v1', art: { x: -73, y: -227, size: 786 },
    plates: [P(189.36, 221.69, 62.31, 4.91), P(255.42, 221.69, 62.31, 4.91), P(321.48, 221.69, 62.31, 4.91), P(387.54, 221.69, 62.31, 4.91)] },
  'criteo-320x480': { ver: 'v1', art: { x: -166.44, y: 12, size: 652.44 },
    plates: [P(20.98, 385, 66.4, 5.23), P(91.38, 385, 66.4, 5.23), P(161.78, 385, 66.4, 5.23), P(232.18, 385, 66.4, 5.23)] },
  'criteo-300x600': { ver: 'v1', art: { x: -221, y: 30, size: 746 },
    plates: [P(19.88, 459, 62.25, 4.9), P(85.88, 459, 62.25, 4.9), P(151.88, 459, 62.25, 4.9), P(217.88, 459, 62.25, 4.9)] },
  'criteo-160x600': { ver: 'v1', art: { x: -111, y: 128, size: 383 },
    plates: [P(53.1, 351, 53.58, 4.22), P(53.1, 407.81, 53.58, 4.22), P(53.1, 464.61, 53.58, 4.22), P(53.1, 521.42, 53.58, 4.22)] },
  'criteo-120x600': { ver: 'v1', art: { x: -107, y: 153, size: 336 },
    plates: [P(34.1, 354, 52.8, 4.16), P(34.1, 409.98, 52.8, 4.16), P(34.1, 465.96, 52.8, 4.16), P(34.1, 521.95, 52.8, 4.16)] },
  'dv360-120x60': { ver: 'v1', art: { x: 20, y: -34, size: 133 },
    mask: { angle: 90, stops: [[0, 0], [0.253, 0], [0.515, 1], [1, 1]] },
    plates: [P(60, 43, 12.63, 0.99), P(73.39, 43, 12.63, 0.99), P(86.78, 43, 12.63, 0.99), P(100.17, 43, 12.63, 0.99)] },
  'dv360-120x240': { ver: 'v1', art: { x: -85, y: 23, size: 294 },
    plates: [P(8, 190, 24.9, 1.96), P(34.4, 190, 24.9, 1.96), P(60.8, 190, 24.9, 1.96), P(87.2, 190, 24.9, 1.96)] },
  'dv360-970x90': { ver: 'v1', art: { x: 127, y: -129, size: 368 },
    plates: [P(133, 15.1, 56.61, 4.46), P(193.02, 15.1, 56.61, 4.46), P(368, 15.1, 56.61, 4.46), P(428.02, 15.1, 56.61, 4.46)] },
  'dv360-300x1050': { ver: 'v1', art: { x: -220.99, y: 117, size: 743.99 },
    plates: [P(93.5, 544, 113, 8.9), P(93.5, 663.8, 113, 8.9), P(93.5, 783.61, 113, 8.9), P(93.5, 903.41, 113, 8.9)] },
  'dv360-160x600': { ver: 'v1', art: { x: -111, y: 128, size: 383 },
    plates: [P(53.1, 351, 53.58, 4.22), P(53.1, 407.81, 53.58, 4.22), P(53.1, 464.61, 53.58, 4.22), P(53.1, 521.42, 53.58, 4.22)] },
  'dv360-360x640': { ver: 'v1', art: { x: -274, y: -17, size: 912 },
    plates: [P(23.85, 498, 74.7, 5.89), P(103.05, 498, 74.7, 5.89), P(182.25, 498, 74.7, 5.89), P(261.45, 498, 74.7, 5.89)] },
  'dv360-300x600': { ver: 'v1', art: { x: -221, y: 30, size: 746 },
    plates: [P(19.88, 459, 62.25, 4.9), P(85.88, 459, 62.25, 4.9), P(151.88, 459, 62.25, 4.9), P(217.88, 459, 62.25, 4.9)] },
  'dv360-120x600': { ver: 'v1', art: { x: -107, y: 153, size: 336 },
    plates: [P(34.1, 354, 52.8, 4.16), P(34.1, 409.98, 52.8, 4.16), P(34.1, 465.96, 52.8, 4.16), P(34.1, 521.95, 52.8, 4.16)] },
  'pmax-960x1200': { ver: 'v1', art: { x: -469, y: -179, size: 1898 },
    plates: [P(63.85, 915.8, 199.2, 15.69), P(275.05, 915.8, 199.2, 15.69), P(486.25, 915.8, 199.2, 15.69), P(697.45, 915.8, 199.2, 15.69)] },
  'pmax-1200x628': { ver: 'v1', art: { x: 65, y: -483, size: 1594 },
    plates: [P(546, 425, 143.99, 11.34), P(698.67, 425, 143.99, 11.34), P(851.34, 425, 143.99, 11.34), P(1004.01, 425, 143.99, 11.34)] },
  'pmax-d2c-1080x1350': { ver: 'v1', art: { x: -527.62, y: -201.37, size: 2135.25 },
    plates: [P(71.83, 1030.27, 224.1, 17.66), P(309.43, 1030.27, 224.1, 17.66), P(547.03, 1030.27, 224.1, 17.66), P(784.63, 1030.27, 224.1, 17.66)] },
  'pmax-d2c-800x600': { ver: 'v1', art: { x: 51, y: -205, size: 1110.03 },
    plates: [P(436, 447, 79.89, 6.29), P(520.7, 447, 79.89, 6.29), P(605.41, 447, 79.89, 6.29), P(690.11, 447, 79.89, 6.29)] },
  'pmax-d2c-600x800': { ver: 'v1', art: { x: -293.12, y: -86.87, size: 1186.25 },
    plates: [P(39.91, 597.38, 124.5, 9.81), P(171.91, 597.38, 124.5, 9.81), P(303.91, 597.38, 124.5, 9.81), P(435.91, 597.38, 124.5, 9.81)] },
  'pmax-d2c-1080x1920': { ver: 'v1', art: { x: -981, y: -358, size: 3068 },
    plates: [P(71.83, 1405, 224.1, 17.66), P(309.43, 1405, 224.1, 17.66), P(547.03, 1405, 224.1, 17.66), P(784.63, 1405, 224.1, 17.66)] },
  'pmax-d2c-1200x700': { ver: 'v1', art: { x: 35.95, y: -472.05, size: 1665.05 },
    plates: [P(556, 477, 143.99, 11.34), P(708.67, 477, 143.99, 11.34), P(861.34, 477, 143.99, 11.34), P(1014.01, 477, 143.99, 11.34)] },
  'pmax-d2c-1080x608': { ver: 'v1', art: { x: 32.36, y: -435.84, size: 1498.54 },
    plates: [P(500.4, 418.3, 129.59, 10.21), P(637.8, 418.3, 129.59, 10.21), P(775.2, 418.3, 129.59, 10.21), P(912.61, 418.3, 129.59, 10.21)] },
  'pmax-d2c-1080x1800': { ver: 'v1', art: { x: -935, y: -370, size: 2964 },
    plates: [P(71.83, 1328, 224.1, 17.66), P(309.43, 1328, 224.1, 17.66), P(547.03, 1328, 224.1, 17.66), P(784.63, 1328, 224.1, 17.66)] },
  'meta-1080x1440': { ver: 'v1', art: { x: -772, y: -392.5, size: 2640 },
    plates: [P(79.55, 1115, 224.1, 17.66), P(317.15, 1115, 224.1, 17.66), P(554.75, 1115, 224.1, 17.66), P(792.35, 1115, 224.1, 17.66)] },
  'meta-1080x1920': { ver: 'v1', art: { x: -1041, y: -441, size: 3198 },
    plates: [P(72, 1384, 224.1, 17.66), P(309.6, 1384, 224.1, 17.66), P(547.2, 1384, 224.1, 17.66), P(784.8, 1384, 224.1, 17.66)] },
  'sem-1200x628': { ver: 'v1', art: { x: 65, y: -483, size: 1594 },
    plates: [P(546, 425, 143.99, 11.34), P(698.67, 425, 143.99, 11.34), P(851.34, 425, 143.99, 11.34), P(1004.01, 425, 143.99, 11.34)] },
  /* ---- 002 · two plates down each side of the lockup ------------------- */
  'criteo-1200x1200': { ver: 'v2', art: { x: -388, y: -181, size: 1998 },
    plates: [P(46.5, 541, 245.74, 19.4), P(46.5, 802.26, 245.74, 19.4), P(907.76, 541, 245.74, 19.4), P(907.76, 802.26, 245.74, 19.4)] },
  'criteo-468x60': { ver: 'v2', art: { x: 21, y: -74, size: 208 },
    plates: [P(69, 5, 24.03, 1.9), P(69, 30.54, 24.03, 1.9), P(152.98, 5, 24.03, 1.9), P(152.98, 30.54, 24.03, 1.9)] },
  'criteo-970x250': { ver: 'v2', art: { x: 329, y: -224.11, size: 699.11 },
    mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] },
    plates: [P(470.39, 33, 89.07, 7.03), P(470.39, 127.7, 89.07, 7.03), P(781.73, 33, 89.07, 7.03), P(781.73, 127.7, 89.07, 7.03)] },
  'criteo-728x90': { ver: 'v2', art: { x: 48, y: -92, size: 276 },
    plates: [P(104.07, 8.63, 35.58, 2.81), P(104.07, 46.45, 35.58, 2.81), P(228.42, 8.63, 35.58, 2.81), P(228.42, 46.45, 35.58, 2.81)] },
  'criteo-336x280': { ver: 'v2', art: { x: -119, y: -93, size: 579 },
    plates: [P(13.02, 129, 63.22, 4.99), P(13.02, 196.21, 63.22, 4.99), P(259.76, 129, 63.22, 4.99), P(259.76, 196.21, 63.22, 4.99)] },
  'criteo-320x100': { ver: 'v2', art: { x: 119.73, y: -72, size: 253.27 },
    mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] },
    plates: [P(185, 27.88, 27.12, 2.14), P(185, 56.72, 27.12, 2.14), P(279.81, 27.88, 27.12, 2.14), P(279.81, 56.72, 27.12, 2.14)] },
  'criteo-320x50': { ver: 'v2', art: { x: 13, y: -45, size: 140 },
    plates: [P(46.61, 9, 15.47, 1.22), P(46.61, 25.44, 15.47, 1.22), P(100.67, 9, 15.47, 1.22), P(100.67, 25.44, 15.47, 1.22)] },
  'criteo-300x250': { ver: 'v2', art: { x: -105, y: -80, size: 518 },
    plates: [P(11.63, 116, 53.42, 4.22), P(11.63, 172.79, 53.42, 4.22), P(234.96, 116, 53.42, 4.22), P(234.96, 172.79, 53.42, 4.22)] },
  'dv360-125x125': { ver: 'v2', art: { x: -58, y: -33, size: 241 },
    plates: [P(4.84, 59, 25.67, 2.03), P(4.84, 86.3, 25.67, 2.03), P(94.48, 59, 25.67, 2.03), P(94.48, 86.3, 25.67, 2.03)] },
  'dv360-1200x270': { ver: 'v2', art: { x: 423.4, y: -261.49, size: 792.6 },
    mask: { angle: 90, stops: [[0, 0], [0.346, 0.5], [0.522, 1], [1, 1]] },
    plates: [P(563, 23, 111.81, 8.83), P(563, 141.87, 111.81, 8.83), P(953.8, 23, 111.81, 8.83), P(953.8, 141.87, 111.81, 8.83)] },
  'dv360-336x280': { ver: 'v2', art: { x: -109, y: -82, size: 560 },
    plates: [P(13.02, 125, 63.22, 4.99), P(13.02, 192.21, 63.22, 4.99), P(259.76, 125, 63.22, 4.99), P(259.76, 192.21, 63.22, 4.99)] },
  'dv360-320x320': { ver: 'v2', art: { x: -160, y: -103, size: 640 },
    plates: [P(12.4, 145, 65.72, 5.19), P(12.4, 214.88, 65.72, 5.19), P(241.87, 145, 65.72, 5.19), P(241.87, 214.88, 65.72, 5.19)] },
  'dv360-320x100': { ver: 'v2', art: { x: 122, y: -72, size: 254.73 },
    mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] },
    plates: [P(184, 29, 28.11, 2.22), P(184, 58.89, 28.11, 2.22), P(282.25, 29, 28.11, 2.22), P(282.25, 58.89, 28.11, 2.22)] },
  'dv360-320x50': { ver: 'v2', art: { x: 13, y: -45, size: 140 },
    plates: [P(44.62, 8, 16.57, 1.31), P(44.62, 25.62, 16.57, 1.31), P(102.52, 8, 16.57, 1.31), P(102.52, 25.62, 16.57, 1.31)] },
  'dv360-970x250': { ver: 'v2', art: { x: 331, y: -220, size: 700 },
    plates: [P(472, 37, 89.87, 7.1), P(472, 132.55, 89.87, 7.1), P(786.13, 37, 89.87, 7.1), P(786.13, 132.55, 89.87, 7.1)] },
  'dv360-728x90': { ver: 'v2', art: { x: 48, y: -94, size: 278 },
    plates: [P(101.04, 6, 38.25, 3.02), P(101.04, 46.66, 38.25, 3.02), P(234.72, 6, 38.25, 3.02), P(234.72, 46.66, 38.25, 3.02)] },
  'dv360-300x250': { ver: 'v2', art: { x: -91.01, y: -66, size: 484.01 },
    plates: [P(11.63, 114, 53.42, 4.22), P(11.63, 170.79, 53.42, 4.22), P(234.96, 114, 53.42, 4.22), P(234.96, 170.79, 53.42, 4.22)] },
  'dv360-250x250': { ver: 'v2', art: { x: -114, y: -69, size: 478 },
    plates: [P(9.69, 113, 51.35, 4.05), P(9.69, 167.59, 51.35, 4.05), P(188.96, 113, 51.35, 4.05), P(188.96, 167.59, 51.35, 4.05)] },
  'pmax-1200x1200': { ver: 'v2', art: { x: -369.5, y: -175.75, size: 1977.5 },
    plates: [P(46.5, 537, 245.74, 19.4), P(46.5, 798.26, 245.74, 19.4), P(907.76, 537, 245.74, 19.4), P(907.76, 798.26, 245.74, 19.4)] },
  'pmax-d2c-970x250': { ver: 'v2', art: { x: 350, y: -220, size: 699.11 },
    mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] },
    plates: [P(495, 48, 89.07, 7.03), P(495, 142.7, 89.07, 7.03), P(806.34, 48, 89.07, 7.03), P(806.34, 142.7, 89.07, 7.03)] },
  'pmax-d2c-1080x1080': { ver: 'v2', art: { x: -332.55, y: -158.18, size: 1779.75 },
    plates: [P(41.85, 483.3, 221.17, 17.46), P(41.85, 718.43, 221.17, 17.46), P(816.98, 483.3, 221.17, 17.46), P(816.98, 718.43, 221.17, 17.46)] },
  'pmax-d2c-1000x1000': { ver: 'v2', art: { x: -307.92, y: -146.46, size: 1647.92 },
    plates: [P(38.75, 447.5, 204.78, 16.17), P(38.75, 665.22, 204.78, 16.17), P(756.47, 447.5, 204.78, 16.17), P(756.47, 665.22, 204.78, 16.17)] },
  'pmax-d2c-1500x1500': { ver: 'v2', art: { x: -461.87, y: -219.69, size: 2471.88 },
    plates: [P(58.13, 671.25, 307.17, 24.25), P(58.13, 997.83, 307.17, 24.25), P(1134.7, 671.25, 307.17, 24.25), P(1134.7, 997.83, 307.17, 24.25)] },
  'meta-398x208': { ver: 'v2', art: { x: 87, y: -51, size: 377 },
    mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] },
    plates: [P(158, 89, 50.15, 3.96), P(158, 142.32, 50.15, 3.96), P(333.28, 89, 50.15, 3.96), P(333.28, 142.32, 50.15, 3.96)] },
  'meta-1080x1080': { ver: 'v2', art: { x: -436, y: -228, size: 1976 },
    plates: [P(49.7, 519, 200.58, 15.84), P(49.7, 732.25, 200.58, 15.84), P(835.24, 519, 200.58, 15.84), P(835.24, 732.25, 200.58, 15.84)] },
  'sem-1200x1200': { ver: 'v2', art: { x: -369.5, y: -175.75, size: 1977.5 },
    plates: [P(46.5, 537, 245.74, 19.4), P(46.5, 798.26, 245.74, 19.4), P(907.76, 537, 245.74, 19.4), P(907.76, 798.26, 245.74, 19.4)] },
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
  'criteo-1024x768': { art: { x: -116.75, y: -423, size: 1614 } },
  'criteo-768x1024': { art: { x: -344.01, y: -32, size: 1456.01 } },
  'criteo-480x320': { art: { x: -38, y: -208, size: 726 } },
  'criteo-468x60': { art: { x: 32, y: -62, size: 183 } },
  'criteo-970x250': { art: { x: 386, y: -191.44, size: 632.89 }, mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] } },
  'criteo-728x90': { art: { x: 48, y: -86, size: 261.96 } },
  'criteo-336x280': { art: { x: -47.77, y: -18, size: 430.77 } },
  'criteo-320x480': { art: { x: -181, y: 0, size: 681.56 } },
  'criteo-320x100': { art: { x: 111, y: -78, size: 257.27 }, mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] } },
  'criteo-320x50': { art: { x: 11, y: -48, size: 146.78 } },
  'criteo-300x600': { art: { x: -223.41, y: 30, size: 746.84 } },
  'criteo-300x250': { art: { x: -45, y: -14, size: 390 } },
  'criteo-160x600': { art: { x: -121, y: 219, size: 401 } },
  'criteo-120x600': { art: { x: -88, y: 273, size: 296 } },
  'dv360-120x60': { art: { x: 19, y: -34.06, size: 135.06 }, mask: { angle: 90, stops: [[0, 0], [0.253, 0], [0.515, 1], [1, 1]] } },
  'dv360-125x125': { art: { x: -46, y: -22, size: 217 } },
  'dv360-120x240': { art: { x: -75, y: 36, size: 270 } },
  'dv360-970x90': { art: { x: 198, y: -67, size: 220 } },
  'dv360-1200x270': { art: { x: 512, y: -209, size: 670.39 }, mask: { angle: 90, stops: [[0, 0], [0.346, 0.5], [0.522, 1], [1, 1]] } },
  'dv360-300x1050': { art: { x: -220.52, y: 296, size: 739.05 } },
  'dv360-160x600': { art: { x: -121.5, y: 212, size: 401 } },
  'dv360-336x280': { art: { x: -83.01, y: -51, size: 502.01 } },
  'dv360-320x320': { art: { x: -104.99, y: -48, size: 529.99 } },
  'dv360-360x640': { art: { x: -264, y: -3, size: 888 } },
  'dv360-320x100': { art: { x: 108, y: -83, size: 273.28 }, mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] } },
  'dv360-320x50': { art: { x: 9, y: -46.62, size: 145.23 } },
  'dv360-970x250': { art: { x: 407, y: -184, size: 608 } },
  'dv360-728x90': { art: { x: 56, y: -86, size: 263.92 } },
  'dv360-300x600': { art: { x: -217.76, y: 30.49, size: 733.51 } },
  'dv360-120x600': { art: { x: -88.66, y: 267, size: 295.66 } },
  'dv360-300x250': { art: { x: -72.01, y: -43, size: 444.01 } },
  'dv360-250x250': { art: { x: -82, y: -37, size: 414 } },
  'pmax-960x1200': { art: { x: -513.5, y: -175.5, size: 1987.5 } },
  'pmax-1200x1200': { art: { x: -434.5, y: -219.75, size: 2077.5 } },
  'pmax-1200x628': { art: { x: 0, y: -489.48, size: 1606.95 } },
  'pmax-d2c-1080x1350': { art: { x: -578, y: -197, size: 2235.38 } },
  'pmax-d2c-800x600': { art: { x: 52, y: -185, size: 1020.14 } },
  'pmax-d2c-600x800': { art: { x: -321, y: -86, size: 1241.87 } },
  'pmax-d2c-1080x1920': { art: { x: -826, y: -196, size: 2740 } },
  'pmax-d2c-1200x700': { art: { x: -29, y: -531, size: 1769.15 } },
  'pmax-d2c-1080x608': { art: { x: 101, y: -341, size: 1289.7 } },
  'pmax-d2c-970x250': { art: { x: 386, y: -191.44, size: 632.89 }, mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] } },
  'pmax-d2c-1080x1800': { art: { x: -814.37, y: -236.37, size: 2708.37 } },
  'pmax-d2c-1080x1080': { art: { x: -391, y: -198, size: 1869.3 } },
  'pmax-d2c-1000x1000': { art: { x: -362, y: -183, size: 1730.83 } },
  'pmax-d2c-1500x1500': { art: { x: -542, y: -303, size: 2596.25 } },
  'meta-1080x1440': { art: { x: -647, y: -264.5, size: 2384 } },
  'meta-398x208': { art: { x: 100, y: -97, size: 421 }, mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] } },
  'meta-1080x1920': { art: { x: -777, y: -188, size: 2642 } },
  'meta-1080x1080': { art: { x: -296, y: -113, size: 1682 } },
  'sem-1200x1200': { art: { x: -434.5, y: -219.75, size: 2077.5 } },
  'sem-1200x628': { art: { x: 0, y: -489.48, size: 1606.95 } },
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
  'ad-joy-ryder',
]);

/** Benefit moved to its own board (2026-09-04) — see AD_BENEFIT_PLACEMENT. */
export const AD_BENEFIT_ASSET = 'ad-benefit';

export const DEAL_AD_PLACEMENT: Record<string, BoardPlacement> = {
  'criteo-800x1200': { art: { x: -608, y: -183, size: 2016 } },
  'criteo-1200x1200': { art: { x: -630, y: -415, size: 2460 } },
  'criteo-1200x628': { art: { x: -52, y: -559, size: 1802 }, mask: { angle: 90, stops: [[0, 0], [0.253, 0.5], [0.468, 1], [1, 1]] } },
  'criteo-1024x768': { art: { x: -85, y: -383, size: 1594.5 }, mask: { angle: 90, stops: [[0, 0], [0.245, 0.5], [0.435, 1], [1, 1]] } },
  'criteo-768x1024': { art: { x: -559.99, y: -240.66, size: 1887.99 } },
  'criteo-480x320': { art: { x: -10, y: -161, size: 680 } },
  'criteo-468x60': { art: { x: 25, y: -66, size: 192 }, mask: { angle: 90, stops: [[-0.534, 0], [0.076, 0], [0.152, 1], [0.311, 1], [0.377, 0], [0.466, 0]] } },
  'criteo-970x250': { art: { x: 325.11, y: -261.44, size: 772.89 }, mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] } },
  'criteo-728x90': { art: { x: 38, y: -95.97, size: 281.93 }, mask: { angle: 90, stops: [[-0.547, 0], [0.063, 0], [0.148, 1], [0.299, 1], [0.365, 0], [0.453, 0]] } },
  'criteo-336x280': { art: { x: -104.77, y: -77, size: 544.76 } },
  'criteo-320x480': { art: { x: -239.44, y: -52, size: 800.44 } },
  'criteo-320x100': { art: { x: 104, y: -89.64, size: 285.27 }, mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] } },
  'criteo-320x50': { art: { x: 8, y: -50.38, size: 152.77 }, mask: { angle: 90, stops: [[-0.922, 0], [-0.03, 0], [0.082, 1], [0.315, 1], [0.411, 0], [0.541, 0]] } },
  'criteo-300x600': { art: { x: -365.99, y: -101, size: 1039.99 }, mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] } },
  'criteo-300x250': { art: { x: -94, y: -67, size: 488 } },
  'criteo-160x600': { art: { x: -208, y: 134, size: 583 }, mask: { angle: 180, stops: [[0, 0], [0.365, 0], [0.518, 1], [1, 1]] } },
  'criteo-120x600': { art: { x: -154, y: 210, size: 432 }, mask: { angle: 180, stops: [[0, 0], [0.465, 0], [0.551, 1], [1, 1]] } },
  'dv360-120x60': { art: { x: 20, y: -31, size: 131.06 }, mask: { angle: 90, stops: [[0, 0], [0.253, 0], [0.515, 1], [1, 1]] } },
  'dv360-125x125': { art: { x: -53, y: -29.5, size: 231 } },
  'dv360-120x240': { art: { x: -113, y: 0, size: 352 }, mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] } },
  'dv360-970x90': { art: { x: 168, y: -93, size: 276 }, mask: { angle: 90, stops: [[-0.451, 0], [0.189, 0], [0.265, 1], [0.369, 1], [0.444, 0], [0.598, 0]] } },
  'dv360-1200x270': { art: { x: 452.6, y: -255.89, size: 787.4 }, mask: { angle: 90, stops: [[0, 0], [0.4, 0], [0.561, 1], [1, 1]] } },
  'dv360-300x1050': { art: { x: -374.01, y: 150, size: 1056.01 }, mask: { angle: 180, stops: [[0, 0], [0.365, 0], [0.491, 1], [1, 1]] } },
  'dv360-160x600': { art: { x: -208, y: 134, size: 583 }, mask: { angle: 180, stops: [[0, 0], [0.365, 0], [0.518, 1], [1, 1]] } },
  'dv360-336x280': { art: { x: -104.77, y: -75, size: 544.76 } },
  'dv360-320x320': { art: { x: -147.99, y: -95, size: 615.99 } },
  'dv360-360x640': { art: { x: -294, y: -13, size: 948 } },
  'dv360-320x100': { art: { x: 78, y: -104, size: 309.27 }, mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] } },
  'dv360-320x50': { art: { x: 6, y: -50.38, size: 152.77 }, mask: { angle: 90, stops: [[-1.612, 0], [-0.225, 0], [-0.031, 1], [0.311, 1], [0.461, 0], [0.663, 0]] } },
  'dv360-970x250': { art: { x: 325.11, y: -261.44, size: 772.89 }, mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] } },
  'dv360-728x90': { art: { x: 48, y: -95.97, size: 281.93 }, mask: { angle: 90, stops: [[-0.556, 0], [0.092, 0], [0.183, 1], [0.343, 1], [0.413, 0], [0.507, 0]] } },
  'dv360-300x600': { art: { x: -365.99, y: -101, size: 1039.99 }, mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] } },
  'dv360-120x600': { art: { x: -154, y: 218, size: 432 }, mask: { angle: 180, stops: [[0, 0], [0.465, 0], [0.551, 1], [1, 1]] } },
  'dv360-300x250': { art: { x: -95, y: -68, size: 490 } },
  'dv360-250x250': { art: { x: -100, y: -61, size: 450 } },
  'pmax-960x1200': { art: { x: -531.5, y: -200.5, size: 2023.5 } },
  'pmax-1200x1200': { art: { x: -630, y: -415, size: 2460 } },
  'pmax-1200x628': { art: { x: -80, y: -577, size: 1802 }, mask: { angle: 90, stops: [[0, 0], [0.253, 0.5], [0.468, 1], [1, 1]] } },
  'pmax-d2c-1080x1350': { art: { x: -597.94, y: -225.56, size: 2276.44 } },
  'pmax-d2c-800x600': { art: { x: 0, y: -219, size: 1157.97 } },
  'pmax-d2c-600x800': { art: { x: -332.19, y: -100.31, size: 1264.69 } },
  'pmax-d2c-1080x1920': { art: { x: -1076, y: -398, size: 3251.44 } },
  'pmax-d2c-1200x700': { art: { x: 0, y: -466, size: 1736.95 } },
  'pmax-d2c-1080x608': { art: { x: 0, y: -442, size: 1563.26 } },
  'pmax-d2c-970x250': { art: { x: 325.11, y: -261.44, size: 772.89 }, mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] } },
  'pmax-d2c-1080x1800': { art: { x: -1024, y: -407, size: 3147.44 } },
  'pmax-d2c-1080x1080': { art: { x: -505.35, y: -296.77, size: 2091.15 } },
  'pmax-d2c-1000x1000': { art: { x: -467.92, y: -274.79, size: 1936.25 } },
  'pmax-d2c-1500x1500': { art: { x: -698, y: -436, size: 2904.38 } },
  'meta-1080x1440': { art: { x: -749, y: -360, size: 2592 } },
  'meta-398x208': { art: { x: 102, y: -72, size: 413 }, mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] } },
  'meta-1080x1920': { art: { x: -1220, y: -603, size: 3566 } },
  'meta-1080x1080': { art: { x: -414, y: -201, size: 1914 } },
  'sem-1200x1200': { art: { x: -630, y: -415, size: 2460 } },
  'sem-1200x628': { art: { x: -48, y: -556, size: 1802 }, mask: { angle: 90, stops: [[0, 0], [0.253, 0.5], [0.468, 1], [1, 1]] } },
};

/* ==================================================================== */
/* Dynamic                                                              */
/* ==================================================================== */

/**
 * `External Banner Black Friday_Key Visual_Dynamic` (`6255:145194`).
 *
 * The Dynamic (motion) asset does not run the standard 41-size paid set — its
 * board defines its own per-channel video sizes (16:9 / 1:1 / 9:16, plus 4:5
 * on Meta). One layout per ratio, shared by every channel (fingerprinted
 * identical on the board): logo, headline, subcopy, CTA and disclaimer ride
 * over the artwork exactly as on the other paid sizes. Every dimension is
 * even, which H.264 requires — these ship as mp4 with the copy layers
 * rasterised over the cut.
 *
 * Shaped as `PaidSlot`s so `PaidSlotPreview` renders them with no special
 * casing.
 */

/* ==================================================================== */
/* External Banner Black Friday_AD Benefit                              */
/* ==================================================================== */

/**
 * The Benefit cube's six product boxes, in the component's own 2000² space
 * (`Black Friday Image / AD_Benefit`, node 6338:174533, `Asset` group). The
 * boxes ride the art: frame-space rect = art.x + (bx/2000)·art.size, etc.
 */
export const AD_BENEFIT_BOXES = {
  base: 2000,
  w: 145,
  h: 138,
  xy: [[773, 913], [928, 913], [1083, 913], [773, 1059], [928, 1059], [1083, 1059]] as [number, number][],
};

/**
 * Board "External Banner Black Friday_AD Benefit" (section 6338:174302),
 * transcribed 2026-09-04. Same rules as the other boards; gradation rects that
 * sit left of the frame have their stops remapped into frame space.
 */
export const AD_BENEFIT_PLACEMENT: Record<string, BoardPlacement> = {
  'criteo-800x1200': { art: { x: -608, y: -183, size: 2016 } },
  'criteo-1200x1200': { art: { x: -630, y: -415, size: 2460 } },
  'criteo-1200x628': { art: { x: -48, y: -556, size: 1802 }, mask: { angle: 90, stops: [[0, 0], [0.253, 0.5], [0.468, 1], [1, 1]] } },
  'criteo-1024x768': { art: { x: -85, y: -377, size: 1594.5 }, mask: { angle: 90, stops: [[0, 0], [0.245, 0.5], [0.435, 1], [1, 1]] } },
  'criteo-768x1024': { art: { x: -560, y: -225, size: 1887.99 } },
  'criteo-480x320': { art: { x: -9, y: -162, size: 680 } },
  'criteo-468x60': { art: { x: 26, y: -66, size: 192 }, mask: { angle: 90, stops: [[-0.534, 0], [0.076, 0], [0.152, 1], [0.311, 1], [0.377, 0], [0.466, 0]] } },
  'criteo-970x250': { art: { x: 325.11, y: -261.44, size: 772.89 }, mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] } },
  'criteo-728x90': { art: { x: 48, y: -95.97, size: 281.93 }, mask: { angle: 90, stops: [[-0.547, 0], [0.083, 0], [0.17, 1], [0.326, 1], [0.394, 0], [0.485, 0]] } },
  'criteo-336x280': { art: { x: -104.77, y: -71, size: 544.76 } },
  'criteo-320x480': { art: { x: -258.44, y: -63, size: 836.44 } },
  'criteo-320x100': { art: { x: 80, y: -101, size: 309.27 }, mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] } },
  'criteo-320x50': { art: { x: 7, y: -50.38, size: 152.77 }, mask: { angle: 90, stops: [[-0.922, 0], [-0.03, 0], [0.082, 1], [0.315, 1], [0.411, 0], [0.541, 0]] } },
  'criteo-300x600': { art: { x: -369.99, y: -97, size: 1039.99 }, mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] } },
  'criteo-300x250': { art: { x: -95, y: -65, size: 490 } },
  'criteo-160x600': { art: { x: -211, y: 137, size: 583 }, mask: { angle: 180, stops: [[0, 0], [0.365, 0], [0.518, 1], [1, 1]] } },
  'criteo-120x600': { art: { x: -156, y: 220, size: 432 }, mask: { angle: 180, stops: [[0, 0], [0.465, 0], [0.551, 1], [1, 1]] } },
  'dv360-120x60': { art: { x: 20, y: -31, size: 131.06 }, mask: { angle: 90, stops: [[0, 0], [0.253, 0], [0.515, 1], [1, 1]] } },
  'dv360-125x125': { art: { x: -53, y: -28, size: 231 } },
  'dv360-120x240': { art: { x: -116, y: 0, size: 352 }, mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] } },
  'dv360-970x90': { art: { x: 162, y: -93, size: 276 }, mask: { angle: 90, stops: [[-0.451, 0], [0.178, 0], [0.253, 1], [0.355, 1], [0.428, 0], [0.579, 0]] } },
  'dv360-1200x270': { art: { x: 452.6, y: -255.89, size: 787.4 }, mask: { angle: 90, stops: [[0, 0], [0.454, 0], [0.616, 1], [1, 1]] } },
  'dv360-300x1050': { art: { x: -370.01, y: 175, size: 1044.01 }, mask: { angle: 180, stops: [[0, 0], [0.365, 0], [0.491, 1], [1, 1]] } },
  'dv360-160x600': { art: { x: -211, y: 127, size: 583 }, mask: { angle: 180, stops: [[0, 0], [0.365, 0], [0.518, 1], [1, 1]] } },
  'dv360-336x280': { art: { x: -104.77, y: -73, size: 544.76 } },
  'dv360-320x320': { art: { x: -147.99, y: -90, size: 615.99 } },
  'dv360-360x640': { art: { x: -352, y: -73, size: 1064 } },
  'dv360-320x100': { art: { x: 84, y: -97, size: 309.27 }, mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] } },
  'dv360-320x50': { art: { x: 6, y: -50.38, size: 152.77 }, mask: { angle: 90, stops: [[-1.612, 0], [-0.213, 0], [-0.018, 1], [0.327, 1], [0.479, 0], [0.681, 0]] } },
  'dv360-970x250': { art: { x: 325.11, y: -261.44, size: 772.89 }, mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] } },
  'dv360-728x90': { art: { x: 50, y: -95.97, size: 281.93 }, mask: { angle: 90, stops: [[-0.556, 0], [0.083, 0], [0.172, 1], [0.33, 1], [0.399, 0], [0.492, 0]] } },
  'dv360-300x600': { art: { x: -369.99, y: -97, size: 1039.99 }, mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] } },
  'dv360-120x600': { art: { x: -156, y: 210, size: 432 }, mask: { angle: 180, stops: [[0, 0], [0.465, 0], [0.551, 1], [1, 1]] } },
  'dv360-300x250': { art: { x: -113, y: -82, size: 526 } },
  'dv360-250x250': { art: { x: -100, y: -55, size: 450 } },
  'pmax-960x1200': { art: { x: -531.5, y: -200.5, size: 2023.5 } },
  'pmax-1200x1200': { art: { x: -630, y: -415, size: 2460 } },
  'pmax-1200x628': { art: { x: -64, y: -540, size: 1802 }, mask: { angle: 90, stops: [[0, 0], [0.253, 0.5], [0.468, 1], [1, 1]] } },
  'pmax-d2c-1080x1350': { art: { x: -597.94, y: -225.56, size: 2276.44 } },
  'pmax-d2c-800x600': { art: { x: 0, y: -211, size: 1157.97 } },
  'pmax-d2c-600x800': { art: { x: -332.19, y: -80, size: 1264.69 } },
  'pmax-d2c-1080x1920': { art: { x: -1121.44, y: -447, size: 3323.44 } },
  'pmax-d2c-1200x700': { art: { x: 9, y: -466, size: 1736.95 } },
  'pmax-d2c-1080x608': { art: { x: 0, y: -443, size: 1563.26 } },
  'pmax-d2c-970x250': { art: { x: 325.11, y: -261.44, size: 772.89 }, mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] } },
  'pmax-d2c-1080x1800': { art: { x: -1165.44, y: -540, size: 3411.44 } },
  'pmax-d2c-1080x1080': { art: { x: -505.35, y: -296.77, size: 2091.15 } },
  'pmax-d2c-1000x1000': { art: { x: -467.92, y: -274.79, size: 1936.25 } },
  'pmax-d2c-1500x1500': { art: { x: -701.87, y: -412.19, size: 2904.38 } },
  'meta-1080x1440': { art: { x: -753, y: -360, size: 2592 } },
  'meta-398x208': { art: { x: 102, y: -72, size: 413 }, mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] } },
  'meta-1080x1920': { art: { x: -1057, y: -375, size: 3204 } },
  'meta-1080x1080': { art: { x: -422, y: -201, size: 1930 } },
  'sem-1200x1200': { art: { x: -630, y: -415, size: 2460 } },
  'sem-1200x628': { art: { x: -52, y: -540, size: 1802 }, mask: { angle: 90, stops: [[0, 0], [0.253, 0.5], [0.468, 1], [1, 1]] } },
};

export const DYNAMIC_PAID_SLOTS: Record<string, PaidSlot[]> = (() => {
  const T = (role: PaidSlot['text'][number]['role'], x: number, y: number, w: number, h: number,
             size: number, face: 'headline' | 'text', lineHeightPct: number | null,
             trackingPct: number, align: 'left' | 'center' | 'right') =>
    ({ role, x, y, w, h, size, face, lineHeightPct, trackingPct, align });

  /** 1920×1080 — the left-hand layout (logo top-right). */
  const L_16_9 = {
    art: { x: -22, y: -825, size: 2730 },
    logo: { x: 1733, y: 75, w: 114, h: 50 },
    cta: { x: 90, y: 408, w: 136, h: 54, radius: 11.09 },
    text: [
      T('headline', 90, 80, 778, 138, 65, 'headline', 106, 0, 'left'),
      T('subcopy', 90, 232, 778, 68, 35, 'text', 106, -2, 'left'),
      T('disclaimer', 90, 979, 486, 23, 20, 'text', null, 0, 'left'),
      T('cta', 115, 425, 86, 21, 20.79, 'text', 100, 0, 'center'),
    ],
  };
  /** The centred 1080-wide layout, at three heights. */
  const L_1080 = (h: number, headY: number, subY: number, ctaY: number, discY: number) => ({
    logo: { x: 33, y: 33, w: 114, h: 50 },
    cta: { x: 447, y: ctaY, w: 196, h: 78, radius: 16 },
    text: [
      T('headline', 145, headY, 800, 144, 68, 'headline', 106, 0, 'center'),
      T('subcopy', 145, subY, 800, 60, 28, 'text', 106, 0, 'center'),
      T('disclaimer', 30, discY, 1020, 23, 20, 'text', null, 0, 'left'),
      T('cta', 483, ctaY + 24, 124, 30, 30, 'text', 100, 0, 'center'),
    ],
  });
  const L_1_1 = { art: { x: -360, y: -157, size: 1810 }, ...L_1080(1080, 95, 251, 347, 1015) };
  const L_3_4 = { art: { x: -739, y: -344, size: 2576 }, ...L_1080(1440, 113, 269, 365, 1375) };
  const L_9_16 = { art: { x: -1006, y: -400, size: 3130 }, ...L_1080(1920, 137, 293, 389, 1855) };
  const L_4_5 = { art: { x: -731, y: -382, size: 2552 }, ...L_1080(1350, 109, 265, 361, 1285) };
  /* Meta's 1:1 is back on the board (2026-09-18) and frames the art a touch
     tighter than the Criteo/Pmax square, so it takes its own row. The layout
     around it is the same 1080 stack. */
  const L_META_1_1 = { art: { x: -355, y: -148, size: 1804 }, ...L_1080(1080, 95, 251, 347, 1015) };

  const slot = (ch: string, w: number, h: number, layout: typeof L_1_1): PaidSlot =>
    ({ key: `${ch}-${w}x${h}`, w, h, ...layout });
  return {
    criteo: [slot('criteo', 1920, 1080, L_16_9 as never), slot('criteo', 1080, 1080, L_1_1), slot('criteo', 1080, 1920, L_9_16)],
    dv360: [slot('dv360', 1920, 1080, L_16_9 as never), slot('dv360', 1080, 1920, L_9_16)],
    pmax: [slot('pmax', 1920, 1080, L_16_9 as never), slot('pmax', 1080, 1920, L_9_16), slot('pmax', 1080, 1080, L_1_1)],
    meta: [slot('meta', 1080, 1440, L_3_4), slot('meta', 1080, 1920, L_9_16), slot('meta', 1080, 1350, L_4_5), slot('meta', 1080, 1080, L_META_1_1)],
  };
})();

/* ==================================================================== */
/* Lookup                                                               */
/* ==================================================================== */

/** What a size renders: where the art goes, its mask, its plates, which file. */
/* ------------------------------------------------------------------ */
/* "Only at LG.com"                                                    */
/* ------------------------------------------------------------------ */

/**
 * Where the endorsement sits on each key visual, as fractions of the 2000²
 * artwork square. Read straight off the `Black Friday Image — *` masters on
 * `Banner Template 2`, where the line is a live text layer inside the art
 * component — so unlike the LG.com boards there is ONE row per KV family and
 * every size inherits it through the art placement.
 *
 * 🔴 Membership is the allow-list. The deal-type, AD and Dynamic artworks carry
 * no tagline layer at all and must stay out, or a drawn line would print on
 * artwork that has none.
 */
const TAGLINE_MAIN: TaglineRatios       = { x: 0.4250, y: 0.5855, size: 0.0203085, figmaLineHeight: 0.0142267, w: 0.1305 };
const TAGLINE_PD_CENTRIC: TaglineRatios = { x: 0.4365, y: 0.5945, size: 0.0192970, figmaLineHeight: 0.0135180, w: 0.1240 };
/** Board 001 only. Board 002 draws the Main lockup and shares Main's row. */
const TAGLINE_PD_SLOT_1: TaglineRatios  = { x: 0.4405, y: 0.5355, size: 0.0175073, figmaLineHeight: 0.0122644, w: 0.1125 };

/**
 * Read off the Dynamic master (2026-09-18), which carries the line as live text
 * over a clean video fill — verified by hiding the text layer: nothing is left
 * behind it.
 *
 * 🔴 Dynamic's artwork is a VIDEO, so its clean cut is an mp4
 * (`kv-main-motion-clean`) rather than a still, and the choice is per channel:
 * paid draws the line live and needs the clean cut, while the `LG.com — Dynamic`
 * board has no tagline layer at all and keeps playing the delivered one. See
 * `cleanMotionId` and `motionUrl`'s `clean` argument.
 */
const TAGLINE_DYNAMIC: TaglineRatios = { x: 0.4235, y: 0.5936113, size: 0.0208532, figmaLineHeight: 0.0146082, w: 0.1340 };

const TAGLINE_BY_ASSET: Record<string, TaglineRatios> = {
  'ad-teasing': TAGLINE_DYNAMIC,
  'kv-main': TAGLINE_MAIN,
  'kv-main-character': TAGLINE_MAIN,
  'kv-product-centric-1': TAGLINE_PD_CENTRIC,
  'kv-product-centric-2': TAGLINE_PD_CENTRIC,
};

/**
 * The line's ratios for this asset at this size, or null when the artwork has
 * none. The PD Slot pair splits by board: the row-of-four sizes frame the
 * lockup higher and smaller than the 2x2 ones, which match Main.
 */
export function paidTaglineRatios(assetId: string, sizeKey: string): TaglineRatios | null {
  if (isPdSlotAsset(assetId)) {
    const p = PD_SLOT_PLACEMENT[sizeKey];
    // no placement means the size is one of the fifteen not being trafficked;
    // it falls back to the Main art framing, which is not this lockup
    return p ? (p.ver === 'v1' ? TAGLINE_PD_SLOT_1 : TAGLINE_MAIN) : null;
  }
  return TAGLINE_BY_ASSET[assetId] ?? null;
}

/** Whether any paid size draws the line for this asset. */
export const paidHasTagline = (assetId: string) =>
  assetId in TAGLINE_BY_ASSET || isPdSlotAsset(assetId);

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
  isPdSlotAsset(assetId) || PD_CENTRIC_ASSETS.has(assetId) || DEAL_AD_ASSETS.has(assetId) || assetId === AD_BENEFIT_ASSET;

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
  if (assetId === AD_BENEFIT_ASSET) return AD_BENEFIT_PLACEMENT[sizeKey] ?? null;
  return null;
}
