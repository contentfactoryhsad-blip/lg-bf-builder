/**
 * Deal Page module edit states + default factory — mirrors
 * brandshop/modules/editStates.ts for the www.lg.com Deal Page module set.
 *
 * Defaults reproduce the shipped Figma page (`miJcDQgz0yJMskLE5a5HHj`, body
 * 6080:50977) so a freshly dropped module already looks like the real section
 * instead of an empty frame.
 */

import type { DealModuleType } from './dealModuleRegistry';
import { PROMO_DEFAULT_PRODUCTS } from './dealBannerArt';
import { PD_PLATE_FILL } from '../contenttemplate/paidBoards';
import type { TFunction } from '../../i18n/LanguageContext';

// Same fallback as the Shop in Shop states: module-scope palette previews are
// built outside the language context, so they render the English source copy.
const identityT = ((s: string) => s) as TFunction;

// ── Countdown fields (shared by hero + deal banner) ───────────────────────────

/**
 * The Time Sale digit row — one component on the board (96-wide digit boxes,
 * labels under), carried by whichever module switches it on.
 */
export interface CountdownFields {
  showCountdown: boolean;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  dayLabel: string;
  hourLabel: string;
  minuteLabel: string;
  secondLabel: string;
}

// ── Hero (Figma 6080:51044 — 2280×720) ────────────────────────────────────────

export interface DealHeroState extends CountdownFields {
  eyebrow: string;
  showEyebrow: boolean;
  headline: string;
  subCopy: string;
  showSubCopy: boolean;
  /**
   * Content Template key-visual id, picked from the same tile rows the Content
   * Template Builder shows in its left rail. The 3000² artwork is placed into
   * the 1920×720 plate at the position the board gives that key visual (see
   * dealHeroArt.ts) — never stretched to fit.
   */
  kvAsset: string | null;
  /** Nudge on top of that placement, in plate pixels. */
  kvNudgeX: number;
  kvNudgeY: number;
  /** Multiplier on the board's size, applied about the artwork's centre. */
  kvScale: number;
  /**
   * One product per plate, for the PD Slot key visuals — those artworks ship
   * with empty plates baked in and this fills them. Same shape and same flow as
   * the Content Template Builder's product slots.
   */
  products: { url: string; image: string | null }[];
  /** PD Slot plate fill — drawn over the baked plates so it can be recoloured. */
  plateColor: string;
  /**
   * Operator-uploaded 3000×3000 square (data URL), drawn with Main's framing
   * when `kvAsset` is 'custom-upload' — the deal-page counterpart of the
   * Content Banner Builder's UPLOAD group. Banners and deal cards reuse their
   * legacy `image` field for the same purpose instead.
   */
  customImage: string | null;
  // + CountdownFields: the digit row under the copy (Figma 6236:143805),
  //   sitting on the content rail at y 294.
}

// ── Deal cards (Figma 6149:67786 — "Discover exclusive deals") ────────────────

export interface DealCardItem {
  /**
   * Deal-type asset id from the Content Template registry
   * (`deal-type-bundle` / `-time-sale` / `-gift` / `-hot-deal`) — the card art
   * is swapped between these four campaign artworks, not uploaded.
   */
  asset: string | null;
  /** Legacy baked card render — only drafts saved before the asset picker have one. */
  image: string | null;
  title: string;
  ctaText: string;
}

export interface DealCardsState {
  sectionTitle: string;
  showSectionTitle: boolean;
  /** Subtitle under the section title (new on the 2026-09-02 board revision). */
  sectionSubtitle: string;
  showSectionSubtitle: boolean;
  showCta: boolean;
  /**
   * The row is a carousel on lg.com: the counter and the two round arrows sit
   * on the title line (Figma "Indigator" 6149:67794). They are chrome, not
   * content, so they are one switch rather than four editable fields.
   */
  showCarousel: boolean;
  /**
   * ⚠️ Legacy — the counter is computed from the card count now (the carousel
   * actually slides, 2026-09-03). Kept only so old drafts keep parsing.
   */
  slideCount: string;
  cards: DealCardItem[];
}

