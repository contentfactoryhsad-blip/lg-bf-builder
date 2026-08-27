import type { TFunction } from '../../i18n/LanguageContext';
export interface CropImage {
  url: string | null;
  source: string | null;
  cropState?: { crop: { x: number; y: number }; zoom: number; aspect?: number };
}

export function makeCropImage(): CropImage {
  return { url: null, source: null };
}

// ── Default ────────────────────────────────────────────────
export interface ThumbnailDefaultState {
  modelName: string;
  productImage: CropImage;
}

// ── GWP (Gift with Purchase) ───────────────────────────────
export interface ThumbnailGwpState {
  modelName: string;
  productImage: CropImage;
  giftImage: CropImage;
  freeGiftText: string;
  giftName: string;
  giftModelName: string;
  showGiftModelName: boolean;
}

// ── Bundle ─────────────────────────────────────────────────
export interface ThumbnailBundleState {
  modelName1: string;
  modelName2: string;
  product1Image: CropImage;
  product2Image: CropImage;
}

// ── Promotion (Payday / Sale) ──────────────────────────────
export interface ThumbnailVoucherItem {
  id: string;
  title: string;
  subCopy: string;
  subCopyPosition: 'left' | 'right';
  value: string;
  /** Show/hide toggles — undefined (old drafts) means shown. */
  showTitle?: boolean;
  showValue?: boolean;
  showSubCopy?: boolean;
}

export interface ThumbnailPromotionState {
  modelName: string;
  productImage: CropImage;
  promotionImage: CropImage;
  dateRange: string;
  voucherCount: number; // 1-4
  vouchers: ThumbnailVoucherItem[];
}

// ── USP (Notice + Benefits + USP list) ─────────────────────
export interface ThumbnailUspItem {
  id: string;
  copy: string;
  image: CropImage;
  /** Show/hide the image even when set — undefined means shown when present.
   *  No image (hidden or never set) centres the copy; an image left-aligns it. */
  showImage?: boolean;
}

export interface ThumbnailUspState {
  modelName: string;
  productImage: CropImage;
  showNotice: boolean;
  notice: string;
  benefitCount: number; // 0-4
  benefits: string[];
  uspCount: number; // 0-4
  usps: ThumbnailUspItem[];
}

// ── Feature Image (lifestyle / full-bleed) ─────────────────
export interface ThumbnailFeatureImageState {
  modelName: string;
  featureImage: CropImage;
}

// ── Gallery Feature (heading + body + feature image) ───────
export interface ThumbnailGalleryFeatureState {
  headingText: string;
  /** undefined = never fetched (show placeholder); '' = fetched but none found (hide) */
  bodyText: string | undefined;
  featureImage: CropImage;
}

// ── Feature Text (heading + bullets) ──────────────────────
export interface ThumbnailFeatureTextState {
  headingText: string;
  bulletPoints: string[];
  bulletCount: number; // 1-6
}

// ── Aggregate ──────────────────────────────────────────────
// GWP and Bundle store independent state per orientation so switching H↔V
// preserves each orientation's images/model names separately.
export interface ThumbnailAllStates {
  default: ThumbnailDefaultState;
  gwp: { horizontal: ThumbnailGwpState; vertical: ThumbnailGwpState };
  bundle: { horizontal: ThumbnailBundleState; vertical: ThumbnailBundleState };
  usp: ThumbnailUspState;
  promotion: ThumbnailPromotionState;
  'feature-image': ThumbnailFeatureImageState;
  'feature-gallery': ThumbnailGalleryFeatureState;
  'feature-text': ThumbnailFeatureTextState;
}

function makeGwpState(): ThumbnailGwpState {
  return {
    modelName: '',
    productImage: makeCropImage(),
    giftImage: makeCropImage(),
    freeGiftText: '',
    giftName: '',
    giftModelName: '',
    showGiftModelName: true,
  };
}

function makeBundleState(): ThumbnailBundleState {
  return { modelName1: '', modelName2: '', product1Image: makeCropImage(), product2Image: makeCropImage() };
}

/** A bundled sample icon — `source` set so "Edit Crop" reopens on the original. */
function uspIcon(path: string): CropImage {
  return { url: path, source: path };
}

function makeUspState(t: TFunction): ThumbnailUspState {
  return {
    modelName: '',
    productImage: makeCropImage(),
    showNotice: true,
    notice: t('Installation NOT included'),
    benefitCount: 4,
    benefits: [t('Free Disposal'), t('Free Delivery'), t('2-Year Warranty'), t('OBS Only')],
    uspCount: 4,
    // Figma's sample icons (node 2505:24855) ship as the defaults, so the
    // template opens on the "with image" layout the design specifies.
    usps: [
      { id: '1', copy: t('CES 2026 Award winner'),  image: uspIcon('/thumbnail/usp-icon-1.png'), showImage: true },
      { id: '2', copy: t('ThinQ App'),              image: uspIcon('/thumbnail/usp-icon-2.png'), showImage: true },
      { id: '3', copy: t('Alpha 11 AI Processor'),  image: uspIcon('/thumbnail/usp-icon-3.png'), showImage: true },
      { id: '4', copy: t('3X brighter visuals'),    image: uspIcon('/thumbnail/usp-icon-4.png'), showImage: true },
    ],
  };
}


const identityT = ((k: string) => k) as TFunction;

export function makeInitialThumbnailStates(t: TFunction = identityT): ThumbnailAllStates {
  return {
    default: { modelName: '', productImage: makeCropImage() },
    gwp: { horizontal: makeGwpState(), vertical: makeGwpState() },
    bundle: { horizontal: makeBundleState(), vertical: makeBundleState() },
    usp: makeUspState(t),
    promotion: {
      modelName: '',
      productImage: makeCropImage(),
      promotionImage: makeCropImage(),
      dateRange: '2026. 11. 11 - 2026. 11. 20',
      voucherCount: 3,
      vouchers: [
        { id: '1', title: t('Sale Price'),  subCopy: '',               subCopyPosition: 'left',  value: '$000' },
        { id: '2', title: t('Voucher'),     subCopy: t('Up to'),          subCopyPosition: 'left',  value: '00%' },
        { id: '3', title: t('Voucher'),     subCopy: t('for every purchase'), subCopyPosition: 'right', value: '00%' },
        { id: '4', title: t('Sale Price'),  subCopy: '',         subCopyPosition: 'left',  value: '11,877.-' },
      ],
    },
    'feature-image': { modelName: '', featureImage: makeCropImage() },
    'feature-gallery': { headingText: '', bodyText: undefined, featureImage: makeCropImage() },
    'feature-text': {
      headingText: t('Delivery & Installation Guide'),
      bulletPoints: [
        t('Upon purchase of item, our logistics team will contact you within 2 - 3 working days to schedule the delivery appointment.'),
        t('All orders are to be fulfilled within 30 days from the date of purchase. We appreciate your kind understanding.'),
        t('Installation for the new item is non-exchangeable (FOC) on lift-landing floors only.'),
        t('Disposal of old item (Applicable to Washing Machine and Refrigerator only) is non-chargeable (FOC) on lift-landing floors only.'),
        t('Additional fees applies for installation on non-lift landing floors, or shipping address requires moving of itemon staircase.'),
        t('Do contact us should you have other conditions or queries regards to our delivery and installation notice.'),
      ],
      bulletCount: 6,
    },
  };
}
