import { ModuleType } from './moduleRegistry';
import type { TFunction } from '../../../i18n/LanguageContext';
import {
  OtherPromoThemeState,
  makeOtherPromoThemeState,
} from '../templates/OtherPromoThemeTemplate';
import {
  OtherPromoLifestyleState,
  makeOtherPromoLifestyleState,
} from '../templates/OtherPromoLifestyleTemplate';

// Fallback when no t() is supplied (e.g. module-scope palette previews,
// where language context isn't available). Live creation paths (drop on
// canvas, presets, count-selector restores) pass the real t() so canvas
// example copy is seeded in the active language.
const identityT = ((s: string) => s) as TFunction;

// ── Per-module state types ────────────────────────────────────────────────────

/** Last crop framing (react-easy-crop pan + zoom) so "Edit Crop" can resume it. */
export interface ImageCropState {
  crop: { x: number; y: number };
  zoom: number;
  /** The aspect the crop frame had when this was saved. Reopening can then
   *  notice the destination aspect has since changed — Product cards switch
   *  between the wide and the square crop as the count changes — and reframe
   *  from scratch rather than restoring a zoom that no longer fits. */
  aspect?: number;
}

/**
 * The four graphics flanking the slogan (Figma 2048:17909).
 *
 * Thailand fills these with sales graphics from the shared theme-object library
 * rather than with product shots. Framing works exactly as it does for a product
 * slot: the pick goes through the crop window and what lands here is the baked
 * 1:1 result.
 */
export interface OfficialStoreState {
  storeNameText: string;
  productImages: (string | null)[];
  /** Pre-crop source per slot — lets the crop window reopen the ORIGINAL asset
   *  (non-destructive) instead of re-cropping the already-baked output. */
  productImagesOriginal?: (string | null)[];
  /** Last crop framing per slot, so reopening resumes where it was left. */
  productImagesCrop?: (ImageCropState | null)[];
}

/** Frame the graphics are drawn in — the same 180 box on every surface. */
export const SALES_GRAPHIC_FRAME = 180;

/**
 * Per-asset opening zoom for the crop window, first match wins.
 *
 * A few assets — the bell and the gift box — carry less padding of their own
 * and so read heavier than the rest at the same framing, and each design pulls
 * them in by a different amount. Each surface therefore owns its own table,
 * taken from its Figma frame, so a freshly picked asset lands where the shipped
 * default sits. Matched on the library's file name, which is what the picker
 * hands over.
 */
export type SalesGraphicZoomTable = Array<{ match: RegExp; zoom: number }>;

export function salesGraphicZoom(assetName: string, table: SalesGraphicZoomTable): number {
  return table.find((r) => r.match.test(assetName))?.zoom ?? 1;
}

/** Official store banner (Figma 2048:17909). */
export const OFFICIAL_STORE_SALES_GRAPHIC_ZOOM: SalesGraphicZoomTable = [
  { match: /(sub-bell|gift-(front|side|bird))/i, zoom: 170 / SALES_GRAPHIC_FRAME },
];

export interface FollowUsState {
  mainCopy: string;
  subCopy: string;
  showSubCopy: boolean;
}

export type TextVariant = 'Warm Gray 07' | 'Warm Gray 05' | 'Warm Gray 01' | 'Gradient';

export interface TextModuleState {
  variant: TextVariant;
  textLeft: string;
  textRight: string;
  showSecondCopy: boolean;
}

export interface KvState {
  showCampaignLogo: boolean;
  campaignLogo: string | null;
  headline: string;
  showSubCopy: boolean;
  subCopy: string;
  ctaText: string;
  kvImage: string | null;
  /** Pre-crop source — lets "Edit Crop" reopen the ORIGINAL image instead of re-cropping the already-baked output. */
  kvImageOriginal?: string | null;
  /** Last crop framing — lets "Edit Crop" resume where the user left off. */
  kvImageCrop?: ImageCropState | null;
  showDisclaimer: boolean;
  disclaimer: string;
  disclaimerColor: string;
}

