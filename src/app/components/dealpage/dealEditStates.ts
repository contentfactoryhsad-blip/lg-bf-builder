/**
 * Deal Page module edit states + default factory — mirrors
 * brandshop/modules/editStates.ts for the www.lg.com Deal Page module set.
 *
 * Defaults reproduce the shipped Figma page (1:1212) so a freshly dropped
 * module already looks like the real section instead of an empty frame.
 */

import type { DealModuleType } from './dealModuleRegistry';
import type { TFunction } from '../../i18n/LanguageContext';

// Same fallback as the Shop in Shop states: module-scope palette previews are
// built outside the language context, so they render the English source copy.
const identityT = ((s: string) => s) as TFunction;

// ── Hero (Figma 1:1279) ───────────────────────────────────────────────────────

export interface DealHeroState {
  eyebrow: string;
  showEyebrow: boolean;
  headline: string;
  subCopy: string;
  showSubCopy: boolean;
  kvImage: string | null;
}

// ── Deal cards (Figma 1:1298 — "Discover exclusive deals") ────────────────────

export interface DealCardItem {
  image: string | null;
  title: string;
  ctaText: string;
}

export interface DealCardsState {
  sectionTitle: string;
  showSectionTitle: boolean;
  showCta: boolean;
  cards: DealCardItem[];
}

/** Card count the section supports — 4 is the shipped lg.com row. */
export const DEAL_CARD_MIN = 2;
export const DEAL_CARD_MAX = 4;

export const DEAL_CARD_DEFAULTS: DealCardItem[] = [
  { image: '/deal-page/obj-clock.png',  title: 'Time Sale, hourly',      ctaText: 'Shop now' },
  { image: '/deal-page/obj-cube.png',   title: 'Hot Deals, 60% off',     ctaText: 'Shop now' },
  { image: '/deal-page/obj-puzzle.png', title: 'Bundles, save even more', ctaText: 'Shop now' },
  { image: '/deal-page/obj-gift.png',   title: 'Gifts with purchase',    ctaText: 'Shop now' },
];

export function dealCardDefaults(t: TFunction): DealCardItem[] {
  return DEAL_CARD_DEFAULTS.map(c => ({ ...c, title: t(c.title), ctaText: t(c.ctaText) }));
}

// ── Deal tab nav (Figma 1:1486) ───────────────────────────────────────────────

export interface DealTabNavState {
  /** One tab label per line. */
  tabs: string;
  /** Which tab carries the red rule. */
  activeIndex: number;
}

export const DEAL_TAB_MAX = 6;

// ── Promotion banner (Figma 1:1383 / 1:2457 / 1:2670 / 1:2874) ────────────────

/** Where the art sits relative to the copy — every shipped banner is right-art. */
export type DealBannerLayout = 'Art right' | 'Art left';

/**
 * The page runs two banner heights: the hero-adjacent exclusive-offer banner is
 * 400 tall (Figma 1:1388), and the Hot Deals / Bundles / Gifts banners further
 * down are 320 (Figma 1:2460, 1:2673, 1:2877). Same frame, different rhythm.
 */
export type DealBannerSize = 'Large' | 'Standard';

export const DEAL_BANNER_HEIGHT: Record<DealBannerSize, number> = { Large: 400, Standard: 320 };

export interface DealPromoBannerState {
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
  image: string | null;
}

// ── Time Sale (Figma 1:1499) ──────────────────────────────────────────────────

export interface DealTimeSaleState {
  headline: string;
  subCopy: string;
  showSubCopy: boolean;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  dayLabel: string;
  hourLabel: string;
  minuteLabel: string;
  secondLabel: string;
  image: string | null;
}

// ── Product list (Figma 1:1526 / 1:1727) ──────────────────────────────────────

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

export interface DealProductListState {
  sectionTitle: string;
  showSectionTitle: boolean;
  /** Tab strip above the grid — one label per line, first one is active. */
  tabs: string;
  showTabs: boolean;
  products: DealProductItem[];
}

/** The grid is 3-up at 1488 (Figma 1:1540) or 4-up (Figma 1:1745). */
export const DEAL_PRODUCT_MIN = 2;
export const DEAL_PRODUCT_MAX = 4;

const DEAL_PRODUCT_IMAGES = [
  '/deal-page/product-fridge-1.png',
  '/deal-page/product-fridge-2.png',
  '/deal-page/product-fridge-3.png',
  '/deal-page/product-fridge-1.png',
];