/**
 * Card count is 3 or 4 — three cards fill the 1440 rail exactly (3×464 +
 * 2×24); a fourth sits offstage and the carousel arrows slide it in (the
 * counter reads "2 / 2" on the second position, like the OBS builder's
 * banner carousel).
 */
export const DEAL_CARD_MIN = 3;
export const DEAL_CARD_MAX = 4;

/**
 * Card art comes from the four deal-type campaign artworks (the same registry
 * tiles the Content Template Builder shows). The first three are the default
 * row; the Gift seed is what a fourth card starts as.
 */
export const DEAL_CARD_SEEDS: DealCardItem[] = [
  { asset: 'deal-type-time-sale', image: null, title: 'Time Sale, hourly',       ctaText: 'Shop now' },
  { asset: 'deal-type-hot-deal',  image: null, title: 'Hot Deals, 60% off',      ctaText: 'Shop now' },
  { asset: 'deal-type-bundle',    image: null, title: 'Bundles, save even more', ctaText: 'Shop now' },
  { asset: 'deal-type-gift',      image: null, title: 'Gifts, with every deal',  ctaText: 'Shop now' },
];

export function dealCardSeed(t: TFunction, i: number): DealCardItem {
  const c = DEAL_CARD_SEEDS[Math.min(i, DEAL_CARD_SEEDS.length - 1)];
  return { ...c, title: t(c.title), ctaText: t(c.ctaText) };
}

/** Default is the FULL four-card set — the carousel starts at "1 / 2" with
    the Gift card offstage (per request, 2026-09-03). */
export function dealCardDefaults(t: TFunction): DealCardItem[] {
  return DEAL_CARD_SEEDS.map(c => ({ ...c, title: t(c.title), ctaText: t(c.ctaText) }));
}

// ── Deal tab nav (Figma 6080:51251 — 2280×98) ─────────────────────────────────

export interface DealTabNavState {
  /** One tab label per line. */
  tabs: string;
  /** Which tab carries the red rule. */
  activeIndex: number;
}

export const DEAL_TAB_MAX = 6;

// ── Promotion banner (Figma 6080:51148 / 6080:52223 / 52436 / 52640) ──────────

/** Where the art sits relative to the copy — every shipped banner is right-art. */
export type DealBannerLayout = 'Art right' | 'Art left';

/**
 * The page runs two banner heights, and since 2026-08-30 they are two MODULE
 * TYPES rather than a size picker: `deal-promo-banner` is the 400-tall
 * exclusive-offer banner (Figma 6080:51204), `deal-banner` is the 350-tall
 * Hot Deals / Bundles / Gifts banner. The `size` field stays on the state so
 * old drafts keep their meaning — restore maps a Standard promo banner to the
 * deal-banner type, and the renderer forces size from the type.
 *
 * ⚠️ Standard is 350 by spec (per the design owner) even though the shipped
 * board frames 6080:52226/52439/52643 still measure 320 — the board is behind.
 */
export type DealBannerSize = 'Large' | 'Standard';

export const DEAL_BANNER_HEIGHT: Record<DealBannerSize, number> = { Large: 400, Standard: 350 };

export interface DealPromoBannerState extends CountdownFields {
  layout: DealBannerLayout;
  size: DealBannerSize;
  headline: string;
  subCopy: string;
  showSubCopy: boolean;
  /** Inline legal links under the copy ("Terms and Conditions", "Privacy Policy"). */
  linkPrimary: string;
  linkSecondary: string;
  showLinks: boolean;
  ctaText: string;
  showCta: boolean;
  /** Legacy uploaded/baked banner art — used only while `kvAsset` is null. */
  image: string | null;
  /**
   * Promotion banner (400) only: key-visual variant off the board's
   * `Promotion Banner_*` frames (see dealBannerArt.ts). Takes precedence over
   * `image`; null keeps a legacy draft's uploaded art.
   */
  kvAsset: string | null;
  /** Art nudge in plate px — arrows in the panel; plates stay anchored. */
  kvNudgeX: number;
  kvNudgeY: number;
  /** Multiplier on the board's art size, applied about the artwork's centre. */
  kvScale: number;
  /**
   * Product cutouts for the PD Slot variants' four plates — same shape and
   * crawl + background-removal flow as the hero's PD Slot products. The row
   * itself can be switched off (`showSlots`): the slot001 art carries no baked
   * plates, so hiding the drawn row leaves a clean banner.
   */
  showSlots: boolean;
  products: { url: string; image: string | null }[];
  /** PD Slot plate fill (the four boxes the frame draws over the art). */
  plateColor: string;
  // + CountdownFields: the old standalone Time Sale module folded into the
  //   deal banner (2026-08-30) — only the deal banner's panel surfaces the
  //   toggle; the 400 promotion banner never counts down.
}

