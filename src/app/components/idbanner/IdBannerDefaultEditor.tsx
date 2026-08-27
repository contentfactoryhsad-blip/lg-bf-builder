import React, { useMemo, useRef, useState } from 'react';
import { Library } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { useT } from '../../i18n/LanguageContext';
import { AppHeader } from '../AppHeader';
import { NavRail, type NavRailKey } from '../NavRail';
import type { DraftRecord } from '../../utils/draftStore';
import { ImageCropModal, type CropState } from '../ImageCropModal';
import { AssetLibraryModal, type AssetItem, prefetchFullAssetDataUrl } from '../AssetLibraryModal';
import { salesGraphicZoom } from '../brandshop/modules/editStates';
import { useDraftSave } from '../../hooks/useDraftSave';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { SaveForLaterButton, SaveDraftModal } from '../SaveForLaterButton';
import { UnsavedChangesModal } from '../UnsavedChangesModal';
import { restoreIdBannerDefault, type IdBannerDefaultPayloadV1 } from '../../drafts/idBannerPayload';
import {
  IdBannerDefaultPCTemplate,
  ID_BANNER_DEFAULT_PC_W,
  ID_BANNER_DEFAULT_PC_H,
  ID_BANNER_DEFAULT_PRODUCTS,
  ID_BANNER_SALES_GRAPHIC_SLOTS,
  ID_BANNER_SALES_GRAPHIC_ZOOM,
} from './templates/IdBannerDefaultPC';
import {
  IdBannerDefaultMOTemplate,
  ID_BANNER_DEFAULT_MO_W,
  ID_BANNER_DEFAULT_MO_H,
} from './templates/IdBannerDefaultMO';

interface Props {
  onBack: () => void;
  /** Resume a saved draft: reuse its id and seed state from its payload. */
  initialDraft?: { id: string; title: string; payload: IdBannerDefaultPayloadV1 };
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}

/** Single scale shared by PC + MO so MO appears proportionally smaller —
 *  PC at 720px wide → 0.6×, MO renders at 0.6× of its 702 native width = 421px. */
const PC_DISPLAY_W = 720;

/** Named for where each graphic sits on the banner, PC layout (Figma 2468:48421). */
const SALES_GRAPHIC_SLOT_LABELS = [
  'Left of slogan, low',
  'Left of slogan, high',
  'Below slogan',
  'Right of slogan, high',
  'Right edge',
];
/** Framing range — a graphic has to read at the same weight as its neighbours,
 *  so the crop window only allows a nudge either way. */
const SALES_GRAPHIC_MIN_ZOOM = 0.7;
const SALES_GRAPHIC_MAX_ZOOM = 1.2;
/** Warm Gray 05 — the banner's canvas, so a thumbnail is judged on it. */
const ID_BANNER_CANVAS = '#E6E1D6';

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
  // 2 warm-up passes then cache-bust final, matches Product Card pattern
  await toPng(el, { pixelRatio: 1 });
  await toPng(el, { pixelRatio: 1 });
  return toPng(el, { pixelRatio: 1, cacheBust: true });
}

