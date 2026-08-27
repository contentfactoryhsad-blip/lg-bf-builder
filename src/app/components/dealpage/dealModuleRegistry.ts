/**
 * Deal Page module registry — the www.lg.com Deal Page counterpart to
 * brandshop/modules/moduleRegistry.ts.
 *
 * Same architecture as Shop in Shop (registry → default state → renderer →
 * edit panel → drag canvas → ZIP export), but the output target is different:
 * lg.com's own page grid, not a marketplace upload slot. So there is no
 * `uploadModule` here, and every module renders at the page container width
 * instead of 1200.
 *
 * Geometry is taken from Figma `fUup3vSq71f6eUIRpmzz8s`, frame 1:1212
 * ("ExporttoFigma | www.lg.com | Deal Page").
 */

export type DealModuleType =
  | 'deal-site-header'
  | 'deal-hero'
  | 'deal-cards'
  | 'deal-tab-nav'
  | 'deal-promo-banner'
  | 'deal-time-sale'
  | 'deal-product-list'
  | 'deal-category-nav'
  | 'deal-site-footer';

/**
 * The page's own width (Figma 1:1213 "Body" and every section container).
 *
 * Everything on the Deal Page is a 2280-wide band with a narrower rail centred
 * inside it — the warm page background either side of the rails is part of the
 * design, not empty space, so modules render at 2280 and NOT at the 1713
 * container width. Four rails sit inside it, each with its own inset:
 */
export const DEAL_PAGE_WIDTH = 2280;
/** Content container — the hero band, deal-card row and banners hang off this (Figma 1:1280). */
export const DEAL_CONTAINER_WIDTH = 1713;
/** Banner rail (Figma 1:1388, 1:1501, 1:2460). */
export const DEAL_BANNER_WIDTH = 1600;
/** Product-list grid + header/footer content (Figma 1:1528, 1:1218, 1:3121). */
export const DEAL_GRID_WIDTH = 1488;
/** Innermost rail — the deal-type tab bar (Figma 1:1487). */
export const DEAL_CHROME_WIDTH = 1440;

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
}

export const DEAL_MODULE_DEFS: DealModuleDef[] = [
  { type: 'deal-site-header',  label: 'Site header',      section: 'LG.com global header',   width: DEAL_PAGE_WIDTH, height: 'free', placeholderHeight: 134, maxCount: 1, zipName: 'site-header'   },
  { type: 'deal-hero',         label: 'Hero KV',          section: 'Page hero',              width: DEAL_PAGE_WIDTH, height: 642,    placeholderHeight: 642, maxCount: 1, zipName: 'hero'          },
  { type: 'deal-cards',        label: 'Deal cards',       section: 'Discover exclusive deals', width: DEAL_PAGE_WIDTH, height: 'free', placeholderHeight: 561, maxCount: 2, zipName: 'deal-cards'    },
  { type: 'deal-tab-nav',      label: 'Deal tabs',        section: 'Deal-type tab bar',      width: DEAL_PAGE_WIDTH, height: 98,     placeholderHeight: 98,  maxCount: 2, zipName: 'tab-nav'       },
  { type: 'deal-promo-banner', label: 'Promotion banner', section: 'Hot Deals / Bundles / Gifts', width: DEAL_PAGE_WIDTH, height: 496, placeholderHeight: 496, maxCount: 6, zipName: 'promo-banner'  },
  { type: 'deal-time-sale',    label: 'Time Sale',        section: 'Time Sale ends in',      width: DEAL_PAGE_WIDTH, height: 398,    placeholderHeight: 398, maxCount: 1, zipName: 'time-sale'     },
  { type: 'deal-product-list', label: 'Product list',     section: 'Deal product grid',      width: DEAL_PAGE_WIDTH, height: 'free', placeholderHeight: 796, maxCount: 8, zipName: 'product-list'  },
  { type: 'deal-category-nav', label: 'Category nav',     section: 'Category filter bar',    width: DEAL_PAGE_WIDTH, height: 'free', placeholderHeight: 200, maxCount: 1, zipName: 'category-nav'  },
  { type: 'deal-site-footer',  label: 'Site footer',      section: 'LG.com global footer',   width: DEAL_PAGE_WIDTH, height: 848,    placeholderHeight: 848, maxCount: 1, zipName: 'site-footer'   },
];

export function getDealModuleDef(type: DealModuleType): DealModuleDef {
  return DEAL_MODULE_DEFS.find(d => d.type === type)!;
}