export interface ProductCardItem {
  image: string | null;       // Price ver. / ProductCards image
  imageOriginal?: string | null;
  imageCrop?: ImageCropState | null;
  rankImage: string | null;   // Rank ver. image (independent slot)
  rankImageOriginal?: string | null;
  rankImageCrop?: ImageCropState | null;
  /**
   * What "Edit background removal" reopens the brush with: the shot as supplied,
   * and the cut before it was padded and cropped. Neither is `imageOriginal` —
   * that is the crop's source, already through removal and padding, and the
   * restore brush has to line up pixel-for-pixel with the shot it samples.
   */
  imageSource?: string | null;
  imageCut?: string | null;
  rankImageSource?: string | null;
  rankImageCut?: string | null;
  modelName: string;
  features: string;
  originalPrice: string;
  salePrice: string;
  discountPercent: string;
  rankLabel: string;
  showOriginalPrice: boolean;
  showSalePrice: boolean;
  showDiscountPercent: boolean;
}

export type KvProductListVariant = 'Price/Feature ver.' | 'Rank ver.';

export interface KvProductListState {
  variant: KvProductListVariant;
  showCampaignLogo: boolean;
  campaignLogo: string | null;
  headline: string;
  kvImage: string | null;
  kvImageOriginal?: string | null;
  kvImageCrop?: ImageCropState | null;
  products: ProductCardItem[];      // Price ver. cards
  rankProducts: ProductCardItem[];  // Rank ver. cards (independent)
}

export interface CategoryItem {
  image: string | null;
  imageOriginal?: string | null;
  imageCrop?: ImageCropState | null;
  /**
   * What "Edit background removal" reopens the brush with: the shot as supplied,
   * and the cut before it was padded and cropped. Neither is `imageOriginal` —
   * that is the crop's source, already through removal and padding, and the
   * restore brush has to line up pixel-for-pixel with the shot it samples.
   */
  imageSource?: string | null;
  imageCut?: string | null;
  name: string;
}

export interface CategoryListState {
  sectionTitle: string;
  categories: CategoryItem[];
}

// Curated default category set (5). Used as the initial state and to restore
// items by position when the count control grows back up (mirrors VP_DEFAULT_PROPS).
// Names are canonical English keys — translate with catDefaultCategories(t).
export const CAT_DEFAULT_CATEGORIES: CategoryItem[] = [
  { image: '/store-modules/category-appliances.png', name: 'Appliances' },
  { image: '/store-modules/category-tv-audio.png', name: 'TV & Audio' },
  { image: '/store-modules/category-monitor.png', name: 'Monitor & PC' },
  { image: '/store-modules/category-air-solutions.png', name: 'Air Solutions' },
  { image: '/store-modules/category-accessories.png', name: 'Accessories' },
];

export function catDefaultCategories(t: TFunction): CategoryItem[] {
  return CAT_DEFAULT_CATEGORIES.map(c => ({ ...c, name: t(c.name) }));
}

// 2, 3, 4 or 6 cards. 5 is left out on purpose — 3+2 and 2+2+1 both end on a
// half-empty row, which reads as unfinished at 1200px.
export const PRODUCT_CARD_COUNTS = [2, 3, 4, 6] as const;

// Only three curated product photos exist, so cycle them — a fresh 6-card
// layout should never open with an empty image box.
const PRODUCT_CARD_IMAGES = [
  '/store-modules/kvpl-product1.png',
  '/store-modules/kvpl-product2.png',
  '/store-modules/kvpl-product3.png',
  '/store-modules/kvpl-product1.png',
  '/store-modules/kvpl-product2.png',
  '/store-modules/kvpl-product3.png',
];
const PRODUCT_CARD_RANK_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

export function productCardDefaultItem(t: TFunction, i: number): ProductCardItem {
  return {
    image: PRODUCT_CARD_IMAGES[i] ?? null,
    rankImage: null,
    modelName: t('Model name'),
    features: t('Write the features up to 3 lines'),
    originalPrice: '$729.00',
    salePrice: '$624.68',
    discountPercent: '22%',
    rankLabel: t(PRODUCT_CARD_RANK_LABELS[i] ?? `${i + 1}`),
    showOriginalPrice: true,
    showSalePrice: true,
    showDiscountPercent: true,
  };
}

