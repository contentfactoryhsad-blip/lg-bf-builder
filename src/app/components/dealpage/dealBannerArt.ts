/**
 * Promotion banner (400) key-visual art — read off the five banner frames the
 * designer laid out on Figma `miJcDQgz0yJMskLE5a5HHj`, page "Page Template",
 * right of the Deal Page board: `Promotion Banner_PD Slot_standard setting`
 * (6240:144564) and the four variant frames (6240:143840 / 144049 / 144153 /
 * 144361).
 *
 * Unlike the hero, ONE placement serves every variant: all four frames draw
 * their 3000² square at w 72.17% / h 288.7% / left 40.79% / top −94.22% of the
 * 1600×400 plate. And unlike the hero's PD Slot art, the product plates here
 * are NOT baked into the artwork — the frames draw four #333 rounded boxes
 * over it, so the renderer draws them too (empty plates still show).
 */

/** The artwork square inside the 1600×400 plate (px). */
export const PROMO_ART = { x: 652.6, y: -376.9, size: 1154.7 };

/**
 * The four variants the picker offers, in board order. `id` is the Content
 * Template registry asset (label + thumb); `art` overrides the artwork stem
 * where the banner frames use a file the registry doesn't list as an asset —
 * the PD Slot banners draw the `…slot001` art (v1 WITHOUT baked plates, the
 * same stems paidBoards.ts reads), since the plates here are the frame's own
 * boxes, not part of the artwork.
 */
export interface PromoKvTile {
  id: string;
  art?: string;
  hasSlots: boolean;
}

/**
 * Picker rows — PD Centric pair first, PD Slot pair after (order by request).
 * Like the hero picker, the first tile of each row IS the row title, so only
 * the second tile gets a caption (`captionFromIndex` = 1).
 */
export const PROMO_KV_ROWS: { label: string; captionFromIndex: number; tiles: PromoKvTile[] }[] = [
  {
    label: 'KEY VISUAL_PD Centric',
    captionFromIndex: 1,
    tiles: [
      { id: 'kv-product-centric-1', hasSlots: false },
      { id: 'kv-product-centric-2', hasSlots: false },
    ],
  },
  {
    label: 'KEY VISUAL_PD Slot',
    captionFromIndex: 1,
    tiles: [
      { id: 'kv-product-slot',           art: 'kv-product-slot001',           hasSlots: true },
      { id: 'kv-product-slot-character', art: 'kv-product-slot001-character', hasSlots: true },
    ],
  },
];

export const PROMO_KV_TILES: PromoKvTile[] = PROMO_KV_ROWS.flatMap(r => r.tiles);

export const promoArtHasSlots = (assetId: string | null | undefined): boolean =>
  PROMO_KV_TILES.some(tl => tl.id === assetId && tl.hasSlots);

/** Artwork stem the banner draws for a picked variant (null → not a variant). */
export const promoArtStem = (assetId: string | null | undefined): string | null => {
  const tl = PROMO_KV_TILES.find(x => x.id === assetId);
  return tl ? tl.art ?? tl.id : null;
};

/**
 * Product plate row (Figma "slot" 6240:143919) — four boxes in 1600×400 plate
 * px. `slot 1` on the board is the RIGHTMOST box; the builder's slots read
 * left → right, so index 0 here is the board's slot 4.
 */
export const PROMO_SLOT = {
  x: 1002,
  y: 276.75,
  size: 102.88,
  pitch: 112.88,
  count: 4,
  radius: 8.12,
  plate: '#333333',
  /** Product cutouts sit inset on the plate (board draws them ~81–90%). */
  inset: 0.09,
};

/**
 * The "standard setting" frame's default products, left → right (AC stand,
 * OLED TV, side-by-side fridge, washer) — exported from that frame's slots so
 * a fresh promotion banner starts populated, exactly as the board shows.
 */
export const PROMO_DEFAULT_PRODUCTS = [
  '/deal-page/banner-product-1.png',
  '/deal-page/banner-product-2.png',
  '/deal-page/banner-product-3.png',
  '/deal-page/banner-product-4.png',
];

// ── Deal banner (350) types ───────────────────────────────────────────────────

/**
 * Deal banner art — the four `Deal Banner_*` frames at y 2057 on the board
 * (Time Sale 6240:144854, Hot Deal 6240:144775, Gift 6240:144882 and the
 * unnamed Bundle frame 6240:144910; all four share one template and differ
 * only in artwork). The tile `id` is the deal-type registry asset (label +
 * thumb — the same four tiles the deal cards use); the art itself is each
 * frame's own export (`deal-banner-art-*.jpg`, a differently-cropped render
 * per type), placed at that frame's measured box in 1600×350 plate px.
 */
// x: all four arts sit +45.2px right of their original crops (the designer
// nudged Time Sale and the other three were shifted to match, 2026-08-30).
export const DEAL_KV_TILES: { id: string; file: string; x: number; y: number; w: number; h: number }[] = [
  { id: 'deal-type-time-sale', file: '/deal-page/deal-banner-art-time-sale.jpg', x: 45.2, y: -301.8, w: 1665.9, h: 972.7 },
  { id: 'deal-type-hot-deal',  file: '/deal-page/deal-banner-art-hot-deal.jpg',  x: 45.3, y: -333.5, w: 1695.5, h: 1028.0 },
  { id: 'deal-type-gift',      file: '/deal-page/deal-banner-art-gift.jpg',      x: 45.4, y: -402.1, w: 1761.9, h: 1175.1 },
  { id: 'deal-type-bundle',    file: '/deal-page/deal-banner-art-bundle.jpg',    x: 45.3, y: -351.5, w: 1707.8, h: 1065.0 },
];

export const dealBannerArtFor = (assetId: string | null | undefined) =>
  DEAL_KV_TILES.find(tl => tl.id === assetId) ?? null;

/**
 * Left scrim over the deal banner art ("Rectangle 2" on every frame) — keeps
 * the copy on black whatever the artwork puts behind it.
 */
export const DEAL_BANNER_SCRIM = {
  x: -74,
  y: -8,
  w: 1130,
  h: 366,
  gradient: 'linear-gradient(90deg, rgba(0,0,0,1) 7.655%, rgba(0,0,0,0) 91.991%)',
};