// ── Product list (Figma 6080:51291 — 2280×796) ────────────────────────────────

export interface DealProductItem {
  badge: string;
  showBadge: boolean;
  name: string;
  sku: string;
  rating: string;
  reviewCount: string;
  showRating: boolean;
  image: string | null;
  discountPercent: string;
  showDiscountPercent: boolean;
  salePrice: string;
  originalPrice: string;
  showOriginalPrice: boolean;
  shippingNote: string;
  showShippingNote: boolean;
  secondaryCta: string;
  primaryCta: string;
}

/**
 * The grid runs on FIXED product sets now — the board (Page Template) carries
 * three curated rows of four, and the builder swaps between them instead of
 * editing products one by one. Per-product fields still exist on
 * `DealProductItem` (old drafts carry them, and per-product editing may come
 * back), the right bar just doesn't surface them any more.
 */
export type DealProductSetKey = 'refrigerator' | 'washer' | 'washtower';

export interface DealProductListState {
  sectionTitle: string;
  showSectionTitle: boolean;
  /** Tab strip above the grid — one label per line, first one is active. */
  tabs: string;
  showTabs: boolean;
  /** Which curated product row fills the grid. */
  productSet: DealProductSetKey;
  products: DealProductItem[];
}

/**
 * The rail fits four 342 cards at a 366 pitch (Figma "Slider Label Title"
 * 6080:51305). Cards are FIXED width — a shorter row is left-aligned and simply
 * leaves the rest of the rail empty, exactly as the board does.
 */
export const DEAL_PRODUCT_MIN = 2;
export const DEAL_PRODUCT_MAX = 4;

interface DealProductSeed {
  badge: string;
  name: string;
  sku: string;
  rating: string;
  reviewCount: string;
  discountPercent: string;
  salePrice: string;
  originalPrice: string;
  image: string;
  primaryCta: string;
}

/**
 * The three curated rows, card for card off the Page Template board
 * (`miJcDQgz0yJMskLE5a5HHj`): refrigerators = "Offer available\u2026" slider
 * 6080:51305, washers = the first four cards of the "Black Friday prices\u2026"
 * slider 6080:51511 (the board's rail clips at four; the other six are
 * off-stage carousel slides), washtower = the "Laundry Bundles" slider
 * 6080:52452. Each row's fourth card is the board's own fourth card \u2014 two rows
 * simply repeat one of their products, which is faithful, not a bug. Badges,
 * CTAs ("Get stock alert" vs "Buy now") and prices are per-card on the board,
 * so they ride on the seed rather than the item factory.
 */
