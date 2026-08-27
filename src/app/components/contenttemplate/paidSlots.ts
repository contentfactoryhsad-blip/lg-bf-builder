/**
 * Paid-media banner slots for the Key Visual _Main artworks.
 *
 * Transcribed from the Figma board "External Banner Black Friday_Main"
 * (file miJcDQgz0yJMskLE5a5HHj, section 6080:46054, "Dark mode"):
 * Criteo 25, DV360 25, Pmax 3, META 3.
 *
 * 🔴 Placement is per SIZE, not per asset. That board carries two master
 * components — Main and Main (Character) — and every frame places the art once,
 * then chooses which master it follows. So both Key Visual _Main tiles share
 * this table and differ only in which artwork file they load.
 *
 * 15 of the 56 frames are hidden on that board (`visible = false`) — sizes that
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
    logo: { x: 28, y: 34, w: 102, h: 45 },
    cta: { x: 294, y: 369, w: 212, h: 84, radius: 17.27 },
    text: [
      { role: 'disclaimer', x: 30, y: 1151, w: 740, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 34, y: 105, w: 732, h: 138, size: 65, face: 'headline', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'subcopy', x: 34, y: 255, w: 732, h: 80, size: 38, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 333, y: 395, w: 134, h: 32, size: 32.38, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-1200x1200', w: 1200, h: 1200,
    art: { x: -490, y: -264, size: 2180 },
    logo: { x: 33, y: 33, w: 114, h: 50 },
    cta: { x: 502, y: 359, w: 196, h: 78, radius: 16 },
    text: [
      { role: 'disclaimer', x: 30, y: 1135, w: 1140, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 200, y: 87, w: 800, h: 144, size: 68, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 200, y: 243, w: 800, h: 80, size: 38, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 538, y: 383, w: 124, h: 30, size: 30, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-1200x628', w: 1200, h: 628,
    art: { x: -45, y: -542, size: 1712 },
    mask: { angle: 90, stops: [[0, 0], [0.253, 0.5], [0.468, 1], [1, 1]] },
    logo: { x: 1056, y: 30, w: 114, h: 50 },
    cta: { x: 40, y: 307, w: 136, h: 54, radius: 11.09 },
    text: [
      { role: 'disclaimer', x: 40, y: 585, w: 486, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 40, y: 46, w: 486, h: 165, size: 52, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 40, y: 225, w: 486, h: 62, size: 29, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left' },
      { role: 'cta', x: 65, y: 324, w: 86, h: 21, size: 20.79, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-1024x768', w: 1024, h: 768,
    art: { x: -117, y: -423, size: 1614 },
    mask: { angle: 90, stops: [[0, 0], [0.245, 0.5], [0.435, 1], [1, 1]] },
    logo: { x: 41, y: 40, w: 136, h: 60 },
    cta: { x: 40, y: 402, w: 204, h: 81, radius: 16.64 },
    text: [
      { role: 'disclaimer', x: 40, y: 712, w: 389, h: 26, size: 22, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 40, y: 132, w: 389, h: 236, size: 56, face: 'headline', lineHeightPct: 106, trackingPct: 1, align: 'left' },
      { role: 'cta', x: 77, y: 427, w: 129, h: 31, size: 31.2, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-768x1024', w: 768, h: 1024,
    art: { x: -438, y: -112, size: 1644 },
    logo: { x: 28, y: 34, w: 102, h: 45 },
    cta: { x: 283, y: 333, w: 202, h: 81, radius: 16.53 },
    text: [
      { role: 'disclaimer', x: 30, y: 975, w: 708, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 32, y: 95, w: 704, h: 128, size: 60, face: 'headline', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'subcopy', x: 32, y: 235, w: 704, h: 68, size: 32, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 320, y: 358, w: 128, h: 31, size: 30.99, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-480x320', w: 480, h: 320,
    art: { x: -68, y: -233, size: 786 },
    logo: { x: 18, y: 19, w: 64, h: 28 },
    cta: { x: 18, y: 187, w: 96, h: 38, radius: 7.84 },
    text: [
      { role: 'disclaimer', x: 18, y: 292, w: 196, h: 14, size: 12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 18, y: 61, w: 192, h: 112, size: 26, face: 'headline', lineHeightPct: 106, trackingPct: 1, align: 'left' },
      { role: 'cta', x: 36, y: 199, w: 61, h: 15, size: 14.71, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-468x60', w: 468, h: 60,
    art: { x: 291, y: -51, size: 162 },
    mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.687, 1], [0.846, 1], [0.912, 0], [1, 0]] },
    logo: { x: 431, y: 8, w: 30, h: 13 },
    cta: { x: 238, y: 19, w: 55, h: 22, radius: 4.51 },
    text: [
      { role: 'disclaimer', x: 13, y: 47, w: 281, h: 8, size: 6.67, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 14, y: 5, w: 210, h: 34, size: 16, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 248, y: 26, w: 35, h: 8, size: 8.47, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-970x250', w: 970, h: 250,
    art: { x: 386, y: -191, size: 633 },
    mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] },
    logo: { x: 880, y: 13, w: 69, h: 30 },
    cta: { x: 30, y: 120, w: 104, h: 41, radius: 8.48 },
    text: [
      { role: 'disclaimer', x: 30, y: 224, w: 470, h: 16, size: 14, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 30, y: 24, w: 443, h: 76, size: 36, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 49, y: 133, w: 66, h: 16, size: 15.89, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-728x90', w: 728, h: 90,
    art: { x: 441, y: -73, size: 236 },
    mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.695, 1], [0.846, 1], [0.912, 0], [1, 0]] },
    logo: { x: 682, y: 8, w: 36, h: 16 },
    cta: { x: 344, y: 28, w: 85, h: 34, radius: 6.97 },
    text: [
      { role: 'disclaimer', x: 20, y: 70, w: 389, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 20, y: 8, w: 300, h: 50, size: 24, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 360, y: 39, w: 54, h: 13, size: 13.07, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-336x280', w: 336, h: 280,
    art: { x: -81, y: -67, size: 497 },
    logo: { x: 10, y: 10, w: 43, h: 19 },
    text: [
      { role: 'headline', x: 20, y: 37, w: 296, h: 50, size: 24, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 262, w: 316, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-320x480', w: 320, h: 480,
    art: { x: -205, y: -34, size: 730 },
    logo: { x: 12, y: 12, w: 52, h: 23 },
    cta: { x: 112, y: 153, w: 96, h: 38, radius: 7.84 },
    text: [
      { role: 'disclaimer', x: 12, y: 456, w: 296, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 16, y: 55, w: 288, h: 84, size: 26, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 130, y: 165, w: 61, h: 15, size: 14.71, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-320x100', w: 320, h: 100,
    art: { x: 93, y: -77, size: 253 },
    mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] },
    logo: { x: 281, y: 8, w: 31, h: 14 },
    cta: { x: 8, y: 61, w: 51, h: 20, radius: 4.12 },
    text: [
      { role: 'disclaimer', x: 8, y: 87, w: 140, h: 9, size: 8, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 8, y: 10, w: 140, h: 45, size: 14, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 17, y: 67, w: 32, h: 8, size: 7.72, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-320x50', w: 320, h: 50,
    art: { x: 187, y: -41, size: 133 },
    mask: { angle: 90, stops: [[0, 0], [0.586, 0], [0.71, 1], [1, 1]] },
    logo: { x: 288, y: 5, w: 27, h: 12 },
    cta: { x: 162, y: 17, w: 43, h: 17, radius: 3.46 },
    text: [
      { role: 'disclaimer', x: 10, y: 37, w: 197, h: 9, size: 8, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 10, y: 4, w: 142, h: 26, size: 12, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 170, y: 22, w: 27, h: 6, size: 6.49, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-300x600', w: 300, h: 600,
    art: { x: -268, y: -29, size: 836 },
    logo: { x: 10, y: 17, w: 57, h: 25 },
    cta: { x: 99, y: 162, w: 101, h: 40, radius: 8.24 },
    text: [
      { role: 'disclaimer', x: 12, y: 574, w: 276, h: 14, size: 12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 10, y: 56, w: 280, h: 90, size: 28, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 118, y: 175, w: 64, h: 15, size: 15.45, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-300x250', w: 300, h: 250,
    art: { x: -69, y: -55, size: 438 },
    logo: { x: 10, y: 10, w: 42, h: 19 },
    text: [
      { role: 'headline', x: 20, y: 34, w: 260, h: 46, size: 22, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 230, w: 280, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'criteo-160x600', w: 160, h: 600,
    art: { x: -148, y: 137, size: 455 },
    mask: { angle: 180, stops: [[0, 0], [0.365, 0], [0.518, 1], [1, 1]] },
    logo: { x: 11, y: 12, w: 41, h: 18 },
    cta: { x: 34, y: 155, w: 92, h: 36, radius: 7.45 },
    text: [
      { role: 'disclaimer', x: 10, y: 578, w: 140, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 12, y: 53, w: 136, h: 84, size: 20, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 51, y: 166, w: 58, h: 14, size: 13.96, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'criteo-120x600', w: 120, h: 600,
    art: { x: -114, y: 208, size: 348 },
    mask: { angle: 180, stops: [[0, 0], [0.465, 0], [0.551, 1], [1, 1]] },
    logo: { x: 8, y: 10, w: 42, h: 18 },
    cta: { x: 25, y: 180, w: 71, h: 28, radius: 5.74 },
    text: [
      { role: 'disclaimer', x: 6, y: 578, w: 108, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 10, y: 52, w: 100, h: 114, size: 18, face: 'headline', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 38, y: 189, w: 45, h: 11, size: 10.77, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
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
    art: { x: 24, y: -29, size: 123 },
    mask: { angle: 90, stops: [[0, 0], [0.253, 0], [0.515, 1], [1, 1]] },
    logo: { x: 96, y: 4, w: 20, h: 9 },
    text: [
      { role: 'headline', x: 6, y: 6, w: 54, h: 32, size: 8, face: 'headline', lineHeightPct: 106, trackingPct: -1, align: 'left' },
    ],
  },
  {
    key: 'dv360-125x125', w: 125, h: 125,
    art: { x: -49, y: -31, size: 223 },
    logo: { x: 6, y: 4, w: 20, h: 9 },
    text: [
      { role: 'headline', x: 8, y: 17, w: 109, h: 20, size: 9, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-120x240', w: 120, h: 240,
    art: { x: -116, y: -21, size: 356 },
    mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] },
    logo: { x: 7, y: 8, w: 34, h: 15 },
    text: [
      { role: 'headline', x: 10, y: 32, w: 100, h: 52, size: 12, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 229, w: 100, h: 7, size: 6, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-970x90', w: 970, h: 90,
    art: { x: 573, y: -78, size: 246 },
    mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.683, 1], [0.782, 1], [0.853, 0], [1, 0]] },
    logo: { x: 885, y: 31, w: 65, h: 29 },
    cta: { x: 388, y: 27, w: 91, h: 36, radius: 7.38 },
    text: [
      { role: 'disclaimer', x: 20, y: 70, w: 471, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 20, y: 8, w: 340, h: 50, size: 24, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 405, y: 38, w: 58, h: 14, size: 13.85, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-1200x270', w: 1200, h: 270,
    art: { x: 474, y: -238, size: 745 },
    mask: { angle: 90, stops: [[0, 0], [0.346, 0.5], [0.522, 1], [1, 1]] },
    logo: { x: 1113, y: 13, w: 69, h: 30 },
    cta: { x: 30, y: 163, w: 104, h: 41, radius: 8.41 },
    text: [
      { role: 'disclaimer', x: 30, y: 244, w: 533, h: 16, size: 14, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 30, y: 23, w: 489, h: 76, size: 36, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 30, y: 105, w: 489, h: 42, size: 20, face: 'text', lineHeightPct: 106, trackingPct: -1, align: 'left' },
      { role: 'cta', x: 49, y: 176, w: 66, h: 16, size: 15.77, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-300x1050', w: 300, h: 1050,
    art: { x: -253, y: 206, size: 808 },
    mask: { angle: 180, stops: [[0, 0], [0.365, 0], [0.491, 1], [1, 1]] },
    logo: { x: 10, y: 17, w: 57, h: 25 },
    cta: { x: 95, y: 250, w: 111, h: 44, radius: 9.03 },
    text: [
      { role: 'disclaimer', x: 12, y: 1024, w: 276, h: 14, size: 12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 20, y: 74, w: 260, h: 152, size: 36, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 115, y: 264, w: 70, h: 17, size: 16.92, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-160x600', w: 160, h: 600,
    art: { x: -146, y: 156, size: 456 },
    mask: { angle: 180, stops: [[0, 0], [0.365, 0], [0.518, 1], [1, 1]] },
    logo: { x: 11, y: 12, w: 41, h: 18 },
    cta: { x: 34, y: 155, w: 91, h: 36, radius: 7.38 },
    text: [
      { role: 'disclaimer', x: 10, y: 578, w: 140, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 12, y: 53, w: 136, h: 84, size: 20, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 51, y: 166, w: 58, h: 14, size: 13.85, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-336x280', w: 336, h: 280,
    art: { x: -96, y: -82, size: 528 },
    logo: { x: 10, y: 10, w: 43, h: 19 },
    text: [
      { role: 'headline', x: 20, y: 37, w: 296, h: 50, size: 24, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 262, w: 316, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-320x320', w: 320, h: 320,
    art: { x: -150, y: -110, size: 620 },
    logo: { x: 11, y: 11, w: 50, h: 22 },
    text: [
      { role: 'headline', x: 20, y: 41, w: 280, h: 48, size: 23, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 12, y: 298, w: 296, h: 12, size: 10.67, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-360x640', w: 360, h: 640,
    art: { x: -264, y: -13, size: 888 },
    logo: { x: 14, y: 18, w: 59, h: 26 },
    cta: { x: 119, y: 186, w: 121, h: 48, radius: 9.85 },
    text: [
      { role: 'disclaimer', x: 20, y: 610, w: 320, h: 14, size: 12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 18, y: 66, w: 324, h: 102, size: 32, face: 'headline', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 142, y: 201, w: 77, h: 18, size: 18.46, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-320x100', w: 320, h: 100,
    art: { x: 77, y: -87, size: 273 },
    mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] },
    logo: { x: 281, y: 8, w: 31, h: 14 },
    cta: { x: 8, y: 61, w: 50, h: 20, radius: 4.1 },
    text: [
      { role: 'disclaimer', x: 8, y: 87, w: 140, h: 9, size: 8, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 8, y: 10, w: 140, h: 45, size: 14, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 17, y: 67, w: 32, h: 8, size: 7.69, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-320x50', w: 320, h: 50,
    art: { x: 185, y: -43, size: 137 },
    mask: { angle: 90, stops: [[0, 0], [0.586, 0], [0.71, 1], [1, 1]] },
    logo: { x: 288, y: 5, w: 27, h: 12 },
    cta: { x: 162, y: 17, w: 43, h: 17, radius: 3.46 },
    text: [
      { role: 'disclaimer', x: 10, y: 37, w: 197, h: 9, size: 8, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 10, y: 4, w: 142, h: 26, size: 12, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 170, y: 22, w: 27, h: 6, size: 6.49, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-970x250', w: 970, h: 250,
    art: { x: 344, y: -218, size: 686 },
    mask: { angle: 90, stops: [[0, 0], [0.396, 0], [0.607, 1], [1, 1]] },
    logo: { x: 880, y: 13, w: 69, h: 30 },
    cta: { x: 30, y: 118, w: 104, h: 41, radius: 8.41 },
    text: [
      { role: 'disclaimer', x: 30, y: 224, w: 470, h: 16, size: 14, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 30, y: 24, w: 443, h: 76, size: 36, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 49, y: 131, w: 66, h: 16, size: 15.77, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-728x90', w: 728, h: 90,
    art: { x: 436, y: -78, size: 246 },
    mask: { angle: 90, stops: [[0, 0], [0.61, 0], [0.695, 1], [0.846, 1], [0.912, 0], [1, 0]] },
    logo: { x: 682, y: 8, w: 36, h: 16 },
    cta: { x: 344, y: 28, w: 85, h: 34, radius: 6.97 },
    text: [
      { role: 'disclaimer', x: 20, y: 70, w: 389, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 20, y: 8, w: 300, h: 50, size: 24, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 360, y: 39, w: 54, h: 13, size: 13.08, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-300x600', w: 300, h: 600,
    art: { x: -260, y: -14, size: 822 },
    mask: { angle: 0, stops: [[0, 1], [0.55, 1], [0.72, 0], [1, 0]] },
    logo: { x: 10, y: 17, w: 57, h: 25 },
    cta: { x: 100, y: 162, w: 101, h: 40, radius: 8.21 },
    text: [
      { role: 'disclaimer', x: 12, y: 574, w: 276, h: 14, size: 12, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 10, y: 56, w: 280, h: 90, size: 28, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 118, y: 175, w: 64, h: 15, size: 15.38, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-120x600', w: 120, h: 600,
    art: { x: -113, y: 204, size: 350 },
    mask: { angle: 180, stops: [[0, 0], [0.465, 0], [0.551, 1], [1, 1]] },
    logo: { x: 8, y: 10, w: 42, h: 18 },
    cta: { x: 25, y: 180, w: 70, h: 28, radius: 5.74 },
    text: [
      { role: 'disclaimer', x: 6, y: 578, w: 108, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 10, y: 52, w: 100, h: 114, size: 18, face: 'headline', lineHeightPct: 106, trackingPct: -2, align: 'center' },
      { role: 'cta', x: 38, y: 189, w: 45, h: 11, size: 10.77, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'dv360-300x250', w: 300, h: 250,
    art: { x: -83, y: -68, size: 466 },
    logo: { x: 10, y: 10, w: 42, h: 19 },
    text: [
      { role: 'headline', x: 20, y: 34, w: 260, h: 46, size: 22, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 230, w: 280, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'dv360-250x250', w: 250, h: 250,
    art: { x: -98, y: -67, size: 446 },
    logo: { x: 10, y: 10, w: 35, h: 16 },
    text: [
      { role: 'headline', x: 10, y: 33, w: 230, h: 38, size: 18, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 10, y: 230, w: 230, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'pmax-960x1200', w: 960, h: 1200,
    art: { x: -513, y: -175, size: 1987 },
    logo: { x: 34, y: 33, w: 123, h: 54 },
    cta: { x: 380, y: 376, w: 201, h: 80, radius: 16.4 },
    text: [
      { role: 'disclaimer', x: 35, y: 1151, w: 890, h: 26, size: 22, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 80, y: 118, w: 800, h: 140, size: 66, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 80, y: 266, w: 800, h: 80, size: 38, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 417, y: 400, w: 127, h: 31, size: 30.74, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'pmax-1200x1200', w: 1200, h: 1200,
    art: { x: -434, y: -220, size: 2077 },
    logo: { x: 33, y: 33, w: 114, h: 50 },
    cta: { x: 502, y: 359, w: 196, h: 78, radius: 16 },
    text: [
      { role: 'disclaimer', x: 30, y: 1135, w: 1140, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 200, y: 87, w: 800, h: 144, size: 68, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 200, y: 243, w: 800, h: 80, size: 38, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 538, y: 383, w: 124, h: 30, size: 30, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'pmax-1200x628', w: 1200, h: 628,
    art: { x: 0, y: -489, size: 1607 },
    mask: { angle: 90, stops: [[0, 0], [0.253, 0.5], [0.468, 1], [1, 1]] },
    logo: { x: 1056, y: 30, w: 114, h: 50 },
    cta: { x: 40, y: 307, w: 136, h: 54, radius: 11.09 },
    text: [
      { role: 'disclaimer', x: 40, y: 585, w: 486, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 40, y: 46, w: 486, h: 165, size: 52, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'subcopy', x: 40, y: 225, w: 486, h: 62, size: 29, face: 'text', lineHeightPct: 106, trackingPct: -2, align: 'left' },
      { role: 'cta', x: 65, y: 324, w: 86, h: 21, size: 20.79, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'meta-1080x1080', w: 1080, h: 1080,
    art: { x: -329, y: -129, size: 1754 },
    logo: { x: 33, y: 33, w: 114, h: 50 },
    cta: { x: 447, y: 347, w: 196, h: 78, radius: 16 },
    text: [
      { role: 'disclaimer', x: 30, y: 1015, w: 1020, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 145, y: 95, w: 800, h: 144, size: 68, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 145, y: 251, w: 800, h: 60, size: 28, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 483, y: 371, w: 124, h: 30, size: 30, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
    ],
  },
  {
    key: 'meta-398x208', w: 398, h: 208,
    art: { x: 112, y: -52, size: 377 },
    mask: { angle: 90, stops: [[0, 0], [0.359, 0], [0.507, 1], [1, 1]] },
    logo: { x: 341, y: 10, w: 47, h: 21 },
    cta: { x: 20, y: 76, w: 101, h: 40, radius: 8.21 },
    text: [
      { role: 'headline', x: 20, y: 20, w: 260, h: 46, size: 22, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'left' },
      { role: 'cta', x: 38, y: 89, w: 64, h: 15, size: 15.38, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
      { role: 'disclaimer', x: 20, y: 186, w: 366, h: 12, size: 10, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
    ],
  },
  {
    key: 'meta-1080x1920', w: 1080, h: 1920,
    art: { x: -950, y: -347, size: 3000 },
    logo: { x: 33, y: 33, w: 114, h: 50 },
    cta: { x: 447, y: 389, w: 196, h: 78, radius: 16 },
    text: [
      { role: 'disclaimer', x: 30, y: 1855, w: 1020, h: 23, size: 20, face: 'text', lineHeightPct: null, trackingPct: 0, align: 'left' },
      { role: 'headline', x: 145, y: 137, w: 800, h: 144, size: 68, face: 'headline', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'subcopy', x: 145, y: 293, w: 800, h: 60, size: 28, face: 'text', lineHeightPct: 106, trackingPct: 0, align: 'center' },
      { role: 'cta', x: 483, y: 413, w: 124, h: 30, size: 30, face: 'text', lineHeightPct: 100, trackingPct: 0, align: 'center' },
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
