/**
 * Deal Page module edit states + default factory — mirrors
 * brandshop/modules/editStates.ts for the www.lg.com Deal Page module set.
 *
 * Defaults reproduce the shipped Figma page (`miJcDQgz0yJMskLE5a5HHj`, body
 * 6080:50977) so a freshly dropped module already looks like the real section
 * instead of an empty frame.
 */

import type { DealModuleType } from './dealModuleRegistry';
import type { TFunction } from '../../i18n/LanguageContext';

// Same fallback as the Shop in Shop states: module-scope palette previews are
// built outside the language context, so they render the English source copy.
const identityT = ((s: string) => s) as TFunction;

// ── Hero (Figma 6080:51044 — 2280×720) ────────────────────────────────────────

export interface DealHeroState {
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
}

// ── Deal cards (Figma 6149:67786 — "Discover exclusive deals") ────────────────

export interface DealCardItem {
  image: string | null;
  title: string;
  ctaText: string;
}

export interface DealCardsState {
  sectionTitle: string;
  showSectionTitle: boolean;
  showCta: boolean;
  /**
   * The row is a carousel on lg.com: the counter and the two round arrows sit
   * on the title line (Figma "Indigator" 6149:67794). They are chrome, not
   * content, so they are one switch rather than four editable fields.
   */
  showCarousel: boolean;
  /** Right-hand number in the "1 / 2" counter. */
  slideCount: string;
  cards: DealCardItem[];
}

/** Card count the section supports — 4 is the shipped lg.com row. */
export const DEAL_CARD_MIN = 2;
export const DEAL_CARD_MAX = 4;

/**
 * Card art is the flattened 464×368 render of each Figma card, so the object,
 * its lighting and the scrim under the copy arrive as one baked image — the
 * same way the banners do.
 *
 * ⚠️ Two strings here are deliberately NOT what Figma shows: card 3's CTA is
 * "Show now" (a typo) and card 4 is still Spanish. Fixed here; fix the board
 * too and these will match again.
 */
export const DEAL_CARD_DEFAULTS: DealCardItem[] = [
  { image: '/deal-page/card-1.png', title: 'Time Sale, hourly',        ctaText: 'Shop now' },
  { image: '/deal-page/card-2.png', title: 'Hot Deals, 60% off',       ctaText: 'Shop now' },
  { image: '/deal-page/card-3.png', title: 'Bundles, save even more',  ctaText: 'Shop now' },
  { image: '/deal-page/card-4.png', title: 'More benefits in a combo!', ctaText: 'Shop now' },
];

export function dealCardDefaults(t: TFunction): DealCardItem[] {
  return DEAL_CARD_DEFAULTS.map(c => ({ ...c, title: t(c.title), ctaText: t(c.ctaText) }));
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
 * The page runs two banner heights: the hero-adjacent exclusive-offer banner is
 * 400 tall (Figma 6080:51204), and the Hot Deals / Bundles / Gifts banners
 * further down are 320 (6080:52226, 52439, 52643). Same rail, different rhythm
 * — and a different band height, since only the 400 one is padded below.
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

// ── Time Sale (Figma 6080:51264 — 2280×398) ───────────────────────────────────

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

export interface DealProductListState {
  sectionTitle: string;
  showSectionTitle: boolean;
  /** Tab strip above the grid — one label per line, first one is active. */
  tabs: string;
  showTabs: boolean;
  products: DealProductItem[];
}

/**
 * The rail fits four 342 cards at a 366 pitch (Figma "Slider Label Title"
 * 6080:51305). Cards are FIXED width — a shorter row is left-aligned and simply
 * leaves the rest of the rail empty, exactly as the board does.
 */
export const DEAL_PRODUCT_MIN = 2;
export const DEAL_PRODUCT_MAX = 4;

const DEAL_PRODUCT_IMAGES = [
  '/deal-page/product-1.png',
  '/deal-page/product-2.png',
  '/deal-page/product-3.png',
  '/deal-page/product-1.png',
];

const DEAL_PRODUCT_SEED = [
  { name: 'LG Side by Side Refrigerator 617L Door-in-Door, Silver', sku: 'GS66SDP', rating: '4.9', reviewCount: '(10)',  discountPercent: '29%', salePrice: '$1,135', originalPrice: '$1,608' },
  { name: 'LG Side by Side Refrigerator 625L, no water line required, Total No Frost', sku: 'GS66SPY', rating: '4.6', reviewCount: '(517)', discountPercent: '36%', salePrice: '$1,000', originalPrice: '$1,567' },
  { name: 'LG Side by Side Refrigerator 658L with Smart Diagnosis, Total No Frost',    sku: 'GS66BPM', rating: '4.7', reviewCount: '(45)',  discountPercent: '19%', salePrice: '$729',   originalPrice: '$965'   },
  { name: 'LG Washer Dryer 12kg Wash / 7kg Dry, AI DD\u2122 and ThinQ',               sku: 'WD12BVC2S6C', rating: '4.2', reviewCount: '(55)', discountPercent: '54%', salePrice: '$513', originalPrice: '$1,121' },
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

// ── Membership CTA (Figma 6080:52852 — 2280×476) ──────────────────────────────

export interface DealMembershipState {
  headline: string;
  subCopy: string;
  showSubCopy: boolean;
  ctaText: string;
  showCta: boolean;
  image: string | null;
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
  | { type: 'deal-membership';   data: DealMembershipState }
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
          kvAsset: 'kv-main',
          kvNudgeX: 0,
          kvNudgeY: 0,
          kvScale: 1,
          products: [],
        },
      };
    case 'deal-cards':
      return {
        type,
        data: {
          sectionTitle: t('Discover exclusive deals'),
          showSectionTitle: true,
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
      return {
        type,
        data: {
          layout: 'Art right',
          size: 'Large',
          headline: t('LG Black Friday Exclusive offer\nup to 60% off'),
          subCopy: t('Extra 8% coupon, 24 interest-free installments'),
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
          emptyText: t('There is no available product.'),
          showEmptyText: true,
        },
      };
    case 'deal-membership':
      return {
        type,
        data: {
          headline: t('Become an LG Member today and enjoy exclusive Black Friday benefits instantly.'),
          subCopy: t('Sign up now to unlock your Black Friday member rewards.'),
          showSubCopy: true,
          ctaText: t('Join us'),
          showCta: true,
          image: '/deal-page/banner-membership.png',
        },
      };
  }
}