export const DEAL_PRODUCT_SETS: Record<DealProductSetKey, { label: string; thumb: string; seed: DealProductSeed[] }> = {
  refrigerator: {
    label: 'Refrigerator',
    thumb: '/deal-page/product-1.png',
    seed: [
      { badge: '9 interest-free installments', name: 'LG Side by Side Refrigerator 617L Door-in-Door, Silver',                    sku: 'GS66SDP', rating: '4.9', reviewCount: '(10)',  discountPercent: '29%', salePrice: '$1,135', originalPrice: '$1,608', image: '/deal-page/product-1.png', primaryCta: 'Buy now' },
      { badge: '9 interest-free installments', name: 'LG Side by Side Refrigerator 625L, no water line required, Total No Frost', sku: 'GS66SPY', rating: '4.6', reviewCount: '(517)', discountPercent: '36%', salePrice: '$1,000', originalPrice: '$1,567', image: '/deal-page/product-2.png', primaryCta: 'Buy now' },
      // originalPrice $905 is the board's value \u2014 an older seed here said $965.
      { badge: '9 interest-free installments', name: 'LG Side by Side Refrigerator 658L with Smart Diagnosis, Total No Frost',    sku: 'GS66BPM', rating: '4.7', reviewCount: '(45)',  discountPercent: '19%', salePrice: '$729',   originalPrice: '$905',   image: '/deal-page/product-3.png', primaryCta: 'Buy now' },
      { badge: '9 interest-free installments', name: 'LG Side by Side Refrigerator 625L, no water line required, Total No Frost', sku: 'GS66SPY', rating: '4.6', reviewCount: '(517)', discountPercent: '36%', salePrice: '$1,000', originalPrice: '$1,567', image: '/deal-page/product-2.png', primaryCta: 'Buy now' },
    ],
  },
  washer: {
    label: 'Washer',
    thumb: '/deal-page/product-washer-1.png',
    seed: [
      { badge: '9 interest-free installments', name: 'LG Washer Dryer 12kg Wash / 7kg Dry, AI DD\u2122 and ThinQ',                     sku: 'WD12BVC2S6C', rating: '4.2', reviewCount: '(55)', discountPercent: '54%', salePrice: '$513', originalPrice: '$1,121', image: '/deal-page/product-washer-1.png', primaryCta: 'Get stock alert' },
      { badge: '6 interest-free installments', name: 'LG Washer Dryer 12kg Wash / 7kg Dry, AI DD\u2122 and ThinQ',                     sku: 'WD12PVC3S6C', rating: '4.9', reviewCount: '(20)', discountPercent: '51%', salePrice: '$500', originalPrice: '$1,040', image: '/deal-page/product-washer-2.png', primaryCta: 'Buy now' },
      { badge: '9 interest-free installments', name: 'Washer Dryer 16kg Wash / 8kg Dry, AI DD with PetCare Cycle, ThinQ, Matte Black', sku: 'WD16EBNT6PC', rating: '4.8', reviewCount: '(6)',  discountPercent: '35%', salePrice: '$729', originalPrice: '$1,135', image: '/deal-page/product-washer-3.png', primaryCta: 'Buy now' },
      { badge: '9 interest-free installments', name: 'Washer Dryer 18kg Wash / 10kg Dry, AI DD with PetCare Cycle, ThinQ, Graphite',   sku: 'WD18EGNTSPG', rating: '4.6', reviewCount: '(8)',  discountPercent: '44%', salePrice: '$811', originalPrice: '$1,459', image: '/deal-page/product-washer-4.png', primaryCta: 'Buy now' },
    ],
  },
  washtower: {
    label: 'WashTower',
    thumb: '/deal-page/product-washtower-1.png',
    seed: [
      { badge: '24 interest-free installments', name: 'Get a microwave for $27 with the purchase of a WashTower 14kg Wash / 10kg Dry', sku: 'WK14BMS203.ESPR', rating: '5.0', reviewCount: '(6)', discountPercent: '34%', salePrice: '$1,526', originalPrice: '$2,324', image: '/deal-page/product-washtower-1.png', primaryCta: 'Get stock alert' },
      { badge: '24 interest-free installments', name: 'Get a microwave for $27 with the purchase of a WashTower 22kg Wash / 16kg Dry', sku: 'WK22GMS203.ESPR', rating: '4.8', reviewCount: '(4)', discountPercent: '34%', salePrice: '$1,756', originalPrice: '$2,675', image: '/deal-page/product-washtower-2.png', primaryCta: 'Get stock alert' },
      { badge: '24 interest-free installments', name: 'Get a microwave for $27 with the purchase of a WashTower 22kg Wash / 16kg Dry', sku: 'WK22BMS203.ESPR', rating: '5.0', reviewCount: '(4)', discountPercent: '39%', salePrice: '$1,810', originalPrice: '$2,999', image: '/deal-page/product-washtower-3.png', primaryCta: 'Get stock alert' },
      { badge: '24 interest-free installments', name: 'Get a microwave for $27 with the purchase of a WashTower 14kg Wash / 10kg Dry', sku: 'WK14BMS203.ESPR', rating: '5.0', reviewCount: '(6)', discountPercent: '34%', salePrice: '$1,526', originalPrice: '$2,324', image: '/deal-page/product-washtower-1.png', primaryCta: 'Get stock alert' },
    ],
  },
};

