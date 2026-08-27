import React, { useEffect, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { Download, Loader2, Upload, Trash2, Crop, Search, ImageIcon, AlignLeft, AlignRight } from 'lucide-react';
import { useT } from '../../i18n/LanguageContext';
import { preloadImagesToDataUrls } from '../../utils/imageUrlLoader';
import { saveBlob } from '../../utils/fileSaver';
import { getSlot, Orientation, ThumbnailType } from './thumbnailRegistry';
import { DefaultThumbnailTemplate } from './DefaultThumbnailTemplate';
import { GwpThumbnailTemplate, GiftCard } from './GwpThumbnailTemplate';
import { BundleThumbnailTemplate } from './BundleThumbnailTemplate';
import { PromotionThumbnailTemplate } from './PromotionThumbnailTemplate';
import {
  UspThumbnailTemplate, uspCapacity, noticeFits, boxLines,
  MAX_LINES, BENEFIT_MAX_LINES, USP_FONT, BOX_COPY_SIZE, BOX_COPY_LH, BOX_TEXT_W,
  USP_COPY_SIZE, USP_COPY_LH, USP_COPY_W_WITH_ICON, USP_COPY_W_NO_ICON,
} from './UspThumbnailTemplate';
import { FeatureImageThumbnailTemplate } from './FeatureImageThumbnailTemplate';
import { GalleryFeatureThumbnailTemplate } from './GalleryFeatureThumbnailTemplate';
import { FeatureTextThumbnailTemplate } from './FeatureTextThumbnailTemplate';
import { ShowToggle } from '../brandshop/bigPromoCommon';
import { ImageCropModal } from '../ImageCropModal';
import { ImageGalleryModal } from '../ImageGalleryModal';
import { scrapeProductImages, getProxiedImageUrl, ScrapedImage } from '../../services/imageScraperApi';
import { checkWhiteBackground } from '../../utils/nukkeeDetector';
import type {
  ThumbnailAllStates,
  CropImage,
  ThumbnailDefaultState,
  ThumbnailGwpState,
  ThumbnailBundleState,
  ThumbnailPromotionState,
  ThumbnailVoucherItem,
  ThumbnailUspState,
  ThumbnailUspItem,
  ThumbnailFeatureImageState,
  ThumbnailGalleryFeatureState,
  ThumbnailFeatureTextState,
} from './thumbnailTypes';
import { ThumbnailTemplate } from './ThumbnailTemplate';
import { useDraftSave } from '../../hooks/useDraftSave';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { SaveForLaterButton, SaveDraftModal } from '../SaveForLaterButton';
import { UnsavedChangesModal } from '../UnsavedChangesModal';
import { AppHeader } from '../AppHeader';
import { NavRail, type NavRailKey } from '../NavRail';
import type { DraftRecord } from '../../utils/draftStore';

interface Props {
  slotId: ThumbnailType;
  orientation: Orientation;
  onOrientationChange: (o: Orientation) => void;
  onBack: () => void;
  allStates: ThumbnailAllStates;
  onAllStatesChange: (states: ThumbnailAllStates) => void;
  /** Standalone (single) mode only: enables the "Save for Later" local draft
   *  button. Bulk mode embeds this editor per-item and must NOT pass this. */
  draftSave?: { initialDraftId?: string; initialTitle?: string };
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const PLACEHOLDER_TV      = '/thumbnail/default-product-placeholder.png';
const PLACEHOLDER_FRIDGE  = '/thumbnail/placeholder-fridge.png';
const PLACEHOLDER_WASHER  = '/thumbnail/placeholder-washer.png';
const PLACEHOLDER_DRYER   = '/thumbnail/placeholder-dryer.png';

// Scales a real destination box (px) down to fit inside the crop modal's 660×420
// canvas (with margin), preserving aspect — so the red crop box matches the real
// slot's shape exactly, not just react-easy-crop's own aspect-derived default.
function fitCropSize(realW: number, realH: number, maxW = 560, maxH = 360): { width: number; height: number } {
  const scale = Math.min(maxW / realW, maxH / realH);
  return { width: Math.round(realW * scale), height: Math.round(realH * scale) };
}
const PLACEHOLDER_SOUNDBAR = '/thumbnail/placeholder-soundbar.png';
const PLACEHOLDER_GIFT    = '/thumbnail/placeholder-gift.png';

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="border-b border-gray-100 pb-1.5 mb-3">
      <span className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">{title}</span>
    </div>
  );
}

function SectionLabelRow({ title, checked, onToggle }: { title: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-100 pb-1.5 mb-3 flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">{title}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className="relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none shrink-0"
        style={{ background: checked ? '#FD312E' : '#d1d5db' }}
      >
        <span
          className="inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <SectionLabel title={label} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E]"
      />
    </div>
  );
}

// ─── ImageSlotSection ─────────────────────────────────────────────────────────
// Reusable image slot: thumbnail + Edit Crop + Upload + optional Fetch URL.

interface ImageSlotSectionProps {
  label: string;
  /** Optional hint text shown below the label (e.g. "Recommended size: 360×260"). */
  hint?: string;
  /** Used as fallback for crop modal when no image is set. If undefined, upload is triggered instead. */
  placeholderSrc?: string;
  image: CropImage;
  onChange: (img: CropImage) => void;
  withFetch?: boolean;
  onFetchModelName?: (name: string) => void;
  onFetchProductName?: (name: string) => void;
  /** Batches modelName + productName into one onChange — prevents stale-closure overwrites. */
  onFetchData?: (data: { modelName?: string; productName?: string }) => void;
  /** Called with heading context + optional body copy when a gallery image is selected via Fetch. */
  onSelectContext?: (context: string, body?: string) => void;
  /** Figma Image layer aspect ratio (width/height). Controls both thumbnail display and crop modal ratio. Default 1. */
  aspectRatio?: number;
  /** Fixed crop-frame size (px, in the modal's 660×420 canvas) — pins the red box's
   *  absolute shape to the real destination slot instead of react-easy-crop's own
   *  aspect-derived default. See `fitCropSize`. */
  cropSize?: { width: number; height: number };
  /** For fields whose real aspect can drift (content-dependent slots, or a fixed
   *  wrong-aspect bug): a saved crop from before the aspect was tracked is treated as
   *  stale on re-open and refit fresh, instead of restoring a now-mismatched zoom/crop. */
  treatUnknownAspectAsStale?: boolean;
  /** Feature slots: pad a partially-covered image with its own edge colour instead of white. */
  autoEdgeFill?: boolean;
  /** When true, ImageGalleryModal only shows images with a white/near-white background (canvas pixel analysis). */
  whiteBackgroundOnly?: boolean;
  /** When true, ImageGalleryModal only shows lifestyle (non-nukkee) images. */
  lifestyleOnly?: boolean;
  /** Pre-fetched images from bulk scraping — shows a Browse button instead of the URL fetch input. */
  preloadedImages?: ScrapedImage[];
  /** When provided, the ref is set to the `openCrop` callback so external callers can trigger crop. */
  editCropTriggerRef?: React.MutableRefObject<(() => void) | null>;
  /** Placeholder text for the URL fetch input. Defaults to 'Paste LG.com product URL...' */
  urlPlaceholder?: string;
  /** When provided, renders a Show/Hide toggle inline with the section label instead of a separate row. */
  toggle?: { checked: boolean; onToggle: () => void };
  /** When true, only the label (+ toggle) row renders — the upload/crop body is hidden. */
  collapsed?: boolean;
}