export function rankCardDefaultItem(t: TFunction, i: number): ProductCardItem {
  return {
    image: null,
    rankImage: PRODUCT_CARD_IMAGES[i] ?? null,
    modelName: t('Model name'),
    features: t('Write the features up to 3 lines'),
    originalPrice: '',
    salePrice: '',
    discountPercent: '',
    rankLabel: t(PRODUCT_CARD_RANK_LABELS[i] ?? `${i + 1}`),
    showOriginalPrice: true,
    showSalePrice: true,
    showDiscountPercent: true,
  };
}

export type ProductCardsVariant = 'Price/Feature ver.' | 'Rank ver.';

export interface ProductCardsState {
  variant: ProductCardsVariant;
  sectionTitle: string;
  period: string;
  showPeriod: boolean;
  showCta: boolean;
  ctaText: string;
  products: ProductCardItem[];      // Price ver. cards
  rankProducts: ProductCardItem[];  // Rank ver. cards (independent)
}

export type BannerVariant = 'Lifestyle ver.' | 'Product ver.';

/** One slide of a Banner carousel group. */
export interface BannerSlideState {
  variant: BannerVariant;
  /** Product ver. — reuses the Other Promotions "promotion theme" system
   *  (example banners, image bg color, background text, theme objects, plus
   *  sign, product images with fetch/upload/AI bg-removal + drag/resize). */
  themeState: OtherPromoThemeState;
  /** Lifestyle ver. — shape-masked image with fetch/upload/crop + drag/zoom. */
  lifestyleState: OtherPromoLifestyleState;
}

/** A Banner carousel group — one canvas item holding up to BANNER_SLIDE_MAX
 *  slides. The page may carry up to the registry's maxCount groups. */
export interface BannerGroupState {
  slides: BannerSlideState[];
}

export const BANNER_SLIDE_MIN = 1;
export const BANNER_SLIDE_MAX = 6;

export function makeDefaultBannerSlide(t: TFunction): BannerSlideState {
  return {
    variant: 'Product ver.',
    themeState: makeOtherPromoThemeState(t),
    // Lifestyle coords are box-relative (0,0 = 500×548 box top-left),
    // not the live section's banner-coord organic-blob geometry.
    // Default photo + crop reproduce Figma node 2015:7650's example
    // pixel-for-pixel: same living-room photo, same crop window.
    lifestyleState: {
      ...makeOtherPromoLifestyleState(t),
      imageSrc: '/store-modules/banner-lifestyle-default.png',
      imageX: -681.66,
      imageY: -357.52,
      imageWidth: 1416.56,
      imageHeight: 1141.55,
    },
  };
}

export interface VoucherItem {
  typeLabel: string;
  valueText: string;
}

// Curated default set (Figma 3-voucher example). Also used by the EP's
// "Number of vouchers" selector to restore these exact items when growing
// back up, instead of generic placeholders.
// Labels are canonical English keys — translate with voucherDefaultItems(t).
export const VOUCHER_DEFAULT_ITEMS: VoucherItem[] = [
  { typeLabel: 'Store Voucher', valueText: 'Up to\n$240* Off' },
  { typeLabel: 'with Platform Voucher', valueText: 'Stacked\nSavings' },
  { typeLabel: 'Excl. Accessories', valueText: 'Free\nDelivery*' },
];

export function voucherDefaultItems(t: TFunction): VoucherItem[] {
  return VOUCHER_DEFAULT_ITEMS.map(v => ({ typeLabel: t(v.typeLabel), valueText: t(v.valueText) }));
}

// How many tickets are shown determines shape/color, per Figma:
// 1 ticket → the red-fill "shape 2" style (Figma 2468-48250)
// 2 tickets → both white/red-outline, "shape 1" + "shape 3" (Figma 2468-48336)
// 3 tickets → current layout: shape 1/2/3 in order, middle one red-filled
export function voucherVisual(count: number, i: number): { isRed: boolean; shapeIndex: number } {
  if (count === 1) return { isRed: true, shapeIndex: 1 };
  if (count === 2) return { isRed: false, shapeIndex: i === 0 ? 0 : 2 };
  return { isRed: i === 1, shapeIndex: i };
}

