/**
 * Paid-media banner slots for the Key Visual _Main artworks.
 *
 * Transcribed from the Figma board "External Banner Black Friday_Key Visual_Main"
 * (file miJcDQgz0yJMskLE5a5HHj, page "Banner Template 2", 6453:21707):
 * Criteo 25, DV360 25, Pmax 3 + PMax (only D2C) 11, META 4, Google SEM 2.
 * Copy, logo and CTA are read from the Dark variant of each size's layout
 * component in "Templates & Assets"; art and soft edge from the board frame.
 *
 * Key prefixes follow the channel buttons: `pmax-d2c-*` sits under Pmax (after
 * the three original sizes), `sem-*` is the Google SEM button.
 *
 * 🔴 Placement is per SIZE, not per asset. That board carries two master
 * components — Main and Main (Character) — and every frame places the art once,
 * then chooses which master it follows. So both Key Visual _Main tiles share
 * this table and differ only in which artwork file they load.
 *
 * 15 of the 70 frames are hidden on that board (`visible = false`) — sizes that
 * are not being trafficked. They are flagged `hidden` here rather than deleted,
 * so turning one back on is a flag flip instead of re-placing its artwork. Their
 * layout components are empty, which is why they also carry no copy.
 *
 * `paidSlotsFor` returns only the visible ones; read `PAID_SLOTS` directly if
 * you need the full set.
 */

/** Where the artwork square sits inside the frame. */
export interface PaidArt { x: number; y: number; size: number }

/**
 * Soft edge on the artwork. Figma draws it as a white gradient rectangle used as
 * a mask, so the stops are an alpha ramp and `angle` is the CSS equivalent of
 * that fill's gradientTransform.
 *
 * 🔴 `gradientTransform` maps OBJECT space to GRADIENT space, not the other way
 * round: for a point (px, py) normalised to the node's box, the gradient
 * position is `t = a*px + b*py + c` from the matrix's first row. So the CSS
 * angle is `atan2(a, -b)` — 90° for the identity matrix (left to right).
 * Inverting that mapping looks right for every horizontal mask, because a
 * horizontal one comes out at 90° either way, and silently flips all seven
 * vertical ones. Every case here is axis-aligned, so the stop positions carry
 * over unchanged; only the angle differs.
 */
export interface PaidMask { angle: number; stops: [number, number][] }

export interface PaidText {
  role: 'headline' | 'subcopy' | 'disclaimer' | 'cta';
  x: number; y: number; w: number; h: number;
  size: number;
  face: 'headline' | 'text';
  /** null where Figma leaves the line height on AUTO. */
  lineHeightPct: number | null;
  trackingPct: number;
  align: 'left' | 'center' | 'right';
  /**
   * Line cap where the template stops the box from growing (a Max height or a
   * fixed-height box in Figma). Longer copy ends in an ellipsis, as it does on
   * the board. Absent means the line grows with the copy.
   */
  maxLines?: number;
}

export interface PaidSlot {
  /** `criteo-300x250` — the channel key, then the pixel size. */
  key: string;
  /** Hidden on the Figma board, so hidden in the builder. */
  hidden?: boolean;
  w: number; h: number;
  art: PaidArt;
  mask?: PaidMask;
  logo?: { x: number; y: number; w: number; h: number };
  cta?: { x: number; y: number; w: number; h: number; radius: number };
  text: PaidText[];
}

