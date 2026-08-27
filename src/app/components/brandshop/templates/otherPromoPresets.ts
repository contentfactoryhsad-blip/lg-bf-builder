/**
 * Promotion theme — 6 preset banner configurations from Figma.
 *
 * Each preset is a partial state that overrides the base default. Click a
 * preset button in the editor → spread over the current state to apply.
 *
 * Coordinates are in IMAGE_SECTION-relative pixel space (500 × 548).
 * Sourced from Figma file 5Vqt1jiDnaERLEdNLAzP5t, Promotion-02 ~ -07.
 */
import type {
  OtherPromoThemeState,
  PlacedImage,
  ProductImageSlots,
  ThemeObjectSlots,
  ImageBgColorKey,
} from './OtherPromoThemeTemplate';
import type { TFunction } from '../../../i18n/LanguageContext';

export interface OtherPromoPreset {
  id: string;
  label: string;
  imageBgColor: ImageBgColorKey;
  headCopy: string;
  showSubCopy: boolean;
  subCopy: string;
  ctaText: string;
  showDisclaimer: boolean;
  disclaimerText: string;
  showBigText: boolean;
  bigText: string;
  /** Background text layout — matches Figma per-preset Title element */
  bigTextLeft: number;
  bigTextTop: number;
  bigTextWidth: number;
  showThemeObjects: boolean;
  themeObjects: ThemeObjectSlots;
  productImages: ProductImageSlots;
  showPlusSign: boolean;
  plusSign: PlacedImage;
}

const DEFAULT_PLUS_SIGN: PlacedImage = {
  id: 'plus-sign',
  src: '/brand-shop/other-promotion/plus-sign.svg',
  x: (500 - 50) / 2,
  y: (548 - 50) / 2,
  width: 50,
  height: 50,
};

function product(idx: number, src: string, x: number, y: number, width: number, height: number): PlacedImage {
  return { id: `product-${idx}`, src, x, y, width, height };
}

function productZoom(
  idx: number,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number,
  imageScale: number,
  imageOffsetX: number,
  imageOffsetY: number,
): PlacedImage {
  return { id: `product-${idx}`, src, x, y, width, height, imageScale, imageOffsetX, imageOffsetY };
}

function theme(idx: number, src: string, x: number, y: number, width: number, height: number, rotation = 0): PlacedImage {
  return { id: `theme-${idx}`, src, x, y, width, height, rotation };
}

/**
 * Order = display order in editor:
 *   AOB1 (washer) → AOB2 (air purifier) → AOB3 (TV+sound) → AOB4 (online ex) → PB (back to school)
 */
