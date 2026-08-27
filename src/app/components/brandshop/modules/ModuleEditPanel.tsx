import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Library } from 'lucide-react';
import { AssetLibraryModal, type AssetItem, prefetchFullAssetDataUrl } from '../../AssetLibraryModal';
import { ImageGalleryModal } from '../../ImageGalleryModal';
import { ImageCropModal, type CropState } from '../../ImageCropModal';
import { BrushMaskEditor } from '../../BrushMaskEditor';
import { ShowToggle } from '../bigPromoCommon';
import { scrapeProductImages, getProxiedImageUrl, ScrapedImage } from '../../../services/imageScraperApi';
import { fetchAsDataUrl } from '../../../utils/imageUrlLoader';
import { useT } from '../../../i18n/LanguageContext';
import {
  PromotionEditPanel,
  PlacedImageOverlay,
} from '../OtherPromotionsEditor';
import {
  OtherPromoThemeTemplate,
  OtherPromoThemeState,
} from '../templates/OtherPromoThemeTemplate';
import { OtherPromoLifestyleState } from '../templates/OtherPromoLifestyleTemplate';
import { makePromotionPresets, applyPreset } from '../templates/otherPromoPresets';
import { bannerLifestylePlacement, BANNER_LS_BOX } from './bannerLifestyle';
import { VP_ICON_LIST, vpIconSrc } from './vpIcons';
import { removeBackgroundAI } from './aiBgRemoval';
import {
  ModuleEditState,
  OfficialStoreState,
  salesGraphicZoom,
  OFFICIAL_STORE_SALES_GRAPHIC_ZOOM,
  FollowUsState,
  TextModuleState,
  TextVariant,
  KvState,
  KvProductListState,
  KvProductListVariant,
  ProductCardItem,
  CategoryListState,
  CategoryItem,
  ProductCardsState,
  ProductCardsVariant,
  PRODUCT_CARD_COUNTS,
  productCardDefaultItem,
  rankCardDefaultItem,
  BannerGroupState,
  BannerSlideState,
  BANNER_SLIDE_MIN,
  BANNER_SLIDE_MAX,
  makeDefaultBannerSlide,
  BannerVariant,
  VouchersState,
  VoucherItem,
  SmallVoucherItem,
  SMALL_VOUCHER_MIN,
  SMALL_VOUCHER_MAX,
  smallVoucherDefaultItems,
  VOUCHER_DEFAULT_ITEMS,
  voucherDefaultItems,
  voucherVisual,
  ValuePropsState,
  ValuePropItem,
  VP_DEFAULT_PROPS,
  vpDefaultProps,
  CAT_DEFAULT_CATEGORIES,
  catDefaultCategories,
} from './editStates';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Product cards wide-crop guide (Figma 2762:31512) — the 485×290 frame with
// the centred 290×290 square marked in red, drawn over the crop canvas so one
// composition can be judged against both shapes at once: the square is what
// the 3- and 6-card layouts show, the full width what 2 and 4 show.
const PRODUCT_CARD_CROP_GUIDE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="485" height="290">' +
  '<rect x="0" y="0" width="97.5" height="290" fill="black" fill-opacity="0.55"/>' +
  '<rect x="387.5" y="0" width="97.5" height="290" fill="black" fill-opacity="0.55"/>' +
  '<rect x="97.5" y="0" width="290" height="290" fill="none" stroke="#FD312E" stroke-width="2"/>' +
  '</svg>'
)}`;

/** What `padToCropAspect` produced: the padded image, and how much of its
 *  width is real content rather than the margin it added. */
interface PaddedCrop {
  dataUrl: string;
  contentWidthRatio: number;
}

/**
 * Letterbox or pillarbox a source onto a canvas of exactly `aspect`.
 *
 * react-easy-crop derives its crop box from the media's own rendered size —
 * `min(rendered, canvas)` per axis — so it only spans the full frame when the
 * source's natural aspect already matches the target. Any other aspect gets
 * contain-fitted narrower than the canvas in one axis, and the crop box
 * silently shrinks with it, drifting out from under a guide that assumes the
 * frame's real size. Padding first removes the mismatch at the source, which
 * is the only arrangement that lines up reliably.
 *
 * Applied per caller rather than inside ImageCropModal, because every other
 * crop field in the app uses a plain aspect that never hits this edge.
 */
function padToCropAspect(dataUrl: string, aspect: number): Promise<PaddedCrop> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const CANVAS_W = 970, CANVAS_H = Math.round(970 / aspect); // 2× the modal canvas at this aspect
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const fitScale = imgAspect > aspect ? CANVAS_W / img.naturalWidth : CANVAS_H / img.naturalHeight;
      const fitW = img.naturalWidth * fitScale;
      const fitH = img.naturalHeight * fitScale;
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({ dataUrl, contentWidthRatio: 1 }); return; }
      ctx.drawImage(img, (CANVAS_W - fitW) / 2, (CANVAS_H - fitH) / 2, fitW, fitH);
      resolve({ dataUrl: canvas.toDataURL('image/png'), contentWidthRatio: fitW / CANVAS_W });
    };
    img.onerror = () => resolve({ dataUrl, contentWidthRatio: 1 });
    img.src = dataUrl;
  });
}

// Detect bounding box of non-empty pixels (non-transparent + non-near-white) → crop to it
async function autoCropToContent(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }
      ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let minX = width, maxX = -1, minY = height, maxY = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const a = data[i + 3];
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const isEmpty = a < 10 || (r >= 245 && g >= 245 && b >= 245);
          if (!isEmpty) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0 || maxY < 0) { resolve(dataUrl); return; }
      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      const out = document.createElement('canvas');
      out.width = cropW;
      out.height = cropH;
      const outCtx = out.getContext('2d');
      if (!outCtx) { resolve(dataUrl); return; }
      outCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(out.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
      {children}
    </p>
  );
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
      />
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 2,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white resize-none"
      />
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function ImageUploader({
  label,
  value,
  onChange,
  aspectRatio,
  noCrop,
  transform,
  objectFit = 'cover',
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  aspectRatio?: number;
  noCrop?: boolean;
  transform?: (dataUrl: string) => Promise<string>;
  objectFit?: 'cover' | 'contain';
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      let url = ev.target?.result as string;
      if (transform) {
        try { url = await transform(url); } catch { /* use original on error */ }
      }
      onChange(url);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="mb-3">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        {value ? (
          <div className="relative w-12 h-12 rounded border border-gray-200 overflow-hidden shrink-0 bg-gray-50 group">
            <img
              src={value} alt=""
              className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
              style={{ maxWidth: 'none' }}
            />
            {!noCrop && (
              <button
                onClick={() => setCropSrc(value)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-white text-[9px] font-medium leading-tight text-center">{t('Edit')}<br />{t('Crop')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-12 h-12 rounded border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0 bg-gray-50">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 text-xs text-[#FD312E] border border-[#FD312E]/30 rounded-md py-1.5 hover:bg-[#FD312E]/5 transition-colors"
        >
          {value ? t('Replace') : t('Upload')}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {!noCrop && cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={aspectRatio}
          title={label}
          onConfirm={cropped => { onChange(cropped); setCropSrc(null); }}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}

// ── Per-module editors ────────────────────────────────────────────────────────

const STORE_NAME_FONT = 'var(--obs-font)';
/** Official store: four graphics, named for where they sit on the banner. */
const OFFICIAL_STORE_SLOT_COUNT = 4;
const SALES_GRAPHIC_SLOT_LABELS = ['Left edge', 'Left of slogan', 'Right of slogan', 'Right edge'];
/** Framing range for a sales graphic: it has to read at the same weight as the
 *  other three, so the crop window only allows a nudge either way. */
const SALES_GRAPHIC_MIN_ZOOM = 0.7;
const SALES_GRAPHIC_MAX_ZOOM = 1.2;
/** Warm Gray 05 — the banner's canvas, so a thumbnail is judged on it. */
const OFFICIAL_STORE_CANVAS = '#E6E1D6';

function OfficialStorePanel({
  data,
  onUpdate,
}: {
  data: OfficialStoreState;
  onUpdate: (d: OfficialStoreState) => void;
}) {
  const t = useT();
  const set = (p: Partial<OfficialStoreState>) => onUpdate({ ...data, ...p });
  const storeNameRulerRef = useRef<HTMLDivElement>(null);

  const handleStoreNameChange = useCallback((v: string) => {
    if (v.includes('\n')) return;
    const ruler = storeNameRulerRef.current;
    if (ruler) {
      ruler.textContent = v || ' ';
      if (ruler.getBoundingClientRect().width > 440) return;
    }
    set({ storeNameText: v });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, onUpdate]);

  // Slots are library picks now: no URL, no upload, no background removal.
  // Framing is the same crop window the product slots use.
  const [librarySlot, setLibrarySlot] = useState<number | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropIdx, setCropIdx] = useState<number | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [isRecrop, setIsRecrop] = useState(false);

  async function handleLibrarySelect(item: AssetItem) {
    const i = librarySlot;
    setLibrarySlot(null);
    if (i === null) return;
    // Inline the asset rather than pointing at the CDN: html-to-image has to
    // read every pixel back out at export, and a cross-origin URL taints the
    // canvas — the graphic would silently drop out of the PNG.
    const full = /^https?:\/\//i.test(item.full)
      ? item.full
      : '/asset-library/' + item.full.replace(/^\/+/, '');
    const dataUrl = await prefetchFullAssetDataUrl(full);
    if (!dataUrl) return;
    // Straight on to framing — picking a shape and judging its weight against
    // the banner is one decision, not two.
    setCropZoom(salesGraphicZoom(item.name, OFFICIAL_STORE_SALES_GRAPHIC_ZOOM));
    setIsRecrop(false);
    setCropIdx(i);
    setCropSrc(dataUrl);
  }

  function openRecrop(i: number) {
    const src = data.productImagesOriginal?.[i] ?? data.productImages[i];
    if (!src) return;
    setIsRecrop(true);
    setCropIdx(i);
    setCropSrc(src);
  }

  function handleCropConfirm(cropped: string, cropState: CropState) {
    if (cropIdx === null) return;
    const imgs = [...data.productImages]; imgs[cropIdx] = cropped;
    const origs = [...(data.productImagesOriginal ?? [])]; origs[cropIdx] = cropSrc;
    const crops = [...(data.productImagesCrop ?? [])]; crops[cropIdx] = cropState;
    set({ productImages: imgs, productImagesOriginal: origs, productImagesCrop: crops });
    setCropSrc(null);
    setCropIdx(null);
  }

  return (
    <>
      {/* Hidden ruler — matches template: 32px / weight 300 / letterSpacing -0.64px / nowrap */}
      <div
        ref={storeNameRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          fontSize: 32, fontWeight: 300, fontFamily: STORE_NAME_FONT,
          letterSpacing: 'calc(-0.64px + var(--obs-tracking))', whiteSpace: 'nowrap',
          visibility: 'hidden', pointerEvents: 'none',
          padding: 0, margin: 0, border: 'none',
        }}
      />

      <div>
        <TextField
          label={t('Store name')}
          value={data.storeNameText}
          onChange={handleStoreNameChange}
        />

        <SectionDivider>{t('Sales graphic images (4)')}</SectionDivider>

        {Array.from({ length: OFFICIAL_STORE_SLOT_COUNT }, (_, i) => {
          const img = data.productImages[i] ?? null;
          return (
            <div key={i} className="mb-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
              <FieldLabel>{SALES_GRAPHIC_SLOT_LABELS[i]}</FieldLabel>

              <div className="flex gap-2">
                <div
                  className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden shrink-0 group"
                  style={{ background: OFFICIAL_STORE_CANVAS }}
                >
                  {img ? (
                    <>
                      <img src={img} alt="" className="w-full h-full object-contain" style={{ maxWidth: 'none' }} />
                      <button
                        onClick={() => openRecrop(i)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="text-white text-[9px] font-medium leading-tight text-center">{t('Edit')}<br/>{t('Crop')}</span>
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3v10M3 8h10" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Re-cropping lives on the thumbnail itself (hover → Edit Crop):
                    it acts on the image you are looking at, so a separate button
                    would only repeat the same reach. */}
                <div className="flex-1 flex flex-col justify-center">
                  <button
                    onClick={() => setLibrarySlot(i)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
                  >
                    <Library size={12} />
                    {t('Pick from library')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AssetLibraryModal
        open={librarySlot !== null}
        onClose={() => setLibrarySlot(null)}
        onSelect={handleLibrarySelect}
      />

      {/* Same crop window the product slots use, at the frame's 1:1. On a
          re-crop it resumes the last framing; on a fresh pick it opens at the
          asset's own default zoom — see OFFICIAL_STORE_SALES_GRAPHIC_ZOOM. */}
      {cropSrc !== null && cropIdx !== null && (() => {
        const cs = isRecrop ? (data.productImagesCrop?.[cropIdx] ?? null) : null;
        return (
          <ImageCropModal
            imageSrc={cropSrc}
            aspectRatio={1}
            title={t('Sales graphic image')}
            minZoom={SALES_GRAPHIC_MIN_ZOOM}
            maxZoom={SALES_GRAPHIC_MAX_ZOOM}
            cropSize={{ width: 380, height: 380 }}
            {...(cs ? { initialZoom: cs.zoom, initialCrop: cs.crop } : { initialZoom: cropZoom })}
            onConfirm={handleCropConfirm}
            onCancel={() => { setCropSrc(null); setCropIdx(null); }}
          />
        );
      })()}
    </>
  );
}

const FOLLOW_RULER_MAIN: React.CSSProperties = {
  position: 'fixed', top: -9999, left: -9999,
  fontSize: 56, letterSpacing: 'var(--obs-tracking-head)', fontWeight: 400,
  fontFamily: 'var(--obs-font)',
  lineHeight: 1.12, whiteSpace: 'nowrap',
  visibility: 'hidden', pointerEvents: 'none',
  padding: 0, margin: 0, border: 'none',
};
const FOLLOW_RULER_SUB: React.CSSProperties = {
  ...FOLLOW_RULER_MAIN,
  fontSize: 27, fontWeight: 300,
};
const FOLLOW_INNER = 1120; // 1200 - 40×2 padding
const FOLLOW_GAP = 30;

function FollowUsPanel({
  data,
  onUpdate,
}: {
  data: FollowUsState;
  onUpdate: (d: FollowUsState) => void;
}) {
  const t = useT();
  const set = (p: Partial<FollowUsState>) => onUpdate({ ...data, ...p });
  const mainRulerRef = useRef<HTMLDivElement>(null);
  const subRulerRef = useRef<HTMLDivElement>(null);
  const [mainTooWide, setMainTooWide] = useState(false);

  // Check on mount whether existing main copy leaves room for sub copy
  React.useLayoutEffect(() => {
    const el = mainRulerRef.current;
    if (!el) return;
    el.textContent = data.mainCopy || ' ';
    setMainTooWide(el.getBoundingClientRect().width > FOLLOW_INNER - FOLLOW_GAP);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function measureMainW(): number {
    const el = mainRulerRef.current;
    if (!el) return 0;
    el.textContent = data.mainCopy || ' ';
    return el.getBoundingClientRect().width;
  }

  function measureSubMaxLineW(subText: string): number {
    const el = subRulerRef.current;
    if (!el) return 0;
    const longest = subText.split('\n').reduce((a, b) => a.length >= b.length ? a : b, '') || ' ';
    el.textContent = longest;
    return el.getBoundingClientRect().width;
  }

  function handleMainCopyChange(v: string) {
    const mainEl = mainRulerRef.current;
    if (!mainEl) { set({ mainCopy: v }); return; }
    mainEl.textContent = v || ' ';
    const mainW = mainEl.getBoundingClientRect().width;
    setMainTooWide(mainW > FOLLOW_INNER - FOLLOW_GAP);
    let maxW = FOLLOW_INNER;
    if (data.showSubCopy && data.subCopy.trim()) {
      maxW = FOLLOW_INNER - FOLLOW_GAP - measureSubMaxLineW(data.subCopy);
    }
    if (mainW > maxW) return;
    set({ mainCopy: v });
  }

  function handleSubCopyChange(v: string) {
    const subMaxLineW = measureSubMaxLineW(v);
    const mainW = measureMainW();
    if (subMaxLineW > FOLLOW_INNER - FOLLOW_GAP - mainW) return;
    set({ subCopy: v });
  }

  function handleSubCopyToggle(v: boolean) {
    if (v && mainTooWide) return; // block: no room for sub copy
    set({ showSubCopy: v, subCopy: v ? (data.subCopy || 'min. spend\n$100 Voucher') : '' });
  }

  return (
    <div>
      <div ref={mainRulerRef} style={FOLLOW_RULER_MAIN} />
      <div ref={subRulerRef} style={FOLLOW_RULER_SUB} />
      <TextField
        label={t('Main copy')}
        value={data.mainCopy}
        onChange={handleMainCopyChange}
        placeholder={t('Follow us & Enjoy $20 OFF')}
      />
      <div className="mb-3">
        <div className="flex items-center mb-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy')}</p>
          <div className="ml-auto">
            <ShowToggle
              checked={data.showSubCopy}
              onChange={handleSubCopyToggle}
            />
          </div>
        </div>
        {!data.showSubCopy && mainTooWide && (
          <p className="text-[10px] text-red-500 mt-0.5">{t('Shorten the main copy to make room for sub copy.')}</p>
        )}
        {data.showSubCopy && (
          <textarea
            value={data.subCopy}
            onChange={e => handleSubCopyChange(e.target.value)}
            rows={data.subCopy.includes('\n') ? 2 : 1}
            placeholder={'min. spend\n$100 Voucher'}
            className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white resize-none"
          />
        )}
      </div>
    </div>
  );
}

const TEXT_VARIANTS_LIST: TextVariant[] = ['Warm Gray 01', 'Warm Gray 07', 'Warm Gray 05', 'Gradient'];

// Button shows actual bg color; ring + red text when selected
const TEXT_BTN_STYLE: Record<TextVariant, { bg: string; color: string }> = {
  'Warm Gray 07': { bg: '#F6F3EB', color: '#1a1a1a' },
  'Warm Gray 05': { bg: '#E6E1D6', color: '#1a1a1a' },
  'Warm Gray 01': { bg: '#262626', color: '#ffffff' },
  'Gradient':     { bg: 'center/cover url(/store-modules/text-gradient-bg.png)', color: '#ffffff' },
};

// Ruler font matches template: 54px / weight 600 / LGEI Headline / nowrap
const TEXT_RULER_STYLE: React.CSSProperties = {
  position: 'fixed', top: -9999, left: -9999,
  fontSize: 54, letterSpacing: 'var(--obs-tracking-head)', fontWeight: 600,
  fontFamily: 'var(--obs-font)',
  lineHeight: 1.12,
  whiteSpace: 'nowrap',
  visibility: 'hidden', pointerEvents: 'none',
  padding: 0, margin: 0, border: 'none',
};
// 1-copy: max 1120px (full inner container)
// 2-copy: copy1 + gap(24) + divider(1) + gap(24) + copy2 share that same 1120px budget
const TEXT_MAX_ONE = 1120;
const TEXT_ROW_GAP = 24;
const TEXT_DIVIDER_W = 1;
const TEXT_COMBINED_MAX = TEXT_MAX_ONE - (TEXT_ROW_GAP * 2 + TEXT_DIVIDER_W);
const TEXT_COPY2_DEFAULT = 'Lorem ipsum dolor sit';

function TextModulePanel({
  data,
  onUpdate,
}: {
  data: TextModuleState;
  onUpdate: (d: TextModuleState) => void;
}) {
  const t = useT();
  const set = (p: Partial<TextModuleState>) => onUpdate({ ...data, ...p });
  const rulerRef1 = useRef<HTMLDivElement>(null);
  const rulerRef2 = useRef<HTMLDivElement>(null);

  function measureW(el: HTMLDivElement | null, text: string) {
    if (!el) return 0;
    el.textContent = text || ' ';
    return el.getBoundingClientRect().width;
  }

  // Copy 1 hugs its own text width, but yields room to Copy 2 when shown
  function handleCopy1Change(v: string) {
    const maxW = data.showSecondCopy
      ? TEXT_COMBINED_MAX - measureW(rulerRef2.current, data.textRight)
      : TEXT_MAX_ONE;
    if (measureW(rulerRef1.current, v) > maxW) return;
    set({ textLeft: v });
  }

  // Copy 2 hugs until the combined row width (with Copy 1) hits the limit
  function handleCopy2Change(v: string) {
    const maxW = TEXT_COMBINED_MAX - measureW(rulerRef1.current, data.textLeft);
    if (measureW(rulerRef2.current, v) > maxW) return;
    set({ textRight: v });
  }

  // Would Copy 2 (its current text, or the default it gets on enabling) fit next to Copy 1?
  function copy2WouldOverflow(copy1Val: string, copy2Val: string): boolean {
    const remaining = TEXT_COMBINED_MAX - measureW(rulerRef1.current, copy1Val);
    return measureW(rulerRef2.current, copy2Val || TEXT_COPY2_DEFAULT) > remaining;
  }

  function handleShowSecondCopyToggle(v: boolean) {
    if (!v) { set({ showSecondCopy: false, textRight: '' }); return; }
    if (copy2WouldOverflow(data.textLeft, data.textRight)) return;
    set({ showSecondCopy: true, textRight: data.textRight || TEXT_COPY2_DEFAULT });
  }

  const copy2Blocked = !data.showSecondCopy && copy2WouldOverflow(data.textLeft, data.textRight);

  return (
    <div>
      {/* Hidden rulers */}
      <div ref={rulerRef1} style={TEXT_RULER_STYLE} />
      <div ref={rulerRef2} style={TEXT_RULER_STYLE} />

      {/* Background option — 2×2 grid with actual variant colors */}
      <div className="mb-4">
        <FieldLabel>{t('Background option')}</FieldLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {TEXT_VARIANTS_LIST.map(v => {
            const active = data.variant === v;
            const s = TEXT_BTN_STYLE[v];
            return (
              <button
                key={v}
                onClick={() => set({ variant: v })}
                style={{ background: s.bg, color: s.color }}
                className={`py-2.5 rounded-xl text-[11px] font-medium transition-all border-2 ${
                  active ? 'border-[#FD312E]' : 'border-transparent hover:border-white/40'
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* COPY 1 — always shown */}
      <TextField
        label={t('COPY 1')}
        value={data.textLeft}
        onChange={handleCopy1Change}
        placeholder={t('Lorem ipsum dolor sit')}
      />

      {/* COPY 2 — always shown, toggle on/off */}
      <div className="mb-3">
        <div className="flex items-center mb-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('COPY 2')}</p>
          <div className="ml-auto">
            <ShowToggle
              checked={data.showSecondCopy}
              onChange={handleShowSecondCopyToggle}
            />
          </div>
        </div>
        {copy2Blocked && (
          <p className="text-[10px] text-red-500 mt-0.5">{t('Shorten Copy 1 to make room for Copy 2.')}</p>
        )}
        {data.showSecondCopy && (
          <input
            type="text"
            value={data.textRight}
            onChange={e => handleCopy2Change(e.target.value)}
            placeholder={t('Lorem ipsum dolor sit')}
            className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
          />
        )}
      </div>
    </div>
  );
}