export const PAID_SLOTS: PaidSlot[] = [
  {
    key: 'criteo-970x90', hidden: true, w: 970, h: 90,
    art: { x: 589, y: -76, size: 242 },
    mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.683, 1], [0.782, 1], [0.853, 0], [1, 0]] },
    text: [],
  },
  {
    key: 'criteo-280x230', hidden: true, w: 280, h: 230,
    art: { x: -42, y: -36, size: 364 },
    text: [],
  },
  {
    key: 'criteo-360x640', hidden: true, w: 360, h: 640,
    art: { x: -246, y: 0, size: 853 },
    text: [],
  },
  {
    key: 'criteo-320x568', hidden: true, w: 320, h: 568,
    art: { x: -223, y: 0, size: 766 },
    text: [],
  },
  {
    key: 'criteo-300x300', hidden: true, w: 300, h: 300,
    art: { x: -96, y: -62, size: 491 },
    text: [],
  },
  {
    key: 'criteo-250x250', hidden: true, w: 250, h: 250,
    art: { x: -83, y: -56, size: 417 },
    text: [],
  },
  {
    key: 'criteo-200x200', hidden: true, w: 200, h: 200,
    art: { x: -66, y: -40, size: 331 },
    text: [],
  },
  {
    key: 'criteo-300x100', hidden: true, w: 300, h: 100,
    art: { x: 73, y: -85, size: 271 },
    mask: { angle: 90, stops: [[0, 0], [0.322, 0], [0.483, 1], [1, 1]] },
    text: [],
  },
  {
    key: 'criteo-800x1200', w: 800, h: 1200,
    art: { x: -647, y: -221, size: 2094 },
    logo: { x: 28, y: 34, w: 102.15, h: 45 },
    cta: { x: 294.15, y: 369, w: 211.71, h: 84.18, radius: 17.27 },
    text: [
      { role: 'headline', x: 34, y: 105, w: 732, h: 138, size: 65, face: 'headline', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'subcopy', x: 34, y: 255, w: 732, h: 80, size: 38, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 333, y: 395.09, w: 134, h: 32, size: 32.38, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 1151, w: 740, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-1200x1200', w: 1200, h: 1200,
    art: { x: -490, y: -264, size: 2180 },
    logo: { x: 33, y: 33, w: 113.5, h: 50 },
    cta: { x: 502, y: 359, w: 196, h: 78, radius: 16 },
    text: [
      { role: 'headline', x: 200, y: 87, w: 800, h: 144, size: 68, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 200, y: 243, w: 800, h: 80, size: 38, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 538, y: 383, w: 124, h: 30, size: 30, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 1135, w: 1140, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-1200x628', w: 1200, h: 628,
    art: { x: -45, y: -542, size: 1712 },
    logo: { x: 1056, y: 30, w: 113.5, h: 50 },
    cta: { x: 40, y: 307, w: 135.9, h: 54.06, radius: 11.09 },
    text: [
      { role: 'headline', x: 40, y: 46, w: 486, h: 165, size: 52, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 40, y: 225, w: 486, h: 62, size: 29, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left' },
      { role: 'cta', x: 64.95, y: 323.53, w: 86, h: 21, size: 20.79, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 40, y: 585, w: 486, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-1024x768', w: 1024, h: 768,
    art: { x: -174, y: -508, size: 1784 },
    logo: { x: 849, y: 40, w: 133.93, h: 59 },
    cta: { x: 40, y: 492, w: 203.88, h: 81.12, radius: 16.64 },
    text: [
      { role: 'headline', x: 40, y: 60, w: 389, h: 236, size: 56, face: 'headline', lineHeightPct: 106, trackingPct: 1, align: 'left' },
      { role: 'subcopy', x: 40, y: 306, w: 389, h: 152, size: 36, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left' },
      { role: 'cta', x: 77.44, y: 517.06, w: 129, h: 31, size: 31.2, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 40, y: 712, w: 389, h: 26, size: 22, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-768x1024', w: 768, h: 1024,
    art: { x: -437.99, y: -111.66, size: 1643.99 },
    logo: { x: 28, y: 34, w: 102.15, h: 45 },
    cta: { x: 282.82, y: 333, w: 202.36, h: 80.56, radius: 16.53 },
    text: [
      { role: 'headline', x: 32, y: 95, w: 704, h: 128, size: 60, face: 'headline', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'subcopy', x: 32, y: 235, w: 704, h: 68, size: 32, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 320, y: 357.78, w: 128, h: 31, size: 30.99, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 975, w: 708, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-480x320', w: 480, h: 320,
    art: { x: -62, y: -231, size: 790 },
    logo: { x: 396, y: 20, w: 63.56, h: 28 },
    cta: { x: 18, y: 234, w: 96.29, h: 38.23, radius: 7.84 },
    text: [
      { role: 'headline', x: 18, y: 24, w: 192, h: 112, size: 26, face: 'headline', lineHeightPct: 106, trackingPct: 1, align: 'left' },
      { role: 'subcopy', x: 18, y: 144, w: 192, h: 76, size: 18, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left' },
      { role: 'cta', x: 35.65, y: 245.62, w: 61, h: 15, size: 14.71, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 18, y: 291.94, w: 196, h: 14, size: 12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-468x60', w: 468, h: 60,
    art: { x: 36, y: -59, size: 176 },
    logo: { x: 10, y: 8, w: 29.67, h: 13.07 },
    cta: { x: 386, y: 19, w: 55.32, h: 22.01, radius: 4.51 },
    text: [
      { role: 'headline', x: 208, y: 5, w: 170, h: 28, size: 13, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 208, y: 37, w: 170, h: 7, size: 7, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left', maxLines: 1 },
      { role: 'cta', x: 396.16, y: 26, w: 35, h: 8, size: 8.47, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 207.33, y: 48.67, w: 241.33, h: 6, size: 5, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-970x250', w: 970, h: 250,
    art: { x: 386, y: -191.44, size: 632.89 },
    mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] },
    logo: { x: 880, y: 13, w: 68.61, h: 30.23 },
    cta: { x: 30, y: 170, w: 104.15, h: 41.33, radius: 8.48 },
    text: [
      { role: 'headline', x: 30, y: 24, w: 443, h: 76, size: 36, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 30, y: 108, w: 443, h: 42, size: 20, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left' },
      { role: 'cta', x: 49.07, y: 182.66, w: 66, h: 16, size: 15.89, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 224, w: 470, h: 16, size: 14, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-728x90', w: 728, h: 90,
    art: { x: 58, y: -79, size: 247 },
    logo: { x: 12, y: 8, w: 36.32, h: 16 },
    cta: { x: 602, y: 28.01, w: 85.37, h: 33.98, radius: 6.97 },
    text: [
      { role: 'headline', x: 332, y: 8, w: 300, h: 42, size: 20, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 332, y: 56, w: 246, h: 12, size: 11, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left', maxLines: 1 },
      { role: 'cta', x: 617.68, y: 38.5, w: 54, h: 13, size: 13.07, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 332, y: 74, w: 328, h: 8, size: 7, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-336x280', w: 336, h: 280,
    art: { x: -53, y: -23, size: 441 },
    logo: { x: 10, y: 10, w: 42.59, h: 18.76 },
    text: [
      { role: 'headline', x: 20, y: 37, w: 296, h: 50, size: 24, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 48, y: 91, w: 240, h: 29, size: 13.5, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center', maxLines: 2 },
      { role: 'disclaimer', x: 10, y: 262, w: 316, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-320x480', w: 320, h: 480,
    art: { x: -205.44, y: -10, size: 730.44 },
    logo: { x: 12, y: 12, w: 52.19, h: 22.99 },
    cta: { x: 111.85, y: 191, w: 96.29, h: 38.23, radius: 7.84 },
    text: [
      { role: 'headline', x: 16, y: 55, w: 288, h: 84, size: 26, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 16, y: 143, w: 288, h: 34, size: 16, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 129.5, y: 202.62, w: 61, h: 15, size: 14.71, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 12, y: 456, w: 296, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-320x100', w: 320, h: 100,
    art: { x: 104, y: -88, size: 277 },
    mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] },
    logo: { x: 281.19, y: 8, w: 31.18, h: 13.74 },
    cta: { x: 8, y: 64, w: 50.54, h: 20.08, radius: 4.12 },
    text: [
      { role: 'headline', x: 8, y: 10, w: 171, h: 30, size: 14, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 8, y: 43, w: 171, h: 16, size: 8, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left' },
      { role: 'cta', x: 17.27, y: 70.04, w: 32, h: 8, size: 7.72, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 8, y: 89, w: 140, h: 7, size: 6, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-320x50', w: 320, h: 50,
    art: { x: 11, y: -45, size: 140 },
    logo: { x: 6, y: 5, w: 27.04, h: 11.91 },
    cta: { x: 264, y: 16.57, w: 42.57, h: 16.87, radius: 3.46 },
    text: [
      { role: 'headline', x: 132, y: 4.44, w: 122, h: 22, size: 10, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 132, y: 28.44, w: 122, h: 6, size: 5.5, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left', maxLines: 1 },
      { role: 'cta', x: 271.79, y: 22, w: 27, h: 6, size: 6.49, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 132, y: 41, w: 176, h: 5, size: 4.5, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-300x600', w: 300, h: 600,
    art: { x: -267.99, y: 0, size: 835.99 },
    logo: { x: 10, y: 17, w: 56.81, h: 25.03 },
    cta: { x: 99.46, y: 200, w: 101.07, h: 40.16, radius: 8.24 },
    text: [
      { role: 'headline', x: 10, y: 56, w: 280, h: 90, size: 28, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 10, y: 150, w: 280, h: 34, size: 16, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 118, y: 212.58, w: 64, h: 15, size: 15.45, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 12, y: 574, w: 276, h: 14, size: 12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-300x250', w: 300, h: 250,
    art: { x: -39, y: -13, size: 379 },
    logo: { x: 10, y: 10, w: 42.18, h: 18.58 },
    text: [
      { role: 'headline', x: 20, y: 34, w: 260, h: 46, size: 22, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 20, y: 84, w: 260, h: 25.5, size: 12, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 230, w: 280, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-160x600', w: 160, h: 600,
    art: { x: -148, y: 190, size: 455 },
    logo: { x: 11, y: 12, w: 40.75, h: 17.95 },
    cta: { x: 34.24, y: 219, w: 91.51, h: 36.31, radius: 7.45 },
    text: [
      { role: 'headline', x: 12, y: 53, w: 136, h: 84, size: 20, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 12, y: 145, w: 136, h: 56, size: 13, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 51, y: 230.15, w: 58, h: 14, size: 13.96, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 578, w: 140, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-120x600', w: 120, h: 600,
    art: { x: -114, y: 253, size: 348 },
    logo: { x: 8, y: 10, w: 41.82, h: 18.42 },
    cta: { x: 24.58, y: 234, w: 70.85, h: 28, radius: 5.74 },
    text: [
      { role: 'headline', x: 10, y: 52, w: 100, h: 114, size: 18, face: 'headline', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'subcopy', x: 10, y: 172, w: 100, h: 48, size: 11, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 37.5, y: 242.5, w: 45, h: 11, size: 10.77, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 6, y: 578, w: 108, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-375x667', hidden: true, w: 375, h: 667,
    art: { x: -257, y: 0, size: 888 },
    text: [],
  },
  {
    key: 'dv360-360x592', hidden: true, w: 360, h: 592,
    art: { x: -236, y: -31, size: 831 },
    text: [],
  },
  {
    key: 'dv360-320x480', hidden: true, w: 320, h: 480,
    art: { x: -175, y: 0, size: 670 },
    text: [],
  },
  {
    key: 'dv360-800x250', hidden: true, w: 800, h: 250,
    art: { x: 210, y: -213, size: 677 },
    mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] },
    text: [],
  },
  {
    key: 'dv360-468x60', hidden: true, w: 468, h: 60,
    art: { x: 275, y: -54, size: 167 },
    mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.687, 1], [0.846, 1], [0.912, 0], [1, 0]] },
    text: [],
  },
  {
    key: 'dv360-300x50', hidden: true, w: 300, h: 50,
    art: { x: 172, y: -41, size: 133 },
    mask: { angle: 90, stops: [[0, 0], [0.562, 0], [0.68, 1], [1, 1]] },
    text: [],
  },
  {
    key: 'dv360-300x100', hidden: true, w: 300, h: 100,
    art: { x: 73, y: -85, size: 271 },
    mask: { angle: 90, stops: [[0, 0], [0.322, 0], [0.483, 1], [1, 1]] },
    text: [],
  },
  {
    key: 'dv360-120x60', w: 120, h: 60,
    art: { x: 18, y: -37, size: 140 },
    mask: { angle: 90, stops: [[0, 0], [0.253, 0], [0.515, 1], [1, 1]] },
    logo: { x: 96.38, y: 4, w: 19.62, h: 8.64 },
    text: [
      { role: 'headline', x: 6, y: 6, w: 54, h: 32, size: 8, face: 'headline', lineHeightPct: 106, trackingPct: -1, align: 'left', maxLines: 4 },
      { role: 'subcopy', x: 6, y: 41, w: 54, h: 15, size: 4.5, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left', maxLines: 3 },
    ],
  },
  {
    key: 'dv360-125x125', w: 125, h: 125,
    art: { x: -51, y: -27, size: 229 },
    logo: { x: 5.5, y: 4.3, w: 19.62, h: 8.64 },
    text: [
      { role: 'headline', x: 8, y: 16.5, w: 109, h: 20, size: 9, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 8, y: 39, w: 109, h: 10.63, size: 5, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-120x240', w: 120, h: 240,
    art: { x: -108.5, y: 7.5, size: 340.5 },
    logo: { x: 7, y: 8, w: 34.08, h: 15.01 },
    text: [
      { role: 'headline', x: 10, y: 32, w: 100, h: 52, size: 12, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 10, y: 90, w: 100, h: 24, size: 8, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'disclaimer', x: 10, y: 229, w: 100, h: 7, size: 6, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-970x90', w: 970, h: 90,
    art: { x: 184, y: -78, size: 246 },
    logo: { x: 15, y: 16, w: 65.26, h: 28.75 },
    cta: { x: 840, y: 23, w: 91.23, h: 36, radius: 7.38 },
    text: [
      { role: 'headline', x: 548, y: 8, w: 272, h: 46, size: 22, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 548, y: 58, w: 272, h: 11, size: 10.5, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left', maxLines: 1 },
      { role: 'cta', x: 856.62, y: 34, w: 58, h: 14, size: 13.85, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 548, y: 74, w: 402, h: 8, size: 7, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-1200x270', w: 1200, h: 270,
    art: { x: 473.6, y: -237.89, size: 745.4 },
    mask: { angle: 90, stops: [[0, 0], [0.346, 0.5], [0.522, 1], [1, 1]] },
    logo: { x: 1113.39, y: 13, w: 68.61, h: 30.23 },
    cta: { x: 30, y: 163, w: 103.85, h: 41, radius: 8.41 },
    text: [
      { role: 'headline', x: 30, y: 23, w: 489, h: 76, size: 36, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 30, y: 105, w: 489, h: 42, size: 20, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left' },
      { role: 'cta', x: 48.92, y: 175.5, w: 66, h: 16, size: 15.77, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 244, w: 533, h: 16, size: 14, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-300x1050', w: 300, h: 1050,
    art: { x: -252.99, y: 296, size: 807.99 },
    logo: { x: 10, y: 17, w: 56.81, h: 25.03 },
    cta: { x: 94.69, y: 323.01, w: 110.62, h: 44, radius: 9.03 },
    text: [
      { role: 'headline', x: 20, y: 74.01, w: 260, h: 152, size: 36, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 20, y: 236.01, w: 260, h: 63, size: 20, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 115, y: 336.51, w: 70, h: 17, size: 16.92, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 12, y: 1024, w: 276, h: 14, size: 12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-160x600', w: 160, h: 600,
    art: { x: -146, y: 195, size: 456 },
    logo: { x: 11, y: 12, w: 40.75, h: 17.95 },
    cta: { x: 34.24, y: 219, w: 91.51, h: 36.31, radius: 7.45 },
    text: [
      { role: 'headline', x: 12, y: 53, w: 136, h: 84, size: 20, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 12, y: 145, w: 136, h: 56, size: 13, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 51, y: 230.15, w: 58, h: 14, size: 13.96, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 578, w: 140, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-336x280', w: 336, h: 280,
    art: { x: -63, y: -35, size: 462 },
    logo: { x: 10, y: 10, w: 42.59, h: 18.76 },
    text: [
      { role: 'headline', x: 20, y: 37, w: 296, h: 50, size: 24, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 48, y: 91, w: 240, h: 29, size: 13.5, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center', maxLines: 2 },
      { role: 'disclaimer', x: 10, y: 262, w: 316, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-320x320', w: 320, h: 320,
    art: { x: -122.99, y: -66, size: 565.99 },
    logo: { x: 10.67, y: 10.67, w: 49.64, h: 21.87 },
    text: [
      { role: 'headline', x: 20, y: 40.53, w: 280, h: 48, size: 23, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 20, y: 92.53, w: 280, h: 28, size: 13, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 12, y: 298, w: 296, h: 12, size: 10.67, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-360x640', w: 360, h: 640,
    art: { x: -264, y: 9, size: 888 },
    logo: { x: 14, y: 18, w: 59.02, h: 26 },
    cta: { x: 119.22, y: 232, w: 121.56, h: 48.28, radius: 9.9 },
    text: [
      { role: 'headline', x: 18, y: 66, w: 324, h: 102, size: 32, face: 'headline', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'subcopy', x: 18, y: 174, w: 324, h: 40, size: 19, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 141.5, y: 246.64, w: 77, h: 19, size: 18.57, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 20, y: 610, w: 320, h: 14, size: 12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-320x100', w: 320, h: 100,
    art: { x: 107, y: -88, size: 276.28 },
    mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] },
    logo: { x: 281.19, y: 8, w: 31.18, h: 13.74 },
    cta: { x: 8, y: 64, w: 50.54, h: 20.08, radius: 4.12 },
    text: [
      { role: 'headline', x: 8, y: 10, w: 171, h: 30, size: 14, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 8, y: 43, w: 171, h: 16, size: 8, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left' },
      { role: 'cta', x: 17.27, y: 70.04, w: 32, h: 8, size: 7.72, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 8, y: 89, w: 140, h: 7, size: 6, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-320x50', w: 320, h: 50,
    art: { x: 14, y: -45, size: 140.38 },
    logo: { x: 6, y: 5, w: 27.04, h: 11.91 },
    cta: { x: 264, y: 16.57, w: 42.57, h: 16.87, radius: 3.46 },
    text: [
      { role: 'headline', x: 132, y: 4.44, w: 122, h: 22, size: 10, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 132, y: 28.44, w: 122, h: 6, size: 5.5, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left', maxLines: 1 },
      { role: 'cta', x: 271.79, y: 22, w: 27, h: 6, size: 6.49, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 132, y: 41, w: 176, h: 5, size: 4.5, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-970x250', w: 970, h: 250,
    art: { x: 368, y: -218, size: 686 },
    logo: { x: 880, y: 13, w: 68.61, h: 30.23 },
    cta: { x: 30, y: 170, w: 104.15, h: 41.33, radius: 8.48 },
    text: [
      { role: 'headline', x: 30, y: 24, w: 443, h: 76, size: 36, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 30, y: 108, w: 443, h: 42, size: 20, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left' },
      { role: 'cta', x: 49.07, y: 182.66, w: 66, h: 16, size: 15.89, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 224, w: 470, h: 16, size: 14, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-728x90', w: 728, h: 90,
    art: { x: 66, y: -77.96, size: 245.92 },
    logo: { x: 12, y: 8, w: 36.32, h: 16 },
    cta: { x: 602, y: 28.01, w: 85.37, h: 33.98, radius: 6.97 },
    text: [
      { role: 'headline', x: 332, y: 8, w: 300, h: 42, size: 20, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 332, y: 56, w: 246, h: 12, size: 11, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left', maxLines: 1 },
      { role: 'cta', x: 617.68, y: 38.5, w: 54, h: 13, size: 13.07, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 332, y: 74, w: 328, h: 8, size: 7, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-300x600', w: 300, h: 600,
    art: { x: -260, y: 9, size: 822 },
    logo: { x: 10, y: 17, w: 56.81, h: 25.03 },
    cta: { x: 99.46, y: 200, w: 101.07, h: 40.16, radius: 8.24 },
    text: [
      { role: 'headline', x: 10, y: 56, w: 280, h: 90, size: 28, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 10, y: 150, w: 280, h: 34, size: 16, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 118, y: 212.58, w: 64, h: 15, size: 15.45, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 12, y: 574, w: 276, h: 14, size: 12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-120x600', w: 120, h: 600,
    art: { x: -112.66, y: 254, size: 349.66 },
    logo: { x: 8, y: 10, w: 41.82, h: 18.42 },
    cta: { x: 24.58, y: 234, w: 70.85, h: 28, radius: 5.74 },
    text: [
      { role: 'headline', x: 10, y: 52, w: 100, h: 114, size: 18, face: 'headline', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'subcopy', x: 10, y: 172, w: 100, h: 48, size: 11, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 37.5, y: 242.5, w: 45, h: 11, size: 10.77, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 6, y: 578, w: 108, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-300x250', w: 300, h: 250,
    art: { x: -57.01, y: -27, size: 414.01 },
    logo: { x: 10, y: 10, w: 42.18, h: 18.58 },
    text: [
      { role: 'headline', x: 20, y: 34, w: 260, h: 46, size: 22, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 20, y: 84, w: 260, h: 25.5, size: 12, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 230, w: 280, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-250x250', w: 250, h: 250,
    art: { x: -82, y: -38, size: 420 },
    logo: { x: 10, y: 10, w: 35.19, h: 15.5 },
    text: [
      { role: 'headline', x: 10, y: 33, w: 230, h: 38, size: 18, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 10, y: 75, w: 230, h: 21.25, size: 10, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 230, w: 230, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-960x1200', w: 960, h: 1200,
    art: { x: -513.5, y: -175.5, size: 1987.5 },
    logo: { x: 34, y: 33, w: 122.58, h: 54 },
    cta: { x: 379.61, y: 376, w: 200.78, h: 79.93, radius: 16.4 },
    text: [
      { role: 'headline', x: 80, y: 118, w: 800, h: 140, size: 66, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 80, y: 266, w: 800, h: 80, size: 38, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 416.5, y: 400.46, w: 127, h: 31, size: 30.74, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 35, y: 1151, w: 890, h: 26, size: 22, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-1200x1200', w: 1200, h: 1200,
    art: { x: -434.5, y: -219.75, size: 2077.5 },
    logo: { x: 33, y: 33, w: 113.5, h: 50 },
    cta: { x: 502, y: 359, w: 196, h: 78, radius: 16 },
    text: [
      { role: 'headline', x: 200, y: 87, w: 800, h: 144, size: 68, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 200, y: 243, w: 800, h: 80, size: 38, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 538, y: 383, w: 124, h: 30, size: 30, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 1135, w: 1140, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-1200x628', w: 1200, h: 628,
    art: { x: 40, y: -479, size: 1606.95 },
    logo: { x: 1056, y: 30, w: 113.5, h: 50 },
    cta: { x: 40, y: 307, w: 135.9, h: 54.06, radius: 11.09 },
    text: [
      { role: 'headline', x: 40, y: 46, w: 486, h: 165, size: 52, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 40, y: 225, w: 486, h: 62, size: 29, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left' },
      { role: 'cta', x: 64.95, y: 323.53, w: 86, h: 21, size: 20.79, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 40, y: 585, w: 486, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-1080x1350', w: 1080, h: 1350,
    art: { x: -578, y: -197, size: 2235.38 },
    logo: { x: 38.25, y: 37.13, w: 137.9, h: 60.75 },
    cta: { x: 435, y: 421.3, w: 210, h: 89.92, radius: 18.45 },
    text: [
      { role: 'headline', x: 90, y: 132.75, w: 900, h: 154.96, size: 74.25, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 140, y: 296.71, w: 800, h: 90.84, size: 42.75, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 476.5, y: 450.76, w: 127, h: 31, size: 34.58, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 39.38, y: 1294.88, w: 1001.25, h: 29.25, size: 24.75, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-800x600', w: 800, h: 600,
    art: { x: 52, y: -165, size: 1020.14 },
    logo: { x: 685.08, y: 23.94, w: 90.58, h: 39.9 },
    cta: { x: 31.92, y: 245.53, w: 108.83, h: 47, radius: 8.85 },
    text: [
      { role: 'headline', x: 31.92, y: 36.71, w: 387.87, h: 131.68, size: 41.5, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 31.92, y: 179.57, w: 387.87, h: 50, size: 23.14, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left' },
      { role: 'cta', x: 51.84, y: 260.53, w: 69, h: 17, size: 16.59, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 31.92, y: 565.68, w: 387.87, h: 18.36, size: 15.96, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-600x800', w: 600, h: 800,
    art: { x: -321, y: -84, size: 1241.88 },
    logo: { x: 21.25, y: 20.63, w: 76.61, h: 33.75 },
    cta: { x: 236.94, y: 238.59, w: 126.11, h: 53, radius: 10.25 },
    text: [
      { role: 'headline', x: 50, y: 73.75, w: 500, h: 86.09, size: 41.25, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 50, y: 169.84, w: 500, h: 50, size: 23.75, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 260, y: 255.59, w: 80, h: 19, size: 19.21, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 21.88, y: 769.38, w: 556.25, h: 16.25, size: 13.75, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-1080x1920', w: 1080, h: 1920,
    art: { x: -902.37, y: -240.37, size: 2892.37 },
    logo: { x: 38.25, y: 37.13, w: 137.9, h: 60.75 },
    cta: { x: 435, y: 420.46, w: 210, h: 89.92, radius: 18.45 },
    text: [
      { role: 'headline', x: 90, y: 132.75, w: 900, h: 154.96, size: 74.25, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 90, y: 296.71, w: 900, h: 90, size: 42.75, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 476.5, y: 449.92, w: 127, h: 31, size: 34.58, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 39.38, y: 1864.88, w: 1001.25, h: 29.25, size: 24.75, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-1200x700', w: 1200, h: 700,
    art: { x: -29, y: -531, size: 1769.15 },
    logo: { x: 1047.97, y: 31.67, w: 119.83, h: 52.79 },
    cta: { x: 42.23, y: 324.12, w: 138.69, h: 57.08, radius: 11.71 },
    text: [
      { role: 'headline', x: 42.23, y: 48.57, w: 513.1, h: 174.2, size: 54.9, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 42.23, y: 237.55, w: 513.1, h: 65.46, size: 30.62, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left' },
      { role: 'cta', x: 68.57, y: 342.16, w: 86, h: 21, size: 21.95, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 42.23, y: 654.6, w: 513.1, h: 24.28, size: 21.12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-1080x608', w: 1080, h: 608,
    art: { x: 30, y: -438, size: 1518.3 },
    logo: { x: 945.58, y: 28, w: 105.95, h: 46.67 },
    cta: { x: 37.34, y: 286.57, w: 127.58, h: 53, radius: 10.35 },
    text: [
      { role: 'headline', x: 37.34, y: 42.94, w: 453.66, h: 154.02, size: 48.54, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 37.34, y: 210.03, w: 453.66, h: 57.87, size: 27.07, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left' },
      { role: 'cta', x: 60.63, y: 303.57, w: 81, h: 19, size: 19.41, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 37.34, y: 567.86, w: 453.66, h: 21.47, size: 18.67, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-970x250', w: 970, h: 250,
    art: { x: 386, y: -191.44, size: 632.89 },
    mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] },
    logo: { x: 880, y: 13, w: 68.61, h: 30.23 },
    cta: { x: 30, y: 170, w: 104.15, h: 41.33, radius: 8.48 },
    text: [
      { role: 'headline', x: 30, y: 24, w: 443, h: 76, size: 36, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 30, y: 108, w: 443, h: 42, size: 20, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left' },
      { role: 'cta', x: 49.07, y: 182.66, w: 66, h: 16, size: 15.89, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 224, w: 470, h: 16, size: 14, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-1080x1800', w: 1080, h: 1800,
    art: { x: -902.37, y: -296, size: 2884.37 },
    logo: { x: 38.25, y: 37.13, w: 137.9, h: 60.75 },
    cta: { x: 435, y: 422.46, w: 210, h: 89.92, radius: 18.45 },
    text: [
      { role: 'headline', x: 90, y: 132.75, w: 900, h: 154.96, size: 74.25, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 90, y: 298.71, w: 900, h: 90, size: 42.75, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 476.5, y: 451.92, w: 127, h: 31, size: 34.58, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 39.38, y: 1744.88, w: 1001.25, h: 29.25, size: 24.75, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-1080x1080', w: 1080, h: 1080,
    art: { x: -391, y: -198, size: 1869.3 },
    logo: { x: 29.7, y: 29.7, w: 102.15, h: 45 },
    cta: { x: 451.8, y: 321.46, w: 176.4, h: 70.2, radius: 14.4 },
    text: [
      { role: 'headline', x: 180, y: 78.3, w: 720, h: 127.96, size: 61.2, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 180, y: 217.06, w: 720, h: 72, size: 34.2, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 484.2, y: 343.06, w: 111.6, h: 27, size: 27, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 27, y: 1021.5, w: 1026, h: 20.7, size: 18, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-1000x1000', w: 1000, h: 1000,
    art: { x: -362, y: -183, size: 1730.83 },
    logo: { x: 27.5, y: 27.5, w: 94.58, h: 41.67 },
    cta: { x: 418.33, y: 297.65, w: 163.33, h: 65, radius: 13.33 },
    text: [
      { role: 'headline', x: 166.67, y: 72.5, w: 666.67, h: 118.48, size: 56.67, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 166.67, y: 200.98, w: 666.67, h: 66.67, size: 31.67, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 448.33, y: 317.65, w: 103.33, h: 25, size: 25, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 25, y: 945.83, w: 950, h: 19.17, size: 16.67, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-d2c-1500x1500', w: 1500, h: 1500,
    art: { x: -542, y: -275, size: 2596.25 },
    logo: { x: 41.25, y: 41.25, w: 141.88, h: 62.5 },
    cta: { x: 627.5, y: 446.48, w: 245, h: 97.5, radius: 20 },
    text: [
      { role: 'headline', x: 250, y: 108.75, w: 1000, h: 177.73, size: 85, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 250, y: 301.48, w: 1000, h: 100, size: 47.5, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 672.5, y: 476.48, w: 155, h: 37.5, size: 37.5, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 37.5, y: 1418.75, w: 1425, h: 28.75, size: 25, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'meta-1080x1440', w: 1080, h: 1440,
    art: { x: -744, y: -333, size: 2572 },
    logo: { x: 33, y: 33, w: 113.5, h: 50 },
    cta: { x: 447, y: 385, w: 196, h: 78, radius: 16 },
    text: [
      { role: 'headline', x: 145, y: 113, w: 800, h: 144, size: 68, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 145, y: 269, w: 800, h: 80, size: 38, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 483, y: 409, w: 124, h: 30, size: 30, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 1375, w: 1020, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'meta-1080x1080', w: 1080, h: 1080,
    art: { x: -376, y: -168.5, size: 1836 },
    logo: { x: 33, y: 33, w: 113.5, h: 50 },
    cta: { x: 447, y: 347, w: 196, h: 78, radius: 16 },
    text: [
      { role: 'headline', x: 145, y: 95, w: 800, h: 144, size: 68, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 145, y: 251, w: 800, h: 60, size: 28, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 483, y: 371, w: 124, h: 30, size: 30, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 1015, w: 1020, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'meta-398x208', w: 398, h: 208,
    art: { x: 77, y: -114, size: 469 },
    mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] },
    logo: { x: 341, y: 10, w: 46.54, h: 20.5 },
    cta: { x: 20, y: 131, w: 100.92, h: 40, radius: 8.21 },
    text: [
      { role: 'headline', x: 20, y: 20, w: 207, h: 69, size: 22, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 20, y: 95, w: 207, h: 26, size: 12, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left' },
      { role: 'cta', x: 38.46, y: 143.5, w: 64, h: 15, size: 15.38, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 20, y: 186, w: 366, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'meta-1080x1920', w: 1080, h: 1920,
    art: { x: -950, y: -347, size: 3000 },
    logo: { x: 33, y: 33, w: 113.5, h: 50 },
    cta: { x: 447, y: 389, w: 196, h: 78, radius: 16 },
    text: [
      { role: 'headline', x: 145, y: 137, w: 800, h: 144, size: 68, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 145, y: 293, w: 800, h: 60, size: 28, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 483, y: 413, w: 124, h: 30, size: 30, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 1855, w: 1020, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'sem-1200x1200', w: 1200, h: 1200,
    art: { x: -434.5, y: -219.75, size: 2077.5 },
    logo: { x: 33, y: 33, w: 113.5, h: 50 },
    cta: { x: 502, y: 359, w: 196, h: 78, radius: 16 },
    text: [
      { role: 'headline', x: 200, y: 87, w: 800, h: 144, size: 68, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 200, y: 243, w: 800, h: 80, size: 38, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 538, y: 383, w: 124, h: 30, size: 30, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 30, y: 1135, w: 1140, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'sem-1200x628', w: 1200, h: 628,
    art: { x: 0, y: -489.48, size: 1606.95 },
    logo: { x: 1056, y: 30, w: 113.5, h: 50 },
    cta: { x: 40, y: 307, w: 135.9, h: 54.06, radius: 11.09 },
    text: [
      { role: 'headline', x: 40, y: 46, w: 486, h: 165, size: 52, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 40, y: 225, w: 486, h: 62, size: 29, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left' },
      { role: 'cta', x: 64.95, y: 323.53, w: 86, h: 21, size: 20.79, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 40, y: 585, w: 486, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
];

/**
 * The paid boards carry their own placeholder copy — longer than the LG.com
 * board's, and that changes where every line breaks. Using the LG.com strings
 * here made the copy wrap differently from Figma at every size, which is exactly
 * the thing these previews exist to check. Read verbatim from the board; every
 * visible size uses the same four strings.
 */
export const PAID_PLACEHOLDER = {
  headline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
  subcopy: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod',
  disclaimer: '*T&C\u2019s apply',
  cta: 'Shop now',
} as const;

export const paidSlotsFor = (channelKey: string): PaidSlot[] =>
  PAID_SLOTS.filter(s => !s.hidden && s.key.startsWith(channelKey + '-'));

/** Label under each preview, e.g. `300×250`. */
export const paidSlotLabel = (s: PaidSlot) => `${s.w}×${s.h}`;
