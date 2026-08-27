import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { Download, Loader2, Plus, Trash2, AlertCircle, Link, Upload, Type, X } from 'lucide-react';
import { ThumbnailType, Orientation, getSlot } from './thumbnailRegistry';
import {
  ThumbnailAllStates,
  ThumbnailVoucherItem,
  ThumbnailFeatureTextState,
  makeInitialThumbnailStates,
  makeCropImage,
  CropImage,
} from './thumbnailTypes';
import {
  DefaultEditorPanel,
  GwpEditorPanel,
  BundleEditorPanel,
  UspEditorPanel,
  PromotionEditorPanel,
  FeatureImageEditorPanel,
  GalleryFeatureEditorPanel,
  FeatureTextEditorPanel,
} from './ThumbnailEditor';
import { FeatureTextThumbnailTemplate } from './FeatureTextThumbnailTemplate';
import { DefaultThumbnailTemplate } from './DefaultThumbnailTemplate';
import { GwpThumbnailTemplate } from './GwpThumbnailTemplate';
import { BundleThumbnailTemplate } from './BundleThumbnailTemplate';
import { UspThumbnailTemplate } from './UspThumbnailTemplate';
import { PromotionThumbnailTemplate } from './PromotionThumbnailTemplate';
import { FeatureImageThumbnailTemplate } from './FeatureImageThumbnailTemplate';
import { GalleryFeatureThumbnailTemplate } from './GalleryFeatureThumbnailTemplate';
import { scrapeProductImages, getProxiedImageUrl, ScrapedImage } from '../../services/imageScraperApi';
import { checkWhiteBackground, autoCropProduct } from '../../utils/nukkeeDetector';
import { structuralVerdict, lgImageKind, largestRendition } from '../../utils/lgImageFilter';
import { preloadImagesToDataUrls } from '../../utils/imageUrlLoader';
import { saveBlob } from '../../utils/fileSaver';
import { useT } from '../../i18n/LanguageContext';
import { GallerySlideTemplate, SLIDE_SCHEMA_V, judgeSlideAlign, estimateEmFrac, type GallerySlideData, type GalleryLayoutHint } from './GallerySlideTemplate';
import { GalleryStripCard, GalleryStripSkeleton, galleryStripImages, GALLERY_MAX_SELECT, STRIP_TILE } from './GallerySlideBulk';
import { loadSlideImage } from '../../services/gallerySlideApi';
import { AppHeader } from '../AppHeader';
import { NavRail, type NavRailKey } from '../NavRail';
import type { DraftRecord } from '../../utils/draftStore';
import { ImageCropModal } from '../ImageCropModal';
import { useDraftSave } from '../../hooks/useDraftSave';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { SaveForLaterButton, SaveDraftModal } from '../SaveForLaterButton';
import { UnsavedChangesModal } from '../UnsavedChangesModal';
import { ShowToggle } from '../brandshop/bigPromoCommon';
import { restoreThumbnailBulk, type ThumbnailBulkPayloadV1 } from '../../drafts/thumbnailPayload';
import { useApplyBrandFont } from '../../fonts/useApplyBrandFont';
import { BrandFontSelector } from '../../fonts/BrandFontSelector';
import { ensureBrandFontLoaded, fontFileTag, type BrandFontId } from '../../fonts/brandFonts';
import { WizardBreadcrumb, THUMBNAIL_WIZARD_STEPS } from './WizardBreadcrumb';

// ─── Types ────────────────────────────────────────────────────────────────────

type BulkPhase = 'urls' | 'list' | 'feature' | 'generate';
type ScrapeStatus = 'idle' | 'loading' | 'done' | 'error';

const MAX_ITEMS = 50;
const INIT_ROWS = 10;
const SCRAPE_CONCURRENCY = 3;

interface UrlEntry {
  id: string;
  mainUrl: string;
  giftUrl: string;
  product2Url: string;
}

interface SharedPromoConfig {
  promotionImage: CropImage;
  dateRange: string;
}

interface BulkItem {
  id: string;
  mainUrl: string;
  giftUrl?: string;
  product2Url?: string;
  scrapeStatus: ScrapeStatus;
  errorMsg?: string;
  scrapedImages: ScrapedImage[];
  /** Bundle only: product 2's gallery, appended after scrapedImages in Select Feature Cards. */
  scrapedImages2?: ScrapedImage[];
  /** GWP only: gift item's gallery, feeds the gift image slot's re-pick picker. */
  scrapedImagesGift?: ScrapedImage[];
  allStates: ThumbnailAllStates;
  orientation: Orientation;
  /** Feature-card step: raw URLs of the slides the user checked (max 10).
   *  User uploads join this list as data: URLs — the array order is the
   *  export order (02, 03, … after the 01 product card). */
  gallerySelected?: string[];
  /** Feature-card step: per-slide analysis/translation, keyed by raw URL. */
  gallerySlides?: Record<string, GallerySlideData>;
  /** Feature-card step: text-version cards (feature-text layout), appended
   *  after the image slides in the export order. */
  textCards?: TextCard[];
}

interface TextCard {
  id: string;
  state: ThumbnailFeatureTextState;
}