export interface VouchersState {
  sectionTitle: string;
  showGroup1: boolean;
  group1Subtitle: string;
  showGroup1Subtitle: boolean;
  showGroup1Period: boolean;
  group1Period: string;
  vouchers: VoucherItem[];
  showGroup2: boolean;
  group2Subtitle: string;
  showGroup2Subtitle: boolean;
  showGroup2Period: boolean;
  group2Period: string;
  group2SmallCopy: string;   // gray copy inside the member banner
  group2Copy: string;        // large black copy inside the member banner
  couponDiscountValue: string;
  couponMinSpend: string;
  ctaText: string;
  showGroup3: boolean;
  group3Subtitle: string;
  showGroup3Subtitle: boolean;
  showGroup3Period: boolean;
  group3Period: string;
  smallVouchers: SmallVoucherItem[];
  /** The static "Off" that follows every price. Shared by all the cards rather
   *  than stored per card, and seeded through t() here because ModuleRenderer
   *  has no access to the translator. */
  group3OffLabel: string;
  showDisclaimer: boolean;
  disclaimer: string;
}

export interface SmallVoucherItem {
  price: string;    // e.g. "$40" — "Off" is static per Figma, not user-editable
  subCopy: string;  // e.g. "min. spend $400*"
}

export const SMALL_VOUCHER_MIN = 2;
export const SMALL_VOUCHER_MAX = 5;

// The Figma 5-voucher example (node 2753:20827). Also what the EP's count
// selector restores by position when growing back up.
export const SMALL_VOUCHER_DEFAULT_ITEMS: SmallVoucherItem[] = [
  { price: '$40', subCopy: 'min. spend $400*' },
  { price: '$80', subCopy: 'min. spend $800*' },
  { price: '$140', subCopy: 'min. spend $1000*' },
  { price: '$180', subCopy: 'min. spend $1600*' },
  { price: '$240', subCopy: 'min. spend $2000*' },
];

export function smallVoucherDefaultItems(t: TFunction): SmallVoucherItem[] {
  return SMALL_VOUCHER_DEFAULT_ITEMS.map(v => ({ price: v.price, subCopy: t(v.subCopy) }));
}

export interface ValuePropItem {
  label: string;
  icon: string; // vpIcons.ts slug — one of the 36 "Line black" Figma variants
}

// The curated 7-item example set (Figma default). Also used by the EP's
// "Number of icons" selector to restore these exact items when growing back
// up, instead of generic placeholders.
// Labels are canonical English keys — translate with vpDefaultProps(t).
export const VP_DEFAULT_PROPS: ValuePropItem[] = [
  { label: 'Excellent Service', icon: 'vip' },
  { label: 'Trusted Seller', icon: 'loyalty' },
  { label: 'Free Basic Installation', icon: 'free-installation' },
  { label: 'Official Warranty', icon: 'warranty' },
  { label: 'Promotion Benefits', icon: 'coupon' },
  { label: 'Free Delivery', icon: 'free-delivery' },
  { label: 'Free Disposal', icon: 'free-disposal' },
];

export function vpDefaultProps(t: TFunction): ValuePropItem[] {
  return VP_DEFAULT_PROPS.map(p => ({ ...p, label: t(p.label) }));
}

export interface ValuePropsState {
  sectionTitle: string;
  props: ValuePropItem[];
}

// ── Discriminated union ───────────────────────────────────────────────────────

export type ModuleEditState =
  | { type: 'official-store'; data: OfficialStoreState }
  | { type: 'follow-us'; data: FollowUsState }
  | { type: 'text'; data: TextModuleState }
  | { type: 'kv'; data: KvState }
  | { type: 'kv-product-list'; data: KvProductListState }
  | { type: 'category-list'; data: CategoryListState }
  | { type: 'product-cards'; data: ProductCardsState }
  | { type: 'banner'; data: BannerGroupState }
  | { type: 'vouchers'; data: VouchersState }
  | { type: 'value-props'; data: ValuePropsState };

// ── Default state factory ─────────────────────────────────────────────────────

