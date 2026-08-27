import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { useT } from '../../i18n/LanguageContext';
import { AppHeader } from '../AppHeader';
import { NavRail, type NavRailKey } from '../NavRail';
import type { DraftRecord } from '../../utils/draftStore';
import { ShowToggle } from '../brandshop/bigPromoCommon';
import { ImageCropModal, type CropState } from '../ImageCropModal';
import { ImageGalleryModal } from '../ImageGalleryModal';
import { scrapeProductImages, getProxiedImageUrl, ScrapedImage } from '../../services/imageScraperApi';
import { fetchAsDataUrl } from '../../utils/imageUrlLoader';
import { useDraftSave } from '../../hooks/useDraftSave';
import { useApplyBrandFont } from '../../fonts/useApplyBrandFont';
import { BrandFontSelector } from '../../fonts/BrandFontSelector';
import { ensureBrandFontLoaded, fontFileTag } from '../../fonts/brandFonts';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { SaveForLaterButton, SaveDraftModal } from '../SaveForLaterButton';
import { UnsavedChangesModal } from '../UnsavedChangesModal';
import { restoreIdBannerPromotion, type IdBannerPromotionPayloadV1 } from '../../drafts/idBannerPayload';
import {
  IdBannerPromotionPCTemplate,
  ID_BANNER_PROMOTION_PC_W,
  ID_BANNER_PROMOTION_PC_H,
  PC_KV,
  MO_KV,
  PC_KV_DEFAULT_FRAMING,
  MO_KV_DEFAULT_FRAMING,
  makeIdBannerPromotionDefault,
  IdBannerPromotionState,
  IdBannerPromotionTheme,
} from './templates/IdBannerPromotionPC';
import {
  IdBannerPromotionMOTemplate,
  ID_BANNER_PROMOTION_MO_W,
  ID_BANNER_PROMOTION_MO_H,
} from './templates/IdBannerPromotionMO';

interface Props {
  onBack: () => void;
  /** Resume a saved draft: reuse its id and seed state from its payload. */
  initialDraft?: { id: string; title: string; payload: IdBannerPromotionPayloadV1 };
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}

const PC_DISPLAY_W = 720;
const PROMO_THEMES: IdBannerPromotionTheme[] = ['light', 'dark'];

// Visible KV mask region per orientation (frame coords, clipped to the frame) —
// where the per-orientation "Edit Crop" hover hotspot sits on each preview.
const PC_KV_HOTSPOT = { left: 720, top: 0, width: 480, height: 300 };
const MO_KV_HOTSPOT = { left: 340, top: 0, width: 362, height: 320 };

function KvEditHotspot({ box, scale, onClick }: { box: { left: number; top: number; width: number; height: number }; scale: number; onClick: () => void }) {
  const t = useT();
  return (
    <div
      onClick={onClick}
      className="absolute group cursor-pointer"
      style={{ left: box.left * scale, top: box.top * scale, width: box.width * scale, height: box.height * scale }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
        <span className="text-white text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.55)' }}>{t('Edit Crop')}</span>
      </div>
    </div>
  );
}

async function waitForImages(el: HTMLElement) {
  const imgs = el.querySelectorAll('img');
  await Promise.all(
    Array.from(imgs).map((img) =>
      new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) resolve();
        else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      })
    )
  );
}

async function renderToPng(el: HTMLElement): Promise<string> {
  await waitForImages(el);
  await toPng(el, { pixelRatio: 1 });
  await toPng(el, { pixelRatio: 1 });
  return toPng(el, { pixelRatio: 1, cacheBust: true });
}