const KV_HEAD_W = 1040;           // 1200 - 80*2 side padding in info section
const KV_HEAD_FS = 72;
const KV_HEAD_LH = 1.1;
const KV_SUBCOPY_MAX_H = 80;     // 36px × 1.1 × 2 lines = 79.2 → 80
const KV_CTA_MAX_W = 400;        // Figma max-w-[400px] on text inside CtaBtn
const KV_DISCLAIMER_W = 1120;    // 1200 - 40*2 overlay wrapper padding
const KV_DISCLAIMER_MAX_H = 40;  // 18px × 1.1 × 2 lines = 39.6 → 40
const KV_IMG_ASPECT = 1200 / 800;
/** Gap between the struck-through and sale prices when they sit side by side —
 *  must match the card's, or the typing guard measures a different line than the
 *  one that gets drawn. See KvProductListCard's `priceRow`. */
const PRICE_ROW_GAP = 10;

function KvPanel({ data, onUpdate }: { data: KvState; onUpdate: (d: KvState) => void }) {
  const t = useT();
  const set = (p: Partial<KvState>) => onUpdate({ ...data, ...p });
  const headRulerRef = useRef<HTMLDivElement>(null);
  const subCopyRulerRef = useRef<HTMLDivElement>(null);
  const ctaRulerRef = useRef<HTMLDivElement>(null);
  const disclaimerRulerRef = useRef<HTMLDivElement>(null);
  const kvFileRef = useRef<HTMLInputElement>(null);

  const [kvUrl, setKvUrl] = useState('');
  const [kvLoading, setKvLoading] = useState(false);
  const [kvError, setKvError] = useState<string | null>(null);
  const [kvScraped, setKvScraped] = useState<ScrapedImage[]>([]);
  const [showKvGallery, setShowKvGallery] = useState(false);
  const [kvCropSrc, setKvCropSrc] = useState<string | null>(null);
  const [kvCropContentRatio, setKvCropContentRatio] = useState(1);
  const [isKvRecrop, setIsKvRecrop] = useState(false); // true = "Edit Crop" (resume framing); false = fresh crop after upload
  const [subCopyBlocked, setSubCopyBlocked] = useState(false);

  const maxHeadLines = data.showSubCopy ? 2 : 3;

  function countHeadLines(text: string): number {
    const el = headRulerRef.current;
    if (!el) return 1;
    el.textContent = text || ' ';
    return Math.round(el.getBoundingClientRect().height / (KV_HEAD_FS * KV_HEAD_LH));
  }

  function handleHeadChange(v: string) {
    if (countHeadLines(v) > maxHeadLines) return;
    if (subCopyBlocked && countHeadLines(v) <= 2) setSubCopyBlocked(false);
    set({ headline: v });
  }

  function handleCtaChange(v: string) {
    const el = ctaRulerRef.current;
    if (el) {
      el.textContent = v || ' ';
      if (el.getBoundingClientRect().width > KV_CTA_MAX_W) return;
    }
    set({ ctaText: v });
  }

  function handleSubCopyToggle(v: boolean) {
    if (v && countHeadLines(data.headline) > 2) {
      setSubCopyBlocked(true);
      return;
    }
    setSubCopyBlocked(false);
    set({ showSubCopy: v });
  }

  function handleSubCopyChange(v: string) {
    const el = subCopyRulerRef.current;
    if (el) {
      el.textContent = v || ' ';
      if (el.getBoundingClientRect().height > KV_SUBCOPY_MAX_H) return;
    }
    set({ subCopy: v });
  }

  function handleDisclaimerChange(v: string) {
    const el = disclaimerRulerRef.current;
    if (el) {
      el.textContent = v || ' ';
      if (el.getBoundingClientRect().height > KV_DISCLAIMER_MAX_H) return;
    }
    set({ disclaimer: v });
  }

  function handleKvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setIsKvRecrop(false);
      const padded = await padToCropAspect(reader.result as string, KV_IMG_ASPECT);
      setKvCropContentRatio(padded.contentWidthRatio);
      setKvCropSrc(padded.dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleKvFetch() {
    const url = kvUrl.trim();
    if (!url) return;
    try { new URL(url); } catch {
      setKvError('Please enter a valid URL (https://…)');
      return;
    }
    setKvLoading(true);
    setKvError(null);
    const result = await scrapeProductImages(url);
    setKvScraped(result.images);
    setKvError(result.error || null);
    setKvLoading(false);
    if (result.images.length > 0) setShowKvGallery(true);
  }

  async function handleKvGallerySelect(scraped: ScrapedImage) {
    setShowKvGallery(false);
    const proxied = getProxiedImageUrl(scraped.url);
    const dataUrl = await fetchAsDataUrl(proxied);
    if (!dataUrl) return;
    setIsKvRecrop(false);
    const padded = await padToCropAspect(dataUrl, KV_IMG_ASPECT);
    setKvCropContentRatio(padded.contentWidthRatio);
    setKvCropSrc(padded.dataUrl);
  }

  async function handleKvEditCrop() {
    const src = data.kvImageOriginal ?? data.kvImage;
    if (!src) return;
    setIsKvRecrop(true);
    const padded = await padToCropAspect(src, KV_IMG_ASPECT);
    setKvCropContentRatio(padded.contentWidthRatio);
    setKvCropSrc(padded.dataUrl);
  }

  return (
    <div>
      {/* Hidden rulers */}
      <div
        ref={headRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          width: KV_HEAD_W, fontSize: KV_HEAD_FS, letterSpacing: 'var(--obs-tracking)', fontWeight: 600,
          fontFamily: STORE_NAME_FONT, lineHeight: KV_HEAD_LH,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none',
        }}
      />
      <div
        ref={subCopyRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          width: KV_HEAD_W, fontSize: 36, letterSpacing: 'var(--obs-tracking)', fontWeight: 300,
          fontFamily: STORE_NAME_FONT, lineHeight: 1.1,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none',
        }}
      />
      <div
        ref={ctaRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          fontSize: 32, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, fontFamily: STORE_NAME_FONT,
          whiteSpace: 'nowrap',
          visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none',
        }}
      />
      <div
        ref={disclaimerRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          width: KV_DISCLAIMER_W, fontSize: 18, letterSpacing: 'var(--obs-tracking)', fontWeight: 400,
          fontFamily: STORE_NAME_FONT, lineHeight: 1.1,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none',
        }}
      />

      {/* Campaign logo with LG logo (optional) */}
      <div className="mb-3">
        <div className="flex items-center mb-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Campaign logo with LG logo')}</p>
          <div className="ml-auto">
            <ShowToggle checked={data.showCampaignLogo} onChange={v => set({ showCampaignLogo: v })} />
          </div>
        </div>
        {data.showCampaignLogo && (
          <ImageUploader
            label={t('Campaign logo (H 40px / W Auto)')}
            value={data.campaignLogo}
            onChange={v => set({ campaignLogo: v })}
            noCrop
            transform={autoCropToContent}
            objectFit="contain"
          />
        )}
      </div>

      {/* Head copy — ruler-blocked at maxHeadLines */}
      <div className="mb-3">
        <FieldLabel>{t('Head copy')}</FieldLabel>
        <textarea
          value={data.headline}
          onChange={e => handleHeadChange(e.target.value)}
          rows={maxHeadLines + 1}
          placeholder={t('Lorem ipsum dolor sit amet')}
          className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:border-[#FD312E]"
        />
      </div>

      {/* Sub copy (optional) */}
      <div className="mb-3">
        <div className="flex items-center mb-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy')}</p>
          <div className="ml-auto">
            <ShowToggle checked={data.showSubCopy} onChange={handleSubCopyToggle} />
          </div>
        </div>
        {subCopyBlocked && (
          <p className="text-[10px] text-red-500 mt-0.5">{t('Shorten head copy to 2 lines to enable sub copy.')}</p>
        )}
        {data.showSubCopy && (
          <textarea
            value={data.subCopy}
            onChange={e => handleSubCopyChange(e.target.value)}
            rows={2}
            placeholder={t('Lorem ipsum dolor sit amet')}
            className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:border-[#FD312E]"
          />
        )}
      </div>

      {/* CTA copy — ruler-blocked at KV_CTA_MAX_W */}
      <div className="mb-3">
        <FieldLabel>{t('CTA copy')}</FieldLabel>
        <input
          type="text"
          value={data.ctaText}
          onChange={e => handleCtaChange(e.target.value)}
          placeholder={t('Shop Now')}
          className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
        />
      </div>

      {/* Image — upload + fetch, auto-opens crop modal */}
      <div className="mb-3">
        <FieldLabel>{t('KV image')}</FieldLabel>
        <div className="flex gap-2 mb-1.5">
          <div className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden shrink-0 bg-gray-50 group">
            {data.kvImage ? (
              <>
                <img src={data.kvImage} alt="" className="w-full h-full object-cover" style={{ maxWidth: 'none' }} />
                <button
                  onClick={handleKvEditCrop}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="text-white text-[9px] font-medium leading-tight text-center">{t('Edit')}<br />{t('Crop')}</span>
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex gap-1">
              <input
                type="text"
                value={kvUrl}
                onChange={e => setKvUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleKvFetch(); }}
                placeholder={t('LG.com product URL')}
                className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
              />
              <button
                onClick={handleKvFetch}
                disabled={kvLoading}
                className="text-xs px-2 py-1.5 rounded-md bg-[#FD312E] text-white shrink-0 disabled:opacity-50"
              >
                {kvLoading ? '…' : t('Import')}
              </button>
            </div>
            <button
              onClick={() => kvFileRef.current?.click()}
              className="w-full text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
            >
              {t('Upload')}
            </button>
            <input ref={kvFileRef} type="file" accept="image/*" className="hidden" onChange={handleKvUpload} />
            {kvError && <p className="text-[10px] text-red-500">{kvError}</p>}
            {kvScraped.length > 0 && !showKvGallery && (
              <button onClick={() => setShowKvGallery(true)} className="text-[11px] text-[#FD312E] underline text-left">
                {t('Change from imported images')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer (optional) */}
      <div className="mb-3">
        <div className="flex items-center mb-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Disclaimer')}</p>
          <div className="ml-auto">
            <ShowToggle checked={data.showDisclaimer} onChange={v => set({ showDisclaimer: v })} />
          </div>
        </div>
        {data.showDisclaimer && (
          <>
            <div className="flex gap-2 mb-2">
              {([['#FFFFFF', 'White'], ['#000000', 'Black']] as const).map(([color, label]) => {
                const active = (data.disclaimerColor ?? '#000000') === color;
                return (
                  <button
                    key={color}
                    onClick={() => set({ disclaimerColor: color })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#FD312E] text-[#FD312E]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0"
                      style={{ background: color }}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
            <textarea
              value={data.disclaimer}
              onChange={e => handleDisclaimerChange(e.target.value)}
              rows={2}
              placeholder={t('*T&Cs apply')}
              className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:border-[#FD312E] placeholder-gray-300"
            />
          </>
        )}
      </div>

      {showKvGallery && (
        <ImageGalleryModal
          images={kvScraped}
          isLoading={kvLoading}
          error={kvError}
          lifestyleOnly
          onSelect={handleKvGallerySelect}
          onCancel={() => setShowKvGallery(false)}
        />
      )}

      {kvCropSrc && (
        <ImageCropModal
          imageSrc={kvCropSrc}
          aspectRatio={KV_IMG_ASPECT}
          title={t('KV image')}
          minZoom={0.3}
          treatUnknownAspectAsStale
          fitFrameWidth
          fitWidthContentRatio={kvCropContentRatio}
          {...(isKvRecrop && data.kvImageCrop ? { initialZoom: data.kvImageCrop.zoom, initialCrop: data.kvImageCrop.crop, initialAspect: data.kvImageCrop.aspect } : {})}
          onConfirm={(cropped, cropState) => { set({ kvImage: cropped, kvImageOriginal: kvCropSrc, kvImageCrop: cropState }); setKvCropSrc(null); }}
          onCancel={() => setKvCropSrc(null)}
        />
      )}
    </div>
  );
}

function ProductCardEditor({
  index,
  data,
  showPrice,
  onUpdate,
  skipBgRemoval = false,
  isRank = false,
  showPriceToggles = false,
  textWidth = 290,
  wideCrop = false,
  priceRow = false,
}: {
  index: number;
  data: ProductCardItem;
  showPrice: boolean;
  onUpdate: (d: ProductCardItem) => void;
  skipBgRemoval?: boolean;
  isRank?: boolean;
  showPriceToggles?: boolean;
  /** The card's real rendered text-column width, so the line-count rulers
   *  measure against the width the copy will actually wrap at. 290 on the
   *  fixed KV+Product list card; wider once Product cards flex-fill a row. */
  textWidth?: number;
  /** True when the card sets the two prices side by side rather than stacked —
   *  they then share one line, so they have to be measured as a pair. */
  priceRow?: boolean;
  /** Product cards only: crop at the wide 485×290 frame with the square guide
   *  overlaid, instead of a plain 1:1. The image then holds real content for
   *  both layouts, so changing the card count never crops photo away. */
  wideCrop?: boolean;
}) {
  const t = useT();
  const set = (p: Partial<ProductCardItem>) => onUpdate({ ...data, ...p });
  const fileRef = useRef<HTMLInputElement>(null);
  const modelRulerRef = useRef<HTMLDivElement>(null);
  const featuresRulerRef = useRef<HTMLDivElement>(null);
  const origPriceRulerRef = useRef<HTMLDivElement>(null);
  const salePriceRulerRef = useRef<HTMLDivElement>(null);
  const discountRulerRef = useRef<HTMLDivElement>(null);
  const rankLabelRulerRef = useRef<HTMLDivElement>(null);

  function handleModelNameChange(val: string) {
    const el = modelRulerRef.current;
    if (!el) { set({ modelName: val }); return; }
    el.textContent = val || '​';
    const lines = Math.round(el.getBoundingClientRect().height / (34 * 1.1));
    if (lines <= 4) set({ modelName: val });
  }

  function handleRankLabelChange(val: string) {
    const el = rankLabelRulerRef.current;
    if (el) {
      el.textContent = val || ' ';
      if (el.getBoundingClientRect().width > 350) return;
    }
    set({ rankLabel: val });
  }

  function handleFeaturesChange(val: string) {
    const el = featuresRulerRef.current;
    if (!el) { set({ features: val }); return; }
    el.textContent = val || '​';
    const lines = Math.round(el.getBoundingClientRect().height / (24 * 1.1));
    if (lines <= 3) set({ features: val });
  }

  /**
   * Side by side, neither price has the card to itself, so accepting each at
   * 290 would let a legal pair overflow the 485 the row actually has. Measure
   * what will be drawn: both fields together, plus the gap between them, and
   * only when both are actually shown.
   */
  function pricePairFits(orig: string, sale: string) {
    const o = origPriceRulerRef.current;
    const s2 = salePriceRulerRef.current;
    if (!o || !s2) return true;
    const showsOrig = data.showOriginalPrice && data.showSalePrice && !!orig;
    o.textContent = showsOrig ? orig : '';
    s2.textContent = sale || '';
    const w = (showsOrig ? o.getBoundingClientRect().width + PRICE_ROW_GAP : 0)
      + s2.getBoundingClientRect().width;
    return w <= textWidth;
  }

  function handleOrigPriceChange(val: string) {
    if (priceRow) {
      if (!pricePairFits(val, data.salePrice)) return;
    } else {
      const el = origPriceRulerRef.current;
      if (el) {
        el.textContent = val || ' ';
        if (el.getBoundingClientRect().width > 290) return;
      }
    }
    set({ originalPrice: val });
  }

  function handleSalePriceChange(val: string) {
    if (priceRow) {
      if (!pricePairFits(data.originalPrice, val)) return;
    } else {
      const el = salePriceRulerRef.current;
      if (el) {
        el.textContent = val || ' ';
        if (el.getBoundingClientRect().width > 290) return;
      }
    }
    set({ salePrice: val });
  }

  function handleDiscountChange(val: string) {
    const el = discountRulerRef.current;
    if (el) {
      el.textContent = val || ' ';
      // Figma "num" max-width; the renderer's 278 pill is this plus 14px×2 padding.
      if (el.getBoundingClientRect().width > 250) return;
    }
    set({ discountPercent: val });
  }

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scraped, setScraped] = useState<ScrapedImage[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [processingMsg, setProcessingMsg] = useState<string | null>(null);
  const [brushOriginalUrl, setBrushOriginalUrl] = useState<string | null>(null);
  const [brushProcessedUrl, setBrushProcessedUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropContentRatio, setCropContentRatio] = useState(1);
  const [isRecrop, setIsRecrop] = useState(false); // true = "Edit Crop" (resume framing); false = fresh crop after upload

  async function openFreshCrop(dataUrl: string) {
    setIsRecrop(false);
    if (!wideCrop) { setCropSrc(dataUrl); return; }
    const padded = await padToCropAspect(dataUrl, 485 / 290);
    setCropContentRatio(padded.contentWidthRatio);
    setCropSrc(padded.dataUrl);
  }

  async function processImage(dataUrl: string) {
    if (skipBgRemoval) {
      await openFreshCrop(dataUrl);
      return;
    }
    setProcessingMsg('Loading AI model…');
    try {
      const processed = await removeBackgroundAI(dataUrl, setProcessingMsg);
      setBrushOriginalUrl(dataUrl);
      setBrushProcessedUrl(processed);
    } catch {
      setBrushOriginalUrl(dataUrl);
      setBrushProcessedUrl(dataUrl);
    } finally {
      setProcessingMsg(null);
    }
  }

  /** Reopen the brush on this card's cut, so a second visit continues the first. */
  function handleEditBgRemoval() {
    const source = isRank ? data.rankImageSource : data.imageSource;
    const cut = isRank ? data.rankImageCut : data.imageCut;
    if (!source || !cut) return;
    setBrushOriginalUrl(source);
    setBrushProcessedUrl(cut);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => processImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleFetch() {
    const trimmed = url.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch {
      setFetchError('Please enter a valid URL (https://…)');
      return;
    }
    setLoading(true);
    setFetchError(null);
    const result = await scrapeProductImages(trimmed);
    setScraped(result.images);
    setFetchError(result.error || null);
    setLoading(false);
    if (result.images.length > 0) setShowGallery(true);
  }

  async function handleGallerySelect(img: ScrapedImage) {
    setShowGallery(false);
    const proxied = getProxiedImageUrl(img.url);
    const dataUrl = await fetchAsDataUrl(proxied);
    if (!dataUrl) { setFetchError('Could not load image'); return; }
    processImage(dataUrl);
  }

  function handleBrushDone(result: string) {
    // Keep the pair the brush was opened with, so it can be reopened later.
    if (brushOriginalUrl) {
      set(isRank
        ? { rankImageSource: brushOriginalUrl, rankImageCut: result }
        : { imageSource: brushOriginalUrl, imageCut: result });
    }
    setBrushOriginalUrl(null);
    setBrushProcessedUrl(null);
    openFreshCrop(result);
  }

  function handleBrushCancel() {
    setBrushOriginalUrl(null);
    setBrushProcessedUrl(null);
  }

  async function handleEditCrop() {
    const original = isRank ? data.rankImageOriginal : data.imageOriginal;
    const fallback = isRank ? data.rankImage : data.image;
    const src = original ?? fallback;
    if (!src) return;
    setIsRecrop(true);
    if (!wideCrop) { setCropSrc(src); return; }
    const padded = await padToCropAspect(src, 485 / 290);
    setCropContentRatio(padded.contentWidthRatio);
    setCropSrc(padded.dataUrl);
  }

  function handleCropConfirm(cropped: string, cropState: CropState) {
    set(
      isRank
        ? { rankImage: cropped, rankImageOriginal: cropSrc, rankImageCrop: cropState }
        : { image: cropped, imageOriginal: cropSrc, imageCrop: cropState }
    );
    setCropSrc(null);
  }

  const activeCropState = isRecrop ? (isRank ? data.rankImageCrop : data.imageCrop) : null;

  return (
    <>
      <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <p className="text-[13px] font-bold text-gray-700 mb-3 pb-2 border-b border-gray-200">Card {index + 1}</p>

        {isRank && (
          <TextField
            label={t('Rank label')}
            value={data.rankLabel}
            onChange={handleRankLabelChange}
            placeholder={t('e.g. 1st')}
          />
        )}

        {/* Image */}
        <FieldLabel>{isRank ? 'Product Image' : 'Product/Feature Image'}</FieldLabel>
        <div className="mb-2">
          <div className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden shrink-0 bg-white group">
            {(isRank ? data.rankImage : data.image) ? (
              <>
                <img src={(isRank ? data.rankImage : data.image)!} alt="" className="w-full h-full object-contain" style={{ maxWidth: 'none' }} />
                <button
                  onClick={handleEditCrop}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="text-white text-[9px] font-medium leading-tight text-center">{t('Edit')}<br/>{t('Crop')}</span>
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
        </div>
        {!skipBgRemoval && (isRank ? data.rankImageSource && data.rankImageCut : data.imageSource && data.imageCut) && (
          <button
            type="button"
            onClick={handleEditBgRemoval}
            className="mt-1.5 mb-2 w-full flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M16.862 3.487a2.25 2.25 0 013.182 3.182L7.5 19.212 3 20.25l1.038-4.5L16.862 3.487z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('Edit background removal')}
          </button>
        )}
        <div className="flex flex-col gap-1.5 mb-2">
          <div className="flex gap-1">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleFetch(); }}
              placeholder={t('LG.com product URL')}
              className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
            />
            <button
              onClick={handleFetch}
              disabled={loading}
              className="text-xs px-2 py-1.5 rounded-md bg-[#FD312E] text-white shrink-0 disabled:opacity-50"
            >
              {loading ? '…' : t('Import')}
            </button>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
          >
            {t('Upload')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          {fetchError && <p className="text-[10px] text-red-500">{fetchError}</p>}
          {scraped.length > 0 && !showGallery && (
            <button onClick={() => setShowGallery(true)} className="text-[11px] text-[#FD312E] underline text-left">
              {t('Change from imported images')}
            </button>
          )}
        </div>

        {/* Hidden rulers */}
        <div ref={modelRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: textWidth, fontSize: 34, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, lineHeight: 1.1, fontFamily: STORE_NAME_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
        <div ref={featuresRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: textWidth, fontSize: 24, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, lineHeight: 1.1, fontFamily: STORE_NAME_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
        <div ref={origPriceRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 24, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
        <div ref={salePriceRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 56, letterSpacing: 'var(--obs-tracking-head)', fontWeight: 700, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
        <div ref={discountRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 700, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
        <div ref={rankLabelRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 180, letterSpacing: 'var(--obs-tracking)', fontWeight: 700, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />

        <TextAreaField label={t('Product name (4 lines max)')} value={data.modelName} onChange={handleModelNameChange} rows={2} />
        <TextAreaField label={t('Key feature (3 lines max)')} value={data.features} onChange={handleFeaturesChange} rows={3} />
        {showPrice && (
          <>
            <div className={`mb-3 ${data.showSalePrice ? '' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center justify-between mb-1">
                <FieldLabel>{t('Original price')}</FieldLabel>
                {showPriceToggles && <ShowToggle checked={data.showOriginalPrice && data.showSalePrice} onChange={v => set({ showOriginalPrice: v })} />}
              </div>
              {data.showOriginalPrice && data.showSalePrice && (
                <input type="text" value={data.originalPrice} onChange={e => handleOrigPriceChange(e.target.value)} placeholder={t('e.g. $1,499')} className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white" />
              )}
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <FieldLabel>{t('Sale price')}</FieldLabel>
                {showPriceToggles && <ShowToggle checked={data.showSalePrice} onChange={v => set({ showSalePrice: v })} />}
              </div>
              {data.showSalePrice && (
                <input type="text" value={data.salePrice} onChange={e => handleSalePriceChange(e.target.value)} placeholder={t('e.g. $999')} className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white" />
              )}
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <FieldLabel>{t('Discount %')}</FieldLabel>
                {showPriceToggles && <ShowToggle checked={data.showDiscountPercent} onChange={v => set({ showDiscountPercent: v })} />}
              </div>
              {data.showDiscountPercent && (
                <input type="text" value={data.discountPercent} onChange={e => handleDiscountChange(e.target.value)} placeholder={t('e.g. 33%')} className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white" />
              )}
            </div>
          </>
        )}
      </div>

      {showGallery && (
        <ImageGalleryModal
          images={scraped}
          isLoading={loading}
          error={fetchError}
          onSelect={handleGallerySelect}
          onCancel={() => setShowGallery(false)}
          whiteBackgroundOnly={isRank}
        />
      )}
      {processingMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl px-6 py-5 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#FD312E] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-800">{t(processingMsg)}</p>
          </div>
        </div>
      )}
      {!skipBgRemoval && brushOriginalUrl !== null && brushProcessedUrl !== null && (
        <BrushMaskEditor
          originalUrl={brushOriginalUrl}
          processedUrl={brushProcessedUrl}
          onDone={handleBrushDone}
          onCancel={handleBrushCancel}
        />
      )}
      {cropSrc !== null && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={wideCrop ? 485 / 290 : 1}
          title={t('Product/Feature Image')}
          minZoom={0.3}
          {...(wideCrop
            ? { cropFrameOverlay: PRODUCT_CARD_CROP_GUIDE, treatUnknownAspectAsStale: true, fitFrameWidth: true, fitWidthContentRatio: cropContentRatio }
            : { cropSize: { width: 380, height: 380 } })}
          {...(activeCropState ? { initialZoom: activeCropState.zoom, initialCrop: activeCropState.crop, initialAspect: activeCropState.aspect } : {})}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </>
  );
}

const KV_PRODUCT_LIST_VARIANTS = ['Price/Feature ver.', 'Rank ver.'] as const;

function KvProductListPanel({
  data,
  onUpdate,
}: {
  data: KvProductListState;
  onUpdate: (d: KvProductListState) => void;
}) {
  const t = useT();
  const set = (p: Partial<KvProductListState>) => onUpdate({ ...data, ...p });
  const isPriceVer = data.variant === 'Price/Feature ver.';
  const updateProduct = (idx: number, item: ProductCardItem) => {
    if (isPriceVer) {
      const products = [...data.products];
      products[idx] = item;
      set({ products });
    } else {
      const rankProducts = [...(data.rankProducts ?? data.products)];
      rankProducts[idx] = item;
      set({ rankProducts });
    }
  };

  const kvFileRef = useRef<HTMLInputElement>(null);
  const [kvUrl, setKvUrl] = useState('');
  const [kvLoading, setKvLoading] = useState(false);
  const [kvError, setKvError] = useState<string | null>(null);
  const [kvScraped, setKvScraped] = useState<ScrapedImage[]>([]);
  const [showKvGallery, setShowKvGallery] = useState(false);
  const [kvCropSrc, setKvCropSrc] = useState<string | null>(null);
  const [kvCropContentRatio, setKvCropContentRatio] = useState(1);
  const [isKvRecrop, setIsKvRecrop] = useState(false); // true = "Edit Crop" (resume framing); false = fresh crop after upload

  function handleKvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setIsKvRecrop(false);
      const padded = await padToCropAspect(reader.result as string, KV_IMG_ASPECT);
      setKvCropContentRatio(padded.contentWidthRatio);
      setKvCropSrc(padded.dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleKvFetch() {
    const url = kvUrl.trim();
    if (!url) return;
    try { new URL(url); } catch {
      setKvError('Please enter a valid URL (https://…)');
      return;
    }
    setKvLoading(true);
    setKvError(null);
    const result = await scrapeProductImages(url);
    setKvScraped(result.images);
    setKvError(result.error || null);
    setKvLoading(false);
    if (result.images.length > 0) setShowKvGallery(true);
  }

  async function handleKvGallerySelect(scraped: ScrapedImage) {
    setShowKvGallery(false);
    const proxied = getProxiedImageUrl(scraped.url);
    const dataUrl = await fetchAsDataUrl(proxied);
    if (!dataUrl) return;
    setIsKvRecrop(false);
    const padded = await padToCropAspect(dataUrl, KV_IMG_ASPECT);
    setKvCropContentRatio(padded.contentWidthRatio);
    setKvCropSrc(padded.dataUrl);
  }

  async function handleKvEditCrop() {
    const src = data.kvImageOriginal ?? data.kvImage;
    if (!src) return;
    setIsKvRecrop(true);
    const padded = await padToCropAspect(src, KV_IMG_ASPECT);
    setKvCropContentRatio(padded.contentWidthRatio);
    setKvCropSrc(padded.dataUrl);
  }

  const activeProducts = isPriceVer ? data.products : (data.rankProducts ?? data.products);

  return (
    <div>
      {/* Product Card Type — 2-col grid matching Background Option style */}
      <div className="mb-4">
        <FieldLabel>{t('Product card type')}</FieldLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {KV_PRODUCT_LIST_VARIANTS.map(v => {
            const active = data.variant === v;
            return (
              <button
                key={v}
                onClick={() => set({ variant: v })}
                className={`py-2.5 rounded-xl text-xs font-medium transition-all border-2 bg-white ${
                  active ? 'border-[#FD312E] text-[#FD312E]' : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {t(v)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center mb-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Campaign logo with LG logo')}</p>
          <div className="ml-auto">
            <ShowToggle checked={data.showCampaignLogo} onChange={v => set({ showCampaignLogo: v })} />
          </div>
        </div>
        {data.showCampaignLogo && (
          <ImageUploader
            label={t('Campaign logo (H 40px / W Auto)')}
            value={data.campaignLogo}
            onChange={v => set({ campaignLogo: v })}
            noCrop
            transform={autoCropToContent}
            objectFit="contain"
          />
        )}
      </div>

      <TextAreaField
        label={t('Head copy')}
        value={data.headline}
        onChange={v => set({ headline: v })}
        rows={3}
      />

      {/* KV image — fetch + upload + crop */}
      <div className="mb-3">
        <FieldLabel>{t('KV image (1200×800)')}</FieldLabel>
        <div className="flex gap-2 mb-1.5">
          <div className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden shrink-0 bg-gray-50 group">
            {data.kvImage ? (
              <>
                <img src={data.kvImage} alt="" className="w-full h-full object-cover" style={{ maxWidth: 'none' }} />
                <button
                  onClick={handleKvEditCrop}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="text-white text-[9px] font-medium leading-tight text-center">{t('Edit')}<br />{t('Crop')}</span>
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex gap-1">
              <input
                type="text"
                value={kvUrl}
                onChange={e => setKvUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleKvFetch(); }}
                placeholder={t('LG.com product URL')}
                className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
              />
              <button
                onClick={handleKvFetch}
                disabled={kvLoading}
                className="text-xs px-2 py-1.5 rounded-md bg-[#FD312E] text-white shrink-0 disabled:opacity-50"
              >
                {kvLoading ? '…' : t('Import')}
              </button>
            </div>
            <button
              onClick={() => kvFileRef.current?.click()}
              className="w-full text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
            >
              {t('Upload')}
            </button>
            <input ref={kvFileRef} type="file" accept="image/*" className="hidden" onChange={handleKvUpload} />
            {kvError && <p className="text-[10px] text-red-500">{kvError}</p>}
            {kvScraped.length > 0 && !showKvGallery && (
              <button onClick={() => setShowKvGallery(true)} className="text-[11px] text-[#FD312E] underline text-left">
                {t('Change from imported images')}
              </button>
            )}
          </div>
        </div>
      </div>

      <SectionDivider>{t('Product cards (3)')}</SectionDivider>

      {activeProducts.map((p, i) => (
        <ProductCardEditor
          key={i}
          index={i}
          data={p}
          showPrice={isPriceVer}
          skipBgRemoval={isPriceVer}
          isRank={!isPriceVer}
          showPriceToggles={isPriceVer}
          onUpdate={item => updateProduct(i, item)}
        />
      ))}

      {showKvGallery && (
        <ImageGalleryModal
          images={kvScraped}
          isLoading={kvLoading}
          error={kvError}
          lifestyleOnly
          onSelect={handleKvGallerySelect}
          onCancel={() => setShowKvGallery(false)}
        />
      )}

      {kvCropSrc && (
        <ImageCropModal
          imageSrc={kvCropSrc}
          aspectRatio={KV_IMG_ASPECT}
          title={t('KV image')}
          minZoom={0.3}
          treatUnknownAspectAsStale
          fitFrameWidth
          fitWidthContentRatio={kvCropContentRatio}
          {...(isKvRecrop && data.kvImageCrop ? { initialZoom: data.kvImageCrop.zoom, initialCrop: data.kvImageCrop.crop, initialAspect: data.kvImageCrop.aspect } : {})}
          onConfirm={(cropped, cropState) => { set({ kvImage: cropped, kvImageOriginal: kvCropSrc, kvImageCrop: cropState }); setKvCropSrc(null); }}
          onCancel={() => setKvCropSrc(null)}
        />
      )}
    </div>
  );
}

function CategoryImageEditor({
  cat,
  onUpdate,
}: {
  cat: CategoryItem;
  onUpdate: (item: CategoryItem) => void;
}) {
  const t = useT();
  const set = (p: Partial<CategoryItem>) => onUpdate({ ...cat, ...p });
  const fileRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scraped, setScraped] = useState<ScrapedImage[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [processingMsg, setProcessingMsg] = useState<string | null>(null);
  const [brushOriginalUrl, setBrushOriginalUrl] = useState<string | null>(null);
  const [brushProcessedUrl, setBrushProcessedUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isRecrop, setIsRecrop] = useState(false); // true = "Edit Crop" (resume framing); false = fresh crop after upload

  async function processAndBrush(dataUrl: string) {
    setProcessingMsg('Loading AI model…');
    try {
      const processed = await removeBackgroundAI(dataUrl, setProcessingMsg);
      setBrushOriginalUrl(dataUrl);
      setBrushProcessedUrl(processed);
    } catch {
      setBrushOriginalUrl(dataUrl);
      setBrushProcessedUrl(dataUrl);
    } finally {
      setProcessingMsg(null);
    }
  }

  /** Reopen the brush on this image's cut, so a second visit continues the first. */
  function handleEditBgRemoval() {
    if (!cat.imageSource || !cat.imageCut) return;
    setBrushOriginalUrl(cat.imageSource);
    setBrushProcessedUrl(cat.imageCut);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => processAndBrush(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleFetch() {
    const trimmed = url.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch {
      setFetchError('Please enter a valid URL (https://…)');
      return;
    }
    setLoading(true);
    setFetchError(null);
    const result = await scrapeProductImages(trimmed);
    setScraped(result.images);
    setFetchError(result.error || null);
    setLoading(false);
    if (result.images.length > 0) setShowGallery(true);
  }

  async function handleGallerySelect(img: ScrapedImage) {
    setShowGallery(false);
    const proxied = getProxiedImageUrl(img.url);
    const dataUrl = await fetchAsDataUrl(proxied);
    if (!dataUrl) { setFetchError('Could not load image'); return; }
    processAndBrush(dataUrl);
  }

  function handleBrushDone(result: string) {
    // Keep the pair the brush was opened with, so it can be reopened later.
    if (brushOriginalUrl) set({ imageSource: brushOriginalUrl, imageCut: result });
    setBrushOriginalUrl(null);
    setBrushProcessedUrl(null);
    setIsRecrop(false);
    setCropSrc(result);
  }

  function handleBrushCancel() {
    setBrushOriginalUrl(null);
    setBrushProcessedUrl(null);
  }

  function handleEditCrop() {
    const src = cat.imageOriginal ?? cat.image;
    if (!src) return;
    setIsRecrop(true);
    setCropSrc(src);
  }

  function handleCropConfirm(cropped: string, cropState: CropState) {
    set({ image: cropped, imageOriginal: cropSrc, imageCrop: cropState });
    setCropSrc(null);
  }

  const activeCropState = isRecrop ? cat.imageCrop : null;

  return (
    <>
      <FieldLabel>{t('Product image')}</FieldLabel>
      <div className="flex gap-2 mb-2">
        <div className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden shrink-0 bg-white group">
          {cat.image ? (
            <>
              <img src={cat.image} alt="" className="w-full h-full object-contain" style={{ maxWidth: 'none' }} />
              <button
                onClick={handleEditCrop}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-white text-[9px] font-medium leading-tight text-center">{t('Edit')}<br />{t('Crop')}</span>
              </button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex gap-1">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleFetch(); }}
              placeholder={t('LG.com product URL')}
              className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
            />
            <button
              onClick={handleFetch}
              disabled={loading}
              className="text-xs px-2 py-1.5 rounded-md bg-[#FD312E] text-white shrink-0 disabled:opacity-50"
            >
              {loading ? '…' : t('Import')}
            </button>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
          >
            {t('Upload')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          {fetchError && <p className="text-[10px] text-red-500">{fetchError}</p>}
          {scraped.length > 0 && !showGallery && (
            <button onClick={() => setShowGallery(true)} className="text-[11px] text-[#FD312E] underline text-left">
              {t('Change from imported images')}
            </button>
          )}
          {cat.imageSource && cat.imageCut && (
            <button
              type="button"
              onClick={handleEditBgRemoval}
              className="w-full flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M16.862 3.487a2.25 2.25 0 013.182 3.182L7.5 19.212 3 20.25l1.038-4.5L16.862 3.487z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t('Edit background removal')}
            </button>
          )}
        </div>
      </div>

      {showGallery && (
        <ImageGalleryModal
          images={scraped}
          isLoading={loading}
          error={fetchError}
          onSelect={handleGallerySelect}
          onCancel={() => setShowGallery(false)}
          whiteBackgroundOnly
        />
      )}

      {processingMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl px-6 py-5 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#FD312E] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-800">{t(processingMsg)}</p>
          </div>
        </div>
      )}

      {brushOriginalUrl !== null && brushProcessedUrl !== null && (
        <BrushMaskEditor
          originalUrl={brushOriginalUrl}
          processedUrl={brushProcessedUrl}
          onDone={handleBrushDone}
          onCancel={handleBrushCancel}
        />
      )}

      {cropSrc !== null && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={1}
          title={t('Product image')}
          minZoom={0.3}
          cropSize={{ width: 380, height: 380 }}
          {...(activeCropState ? { initialZoom: activeCropState.zoom, initialCrop: activeCropState.crop } : {})}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </>
  );
}

const CATEGORY_TITLE_MAX_W = 1120; // 1200 - 40×2 padding
const CAT_MIN = 3;
const CAT_MAX = 5;

function CategoryListPanel({
  data,
  onUpdate,
}: {
  data: CategoryListState;
  onUpdate: (d: CategoryListState) => void;
}) {
  const t = useT();
  const set = (p: Partial<CategoryListState>) => onUpdate({ ...data, ...p });
  const titleRulerRef = useRef<HTMLDivElement>(null);
  const nameRulerRef = useRef<HTMLDivElement>(null);
  const updateCat = (idx: number, item: CategoryItem) => {
    const categories = [...data.categories];
    categories[idx] = item;
    set({ categories });
  };

  function handleCountChange(count: number) {
    if (count === data.categories.length) return;
    if (count < data.categories.length) {
      set({ categories: data.categories.slice(0, count) });
      return;
    }
    // Restore the curated default set by position when growing back up.
    const extra: CategoryItem[] = [];
    for (let n = data.categories.length; n < count; n++) {
      const fromDefault = catDefaultCategories(t)[n];
      extra.push(fromDefault ? { ...fromDefault } : { image: null, name: t('New category') });
    }
    set({ categories: [...data.categories, ...extra] });
  }

  // Section title: single line, block at container width
  function handleTitleChange(v: string) {
    const el = titleRulerRef.current;
    if (el) {
      el.textContent = v || ' ';
      if (el.getBoundingClientRect().width > CATEGORY_TITLE_MAX_W) return;
    }
    set({ sectionTitle: v });
  }

  // Name: max 2 lines at 30px / 1.1 within 180px column
  function handleNameChange(idx: number, cat: CategoryItem, v: string) {
    const el = nameRulerRef.current;
    if (el) {
      el.textContent = v || '​';
      if (el.getBoundingClientRect().height > 66) return;
    }
    updateCat(idx, { ...cat, name: v });
  }

  return (
    <div>
      <div
        ref={titleRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          fontSize: 52, letterSpacing: 'var(--obs-tracking-head)', fontWeight: 600, fontFamily: STORE_NAME_FONT,
          whiteSpace: 'nowrap',
          visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none',
        }}
      />
      <div
        ref={nameRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          width: 180, fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, lineHeight: 1.1,
          fontFamily: STORE_NAME_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none',
        }}
      />
      <TextField
        label={t('Section title')}
        value={data.sectionTitle}
        onChange={handleTitleChange}
      />
      <div className="mb-3">
        <FieldLabel>{t('Number of categories')}</FieldLabel>
        <div className="flex gap-1">
          {Array.from({ length: CAT_MAX - CAT_MIN + 1 }, (_, k) => CAT_MIN + k).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handleCountChange(n)}
              className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${
                data.categories.length === n
                  ? 'bg-[#FD312E] border-[#FD312E] text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <SectionDivider>{t('Categories')}</SectionDivider>
      {data.categories.map((cat, i) => (
        <div key={i} className="pt-1 pb-3 border-b border-gray-100 last:border-0">
          <p className="text-[11px] font-semibold text-gray-500 mb-2">Category {i + 1}</p>
          <CategoryImageEditor cat={cat} onUpdate={item => updateCat(i, item)} />
          <TextField
            label={t('Name (2 lines max)')}
            value={cat.name}
            onChange={v => handleNameChange(i, cat, v)}
          />
        </div>
      ))}
    </div>
  );
}

const PRODUCT_CARDS_VARIANTS = ['Price/Feature ver.', 'Rank ver.'] as const;
const PRODUCT_CARDS_TITLE_DEFAULTS: Record<ProductCardsVariant, string> = {
  'Price/Feature ver.': 'Promotion name',
  'Rank ver.': 'Our Best Sellers',
};

function ProductCardsPanel({
  data,
  onUpdate,
}: {
  data: ProductCardsState;
  onUpdate: (d: ProductCardsState) => void;
}) {
  const t = useT();
  const set = (p: Partial<ProductCardsState>) => onUpdate({ ...data, ...p });
  const isPriceVer = data.variant === 'Price/Feature ver.';
  const titleRulerRef = useRef<HTMLDivElement>(null);
  const periodRulerRef = useRef<HTMLDivElement>(null);
  const ctaRulerRef = useRef<HTMLDivElement>(null);

  const updateProduct = (idx: number, item: ProductCardItem) => {
    if (isPriceVer) {
      const products = [...data.products];
      products[idx] = item;
      set({ products });
    } else {
      const rankProducts = [...(data.rankProducts ?? data.products)];
      rankProducts[idx] = item;
      set({ rankProducts });
    }
  };

  function blockByWidth(el: HTMLDivElement | null, v: string, maxW: number): boolean {
    if (!el) return false;
    el.textContent = v || ' ';
    return el.getBoundingClientRect().width > maxW;
  }

  // Swap the head copy example when switching variants, unless the user already customized it
  function handleVariantChange(v: ProductCardsVariant) {
    const isUntouched = data.sectionTitle === t(PRODUCT_CARDS_TITLE_DEFAULTS['Price/Feature ver.']) || data.sectionTitle === t(PRODUCT_CARDS_TITLE_DEFAULTS['Rank ver.']) || !data.sectionTitle;
    set({ variant: v, sectionTitle: isUntouched ? t(PRODUCT_CARDS_TITLE_DEFAULTS[v]) : data.sectionTitle });
  }

  function handleCountChange(count: number) {
    const current = isPriceVer ? data.products : (data.rankProducts ?? data.products);
    if (count === current.length) return;
    if (count < current.length) {
      set(isPriceVer ? { products: current.slice(0, count) } : { rankProducts: current.slice(0, count) });
      return;
    }
    const extra: ProductCardItem[] = [];
    for (let i = current.length; i < count; i++) {
      extra.push(isPriceVer ? productCardDefaultItem(t, i) : rankCardDefaultItem(t, i));
    }
    set(isPriceVer ? { products: [...current, ...extra] } : { rankProducts: [...current, ...extra] });
  }

  const activeProducts = isPriceVer ? data.products : (data.rankProducts ?? data.products);
  // Mirrors ProductCardsTemplate, where every row flex-fills the 1120 content
  // width: 2 per row → 545 outer − 60 padding = 485; 3 per row → 353.33 − 60 = 293.
  const cardCols = activeProducts.length === 3 || activeProducts.length === 6 ? 3 : 2;
  const cardTextWidth = cardCols === 2 ? 485 : 293;

  return (
    <div>
      {/* Hidden rulers */}
      <div ref={titleRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 52, letterSpacing: 'var(--obs-tracking-head)', fontWeight: 600, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={periodRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 36, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={ctaRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 32, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />

      {/* Product card type — 2-col grid matching KV+Product list style */}
      <div className="mb-4">
        <FieldLabel>{t('Product card type')}</FieldLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {PRODUCT_CARDS_VARIANTS.map(v => {
            const active = data.variant === v;
            return (
              <button
                key={v}
                onClick={() => handleVariantChange(v as ProductCardsVariant)}
                className={`py-2.5 rounded-xl text-xs font-medium transition-all border-2 bg-white ${
                  active ? 'border-[#FD312E] text-[#FD312E]' : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {t(v)}
              </button>
            );
          })}
        </div>
      </div>

      <TextField
        label={t('Head copy')}
        value={data.sectionTitle}
        onChange={v => { if (!blockByWidth(titleRulerRef.current, v, 908)) set({ sectionTitle: v }); }}
      />
      {isPriceVer && (
        <div className="mb-3">
          <div className="flex items-center mb-1.5">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy')}</p>
            <div className="ml-auto">
              <ShowToggle checked={data.showPeriod} onChange={v => set({ showPeriod: v })} />
            </div>
          </div>
          {data.showPeriod && (
            <input
              type="text"
              value={data.period}
              onChange={e => { const v = e.target.value; if (!blockByWidth(periodRulerRef.current, v, 908)) set({ period: v }); }}
              placeholder="2026.00.00-00.00"
              className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
            />
          )}
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-center mb-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('CTA button')}</p>
          <div className="ml-auto">
            <ShowToggle checked={data.showCta} onChange={v => set({ showCta: v })} />
          </div>
        </div>
        {data.showCta && (
          <input
            type="text"
            value={data.ctaText}
            onChange={e => { const v = e.target.value; if (!blockByWidth(ctaRulerRef.current, v, 1000)) set({ ctaText: v }); }}
            placeholder={t('Check out more products')}
            className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
          />
        )}
      </div>

      <div className="mb-3">
        <FieldLabel>{t('Number of cards')}</FieldLabel>
        <div className="flex gap-1">
          {PRODUCT_CARD_COUNTS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handleCountChange(n)}
              className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${
                activeProducts.length === n
                  ? 'bg-[#FD312E] border-[#FD312E] text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <SectionDivider>{t('Product cards')} ({activeProducts.length})</SectionDivider>
      {activeProducts.map((p, i) => (
        <ProductCardEditor
          key={i}
          index={i}
          data={p}
          showPrice={isPriceVer}
          skipBgRemoval={isPriceVer}
          isRank={!isPriceVer}
          showPriceToggles={isPriceVer}
          textWidth={cardTextWidth}
          priceRow={cardCols === 2}
          wideCrop
          onUpdate={item => updateProduct(i, item)}
        />
      ))}
    </div>
  );
}

// ── Banner (1200×628) — revised light layout ──────────────────────────────────
// Product ver. reuses the Other Promotions "promotion theme" system (example
// banners, image bg color, background text, theme objects, plus sign, product
// images w/ fetch/upload/AI bg-removal + drag/resize) rendered in the light
// layout. Lifestyle ver. = rounded 500×548 shape-masked photo w/ fetch/upload/
// crop + drag/zoom. Image positioning happens in a modal opened from the panel.

const BANNER_VARIANTS = ['Product ver.', 'Lifestyle ver.'] as const;
const BANNER_LS_ASPECT = 500 / 548;

// Image editor modal (Product ver.) — full editor: live preview (drag/resize/
// rotate the image-section contents) on the left, the "Image background color"
// → "Product images" controls (everything the live Other Promotions system
// offers for this) on the right. Opened by clicking the image area in the
// center canvas, or the "Click to edit image" button in the EP.
export const BANNER_IMG_SEC = { left: 661, top: 40, width: 500, height: 548 };
const BANNER_IMG_MARGIN = 50;
const BANNER_IMG_SCALE = 1.0;

export function BannerImageLayoutModal({
  themeState,
  onChange,
  onClose,
}: {
  themeState: OtherPromoThemeState;
  onChange: (s: OtherPromoThemeState) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const winLeft = BANNER_IMG_SEC.left - BANNER_IMG_MARGIN;
  const winTop = BANNER_IMG_SEC.top - BANNER_IMG_MARGIN;
  const winW = BANNER_IMG_SEC.width + BANNER_IMG_MARGIN * 2;
  const winH = BANNER_IMG_SEC.height + BANNER_IMG_MARGIN * 2;
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 960, maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <p className="text-sm font-semibold text-gray-800">{t('Edit banner image')}</p>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm bg-[#FD312E] text-white hover:bg-[#E22825] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Done
          </button>
        </div>
        <div className="flex flex-1 min-h-0">
          {/* Left — live preview, drag/resize/rotate */}
          <div className="flex items-center justify-center p-5 shrink-0" style={{ background: '#CBC8C2' }}>
            <div style={{ width: winW * BANNER_IMG_SCALE, height: winH * BANNER_IMG_SCALE, position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  width: 1200,
                  height: 628,
                  transform: `scale(${BANNER_IMG_SCALE}) translate(${-winLeft}px, ${-winTop}px)`,
                  transformOrigin: 'top left',
                }}
              >
                <OtherPromoThemeTemplate
                  state={themeState}
                  light
                  imageSectionOverlay={
                    <PlacedImageOverlay
                      themeState={themeState}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      previewScale={BANNER_IMG_SCALE}
                      onChange={onChange}
                    />
                  }
                />
              </div>
            </div>
          </div>
          {/* Right — Image background color → Product images controls */}
          <div className="flex-1 min-w-0 overflow-y-auto border-l border-gray-100">
            <PromotionEditPanel
              state={themeState}
              onChange={onChange}
              selectedImageId={selectedId}
              onSelectImage={setSelectedId}
              showReset={false}
              sections="image"
              autoCropContent
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Cropping always re-runs against the ORIGINAL (uncropped) source, not the
// previous crop's output — react-easy-crop's crop/zoom values are meaningful
// only relative to that specific image's pixel dimensions, so re-cropping the
// (smaller, aspect-locked) already-cropped output with stale coordinates would
// be nonsensical. See bigPromoCommon.tsx's ImageUploadField for the same
// originalSource/cropState pattern.
function BannerLifestylePanel({
  state,
  onChange,
}: {
  state: OtherPromoLifestyleState;
  onChange: (s: OtherPromoLifestyleState) => void;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const headRulerRef = useRef<HTMLDivElement>(null);
  const subRulerRef = useRef<HTMLDivElement>(null);
  const ctaRulerRef = useRef<HTMLSpanElement>(null);
  const disclaimerRulerRef = useRef<HTMLDivElement>(null);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scraped, setScraped] = useState<ScrapedImage[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [isRecrop, setIsRecrop] = useState(false);

  function patch<K extends keyof OtherPromoLifestyleState>(key: K, value: OtherPromoLifestyleState[K]) {
    onChange({ ...state, [key]: value });
  }
  function countLines(ref: React.RefObject<HTMLDivElement | null>, value: string, lineH: number): number {
    const r = ref.current;
    if (!r) return 0;
    r.textContent = value || ' ';
    return Math.round(r.getBoundingClientRect().height / lineH);
  }
  function tryUpdateHead(v: string) { if (v.split('\n').length > 4) return; if (countLines(headRulerRef, v, 60 * 1.12) > 4) return; patch('headCopy', v); }
  function tryUpdateSub(v: string) { if (v.split('\n').length > 2) return; if (countLines(subRulerRef, v, 30 * 1.1) > 2) return; patch('subCopy', v); }
  function tryUpdateCta(v: string) { const r = ctaRulerRef.current; if (r) { r.textContent = v || ' '; if (r.getBoundingClientRect().width > 456) return; } patch('ctaText', v); }
  function tryUpdateDisclaimer(v: string) { if (v.split('\n').length > 2) return; if (countLines(disclaimerRulerRef, v, 18 * 1.1) > 2) return; patch('disclaimerText', v); }

  function startFreshCrop(dataUrl: string) {
    setIsRecrop(false);
    setPendingSrc(dataUrl);
  }
  function handleEditCrop() {
    const src = state.imageSrcOriginal ?? state.imageSrc;
    if (!src) return;
    setIsRecrop(true);
    setPendingSrc(src);
  }
  // Derives the crop tool's initial framing directly from the CURRENTLY
  // DISPLAYED placement (box-relative imageX/Y/width/height), so "Edit Crop"
  // always matches the real current state — not a possibly-stale memo of the
  // last confirmed crop. bcx/bcy/zoom are scale-invariant ratios (see
  // ImageCropModal's computeInitialFraming doc) so no knowledge of the crop
  // tool's own internal canvas size is needed here.
  function computeInitialFraming(naturalW: number, naturalH: number) {
    const coverScale = Math.max(BANNER_LS_BOX.width / naturalW, BANNER_LS_BOX.height / naturalH);
    const zoom = Math.min(3, Math.max(1, state.imageWidth / (naturalW * coverScale)));
    const bcx = (BANNER_LS_BOX.width / 2 - state.imageX) / state.imageWidth;
    const bcy = (BANNER_LS_BOX.height / 2 - state.imageY) / state.imageHeight;
    return { bcx, bcy, zoom };
  }
  function handleCropConfirm(cropped: string) {
    // Cropped to the 500×548 aspect → place at zoom 1 so the whole crop fills
    // the shape exactly (framing is done in the crop step, not by drag/zoom).
    onChange({ ...state, imageSrc: cropped, imageSrcOriginal: pendingSrc, ...bannerLifestylePlacement(1) });
    setPendingSrc(null);
  }
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => startFreshCrop(reader.result as string);
    reader.readAsDataURL(file);
  }
  async function handleFetch() {
    const trimmed = url.trim(); if (!trimmed) return;
    try { new URL(trimmed); } catch { setFetchError('Please enter a valid URL (https://…)'); return; }
    setLoading(true); setFetchError(null);
    const result = await scrapeProductImages(trimmed);
    setScraped(result.images); setFetchError(result.error || null); setLoading(false);
    if (result.images.length > 0) setShowGallery(true);
  }
  async function handleGallerySelect(img: ScrapedImage) {
    setShowGallery(false);
    const dataUrl = await fetchAsDataUrl(getProxiedImageUrl(img.url));
    if (!dataUrl) { setFetchError('Could not load image'); return; }
    startFreshCrop(dataUrl);
  }

  const rulerBase: React.CSSProperties = {
    position: 'fixed', top: -9999, left: -9999, fontFamily: STORE_NAME_FONT,
    visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  };

  return (
    <div className="px-5">
      <div ref={headRulerRef} style={{ ...rulerBase, width: 560, fontSize: 60, letterSpacing: 'var(--obs-tracking-head)', fontWeight: 600, lineHeight: 1.12 }} />
      <div ref={subRulerRef} style={{ ...rulerBase, width: 560, fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, lineHeight: 1.1 }} />
      <span ref={ctaRulerRef} style={{ ...rulerBase, whiteSpace: 'nowrap', fontSize: 32, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, lineHeight: 1.2 }} />
      <div ref={disclaimerRulerRef} style={{ ...rulerBase, width: 561, fontSize: 18, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, lineHeight: 1.1 }} />

      <div className="mb-3">
        <FieldLabel>{t('Head copy (4 lines max)')}</FieldLabel>
        <textarea value={state.headCopy} onChange={e => tryUpdateHead(e.target.value)} rows={3}
          className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:border-[#FD312E]" />
      </div>
      <div className="mb-3">
        <div className="flex items-center mb-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy')}</p>
          <div className="ml-auto"><ShowToggle checked={state.showSubCopy} onChange={v => patch('showSubCopy', v)} /></div>
        </div>
        {state.showSubCopy && (
          <textarea value={state.subCopy} onChange={e => tryUpdateSub(e.target.value)} rows={2}
            className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:border-[#FD312E]" />
        )}
      </div>
      <div className="mb-3">
        <FieldLabel>{t('CTA copy')}</FieldLabel>
        <input type="text" value={state.ctaText} onChange={e => tryUpdateCta(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white" />
      </div>
      <div className="mb-3">
        <div className="flex items-center mb-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Disclaimer')}</p>
          <div className="ml-auto"><ShowToggle checked={state.showDisclaimer} onChange={v => patch('showDisclaimer', v)} /></div>
        </div>
        {state.showDisclaimer && (
          <textarea value={state.disclaimerText} onChange={e => tryUpdateDisclaimer(e.target.value)} rows={2}
            className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:border-[#FD312E]" />
        )}
      </div>

      <div className="mb-3">
        <FieldLabel>{t('Lifestyle image')}</FieldLabel>
        <div className="flex gap-2 mb-1.5">
          <div className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden shrink-0 bg-gray-50 group">
            {state.imageSrc ? (
              <>
                <img src={state.imageSrc} alt="" className="w-full h-full object-cover" style={{ maxWidth: 'none' }} />
                <button
                  onClick={handleEditCrop}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="text-white text-[9px] font-medium leading-tight text-center">{t('Edit')}<br />{t('Crop')}</span>
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex gap-1">
              <input type="text" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleFetch(); }}
                placeholder={t('LG.com product URL')}
                className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white" />
              <button onClick={handleFetch} disabled={loading} className="text-xs px-2 py-1.5 rounded-md bg-[#FD312E] text-white shrink-0 disabled:opacity-50">{loading ? '…' : t('Import')}</button>
            </div>
            <button onClick={() => fileRef.current?.click()} className="w-full text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors">{t('Upload')}</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {fetchError && <p className="text-[10px] text-red-500">{fetchError}</p>}
            {scraped.length > 0 && !showGallery && (
              <button onClick={() => setShowGallery(true)} className="text-[11px] text-[#FD312E] underline text-left">{t('Change from imported images')}</button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-400">{t('Hover the thumbnail and click Edit Crop to reframe the shape.')}</p>
      </div>

      {showGallery && (
        <ImageGalleryModal images={scraped} isLoading={loading} error={fetchError} onSelect={handleGallerySelect} onCancel={() => setShowGallery(false)} />
      )}
      {pendingSrc && (
        <ImageCropModal
          imageSrc={pendingSrc}
          aspectRatio={BANNER_LS_ASPECT}
          title={t('Lifestyle image')}
          computeInitialFraming={isRecrop ? computeInitialFraming : undefined}
          onConfirm={handleCropConfirm}
          onCancel={() => setPendingSrc(null)}
        />
      )}
    </div>
  );
}

function BannerPresetStrip({ state, onChange }: { state: OtherPromoThemeState; onChange: (s: OtherPromoThemeState) => void }) {
  const t = useT();
  return (
    <div className="mb-4">
      <FieldLabel>{t('Example banners')}</FieldLabel>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {makePromotionPresets(t).map(preset => {
          const isActive = state.activePresetId === preset.id;
          const presetState = applyPreset(state, preset);
          return (
            <button key={preset.id} type="button" onClick={() => onChange(presetState)}
              className="group flex-shrink-0 relative overflow-hidden rounded-md border"
              style={{ width: 130, height: (130 * 628) / 1200, borderColor: isActive ? '#FD312E' : '#e5e7eb' }}>
              <div style={{ width: 1200, height: 628, transform: `scale(${130 / 1200})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                <OtherPromoThemeTemplate state={presetState} light />
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-center px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 500, lineHeight: '14px' }}>
                {preset.label}
              </div>
              {isActive && <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px #FD312E' }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Numbered slide pills plus add and delete — one Banner canvas item is a
 *  carousel GROUP of up to BANNER_SLIDE_MAX slides (editStates.ts
 *  BannerGroupState). The active-slide index is shared with the canvas
 *  preview's arrows, lifted to StorePageModulesBuilder so both stay in sync. */
function BannerSlidePicker({
  count,
  activeIndex,
  onSelect,
  onAdd,
  onDelete,
}: {
  count: number;
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`w-7 h-7 shrink-0 rounded-md text-xs font-medium border-2 transition-colors bg-white ${
            i === activeIndex ? 'border-[#FD312E] text-[#FD312E]' : 'border-gray-200 text-gray-600 hover:border-gray-400'
          }`}
        >
          {i + 1}
        </button>
      ))}
      {count < BANNER_SLIDE_MAX && (
        <button
          onClick={onAdd}
          title={t('Add slide')}
          className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-gray-400 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
        >
          +
        </button>
      )}
      <button
        onClick={onDelete}
        disabled={count <= BANNER_SLIDE_MIN}
        title={t('Delete this slide')}
        className={`ml-auto shrink-0 text-xs px-2 py-1 rounded-md border transition-colors ${
          count <= BANNER_SLIDE_MIN ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-red-200 text-red-500 hover:bg-red-50'
        }`}
      >
        {t('Delete')}
      </button>
    </div>
  );
}

function BannerPanel({
  data,
  onUpdate,
  onEditImage,
  activeSlideIndex,
  onSlideIndexChange,
}: {
  data: BannerGroupState;
  onUpdate: (d: BannerGroupState) => void;
  onEditImage: () => void;
  activeSlideIndex: number;
  onSlideIndexChange: (i: number) => void;
}) {
  const t = useT();
  const idx = Math.min(activeSlideIndex, data.slides.length - 1);
  const slide = data.slides[idx];
  const set = (p: Partial<BannerSlideState>) => {
    onUpdate({ slides: data.slides.map((s, i) => i === idx ? { ...s, ...p } : s) });
  };
  const isProduct = slide.variant === 'Product ver.';
  const thumbScale = 64 / BANNER_IMG_SEC.width;

  function handleAddSlide() {
    if (data.slides.length >= BANNER_SLIDE_MAX) return;
    onUpdate({ slides: [...data.slides, makeDefaultBannerSlide(t)] });
    onSlideIndexChange(data.slides.length);
  }
  function handleDeleteSlide() {
    if (data.slides.length <= BANNER_SLIDE_MIN) return;
    onUpdate({ slides: data.slides.filter((_, i) => i !== idx) });
    onSlideIndexChange(Math.max(0, idx - 1));
  }

  return (
    <div>
      <div className="px-5">
        <BannerSlidePicker
          count={data.slides.length}
          activeIndex={idx}
          onSelect={onSlideIndexChange}
          onAdd={handleAddSlide}
          onDelete={handleDeleteSlide}
        />

        <div className="mb-4">
          <FieldLabel>{t('Banner type')}</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {BANNER_VARIANTS.map(v => {
              const active = slide.variant === v;
              return (
                <button key={v} onClick={() => set({ variant: v as BannerVariant })}
                  className={`py-2.5 rounded-xl text-xs font-medium transition-all border-2 bg-white ${active ? 'border-[#FD312E] text-[#FD312E]' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                  {v}
                </button>
              );
            })}
          </div>
        </div>

        {isProduct && (
          <BannerPresetStrip state={slide.themeState} onChange={s => set({ themeState: s })} />
        )}
      </div>

      {isProduct ? (
        <>
          <PromotionEditPanel
            state={slide.themeState}
            onChange={s => set({ themeState: s })}
            selectedImageId={null}
            onSelectImage={() => {}}
            showReset={false}
            sections="text"
          />
          <div className="px-5">
            <div className="mb-3">
              <FieldLabel>{t('Image')}</FieldLabel>
              <div className="flex items-center gap-2">
                <div
                  className="rounded border border-gray-200 overflow-hidden shrink-0 bg-gray-50"
                  style={{ width: 64, height: BANNER_IMG_SEC.height * thumbScale, position: 'relative' }}
                >
                  <div style={{ width: 1200, height: 628, transform: `scale(${thumbScale}) translate(${-BANNER_IMG_SEC.left}px, ${-BANNER_IMG_SEC.top}px)`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                    <OtherPromoThemeTemplate state={slide.themeState} light />
                  </div>
                </div>
                <button
                  onClick={onEditImage}
                  className="flex-1 text-xs py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
                >
                  {t('Click to edit image')}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <BannerLifestylePanel state={slide.lifestyleState} onChange={s => set({ lifestyleState: s })} />
      )}
    </div>
  );
}

const VOUCHERS_TITLE_MAX_W = 1120; // 1200 - 40×2 padding
const VOUCHERS_DISCLAIMER_MAX_H = 60; // 18px × 1.1 × 3 lines = 59.4 → 60
const VOUCHER_ROW_W = 1120; // Sub copy 1 / Sub copy 2 share this row width
const VOUCHER_ROW_GAP = 25; // gap 12 + divider 1 + gap 12, only spent when both are shown
const VOUCHER_MIN = 1;
const VOUCHER_MAX = 3;

function VouchersPanel({ data, onUpdate }: { data: VouchersState; onUpdate: (d: VouchersState) => void }) {
  const t = useT();
  const set = (p: Partial<VouchersState>) => onUpdate({ ...data, ...p });
  const titleRulerRef = useRef<HTMLDivElement>(null);
  const subCopy1RulerRef = useRef<HTMLDivElement>(null);
  const subCopy2RulerRef = useRef<HTMLDivElement>(null);
  const typeLabelRulerRef = useRef<HTMLDivElement>(null);
  const valueTextRulerRef = useRef<HTMLDivElement>(null);
  const bannerSubCopyRulerRef = useRef<HTMLDivElement>(null);
  const group2CopyRulerRef = useRef<HTMLDivElement>(null);
  const couponValueRulerRef = useRef<HTMLDivElement>(null);
  const couponSubCopyRulerRef = useRef<HTMLDivElement>(null);
  const ctaRulerRef = useRef<HTMLDivElement>(null);
  const disclaimerRulerRef = useRef<HTMLDivElement>(null);
  const smallVoucherPriceRulerRef = useRef<HTMLDivElement>(null);
  const smallVoucherOffRulerRef = useRef<HTMLDivElement>(null);
  const smallVoucherSubCopyRulerRef = useRef<HTMLDivElement>(null);

  // At least one of the three groups has to stay visible — turning off the
  // last one is ignored rather than producing an empty module.
  function setGroupShown(group: 1 | 2 | 3, v: boolean) {
    const shown = [data.showGroup1, data.showGroup2, data.showGroup3];
    shown[group - 1] = v;
    if (!v && !shown.some(Boolean)) return;
    set({ [`showGroup${group}`]: v } as Partial<VouchersState>);
  }

  const updateVoucher = (idx: number, item: VoucherItem) => {
    const vouchers = [...data.vouchers];
    vouchers[idx] = item;
    set({ vouchers });
  };

  const updateSmallVoucher = (idx: number, item: SmallVoucherItem) => {
    const smallVouchers = [...(data.smallVouchers ?? [])];
    smallVouchers[idx] = item;
    set({ smallVouchers });
  };

  function handleSmallVoucherCountChange(count: number) {
    const current = data.smallVouchers ?? [];
    if (count === current.length) return;
    if (count < current.length) {
      set({ smallVouchers: current.slice(0, count) });
      return;
    }
    const extra: SmallVoucherItem[] = [];
    for (let n = current.length; n < count; n++) {
      const fromDefault = smallVoucherDefaultItems(t)[n];
      extra.push(fromDefault ? { ...fromDefault } : { price: '$0', subCopy: '' });
    }
    set({ smallVouchers: [...current, ...extra] });
  }

  function handleVoucherCountChange(count: number) {
    if (count === data.vouchers.length) return;
    if (count < data.vouchers.length) {
      set({ vouchers: data.vouchers.slice(0, count) });
      return;
    }
    const extra: VoucherItem[] = [];
    for (let n = data.vouchers.length; n < count; n++) {
      const fromDefault = voucherDefaultItems(t)[n];
      extra.push(fromDefault ? { ...fromDefault } : { typeLabel: t('Voucher'), valueText: '' });
    }
    set({ vouchers: [...data.vouchers, ...extra] });
  }

  function blockByWidth(el: HTMLDivElement | null, v: string, maxW: number): boolean {
    if (!el) return false;
    el.textContent = v || ' ';
    return el.getBoundingClientRect().width > maxW;
  }
  function blockByHeight(el: HTMLDivElement | null, v: string, maxH: number): boolean {
    if (!el) return false;
    el.textContent = v || '​';
    return el.getBoundingClientRect().height > maxH;
  }

  function measureW(el: HTMLDivElement | null, text: string): number {
    if (!el) return 0;
    el.textContent = text || ' ';
    return el.getBoundingClientRect().width;
  }

  // Sub copy 1 hugs its own text width, but yields room to Sub copy 2 when shown
  function handleSubCopy1Change(v: string, periodVal: string, showPeriod: boolean, onSet: (v: string) => void) {
    const maxW = showPeriod && periodVal.trim()
      ? VOUCHER_ROW_W - VOUCHER_ROW_GAP - measureW(subCopy2RulerRef.current, periodVal)
      : VOUCHER_ROW_W;
    if (measureW(subCopy1RulerRef.current, v) > maxW) return;
    onSet(v);
  }

  // Sub copy 2 hugs until the combined row width (with Sub copy 1) hits the limit
  function handleSubCopy2Change(v: string, subtitleVal: string, onSet: (v: string) => void) {
    const maxW = VOUCHER_ROW_W - VOUCHER_ROW_GAP - measureW(subCopy1RulerRef.current, subtitleVal);
    if (measureW(subCopy2RulerRef.current, v) > maxW) return;
    onSet(v);
  }

  // Would the text about to be inserted (default, or the last-typed period) actually fit next to Sub copy 1?
  function periodWouldOverflow(subtitleVal: string, periodVal: string): boolean {
    const maxW = VOUCHER_ROW_W - VOUCHER_ROW_GAP - measureW(subCopy1RulerRef.current, subtitleVal);
    return measureW(subCopy2RulerRef.current, periodVal || '2026.00.00-00.00') > maxW;
  }

  // Block enabling Sub copy 2 when even its default/previous text wouldn't fit next to Sub copy 1
  function handlePeriodToggle(v: boolean, subtitleVal: string, periodVal: string, onSet: (showPeriod: boolean, period: string) => void) {
    if (!v) { onSet(false, ''); return; }
    if (periodWouldOverflow(subtitleVal, periodVal)) return;
    onSet(true, periodVal || '2026.00.00-00.00');
  }

  // Content width of a 5-count card (211.2 outer − 40 padding). The tightest of
  // the range, since cards only widen as the count drops — Figma 2753:20827.
  const SMALL_VOUCHER_TXT_W = 171;
  function handleSmallVoucherPriceChange(v: string, item: SmallVoucherItem, idx: number) {
    const offW = measureW(smallVoucherOffRulerRef.current, data.group3OffLabel);
    const maxW = SMALL_VOUCHER_TXT_W - 4 - offW;
    if (measureW(smallVoucherPriceRulerRef.current, v) > maxW) return;
    updateSmallVoucher(idx, { ...item, price: v });
  }
  function handleSmallVoucherSubCopyChange(v: string, item: SmallVoucherItem, idx: number) {
    if (measureW(smallVoucherSubCopyRulerRef.current, v) > SMALL_VOUCHER_TXT_W) return;
    updateSmallVoucher(idx, { ...item, subCopy: v });
  }

  const group1SubtitleEff = data.showGroup1Subtitle ? data.group1Subtitle : '';
  const group2SubtitleEff = data.showGroup2Subtitle ? data.group2Subtitle : '';
  const group3SubtitleEff = data.showGroup3Subtitle ? data.group3Subtitle : '';
  const group1PeriodBlocked = !data.showGroup1Period && periodWouldOverflow(group1SubtitleEff, data.group1Period);
  const group2PeriodBlocked = !data.showGroup2Period && periodWouldOverflow(group2SubtitleEff, data.group2Period);
  const group3PeriodBlocked = !data.showGroup3Period && periodWouldOverflow(group3SubtitleEff, data.group3Period);

  return (
    <div>
      {/* Hidden rulers — match template fonts */}
      <div ref={titleRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 52, letterSpacing: 'var(--obs-tracking-head)', fontWeight: 600, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={subCopy1RulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 34, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={subCopy2RulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 34, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={typeLabelRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 24, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, lineHeight: 1.1, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={valueTextRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: 260, fontSize: 40, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, lineHeight: 1.1, fontFamily: STORE_NAME_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={bannerSubCopyRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={group2CopyRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: 500, fontSize: 40, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, lineHeight: 1.1, fontFamily: STORE_NAME_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={couponValueRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 40, letterSpacing: 'var(--obs-tracking)', fontWeight: 700, lineHeight: 1.2, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={couponSubCopyRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: 160, fontSize: 19, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, lineHeight: 1.2, fontFamily: STORE_NAME_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={ctaRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 32, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={smallVoucherPriceRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 46, letterSpacing: 'calc(0.46px + var(--obs-tracking))', fontWeight: 700, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={smallVoucherOffRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      <div ref={smallVoucherSubCopyRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, fontSize: 18, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, fontFamily: STORE_NAME_FONT, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />
      {/* Wraps like the art does, so its height counts the same lines the
          3-line cap is written against. */}
      <div ref={disclaimerRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: VOUCHERS_TITLE_MAX_W, fontSize: 18, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, lineHeight: 1.1, fontFamily: STORE_NAME_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word', visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none' }} />

      <TextField
        label={t('Head copy')}
        value={data.sectionTitle}
        onChange={v => { if (!blockByWidth(titleRulerRef.current, v, VOUCHERS_TITLE_MAX_W)) set({ sectionTitle: v }); }}
        placeholder={t('Promotion Vouchers')}
      />

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <div className="flex items-center">
          <span className="text-[13px] font-bold text-gray-700">{t('Group 1 — Ticket vouchers')}</span>
          <div className="ml-auto">
            <ShowToggle tone="group" checked={data.showGroup1} onChange={v => setGroupShown(1, v)} />
          </div>
        </div>
        {data.showGroup1 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="mb-3">
              <div className="flex items-center mb-1.5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy 1')}</p>
                <div className="ml-auto">
                  <ShowToggle checked={data.showGroup1Subtitle} onChange={v => set({ showGroup1Subtitle: v })} />
                </div>
              </div>
              {data.showGroup1Subtitle && (
                <input
                  type="text"
                  value={data.group1Subtitle}
                  onChange={e => handleSubCopy1Change(e.target.value, data.group1Period, data.showGroup1Period, val => set({ group1Subtitle: val }))}
                  placeholder={t('Limited Time Vouchers')}
                  className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
                />
              )}
            </div>
            <div className="mb-3">
              <div className="flex items-center mb-1.5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy 2')}</p>
                <div className="ml-auto">
                  <ShowToggle
                    checked={data.showGroup1Period}
                    onChange={v => handlePeriodToggle(v, group1SubtitleEff, data.group1Period, (showPeriod, period) => set({ showGroup1Period: showPeriod, group1Period: period }))}
                  />
                </div>
              </div>
              {group1PeriodBlocked && (
                <p className="text-[10px] text-red-500 mt-0.5">{t('Shorten Sub copy 1 to make room for Sub copy 2.')}</p>
              )}
              {data.showGroup1Period && (
                <input
                  type="text"
                  value={data.group1Period}
                  onChange={e => handleSubCopy2Change(e.target.value, group1SubtitleEff, val => set({ group1Period: val }))}
                  placeholder="2026.00.00-00.00"
                  className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
                />
              )}
            </div>
            <div className="mb-3">
              <FieldLabel>{t('Number of vouchers')}</FieldLabel>
              <div className="flex gap-1">
                {Array.from({ length: VOUCHER_MAX - VOUCHER_MIN + 1 }, (_, k) => VOUCHER_MIN + k).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleVoucherCountChange(n)}
                    className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${
                      data.vouchers.length === n
                        ? 'bg-[#FD312E] border-[#FD312E] text-white'
                        : 'border-gray-200 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {data.vouchers.map((v, i) => (
              <div key={i} className="pt-1 pb-3 border-b border-gray-100 last:border-0">
                <p className="text-[11px] font-semibold text-gray-500 mb-2">Voucher {i + 1}{voucherVisual(data.vouchers.length, i).isRed ? ' (red)' : ''}</p>
                <TextField
                  label={t('Type label')}
                  value={v.typeLabel}
                  onChange={val => { if (!blockByWidth(typeLabelRulerRef.current, val, 260)) updateVoucher(i, { ...v, typeLabel: val }); }}
                  placeholder={t('e.g. Store Voucher')}
                />
                <TextAreaField
                  label={t('Value text (2 lines max)')}
                  value={v.valueText}
                  onChange={val => { if (!blockByHeight(valueTextRulerRef.current, val, 88)) updateVoucher(i, { ...v, valueText: val }); }}
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <div className="flex items-center">
          <span className="text-[13px] font-bold text-gray-700">{t('Group 2 — Member voucher')}</span>
          <div className="ml-auto">
            <ShowToggle tone="group" checked={data.showGroup2} onChange={v => setGroupShown(2, v)} />
          </div>
        </div>
        {data.showGroup2 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="mb-3">
              <div className="flex items-center mb-1.5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy 1')}</p>
                <div className="ml-auto">
                  <ShowToggle checked={data.showGroup2Subtitle} onChange={v => set({ showGroup2Subtitle: v })} />
                </div>
              </div>
              {data.showGroup2Subtitle && (
                <input
                  type="text"
                  value={data.group2Subtitle}
                  onChange={e => handleSubCopy1Change(e.target.value, data.group2Period, data.showGroup2Period, val => set({ group2Subtitle: val }))}
                  placeholder={t('Member-exclusive Voucher')}
                  className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
                />
              )}
            </div>
            <div className="mb-3">
              <div className="flex items-center mb-1.5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy 2')}</p>
                <div className="ml-auto">
                  <ShowToggle
                    checked={data.showGroup2Period}
                    onChange={v => handlePeriodToggle(v, group2SubtitleEff, data.group2Period, (showPeriod, period) => set({ showGroup2Period: showPeriod, group2Period: period }))}
                  />
                </div>
              </div>
              {group2PeriodBlocked && (
                <p className="text-[10px] text-red-500 mt-0.5">{t('Shorten Sub copy 1 to make room for Sub copy 2.')}</p>
              )}
              {data.showGroup2Period && (
                <input
                  type="text"
                  value={data.group2Period}
                  onChange={e => handleSubCopy2Change(e.target.value, group2SubtitleEff, val => set({ group2Period: val }))}
                  placeholder="2026.00.00-00.00"
                  className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
                />
              )}
            </div>
            <TextField
              label={t('Banner sub copy')}
              value={data.group2SmallCopy}
              onChange={v => { if (!blockByWidth(bannerSubCopyRulerRef.current, v, 500)) set({ group2SmallCopy: v }); }}
              placeholder={t('Member-exclusive Voucher Drop')}
            />
            <TextAreaField
              label={t('Banner head copy (2 lines max)')}
              value={data.group2Copy}
              onChange={v => { if (!blockByHeight(group2CopyRulerRef.current, v, 90)) set({ group2Copy: v }); }}
              rows={2}
            />
            <TextField
              label={t('Coupon discount value')}
              value={data.couponDiscountValue}
              onChange={v => { if (!blockByWidth(couponValueRulerRef.current, v, 160)) set({ couponDiscountValue: v }); }}
              placeholder={t('e.g. $50 Off')}
            />
            <TextAreaField
              label={t('Coupon sub copy (2 lines max)')}
              value={data.couponMinSpend}
              onChange={v => { if (!blockByHeight(couponSubCopyRulerRef.current, v, 48)) set({ couponMinSpend: v }); }}
              rows={2}
              placeholder={t('e.g. min. spend $400')}
            />
            <TextField
              label={t('CTA copy')}
              value={data.ctaText}
              onChange={v => { if (!blockByWidth(ctaRulerRef.current, v, 176)) set({ ctaText: v }); }}
              placeholder={t('Join now')}
            />
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <div className="flex items-center">
          <span className="text-[13px] font-bold text-gray-700">{t('Group 3 — Small vouchers')}</span>
          <div className="ml-auto">
            <ShowToggle tone="group" checked={data.showGroup3} onChange={v => setGroupShown(3, v)} />
          </div>
        </div>
        {data.showGroup3 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="mb-3">
              <div className="flex items-center mb-1.5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy 1')}</p>
                <div className="ml-auto">
                  <ShowToggle checked={data.showGroup3Subtitle} onChange={v => set({ showGroup3Subtitle: v })} />
                </div>
              </div>
              {data.showGroup3Subtitle && (
                <input
                  type="text"
                  value={data.group3Subtitle}
                  onChange={e => handleSubCopy1Change(e.target.value, data.group3Period, data.showGroup3Period, val => set({ group3Subtitle: val }))}
                  placeholder={t('Other Vouchers')}
                  className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
                />
              )}
            </div>
            <div className="mb-3">
              <div className="flex items-center mb-1.5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy 2')}</p>
                <div className="ml-auto">
                  <ShowToggle
                    checked={data.showGroup3Period}
                    onChange={v => handlePeriodToggle(v, group3SubtitleEff, data.group3Period, (showPeriod, period) => set({ showGroup3Period: showPeriod, group3Period: period }))}
                  />
                </div>
              </div>
              {group3PeriodBlocked && (
                <p className="text-[10px] text-red-500 mt-0.5">{t('Shorten Sub copy 1 to make room for Sub copy 2.')}</p>
              )}
              {data.showGroup3Period && (
                <input
                  type="text"
                  value={data.group3Period}
                  onChange={e => handleSubCopy2Change(e.target.value, group3SubtitleEff, val => set({ group3Period: val }))}
                  placeholder="2026.00.00-00.00"
                  className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
                />
              )}
            </div>
            <TextField
              label={t('"Off" label')}
              value={data.group3OffLabel}
              onChange={v => { if (!blockByWidth(smallVoucherOffRulerRef.current, v, 100)) set({ group3OffLabel: v }); }}
              placeholder={t('Off')}
            />
            <div className="mb-3">
              <FieldLabel>{t('Number of vouchers')}</FieldLabel>
              <div className="flex gap-1">
                {Array.from({ length: SMALL_VOUCHER_MAX - SMALL_VOUCHER_MIN + 1 }, (_, k) => SMALL_VOUCHER_MIN + k).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleSmallVoucherCountChange(n)}
                    className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${
                      (data.smallVouchers ?? []).length === n
                        ? 'bg-[#FD312E] border-[#FD312E] text-white'
                        : 'border-gray-200 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {(data.smallVouchers ?? []).map((v, i) => (
              <div key={i} className="pt-1 pb-3 border-b border-gray-100 last:border-0">
                <p className="text-[11px] font-semibold text-gray-500 mb-2">{t('Voucher')} {i + 1}</p>
                <TextField
                  label={t('Price')}
                  value={v.price}
                  onChange={val => handleSmallVoucherPriceChange(val, v, i)}
                  placeholder="$40"
                />
                <TextField
                  label={t('Sub copy')}
                  value={v.subCopy}
                  onChange={val => handleSmallVoucherSubCopyChange(val, v, i)}
                  placeholder={t('e.g. min. spend $400*')}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center mt-4 mb-2">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('Disclaimer')}</span>
        <div className="ml-auto">
          <ShowToggle checked={data.showDisclaimer} onChange={v => set({ showDisclaimer: v })} />
        </div>
      </div>
      {data.showDisclaimer && (
        <textarea
          value={data.disclaimer}
          onChange={e => { const v = e.target.value; if (!blockByHeight(disclaimerRulerRef.current, v, VOUCHERS_DISCLAIMER_MAX_H)) set({ disclaimer: v }); }}
          rows={3}
          placeholder={t('*T&Cs apply')}
          className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none overflow-y-auto focus:outline-none focus:border-[#FD312E] bg-white"
        />
      )}
    </div>
  );
}

// Icon picker — preview button + searchable dropdown of the 36 Line black icons
function VpIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (slug: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) { setQuery(''); searchRef.current?.focus(); }
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? VP_ICON_LIST.filter(ic => ic.name.toLowerCase().includes(q) || t(ic.name).toLowerCase().includes(q) || ic.slug.includes(q))
    : VP_ICON_LIST;
  const current = VP_ICON_LIST.find(ic => ic.slug === value);

  return (
    <div ref={rootRef} className="relative shrink-0">
      {/* Preview button — chevron signals it opens a picker */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={current?.name ?? value}
        className={`h-[34px] pl-2 pr-1.5 rounded-md border bg-white flex items-center gap-1 transition-colors ${
          open ? 'border-[#FD312E]' : 'border-gray-200 hover:border-gray-400'
        }`}
      >
        <img src={vpIconSrc(value)} alt="" draggable={false} className="w-7 h-7 pointer-events-none" />
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-[38px] z-30 w-[264px] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('Search icons…')}
              className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#FD312E]"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto p-2 grid grid-cols-4 gap-1">
            {filtered.map(ic => (
              <button
                key={ic.slug}
                type="button"
                onClick={() => { onChange(ic.slug); setOpen(false); }}
                title={t(ic.name)}
                className={`flex flex-col items-center gap-0.5 rounded-md p-1.5 transition-colors ${
                  ic.slug === value ? 'bg-[#FD312E]/10 ring-1 ring-[#FD312E]' : 'hover:bg-gray-100'
                }`}
              >
                <img src={vpIconSrc(ic.slug)} alt="" draggable={false} className="w-9 h-9 pointer-events-none" />
                <span className="text-[9px] leading-[1.1] text-gray-500 text-center break-words w-full">
                  {t(ic.name)}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-4 text-xs text-gray-400 text-center py-4">{t('No icons found.')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const VP_PROPS_MIN = 3;
const VP_PROPS_MAX = 7;
// Label: max 2 lines at 24px / line-height 1.1 within the 130px column, +
// descender headroom per the project's text-clipping rule (fontSize×lineHeight×
// lines + 3-4px) — without this, a genuine full 2-line label (26.4×2=52.8) gets
// rejected by a same-or-smaller gate, which reads to the user as "can't type".
const VP_LABEL_MAX_H = 24 * 1.1 * 2 + 4;

function ValuePropsPanel({
  data,
  onUpdate,
}: {
  data: ValuePropsState;
  onUpdate: (d: ValuePropsState) => void;
}) {
  const t = useT();
  const set = (p: Partial<ValuePropsState>) => onUpdate({ ...data, ...p });
  const labelRulerRef = useRef<HTMLDivElement>(null);

  function handleLabelChange(i: number, v: string) {
    const el = labelRulerRef.current;
    if (el) {
      el.textContent = v || '​';
      if (el.getBoundingClientRect().height > VP_LABEL_MAX_H) return;
    }
    const props = data.props.map((item, j) => (j === i ? { ...item, label: v } : item));
    set({ props });
  }

  function handleIconChange(i: number, slug: string) {
    const props = data.props.map((item, j) => (j === i ? { ...item, icon: slug } : item));
    set({ props });
  }

  function handleCountChange(count: number) {
    if (count === data.props.length) return;
    if (count < data.props.length) {
      set({ props: data.props.slice(0, count) });
      return;
    }
    // Restore the curated 7-item example set by position when growing back up
    // (e.g. 3→7 after trimming), instead of generic placeholders.
    const used = new Set(data.props.map(p => p.icon));
    const extra: ValuePropItem[] = [];
    for (let n = data.props.length; n < count; n++) {
      const fromDefault = vpDefaultProps(t)[n];
      if (fromDefault) {
        used.add(fromDefault.icon);
        extra.push({ ...fromDefault });
        continue;
      }
      const nextIcon = VP_ICON_LIST.find(ic => !used.has(ic.slug)) ?? VP_ICON_LIST[0];
      used.add(nextIcon.slug);
      extra.push({ label: t('New value prop'), icon: nextIcon.slug });
    }
    set({ props: [...data.props, ...extra] });
  }

  return (
    <div>
      <div
        ref={labelRulerRef}
        style={{
          position: 'fixed', top: -9999, left: -9999,
          width: 130, fontSize: 24, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, lineHeight: 1.1,
          fontFamily: STORE_NAME_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          visibility: 'hidden', pointerEvents: 'none', padding: 0, margin: 0, border: 'none',
        }}
      />
      <TextField
        label={t('Section title')}
        value={data.sectionTitle}
        onChange={v => set({ sectionTitle: v })}
        placeholder={t('Value Props')}
      />
      <div className="mb-3">
        <FieldLabel>{t('Number of icons')}</FieldLabel>
        <div className="flex gap-1">
          {Array.from({ length: VP_PROPS_MAX - VP_PROPS_MIN + 1 }, (_, k) => VP_PROPS_MIN + k).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handleCountChange(n)}
              className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${
                data.props.length === n
                  ? 'bg-[#FD312E] border-[#FD312E] text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <SectionDivider>{t('Value props')}</SectionDivider>
      {data.props.map((p, i) => (
        <div key={i} className="mb-3">
          <FieldLabel>{`Prop ${i + 1}`}</FieldLabel>
          <div className="flex items-center gap-2">
            <VpIconPicker value={p.icon} onChange={slug => handleIconChange(i, slug)} />
            <input
              type="text"
              value={p.label}
              onChange={e => handleLabelChange(i, e.target.value)}
              className="flex-1 min-w-0 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main panel router ─────────────────────────────────────────────────────────

interface Props {
  editState: ModuleEditState;
  onUpdate: (newState: ModuleEditState) => void;
  /** Banner only — opens the image editor modal (owned by the caller so the
   *  same modal can also be triggered from a canvas hotspot). */
  onEditImage?: () => void;
  /** Banner only — which slide of the carousel group is being edited, shared
   *  with the canvas preview's arrows so both point at the same one. */
  bannerActiveSlideIndex?: number;
  onBannerSlideIndexChange?: (i: number) => void;
}

export function ModuleEditPanel({ editState, onUpdate, onEditImage, bannerActiveSlideIndex, onBannerSlideIndexChange }: Props) {
  switch (editState.type) {
    case 'official-store':
      return (
        <OfficialStorePanel
          data={editState.data}
          onUpdate={d => onUpdate({ type: 'official-store', data: d })}
        />
      );
    case 'follow-us':
      return (
        <FollowUsPanel
          data={editState.data}
          onUpdate={d => onUpdate({ type: 'follow-us', data: d })}
        />
      );
    case 'text':
      return (
        <TextModulePanel
          data={editState.data}
          onUpdate={d => onUpdate({ type: 'text', data: d })}
        />
      );
    case 'kv':
      return (
        <KvPanel
          data={editState.data}
          onUpdate={d => onUpdate({ type: 'kv', data: d })}
        />
      );
    case 'kv-product-list':
      return (
        <KvProductListPanel
          data={editState.data}
          onUpdate={d => onUpdate({ type: 'kv-product-list', data: d })}
        />
      );
    case 'category-list':
      return (
        <CategoryListPanel
          data={editState.data}
          onUpdate={d => onUpdate({ type: 'category-list', data: d })}
        />
      );
    case 'product-cards':
      return (
        <ProductCardsPanel
          data={editState.data}
          onUpdate={d => onUpdate({ type: 'product-cards', data: d })}
        />
      );
    case 'banner':
      return (
        <BannerPanel
          data={editState.data}
          onUpdate={d => onUpdate({ type: 'banner', data: d })}
          onEditImage={onEditImage ?? (() => {})}
          activeSlideIndex={bannerActiveSlideIndex ?? 0}
          onSlideIndexChange={onBannerSlideIndexChange ?? (() => {})}
        />
      );
    case 'vouchers':
      return (
        <VouchersPanel
          data={editState.data}
          onUpdate={d => onUpdate({ type: 'vouchers', data: d })}
        />
      );
    case 'value-props':
      return (
        <ValuePropsPanel
          data={editState.data}
          onUpdate={d => onUpdate({ type: 'value-props', data: d })}
        />
      );
  }
}