export function createDefaultState(type: ModuleType, t: TFunction = identityT): ModuleEditState {
  const productCardDefaults = () => ({
    products: [0, 1, 2].map(i => productCardDefaultItem(t, i)),
    rankProducts: [0, 1, 2].map(i => rankCardDefaultItem(t, i)),
  });

  switch (type) {
    case 'official-store':
      return {
        type,
        data: {
          storeNameText: t('LG Official Store'),
          // The four Figma 2048:17909 picks, copied out of the value-prop
          // library and into public/ so the export stays same-origin.
          productImages: [
            '/store-modules/official-store-1.png',
            '/store-modules/official-store-2.png',
            '/store-modules/official-store-3.png',
            '/store-modules/official-store-4.png',
          ],
        },
      };
    case 'follow-us':
      return {
        type,
        data: {
          mainCopy: t('Follow us & Enjoy $20 OFF'),
          subCopy: t('min. spend\n$100 Voucher'),
          showSubCopy: true,
        },
      };
    case 'text':
      return {
        type,
        data: {
          variant: 'Warm Gray 01',
          textLeft: t('Lorem ipsum dolor sit'),
          textRight: t('Lorem ipsum dolor sit'),
          showSecondCopy: true,
        },
      };
    case 'kv':
      return {
        type,
        data: {
          showCampaignLogo: true,
          campaignLogo: '/store-modules/kv-campaign-logo-example.png',
          headline: t('Lorem ipsum dolor sit amet,\nconsectetur adipiscing elit'),
          showSubCopy: true,
          subCopy: t('Lorem ipsum dolor sit amet, consectetur adipiscing elit'),
          ctaText: t('Shop Now'),
          kvImage: '/store-modules/kv-default-bg.png',
          showDisclaimer: true,
          disclaimer: t('*T&Cs apply'),
          disclaimerColor: '#000000',
        },
      };
    case 'kv-product-list':
      return {
        type,
        data: {
          variant: 'Price/Feature ver.' as KvProductListVariant,
          showCampaignLogo: true,
          campaignLogo: '/store-modules/kvpl-campaign-logo.png',
          headline: t('Lorem ipsum dolor sit amet,\nconsectetur adipiscing elit'),
          kvImage: '/store-modules/kvpl-bg.png',
          ...productCardDefaults(),
        },
      };
    case 'category-list':
      return {
        type,
        data: {
          sectionTitle: t('Shop by Category'),
          categories: catDefaultCategories(t),
        },
      };
    case 'product-cards':
      return {
        type,
        data: {
          variant: 'Price/Feature ver.',
          sectionTitle: t('Promotion name'),
          period: '2026.00.00-00.00',
          showPeriod: true,
          showCta: true,
          ctaText: t('Check out more products'),
          ...productCardDefaults(),
        },
      };
    case 'banner':
      return { type, data: { slides: [makeDefaultBannerSlide(t)] } };
    case 'vouchers':
      return {
        type,
        data: {
          sectionTitle: t('Promotion Vouchers'),
          showGroup1: true,
          group1Subtitle: t('Limited Time Vouchers'),
          showGroup1Subtitle: true,
          showGroup1Period: true,
          group1Period: '2026.00.00-00.00',
          vouchers: voucherDefaultItems(t),
          showGroup2: true,
          group2Subtitle: t('Member-exclusive Voucher'),
          showGroup2Subtitle: true,
          showGroup2Period: true,
          group2Period: '2026.00.00-00.00',
          group2SmallCopy: t('Member-exclusive Voucher Drop'),
          group2Copy: t('Join as a member for free and enjoy a special voucher'),
          couponDiscountValue: t('$50 Off'),
          couponMinSpend: t('min. spend $400'),
          ctaText: t('Join now'),
          showGroup3: true,
          group3Subtitle: t('Other Vouchers'),
          showGroup3Subtitle: true,
          showGroup3Period: true,
          group3Period: '2026.00.00-00.00',
          smallVouchers: smallVoucherDefaultItems(t),
          group3OffLabel: t('Off'),
          showDisclaimer: true,
          disclaimer: t('*T&Cs apply'),
        },
      };
    case 'value-props':
      return {
        type,
        data: {
          sectionTitle: t('Value Props'),
          props: vpDefaultProps(t),
        },
      };
  }
}