export function IdBannerDefaultEditor({ onBack, initialDraft, railActive, onRailNavigate, onOpenDraft }: Props) {
  const t = useT();
  const pcRef = useRef<HTMLDivElement>(null);
  const moRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Restored draft payload (computed once per mount; App remounts by draft id)
  const restored = useMemo(
    () => (initialDraft ? restoreIdBannerDefault(initialDraft.payload) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Product images — shared across PC + MO (both are uniform 1:1 crop boxes,
  // same rendering strategy as the Official Store module).
  const [productImages, setProductImages] = useState<(string | null)[]>(() => restored?.productImages ?? [...ID_BANNER_DEFAULT_PRODUCTS]);
  const [productImagesOriginal, setProductImagesOriginal] = useState<(string | null)[]>(() => restored?.productImagesOriginal ?? Array(ID_BANNER_SALES_GRAPHIC_SLOTS).fill(null));
  const [productImagesCrop, setProductImagesCrop] = useState<(CropState | null)[]>(() => restored?.productImagesCrop ?? Array(ID_BANNER_SALES_GRAPHIC_SLOTS).fill(null));

  // Local draft ("Save for Later")
  const draftState = useMemo(
    () => ({ productImages, productImagesOriginal, productImagesCrop }),
    [productImages, productImagesOriginal, productImagesCrop],
  );
  const draft = useDraftSave({
    builder: 'id-banner-default',
    initialDraftId: initialDraft?.id,
    state: draftState,
    title: initialDraft?.title ?? 'Default ver.',
  });
  const defaultDraftName = initialDraft?.title ?? 'Default ver.';
  const {
    guard,
    showModal: showUnsavedModal,
    showNameModal: showUnsavedNameModal,
    handleSave: handleUnsavedSave,
    handleNameConfirm: handleUnsavedNameConfirm,
    handleNameCancel: handleUnsavedNameCancel,
    handleDiscard: handleUnsavedDiscard,
  } = useUnsavedGuard(draft, defaultDraftName);

  // Slots are library picks: no URL, no upload, no background removal —
  // the graphics ship as cutouts already. Framing is the crop window.
  const [librarySlot, setLibrarySlot] = useState<number | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropIdx, setCropIdx] = useState<number | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [isRecrop, setIsRecrop] = useState(false); // true = resume the saved framing

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
    setCropZoom(salesGraphicZoom(item.name, ID_BANNER_SALES_GRAPHIC_ZOOM));
    setIsRecrop(false);
    setCropIdx(i);
    setCropSrc(dataUrl);
  }

  function openRecrop(i: number) {
    const src = productImagesOriginal[i] ?? productImages[i];
    if (!src) return;
    setIsRecrop(true);
    setCropIdx(i);
    setCropSrc(src);
  }

  function handleCropConfirm(cropped: string, cropState: CropState) {
    if (cropIdx === null) return;
    setProductImages(p => { const n = [...p]; n[cropIdx] = cropped; return n; });
    setProductImagesOriginal(p => { const n = [...p]; n[cropIdx] = cropSrc; return n; }); // cropSrc = the source we just cropped (kept for non-destructive re-crop)
    setProductImagesCrop(p => { const n = [...p]; n[cropIdx] = cropState; return n; });
    setCropSrc(null);
    setCropIdx(null);
  }

  // Same scale for both so the MO preview is visually smaller than PC,
  // matching their real pixel-size ratio (1200×300 vs 702×320).
  const scale = PC_DISPLAY_W / ID_BANNER_DEFAULT_PC_W;

  async function handleDownloadAll() {
    if (!pcRef.current || !moRef.current) return;
    setDownloading(true);
    try {
      const [pcPng, moPng] = await Promise.all([
        renderToPng(pcRef.current),
        renderToPng(moRef.current),
      ]);
      const zip = new JSZip();
      const stripPrefix = (s: string) => s.split(',')[1];
      const d = new Date();
      const date6 = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      zip.file(`ID-banner-default-PC-${ID_BANNER_DEFAULT_PC_W}x${ID_BANNER_DEFAULT_PC_H}-${date6}.png`, stripPrefix(pcPng), { base64: true });
      zip.file(`ID-banner-default-MO-${ID_BANNER_DEFAULT_MO_W}x${ID_BANNER_DEFAULT_MO_H}-${date6}.png`, stripPrefix(moPng), { base64: true });
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `LG-ID-banner-default.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#CDC8C1] flex flex-col">
      <AppHeader
        title={t('ID Banner Builder')}
        onBack={() => guard(onBack)}
        right={
          <>
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

      <div className="flex flex-1 overflow-hidden min-h-0">
        <NavRail active={railActive} onNavigate={(key) => guard(() => onRailNavigate(key))} onOpenDraft={onOpenDraft} />
        {/* Preview column — Brand Shop pattern: "Preview" label + shadow-2xl + dim label.
            items-center vertically centers the short banner set within the tall pane. */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-8">
            {/* PC */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-gray-400 uppercase tracking-widest">{t('Preview')} — {t('PC')}</p>
              <div
                className="shadow-2xl"
                style={{
                  width: ID_BANNER_DEFAULT_PC_W * scale,
                  height: ID_BANNER_DEFAULT_PC_H * scale,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: ID_BANNER_DEFAULT_PC_W,
                    height: ID_BANNER_DEFAULT_PC_H,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <IdBannerDefaultPCTemplate productImages={productImages} />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {ID_BANNER_DEFAULT_PC_W} × {ID_BANNER_DEFAULT_PC_H}
              </p>
            </div>
            {/* MO */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-gray-400 uppercase tracking-widest">{t('Preview')} — {t('MO')}</p>
              <div
                className="shadow-2xl"
                style={{
                  width: ID_BANNER_DEFAULT_MO_W * scale,
                  height: ID_BANNER_DEFAULT_MO_H * scale,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: ID_BANNER_DEFAULT_MO_W,
                    height: ID_BANNER_DEFAULT_MO_H,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <IdBannerDefaultMOTemplate productImages={productImages} />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {ID_BANNER_DEFAULT_MO_W} × {ID_BANNER_DEFAULT_MO_H}
              </p>
            </div>
          </div>
        </div>

        {/* Editor panel — product images only; layout/colors are fixed */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="px-5 py-4 border-b border-gray-100 shrink-0">
            <p className="font-lgei font-bold text-[14px] text-gray-900" style={{ lineHeight: '18px' }}>
              {t('Editor Panel')}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <p className="text-[11px] text-gray-400 mb-4" style={{ lineHeight: '16px' }}>
              {t('Layout and colors are fixed. Sales graphics can be replaced below.')}
            </p>

            {Array.from({ length: ID_BANNER_SALES_GRAPHIC_SLOTS }, (_, i) => {
              const img = productImages[i] ?? null;
              return (
                <div key={i} className="mb-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
                  <p className="text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">{t(SALES_GRAPHIC_SLOT_LABELS[i])}</p>

                  <div className="flex gap-2">
                    {/* Thumbnail: hover → Edit Crop (opens the crop window on the
                        ORIGINAL asset, so re-framing is non-destructive) */}
                    <div
                      className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden shrink-0 group"
                      style={{ background: ID_BANNER_CANVAS }}
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
        </div>
      </div>

      <AssetLibraryModal
        open={librarySlot !== null}
        onClose={() => setLibrarySlot(null)}
        onSelect={handleLibrarySelect}
      />

      {/* Crop window at the slot's 1:1. On a re-crop it resumes the last
          framing; on a fresh pick it opens at the asset's own default zoom —
          see ID_BANNER_SALES_GRAPHIC_ZOOM. */}
      {cropSrc !== null && cropIdx !== null && (() => {
        const cs = isRecrop ? productImagesCrop[cropIdx] : null;
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

      {/* Hidden full-size render area for PNG export */}
      <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div ref={pcRef} style={{ width: ID_BANNER_DEFAULT_PC_W, height: ID_BANNER_DEFAULT_PC_H }}>
          <IdBannerDefaultPCTemplate productImages={productImages} />
        </div>
        <div ref={moRef} style={{ width: ID_BANNER_DEFAULT_MO_W, height: ID_BANNER_DEFAULT_MO_H }}>
          <IdBannerDefaultMOTemplate productImages={productImages} />
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