/** Build the i-th card of a curated set (wraps past the set's four seeds). */
export function dealProductItemFor(t: TFunction, setKey: DealProductSetKey, i: number): DealProductItem {
  const { seed } = DEAL_PRODUCT_SETS[setKey];
  const s = seed[i % seed.length];
  return {
    badge: t(s.badge),
    showBadge: true,
    name: t(s.name),
    sku: s.sku,
    rating: s.rating,
    reviewCount: s.reviewCount,
    showRating: true,
    image: s.image,
    discountPercent: s.discountPercent,
    showDiscountPercent: true,
    salePrice: s.salePrice,
    originalPrice: s.originalPrice,
    showOriginalPrice: true,
    shippingNote: t('Free Shipping'),
    showShippingNote: true,
    secondaryCta: t('Learn more'),
    primaryCta: t(s.primaryCta),
  };
}

/** The full curated row for a set at a given card count. */
export function dealProductSetItems(t: TFunction, setKey: DealProductSetKey, count: number): DealProductItem[] {
  return Array.from({ length: count }, (_, i) => dealProductItemFor(t, setKey, i));
}

// ── Category nav (Figma 6080:52130 — 2280×353) ────────────────────────────────

export interface DealCategoryNavItem {
  icon: string | null;
  name: string;
}

export interface DealCategoryNavState {
  items: DealCategoryNavItem[];
  showResultsBar: boolean;
  resultsText: string;
  sortLabel: string;
  /** Centred line below the results bar while the filter returns nothing. */
  emptyText: string;
  showEmptyText: boolean;
}

export const DEAL_CATEGORY_NAV_MIN = 3;
export const DEAL_CATEGORY_NAV_MAX = 7;

export const DEAL_CATEGORY_NAV_DEFAULTS: DealCategoryNavItem[] = [
  { icon: '/deal-page/icons/cat-all.png',     name: 'All' },
  { icon: '/deal-page/icons/cat-tv.svg',      name: 'TVs & Soundbars' },
  { icon: '/deal-page/icons/cat-audio.svg',   name: 'Audio Systems' },
  { icon: '/deal-page/icons/cat-fridge.svg',  name: 'Refrigerators' },
  { icon: '/deal-page/icons/cat-washer.svg',  name: 'Washers' },
  { icon: '/deal-page/icons/cat-monitor.svg', name: 'Monitors' },
  { icon: '/deal-page/icons/cat-aircon.svg',  name: 'Residential Air Conditioning' },
];

export function dealCategoryNavDefaults(t: TFunction): DealCategoryNavItem[] {
  return DEAL_CATEGORY_NAV_DEFAULTS.map(c => ({ ...c, name: t(c.name) }));
}


// ── Site header (Figma 6080:50979 — 2280×96) ──────────────────────────────────

export interface DealSiteHeaderState {
  /** Global nav labels — one per line. */
  navItems: string;
  /** Placeholder inside the search pill. */
  searchLabel: string;
  /**
   * Breadcrumb trail — one crumb per line.
   *
   * On the board this band is NOT part of the 96-tall header: it is the first
   * child of the main container (6080:51032), sitting between the header and
   * the hero. It rides along with the header module because that is where it
   * belongs on the page, and nothing else can be dropped between them.
   */
  breadcrumb: string;
  showBreadcrumb: boolean;
}

// ── Site footer (Figma 6080:52867 — 2280×848) ─────────────────────────────────

export interface DealFooterColumn {
  title: string;
  /** Column links — one per line. */
  links: string;
}

export interface DealSiteFooterState {
  /** Legal disclaimers above the link columns — one paragraph per line. */
  disclaimers: string;
  showDisclaimers: boolean;
  moreLabel: string;
  columns: DealFooterColumn[];
  localeLabel: string;
  showSocial: boolean;
  /** Dark bottom bar links — one per line, rendered pipe-separated. */
  legalLinks: string;
  copyright: string;
  officialNotice: string;
  showBadges: boolean;
}