interface Props {
  slotId: ThumbnailType;
  onBack: () => void;
  /** Resume a saved draft: reuse its id and seed list state from its payload. */
  initialDraft?: { id: string; title: string; payload: ThumbnailBulkPayloadV1 };
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDefaultVouchers(t: (k: string) => string = (k) => k): ThumbnailVoucherItem[] {
  return [
    { id: '1', title: t('Sale Price'), subCopy: '',               subCopyPosition: 'left',  value: '$000' },
    { id: '2', title: t('Voucher'),    subCopy: t('Up to'),          subCopyPosition: 'left',  value: '00%' },
    { id: '3', title: t('Voucher'),    subCopy: t('for every purchase'), subCopyPosition: 'right', value: '00%' },
    { id: '4', title: t('Sale Price'), subCopy: '',               subCopyPosition: 'left',  value: '$000' },
  ];
}

function makeEmptyEntry(): UrlEntry {
  return {
    id: crypto.randomUUID(),
    mainUrl: '',
    giftUrl: '',
    product2Url: '',
  };
}

function detectOrientationFromUrl(url: string): Orientation {
  const lower = url.toLowerCase();
  if (/\/(tv|oled-tv|qned-tv|nanocell-tv|led-tv|monitors?|projectors?)\b/.test(lower)) return 'horizontal';
  if (/\/(refrigerators?|washing-machines?|washtower|dishwashers?|styler|dryers?|laundry|front-load|top-load|washer|dryer|puricare|dehumidifiers?|air-purifiers?|humidifiers?|air-care|water-purifiers?)\b/.test(lower)) return 'vertical';
  return 'horizontal';
}

// Last path segment of an LG PDP URL is the model code, uppercased to match LG's
// convention (e.g. .../battery-adapter-charger/eac63382208/ → "EAC63382208").
// Used both as the list-row label and as the model-name fallback when the crawler
// can't read a model, so the row and the card stay in sync.
function modelFromUrl(url: string): string {
  let seg: string | undefined;
  try {
    seg = new URL(url).pathname.replace(/\/+$/, '').split('/').pop();
  } catch {
    seg = url.replace(/\/+$/, '').split('/').pop();
  }
  return seg ? seg.toUpperCase() : url;
}

// The white-copy-zone rewrite panel is TV-only for now — every other product
// line's marketing imagery mixes lifestyle photos in with real feature
// graphics too unpredictably for a pixel heuristic to sort reliably, so
// everything else just goes Crop-only. TVs are recognised by their LG.com URL
// category segment or, failing that, the model code's own OLED/QNED/NANO/UHD
// prefix. LG.com's TV product pages all sit under a shared "/tvs-soundbars/"
// nav that also holds actual soundbar categories, so the category segment
// itself (not just an adjacent "tv"/"tvs" word, which the old regex required
// and real slugs like "nano-4k-uhd" or "oled-evo" never had) has to carry a
// TV product-line keyword — verified against every category slug LG.com SG
// actually lists (4k-uhd-tvs, ai-tv, lcd-tvs, led-tvs, micro/mini-rgb-evo,
// miniled, nano-4k-uhd, nanocell, oled(-art/-evo/-innovation),
// qned(-evo/-mini-led/-evo-mini-led), ultra-big-tvs — all match; the
// soundbar-only slugs (home-theater-soundbar, true-wireless(-tv),
// tv-accessories, tv-buying-guide, …) never contain any of these keywords).
const TV_CATEGORY_KEYWORDS = ['oled', 'qned', 'nano', 'miniled', 'rgb-evo', 'uhd-tv', 'led-tv', 'ultra-big-tv', 'ai-tv', 'lcd-tv'];
function isTvProductUrl(url: string): boolean {
  let segs: string[] = [];
  try { segs = new URL(url).pathname.split('/').filter(Boolean); } catch { segs = url.split('/').filter(Boolean); }
  if (segs.some((s) => { const l = s.toLowerCase(); return TV_CATEGORY_KEYWORDS.some((k) => l.includes(k)); })) return true;
  return /^(OLED|QNED|NANO|UHD)\d/i.test(modelFromUrl(url));
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// Center-crops a data URL canvas to targetAspect (w/h).
// Used to match the initial auto-crop preview to the template slot's aspect ratio.
function cropDataUrlToAspect(url: string, targetAspect: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const imgAspect = w / h;
      let srcX = 0, srcY = 0, srcW = w, srcH = h;
      if (imgAspect > targetAspect) {
        srcW = Math.round(h * targetAspect);
        srcX = Math.round((w - srcW) / 2);
      } else if (imgAspect < targetAspect) {
        srcH = Math.round(w / targetAspect);
        srcY = Math.round((h - srcH) / 2);
      }
      const canvas = document.createElement('canvas');
      canvas.width = srcW; canvas.height = srcH;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, srcW, srcH);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LGHeader({
  onBack,
  right,
}: {
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const t = useT();
  return <AppHeader title={t('Thumbnail Builder')} onBack={onBack} right={right} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ThumbnailBulkGenerator({ slotId, onBack, initialDraft, railActive, onRailNavigate, onOpenDraft }: Props) {
  const t = useT();
  const slot = getSlot(slotId);
  // Restored draft payload (computed once per mount; App remounts by draft id)
  const restored = React.useMemo(
    () => (initialDraft ? restoreThumbnailBulk(initialDraft.payload, t) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const isPromotion = slotId === 'promotion';
  const isGwp = slotId === 'gwp';
  const isBundle = slotId === 'bundle';
  // Legacy Gallery Feature slot (old feature-card drafts): the 3-step wizard
  // where the checked slides ARE the export units, no product card.
  const isGalleryFlow = slotId === 'feature-gallery';
  // Live flow: every product-card template gets a FEATURE CARDS step between
  // Edit and Review — gallery slides picked from the same product URL's crawl
  // (plus user uploads and text-version cards), exported after the 01 product
  // card in the user's order.
  const hasFeatureStep = slotId === 'default' || slotId === 'gwp' || slotId === 'bundle' || slotId === 'usp' || slotId === 'promotion';
  const wizardSteps = hasFeatureStep
    ? THUMBNAIL_WIZARD_STEPS
    : ['1. Upload URLs', '2. Edit', '3. Review & Download'];
  const phaseToStep = (p: BulkPhase): number => {
    if (!hasFeatureStep) return p === 'urls' ? 1 : p === 'list' ? 2 : 3;
    return p === 'urls' ? 2 : p === 'list' ? 3 : p === 'feature' ? 4 : 5;
  };

  const [fontId, setFontId] = useState<BrandFontId>(() => restored?.fontId ?? 'lg');
  useApplyBrandFont(fontId);

  // Re-render once the output faces are actually loaded: the gallery template
  // sizes and wraps its text with canvas measurement — measured against a
  // fallback font it under-counts wrap lines (2-line originals rendering as
  // 3) and mis-sizes the type. Re-runs on a font swap so the new metrics take.
  const [, setFontReady] = useState(false);
  useEffect(() => {
    if (!(isGalleryFlow || hasFeatureStep) || typeof document === 'undefined' || !document.fonts?.load) return;
    let mounted = true;
    ensureBrandFontLoaded(fontId)
      .then(() => { if (mounted) setFontReady((v) => !v); })
      .catch(() => { /* keep fallback metrics */ });
    return () => { mounted = false; };
  }, [isGalleryFlow, hasFeatureStep, fontId]);

  const dateRulerRef = useRef<HTMLSpanElement>(null);
  const [dateOverflow, setDateOverflow] = useState(false);
  const DATE_MAX_W = 320;

  const [phase, setPhase] = useState<BulkPhase>(restored?.phase ?? 'urls');
  const [urlEntries, setUrlEntries] = useState<UrlEntry[]>(() =>
    restored && restored.urlEntries.length > 0
      ? (restored.urlEntries as UrlEntry[])
      : Array.from({ length: INIT_ROWS }, makeEmptyEntry),
  );
  const [sharedPromo, setSharedPromo] = useState<SharedPromoConfig>(() =>
    (restored?.sharedPromo as SharedPromoConfig | undefined) ?? {
      promotionImage: makeCropImage(),
      dateRange: '2026. 11. 11 - 2026. 11. 20',
    },
  );
  const [items, setItems] = useState<BulkItem[]>(() => (restored?.items as BulkItem[] | undefined) ?? []);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(restored?.selectedItemIds ?? []),
  );
  // Review unchecks (live flow): any card — the 01 product card via
  // selectedItemIds, feature slides / text cards via these sets — can be
  // dropped from the ZIP; the remaining cards renumber from 01 automatically.
  const [excludedSlides, setExcludedSlides] = useState<Set<string>>(
    () => new Set(restored?.excludedSlides ?? []),
  );     // `${itemId}|${url}`
  const [excludedTextCards, setExcludedTextCards] = useState<Set<string>>(
    () => new Set(restored?.excludedTextCards ?? []),
  ); // TextCard.id

  // Local draft ("Save for Later") — manual save of the whole bulk session.
  // `fontId` is part of the compared state because useDraftSave's `dirty` is a
  // reference check on this object; leaving it out would let a font change go
  // unsaved without tripping the unsaved-changes guard.
  const draftState = React.useMemo(
    () => ({ slotId, phase, urlEntries, items, sharedPromo, selectedItemIds, excludedSlides, excludedTextCards, fontId }),
    [slotId, phase, urlEntries, items, sharedPromo, selectedItemIds, excludedSlides, excludedTextCards, fontId],
  );
  const draft = useDraftSave({
    builder: 'thumbnail-bulk',
    initialDraftId: initialDraft?.id,
    state: draftState,
    title: initialDraft?.title ?? 'Bulk Thumbnails',
    serialize: (st) => ({
      slotId: st.slotId,
      fontId: st.fontId,
      // Restores directly onto whatever phase it was saved from — the
      // mount-time effect above re-runs analysis for any slide that was
      // still 'loading' or on a stale schema when saved.
      phase: st.phase,
      urlEntries: st.urlEntries,
      items: st.items,
      sharedPromo: st.sharedPromo,
      // Review-step checkboxes — Sets aren't JSON-safe, save as arrays.
      selectedItemIds: Array.from(st.selectedItemIds),
      excludedSlides: Array.from(st.excludedSlides),
      excludedTextCards: Array.from(st.excludedTextCards),
    }),
  });
  const hasDraftContent =
    items.length > 0 || urlEntries.some((e) => e.mainUrl.trim() || e.giftUrl.trim() || e.product2Url.trim());
  const defaultDraftName = initialDraft?.title ?? 'Bulk Thumbnails';
  const saveForLater = (
    <SaveForLaterButton
      draft={draft}
      defaultName={defaultDraftName}
      disabled={!hasDraftContent}
    />
  );
  const {
    guard,
    showModal: showUnsavedModal,
    showNameModal: showUnsavedNameModal,
    handleSave: handleUnsavedSave,
    handleNameConfirm: handleUnsavedNameConfirm,
    handleNameCancel: handleUnsavedNameCancel,
    handleDiscard: handleUnsavedDiscard,
  } = useUnsavedGuard(draft, defaultDraftName);
  const guardedOnBack = () => guard(onBack);
  const guardedOnRailNavigate = (key: NavRailKey) => guard(() => onRailNavigate(key));
  const unsavedModal = (
    <>
      {showUnsavedModal && <UnsavedChangesModal onSave={handleUnsavedSave} onDiscard={handleUnsavedDiscard} />}
      {showUnsavedNameModal && (
        <SaveDraftModal
          defaultName={defaultDraftName}
          checkNameTaken={draft.checkNameTaken}
          onSave={handleUnsavedNameConfirm}
          onCancel={handleUnsavedNameCancel}
        />
      )}
    </>
  );
  // Breadcrumb click jumps directly to an earlier phase (state is preserved
  // either way). In the live flow step 1 is the TEMPLATE SELECTOR screen —
  // leaving the wizard goes through the unsaved-work guard like Back does.
  function handleBreadcrumbClick(step: number) {
    if (!hasFeatureStep) {
      if (step === 1) setPhase('urls');
      else if (step === 2) setPhase('list');
      return;
    }
    if (step === 1) guard(onBack);
    else if (step === 2) setPhase('urls');
    else if (step === 3) setPhase('list');
    else if (step === 4) setPhase('feature');
  }
  const [exportProgress, setExportProgress] = useState(0);
  const [modalItemId, setModalItemId] = useState<string | null>(null);

  const renderRef = useRef<HTMLDivElement>(null);
  const [renderingItem, setRenderingItem] = useState<BulkItem | null>(null);
  const promoFileRef = useRef<HTMLInputElement>(null);
  const [promoPendingSrc, setPromoPendingSrc] = useState<string | null>(null);
  const [promoReCropSrc, setPromoReCropSrc] = useState<string | null>(null);

  // ─── URL Entry helpers ───────────────────────────────────────────────────

  function setEntry(id: string, patch: Partial<UrlEntry>) {
    setUrlEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }

  function removeEntry(id: string) {
    setUrlEntries(prev => prev.filter(e => e.id !== id));
  }

  function addOne() {
    setUrlEntries(prev => {
      const count = Math.min(10, MAX_ITEMS - prev.length);
      if (count <= 0) return prev;
      return [...prev, ...Array.from({ length: count }, makeEmptyEntry)];
    });
  }

  // ─── Phase 1 → Phase 2 ──────────────────────────────────────────────────

  async function handleNext() {
    const valid = urlEntries.filter(e => e.mainUrl.trim());
    if (valid.length === 0) return;

    const newItems: BulkItem[] = valid.map(e => {
      const allStates = makeInitialThumbnailStates(t);
      if (isPromotion) {
        allStates.promotion = {
          ...allStates.promotion,
          promotionImage: sharedPromo.promotionImage,
          dateRange: sharedPromo.dateRange,
          voucherCount: 3,
          vouchers: makeDefaultVouchers(t),
        };
      }
      return {
        id: e.id,
        mainUrl: e.mainUrl.trim(),
        giftUrl: isGwp ? e.giftUrl.trim() || undefined : undefined,
        product2Url: isBundle ? e.product2Url.trim() || undefined : undefined,
        scrapeStatus: 'idle' as ScrapeStatus,
        scrapedImages: [],
        allStates,
        orientation: 'horizontal' as Orientation,
      };
    });

    setItems(newItems);
    setSelectedItemIds(new Set(newItems.map(it => it.id)));
    setPhase('list');
    scrapeAllItems(newItems);
  }

  // ─── Scraping ────────────────────────────────────────────────────────────

  async function scrapeAllItems(itemsToScrape: BulkItem[]) {
    setItems(prev => prev.map(it => ({ ...it, scrapeStatus: 'loading' as ScrapeStatus })));

    async function processOne(item: BulkItem) {
      try {
        const result = await scrapeProductImages(item.mainUrl);
        if (result.error) throw new Error(result.error);

        // Gallery Feature flow: no auto-pick / auto-crop — the user hand-picks
        // slides from the gallery strip in phase 2.
        if (slotId === 'feature-gallery') {
          setItems(prev => prev.map(it => it.id === item.id
            ? { ...it, scrapeStatus: 'done', scrapedImages: result.images, gallerySelected: it.gallerySelected ?? [] }
            : it));
          return;
        }

        // Auto-pick the first image the fetch gallery would ALSO show, using the exact same
        // classifier (structuralVerdict) — otherwise the auto-loaded image can be a banner
        // that isn't even in "Change from imported images". Feature types use the feature
        // picker (lifestyleOnly), product types the product picker (whiteBackgroundOnly);
        // for gallery/unknown images we still fall back to the white-bg colour check.
        const isFeatureType = slotId === 'feature-image' || slotId === 'feature-gallery';
        let productImageUrl: string | null = null;
        // Fast pass over the FULL list first: an unambiguous 'show' verdict (explicit
        // product cutout / hero shot naming) is trustworthy regardless of where it sits
        // in crawl order — some product lines' numbered gallery carousel is entirely
        // lifestyle scenes with the one real cutout filed elsewhere (e.g. a small hero
        // rendition outside /gallery/), well past the slice(0, 20) window below. Pure
        // string matching, no network calls, so scanning everything is cheap.
        for (const img of result.images) {
          if (structuralVerdict(img.url, !isFeatureType, isFeatureType) === 'show') {
            productImageUrl = img.url;
            break;
          }
        }
        if (!productImageUrl) {
          for (const img of result.images.slice(0, 20)) {
            const verdict = structuralVerdict(img.url, !isFeatureType, isFeatureType);
            if (verdict === 'hide' || verdict === 'show') continue; // 'show' already tried above
            // verdict === null → decide by background colour, same as the gallery fallback
            const isWhite = await checkWhiteBackground(getProxiedImageUrl(img.url));
            if (isFeatureType ? !isWhite : isWhite) { productImageUrl = img.url; break; }
          }
        }
        // Last resort: first non-banner image (never auto-load a promo/footer banner).
        if (!productImageUrl) {
          productImageUrl = result.images.find((im) => lgImageKind(im.url) !== 'banner')?.url ?? null;
        }
        // Whatever was picked, cut from the largest rendition of it. The classifier
        // reads a 3-digit size suffix as a hero-cutout signal, so it can settle on a
        // 350px thumbnail while the same shot is listed at 2010px — and that choice
        // decides the resolution every downstream crop and cutout is made at.
        if (productImageUrl) {
          productImageUrl = largestRendition(productImageUrl, result.images.map((im) => im.url));
        }

        // Prefer the crawler's model name; when it can't read one, derive it from the
        // URL slug so the card shows the real model (not the template placeholder) and
        // matches the list-row label. modelFromUrl already uppercases.
        let modelName = result.modelName || '';
        if (!modelName) {
          const fromUrl = modelFromUrl(item.mainUrl);
          if (/^[A-Z0-9][A-Z0-9-]{1,24}$/.test(fromUrl)) modelName = fromUrl;
        }
        // toCropImage: square-padded auto-crop result → CropImage.
        // slotAspect: center-crops the square canvas toward the slot's w/h ratio, but
        // capped at productAspect so we never cut into the actual product pixels.
        // - Both landscape (>1): use min(slotAspect, productAspect)
        // - Both portrait (<1): use max(slotAspect, productAspect)
        // - Different sides: use productAspect (just remove white padding, no directional cut)
        const toCropImage = async (url: string, cropResult: Awaited<ReturnType<typeof autoCropProduct>>, slotAspect?: number): Promise<CropImage> => {
          const rawUrl = cropResult?.url ?? url;
          let finalUrl = rawUrl;
          if (slotAspect && cropResult?.url) {
            const pa = cropResult.productAspect;
            let safeCrop: number;
            if (pa > 1 && slotAspect > 1) safeCrop = Math.min(pa, slotAspect);
            else if (pa < 1 && slotAspect < 1) safeCrop = Math.max(pa, slotAspect);
            else safeCrop = pa;
            finalUrl = await cropDataUrlToAspect(rawUrl, safeCrop);
          }
          return { url: finalUrl, source: finalUrl, cropState: { crop: { x: 0, y: 0 }, zoom: 1 } };
        };

        // Slot aspect ratios — match editor's aspectRatio props (from Figma spec)
        const BUNDLE_V_ASPECT    = 454  / 800;  // Bundle V washer / dryer
        const BUNDLE_H_P1_ASPECT = 1060 / 448;  // Bundle H TV (product 1) — real flex-1 slot
        const BUNDLE_H_P2_ASPECT = 1060 / 180;  // Bundle H soundbar (product 2)
        const GWP_V_ASPECT       = 506  / 800;  // GWP V fridge — real flex-1 slot beside GiftCard
        const GWP_H_ASPECT       = 1060 / 456;  // GWP H TV — real flex-1 slot above GiftCard
        const PROMOTION_ASPECT   = 660  / 800;  // Promotion product frame

        // Analyse the product cutout first so orientation can follow the product's real
        // shape instead of a category/model lookup (there are too many product families
        // to enumerate). autoCropProduct returns the white-bg product's bbox aspect (w/h).
        const proxiedProduct = productImageUrl ? getProxiedImageUrl(productImageUrl) : null;
        const productCropResult = proxiedProduct ? await autoCropProduct(proxiedProduct) : null;

        // Taller-than-wide product ⇒ vertical layout. The 1.15 cutoff keeps genuinely wide
        // products (TV/soundbar/monitor, aspect ≳1.3) horizontal while all near-square and
        // tall appliances (fridge, washer, air purifier, dehumidifier…) resolve to vertical.
        // Falls back to the URL category only when no product image could be analysed.
        const detectedOri: Orientation = productCropResult?.productAspect
          ? (productCropResult.productAspect > 1.15 ? 'horizontal' : 'vertical')
          : detectOrientationFromUrl(item.mainUrl);
        const isVerticalBundle = isBundle && detectedOri === 'vertical';

        // Pick slot aspect for main product so auto-crop fills the slot on first load
        let productSlotAspect: number | undefined;
        if (isBundle) {
          productSlotAspect = isVerticalBundle ? BUNDLE_V_ASPECT : BUNDLE_H_P1_ASPECT;
        } else if (isGwp) {
          productSlotAspect = detectedOri === 'vertical' ? GWP_V_ASPECT : GWP_H_ASPECT;
        } else if (slotId === 'promotion' || slotId === 'usp') {
          productSlotAspect = PROMOTION_ASPECT;
        }

        const productCrop: CropImage = proxiedProduct
          ? await toCropImage(proxiedProduct, productCropResult, productSlotAspect)
          : { url: null, source: null };

        let giftCrop: CropImage = makeCropImage();
        let giftModelName = '';
        let giftProductName = '';
        let giftImages: ScrapedImage[] = [];
        if (isGwp && item.giftUrl) {
          const giftResult = await scrapeProductImages(item.giftUrl);
          giftImages = giftResult.images;
          giftModelName = giftResult.modelName || '';
          giftProductName = giftResult.productName || '';
          // Same URL-slug fallback as the main/second product, so the gift card shows a
          // real model instead of the template placeholder when the crawler comes up empty.
          if (!giftModelName) {
            const fromUrl = modelFromUrl(item.giftUrl);
            if (/^[A-Z0-9][A-Z0-9-]{1,24}$/.test(fromUrl)) giftModelName = fromUrl;
          }
          if (giftResult.images.length > 0) {
            const giftUrl = giftResult.images[0].url;
            const proxiedGift = getProxiedImageUrl(giftUrl);
            giftCrop = await toCropImage(proxiedGift, await autoCropProduct(proxiedGift));
          }
        }

        let product2Crop: CropImage = makeCropImage();
        let modelName2 = '';
        let product2Images: ScrapedImage[] = [];
        if (isBundle && item.product2Url) {
          const p2Result = await scrapeProductImages(item.product2Url);
          product2Images = p2Result.images;
          modelName2 = p2Result.modelName || '';
          if (!modelName2) {
            const fromUrl = modelFromUrl(item.product2Url);
            if (/^[A-Z0-9][A-Z0-9-]{1,24}$/.test(fromUrl)) modelName2 = fromUrl;
          }
          if (p2Result.images.length > 0) {
            // Same structural classifier as the main product pick (line ~462) — a plain
            // checkWhiteBackground-only scan mistakes USP/feature cards (white text zone
            // up top) for a real cutout, same bug fixed for product1 in 7c1721a.
            let p2Url: string | null = null;
            for (const img of p2Result.images) {
              if (structuralVerdict(img.url, true, false) === 'show') { p2Url = img.url; break; }
            }
            if (!p2Url) {
              for (const img of p2Result.images.slice(0, 20)) {
                const verdict = structuralVerdict(img.url, true, false);
                if (verdict === 'hide' || verdict === 'show') continue;
                const isWhite = await checkWhiteBackground(getProxiedImageUrl(img.url));
                if (isWhite) { p2Url = img.url; break; }
              }
            }
            if (!p2Url) p2Url = p2Result.images.find((im) => lgImageKind(im.url) !== 'banner')?.url ?? p2Result.images[0].url;
            p2Url = largestRendition(p2Url, p2Result.images.map((im) => im.url));
            const proxiedP2 = getProxiedImageUrl(p2Url);
            product2Crop = await toCropImage(proxiedP2, await autoCropProduct(proxiedP2),
              isVerticalBundle ? BUNDLE_V_ASPECT : BUNDLE_H_P2_ASPECT);
          }
        }

        setItems(prev => prev.map(it => {
          if (it.id !== item.id) return it;
          const s = { ...it.allStates };
          if (slotId === 'default') {
            s.default = { modelName, productImage: productCrop };
          } else if (slotId === 'gwp') {
            const gwpState = {
              ...s.gwp.horizontal,
              modelName,
              productImage: productCrop,
              giftImage: giftCrop,
              ...(giftModelName ? { giftModelName } : {}),
              ...(giftProductName ? { giftName: giftProductName } : {}),
            };
            s.gwp = { horizontal: gwpState, vertical: { ...gwpState } };
          } else if (slotId === 'bundle') {
            const bState = { modelName1: modelName, modelName2, product1Image: productCrop, product2Image: product2Crop };
            s.bundle = { horizontal: bState, vertical: { ...bState } };
          } else if (slotId === 'usp') {
            s.usp = { ...s.usp, modelName, productImage: productCrop };
          } else if (slotId === 'promotion') {
            s.promotion = { ...s.promotion, modelName, productImage: productCrop };
          } else if (slotId === 'feature-image') {
            s['feature-image'] = { modelName, featureImage: productCrop };
          } else if (slotId === 'feature-gallery') {
            s['feature-gallery'] = { ...s['feature-gallery'], featureImage: productCrop };
          }
          const orientation = (isGwp || isBundle) ? detectedOri : it.orientation;
          return {
            ...it,
            scrapeStatus: 'done',
            scrapedImages: result.images,
            scrapedImages2: isBundle ? product2Images : undefined,
            scrapedImagesGift: isGwp ? giftImages : undefined,
            allStates: s,
            orientation,
          };
        }));
      } catch (err: any) {
        setItems(prev => prev.map(it =>
          it.id === item.id ? { ...it, scrapeStatus: 'error', errorMsg: err.message || 'Failed' } : it,
        ));
      }
    }

    for (let i = 0; i < itemsToScrape.length; i += SCRAPE_CONCURRENCY) {
      await Promise.all(itemsToScrape.slice(i, i + SCRAPE_CONCURRENCY).map(processOne));
    }
  }

  // ─── Item state update ───────────────────────────────────────────────────

  function updateItem(id: string, patch: Partial<BulkItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }

  // ─── Gallery Feature flow (feature-gallery) ──────────────────────────────

  function toggleGallerySelect(itemId: string, url: string) {
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const cur = it.gallerySelected ?? [];
      if (cur.includes(url)) return { ...it, gallerySelected: cur.filter(u => u !== url) };
      if (cur.length + (it.textCards?.length ?? 0) >= GALLERY_MAX_SELECT) return it;
      return { ...it, gallerySelected: [...cur, url] };
    }));
  }

  const galleryAnalysisRunning = useRef(false);
  const [modalSlide, setModalSlide] = useState<{ itemId: string; url: string } | null>(null);
  const [renderingSlide, setRenderingSlide] = useState<{ url: string; data: GallerySlideData; hint?: GalleryLayoutHint } | null>(null);
  // Feature-card step: text-version card being edited (cardId within the item),
  // and the per-item hidden file input for image uploads.
  const [textModal, setTextModal] = useState<{ itemId: string; cardId: string } | null>(null);
  const [renderingText, setRenderingText] = useState<TextCard | null>(null);
  const uploadInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /** Register an uploaded (already cropped, 1:1) image as a feature slide:
   *  stored as a data URL in gallerySelected (order = export order) with a
   *  pre-seeded pass-through slide record — uploads are used as-is, no text
   *  analysis. */
  async function registerFeatureUpload(
    itemId: string,
    dataUrl: string,
    cropSource?: string,
    cropState?: { crop: { x: number; y: number }; zoom: number },
  ) {
    const { w, h } = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1200, h: 1200 });
      img.src = dataUrl;
    });
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const cur = it.gallerySelected ?? [];
      if (cur.length + (it.textCards?.length ?? 0) >= GALLERY_MAX_SELECT || cur.includes(dataUrl)) return it;
      return {
        ...it,
        gallerySelected: [...cur, dataUrl],
        gallerySlides: {
          ...(it.gallerySlides ?? {}),
          [dataUrl]: { status: 'done', imgW: w, imgH: h, blocks: [], v: SLIDE_SCHEMA_V, cropSource, cropState },
        },
      };
    }));
  }

  /** Picked file → 1:1 crop modal (slides export as 1200×1200 squares). */
  const [uploadCrop, setUploadCrop] = useState<{ itemId: string; src: string } | null>(null);
  /** Review-time crop for PASS-THROUGH cards only (no re-typeset text —
   *  cropping a translated card would break its measured mask geometry). */
  const [reviewCrop, setReviewCrop] = useState<{ itemId: string; url: string } | null>(null);

  /** Render source for a slide: the review crop, when one was made. */
  const slideSrc = (url: string, d: GallerySlideData) => d.croppedUrl ?? getProxiedImageUrl(url);
  /** Crop vs Edit is decided purely by `translatable` (real text detected on a
   *  white background at analysis time) — a card with no text is always
   *  croppable, a card with text always opens the Rewrite-copy modal instead.
   *  `translatable` is set once when analysis finishes and never touched
   *  again, so this choice stays fixed for the slide's lifetime — it must NOT
   *  depend on `croppedUrl` or anything else that changes as the user crops
   *  the image, or Crop/Edit would flip depending on what the user already did. */
  const slideCroppable = (d: GallerySlideData | undefined): d is GallerySlideData =>
    d?.status === 'done' && !d.translatable;
  /** Slide currently showing manually-typed head/sub copy (vs the original). */
  const hasRewrite = (d: GallerySlideData | undefined): boolean =>
    !!(d?.rewriteOn && d.rewrite && (d.rewrite.headCopy.trim() || d.rewrite.subCopy.trim()));

  /** Untouched default feature-text state — the dimmed sample behind the
   *  "Add text card" tile. */
  const textSampleState = React.useMemo(() => makeInitialThumbnailStates(t)['feature-text'], [t]);

  function removeFeatureUpload(itemId: string, dataUrl: string) {
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const slides = { ...(it.gallerySlides ?? {}) };
      delete slides[dataUrl];
      return { ...it, gallerySelected: (it.gallerySelected ?? []).filter(u => u !== dataUrl), gallerySlides: slides };
    }));
  }

  function addTextCard(itemId: string) {
    const card: TextCard = { id: crypto.randomUUID(), state: makeInitialThumbnailStates(t)['feature-text'] };
    setItems(prev => prev.map(it => it.id === itemId
      ? { ...it, textCards: [...(it.textCards ?? []), card] }
      : it));
    setTextModal({ itemId, cardId: card.id });
  }

  function updateTextCard(itemId: string, cardId: string, state: ThumbnailFeatureTextState) {
    setItems(prev => prev.map(it => it.id === itemId
      ? { ...it, textCards: (it.textCards ?? []).map(c => c.id === cardId ? { ...c, state } : c) }
      : it));
  }

  function removeTextCard(itemId: string, cardId: string) {
    setItems(prev => prev.map(it => it.id === itemId
      ? { ...it, textCards: (it.textCards ?? []).filter(c => c.id !== cardId) }
      : it));
    setTextModal(m => (m && m.itemId === itemId && m.cardId === cardId ? null : m));
  }

  /** Product-level layout consensus over an item's analyzed slides (user
   *  rule: same-product gallery layouts match, so slides borrow from each
   *  other): alignment majority, per-role type size, text-column baseline.
   *  The template snaps a slide to these only within a small tolerance —
   *  genuinely different slides keep their own measurements. */
  function galleryLayoutHint(it: BulkItem): GalleryLayoutHint | undefined {
    const slides: GallerySlideData[] = (it.gallerySelected ?? [])
      .map(u => it.gallerySlides?.[u])
      .filter((d): d is GallerySlideData => d?.status === 'done' && d.blocks.length > 0);
    if (slides.length === 0) return undefined;
    let l = 0, c = 0;
    for (const d of slides) {
      const j = judgeSlideAlign(d);
      if (!j.confident) continue;
      if (j.align === 'left') l++; else c++;
    }
    const align = l === c ? undefined : l > c ? 'left' as const : 'center' as const;
    const med = (a: number[]) => a.length > 0 ? [...a].sort((x, y) => x - y)[a.length >> 1] : undefined;
    // Consensus type size per role in EM space (descender-normalized via
    // estimateEmFrac) — raw ink heights differ ~20% between texts with and
    // without descenders at the SAME em size, which broke the agreement
    // check. Confirmed only when ≥2 slides agree within 15%.
    const emByRole: { title?: number; body?: number } = {};
    for (const role of ['title', 'body'] as const) {
      const per: number[] = [];
      for (const d of slides) {
        const ems = d.blocks
          .filter(b => b.role === role && (b.refined?.lines.length ?? 0) > 0)
          .map(b => {
            const hs = b.refined!.lines.map(ln => ln.h).sort((x, y) => x - y);
            // The measured ink height belongs to the ORIGINAL glyphs, so
            // recovering the true em size must divide by the ORIGINAL
            // text's own ink-per-em ratio — the translation's ratio can
            // differ sharply (e.g. no-descender CJK standing in for a
            // descender-bearing Latin original) and silently skewed this
            // consensus toward the wrong, often too-small, size.
            return estimateEmFrac(b.original, role, hs[hs.length >> 1]);
          });
        const m = med(ems);
        if (m !== undefined) per.push(m);
      }
      // Median as consensus, no spread veto: the template only snaps units
      // already within 20% of it, so an outlier slide keeps its own size.
      if (per.length >= 2) emByRole[role] = med(per);
    }
    // Baseline consensus: each slide's text-column left edge / centre axis.
    const x0s: number[] = [];
    const cxs: number[] = [];
    for (const d of slides) {
      const pool = d.blocks.flatMap(b => b.refined?.lines ?? []);
      if (pool.length === 0) continue;
      x0s.push(Math.min(...pool.map(p => p.x0)));
      const mcx = med(pool.map(p => (p.x0 + p.x1) / 2));
      if (mcx !== undefined) cxs.push(mcx);
    }
    // Head→sub gap consensus: per slide, the distance from the head block's
    // measured ink bottom to the first block below it.
    const gaps: number[] = [];
    for (const d of slides) {
      const withLines = d.blocks.filter(b => (b.refined?.lines.length ?? 0) > 0);
      const headB = withLines.find(b => b.role === 'title');
      if (!headB) continue;
      const headBottom = Math.max(...headB.refined!.lines.map(l => l.y + l.h));
      const subTops = withLines
        .filter(b => b !== headB)
        .map(b => Math.min(...b.refined!.lines.map(l => l.y)))
        .filter(y => y > headBottom);
      if (subTops.length === 0) continue;
      const gap = Math.min(...subTops) - headBottom;
      if (gap > 0 && gap < 0.15) gaps.push(gap);
    }
    return {
      align,
      emByRole,
      x0: x0s.length >= 2 ? med(x0s) : undefined,
      cx: cxs.length >= 2 ? med(cxs) : undefined,
      gapHeadSub: gaps.length >= 2 ? med(gaps) : undefined,
    };
  }

  /** Scan every selected slide that has no (or a failed) result: load its
   *  natural size and run the FREE local pixel checks (product-shot / white-
   *  copy-zone) to decide whether it's a candidate for the manual rewrite
   *  panel. Zero API cost — no vision/translate call exists in this pipeline
   *  anymore; head/sub copy is typed directly by the user in the Edit modal. */
  async function runGalleryAnalysis(snapshot?: BulkItem[]) {
    if (!(isGalleryFlow || hasFeatureStep) || galleryAnalysisRunning.current) return;
    const source = snapshot ?? items;
    const jobs: { itemId: string; url: string }[] = [];
    for (const it of source) {
      for (const url of it.gallerySelected ?? []) {
        const d = it.gallerySlides?.[url];
        // 'loading' is also picked up: overlap is prevented by the running ref,
        // so a stale 'loading' (e.g. restored from a draft) gets re-run.
        // Results from an older analysis schema are stale too — re-run so they
        // pick up the current geometry pipeline.
        const stale = d?.status === 'done' && d.v !== SLIDE_SCHEMA_V;
        if (!d || d.status === 'error' || d.status === 'loading' || stale) jobs.push({ itemId: it.id, url });
      }
    }
    if (jobs.length === 0) return;
    galleryAnalysisRunning.current = true;
    setItems(prev => prev.map(it => {
      const mine = jobs.filter(j => j.itemId === it.id);
      if (mine.length === 0) return it;
      const slides = { ...(it.gallerySlides ?? {}) };
      for (const { url } of mine) slides[url] = { status: 'loading', imgW: 0, imgH: 0, blocks: [] };
      return { ...it, gallerySlides: slides };
    }));
    const setSlide = (itemId: string, url: string, data: GallerySlideData) =>
      setItems(prev => prev.map(it => it.id === itemId
        ? { ...it, gallerySlides: { ...(it.gallerySlides ?? {}), [url]: data } }
        : it));
    const one = async (job: { itemId: string; url: string }) => {
      try {
        const slide = await loadSlideImage(getProxiedImageUrl(job.url));
        // Plain product-cutout shots get no copy zone at all — pass through.
        if (slide.isProductShot()) {
          setSlide(job.itemId, job.url, { status: 'done', imgW: slide.imgW, imgH: slide.imgH, blocks: [], v: SLIDE_SCHEMA_V });
          return;
        }
        // Rewrite panel is TV-only — see isTvProductUrl.
        const owner = source.find((it) => it.id === job.itemId);
        if (!owner || !isTvProductUrl(owner.mainUrl)) {
          setSlide(job.itemId, job.url, { status: 'done', imgW: slide.imgW, imgH: slide.imgH, blocks: [], v: SLIDE_SCHEMA_V });
          return;
        }
        // Only the classic white feature card (white top, head/sub copy,
        // artwork below) is offered the rewrite panel. Every other layout —
        // colour/beige panels, gradients, lifestyle shots, text-over-image —
        // passes through untouched.
        const zone = slide.whiteCopyZone();
        if (!zone.ok) {
          setSlide(job.itemId, job.url, { status: 'done', imgW: slide.imgW, imgH: slide.imgH, blocks: [], v: SLIDE_SCHEMA_V });
          return;
        }
        setSlide(job.itemId, job.url, {
          status: 'done', imgW: slide.imgW, imgH: slide.imgH, blocks: [],
          v: SLIDE_SCHEMA_V, translatable: true, copyZoneBottom: zone.bottom,
          needsCrop: slide.hasCroppedContent(),
        });
      } catch (err: any) {
        setSlide(job.itemId, job.url, { status: 'error', imgW: 0, imgH: 0, blocks: [], error: err?.message || 'Analysis failed' });
      }
    };
    try {
      for (let i = 0; i < jobs.length; i += SCRAPE_CONCURRENCY) {
        await Promise.all(jobs.slice(i, i + SCRAPE_CONCURRENCY).map(one));
      }
    } finally {
      galleryAnalysisRunning.current = false;
    }
  }

  // A restored "Save for Later" draft can now land directly on the Feature
  // Cards / Review phase (see useDraftSave's `serialize` below) instead of
  // always bouncing back to Edit — but analysis is normally only kicked off
  // by the button clicks that ADVANCE into these phases, which never fire on
  // a restore. Run it here too, ONCE on mount, so any 'loading'/stale slides
  // from the restored draft pick up where they left off; runGalleryAnalysis
  // already no-ops for slides that are 'done' on the current schema. Gated
  // on `restored` (not just `phase`) so a normal, non-restored 'list'→'feature'
  // click doesn't re-trigger a full analysis pass on every visit.
  useEffect(() => {
    if (restored && (restored.phase === 'feature' || restored.phase === 'generate')) {
      void runGalleryAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Manual head/sub copy the user typed in the Edit modal — no API call. */
  function updateSlideRewrite(itemId: string, url: string, patch: Partial<{ headCopy: string; subCopy: string }>) {
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const d = it.gallerySlides?.[url];
      if (!d) return it;
      const rewrite = { headCopy: '', subCopy: '', ...d.rewrite, ...patch };
      return { ...it, gallerySlides: { ...(it.gallerySlides ?? {}), [url]: { ...d, rewrite } } };
    }));
  }

  /** "Rewrite copy" toggle for one slide: ON = mask the white copy zone and
   *  render the manually-typed head/sub copy; OFF = the untouched original
   *  image. The typed copy stays stored either way, so the toggle flips back
   *  losslessly. */
  function setSlideRewriteOn(itemId: string, url: string, v: boolean) {
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const d = it.gallerySlides?.[url];
      if (!d) return it;
      return { ...it, gallerySlides: { ...(it.gallerySlides ?? {}), [url]: { ...d, rewriteOn: v } } };
    }));
  }

  async function handleDownloadZipGallery() {
    const entries = items.flatMap(it => {
      const hint = galleryLayoutHint(it);
      return (it.gallerySelected ?? [])
        .map(url => ({ url, data: it.gallerySlides?.[url], hint }))
        .filter((e): e is { url: string; data: GallerySlideData; hint?: GalleryLayoutHint } => e.data?.status === 'done');
    });
    if (entries.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    // Resolve the brand faces first — the two-pass warmup below caches images,
    // not fonts, so a font still in flight bakes into the PNG as a fallback.
    await ensureBrandFontLoaded(fontId);
    const zip = new JSZip();
    const { w, h } = slot.size;
    const d = new Date();
    const date6 = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < entries.length; i++) {
      setRenderingSlide(entries[i]);
      await new Promise(r => setTimeout(r, 200));
      if (renderRef.current) {
        let restore: (() => void) | null = null;
        try {
          restore = await preloadImagesToDataUrls(renderRef.current);
          await toPng(renderRef.current, { width: w, height: h, pixelRatio: 1, skipFonts: false });
          await toPng(renderRef.current, { width: w, height: h, pixelRatio: 1, skipFonts: false });
          const dataUrl = await toPng(renderRef.current, { width: w, height: h, pixelRatio: 1, skipFonts: false, cacheBust: true });
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          zip.file(`${String(i + 1).padStart(2, '0')}-${slot.category}-${slotId}-${w}x${h}-${fontFileTag(fontId)}${date6}.png`, blob);
        } catch (err) {
          console.error(`[BulkGenerator] Gallery export failed for slide ${i}:`, err);
        } finally {
          restore?.();
        }
      }
      setExportProgress(i + 1);
    }

    setRenderingSlide(null);
    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await saveBlob(zipBlob, `LG-${slot.category}-${slotId}-${fontFileTag(fontId)}${date6}.zip`);
    } catch (err) {
      console.error('[BulkGenerator] ZIP save failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }

  /** The checked, exportable cards of one product, in the user's order:
   *  product card first (when its checkbox is on), then the checked feature
   *  slides, then the checked text cards. The array index IS the export
   *  number (01, 02, …) — unchecking any card renumbers the rest from the
   *  front. Shared by the review labels and the ZIP export so they always
   *  agree. */
  type ExportUnit =
    | { kind: 'product' }
    | { kind: 'slide'; url: string; data: GallerySlideData }
    | { kind: 'text'; card: TextCard };
  function itemExportUnits(it: BulkItem): ExportUnit[] {
    if (it.scrapeStatus === 'error') return [];
    // The PRODUCT-level checkbox is the only way to drop a product — and it
    // drops the whole set. Inside an included product the 01 card is
    // mandatory; only feature slides / text cards toggle individually.
    if (!selectedItemIds.has(it.id)) return [];
    const units: ExportUnit[] = [{ kind: 'product' }];
    for (const url of it.gallerySelected ?? []) {
      const d = it.gallerySlides?.[url];
      if (d?.status === 'done' && !excludedSlides.has(it.id + '|' + url)) units.push({ kind: 'slide', url, data: d });
    }
    for (const card of it.textCards ?? []) {
      if (!excludedTextCards.has(card.id)) units.push({ kind: 'text', card });
    }
    return units;
  }

  /** Live product-card flow export: per product, the checked cards numbered
   *  01, 02, … in the user's order (see itemExportUnits). Multi-product ZIPs
   *  disambiguate by the model code after the number. */
  async function handleDownloadZipCombined() {
    const exportable = items
      .map(it => ({ item: it, units: itemExportUnits(it) }))
      .filter(e => e.units.length > 0);
    if (exportable.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    // Resolve the brand faces first — the two-pass warmup below caches images,
    // not fonts, so a font still in flight bakes into the PNG as a fallback.
    await ensureBrandFontLoaded(fontId);
    const zip = new JSZip();
    const { w, h } = slot.size;
    const d = new Date();
    const date6 = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    let done = 0;

    // Renders whatever the off-screen container currently shows (the
    // rendering* state set just before) with the standard warm-up passes.
    const shoot = async (): Promise<Blob | null> => {
      if (!renderRef.current) return null;
      let restore: (() => void) | null = null;
      try {
        restore = await preloadImagesToDataUrls(renderRef.current);
        await toPng(renderRef.current, { width: w, height: h, pixelRatio: 1, skipFonts: false });
        await toPng(renderRef.current, { width: w, height: h, pixelRatio: 1, skipFonts: false });
        const dataUrl = await toPng(renderRef.current, { width: w, height: h, pixelRatio: 1, skipFonts: false, cacheBust: true });
        const res = await fetch(dataUrl);
        return await res.blob();
      } catch (err) {
        console.error('[BulkGenerator] Combined export shot failed:', err);
        return null;
      } finally {
        restore?.();
      }
    };
    const bump = () => { done += 1; setExportProgress(done); };

    for (const { item, units } of exportable) {
      const model = modelFromUrl(item.mainUrl);
      const hint = galleryLayoutHint(item);
      for (let k = 0; k < units.length; k++) {
        const u = units[k];
        const no = String(k + 1).padStart(2, '0');
        setRenderingItem(u.kind === 'product' ? item : null);
        setRenderingSlide(u.kind === 'slide' ? { url: u.url, data: u.data, hint } : null);
        setRenderingText(u.kind === 'text' ? u.card : null);
        await new Promise(r => setTimeout(r, 200));
        const blob = await shoot();
        if (blob) {
          const suffix = u.kind === 'product' ? slotId : u.kind === 'slide' ? 'feature-gallery' : 'feature-text';
          // One folder per product model — numbering restarts inside each.
          zip.file(`${model}/${no}-${model}-${suffix}-${w}x${h}-${fontFileTag(fontId)}${date6}.png`, blob);
        }
        bump();
      }
    }

    setRenderingItem(null);
    setRenderingSlide(null);
    setRenderingText(null);
    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await saveBlob(zipBlob, `LG-thumbnails-${slotId}-${fontFileTag(fontId)}${date6}.zip`);
    } catch (err) {
      console.error('[BulkGenerator] ZIP save failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }

  // ─── ZIP Export ──────────────────────────────────────────────────────────

  function getItemModelName(item: BulkItem): string {
    switch (slotId) {
      case 'default':         return item.allStates.default.modelName;
      case 'gwp':             return item.allStates.gwp[item.orientation].modelName;
      case 'bundle':          return item.allStates.bundle[item.orientation].modelName1;
      case 'usp':             return item.allStates.usp.modelName;
      case 'promotion':       return item.allStates.promotion.modelName;
      case 'feature-image':   return item.allStates['feature-image'].modelName;
      case 'feature-gallery': return item.allStates['feature-gallery'].headingText;
      default:                return '';
    }
  }

  // Stable label for the list row. feature-gallery has no model field — getItemModelName
  // returns its headingText, which changes when the user swaps the image, so the row would
  // rename itself. Pin that slot's row to the URL model code instead (mainUrl never changes).
  function getItemRowLabel(item: BulkItem): string {
    if (slotId === 'feature-gallery') return modelFromUrl(item.mainUrl);
    return getItemModelName(item) || modelFromUrl(item.mainUrl);
  }

  function renderOffscreenTemplate(item: BulkItem) {
    switch (slotId) {
      case 'default':         return <DefaultThumbnailTemplate state={item.allStates.default} />;
      case 'gwp':             return <GwpThumbnailTemplate state={item.allStates.gwp[item.orientation]} orientation={item.orientation} />;
      case 'bundle':          return <BundleThumbnailTemplate state={item.allStates.bundle[item.orientation]} orientation={item.orientation} />;
      case 'usp':             return <UspThumbnailTemplate state={item.allStates.usp} />;
      case 'promotion':       return <PromotionThumbnailTemplate state={item.allStates.promotion} />;
      case 'feature-image':   return <FeatureImageThumbnailTemplate state={item.allStates['feature-image']} />;
      case 'feature-gallery': return <GalleryFeatureThumbnailTemplate state={item.allStates['feature-gallery']} />;
      default:                return null;
    }
  }

  async function handleDownloadZip() {
    const exportable = items
      .map(it => ({ item: it, units: itemExportUnits(it) }))
      .filter(e => e.units.length > 0);
    if (exportable.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    // Resolve the brand faces first — the two-pass warmup below caches images,
    // not fonts, so a font still in flight bakes into the PNG as a fallback.
    await ensureBrandFontLoaded(fontId);
    const zip = new JSZip();
    const { w, h } = slot.size;
    const d = new Date();
    const date6 = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < exportable.length; i++) {
      const item = exportable[i];
      setRenderingItem(item);
      await new Promise(r => setTimeout(r, 200));

      if (renderRef.current) {
        let restore: (() => void) | null = null;
        try {
          restore = await preloadImagesToDataUrls(renderRef.current);
          await toPng(renderRef.current, { width: w, height: h, pixelRatio: 1, skipFonts: false });
          await toPng(renderRef.current, { width: w, height: h, pixelRatio: 1, skipFonts: false });
          const dataUrl = await toPng(renderRef.current, { width: w, height: h, pixelRatio: 1, skipFonts: false, cacheBust: true });
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          zip.file(`${String(i + 1).padStart(2, '0')}-${slot.category}-${slotId}-${w}x${h}-${fontFileTag(fontId)}${date6}.png`, blob);
        } catch (err) {
          console.error(`[BulkGenerator] Export failed for item ${i}:`, err);
        } finally {
          restore?.();
        }
      }
      setExportProgress(i + 1);
    }

    setRenderingItem(null);
    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await saveBlob(zipBlob, `LG-${slot.category}-${slotId}-${fontFileTag(fontId)}${date6}.zip`);
    } catch (err) {
      console.error('[BulkGenerator] ZIP save failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }

  // ─── Inline editor panel (Phase 2) ───────────────────────────────────────

  function renderItemEditorPanel(item: BulkItem) {
    const updateAllStates = (s: ThumbnailAllStates) => updateItem(item.id, { allStates: s });
    const setOrient = (o: Orientation) => updateItem(item.id, { orientation: o });

    return (
      <div className="flex flex-col gap-5">
        {(isGwp || isBundle) && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-700">{t('Orientation')}</span>
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {(['horizontal', 'vertical'] as Orientation[]).map(o => (
                <button
                  key={o}
                  onClick={() => setOrient(o)}
                  className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${
                    item.orientation === o ? 'bg-white text-[#FD312E] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {o === 'horizontal' ? t('Horizontal') : t('Vertical')}
                </button>
              ))}
            </div>
          </div>
        )}
        {slotId === 'default' && (
          <DefaultEditorPanel
            state={item.allStates.default}
            onChange={s => updateAllStates({ ...item.allStates, default: s })}
            preloadedImages={item.scrapedImages}
          />
        )}
        {slotId === 'gwp' && (
          <GwpEditorPanel
            state={item.allStates.gwp[item.orientation]}
            onChange={s => updateAllStates({ ...item.allStates, gwp: { horizontal: s, vertical: s } })}
            orientation={item.orientation}
            preloadedImages={item.scrapedImages}
            preloadedImagesGift={item.scrapedImagesGift}
          />
        )}
        {slotId === 'bundle' && (
          <BundleEditorPanel
            key={item.id + item.orientation}
            state={item.allStates.bundle[item.orientation]}
            onChange={s => updateAllStates({ ...item.allStates, bundle: { horizontal: s, vertical: s } })}
            orientation={item.orientation}
            preloadedImages={item.scrapedImages}
            preloadedImages2={item.scrapedImages2}
          />
        )}
        {slotId === 'usp' && (
          <UspEditorPanel
            state={item.allStates.usp}
            onChange={s => updateAllStates({ ...item.allStates, usp: s })}
            preloadedImages={item.scrapedImages}
          />
        )}
        {slotId === 'promotion' && (
          <PromotionEditorPanel
            state={item.allStates.promotion}
            onChange={s => updateAllStates({ ...item.allStates, promotion: s })}
            preloadedImages={item.scrapedImages}
          />
        )}
        {slotId === 'feature-image' && (
          <FeatureImageEditorPanel
            state={item.allStates['feature-image']}
            onChange={s => updateAllStates({ ...item.allStates, 'feature-image': s })}
            preloadedImages={item.scrapedImages}
          />
        )}
        {slotId === 'feature-gallery' && (
          <GalleryFeatureEditorPanel
            state={item.allStates['feature-gallery']}
            onChange={s => updateAllStates({ ...item.allStates, 'feature-gallery': s })}
            preloadedImages={item.scrapedImages}
          />
        )}
      </div>
    );
  }

  // ─── Phase 2: Inline editor list ─────────────────────────────────────────

  if (phase === 'list') {
    const doneCount   = items.filter(it => it.scrapeStatus === 'done').length;
    const loadingCount = items.filter(it => it.scrapeStatus === 'loading').length;
    const exportable  = items.filter(it => it.scrapeStatus !== 'error');

    const PREVIEW_W = 460;
    const previewH   = PREVIEW_W * (slot.size.h / slot.size.w);
    const previewScale = PREVIEW_W / slot.size.w;

    return (
      <div className="h-screen flex flex-col bg-[#f8f7f5] overflow-hidden">
        <LGHeader
          onBack={guardedOnBack}
          right={
            <div className="flex items-center gap-3">
              <BrandFontSelector value={fontId} onChange={setFontId} />
              {saveForLater}
              <button
                onClick={() => {
                  if (hasFeatureStep) { setPhase('feature'); return; }
                  setPhase('generate');
                  if (isGalleryFlow) void runGalleryAnalysis();
                }}
                disabled={items.some(it => it.scrapeStatus === 'loading')
                  || (isGalleryFlow && items.every(it => (it.gallerySelected ?? []).length === 0))}
                className="flex items-center gap-2 bg-[#FD312E] hover:bg-[#E22825] text-white text-sm font-medium px-5 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                <span style={{ lineHeight: '20px' }}>{hasFeatureStep ? t('Next: Feature Cards') : t('Next: Review & Download')}</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          }
        />

        <div className="flex-1 flex min-h-0">
          <NavRail active={railActive} onNavigate={guardedOnRailNavigate} onOpenDraft={onOpenDraft} />
          <div className="flex-1 flex flex-col min-h-0">
            <WizardBreadcrumb steps={wizardSteps} activeStep={phaseToStep('list')} onStepClick={handleBreadcrumbClick} />

            {/* Scraping progress bar */}
            {loadingCount > 0 && (
              <div className="bg-white border-b border-gray-100 px-8 py-2 flex items-center gap-3 shrink-0">
                <Loader2 size={13} className="animate-spin text-[#FD312E] shrink-0" />
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-[#FD312E] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(doneCount / items.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {t('Importing… {done}/{total}').replace('{done}', String(doneCount)).replace('{total}', String(items.length))}
                </span>
              </div>
            )}

            {/* Item list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-5">
                {items.map((item, idx) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Card header */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="text-xs font-bold text-[#FD312E] bg-[#FD312E]/10 w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {item.scrapeStatus === 'loading' && <Loader2 size={12} className="animate-spin text-gray-400 shrink-0" />}
                      {item.scrapeStatus === 'error' && <AlertCircle size={12} className="text-red-400 shrink-0" />}
                      <span className="text-xs text-gray-500 font-medium truncate">
                        {item.scrapeStatus === 'done'
                          ? getItemRowLabel(item)
                          : item.scrapeStatus === 'error'
                          ? 'Failed to load'
                          : modelFromUrl(item.mainUrl)}
                      </span>
                      {isGalleryFlow && item.scrapeStatus === 'done' && (
                        <span className="ml-auto text-[11px] font-medium text-gray-400 tabular-nums shrink-0">
                          {(item.gallerySelected ?? []).length}/{GALLERY_MAX_SELECT}
                        </span>
                      )}
                    </div>

                    {/* Card body: gallery flow → slide strip; others → preview + editor */}
                    {isGalleryFlow ? (
                      item.scrapeStatus === 'loading' ? (
                        <GalleryStripSkeleton />
                      ) : item.scrapeStatus === 'error' ? (
                        <div className="px-5 py-6 flex items-center gap-2 text-red-300 text-xs justify-center">
                          <AlertCircle size={14} /> {t('Failed to load')}
                        </div>
                      ) : (
                        <GalleryStripCard
                          images={galleryStripImages(item.scrapedImages)}
                          selected={item.gallerySelected ?? []}
                          onToggle={(url) => toggleGallerySelect(item.id, url)}
                        />
                      )
                    ) : (
                    <div className="flex" style={{ height: previewH + 80 }}>
                      {/* Preview */}
                      <div
                        className="shrink-0 flex flex-col items-center justify-center gap-3 p-6 bg-[#CBC8C2]"
                        style={{ width: PREVIEW_W + 48 }}
                      >
                        <div
                          className="relative shadow-xl overflow-hidden"
                          style={{ width: PREVIEW_W, height: previewH }}
                        >
                          <div
                            style={{
                              width: slot.size.w,
                              height: slot.size.h,
                              transform: `scale(${previewScale})`,
                              transformOrigin: 'top left',
                              position: 'absolute',
                              pointerEvents: 'none',
                            }}
                          >
                            {item.scrapeStatus === 'loading' ? (
                              <div className="w-full h-full bg-white flex items-center justify-center">
                                <Loader2 size={32} className="animate-spin text-gray-300" />
                              </div>
                            ) : item.scrapeStatus === 'error' ? (
                              <div className="w-full h-full bg-red-50 flex items-center justify-center flex-col gap-2">
                                <AlertCircle size={20} className="text-red-300" />
                                <span className="text-[10px] text-red-300">{t('Failed to load')}</span>
                              </div>
                            ) : (
                              renderOffscreenTemplate(item)
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-white/40 self-center">{slot.size.w} × {slot.size.h} px</p>
                      </div>

                      {/* Editor */}
                      <div className="flex-1 min-w-0 overflow-y-auto p-6 border-l border-gray-100 flex flex-col gap-5">
                        <div>
                          <p className="font-lgei font-bold text-[14px] text-gray-900" style={{ lineHeight: '18px' }}>{t('Editor')}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{t('Select images, edit text below.')}</p>
                        </div>
                        {renderItemEditorPanel(item)}
                      </div>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Off-screen render container for ZIP export */}
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: slot.size.w,
            height: slot.size.h,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <div ref={renderRef} style={{ width: slot.size.w, height: slot.size.h }}>
            {renderingItem && renderOffscreenTemplate(renderingItem)}
          </div>
        </div>

        {unsavedModal}
      </div>
    );
  }

  // ─── Text-version card modal (feature phase + review) ────────────────────

  function renderTextCardModal() {
    if (!textModal) return null;
    const it = items.find(i => i.id === textModal.itemId);
    const card = it?.textCards?.find(c => c.id === textModal.cardId);
    if (!it || !card) return null;
    const PREVIEW_W = 460;
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setTextModal(null)}>
        <div
          className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: 'calc(100vw - 64px)', maxWidth: 1100, height: 'calc(100vh - 80px)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <p className="font-lgei font-bold text-[15px] text-gray-900" style={{ lineHeight: '20px' }}>
              {t('Text Feature Card')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => removeTextCard(it.id, card.id)}
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-400 border border-gray-200 hover:text-red-500 hover:border-red-200 transition-colors"
              >
                {t('Delete')}
              </button>
              <button
                onClick={() => setTextModal(null)}
                className="px-5 py-2 rounded-full text-sm font-medium bg-[#FD312E] text-white hover:bg-[#E22825] transition-colors"
              >
                {t('Done')}
              </button>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden min-h-0">
            <div className="shrink-0 bg-[#CBC8C2] flex flex-col items-center justify-center gap-3 p-6" style={{ width: PREVIEW_W + 48 }}>
              <div className="relative shadow-xl overflow-hidden" style={{ width: PREVIEW_W, height: PREVIEW_W }}>
                <div style={{ width: 1200, height: 1200, transform: `scale(${PREVIEW_W / 1200})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                  <FeatureTextThumbnailTemplate state={card.state} />
                </div>
              </div>
              <p className="text-[10px] text-white/40 self-center">1200 × 1200 px</p>
            </div>
            <div className="flex-1 min-w-0 overflow-y-auto p-6">
              <FeatureTextEditorPanel
                state={card.state}
                onChange={s => updateTextCard(it.id, card.id, s)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Phase 2.5: Feature Cards (live product-card flow) ───────────────────

  if (phase === 'feature') {
    const loadingCount = items.filter(it => it.scrapeStatus === 'loading').length;
    return (
      <div className="h-screen flex flex-col bg-[#f8f7f5] overflow-hidden">
        <LGHeader
          onBack={guardedOnBack}
          right={
            <div className="flex items-center gap-3">
              <BrandFontSelector value={fontId} onChange={setFontId} />
              {saveForLater}
              <button
                onClick={() => { setPhase('generate'); void runGalleryAnalysis(); }}
                disabled={loadingCount > 0}
                className="flex items-center gap-2 bg-[#FD312E] hover:bg-[#E22825] text-white text-sm font-medium px-5 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                <span style={{ lineHeight: '20px' }}>{t('Next: Review & Download')}</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          }
        />

        <div className="flex-1 flex min-h-0">
          <NavRail active={railActive} onNavigate={guardedOnRailNavigate} onOpenDraft={onOpenDraft} />
          <div className="flex-1 flex flex-col min-h-0">
            <WizardBreadcrumb steps={wizardSteps} activeStep={phaseToStep('feature')} onStepClick={handleBreadcrumbClick} />

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-lgei font-bold text-[20px] text-gray-900" style={{ lineHeight: '28px' }}>
                      {t('Feature Cards')}
                    </h2>
                    <div className="group relative flex items-center">
                      <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center cursor-help">
                        ?
                      </span>
                      <div className="hidden group-hover:block absolute left-0 top-full mt-2 z-20 w-64 bg-white rounded-xl border border-gray-200 shadow-lg p-3">
                        <img
                          src="/thumbnail/type-feature-page.png"
                          alt={t('Feature Page preview')}
                          className="w-full rounded-md"
                          draggable={false}
                        />
                        <p className="text-xs text-gray-500 mt-2" style={{ lineHeight: '16px' }}>
                          {t('Gallery images shown inside each product\'s individual detail page.')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5" style={{ lineHeight: '20px' }}>
                    {t('Pick gallery slides for each product, upload your own image, or add a text card.')}
                  </p>
                </div>
                {items.map((item, idx) => {
                  const selected = item.gallerySelected ?? [];
                  const uploads = selected.filter(u => u.startsWith('data:'));
                  const textCards = item.textCards ?? [];
                  return (
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-bold text-[#FD312E] bg-[#FD312E]/10 w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        {item.scrapeStatus === 'loading' && <Loader2 size={12} className="animate-spin text-gray-400 shrink-0" />}
                        {item.scrapeStatus === 'error' && <AlertCircle size={12} className="text-red-400 shrink-0" />}
                        <span className="text-xs text-gray-500 font-medium truncate">{modelFromUrl(item.mainUrl)}</span>
                        <span className="ml-auto text-[11px] font-medium text-gray-400 tabular-nums shrink-0">
                          {selected.length + textCards.length}/{GALLERY_MAX_SELECT}
                        </span>
                      </div>
                      {item.scrapeStatus === 'loading' ? (
                        <GalleryStripSkeleton />
                      ) : item.scrapeStatus === 'error' ? (
                        <div className="px-5 py-6 flex items-center gap-2 text-red-300 text-xs justify-center">
                          <AlertCircle size={14} /> {t('Failed to load')}
                        </div>
                      ) : (
                        <GalleryStripCard
                          images={[...galleryStripImages(item.scrapedImages), ...galleryStripImages(item.scrapedImages2 ?? [])]}
                          selected={selected}
                          onToggle={(url) => toggleGallerySelect(item.id, url)}
                          orderBase={2}
                          extraCount={textCards.length}
                          leading={
                            /* The confirmed 01 product card — pinned while the gallery scrolls */
                            <div className="relative overflow-hidden bg-white" style={{ width: STRIP_TILE, height: STRIP_TILE }}>
                              <div style={{ width: slot.size.w, height: slot.size.h, transform: `scale(${STRIP_TILE / slot.size.w})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                                {renderOffscreenTemplate(item)}
                              </div>
                              <span className="absolute top-2 left-2 min-w-5 h-5 px-1 rounded border-2 bg-[#FD312E] border-[#FD312E] flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white leading-none tabular-nums">01</span>
                              </span>
                            </div>
                          }
                          trailing={
                            <>
                              {/* Uploaded images — already selected, order badge + remove */}
                              {uploads.map((u) => (
                                <div
                                  key={u.slice(0, 64) + u.length}
                                  className="relative shrink-0 rounded-lg overflow-hidden border-2 border-[#FD312E] shadow-md bg-white"
                                  style={{ width: STRIP_TILE, height: STRIP_TILE }}
                                >
                                  <span className="w-full h-full bg-white flex items-center justify-center">
                                    <img src={u} alt="" className="object-contain" style={{ width: '80%', height: '80%' }} />
                                  </span>
                                  <span className="absolute top-2 left-2 min-w-5 h-5 px-1 rounded border-2 bg-[#FD312E] border-[#FD312E] flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-white leading-none tabular-nums">
                                      {String(selected.indexOf(u) + 2).padStart(2, '0')}
                                    </span>
                                  </span>
                                  <button
                                    onClick={() => removeFeatureUpload(item.id, u)}
                                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              ))}
                              {/* Text-version cards — numbered after the image slides */}
                              {textCards.map((c, ti) => (
                                <div
                                  key={c.id}
                                  className="relative shrink-0 rounded-lg overflow-hidden border-2 border-[#FD312E] shadow-md cursor-pointer"
                                  style={{ width: STRIP_TILE, height: STRIP_TILE, background: '#ffffff' }}
                                  onClick={() => setTextModal({ itemId: item.id, cardId: c.id })}
                                >
                                  <div style={{ width: 1200, height: 1200, transform: `scale(${(STRIP_TILE * 0.8) / 1200})`, transformOrigin: 'top left', position: 'absolute', top: STRIP_TILE * 0.1, left: STRIP_TILE * 0.1, pointerEvents: 'none' }}>
                                    <FeatureTextThumbnailTemplate state={c.state} />
                                  </div>
                                  <span className="absolute top-2 left-2 min-w-5 h-5 px-1 rounded border-2 bg-[#FD312E] border-[#FD312E] flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-white leading-none tabular-nums">
                                      {String(selected.length + ti + 2).padStart(2, '0')}
                                    </span>
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeTextCard(item.id, c.id); }}
                                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              ))}
                              {/* Upload your own image — opens a 1:1 crop modal */}
                              <button
                                type="button"
                                onClick={() => uploadInputRefs.current[item.id]?.click()}
                                disabled={selected.length + textCards.length >= GALLERY_MAX_SELECT}
                                className="shrink-0 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#FD312E] hover:text-[#FD312E] text-gray-400 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                                style={{ width: STRIP_TILE, height: STRIP_TILE }}
                              >
                                <Upload size={18} />
                                <span className="text-xs font-medium">{t('Upload image')}</span>
                              </button>
                              {/* Add a text-version card — dimmed live sample behind the CTA.
                                  ONE text card per product: disabled once used. */}
                              <button
                                type="button"
                                onClick={() => { if (textCards.length === 0 && selected.length < GALLERY_MAX_SELECT) addTextCard(item.id); }}
                                disabled={textCards.length >= 1 || selected.length >= GALLERY_MAX_SELECT}
                                className="relative shrink-0 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-[#FD312E] transition-colors group/tsample disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300"
                                style={{ width: STRIP_TILE, height: STRIP_TILE, background: '#ffffff' }}
                              >
                                <div style={{ width: 1200, height: 1200, transform: `scale(${(STRIP_TILE * 0.8) / 1200})`, transformOrigin: 'top left', position: 'absolute', top: STRIP_TILE * 0.1, left: STRIP_TILE * 0.1, pointerEvents: 'none', opacity: 0.45 }}>
                                  <FeatureTextThumbnailTemplate state={textSampleState} />
                                </div>
                                <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center gap-1.5 text-gray-500 group-hover/tsample:text-[#FD312E] transition-colors">
                                  <Type size={16} />
                                  <span className="text-xs font-medium">{textCards.length >= 1 ? t('Text card added') : t('Add text card')}</span>
                                </div>
                              </button>
                              <input
                                ref={(el) => { uploadInputRefs.current[item.id] = el; }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const src = await readFileAsDataURL(file);
                                    setUploadCrop({ itemId: item.id, src });
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </>
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {uploadCrop && (
          <ImageCropModal
            imageSrc={uploadCrop.src}
            aspectRatio={1}
            title={t('Upload image')}
            minZoom={0.1}
            // Fresh Feature Card upload: show the whole image (fit/shorter-side)
            // instead of auto-covering the square — the user needs to see the
            // full source before deciding how to frame it.
            initialZoom={1}
            onCancel={() => setUploadCrop(null)}
            onConfirm={(croppedDataUrl, cropState) => {
              void registerFeatureUpload(uploadCrop.itemId, croppedDataUrl, uploadCrop.src, cropState);
              setUploadCrop(null);
            }}
          />
        )}
        {renderTextCardModal()}
        {unsavedModal}
      </div>
    );
  }

  // ─── Phase 3: Generate grid ───────────────────────────────────────────────

  if (phase === 'generate') {
    const exportable = items.filter(it => it.scrapeStatus !== 'error');
    const selectedExportable = exportable.filter(it => selectedItemIds.has(it.id));

    // Gallery flow / feature step: analysis units are the checked slides,
    // flattened in item order.
    const slideEntries = (isGalleryFlow || hasFeatureStep)
      ? items.flatMap(it => (it.gallerySelected ?? []).map(url => ({ item: it, url, data: it.gallerySlides?.[url] })))
      : [];
    const slidesDone = slideEntries.filter(s => s.data?.status === 'done').length;
    const slidesLoading = slideEntries.filter(s => !s.data || s.data.status === 'loading').length;
    const slidesError = slideEntries.filter(s => s.data?.status === 'error').length;

    // Live product-card flow: one review group per product — the 01 product
    // card, then its feature slides / text cards in the user's order.
    const combinedGroups = hasFeatureStep
      ? items.filter(it => it.scrapeStatus !== 'error').map(it => ({
          item: it,
          slides: (it.gallerySelected ?? []).map(url => ({ item: it, url, data: it.gallerySlides?.[url] })),
          textCards: it.textCards ?? [],
        }))
      : [];
    const combinedTotal = combinedGroups.reduce((a, g) => a + itemExportUnits(g.item).length, 0);

    // Gallery review is grouped BY PRODUCT: one block per item, its selected
    // slides inside. `idx` stays a global running number (01, 02, …) matching
    // slideEntries order, so tile labels and the ZIP filename schema line up.
    let _galleryOffset = 0;
    const galleryGroups = items
      .filter(it => (it.gallerySelected ?? []).length > 0)
      .map(it => {
        const entries = (it.gallerySelected ?? []).map((url, j) => ({
          item: it, url, data: it.gallerySlides?.[url], idx: _galleryOffset + j,
        }));
        _galleryOffset += entries.length;
        return { item: it, entries };
      });
    const modalSlideEntry = (isGalleryFlow || hasFeatureStep) && modalSlide
      ? slideEntries.find(s => s.item.id === modalSlide.itemId && s.url === modalSlide.url) ?? null
      : null;
    const modalSlideIdx = modalSlideEntry ? slideEntries.indexOf(modalSlideEntry) : -1;

    const THUMB_W = 240;
    const thumbH = THUMB_W * (slot.size.h / slot.size.w);
    const thumbScale = THUMB_W / slot.size.w;

    const MODAL_PREVIEW_W = 460;
    const modalPreviewH = MODAL_PREVIEW_W * (slot.size.h / slot.size.w);
    const modalPreviewScale = MODAL_PREVIEW_W / slot.size.w;

    const modalItem = modalItemId ? (items.find(it => it.id === modalItemId) ?? null) : null;
    const modalIdx = modalItem ? items.findIndex(it => it.id === modalItem.id) : -1;

    return (
      <div className="h-screen flex flex-col bg-[#f8f7f5] overflow-hidden">
        <LGHeader
          onBack={guardedOnBack}
          right={
            <div className="flex items-center gap-3">
              <BrandFontSelector value={fontId} onChange={setFontId} />
              {saveForLater}
              <button
                onClick={hasFeatureStep ? handleDownloadZipCombined : isGalleryFlow ? handleDownloadZipGallery : handleDownloadZip}
                disabled={isExporting
                  || (hasFeatureStep
                    ? combinedTotal === 0 || slidesLoading > 0
                    : isGalleryFlow ? slidesDone === 0 || slidesLoading > 0 : selectedExportable.length === 0)}
                className="flex items-center gap-2 bg-[#FD312E] hover:bg-[#E22825] text-white text-sm font-medium px-5 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span style={{ lineHeight: '20px' }}>
                  {isExporting
                    ? t('Exporting… ({done}/{total})')
                        .replace('{done}', String(exportProgress))
                        .replace('{total}', String(hasFeatureStep ? combinedTotal : isGalleryFlow ? slidesDone : selectedExportable.length))
                    : t('Download ZIP')}
                </span>
              </button>
            </div>
          }
        />

        <div className="flex-1 flex min-h-0">
          <NavRail active={railActive} onNavigate={guardedOnRailNavigate} onOpenDraft={onOpenDraft} />
          <div className="flex-1 flex flex-col min-h-0">
            <WizardBreadcrumb steps={wizardSteps} activeStep={phaseToStep('generate')} onStepClick={handleBreadcrumbClick} />

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="mb-6">
                  <h2 className="font-lgei font-bold text-[20px] text-gray-900" style={{ lineHeight: '28px' }}>
                    {t('Review & Download')}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5" style={{ lineHeight: '20px' }}>
                    {t('Click any thumbnail to edit.')}
                  </p>
                </div>

                {(isGalleryFlow || hasFeatureStep) && slidesLoading > 0 && (
                  <div className="mb-4 bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
                    <Loader2 size={13} className="animate-spin text-[#FD312E] shrink-0" />
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-[#FD312E] h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${((slideEntries.length - slidesLoading) / Math.max(1, slideEntries.length)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {t('Translating…')} {slideEntries.length - slidesLoading}/{slideEntries.length}
                    </span>
                  </div>
                )}

                {hasFeatureStep ? (
                  <div className="flex flex-col gap-8">
                    {combinedGroups.map((g) => {
                      const item = g.item;
                      const model = modelFromUrl(item.mainUrl);
                      const hint = galleryLayoutHint(item);
                      // Export numbers follow the CHECKED cards only — see
                      // itemExportUnits; an unchecked card shows '—'.
                      const units = itemExportUnits(item);
                      const numOf = new Map<string, string>();
                      units.forEach((u, k) => numOf.set(
                        u.kind === 'product' ? 'p' : u.kind === 'slide' ? 's' + u.url : 't' + u.card.id,
                        String(k + 1).padStart(2, '0'),
                      ));
                      const groupChecked = selectedItemIds.has(item.id);
                      const toggleGroup = () => setSelectedItemIds(prev => {
                        const n = new Set(prev);
                        if (n.has(item.id)) n.delete(item.id);
                        else n.add(item.id);
                        return n;
                      });
                      return (
                        <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                            {/* Product-level checkbox — checks/unchecks every card of this product */}
                            <div className="cursor-pointer" onClick={toggleGroup}>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                groupChecked ? 'bg-[#FD312E] border-[#FD312E]' : 'bg-white border-gray-400'
                              }`}>
                                {groupChecked && (
                                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <h3 className="font-lgei font-bold text-[15px] text-gray-900" style={{ lineHeight: '20px' }}>
                              {model}
                            </h3>
                            <span className="text-[11px] text-gray-400">
                              {units.length}/{1 + g.slides.length + g.textCards.length} {t('cards')}
                            </span>
                          </div>
                          <div className={`flex flex-wrap gap-5 ${groupChecked ? '' : 'opacity-50'}`}>
                            {/* 01 — the product card */}
                            <div
                              className={`flex flex-col ${item.scrapeStatus !== 'error' ? 'cursor-pointer group' : ''}`}
                              style={{ width: THUMB_W }}
                              onClick={() => { if (item.scrapeStatus !== 'error') setModalItemId(item.id); }}
                            >
                              <div className="relative overflow-hidden shadow-sm" style={{ width: THUMB_W, height: thumbH, background: '#CBC8C2' }}>
                                <div style={{ width: slot.size.w, height: slot.size.h, transform: `scale(${thumbScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                                  {item.scrapeStatus === 'loading' ? (
                                    <div className="w-full h-full bg-white flex items-center justify-center">
                                      <Loader2 size={32} className="animate-spin text-gray-300" />
                                    </div>
                                  ) : (
                                    renderOffscreenTemplate(item)
                                  )}
                                </div>
                                {item.scrapeStatus === 'done' && (
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                                      {t('Edit')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1.5 truncate">{numOf.get('p') ?? '—'} · {model}</p>
                            </div>
                            {/* 02… — feature slides */}
                            {g.slides.map((s, j) => (
                              <div
                                key={item.id + s.url.slice(0, 80)}
                                className={`flex flex-col ${s.data?.status === 'done' ? 'cursor-pointer group' : ''}`}
                                style={{ width: THUMB_W }}
                                onClick={() => {
                                  if (s.data?.status !== 'done') return;
                                  if (slideCroppable(s.data)) setReviewCrop({ itemId: item.id, url: s.url });
                                  else setModalSlide({ itemId: item.id, url: s.url });
                                }}
                              >
                                <div className={`relative overflow-hidden shadow-sm ${excludedSlides.has(item.id + '|' + s.url) ? 'opacity-50' : ''}`} style={{ width: THUMB_W, height: thumbH, background: '#CBC8C2' }}>
                                  {s.data?.status === 'done' ? (
                                    <div style={{ width: slot.size.w, height: slot.size.h, transform: `scale(${thumbScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                                      <GallerySlideTemplate imageSrc={slideSrc(s.url, s.data)} data={s.data} layoutHint={hint} />
                                    </div>
                                  ) : s.data?.status === 'error' ? (
                                    <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center gap-2 px-4">
                                      <AlertCircle size={20} className="text-red-300" />
                                      <span className="text-[10px] text-red-400 text-center leading-tight line-clamp-2">
                                        {s.data.error || t('Failed')}
                                      </span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); void runGalleryAnalysis(undefined, { itemId: item.id, url: s.url }); }}
                                        className="text-[10px] text-red-400 underline"
                                      >
                                        {t('Retry')}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="w-full h-full bg-white flex items-center justify-center">
                                      <Loader2 size={32} className="animate-spin text-gray-300" />
                                    </div>
                                  )}
                                  {s.data?.status === 'done' && (
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                                        {slideCroppable(s.data) ? t('Crop') : t('Edit')}
                                      </span>
                                    </div>
                                  )}
                                  {s.data?.status === 'done' && (
                                    <div
                                      className="absolute top-2 left-2 z-10"
                                      onClick={e => {
                                        e.stopPropagation();
                                        const key = item.id + '|' + s.url;
                                        setExcludedSlides(prev => {
                                          const next = new Set(prev);
                                          if (next.has(key)) next.delete(key);
                                          else next.add(key);
                                          return next;
                                        });
                                      }}
                                    >
                                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                        excludedSlides.has(item.id + '|' + s.url) ? 'bg-white/80 border-gray-400' : 'bg-[#FD312E] border-[#FD312E]'
                                      }`}>
                                        {!excludedSlides.has(item.id + '|' + s.url) && (
                                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5 truncate">
                                  {numOf.get('s' + s.url) ?? '—'} · {model}
                                </p>
                              </div>
                            ))}
                            {/* Text-version cards — last */}
                            {g.textCards.map((c, ti) => (
                              <div
                                key={c.id}
                                className="flex flex-col cursor-pointer group"
                                style={{ width: THUMB_W }}
                                onClick={() => setTextModal({ itemId: item.id, cardId: c.id })}
                              >
                                <div className={`relative overflow-hidden shadow-sm ${excludedTextCards.has(c.id) ? 'opacity-50' : ''}`} style={{ width: THUMB_W, height: thumbH, background: '#F6F3EB' }}>
                                  <div style={{ width: 1200, height: 1200, transform: `scale(${thumbScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                                    <FeatureTextThumbnailTemplate state={c.state} />
                                  </div>
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                                      {t('Edit')}
                                    </span>
                                  </div>
                                  <div
                                    className="absolute top-2 left-2 z-10"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setExcludedTextCards(prev => {
                                        const next = new Set(prev);
                                        if (next.has(c.id)) next.delete(c.id);
                                        else next.add(c.id);
                                        return next;
                                      });
                                    }}
                                  >
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      excludedTextCards.has(c.id) ? 'bg-white/80 border-gray-400' : 'bg-[#FD312E] border-[#FD312E]'
                                    }`}>
                                      {!excludedTextCards.has(c.id) && (
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5 truncate">
                                  {numOf.get('t' + c.id) ?? '—'} · {model}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : isGalleryFlow ? (
                  <div className="flex flex-col gap-8">
                    {galleryGroups.map((g) => (
                      <div key={g.item.id}>
                        {/* Per-product header block */}
                        <div className="flex items-baseline gap-2 mb-3 pb-2 border-b border-gray-200">
                          <h3 className="font-lgei font-bold text-[15px] text-gray-900" style={{ lineHeight: '20px' }}>
                            {modelFromUrl(g.item.mainUrl)}
                          </h3>
                          <span className="text-[11px] text-gray-400">
                            {g.entries.length} {g.entries.length === 1 ? t('slide') : t('slides')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-5">
                          {g.entries.map((s) => (
                            <div
                              key={s.item.id + s.url}
                              className={`flex flex-col ${s.data?.status === 'done' ? 'cursor-pointer group' : ''}`}
                              style={{ width: THUMB_W }}
                              onClick={() => { if (s.data?.status === 'done') setModalSlide({ itemId: s.item.id, url: s.url }); }}
                            >
                              <div className="relative overflow-hidden shadow-sm" style={{ width: THUMB_W, height: thumbH, background: '#CBC8C2' }}>
                                {s.data?.status === 'done' ? (
                                  <div style={{ width: slot.size.w, height: slot.size.h, transform: `scale(${thumbScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                                    <GallerySlideTemplate imageSrc={slideSrc(s.url, s.data)} data={s.data} layoutHint={galleryLayoutHint(g.item)} />
                                  </div>
                                ) : s.data?.status === 'error' ? (
                                  <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center gap-2 px-4">
                                    <AlertCircle size={20} className="text-red-300" />
                                    <span className="text-[10px] text-red-400 text-center leading-tight line-clamp-2">
                                      {s.data.error || t('Failed')}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); void runGalleryAnalysis(undefined, { itemId: s.item.id, url: s.url }); }}
                                      className="text-[10px] text-red-400 underline"
                                    >
                                      {t('Retry')}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="w-full h-full bg-white flex items-center justify-center">
                                    <Loader2 size={32} className="animate-spin text-gray-300" />
                                  </div>
                                )}
                                {s.data?.status === 'done' && (
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                                      {t('Edit')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1.5 truncate">
                                {String(s.idx + 1).padStart(2, '0')} · {modelFromUrl(s.item.mainUrl)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                <div className="flex flex-wrap gap-5">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex flex-col gap-0 ${item.scrapeStatus !== 'error' ? 'cursor-pointer group' : ''}`}
                      style={{ width: THUMB_W }}
                      onClick={() => { if (item.scrapeStatus !== 'error') setModalItemId(item.id); }}
                    >
                      <div
                        className="relative overflow-hidden shadow-sm"
                        style={{ width: THUMB_W, height: thumbH, background: '#CBC8C2', borderRadius: 0 }}
                      >
                        <div
                          style={{
                            width: slot.size.w,
                            height: slot.size.h,
                            transform: `scale(${thumbScale})`,
                            transformOrigin: 'top left',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            pointerEvents: 'none',
                          }}
                        >
                          {item.scrapeStatus === 'loading' ? (
                            <div className="w-full h-full bg-white flex items-center justify-center">
                              <Loader2 size={32} className="animate-spin text-gray-300" />
                            </div>
                          ) : item.scrapeStatus === 'error' ? (
                            <div className="w-full h-full bg-red-50 flex items-center justify-center flex-col gap-2">
                              <AlertCircle size={20} className="text-red-300" />
                              <span className="text-[10px] text-red-300">{t('Failed')}</span>
                            </div>
                          ) : (
                            renderOffscreenTemplate(item)
                          )}
                        </div>

                        {item.scrapeStatus === 'done' && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                              {t('Edit')}
                            </span>
                          </div>
                        )}

                        {/* Checkbox top-left */}
                        <div
                          className="absolute top-2 left-2 z-10"
                          onClick={e => {
                            e.stopPropagation();
                            if (item.scrapeStatus === 'error') return;
                            setSelectedItemIds(prev => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            });
                          }}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedItemIds.has(item.id)
                              ? 'bg-[#FD312E] border-[#FD312E]'
                              : 'bg-white/80 border-gray-400'
                          }`}>
                            {selectedItemIds.has(item.id) && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Off-screen render for ZIP export */}
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: slot.size.w,
            height: slot.size.h,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <div ref={renderRef} style={{ width: slot.size.w, height: slot.size.h }}>
            {renderingSlide
              ? <GallerySlideTemplate imageSrc={slideSrc(renderingSlide.url, renderingSlide.data)} data={renderingSlide.data} layoutHint={renderingSlide.hint} />
              : renderingText
                ? <FeatureTextThumbnailTemplate state={renderingText.state} />
                : renderingItem && renderOffscreenTemplate(renderingItem)}
          </div>
        </div>

        {/* Gallery slide edit modal — preview + editable translated text blocks */}
        {modalSlideEntry && modalSlideEntry.data?.status === 'done' && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
            onClick={() => setModalSlide(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{ width: 'calc(100vw - 64px)', maxWidth: 1100, height: 'calc(100vh - 80px)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#FD312E] bg-[#FD312E]/10 w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                    {modalSlideIdx + 1}
                  </span>
                  <p className="font-lgei font-bold text-[15px] text-gray-900" style={{ lineHeight: '20px' }}>
                    {modelFromUrl(modalSlideEntry.item.mainUrl)}
                  </p>
                </div>
                <button
                  onClick={() => setModalSlide(null)}
                  className="px-5 py-2 rounded-full text-sm font-medium bg-[#FD312E] text-white hover:bg-[#E22825] transition-colors shrink-0"
                >
                  {t('Done')}
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden min-h-0">
                <div
                  className="shrink-0 bg-[#CBC8C2] flex flex-col items-center justify-center gap-3 p-6"
                  style={{ width: MODAL_PREVIEW_W + 48 }}
                >
                  <div className="relative shadow-xl overflow-hidden" style={{ width: MODAL_PREVIEW_W, height: modalPreviewH }}>
                    <div
                      style={{
                        width: slot.size.w,
                        height: slot.size.h,
                        transform: `scale(${modalPreviewScale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      <GallerySlideTemplate imageSrc={slideSrc(modalSlideEntry.url, modalSlideEntry.data)} data={modalSlideEntry.data} layoutHint={galleryLayoutHint(modalSlideEntry.item)} />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 self-center">{slot.size.w} × {slot.size.h} px</p>
                </div>

                <div className="flex-1 min-w-0 overflow-y-auto p-6 flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-lgei font-bold text-[14px] text-gray-900" style={{ lineHeight: '18px' }}>{t('Rewrite copy')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {modalSlideEntry.data.translatable
                          ? t('This card has text on a white background. Turn on Rewrite copy to cover it and type your own head/sub copy.')
                          : t('No text detected on this slide.')}
                      </p>
                    </div>
                    {modalSlideEntry.data.translatable && (
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        <span className="text-xs text-gray-500 whitespace-nowrap">{t('Rewrite copy')}</span>
                        <ShowToggle
                          checked={modalSlideEntry.data.rewriteOn ?? false}
                          onChange={(v) => setSlideRewriteOn(modalSlideEntry.item.id, modalSlideEntry.url, v)}
                        />
                      </div>
                    )}
                  </div>
                  {modalSlideEntry.data.translatable && (
                    <div className={`flex flex-col gap-5 ${modalSlideEntry.data.rewriteOn ? '' : 'opacity-40 pointer-events-none'}`}>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                          {t('Head copy')}
                        </span>
                        <textarea
                          value={modalSlideEntry.data.rewrite?.headCopy ?? ''}
                          onChange={e => updateSlideRewrite(modalSlideEntry.item.id, modalSlideEntry.url, { headCopy: e.target.value })}
                          rows={2}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FD312E] resize-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                          {t('Sub copy')}
                        </span>
                        <textarea
                          value={modalSlideEntry.data.rewrite?.subCopy ?? ''}
                          onChange={e => updateSlideRewrite(modalSlideEntry.item.id, modalSlideEntry.url, { subCopy: e.target.value })}
                          rows={3}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FD312E] resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {modalItem && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
            onClick={() => setModalItemId(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{ width: 'calc(100vw - 64px)', maxWidth: 1100, height: 'calc(100vh - 80px)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#FD312E] bg-[#FD312E]/10 w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                    {modalIdx + 1}
                  </span>
                  <p className="font-lgei font-bold text-[15px] text-gray-900" style={{ lineHeight: '20px' }}>
                    {getItemModelName(modalItem) || t('Edit Thumbnail')}
                  </p>
                </div>
                <button
                  onClick={() => setModalItemId(null)}
                  className="px-5 py-2 rounded-full text-sm font-medium bg-[#FD312E] text-white hover:bg-[#E22825] transition-colors shrink-0"
                >
                  {t('Done')}
                </button>
              </div>

              {/* Modal body: preview + editor */}
              <div className="flex flex-1 overflow-hidden min-h-0">
                <div
                  className="shrink-0 bg-[#CBC8C2] flex flex-col items-center justify-center gap-3 p-6"
                  style={{ width: MODAL_PREVIEW_W + 48 }}
                >
                  <div
                    className="relative shadow-xl overflow-hidden"
                    style={{ width: MODAL_PREVIEW_W, height: modalPreviewH }}
                  >
                    <div
                      style={{
                        width: slot.size.w,
                        height: slot.size.h,
                        transform: `scale(${modalPreviewScale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      {renderOffscreenTemplate(modalItem)}
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 self-center">{slot.size.w} × {slot.size.h} px</p>
                </div>

                <div className="flex-1 min-w-0 overflow-y-auto p-6 flex flex-col gap-5">
                  {renderItemEditorPanel(modalItem)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review crop — pass-through cards only (translated cards keep their
            measured mask geometry and are not croppable) */}
        {reviewCrop && (() => {
          const cropIt = items.find(i => i.id === reviewCrop.itemId);
          const cropD = cropIt?.gallerySlides?.[reviewCrop.url];
          if (!cropIt || !cropD) return null;
          const src = cropD.cropSource ?? getProxiedImageUrl(reviewCrop.url);
          return (
            <ImageCropModal
              imageSrc={src}
              aspectRatio={1}
              title={t('Crop')}
              minZoom={0.5}
              maxZoom={1.2}
              zoomStep={0.05}
              bgFill="#ffffff"
              initialCrop={cropD.cropState?.crop}
              // No saved crop yet → open at a framing that starts the user
              // with nothing clipped out of frame if at all avoidable.
              // Portrait/square already show the full image at zoom capped
              // to w/h (< 1 only shrinks further, never clips). Landscape at
              // zoom 1 ("cover") ALWAYS crops the sides by definition — there
              // is no zoom-1 framing that keeps a wider-than-tall image
              // entirely inside a 1:1 box — so landscape opens zoomed out to
              // 0.65 instead of the clipped 1.0 default (matches the Crop-type
              // pass-through preview's own default, see GallerySlideTemplate).
              initialZoom={cropD.cropState?.zoom ?? (
                cropD.imgW > cropD.imgH ? 0.65 : Math.min(1, cropD.imgW / Math.max(1, cropD.imgH))
              )}
              onCancel={() => setReviewCrop(null)}
              onConfirm={(cropped, cropState) => {
                const img = new Image();
                img.onload = () => {
                  setItems(prev => prev.map(x => x.id === cropIt.id
                    ? {
                        ...x,
                        gallerySlides: {
                          ...(x.gallerySlides ?? {}),
                          [reviewCrop.url]: { ...cropD, croppedUrl: cropped, cropSource: src, cropState, imgW: img.naturalWidth, imgH: img.naturalHeight },
                        },
                      }
                    : x));
                };
                img.src = cropped;
                setReviewCrop(null);
              }}
            />
          );
        })()}
        {renderTextCardModal()}
        {unsavedModal}
      </div>
    );
  }

  // ─── Phase 1: URL Input ───────────────────────────────────────────────────

  const validCount = urlEntries.filter(e => e.mainUrl.trim()).length;

  return (
    <div className="h-screen flex flex-col bg-[#f8f7f5] overflow-hidden">
      {/* hidden ruler for Promotion Period overflow detection */}
      <span
        ref={dateRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          fontFamily: 'var(--obs-font)',
          fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 400,
          whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none',
        }}
        aria-hidden
      />
      <LGHeader
        onBack={guardedOnBack}
        right={
          <div className="flex items-center gap-3">
            {saveForLater}
            <button
              onClick={handleNext}
              disabled={validCount === 0}
              className="flex items-center gap-2 bg-[#FD312E] hover:bg-[#E22825] text-white text-sm font-medium px-5 py-2 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span style={{ lineHeight: '20px' }}>{t('Next: Edit')}</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        }
      />

      <div className="flex-1 flex min-h-0">
        <NavRail active={railActive} onNavigate={guardedOnRailNavigate} onOpenDraft={onOpenDraft} />
        <div className="flex-1 flex flex-col min-h-0">
      <WizardBreadcrumb steps={wizardSteps} activeStep={phaseToStep('urls')} onStepClick={handleBreadcrumbClick} />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

          {/* Shared Promotion Config */}
          {isPromotion && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
              <div className="border-b border-gray-100 pb-3">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">{t('Shared Promotion Config')}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t('Applied to all items in this bulk session.')}</p>
              </div>

              {/* Promotion Image */}
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">{t('Promotion Image')}</p>
                  <p className="text-[10px] text-gray-400 mb-2" style={{ lineHeight: '14px' }}>
                    Recommended size: 360×260 — placed in the top-right of the template.
                  </p>
                  <button
                    onClick={() => promoFileRef.current?.click()}
                    className="px-3 py-2 text-xs font-medium border border-[#FD312E] rounded-full text-[#FD312E] hover:bg-[#FD312E] hover:text-white transition-colors bg-white"
                  >
                    {'Upload image'}
                  </button>
                  <input
                    ref={promoFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await readFileAsDataURL(file);
                      setPromoPendingSrc(url);
                      e.target.value = '';
                    }}
                  />
                </div>
                {/* Right: image preview — 120×87 (360:260), Edit Crop on hover */}
                <div className="shrink-0">
                  <div
                    className="relative overflow-hidden rounded-lg border border-gray-200 group bg-gray-100"
                    style={{ width: 120, height: 87 }}
                  >
                    <img
                      src={sharedPromo.promotionImage.url || '/thumbnail/promotion-image-example.png'}
                      alt="Promotion Image"
                      className="w-full h-full object-cover"
                    />
                    {sharedPromo.promotionImage.url && (
                      <div
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => setPromoReCropSrc(sharedPromo.promotionImage.source ?? sharedPromo.promotionImage.url)}
                      >
                        <span className="text-white text-[10px] font-medium">{t('Edit Crop')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Promotion Period */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">{t('Promotion Period')}</label>
                <input
                  type="text"
                  value={sharedPromo.dateRange}
                  onChange={e => {
                    const v = e.target.value;
                    const ruler = dateRulerRef.current;
                    if (ruler) {
                      ruler.textContent = v;
                      if (ruler.offsetWidth > DATE_MAX_W) {
                        setDateOverflow(true);
                        return;
                      }
                    }
                    setDateOverflow(false);
                    setSharedPromo(prev => ({ ...prev, dateRange: v }));
                  }}
                  placeholder={t('e.g. 2026. 11. 11 - 2026. 11. 20')}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                    dateOverflow ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#FD312E]'
                  }`}
                />
                {dateOverflow && (
                  <p className="text-xs text-red-500 mt-1">{t('Text exceeds the maximum width. No more characters can be added.')}</p>
                )}
              </div>
            </div>
          )}

          {/* Title + description */}
          <div>
            <h2 className="font-lgei font-bold text-[20px] text-gray-900 mb-1" style={{ lineHeight: '28px' }}>
              {t('Enter Product URLs ({count}/{max})').replace('{count}', String(urlEntries.length)).replace('{max}', String(MAX_ITEMS))}
            </h2>
            <p className="text-sm text-gray-500" style={{ lineHeight: '20px' }}>
              {t('Paste the LG.com product detail page URLs for the products you want to create cards for. You can add up to {max} URLs.').replace('{max}', String(MAX_ITEMS))}
              {isGwp && ' ' + t('Each row needs the main product URL and gift item URL.')}
              {isBundle && ' ' + t('Each row needs both product URLs for the bundle.')}
            </p>
          </div>

          {/* URL rows */}
          <div className="flex flex-col gap-2">
            {urlEntries.map((entry, idx) => (
              <div key={entry.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center shrink-0">{idx + 1}</span>

                  {/* Main URL input + its own trash (GWP/Bundle: clears field; single-URL: removes row) */}
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1 relative">
                      <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                      <input
                        type="url"
                        value={entry.mainUrl}
                        onChange={e => setEntry(entry.id, { mainUrl: e.target.value })}
                        placeholder={isGwp ? 'Product URL' : isBundle ? 'Product 1 URL' : 'https://www.lg.com/...'}
                        className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#FD312E] placeholder-gray-300"
                      />
                    </div>
                    <button
                      onClick={() => (isGwp || isBundle) ? setEntry(entry.id, { mainUrl: '' }) : removeEntry(entry.id)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* GWP gift URL + its own trash */}
                  {isGwp && (
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 relative">
                        <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                        <input
                          type="url"
                          value={entry.giftUrl}
                          onChange={e => setEntry(entry.id, { giftUrl: e.target.value })}
                          placeholder={t('Gift item URL')}
                          className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#FD312E] placeholder-gray-300"
                        />
                      </div>
                      <button
                        onClick={() => setEntry(entry.id, { giftUrl: '' })}
                        className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {/* Bundle product 2 URL + its own trash */}
                  {isBundle && (
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 relative">
                        <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                        <input
                          type="url"
                          value={entry.product2Url}
                          onChange={e => setEntry(entry.id, { product2Url: e.target.value })}
                          placeholder={t('Product 2 URL')}
                          className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#FD312E] placeholder-gray-300"
                        />
                      </div>
                      <button
                        onClick={() => setEntry(entry.id, { product2Url: '' })}
                        className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))}

            {/* Add URL button */}
            {urlEntries.length < MAX_ITEMS && (
              <button
                onClick={addOne}
                className="mt-1 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-colors"
              >
                <Plus size={15} />
                {t('Add {n} URLs').replace('{n}', '10')}
              </button>
            )}
          </div>
        </div>
      </div>
        </div>
      </div>
      {/* Promotion image crop modal */}
      {(promoPendingSrc !== null || promoReCropSrc !== null) && (
        <ImageCropModal
          imageSrc={promoPendingSrc ?? promoReCropSrc!}
          aspectRatio={360 / 260}
          title={t('Promotion Image')}
          minZoom={0.1}
          initialCrop={promoReCropSrc !== null ? sharedPromo.promotionImage.cropState?.crop : undefined}
          initialZoom={promoReCropSrc !== null ? sharedPromo.promotionImage.cropState?.zoom : undefined}
          onCancel={() => { setPromoPendingSrc(null); setPromoReCropSrc(null); }}
          onConfirm={(croppedDataUrl, cropState) => {
            setSharedPromo(prev => ({
              ...prev,
              promotionImage: {
                url: croppedDataUrl,
                source: promoPendingSrc ?? prev.promotionImage.source,
                cropState,
              },
            }));
            setPromoPendingSrc(null);
            setPromoReCropSrc(null);
          }}
        />
      )}

      {unsavedModal}
    </div>
  );
}
