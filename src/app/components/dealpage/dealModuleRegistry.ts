/**
 * Deal Page module registry — the www.lg.com Deal Page counterpart to
 * brandshop/modules/moduleRegistry.ts.
 *
 * Same architecture as Shop in Shop (registry → default state → renderer →
 * edit panel → drag canvas → ZIP export), but the output target is different:
 * lg.com's own page grid, not a marketplace upload slot. So there is no
 * `uploadModule` here, and every module renders at the page width.
 *
 * Geometry is read off Figma `miJcDQgz0yJMskLE5a5HHj`, page "ExporttoFigma |
 * www.lg.com | Deal Page" (body 6080:50977, main content 6080:51043). The
 * module set below is exactly the ten sections that page carries today — no
 * more, no fewer. Each entry notes the node it was measured from so a future
 * change can be re-measured against the same node.
 */

export type DealModuleType =
  | 'deal-site-header'
  | 'deal-hero'
  | 'deal-cards'
  | 'deal-promo-banner'
  | 'deal-banner'
  | 'deal-tab-nav'
  | 'deal-product-list'
  | 'deal-category-nav'
  | 'deal-site-footer';

/**
 * The page's own width (Figma "Body" 6080:50977 and every section container).
 *
 * Everything on the Deal Page is a 2280-wide band with a narrower rail centred
 * inside it — the warm background either side of the rails is part of the
 * design, not empty space, so modules render at 2280 and NOT at a rail width.
 * Four rails sit inside it, each with its own inset:
 */
export const DEAL_PAGE_WIDTH = 2280;
/** Hero video plate (Figma 6130:67434, x=180). */
export const DEAL_HERO_WIDTH = 1920;
/** Banner rail — every promo/time-sale/membership banner (x=340). */
export const DEAL_BANNER_WIDTH = 1600;
/** Section rail — header, product grid, category nav, footer (x=396). */
export const DEAL_RAIL_WIDTH = 1488;
/** Copy rail — the 24 gutter inside every section rail lands here (x=420). */
export const DEAL_CONTENT_WIDTH = 1440;

/** Distance from the page edge to each rail. */
export const HERO_INSET = (DEAL_PAGE_WIDTH - DEAL_HERO_WIDTH) / 2;      // 180
export const BANNER_INSET = (DEAL_PAGE_WIDTH - DEAL_BANNER_WIDTH) / 2;  // 340
export const RAIL_INSET = (DEAL_PAGE_WIDTH - DEAL_RAIL_WIDTH) / 2;      // 396
export const CONTENT_INSET = (DEAL_PAGE_WIDTH - DEAL_CONTENT_WIDTH) / 2; // 420

export interface DealModuleDef {
  type: DealModuleType;
  label: string;
  /** The lg.com section this module reproduces — shown under the palette label. */
  section: string;
  width: number;
  height: number | 'free';
  placeholderHeight: number;
  maxCount: number;
  zipName: string;
  /**
   * The artwork box the operator has to supply, NOT the module's own band. The
   * band is always 2280 and telling someone to prepare a 2280-wide image is
   * wrong — what goes in is the plate inside it.
   *
   * Only modules that take a piece of banner artwork carry one. Chrome (header,
   * tabs, footer) and modules whose images are per-item thumbnails rather than a
   * banner (product list, category nav) deliberately have none, and show no size.
   */
  artSize?: { w: number; h: number };
}

export const DEAL_MODULE_DEFS: DealModuleDef[] = [
  { type: 'deal-site-header',  label: 'Site header',      section: 'LG.com global header',        width: DEAL_PAGE_WIDTH, height: 'free', placeholderHeight: 134,  maxCount: 1, zipName: 'site-header'   },
  { type: 'deal-hero',         label: 'Hero KV',          section: 'Page hero',                   width: DEAL_PAGE_WIDTH, height: 720,    placeholderHeight: 720,  maxCount: 1, zipName: 'hero',         artSize: { w: DEAL_HERO_WIDTH, h: 720 } },
  { type: 'deal-cards',        label: 'Deal cards',       section: 'Discover exclusive deals',    width: DEAL_PAGE_WIDTH, height: 561,    placeholderHeight: 561,  maxCount: 2, zipName: 'deal-cards',   artSize: { w: 464, h: 368 } },
  // One banner family, two palette entries: the 400-tall promotion banner and
  // the 350-tall deal banner (the height is the module type now, not a size
  // picker in the panel).
  { type: 'deal-promo-banner', label: 'Promotion banner', section: 'Exclusive offer',              width: DEAL_PAGE_WIDTH, height: 'free', placeholderHeight: 496, maxCount: 4, zipName: 'promo-banner', artSize: { w: DEAL_BANNER_WIDTH, h: 400 } },
  { type: 'deal-banner',       label: 'Deal banner',      section: 'Hot Deals / Bundles / Gifts',  width: DEAL_PAGE_WIDTH, height: 'free', placeholderHeight: 398, maxCount: 6, zipName: 'deal-banner',  artSize: { w: DEAL_BANNER_WIDTH, h: 350 } },
  // (Time Sale is no longer its own module — it is the deal banner's
  //  countdown toggle. Old deal-time-sale drafts migrate on restore.)
  { type: 'deal-tab-nav',      label: 'Deal tabs',        section: 'Deal-type tab bar',           width: DEAL_PAGE_WIDTH, height: 98,     placeholderHeight: 98,   maxCount: 2, zipName: 'tab-nav'       },
  { type: 'deal-product-list', label: 'Product list',     section: 'Deal product grid',           width: DEAL_PAGE_WIDTH, height: 'free', placeholderHeight: 796,  maxCount: 8, zipName: 'product-list'  },
  { type: 'deal-category-nav', label: 'Category nav',     section: 'Category filter + results',   width: DEAL_PAGE_WIDTH, height: 353,    placeholderHeight: 353,  maxCount: 1, zipName: 'category-nav'  },
  { type: 'deal-site-footer',  label: 'Site footer',      section: 'LG.com global footer',        width: DEAL_PAGE_WIDTH, height: 848,    placeholderHeight: 848,  maxCount: 1, zipName: 'site-footer'   },
];

export function getDealModuleDef(type: DealModuleType): DealModuleDef {
  return DEAL_MODULE_DEFS.find(d => d.type === type)!;
}

/** `1600 × 400`, or null for the modules that take no banner artwork. */
export const artSizeLabel = (def: DealModuleDef, height?: number): string | null =>
  def.artSize ? `${def.artSize.w} × ${height ?? def.artSize.h}` : null;