export function IdBannerPromotionEditor({ onBack, initialDraft, railActive, onRailNavigate, onOpenDraft }: Props) {
  const t = useT();
  const [state, setState] = useState<IdBannerPromotionState>(() =>
    initialDraft ? restoreIdBannerPromotion(initialDraft.payload, t) : makeIdBannerPromotionDefault(t),
  );
  useApplyBrandFont(state.fontId);
  const pcRef = useRef<HTMLDivElement>(null);
  const moRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Local draft ("Save for Later")
  const draft = useDraftSave({
    builder: 'id-banner-promotion',
    initialDraftId: initialDraft?.id,
    state,
    title: initialDraft?.title ?? 'Promotion ver.',
  });
  const defaultDraftName = initialDraft?.title ?? 'Promotion ver.';
  const {
    guard,
    showModal: showUnsavedModal,
    showNameModal: showUnsavedNameModal,
    handleSave: handleUnsavedSave,
    handleNameConfirm: handleUnsavedNameConfirm,
    handleNameCancel: handleUnsavedNameCancel,
    handleDiscard: handleUnsavedDiscard,
  } = useUnsavedGuard(draft, defaultDraftName);

  const scale = PC_DISPLAY_W / ID_BANNER_PROMOTION_PC_W;

  const headRulerRef = useRef<HTMLDivElement>(null);
  const subRulerRef = useRef<HTMLDivElement>(null);

  // Logo upload
  const logoFileRef = useRef<HTMLInputElement>(null);
  // KV image: fetch / upload / crop
  const kvFileRef = useRef<HTMLInputElement>(null);
  const [kvUrl, setKvUrl] = useState('');
  const [kvLoading, setKvLoading] = useState(false);
  const [kvScraped, setKvScraped] = useState<ScrapedImage[]>([]);
  const [kvError, setKvError] = useState<string | null>(null);
  const [showKvGallery, setShowKvGallery] = useState(false);
  const [kvCropSrc, setKvCropSrc] = useState<string | null>(null);
  // Which orientation(s) the open crop applies to: 'both' = new upload/fetch
  // (sets PC + MO together); 'pc' / 'mo' = per-orientation re-frame via the
  // matching preview's hotspot (PC and MO show different mask windows).
  const [kvCropTarget, setKvCropTarget] = useState<'both' | 'pc' | 'mo'>('both');
  // Seed the modal so re-opening "Edit Crop" resumes the previous framing:
  // a user's saved CropState (initialCrop/initialZoom) takes precedence; otherwise
  // a normalized default framing reproduces the Figma default window.
  const [kvCropInitial, setKvCropInitial] = useState<CropState | undefined>(undefined);
  const [kvCropFraming, setKvCropFraming] = useState<{ bcx: number; bcy: number; zoom: number } | null>(null);

  function openKvCrop(
    target: 'both' | 'pc' | 'mo',
    src: string,
    initial: CropState | undefined,
    framing: { bcx: number; bcy: number; zoom: number } | null,
  ) {
    setKvCropTarget(target);
    setKvCropInitial(initial);
    setKvCropFraming(framing);
    setKvCropSrc(src);
  }

  function countLines(ref: React.RefObject<HTMLDivElement | null>, value: string, lineH: number): number {
    const r = ref.current;
    if (!r) return 0;
    r.textContent = value || ' ';
    return Math.round(r.getBoundingClientRect().height / lineH);
  }

  function tryUpdateHead(v: string) {
    if (v.split('\n').length > 4) return;
    if (countLines(headRulerRef, v, 30 * 1.08) > 4) return;
    setState((s) => ({ ...s, headCopy: v }));
  }
  function tryUpdateSub(v: string) {
    if (v.split('\n').length > 2) return;
    if (countLines(subRulerRef, v, 20 * 1.1) > 2) return;
    setState((s) => ({ ...s, subCopy: v }));
  }

  // ── Logo ──
  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setState((s) => ({ ...s, promotionLogoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }

  // ── KV image ──
  async function handleKvFetch() {
    const trimmed = kvUrl.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch { setKvError(t('Please enter a valid URL (https://…)')); return; }
    setKvLoading(true);
    setKvError(null);
    const result = await scrapeProductImages(trimmed);
    setKvScraped(result.images);
    setKvError(result.error || null);
    setKvLoading(false);
    if (result.images.length > 0) setShowKvGallery(true);
  }
  // New source (fetch/upload) applies immediately to BOTH orientations — no crop
  // step — and clears any prior per-orientation crop so the fresh image isn't framed
  // by the old image's crop. The user then re-frames PC / MO individually.
  function applyNewKvSource(src: string) {
    setState((s) => ({
      ...s,
      kvOriginal: src,
      pcKvImage: src,
      moKvImage: src,
      pcKvCrop: undefined,
      moKvCrop: undefined,
    }));
  }
  async function handleKvGallerySelect(img: ScrapedImage) {
    setShowKvGallery(false);
    const dataUrl = await fetchAsDataUrl(getProxiedImageUrl(img.url));
    if (!dataUrl) { setKvError('Could not load image'); return; }
    applyNewKvSource(dataUrl);
  }
  function handleKvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyNewKvSource(reader.result as string);
    reader.readAsDataURL(file);
  }
  // Re-frame one orientation, resuming its previous framing. Crops the shared
  // uncropped original (non-destructive): a saved crop resumes exactly; the
  // untouched default resumes at the Figma default window.
  function handleKvEditCrop(target: 'pc' | 'mo') {
    const src = state.kvOriginal ?? (target === 'pc' ? state.pcKvImage : state.moKvImage);
    if (!src) return;
    const saved = target === 'pc' ? state.pcKvCrop : state.moKvCrop;
    if (saved) openKvCrop(target, src, saved, null);
    else openKvCrop(target, src, undefined, target === 'pc' ? PC_KV_DEFAULT_FRAMING : MO_KV_DEFAULT_FRAMING);
  }
  function handleKvCropConfirm(cropped: string, cropState: CropState) {
    const source = kvCropSrc;
    setState((s) => {
      if (kvCropTarget === 'pc') return { ...s, pcKvImage: cropped, pcKvCrop: cropState };
      if (kvCropTarget === 'mo') return { ...s, moKvImage: cropped, moKvCrop: cropState };
      // 'both' — new source replaces the original and resets both orientations' crops
      return { ...s, kvOriginal: source, pcKvImage: cropped, moKvImage: cropped, pcKvCrop: cropState, moKvCrop: cropState };
    });
    setKvCropSrc(null);
  }

  async function handleDownloadAll() {
    if (!pcRef.current || !moRef.current) return;
    setDownloading(true);
    try {
      // Resolve the brand faces first — renderToPng's two-pass warmup caches
      // images, not fonts, so a font still in flight bakes in as a fallback.
      await ensureBrandFontLoaded(state.fontId);
      const [pcPng, moPng] = await Promise.all([
        renderToPng(pcRef.current),
        renderToPng(moRef.current),
      ]);
      const zip = new JSZip();
      const stripPrefix = (s: string) => s.split(',')[1];
      const d = new Date();
      const date6 = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      zip.file(`ID-banner-promotion-PC-${ID_BANNER_PROMOTION_PC_W}x${ID_BANNER_PROMOTION_PC_H}-${fontFileTag(state.fontId)}${date6}.png`, stripPrefix(pcPng), { base64: true });
      zip.file(`ID-banner-promotion-MO-${ID_BANNER_PROMOTION_MO_W}x${ID_BANNER_PROMOTION_MO_H}-${fontFileTag(state.fontId)}${date6}.png`, stripPrefix(moPng), { base64: true });
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `LG-ID-banner-promotion.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setDownloading(false);
    }
  }

  const rulerFont = 'var(--obs-font)';

  return (
    <div className="min-h-screen bg-[#CDC8C1] flex flex-col">
      <AppHeader
        title={t('ID Banner Builder')}
        onBack={() => guard(onBack)}
        right={
          <>
            <BrandFontSelector
              value={state.fontId}
              onChange={(fontId) => setState((s) => ({ ...s, fontId }))}
            />
            <SaveForLaterButton draft={draft} defaultName={defaultDraftName} disabled={!draft.dirty} />
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="flex items-center gap-2 bg-[#FD312E] hover:bg-[#E22825] text-white text-sm font-medium px-5 py-2 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 15l-4-4h3V4h2v7h3l-4 4zM4 18h16v2H4v-2z" fill="currentColor"/>
              </svg>
              <span style={{ lineHeight: '20px' }}>
                {downloading ? t('Preparing…') : t('Download ZIP')}
              </span>
            </button>
          </>
        }
      />

      {/* Hidden rulers. Weights come from the same custom properties the
          templates use: a ruler set one step lighter than the art wraps later
          than the art does, and reports a line count that is short. */}
      <div ref={headRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: 280, fontSize: 30, fontWeight: 'var(--obs-w-head-sm, 400)', letterSpacing: 'var(--obs-tracking)', lineHeight: 1.08, fontFamily: rulerFont, visibility: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />
      <div ref={subRulerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: 280, fontSize: 20, fontWeight: 'var(--obs-w-sub-sm, 300)', letterSpacing: 'var(--obs-tracking)', lineHeight: 1.1, fontFamily: 'var(--obs-font-text)', visibility: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <NavRail active={railActive} onNavigate={(key) => guard(() => onRailNavigate(key))} onOpenDraft={onOpenDraft} />
        {/* Preview column — PC + MO stacked */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-8">
            {/* PC */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-gray-400 uppercase tracking-widest">{t('Preview')} — {t('PC')}</p>
              <div className="shadow-2xl" style={{ position: 'relative', width: ID_BANNER_PROMOTION_PC_W * scale, height: ID_BANNER_PROMOTION_PC_H * scale, flexShrink: 0, overflow: 'hidden' }}>
                <div style={{ width: ID_BANNER_PROMOTION_PC_W, height: ID_BANNER_PROMOTION_PC_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  <IdBannerPromotionPCTemplate state={state} />
                </div>
                {state.pcKvImage && <KvEditHotspot box={PC_KV_HOTSPOT} scale={scale} onClick={() => handleKvEditCrop('pc')} />}
              </div>
              <p className="text-xs text-gray-400">{ID_BANNER_PROMOTION_PC_W} × {ID_BANNER_PROMOTION_PC_H}</p>
            </div>
            {/* MO */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-gray-400 uppercase tracking-widest">{t('Preview')} — {t('MO')}</p>
              <div className="shadow-2xl" style={{ position: 'relative', width: ID_BANNER_PROMOTION_MO_W * scale, height: ID_BANNER_PROMOTION_MO_H * scale, flexShrink: 0, overflow: 'hidden' }}>
                <div style={{ width: ID_BANNER_PROMOTION_MO_W, height: ID_BANNER_PROMOTION_MO_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  <IdBannerPromotionMOTemplate state={state} />
                </div>
                {state.moKvImage && <KvEditHotspot box={MO_KV_HOTSPOT} scale={scale} onClick={() => handleKvEditCrop('mo')} />}
              </div>
              <p className="text-xs text-gray-400">{ID_BANNER_PROMOTION_MO_W} × {ID_BANNER_PROMOTION_MO_H}</p>
            </div>
          </div>
        </div>

        {/* Editor panel — matches Store Page Modules EP styling */}
        <aside className="w-80 shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
          <div className="p-5">
            <p className="font-lgei font-bold text-[15px] text-gray-900 mb-0.5">{t('Promotion ver.')}</p>
            <p className="text-xs text-gray-400 mb-5">1200 × 300 / 702 × 320</p>

            {/* Theme — square box selector (light / dark) */}
            <div className="mb-4">
              <p className="text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">{t('Theme')}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PROMO_THEMES.map((theme) => {
                  const active = state.theme === theme;
                  return (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => setState((s) => ({ ...s, theme }))}
                      className={`py-2.5 rounded-xl text-xs font-medium transition-all border-2 bg-white ${
                        active ? 'border-[#FD312E] text-[#FD312E]' : 'border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {theme === 'light' ? t('Light') : t('Dark')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campaign logo with LG logo */}
            <div className="mb-3">
              <div className="flex items-center mb-1.5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Campaign logo with LG logo')}</p>
                <div className="ml-auto">
                  <ShowToggle checked={state.showLogos} onChange={(v) => setState((s) => ({ ...s, showLogos: v }))} />
                </div>
              </div>
              {state.showLogos && (
                <>
                  <p className="text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">{t('Campaign logo (H 40px / W auto)')}</p>
                  <div className="flex gap-2 items-center">
                    <div className="w-14 h-14 rounded border border-gray-200 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center p-1">
                      {state.promotionLogoUrl ? (
                        <img src={state.promotionLogoUrl} alt="" className="object-contain" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }} />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      )}
                    </div>
                    <button
                      onClick={() => logoFileRef.current?.click()}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
                    >
                      {t('Replace')}
                    </button>
                    <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </>
              )}
            </div>

            {/* Head copy */}
            <div className="mb-3">
              <p className="text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">{t('Head copy (Max 4 lines)')}</p>
              <textarea
                value={state.headCopy}
                onChange={(e) => tryUpdateHead(e.target.value)}
                rows={4}
                className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:border-[#FD312E]"
              />
            </div>

            {/* Sub copy (toggle) */}
            <div className="mb-3">
              <div className="flex items-center mb-1.5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Sub copy (Max 2 lines)')}</p>
                <div className="ml-auto">
                  <ShowToggle checked={state.showSubCopy} onChange={(v) => setState((s) => ({ ...s, showSubCopy: v }))} />
                </div>
              </div>
              {state.showSubCopy && (
                <textarea
                  value={state.subCopy}
                  onChange={(e) => tryUpdateSub(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:border-[#FD312E]"
                />
              )}
            </div>

            {/* KV image — thumbnail + URL/Fetch + Upload (mask-shape crop) */}
            <div className="mb-3">
              <p className="text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">{t('KV Image')}</p>
              <div className="flex gap-2 mb-1.5">
                <div className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden shrink-0 bg-gray-50">
                  {state.pcKvImage ? (
                    <img src={state.pcKvImage} alt="" className="w-full h-full object-cover" style={{ maxWidth: 'none' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={kvUrl}
                      onChange={(e) => setKvUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleKvFetch(); }}
                      placeholder={t('LG.com product URL')}
                      className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white"
                    />
                    <button
                      onClick={handleKvFetch}
                      disabled={kvLoading}
                      className="text-xs px-2.5 py-1.5 rounded-md bg-[#FD312E] text-white shrink-0 disabled:opacity-50"
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
              <p className="text-[11px] text-gray-400 mt-1.5" style={{ lineHeight: '15px' }}>
                {t('PC and MO show different areas — Click each preview to Edit Crop individually.')}
              </p>
            </div>
          </div>
        </aside>
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
      {kvCropSrc !== null && (
        <ImageCropModal
          imageSrc={kvCropSrc}
          aspectRatio={(kvCropTarget === 'mo' ? MO_KV : PC_KV).aspect}
          title={t('KV Image')}
          initialCrop={kvCropInitial?.crop}
          initialZoom={kvCropInitial?.zoom}
          computeInitialFraming={kvCropFraming ? () => kvCropFraming : undefined}
          onConfirm={handleKvCropConfirm}
          onCancel={() => setKvCropSrc(null)}
        />
      )}

      {/* Hidden full-size render area for PNG export */}
      <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div ref={pcRef} style={{ width: ID_BANNER_PROMOTION_PC_W, height: ID_BANNER_PROMOTION_PC_H }}>
          <IdBannerPromotionPCTemplate state={state} />
        </div>
        <div ref={moRef} style={{ width: ID_BANNER_PROMOTION_MO_W, height: ID_BANNER_PROMOTION_MO_H }}>
          <IdBannerPromotionMOTemplate state={state} />
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
