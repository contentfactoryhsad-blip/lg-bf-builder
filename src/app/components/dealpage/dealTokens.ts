/**
 * Deal Page design tokens — read straight off the Figma variables surfaced by
 * `get_design_context` on frame 1:1212, not eyeballed from a screenshot.
 *
 * The lg.com Deal Page runs a much flatter type scale than the Shop in Shop
 * modules: ONE heading size (56/60 regular) for every section title, banner
 * headline and hero, and 20/24 regular for nearly all body copy. Do not
 * "improve" these by mixing in intermediate sizes — the page reads wrong.
 */

// ── Type (Figma `fontsize/*` + `w-·-*` tokens) ────────────────────────────────

/** Every section title, banner headline and the hero H1. `fontsize/56`. */
export const T_HEAD = { fontSize: 56, lineHeight: '60px', fontWeight: 400 } as const;
/** Body copy, tabs, product names, card titles. `fontsize/20`. */
export const T_BODY = { fontSize: 20, lineHeight: '24px', fontWeight: 400 } as const;
/** Buttons, links, banner sub copy. `fontsize/16`. */
export const T_SMALL = { fontSize: 16, lineHeight: '20px', fontWeight: 400 } as const;
/** SKU, ratings, badge. `fontsize/14`. */
export const T_MICRO = { fontSize: 14, lineHeight: '20px', fontWeight: 400 } as const;
/** Time Sale digits. `fontsize/80`. */
export const T_DIGIT = { fontSize: 80, lineHeight: '80px', fontWeight: 400 } as const;

export const W_SEMIBOLD = 600;

// ── Colour (Figma variable defaults) ──────────────────────────────────────────

/** Page canvas. */
export const PAGE_BG = '#F0ECE4';
/** Breadcrumb band + footer. */
export const CHROME_BG = '#E6E1D6';
/** `active-red/50` — CTA fill, tab underline, discount %. NOT the app-chrome #FD312E. */
export const DEAL_RED = '#EA1917';
/** `warm-gray/15` — default body ink on this page; true black is reserved for active/emphasis. */
export const TEXT_DARK = '#333333';
/** `neutral-gray/25` — model codes. */
export const TEXT_SKU = '#4A4946';
/** `warm-gray/35` — struck-through original price. */
export const TEXT_STRIKE = '#646464';
/** `warm-gray/50` — outline on the deal-card button. */
export const BTN_BORDER = '#94928D';
/** `stroke/main` — tab-bar rules. */
export const HAIRLINE = '#E1E2E5';
/** Base fill under a deal card's art (Figma 1:1310). */
export const CARD_BASE = '#505050';
/** `surface/card-orange` + `orange/40` — the Free Shipping pill. */
export const SHIP_BG = '#FFEDE0';
export const SHIP_TEXT = '#934B01';
/** Legal bar. */
export const LEGAL_BG = '#333333';
export const BLACK = '#000000';
export const WHITE = '#FFFFFF';

/** Product-card badge (Figma 1:1546) — a three-stop diagonal, not a flat red. */
export const BADGE_GRADIENT =
  'linear-gradient(133.27deg, #FF681C 4.8%, #EA1917 39.31%, #A50034 91.3%)';

// ── Radius (Figma `radius/*`) ─────────────────────────────────────────────────

/** `radius/28` — deal cards, promotion banners, the Time Sale banner. */
export const R_LG = 28;
/** Product cards. */
export const R_MD = 16;
/** `radius/8` — buttons. */
export const R_SM = 8;
/** `radius/4` — badge, shipping pill. */
export const R_XS = 4;