function ImageSlotSection({
  label,
  hint,
  placeholderSrc,
  image,
  editCropTriggerRef,
  onChange,
  withFetch = false,
  onFetchModelName,
  onFetchProductName,
  onFetchData,
  toggle,
  collapsed = false,
  onSelectContext,
  aspectRatio = 1,
  cropSize,
  treatUnknownAspectAsStale = false,
  autoEdgeFill = false,
  whiteBackgroundOnly = false,
  lifestyleOnly = false,
  preloadedImages,
  urlPlaceholder,
}: ImageSlotSectionProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbImgRef = useRef<HTMLImageElement>(null);

  const [pageUrl, setPageUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [hidePrepopulated, setHidePrepopulated] = useState(false);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [pendingFromGallery, setPendingFromGallery] = useState(false);
  const [reCropSrc, setReCropSrc] = useState<string | null>(null);
  // Pre-analysed white-bg results keyed by raw image URL — populated as soon as scraping finishes
  const [whiteBgMap, setWhiteBgMap] = useState<Map<string, boolean>>(new Map());

  // Start background nukkee analysis immediately when images are scraped
  React.useEffect(() => {
    if ((!whiteBackgroundOnly && !lifestyleOnly) || scrapedImages.length === 0) return;
    let cancelled = false;
    setWhiteBgMap(new Map());
    scrapedImages.forEach((img) => {
      checkWhiteBackground(getProxiedImageUrl(img.url)).then((result) => {
        if (!cancelled) setWhiteBgMap((prev) => new Map(prev).set(img.url, result));
      });
    });
    return () => { cancelled = true; };
  }, [scrapedImages, whiteBackgroundOnly, lifestyleOnly]);

  const activeCropSrc = pendingSrc ?? reCropSrc;
  const isEditCrop = reCropSrc !== null && pendingSrc === null;

  // Thumbnail dimensions scaled from Figma Image layer ratio
  const BASE = 56;
  const thumbW = aspectRatio >= 1 ? Math.min(BASE * 2, Math.round(BASE * aspectRatio)) : Math.round(BASE * aspectRatio);
  const thumbH = aspectRatio >= 1 ? BASE : Math.min(Math.round(BASE * 1.5), Math.round(BASE / aspectRatio));

  const handleFetch = async () => {
    const url = pageUrl.trim();
    if (!url) return;
    try { new URL(url); } catch {
      setFetchError(t('Please enter a valid URL (e.g., https://)'));
      return;
    }
    setIsFetching(true);
    setFetchError(null);
    const result = await scrapeProductImages(url);
    setScrapedImages(result.images);
    setFetchError(result.error || null);
    setIsFetching(false);
    if (onFetchData) {
      if (result.modelName || result.productName)
        onFetchData({ modelName: result.modelName, productName: result.productName });
    } else {
      if (result.modelName) onFetchModelName?.(result.modelName);
      if (result.productName) onFetchProductName?.(result.productName);
    }
    if (result.images.length > 0) setShowGallery(true);
  };

  const openCrop = () => {
    if (!image.source) {
      fileInputRef.current?.click();
      return;
    }
    setReCropSrc(image.source);
  };

  // Keep the external trigger ref in sync so canvas overlays can call openCrop directly
  if (editCropTriggerRef) editCropTriggerRef.current = openCrop;

  const hasThumbnailSrc = !!(image.url || placeholderSrc);

  if (collapsed) {
    return (
      <div>
        {toggle ? (
          <SectionLabelRow title={label} checked={toggle.checked} onToggle={toggle.onToggle} />
        ) : (
          <SectionLabel title={label} />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Section label — shown once at the top */}
      {toggle ? (
        <SectionLabelRow title={label} checked={toggle.checked} onToggle={toggle.onToggle} />
      ) : (
        <SectionLabel title={label} />
      )}
      {hint && (
        <p className="text-[10px] text-gray-400 -mt-1 mb-2" style={{ lineHeight: '14px' }}>{hint}</p>
      )}

      {/* ── Preloaded images browse button (bulk edit) ────── */}
      {preloadedImages && preloadedImages.length > 0 && !hidePrepopulated && !showGallery && (
        <div className="mb-3">
          <button
            onClick={() => setShowGallery(true)}
            className="w-full flex items-center gap-2 border border-[#FD312E] text-[#FD312E] rounded-lg px-3 py-2 text-xs hover:bg-[#FD312E]/5 transition-colors"
          >
            <ImageIcon size={12} className="shrink-0" />
            <span className="truncate">
              {t('Change from imported images')}
            </span>
          </button>
        </div>
      )}

      {/* ── Optional Fetch URL (single-edit, no preloaded) ── */}
      {(!preloadedImages || hidePrepopulated) && withFetch && (
        <div className="mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              placeholder={urlPlaceholder ?? t('Paste LG.com product URL...')}
              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E]"
            />
            <button
              onClick={handleFetch}
              disabled={isFetching || !pageUrl.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#FD312E] rounded-lg hover:bg-[#E22825] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {t('Import')}
            </button>
          </div>
          {fetchError && <p className="text-xs text-red-500 mt-1.5">{fetchError}</p>}
          {scrapedImages.length > 0 && !showGallery && (
            <button
              onClick={() => setShowGallery(true)}
              className="w-full flex items-center gap-2 border border-[#FD312E] text-[#FD312E] rounded-lg px-3 py-2 text-xs hover:bg-[#FD312E]/5 transition-colors mt-2"
            >
              <ImageIcon size={12} className="shrink-0" />
              <span className="truncate">
                {t('Change from imported images')}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── Image thumbnail + controls ─────────────────────── */}
      <div className="flex items-center gap-2">
        <div
          className="relative group shrink-0 rounded-lg overflow-hidden bg-white border border-gray-200 cursor-pointer"
          style={{ width: thumbW, height: thumbH }}
          onClick={openCrop}
        >
          {hasThumbnailSrc ? (
            <img
              ref={thumbImgRef}
              src={image.url ?? placeholderSrc}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={20} className="text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity">
            <Crop size={12} className="text-white" />
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          <button
            onClick={openCrop}
            className="w-full flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors bg-white"
          >
            <Crop size={13} className="shrink-0" />
            {t('Edit Crop')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors bg-white"
          >
            <Upload size={13} className="shrink-0" />
            {t('Upload image')}
          </button>
        </div>
      </div>

      {image.url && (
        <button
          onClick={() => {
            onChange({ url: null, source: null });
            setScrapedImages([]);
            setPageUrl('');
            setShowGallery(false);
            setFetchError(null);
            setHidePrepopulated(true);
          }}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 border border-red-100 rounded-lg py-1.5 hover:bg-red-50 hover:text-red-500 transition-colors mt-2"
        >
          <Trash2 size={11} />
          {t('Remove image')}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const dataUrl = await readFileAsDataURL(file);
          setPendingSrc(dataUrl);
          setPendingFromGallery(false);
          e.target.value = '';
        }}
      />

      {/* Gallery modal */}
      {showGallery && (
        <ImageGalleryModal
          images={(!hidePrepopulated && preloadedImages) ? preloadedImages : scrapedImages}
          isLoading={false}
          error={null}
          whiteBackgroundOnly={whiteBackgroundOnly}
          lifestyleOnly={lifestyleOnly}
          precomputedWhiteBg={whiteBgMap}
          onSelect={(src) => {
            setShowGallery(false);
            setPendingSrc(getProxiedImageUrl(src.url));
            setPendingFromGallery(true);
            if (src.context) onSelectContext?.(src.context, src.body);
          }}
          onCancel={() => setShowGallery(false)}
        />
      )}

      {/* Crop modal */}
      {activeCropSrc && (
        <ImageCropModal
          imageSrc={activeCropSrc}
          title={label}
          aspectRatio={aspectRatio}
          cropSize={cropSize}
          minZoom={0.2}
          bgFill="#ffffff"
          initialCrop={isEditCrop ? image.cropState?.crop : undefined}
          initialZoom={isEditCrop ? image.cropState?.zoom : undefined}
          initialAspect={isEditCrop ? image.cropState?.aspect : undefined}
          treatUnknownAspectAsStale={isEditCrop && treatUnknownAspectAsStale}
          autoEdgeFill={autoEdgeFill}
          autoCropProduct={whiteBackgroundOnly && pendingFromGallery && !isEditCrop}
          onConfirm={(croppedUrl, cropState) => {
            onChange({ url: croppedUrl, source: activeCropSrc!, cropState });
            setPendingSrc(null);
            setReCropSrc(null);
          }}
          onCancel={() => {
            setPendingSrc(null);
            setReCropSrc(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function SlotDivider() {
  return <div className="border-t border-gray-200 -mx-5 px-5" />;
}

// ─── Editor panels ────────────────────────────────────────────────────────────

export function DefaultEditorPanel({
  state,
  onChange,
  preloadedImages,
}: {
  state: ThumbnailDefaultState;
  onChange: (s: ThumbnailDefaultState) => void;
  preloadedImages?: ScrapedImage[];
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      <ImageSlotSection
        label={t('Product Image')}
        placeholderSrc={PLACEHOLDER_TV}
        image={state.productImage}
        onChange={(img) => onChange({ ...state, productImage: img })}
        withFetch
        whiteBackgroundOnly
        onFetchModelName={(name) => onChange({ ...state, modelName: name })}
        preloadedImages={preloadedImages}
      />
      <TextInput
        label={t('Model Name')}
        value={state.modelName}
        onChange={(v) => onChange({ ...state, modelName: v })}
        placeholder={t('e.g. OLED65G56LS')}
      />
    </div>
  );
}

export function GwpEditorPanel({
  state,
  onChange,
  orientation,
  preloadedImages,
  preloadedImagesGift,
}: {
  state: ThumbnailGwpState;
  onChange: (s: ThumbnailGwpState) => void;
  orientation: Orientation;
  preloadedImages?: ScrapedImage[];
  preloadedImagesGift?: ScrapedImage[];
}) {
  const t = useT();
  const isH = orientation === 'horizontal';
  const productPlaceholder = isH ? PLACEHOLDER_TV : PLACEHOLDER_FRIDGE;

  // H's product slot is `flex: 1 0 0` in a column alongside the GiftCard, so its real
  // height = 780 (content column) − GiftCard's actual rendered height − 80 (gap). The
  // GiftCard's height is TEXT-CONTENT-DEPENDENT (title/name/model line count), so a
  // static constant drifts as soon as the user's copy differs from the placeholder —
  // measure the live GiftCard (same component + same props as the real template) via a
  // hidden instance instead. V's fridge slot has an explicit fixed height (800) and a
  // GiftCard width that's NOT content-dependent (fixed copyWidth), so it needs no measuring.
  const giftCardRef = useRef<HTMLDivElement>(null);
  const [giftCardH, setGiftCardH] = useState<number | null>(null);
  React.useLayoutEffect(() => {
    if (isH && giftCardRef.current) setGiftCardH(giftCardRef.current.getBoundingClientRect().height);
  }, [isH, state.freeGiftText, state.giftName, state.giftModelName, state.showGiftModelName]);

  const productReal = isH
    ? { w: 1060, h: Math.max(80, 780 - (giftCardH ?? 244) - 80) }
    : { w: 506, h: 800 };
  const productAspect = productReal.w / productReal.h;
  const productCropSize = fitCropSize(productReal.w, productReal.h);
  return (
    <div className="flex flex-col gap-5">
      {isH && (
        <div style={{ position: 'fixed', top: -9999, left: -9999, fontFamily: 'var(--obs-font)', visibility: 'hidden', pointerEvents: 'none' }} aria-hidden>
          <div ref={giftCardRef}>
            <GiftCard
              giftImage={state.giftImage.url}
              freeGiftText={state.freeGiftText}
              giftName={state.giftName}
              giftModelName={state.giftModelName}
              showGiftModelName={state.showGiftModelName}
              copyWidth={320}
              paddingY={30}
              plusSide="top"
            />
          </div>
        </div>
      )}
      <ImageSlotSection
        label={t('Product Image')}
        placeholderSrc={productPlaceholder}
        image={state.productImage}
        onChange={(img) => onChange({ ...state, productImage: img })}
        withFetch
        whiteBackgroundOnly
        onFetchModelName={(name) => onChange({ ...state, modelName: name })}
        aspectRatio={productAspect}
        cropSize={productCropSize}
        treatUnknownAspectAsStale
        preloadedImages={preloadedImages}
        urlPlaceholder="Main product URL"
      />
      <TextInput
        label={t('Model Name')}
        value={state.modelName}
        onChange={(v) => onChange({ ...state, modelName: v })}
        placeholder={t('e.g. GSLV80PZXF')}
      />
      <SlotDivider />
      <ImageSlotSection
        label={t('Gift Item Image')}
        placeholderSrc={PLACEHOLDER_GIFT}
        image={state.giftImage}
        onChange={(img) => onChange({ ...state, giftImage: img })}
        withFetch
        onFetchData={({ modelName, productName }) =>
          onChange({
            ...state,
            ...(modelName !== undefined ? { giftModelName: modelName } : {}),
            ...(productName !== undefined ? { giftName: productName } : {}),
          })
        }
        aspectRatio={1}
        whiteBackgroundOnly
        preloadedImages={preloadedImagesGift}
        urlPlaceholder="Gift item URL"
      />
      <TextInput
        label={t('Title')}
        value={state.freeGiftText ?? ''}
        onChange={(v) => onChange({ ...state, freeGiftText: v })}
        placeholder={t('e.g. Free Gift')}
      />
      <TextInput
        label={t('Gift Name')}
        value={state.giftName}
        onChange={(v) => onChange({ ...state, giftName: v })}
        placeholder={t('e.g. Refrigerator Water Filter')}
      />
      <div>
        <SectionLabelRow
          title={t('Gift Model Name')}
          checked={state.showGiftModelName}
          onToggle={() => onChange({ ...state, showGiftModelName: !state.showGiftModelName })}
        />
        {state.showGiftModelName && (
          <input
            type="text"
            value={state.giftModelName}
            onChange={(e) => onChange({ ...state, giftModelName: e.target.value })}
            placeholder={t('e.g. ADQ74793513')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E]"
          />
        )}
      </div>
    </div>
  );
}

export function BundleEditorPanel({
  state,
  onChange,
  orientation,
  preloadedImages,
  preloadedImages2,
}: {
  state: ThumbnailBundleState;
  onChange: (s: ThumbnailBundleState) => void;
  orientation: Orientation;
  preloadedImages?: ScrapedImage[];
  preloadedImages2?: ScrapedImage[];
}) {
  const t = useT();
  const isV = orientation === 'vertical';
  const p1Placeholder = isV ? PLACEHOLDER_WASHER : PLACEHOLDER_TV;
  const p2Placeholder = isV ? PLACEHOLDER_DRYER : PLACEHOLDER_SOUNDBAR;
  // Real destination boxes in BundleThumbnailTemplate:
  // H: column of TV(flex-1) + gap40 + plus(72) + gap40 + soundbar(180) inside a
  //    780-tall (800 − paddingTop20) × 1060-wide column → TV = 1060×448.
  // V: washer/dryer are both explicit fixed 454×800 slots.
  const p1Real = isV ? { w: 454, h: 800 } : { w: 1060, h: 448 };
  const p2Real = isV ? { w: 454, h: 800 } : { w: 1060, h: 180 };
  const p1Aspect = p1Real.w / p1Real.h;
  const p2Aspect = p2Real.w / p2Real.h;
  return (
    <div className="flex flex-col gap-5">
      <ImageSlotSection
        label={t('Product 1')}
        placeholderSrc={p1Placeholder}
        image={state.product1Image}
        onChange={(img) => onChange({ ...state, product1Image: img })}
        withFetch
        whiteBackgroundOnly
        onFetchModelName={(name) => onChange({ ...state, modelName1: name })}
        aspectRatio={p1Aspect}
        cropSize={fitCropSize(p1Real.w, p1Real.h)}
        treatUnknownAspectAsStale
        preloadedImages={preloadedImages}
        urlPlaceholder="Product 1 URL"
      />
      <TextInput
        label={t('Model Name 1')}
        value={state.modelName1}
        onChange={(v) => onChange({ ...state, modelName1: v })}
        placeholder={t('FDC309W')}
      />
      <SlotDivider />
      <ImageSlotSection
        label={t('Product 2')}
        placeholderSrc={p2Placeholder}
        image={state.product2Image}
        onChange={(img) => onChange({ ...state, product2Image: img })}
        withFetch
        whiteBackgroundOnly
        onFetchModelName={(name) => onChange({ ...state, modelName2: name })}
        aspectRatio={p2Aspect}
        cropSize={fitCropSize(p2Real.w, p2Real.h)}
        treatUnknownAspectAsStale
        preloadedImages={preloadedImages2}
        urlPlaceholder="Product 2 URL"
      />
      <TextInput
        label={t('Model Name 2')}
        value={state.modelName2}
        onChange={(v) => onChange({ ...state, modelName2: v })}
        placeholder={t('F4Y913BCTA1')}
      />
    </div>
  );
}

export function PromotionEditorPanel({
  state,
  onChange,
  preloadedImages,
  promotionImageCropTriggerRef,
}: {
  state: ThumbnailPromotionState;
  onChange: (s: ThumbnailPromotionState) => void;
  preloadedImages?: ScrapedImage[];
  promotionImageCropTriggerRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const t = useT();
  const dateRulerRef = useRef<HTMLSpanElement>(null);
  const [dateOverflow, setDateOverflow] = useState(false);
  // bar 360px - padding 20px×2 = 320px content area (font: LGEI Headline 30px/400)
  const DATE_MAX_W = 320;

  // Voucher text fields — same "block further typing at the template's actual
  // render bounds" approach as dateRange, instead of letting the template
  // silently truncate with an ellipsis. Title/value are single-line (nowrap +
  // ellipsis in the template); subCopy wraps up to 2 lines (WebkitLineClamp).
  const voucherTitleRulerRef = useRef<HTMLSpanElement>(null);
  const voucherValueRulerRef = useRef<HTMLSpanElement>(null);
  const voucherSubCopyRulerRef = useRef<HTMLDivElement>(null);
  const VOUCHER_TITLE_MAX_W = 300; // ticket 360px - padding 30px×2
  const VOUCHER_VALUE_MAX_W = 300; // shares the same 300px group budget as subCopy
  const VOUCHER_SUBCOPY_MAX_LINES = 2;
  const VOUCHER_SUBCOPY_LINE_H = 30 * 0.9; // fontSize × lineHeight

  function tryUpdateVoucherTitle(i: number, v: string) {
    const ruler = voucherTitleRulerRef.current;
    if (ruler) {
      ruler.textContent = v || ' ';
      if (ruler.offsetWidth > VOUCHER_TITLE_MAX_W) return;
    }
    updateVoucher(i, { title: v });
  }

  function tryUpdateVoucherValue(i: number, v: string) {
    const ruler = voucherValueRulerRef.current;
    if (ruler) {
      ruler.textContent = v || ' ';
      if (ruler.offsetWidth > VOUCHER_VALUE_MAX_W) return;
    }
    updateVoucher(i, { value: v });
  }

  function tryUpdateVoucherSubCopy(i: number, v: string) {
    const ruler = voucherSubCopyRulerRef.current;
    if (ruler) {
      ruler.textContent = v || ' ';
      const lines = Math.round(ruler.getBoundingClientRect().height / VOUCHER_SUBCOPY_LINE_H);
      if (lines > VOUCHER_SUBCOPY_MAX_LINES) return;
    }
    updateVoucher(i, { subCopy: v });
  }

  function handleDateChange(v: string) {
    const ruler = dateRulerRef.current;
    if (ruler) {
      ruler.textContent = v;
      if (ruler.offsetWidth > DATE_MAX_W) {
        setDateOverflow(true);
        return;
      }
    }
    setDateOverflow(false);
    onChange({ ...state, dateRange: v });
  }

  function updateVoucher(i: number, patch: Partial<ThumbnailVoucherItem>) {
    const updated = [...state.vouchers];
    updated[i] = { ...updated[i], ...patch };
    onChange({ ...state, vouchers: updated });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* hidden ruler for dateRange overflow detection */}
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
      {/* hidden rulers for voucher text overflow detection (title/value single-line, subCopy 2-line wrap) */}
      <span
        ref={voucherTitleRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          fontFamily: 'var(--obs-font)',
          fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 600,
          whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none',
        }}
        aria-hidden
      />
      <span
        ref={voucherValueRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          fontFamily: 'var(--obs-font)',
          fontSize: 80, letterSpacing: 'var(--obs-tracking)', fontWeight: 600,
          whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none',
        }}
        aria-hidden
      />
      <div
        ref={voucherSubCopyRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999, width: 300,
          fontFamily: 'var(--obs-font)',
          fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, lineHeight: 0.9,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          visibility: 'hidden', pointerEvents: 'none',
        }}
        aria-hidden
      />
      <ImageSlotSection
        label={t('Product Image')}
        placeholderSrc={PLACEHOLDER_TV}
        image={state.productImage}
        onChange={(img) => onChange({ ...state, productImage: img })}
        withFetch
        whiteBackgroundOnly
        onFetchModelName={(name) => onChange({ ...state, modelName: name })}
        aspectRatio={660 / 800}
        preloadedImages={preloadedImages}
      />
      <TextInput
        label={t('Model Name')}
        value={state.modelName}
        onChange={(v) => onChange({ ...state, modelName: v })}
        placeholder={t('e.g. OLED65G56LS')}
      />
      <SlotDivider />
      <ImageSlotSection
        label={t('Promotion Image')}
        hint="Recommended size: 360×260"
        placeholderSrc="/thumbnail/promotion-kv.png"
        image={state.promotionImage}
        onChange={(img) => onChange({ ...state, promotionImage: img })}
        aspectRatio={360 / 260}
        editCropTriggerRef={promotionImageCropTriggerRef}
      />
      <div>
        <SectionLabel title={t('Promotion Period')} />
        <input
          type="text"
          value={state.dateRange}
          onChange={(e) => handleDateChange(e.target.value)}
          placeholder={t('e.g. 2026. 11. 11 - 2026. 11. 20')}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
            dateOverflow ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#FD312E]'
          }`}
        />
        {dateOverflow && (
          <p className="text-xs text-red-500 mt-1">{t('Text exceeds the maximum width. No more characters can be added.')}</p>
        )}
      </div>
      <SlotDivider />
      <div>
        <SectionLabel title={t('Vouchers (0–4)')} />
        {/* Count selector — tabs 0–4 */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => onChange({ ...state, voucherCount: n })}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                  state.voucherCount === n
                    ? 'bg-[#FD312E] text-white'
                    : 'border border-gray-200 text-gray-600 hover:border-[#FD312E]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: state.voucherCount }, (_, i) => {
            const ph = [
              { title: t('Sale Price'), value: '$000',  subCopy: '' },
              { title: t('Voucher'),    value: '00%',   subCopy: t('Up to') },
              { title: t('Voucher'),    value: '00%',   subCopy: t('for every purchase') },
              { title: t('Sale Price'), value: '$000',  subCopy: '' },
            ][i] ?? { title: t('Voucher'), value: '00%', subCopy: t('Sub copy') };
            return (
            <div key={state.vouchers[i].id} className="border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-2">
              <p className="text-xs font-medium text-gray-500">{t('Voucher {n}').replace('{n}', String(i + 1))}</p>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">{t('Title')}</label>
                  <ShowToggle
                    checked={state.vouchers[i].showTitle !== false}
                    onChange={(v) => updateVoucher(i, { showTitle: v })}
                  />
                </div>
                <input
                  type="text"
                  value={state.vouchers[i].title}
                  onChange={(e) => tryUpdateVoucherTitle(i, e.target.value)}
                  disabled={state.vouchers[i].showTitle === false}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#FD312E] disabled:opacity-40"
                  placeholder={ph.title}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">{t('Sub Copy Position')}</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                  <button
                    onClick={() => updateVoucher(i, { subCopyPosition: 'left' })}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 transition-colors ${
                      state.vouchers[i].subCopyPosition === 'left'
                        ? 'bg-[#FD312E] text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <AlignLeft size={11} />{t('Left')}
                  </button>
                  <button
                    onClick={() => updateVoucher(i, { subCopyPosition: 'right' })}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 transition-colors ${
                      state.vouchers[i].subCopyPosition === 'right'
                        ? 'bg-[#FD312E] text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <AlignRight size={11} />{t('Right')}
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">{t('Discount / Price')}</label>
                  <ShowToggle
                    checked={state.vouchers[i].showValue !== false}
                    onChange={(v) => updateVoucher(i, { showValue: v })}
                  />
                </div>
                <input
                  type="text"
                  value={state.vouchers[i].value}
                  onChange={(e) => tryUpdateVoucherValue(i, e.target.value)}
                  disabled={state.vouchers[i].showValue === false}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#FD312E] disabled:opacity-40"
                  placeholder={ph.value}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">{t('Sub copy')}</label>
                  <ShowToggle
                    checked={state.vouchers[i].showSubCopy !== false}
                    onChange={(v) => updateVoucher(i, { showSubCopy: v })}
                  />
                </div>
                <textarea
                  value={state.vouchers[i].subCopy}
                  onChange={(e) => tryUpdateVoucherSubCopy(i, e.target.value)}
                  disabled={state.vouchers[i].showSubCopy === false}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#FD312E] resize-none disabled:opacity-40"
                  placeholder={ph.subCopy || t('Sub copy')}
                  rows={2}
                />
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function UspEditorPanel({
  state,
  onChange,
  preloadedImages,
}: {
  state: ThumbnailUspState;
  onChange: (s: ThumbnailUspState) => void;
  preloadedImages?: ScrapedImage[];
}) {
  const t = useT();
  // Counts above these would overflow the fixed-height right column — the
  // buttons for them are disabled and a warning replaces silent clipping.
  const { maxBenefits, maxUsps } = uspCapacity(state);

  // Korean/Japanese/etc. IME composition bypasses a controlled input's normal
  // value enforcement — React can't stop the browser's in-progress composed
  // text mid-syllable, so blocking via early-return here would just desync
  // the field. While composing we let every update through, then settle back
  // onto the MAX_LINES budget (trimming if needed) once composition ends.
  const composingRef = useRef(false);

  // Line-count guards measure against a HIDDEN, REAL DOM ELEMENT (styled
  // exactly like the box these cards render) instead of canvas measureText.
  // Canvas measureText doesn't reliably honor LGEI Headline's `unicode-range`
  // subsetting (fonts.css) — it has no Hangul glyphs, so real text layout
  // correctly falls through to a CJK fallback font per Korean character, but
  // canvas kept mismeasuring those runs against LGEI's own (wrong) metrics,
  // which is what let boundary characters through or rejected ones that
  // would have fit. Reading the browser's own layout via
  // getBoundingClientRect sidesteps that entirely — it always matches.
  const boxRulerRef = useRef<HTMLDivElement>(null);   // Notice + Benefit (shared: same font/width)
  const uspRulerRef = useRef<HTMLDivElement>(null);   // USP copy (width toggles with showImage)

  function domLines(el: HTMLDivElement | null, text: string, fontSize: number, lineHeight: number): number {
    if (text.trim() === '') return 0;
    if (!el) return boxLines(text); // canvas fallback, should not normally happen
    el.textContent = text;
    const h = el.getBoundingClientRect().height;
    return Math.max(1, Math.round(h / (fontSize * lineHeight)));
  }
  function noticeLines(v: string): number {
    return domLines(boxRulerRef.current, v, BOX_COPY_SIZE, BOX_COPY_LH);
  }
  function benefitLines(v: string): number {
    return domLines(boxRulerRef.current, v, BOX_COPY_SIZE, BOX_COPY_LH);
  }
  function uspLines(v: string, showImage: boolean): number {
    const el = uspRulerRef.current;
    if (el) el.style.width = `${showImage ? USP_COPY_W_WITH_ICON : USP_COPY_W_NO_ICON}px`;
    return domLines(el, v, USP_COPY_SIZE, USP_COPY_LH);
  }
  /** Greedily keeps whole characters while the DOM-measured line count still fits. */
  function domTruncate(el: HTMLDivElement | null, text: string, fontSize: number, lineHeight: number, maxLines: number): string {
    if (!el) return text;
    let result = '';
    for (const ch of text.trim()) {
      const candidate = result + ch;
      if (domLines(el, candidate, fontSize, lineHeight) > maxLines) break;
      result = candidate;
    }
    return result.trimEnd();
  }

  // Notice / benefit / USP copy each cap at their own max rendered lines —
  // block the keystroke that would spill onto the next line (measured
  // exactly as the template wraps it) instead of clipping silently.
  function setNotice(v: string) {
    if (!composingRef.current && noticeLines(v) > MAX_LINES) return;
    onChange({ ...state, notice: v });
  }

  function updateBenefit(i: number, v: string) {
    if (!composingRef.current && benefitLines(v) > BENEFIT_MAX_LINES) return;
    const updated = [...state.benefits];
    updated[i] = v;
    onChange({ ...state, benefits: updated });
  }

  function updateUsp(i: number, patch: Partial<ThumbnailUspItem>) {
    const updated = [...state.usps];
    const next = { ...updated[i], ...patch };
    if (!composingRef.current && patch.copy !== undefined && uspLines(next.copy, next.showImage ?? true) > MAX_LINES) return;
    updated[i] = next;
    onChange({ ...state, usps: updated });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hidden rulers — real DOM text layout for line-count guards, see domLines above */}
      <div ref={boxRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: BOX_TEXT_W, fontSize: BOX_COPY_SIZE, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, lineHeight: BOX_COPY_LH, fontFamily: USP_FONT, textAlign: 'center', whiteSpace: 'pre-wrap', wordBreak: 'break-word', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={uspRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: USP_COPY_W_WITH_ICON, fontSize: USP_COPY_SIZE, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, lineHeight: USP_COPY_LH, fontFamily: USP_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <ImageSlotSection
        label={t('Product Image')}
        placeholderSrc={PLACEHOLDER_TV}
        image={state.productImage}
        onChange={(img) => onChange({ ...state, productImage: img })}
        withFetch
        whiteBackgroundOnly
        onFetchModelName={(name) => onChange({ ...state, modelName: name })}
        aspectRatio={660 / 800}
        preloadedImages={preloadedImages}
      />
      <TextInput
        label={t('Product Name')}
        value={state.modelName}
        onChange={(v) => onChange({ ...state, modelName: v })}
        placeholder={t('e.g. 45" LG UltraGear™ OLED Gaming Monitor, 800R Curve')}
      />
      <SlotDivider />
      <div>
        <div className="flex items-center justify-between mb-1">
          <SectionLabel title={t('Notice')} />
          <ShowToggle
            checked={state.showNotice}
            onChange={(v) => onChange({ ...state, showNotice: v })}
            disabled={!state.showNotice && !noticeFits(state)}
          />
        </div>
        <input
          type="text"
          value={state.notice}
          onChange={(e) => setNotice(e.target.value)}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={(e) => {
            composingRef.current = false;
            const v = e.currentTarget.value;
            setNotice(noticeLines(v) > MAX_LINES ? domTruncate(boxRulerRef.current, v, BOX_COPY_SIZE, BOX_COPY_LH, MAX_LINES) : v);
          }}
          disabled={!state.showNotice}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E] disabled:opacity-40"
          placeholder={t('e.g. Installation NOT included')}
        />
      </div>
      <SlotDivider />
      <div>
        <SectionLabel title={t('Benefits (0–4)')} />
        <div className="flex gap-1 mb-1">
          {[0, 1, 2, 3, 4].map((n) => {
            const blocked = n > maxBenefits;
            return (
              <button
                key={n}
                onClick={() => onChange({ ...state, benefitCount: n })}
                disabled={blocked}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                  state.benefitCount === n
                    ? 'bg-[#FD312E] text-white'
                    : blocked
                      ? 'border border-gray-100 text-gray-300 cursor-not-allowed'
                      : 'border border-gray-200 text-gray-600 hover:border-[#FD312E]'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {Array.from({ length: state.benefitCount }, (_, i) => (
            <input
              key={i}
              type="text"
              value={state.benefits[i] ?? ''}
              onChange={(e) => updateBenefit(i, e.target.value)}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={(e) => {
                composingRef.current = false;
                const v = e.currentTarget.value;
                updateBenefit(i, benefitLines(v) > BENEFIT_MAX_LINES ? domTruncate(boxRulerRef.current, v, BOX_COPY_SIZE, BOX_COPY_LH, BENEFIT_MAX_LINES) : v);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E]"
              placeholder={t('Benefit {n}').replace('{n}', String(i + 1))}
            />
          ))}
        </div>
      </div>
      <SlotDivider />
      <div>
        <SectionLabel title={t('USPs (0–4)')} />
        <div className="flex gap-1 mb-1">
          {[0, 1, 2, 3, 4].map((n) => {
            const blocked = n > maxUsps;
            return (
              <button
                key={n}
                onClick={() => onChange({ ...state, uspCount: n })}
                disabled={blocked}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                  state.uspCount === n
                    ? 'bg-[#FD312E] text-white'
                    : blocked
                      ? 'border border-gray-100 text-gray-300 cursor-not-allowed'
                      : 'border border-gray-200 text-gray-600 hover:border-[#FD312E]'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {Array.from({ length: state.uspCount }, (_, i) => (
            <div key={state.usps[i].id} className="border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-2">
              <p className="text-xs font-medium text-gray-500">{t('USP {n}').replace('{n}', String(i + 1))}</p>
              <ImageSlotSection
                label={t('Image')}
                toggle={{
                  checked: state.usps[i].showImage ?? true,
                  onToggle: () => updateUsp(i, { showImage: !(state.usps[i].showImage ?? true) }),
                }}
                collapsed={!(state.usps[i].showImage ?? true)}
                placeholderSrc={PLACEHOLDER_GIFT}
                image={state.usps[i].image}
                onChange={(img) => updateUsp(i, { image: img })}
                onSelectContext={(context) => {
                  if (!context) return;
                  const showImage = state.usps[i].showImage ?? true;
                  if (uspRulerRef.current) uspRulerRef.current.style.width = `${showImage ? USP_COPY_W_WITH_ICON : USP_COPY_W_NO_ICON}px`;
                  updateUsp(i, { copy: domTruncate(uspRulerRef.current, context, USP_COPY_SIZE, USP_COPY_LH, MAX_LINES) });
                }}
                aspectRatio={1}
                cropSize={fitCropSize(120, 120)}
                treatUnknownAspectAsStale
                preloadedImages={preloadedImages}
                lifestyleOnly
              />
              <div>
                <label className="text-xs text-gray-400 mb-1 block">{t('Copy')}</label>
                <textarea
                  value={state.usps[i].copy}
                  onChange={(e) => updateUsp(i, { copy: e.target.value })}
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={(e) => {
                    composingRef.current = false;
                    const v = e.currentTarget.value;
                    const showImage = state.usps[i].showImage ?? true;
                    updateUsp(i, { copy: uspLines(v, showImage) > MAX_LINES ? domTruncate(uspRulerRef.current, v, USP_COPY_SIZE, USP_COPY_LH, MAX_LINES) : v });
                  }}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#FD312E] resize-none"
                  placeholder={t('e.g. CES 2026 Award winner')}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeatureImageEditorPanel({
  state,
  onChange,
  preloadedImages,
}: {
  state: ThumbnailFeatureImageState;
  onChange: (s: ThumbnailFeatureImageState) => void;
  preloadedImages?: ScrapedImage[];
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      <ImageSlotSection
        label={t('Feature Image')}
        image={state.featureImage}
        onChange={(img) => onChange({ ...state, featureImage: img })}
        withFetch
        lifestyleOnly
        autoEdgeFill
        onFetchModelName={(name) => onChange({ ...state, modelName: name })}
        aspectRatio={1}
        preloadedImages={preloadedImages}
      />
      <TextInput
        label={t('Model Name')}
        value={state.modelName}
        onChange={(v) => onChange({ ...state, modelName: v })}
        placeholder={t('e.g. OLED65G56LS')}
      />
    </div>
  );
}

export function GalleryFeatureEditorPanel({
  state,
  onChange,
  preloadedImages,
}: {
  state: ThumbnailGalleryFeatureState;
  onChange: (s: ThumbnailGalleryFeatureState) => void;
  preloadedImages?: ScrapedImage[];
}) {
  const t = useT();
  const handleSelectContext = React.useCallback((context: string, body?: string) => {
    const update: Partial<ThumbnailGalleryFeatureState> = {};
    if (context) update.headingText = context;
    // Always update bodyText: set scraped value or clear to empty so user knows to fill it in
    update.bodyText = body ?? '';
    onChange({ ...state, ...update });
  }, [onChange, state]);

  return (
    <div className="flex flex-col gap-5">
      <ImageSlotSection
        label={t('Feature Image')}
        image={state.featureImage}
        onChange={(img) => onChange({ ...state, featureImage: img })}
        withFetch
        lifestyleOnly
        autoEdgeFill
        aspectRatio={1020 / 698}
        onSelectContext={handleSelectContext}
        preloadedImages={preloadedImages}
      />
      <div>
        <SectionLabel title={t('Title')} />
        <input
          type="text"
          value={state.headingText}
          onChange={(e) => onChange({ ...state, headingText: e.target.value })}
          placeholder={t('e.g. Upgraded for smarter, more powerful processing')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E]"
        />
      </div>
      <div>
        <SectionLabel title={t('Body Text')} />
        <textarea
          value={state.bodyText ?? ''}
          onChange={(e) => onChange({ ...state, bodyText: e.target.value })}
          placeholder={t('e.g. The alpha 7 AI Processor performs...')}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E] resize-none"
        />
      </div>
    </div>
  );
}

export function FeatureTextEditorPanel({
  state,
  onChange,
}: {
  state: ThumbnailFeatureTextState;
  onChange: (s: ThumbnailFeatureTextState) => void;
}) {
  const t = useT();
  const count = state.bulletCount ?? 6;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel title={t('Title')} />
        <input
          type="text"
          value={state.headingText}
          onChange={(e) => onChange({ ...state, headingText: e.target.value })}
          placeholder={t('e.g. Delivery & Installation Guide')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E]"
        />
      </div>
      <div>
        <SectionLabel title={t('Bullet Points (1–6)')} />
        {/* Count selector 1–6 */}
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => onChange({ ...state, bulletCount: n })}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                count === n
                  ? 'bg-[#FD312E] text-white'
                  : 'border border-gray-200 text-gray-600 hover:border-[#FD312E]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-gray-400 w-4 shrink-0 text-right mt-2">{i + 1}</span>
              <textarea
                rows={3}
                value={state.bulletPoints[i] ?? ''}
                onChange={(e) =>
                  onChange({
                    ...state,
                    bulletPoints: state.bulletPoints.map((v, j) => (j === i ? e.target.value : v)),
                  })
                }
                placeholder={`${t('Bullet')} ${i + 1}`}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E] resize-none"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ThumbnailEditor ─────────────────────────────────────────────────────

export function ThumbnailEditor({
  slotId,
  orientation,
  onOrientationChange,
  onBack,
  allStates,
  onAllStatesChange,
  draftSave,
  railActive,
  onRailNavigate,
  onOpenDraft,
}: Props) {
  const t = useT();

  // Local draft ("Save for Later") — single mode only; hook is unconditional
  // (rules of hooks), the button renders only when draftSave is provided.
  const draftState = React.useMemo(
    () => ({ slotId, orientation, allStates }),
    [slotId, orientation, allStates],
  );
  const draft = useDraftSave({
    builder: 'thumbnail-single',
    initialDraftId: draftSave?.initialDraftId,
    state: draftState,
    title: draftSave?.initialTitle ?? 'Thumbnail',
  });
  const defaultDraftName = draftSave?.initialTitle ?? 'Thumbnail';
  const {
    guard,
    showModal: showUnsavedModal,
    showNameModal: showUnsavedNameModal,
    handleSave: handleUnsavedSave,
    handleNameConfirm: handleUnsavedNameConfirm,
    handleNameCancel: handleUnsavedNameCancel,
    handleDiscard: handleUnsavedDiscard,
  } = useUnsavedGuard(draft, defaultDraftName);
  const slot = getSlot(slotId);
  const downloadRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const promotionCropTriggerRef = useRef<(() => void) | null>(null);

  const { w, h } = slot.size;
  const previewAreaSize = 560;
  const previewScale = previewAreaSize / w;

  function updateSlot<K extends ThumbnailType>(id: K, state: ThumbnailAllStates[K]) {
    onAllStatesChange({ ...allStates, [id]: state });
  }

  const handleDownload = async () => {
    if (!downloadRef.current) return;
    setIsDownloading(true);
    let restoreImages: (() => void) | null = null;
    try {
      restoreImages = await preloadImagesToDataUrls(downloadRef.current);
      for (let attempt = 0; attempt < 2; attempt++) {
        await toBlob(downloadRef.current, { width: w, height: h, pixelRatio: 1, skipFonts: false });
      }
      const blob = await toBlob(downloadRef.current, {
        width: w, height: h, pixelRatio: 1, skipFonts: false, cacheBust: true,
      });
      if (!blob) throw new Error('html-to-image returned null blob');

      const d = new Date();
      const date6 = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const orient = slot.hasOrientation ? `-${orientation}` : '';
      await saveBlob(blob, `${slot.category}-${slotId}${orient}-${w}x${h}-${date6}.png`);
    } catch (err: any) {
      console.error('[ThumbnailEditor] Download failed:', err);
      alert(`${t('Download failed:')}\n${err?.message ?? String(err)}`);
    } finally {
      restoreImages?.();
      setIsDownloading(false);
    }
  };

  function renderPreview() {
    switch (slotId) {
      case 'default':        return <DefaultThumbnailTemplate state={allStates.default} />;
      case 'gwp':            return <GwpThumbnailTemplate state={allStates.gwp[orientation]} orientation={orientation} />;
      case 'bundle':         return <BundleThumbnailTemplate state={allStates.bundle[orientation]} orientation={orientation} />;
      case 'usp':            return <UspThumbnailTemplate state={allStates.usp} />;
      case 'promotion':      return <PromotionThumbnailTemplate state={allStates.promotion} />;
      case 'feature-image':  return <FeatureImageThumbnailTemplate state={allStates['feature-image']} />;
      case 'feature-gallery':return <GalleryFeatureThumbnailTemplate state={allStates['feature-gallery']} />;
      case 'feature-text':   return <FeatureTextThumbnailTemplate state={allStates['feature-text']} />;
      default:               return <ThumbnailTemplate slot={slot} orientation={orientation} />;
    }
  }
  const PreviewComponent = () => renderPreview();

  return (
    <div className="h-screen bg-[#CBC8C2] flex flex-col overflow-hidden">
      <AppHeader
        title={t('Thumbnail Builder')}
        onBack={() => guard(onBack)}
        right={
          <>
            {draftSave && (
              <SaveForLaterButton draft={draft} defaultName={defaultDraftName} />
            )}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 bg-[#FD312E] hover:bg-[#E22825] text-white text-sm font-medium px-5 py-2 rounded-full transition-colors disabled:opacity-60"
            >
              {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span style={{ lineHeight: '20px' }}>{isDownloading ? t('Processing…') : t('Download PNG')}</span>
            </button>
          </>
        }
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <NavRail active={railActive} onNavigate={(key) => guard(() => onRailNavigate(key))} onOpenDraft={onOpenDraft} />
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest">{t('Preview')}</p>
            <div
              className="relative overflow-hidden shadow-2xl"
              style={{ width: previewAreaSize, height: previewAreaSize * (h / w) }}
            >
              <div
                style={{
                  width: w,
                  height: h,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                }}
              >
                <PreviewComponent />
              </div>
              {/* Hover overlay — promotion image (right col: x=800,y=50,w=360,h=260,r=20) */}
              {slotId === 'promotion' && (
                <div
                  className="absolute group cursor-pointer"
                  style={{
                    left: Math.round(800 * previewScale),
                    top: Math.round(50 * previewScale),
                    width: Math.round(360 * previewScale),
                    height: Math.round(260 * previewScale),
                    borderRadius: Math.round(20 * previewScale),
                  }}
                  onClick={() => promotionCropTriggerRef.current?.()}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ borderRadius: 'inherit' }}
                  >
                    <div className="flex items-center gap-1.5 text-white text-[11px] font-medium bg-black/40 px-3 py-1.5 rounded-full">
                      <Crop size={11} />
                      <span>{t('Edit Crop')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">{w} × {h} px</p>
          </div>
        </div>

        {/* Editor panel */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 shrink-0">
            <p className="font-lgei font-bold text-[14px] text-gray-900" style={{ lineHeight: '18px' }}>
              {t('Editor Panel')}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{t('Edit the available fields below.')}</p>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-5 flex flex-col gap-5">
            {/* Orientation toggle — GWP / Bundle only */}
            {slot.hasOrientation && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-700">{t('Orientation')}</span>
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                  {(['horizontal', 'vertical'] as Orientation[]).map((o) => (
                    <button
                      key={o}
                      onClick={() => onOrientationChange(o)}
                      className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${
                        orientation === o
                          ? 'bg-white text-[#FD312E] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {o === 'horizontal' ? t('Horizontal') : t('Vertical')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Slot-specific editor */}
            {slotId === 'default' && (
              <DefaultEditorPanel
                state={allStates.default}
                onChange={(s) => updateSlot('default', s)}
              />
            )}
            {slotId === 'gwp' && (
              <GwpEditorPanel
                state={allStates.gwp[orientation]}
                onChange={(s) => onAllStatesChange({ ...allStates, gwp: { ...allStates.gwp, [orientation]: s } })}
                orientation={orientation}
              />
            )}
            {slotId === 'bundle' && (
              <BundleEditorPanel
                key={orientation}
                state={allStates.bundle[orientation]}
                onChange={(s) => onAllStatesChange({ ...allStates, bundle: { ...allStates.bundle, [orientation]: s } })}
                orientation={orientation}
              />
            )}
            {slotId === 'usp' && (
              <UspEditorPanel
                state={allStates.usp}
                onChange={(s) => updateSlot('usp', s)}
              />
            )}
            {slotId === 'promotion' && (
              <PromotionEditorPanel
                state={allStates.promotion}
                onChange={(s) => updateSlot('promotion', s)}
                promotionImageCropTriggerRef={promotionCropTriggerRef}
              />
            )}
            {slotId === 'feature-image' && (
              <FeatureImageEditorPanel
                state={allStates['feature-image']}
                onChange={(s) => updateSlot('feature-image', s)}
              />
            )}
            {slotId === 'feature-gallery' && (
              <GalleryFeatureEditorPanel
                state={allStates['feature-gallery']}
                onChange={(s) => updateSlot('feature-gallery', s)}
              />
            )}
            {slotId === 'feature-text' && (
              <FeatureTextEditorPanel
                state={allStates['feature-text']}
                onChange={(s) => updateSlot('feature-text', s)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Hidden full-size render target for html-to-image */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, width: w, height: h,
          opacity: 0, pointerEvents: 'none', zIndex: -1, overflow: 'hidden', background: 'white',
        }}
      >
        <div ref={downloadRef} style={{ width: w, height: h }}>
          <PreviewComponent />
        </div>
      </div>

      {showUnsavedModal && (
        <UnsavedChangesModal onSave={handleUnsavedSave} onDiscard={handleUnsavedDiscard} />
      )}
      {showUnsavedNameModal && (
        <SaveDraftModal
          defaultName={defaultDraftName}
          checkNameTaken={draft.checkNameTaken}
          onSave={handleUnsavedNameConfirm}
          onCancel={handleUnsavedNameCancel}
        />
      )}
    </div>
  );
}