const DEAL_PRODUCT_SEED = [
  { name: 'LG Side by Side Refrigerator 617L Door-in-Door, Silver', sku: 'GS66SDP', rating: '4.9', reviewCount: '(10)',  discountPercent: '29%', salePrice: '$1,135', originalPrice: '$1,608' },
  { name: 'LG Side by Side Refrigerator 625L, no water line required, Total No', sku: 'GS66SPY', rating: '4.6', reviewCount: '(517)', discountPercent: '36%', salePrice: '$1,000', originalPrice: '$1,567' },
  { name: 'LG Side by Side Refrigerator 658L with Smart Diagnosis, Total No',    sku: 'GS66BPM', rating: '4.7', reviewCount: '(45)',  discountPercent: '19%', salePrice: '$729',   originalPrice: '$965'   },
  { name: 'LG Washer Dryer 12kg Wash / 7kg Dry, AI DD and ThinQ',                sku: 'WD12VC2S6C', rating: '4.2', reviewCount: '(35)', discountPercent: '54%', salePrice: '$513', originalPrice: '$1,121' },
];

export function dealProductDefaultItem(t: TFunction, i: number): DealProductItem {
  const seed = DEAL_PRODUCT_SEED[i % DEAL_PRODUCT_SEED.length];
  return {
    badge: t('9 interest-free installments'),
    showBadge: true,
    name: t(seed.name),
    sku: seed.sku,
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    showRating: true,
    image: DEAL_PRODUCT_IMAGES[i % DEAL_PRODUCT_IMAGES.length],
    discountPercent: seed.discountPercent,
    showDiscountPercent: true,
    salePrice: seed.salePrice,
    originalPrice: seed.originalPrice,
    showOriginalPrice: true,
    shippingNote: t('Free Shipping'),
    showShippingNote: true,
    secondaryCta: t('Learn more'),
    primaryCta: t('Buy now'),
  };
}

// ── Category nav (Figma 1:2365) ───────────────────────────────────────────────

export interface DealCategoryNavItem {
  icon: string | null;
  name: string;
}

export interface DealCategoryNavState {
  items: DealCategoryNavItem[];
  showResultsBar: boolean;
  resultsText: string;
  sortLabel: string;
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


// ── Site header (Figma 1:1214 + breadcrumb 1:1267) ────────────────────────────

export interface DealSiteHeaderState {
  /** Top-right utility link next to the logo. */
  businessLabel: string;
  showBusinessLabel: boolean;
  /** Global nav labels — one per line. */
  navItems: string;
  /** Breadcrumb trail — one crumb per line, last one renders as the current page. */
  breadcrumb: string;
  showBreadcrumb: boolean;
}

// ── Site footer (Figma 1:3102) ────────────────────────────────────────────────

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

/** The five social links in the footer's locale bar (Figma 1:3226). */
export const DEAL_SOCIAL_ICONS = [
  '/deal-page/icons/social-facebook.svg',
  '/deal-page/icons/social-instagram.svg',
  '/deal-page/icons/social-x.svg',
  '/deal-page/icons/social-youtube.svg',
  '/deal-page/icons/social-blog.svg',
];

// ── Discriminated union ───────────────────────────────────────────────────────

export type DealEditState =
  | { type: 'deal-site-header';  data: DealSiteHeaderState }
  | { type: 'deal-hero';         data: DealHeroState }
  | { type: 'deal-cards';        data: DealCardsState }
  | { type: 'deal-tab-nav';     data: DealTabNavState }
  | { type: 'deal-promo-banner'; data: DealPromoBannerState }
  | { type: 'deal-time-sale';    data: DealTimeSaleState }
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
          businessLabel: t('Business'),
          showBusinessLabel: true,
          navItems: [
            'Online Store', 'TV/Audio/Video', 'Home Appliances', 'Computing',
            'Air Conditioning', 'Accessories', 'Support', 'LG AI',
          ].map(x => t(x)).join('\n'),
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
          localeLabel: t('Peru, English'),
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
          kvImage: '/deal-page/hero-kv.png',
        },
      };
    case 'deal-cards':
      return {
        type,
        data: {
          sectionTitle: t('Discover exclusive deals'),
          showSectionTitle: true,
          showCta: true,
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
          image: '/deal-page/banner-exclusive.png',
        },
      };
    case 'deal-time-sale':
      return {
        type,
        data: {
          headline: t('Time Sale ends in'),
          subCopy: t('Limited hours only — when the clock stops, the price is gone.'),
          showSubCopy: true,
          days: '00',
          hours: '00',
          minutes: '00',
          seconds: '00',
          dayLabel: t('Day'),
          hourLabel: t('Hour'),
          minuteLabel: t('Minute'),
          secondLabel: t('Second'),
          image: '/deal-page/banner-time-sale.png',
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
          products: [0, 1, 2].map(i => dealProductDefaultItem(t, i)),
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
        },
      };
  }
}