export const DEAL_FOOTER_COLUMN_MIN = 3;
export const DEAL_FOOTER_COLUMN_MAX = 6;

export const DEAL_FOOTER_COLUMN_DEFAULTS: DealFooterColumn[] = [
  { title: 'e-Shop',          links: 'Special solutions and pricing for your business\nBuild your LG Pack\ne-Shop Catalog\nTerms and conditions\nLG.com Promotions - Terms and Conditions' },
  { title: 'TV/Audio/Video',  links: 'TVs & Soundbars\nLifestyle Screens\nSoundbars' },
  { title: 'Home Appliances', links: 'Refrigerators\nWashers\nMicrowaves\nAll Cooking' },
  { title: 'Air Conditioning', links: 'Residential Air Conditioning\nCommercial Air Conditioning\nAir Conditioning Tips' },
  { title: 'Computing',       links: 'Monitors\nComputers' },
  { title: 'Support',         links: 'Register your product\nManuals and Software\nTroubleshooting\nWarranty Policies\nRepair or Installation Tracking\nMy Repair Status' },
];

export function dealFooterColumnDefaults(t: TFunction): DealFooterColumn[] {
  return DEAL_FOOTER_COLUMN_DEFAULTS.map(c => ({
    title: t(c.title),
    links: c.links.split('\n').map(l => t(l)).join('\n'),
  }));
}

/** The five social links in the footer's locale bar. */
export const DEAL_SOCIAL_ICONS = [
  '/deal-page/icons/social-facebook.svg',
  '/deal-page/icons/social-instagram.svg',
  '/deal-page/icons/social-x.svg',
  '/deal-page/icons/social-youtube.svg',
  '/deal-page/icons/social-blog.svg',
];

/** Countdown fields shared by both banner defaults (off until switched on). */
function countdownDefaults(t: TFunction) {
  return {
    showCountdown: false,
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
    dayLabel: t('Day'),
    hourLabel: t('Hour'),
    minuteLabel: t('Minute'),
    secondLabel: t('Second'),
  };
}

// ── Discriminated union ───────────────────────────────────────────────────────

export type DealEditState =
  | { type: 'deal-site-header';  data: DealSiteHeaderState }
  | { type: 'deal-hero';         data: DealHeroState }
  | { type: 'deal-cards';        data: DealCardsState }
  | { type: 'deal-tab-nav';     data: DealTabNavState }
  | { type: 'deal-promo-banner'; data: DealPromoBannerState }
  | { type: 'deal-banner';       data: DealPromoBannerState }
  | { type: 'deal-product-list'; data: DealProductListState }
  | { type: 'deal-category-nav'; data: DealCategoryNavState }
  | { type: 'deal-site-footer';  data: DealSiteFooterState };

// ── Default state factory ─────────────────────────────────────────────────────