export function makePromotionPresets(t: TFunction): OtherPromoPreset[] {
  return [
  {
    id: 'aob-1',
    label: t('Always-On Banner 1'),
    imageBgColor: 'warm-gray-03',
    headCopy: t('Bundle Deals'),
    showSubCopy: true,
    subCopy: t('Reap greater value on popular combos'),
    ctaText: t('Shop now'),
    showDisclaimer: false,
    disclaimerText: '',
    showBigText: true,
    bigText: 'Bundles',
    bigTextLeft: -10, bigTextTop: 0, bigTextWidth: 530,
    showThemeObjects: false,
    themeObjects: [null, null],
    productImages: [
      product(0, '/brand-shop/other-promotion/presets/p05-dryer.png', 26.811, 201.806, 176.856, 250.634),
      product(1, '/brand-shop/other-promotion/presets/p05-wm.png', 294.667, 201.806, 176.902, 250.634),
      null, null,
    ],
    showPlusSign: true,
    plusSign: { ...DEFAULT_PLUS_SIGN, x: 223.667, y: 302.123 },
  },
  {
    id: 'aob-2',
    label: t('Always-On Banner 2'),
    imageBgColor: 'green',
    headCopy: t('Leave no space uncovered with\na right-sized air purifier in every room'),
    showSubCopy: false,
    subCopy: '',
    ctaText: t('Shop now'),
    showDisclaimer: true,
    disclaimerText: t('*T&Cs apply. While stocks last.'),
    showBigText: true,
    bigText: 'Bundles',
    bigTextLeft: -10, bigTextTop: 0, bigTextWidth: 530,
    showThemeObjects: false,
    themeObjects: [null, null],
    productImages: [
      product(0, '/brand-shop/other-promotion/presets/p04-1st.png', 79.434, 59.81, 108.532, 428),
      product(1, '/brand-shop/other-promotion/presets/p04-2nd.png', 303.69, 227.493, 119.99, 260.317),
      null, null,
    ],
    showPlusSign: true,
    plusSign: { ...DEFAULT_PLUS_SIGN, x: 223.7, y: 248.81 },
  },
  {
    id: 'aob-3',
    label: t('Always-On Banner 3'),
    imageBgColor: 'warm-gray-04',
    headCopy: t('New Homeowners Starter Kit'),
    showSubCopy: true,
    subCopy: t('Essential Bundles for Every Home'),
    ctaText: t('Shop now'),
    showDisclaimer: false,
    disclaimerText: '',
    showBigText: true,
    bigText: 'Bundles',
    bigTextLeft: -10, bigTextTop: 0, bigTextWidth: 530,
    showThemeObjects: false,
    themeObjects: [null, null],
    productImages: [
      product(0, '/brand-shop/other-promotion/presets/p03-tv.png', 58.7, 106.025, 380, 219.86),
      product(1, '/brand-shop/other-promotion/presets/p03-soundbar.png', 58.7, 355.885, 380, 115.71),
      null, null,
    ],
    showPlusSign: true,
    plusSign: { ...DEFAULT_PLUS_SIGN, x: 223.7, y: 351.6 },
  },
  {
    id: 'aob-4',
    label: t('Always-On Banner 4'),
    imageBgColor: 'red',
    headCopy: t('Online Exclusives'),
    showSubCopy: true,
    subCopy: t('Super savings are just a tap away!'),
    ctaText: t('Shop now'),
    showDisclaimer: false,
    disclaimerText: '',
    showBigText: true,
    bigText: 'Online\nExclusiv',
    bigTextLeft: -10, bigTextTop: 0, bigTextWidth: 530,
    showThemeObjects: false,
    themeObjects: [null, null],
    productImages: [
      product(0, '/brand-shop/other-promotion/presets/p06-dehumi.png', 35.3, 218.35, 108.099, 269.38),
      product(1, '/brand-shop/other-promotion/presets/p06-mntup.png', 313.17, 221.39, 190.532, 149.58),
      product(2, '/brand-shop/other-promotion/presets/p06-wm.png', 188.38, 393.2, 200.757, 298.22),
      product(3, '/brand-shop/other-promotion/presets/p06-uhdtv.png', 214.05, -53.3, 262.513, 164.52),
    ],
    showPlusSign: false,
    plusSign: { ...DEFAULT_PLUS_SIGN },
  },
  {
    id: 'pb-01',
    label: t('Promotion Banner 01'),
    imageBgColor: 'red',
    headCopy: t('New Year Home Appliance Deals Up to 48% Off*'),
    showSubCopy: true,
    subCopy: t('Now till 15 FEB, 2026'),
    ctaText: t('Shop now'),
    showDisclaimer: true,
    disclaimerText: t('*T&Cs apply. Stocks subject to availability. Pictures for illustrations only.'),
    showBigText: true,
    bigText: 'New\nYear',
    bigTextLeft: -10, bigTextTop: 0, bigTextWidth: 530,
    showThemeObjects: true,
    themeObjects: [
      theme(0, '/brand-shop/other-promotion/new-year-shape.png', -84.50, -48.22, 443.28, 350.43, 20.47),
      theme(1, '/brand-shop/other-promotion/new-year-shape.png', 276.92, 401.24, 269.17, 212.80, -13.14),
    ],
    productImages: [
      product(0, '/brand-shop/other-promotion/ref-side-1.png', 302.02, 72.56, 208.37, 350.87),
      product(1, '/brand-shop/other-promotion/wm-side-1.png', -9.22, 281.95, 255.22, 311.64),
      null, null,
    ],
    showPlusSign: false,
    plusSign: { ...DEFAULT_PLUS_SIGN },
  },
  {
    id: 'pb-02',
    label: t('Promotion Banner 02'),
    imageBgColor: 'warm-gray-05',
    headCopy: t('Smart at school, efficient at home'),
    showSubCopy: true,
    subCopy: t('Only from july 1 to 31'),
    ctaText: t('Shop now'),
    showDisclaimer: true,
    disclaimerText: t('*T&Cs apply.'),
    showBigText: true,
    bigText: 'Back to\nSchool',
    bigTextLeft: -10, bigTextTop: 0, bigTextWidth: 530,
    showThemeObjects: true,
    themeObjects: [
      theme(0, '/brand-shop/other-promotion/presets/p02-theme.png', -157.11, -105.73, 513.467, 513.467, -158.39),
      theme(1, '/brand-shop/other-promotion/presets/p02-theme.png', 272.62, 321.83, 336.871, 336.871, -4.11),
    ],
    productImages: [
      productZoom(
        0,
        '/brand-shop/other-promotion/presets/p02-product.png',
        122.13, 227.59, 341.076, 348.637,
        1.5904, -0.295, -0.0327,
      ),
      null, null, null,
    ],
    showPlusSign: false,
    plusSign: { ...DEFAULT_PLUS_SIGN },
  },
  ];
}

/**
 * Apply a preset on top of an existing state — preserves user-controlled lock
 * flags but replaces all banner content / layout fields.
 */
export function applyPreset(state: OtherPromoThemeState, preset: OtherPromoPreset): OtherPromoThemeState {
  return {
    ...state,
    imageBgColor: preset.imageBgColor,
    headCopy: preset.headCopy,
    showSubCopy: preset.showSubCopy,
    subCopy: preset.subCopy,
    ctaText: preset.ctaText,
    showDisclaimer: preset.showDisclaimer,
    disclaimerText: preset.disclaimerText,
    showBigText: preset.showBigText,
    bigText: preset.bigText,
    bigTextLeft: preset.bigTextLeft,
    bigTextTop: preset.bigTextTop,
    bigTextWidth: preset.bigTextWidth,
    showThemeObjects: preset.showThemeObjects,
    themeObjects: preset.themeObjects.map((t) => (t ? { ...t } : null)) as ThemeObjectSlots,
    productImages: preset.productImages.map((p) => (p ? { ...p } : null)) as ProductImageSlots,
    showPlusSign: preset.showPlusSign,
    plusSign: { ...preset.plusSign },
    activePresetId: preset.id,
  };
}