export function createDealDefaultState(type: DealModuleType, t: TFunction = identityT): DealEditState {
  switch (type) {
    case 'deal-site-header':
      return {
        type,
        data: {
          navItems: [
            'Online Store', 'TV/Audio/Video', 'Home Appliances', 'Computing',
            'Air Conditioning', 'Accessories', 'Support', 'LG AI',
          ].map(x => t(x)).join('\n'),
          searchLabel: t('Search'),
          breadcrumb: [t('Home'), t('main')].join('\n'),
          showBreadcrumb: true,
        },
      };
    case 'deal-site-footer':
      return {
        type,
        data: {
          disclaimers: [
            t('* Prices, promotions and availability may vary by store and website. Prices are subject to change without notice. Quantities are limited. Check with your local retailers for final price and availability.'),
            t('With LG you will discover a world full of sensations, powered by the most advanced picture and sound technologies — going beyond anything you have experienced. Explore the LG line of TV, audio and home appliances.'),
          ].join('\n'),
          showDisclaimers: true,
          moreLabel: t('More'),
          columns: dealFooterColumnDefaults(t),
          localeLabel: t('English'),
          showSocial: true,
          legalLinks: [
            'Beneficial Ownership Declaration', 'Site Map', 'Legal', 'LGE Service Terms of Use',
            'Terms and Conditions', 'Privacy Policy', 'Cookie Policy', 'Accessibility', 'ARCO Form',
          ].map(x => t(x)).join('\n'),
          copyright: t('Copyright © 2009-2024 LG Electronics. All rights reserved'),
          officialNotice: t('This is the official LG Electronics website. If you want to connect to LG Corp. or other LG affiliates, please click'),
          showBadges: true,
        },
      };
    case 'deal-hero':
      return {
        type,
        data: {
          eyebrow: t('Black Friday Deals'),
          showEyebrow: true,
          headline: t('Every Black Friday deal,\nin one place'),
          subCopy: t('Time Sale · Hot Deals · Bundles   |   November 20 – 30, 2026'),
          showSubCopy: true,
          kvAsset: 'kv-main',
          kvNudgeX: 0,
          kvNudgeY: 0,
          kvScale: 1,
          products: [],
          plateColor: PD_PLATE_FILL,
          customImage: null,
          ...countdownDefaults(t),
        },
      };
    case 'deal-cards':
      return {
        type,
        data: {
          sectionTitle: t('Discover exclusive deals'),
          showSectionTitle: true,
          sectionSubtitle: t('Make life better with our tips.'),
          showSectionSubtitle: true,
          showCta: true,
          showCarousel: true,
          slideCount: '2',
          cards: dealCardDefaults(t),
        },
      };
    case 'deal-tab-nav':
      return {
        type,
        data: {
          tabs: ['Time Sale', 'Hot Deals', 'Bundles', 'Gift'].map(x => t(x)).join('\n'),
          activeIndex: 0,
        },
      };
    case 'deal-promo-banner':
      // The board's "standard setting" frame: PD Slot art with one product
      // already sitting in each of the four plates.
      return {
        type,
        data: {
          layout: 'Art right',
          size: 'Large',
          headline: t('LG Black Friday Exclusive offer\nup to 60% off'),
          subCopy: t('Extra 8% coupon, 24 interest-free installments and free shipping.'),
          showSubCopy: true,
          linkPrimary: t('Terms and Conditions'),
          linkSecondary: t('Privacy Policy'),
          showLinks: true,
          ctaText: t('Shop now'),
          showCta: false,
          image: null,
          kvAsset: 'kv-product-slot',
          kvNudgeX: 0,
          kvNudgeY: 0,
          kvScale: 1,
          showSlots: true,
          products: PROMO_DEFAULT_PRODUCTS.map(p => ({ url: '', image: p })),
          plateColor: PD_PLATE_FILL,
          ...countdownDefaults(t),
        },
      };
    case 'deal-banner':
      return {
        type,
        data: {
          layout: 'Art right',
          size: 'Standard',
          headline: t('Hot Deals, online only'),
          subCopy: t('The season’s deepest markdowns, on LG.com only.'),
          showSubCopy: true,
          linkPrimary: t('Terms and Conditions'),
          linkSecondary: t('Privacy Policy'),
          showLinks: false,
          ctaText: t('Shop now'),
          showCta: false,
          image: null,
          kvAsset: 'deal-type-hot-deal',
          kvNudgeX: 0,
          kvNudgeY: 0,
          kvScale: 1,
          showSlots: true,
          products: [],
          plateColor: PD_PLATE_FILL,
          customImage: null,
          ...countdownDefaults(t),
        },
      };
    case 'deal-product-list':
      return {
        type,
        data: {
          sectionTitle: t('Offer available for a limited time only!'),
          showSectionTitle: true,
          tabs: [t('Refrigerators'), t('Washers')].join('\n'),
          showTabs: true,
          productSet: 'refrigerator',
          products: dealProductSetItems(t, 'refrigerator', 4),
        },
      };
    case 'deal-category-nav':
      return {
        type,
        data: {
          items: dealCategoryNavDefaults(t),
          showResultsBar: true,
          resultsText: t('0 Results'),
          sortLabel: t('Sort by'),
          emptyText: t('There is no available product.'),
          showEmptyText: true,
        },
      };
  }
}
