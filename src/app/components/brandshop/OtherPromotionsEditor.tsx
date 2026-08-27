import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { useT } from '../../i18n/LanguageContext';
import { trimToOpaqueBounds } from '../../utils/trimOpaque';
import {
  OtherPromoThemeTemplate,
  makeOtherPromoThemeState,
  OtherPromoThemeState,
  PlacedImage,
  ProductImageSlots,
  ThemeObjectSlots,
  PRODUCT_SLOT_COUNT,
  THEME_OBJECT_SLOT_COUNT,
  IMAGE_BG_COLORS,
  IMAGE_BG_COLOR_LABELS,
  ImageBgColorKey,
  IMAGE_SECTION,
} from './templates/OtherPromoThemeTemplate';
import {
  OtherPromoLifestyleTemplate,
  makeOtherPromoLifestyleState,
  OtherPromoLifestyleState,
  LIFESTYLE_SHAPE,
  SHAPE_PATH as LIFESTYLE_SHAPE_PATH,
} from './templates/OtherPromoLifestyleTemplate';
import { makePromotionPresets, applyPreset } from './templates/otherPromoPresets';
import type { TFunction } from '../../i18n/LanguageContext';
import { ShowToggle } from './bigPromoCommon';
import { ImageGalleryModal } from '../ImageGalleryModal';
import { AssetLibraryModal, type AssetItem, prefetchAssetLibrary, prefetchFullAssetDataUrl } from '../AssetLibraryModal';
import { BrushMaskEditor } from '../BrushMaskEditor';
import { removeBackgroundAI } from './modules/aiBgRemoval';
import { scrapeProductImages, getProxiedImageUrl, ScrapedImage } from '../../services/imageScraperApi';
import { fetchAsDataUrl } from '../../utils/imageUrlLoader';

type PromoType = 'promotion' | 'lifestyle';
type Bucket = 'productImages' | 'themeObjects' | 'plusSign';

/** Module-level cache for preset thumbnail PNGs. Generated once on first
 *  editor mount via html-to-image; reused across re-renders + sessions
 *  while the page is open. */
const presetThumbCache: Record<string, string> = {};

interface OtherPromoInstance {
  id: string;
  type: PromoType;
  themeState: OtherPromoThemeState;
  lifestyleState: OtherPromoLifestyleState;
}

type Step = 'list' | 'editing';

interface Props {
  onBack: () => void;
}

const MAX_INSTANCES = 6;

function makeInstance(t: TFunction, type: PromoType = 'promotion'): OtherPromoInstance {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${type}`,
    type,
    themeState: makeOtherPromoThemeState(t),
    lifestyleState: makeOtherPromoLifestyleState(t),
  };
}

export function OtherPromotionsEditor({ onBack }: Props) {
  const t = useT();
  // Warm the asset library cache (manifest + first-category thumbs) on
  // editor mount so opening the "Pick from library" picker feels instant.
  useEffect(() => { prefetchAssetLibrary(); }, []);
  // Section opens with one of each type so the user sees both versions on entry.
  // Both are pre-marked as saved + selected so the ZIP queue shows checkboxes
  // checked immediately, matching the Brand Trust selector UX.
  const initialInstances = React.useMemo(
    () => [makeInstance(t, 'promotion'), makeInstance(t, 'lifestyle')],
    // initialInstances are seeded once per editor mount; subsequent t() changes are blocked by language lock
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [instances, setInstances] = useState<OtherPromoInstance[]>(initialInstances);
  const [step, setStep] = useState<Step>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(initialInstances.map((i) => i.id)));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialInstances.map((i) => i.id)));

  const editingInstance = instances.find((i) => i.id === editingId) ?? null;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSave() {
    if (editingId) {
      setSavedIds((prev) => new Set(prev).add(editingId));
      // Auto-check the just-saved banner so it's queued for ZIP download
      setSelected((prev) => new Set(prev).add(editingId));
    }
    setStep('list');
    setEditingId(null);
  }

  function addInstance() {
    // Stay on the list — user clicks the new card to enter the editor
    const newInst = makeInstance(t);
    setInstances((prev) => [...prev, newInst]);
  }

  function removeInstance(id: string) {
    setInstances((prev) => prev.filter((i) => i.id !== id));
  }

  function updateType(id: string, type: PromoType) {
    setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, type } : i)));
  }

  function updateThemeState(id: string, themeState: OtherPromoThemeState) {
    setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, themeState } : i)));
  }

  function updateLifestyleState(id: string, lifestyleState: OtherPromoLifestyleState) {
    setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, lifestyleState } : i)));
  }

  /* ── Download ZIP ── */
  const renderRefs = useRef<Record<string, HTMLDivElement | null>>({});

  async function waitForImages(el: HTMLElement): Promise<void> {
    const imgs = el.querySelectorAll('img');
    await Promise.all(
      Array.from(imgs).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          }),
      ),
    );
  }

  async function handleDownloadZip() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const d = new Date();
    const date6 = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const zip = new JSZip();
    for (const id of ids) {
      const el = renderRefs.current[id];
      if (!el) continue;
      await waitForImages(el);
      // Two warm-up passes ensure fonts + images settle before final capture
      await toPng(el, { pixelRatio: 1 });
      await toPng(el, { pixelRatio: 1 });
      const dataUrl = await toPng(el, { pixelRatio: 1 });
      const base64 = dataUrl.split(',')[1];
      const idx = instances.findIndex((i) => i.id === id);
      zip.file(`${String(idx + 1).padStart(2, '0')}-other-promotion-banner-1200x628-${date6}.png`, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `LG-other-promotion.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ── Editing view ── */
  if (step === 'editing' && editingInstance) {
    return (
      <OtherPromoEditorShell
        instance={editingInstance}
        onTypeChange={(type) => updateType(editingInstance.id, type)}
        onThemeChange={(s) => updateThemeState(editingInstance.id, s)}
        onLifestyleChange={(s) => updateLifestyleState(editingInstance.id, s)}
        onBack={() => { setStep('list'); setEditingId(null); }}
        onSave={handleSave}
      />
    );
  }

  /* ── List view ── */
  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-8 h-16 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 -ml-3 px-3 py-1.5 rounded-full transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ lineHeight: '20px' }}>{t('Back')}</span>
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <img src="/lg-logo.svg" alt="LG" style={{ height: 20, width: 'auto' }} draggable={false} />
            <span className="font-lgei font-bold text-[15px] text-gray-900" style={{ lineHeight: '20px' }}>
              {t('Other Promotions Section')}
            </span>
          </div>
        </div>
        <button
          onClick={handleDownloadZip}
          disabled={selected.size === 0}
          className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-full border transition-colors disabled:cursor-not-allowed"
          style={{
            background: selected.size > 0 ? '#FD312E' : 'white',
            borderColor: selected.size > 0 ? '#FD312E' : '#e5e7eb',
            color: selected.size > 0 ? 'white' : '#d1d5db',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 15l-4-4h3V4h2v7h3l-4 4zM4 18h16v2H4v-2z" fill="currentColor"/>
          </svg>
          <span style={{ lineHeight: '20px' }}>{t('Download ZIP')}</span>
        </button>
      </header>

      <div className="flex-1 px-16 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="font-lgei font-bold text-[22px] text-gray-900 mb-2" style={{ lineHeight: '30px' }}>
              {t('Select a template')}
            </h2>
            <p className="text-sm text-gray-400" style={{ lineHeight: '20px' }}>
              {t('Choose a template to start editing.')}
            </p>
          </div>
          <button
            onClick={addInstance}
            disabled={instances.length >= MAX_INSTANCES}
            className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg border-2 transition-colors disabled:cursor-not-allowed"
            style={{
              borderColor: instances.length >= MAX_INSTANCES ? '#e5e7eb' : '#FD312E',
              color: instances.length >= MAX_INSTANCES ? '#d1d5db' : '#FD312E',
              background: 'white',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span style={{ lineHeight: '20px' }}>
              {t('Add banner')} ({instances.length}/{MAX_INSTANCES})
            </span>
          </button>
        </div>

        {instances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#CBD5E1" strokeWidth="1.5"/>
                <path d="M12 8v8M8 12h8" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm text-gray-400" style={{ lineHeight: '20px' }}>
              {t('No banners yet. Click Add banner to get started.')}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 pb-12" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {instances.map((inst, idx) => {
              const isSaved = savedIds.has(inst.id);
              const isSelected = selected.has(inst.id);
              return (
                <div
                  key={inst.id}
                  className="relative bg-white rounded-xl overflow-hidden border-2 shadow-sm transition-all duration-150"
                  style={{ borderColor: isSelected ? '#FD312E' : '#e5e7eb' }}
                >
                  {/* Checkbox — top-left, only for saved banners */}
                  {isSaved && (
                    <div
                      className="absolute top-2.5 left-2.5 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(inst.id)} className="sr-only"/>
                        <div
                          className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                          style={{
                            background: isSelected ? '#FD312E' : 'white',
                            borderColor: isSelected ? '#FD312E' : '#d1d5db',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          }}
                        >
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Saved badge — top-right */}
                  {isSaved && (
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-white/90 rounded-full px-2 py-0.5 shadow-sm">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <circle cx="5" cy="5" r="4.5" fill="#22C55E"/>
                        <path d="M2.5 5l1.8 1.8 3.2-3.2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-[10px] text-green-600 font-medium" style={{ lineHeight: '14px' }}>{t('Saved')}</span>
                    </div>
                  )}

                  <div
                    className="group relative w-full flex items-center justify-center cursor-pointer overflow-hidden"
                    style={{ background: '#CBC8C2', aspectRatio: '1200 / 628', padding: 12 }}
                    onClick={() => { setEditingId(inst.id); setStep('editing'); }}
                  >
                    <ResponsiveBannerPreview canvasWidth={1200} canvasHeight={628}>
                      {inst.type === 'promotion' ? (
                        <OtherPromoThemeTemplate state={inst.themeState} />
                      ) : (
                        <OtherPromoLifestyleTemplate state={inst.lifestyleState} />
                      )}
                    </ResponsiveBannerPreview>
                    {/* Hover dim + Edit label overlay */}
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ background: 'rgba(0,0,0,0.4)' }}
                    >
                      <span
                        className="font-medium text-white"
                        style={{ fontSize: 14, lineHeight: '20px', letterSpacing: '0.02em' }}
                      >
                        {t('Edit')}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: inst.type === 'promotion' ? '#FFF1F4' : '#F0FDF4',
                        color: inst.type === 'promotion' ? '#FD312E' : '#15803D',
                        lineHeight: '18px',
                      }}
                    >
                      {inst.type === 'promotion' ? t('Promotion Theme Version') : t('Lifestyle Image Version')}
                    </span>
                    <button
                      onClick={() => removeInstance(inst.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4M8.5 6v4M3 3.5l.5 8h7l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden full-size render area for ZIP export. Only saved instances
          are rendered (since unsaved banners can't be selected). */}
      <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        {instances.filter((inst) => savedIds.has(inst.id)).map((inst) => (
          <div
            key={inst.id}
            ref={(el) => { renderRefs.current[inst.id] = el; }}
            style={{ width: 1200, height: 628 }}
          >
            {inst.type === 'promotion' ? (
              <OtherPromoThemeTemplate state={inst.themeState} />
            ) : (
              <OtherPromoLifestyleTemplate state={inst.lifestyleState} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Responsive banner preview                    */
/* Fits a fixed-size template into a flex      */
/* container by measuring the container and    */
/* scaling the template uniformly.             */
/* ─────────────────────────────────────────── */

function ResponsiveBannerPreview({
  canvasWidth,
  canvasHeight,
  children,
}: {
  canvasWidth: number;
  canvasHeight: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = size.w > 0 && size.h > 0 ? Math.min(size.w / canvasWidth, size.h / canvasHeight) : 0;
  return (
    <div ref={ref} className="w-full h-full flex items-center justify-center overflow-hidden">
      {scale > 0 && (
        // Inner box uses overflow:visible so editor overlays (selection boxes,
        // resize handles) can extend beyond the scaled banner. The outer ref
        // div above still clips at the editor preview area boundary.
        <div style={{ width: canvasWidth * scale, height: canvasHeight * scale, overflow: 'visible', flexShrink: 0, pointerEvents: 'none' }}>
          <div style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Per-instance editor shell with type toggle  */
/* ─────────────────────────────────────────── */

interface OtherPromoEditorShellProps {
  instance: OtherPromoInstance;
  onTypeChange: (type: PromoType) => void;
  onThemeChange: (s: OtherPromoThemeState) => void;
  onLifestyleChange: (s: OtherPromoLifestyleState) => void;
  onBack: () => void;
  onSave: () => void;
}

function OtherPromoEditorShell({
  instance,
  onTypeChange,
  onThemeChange,
  onLifestyleChange,
  onBack,
  onSave,
}: OtherPromoEditorShellProps) {
  const t = useT();
  // Preview scale: 1200×628 → fit ~560px wide (matches Product Card Builder)
  const previewScale = 560 / 1200;
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const promotionOverlay =
    instance.type === 'promotion' ? (
      <PlacedImageOverlay
        themeState={instance.themeState}
        selectedId={selectedImageId}
        onSelect={setSelectedImageId}
        previewScale={previewScale}
        onChange={onThemeChange}
      />
    ) : null;

  const lifestyleOverlay =
    instance.type === 'lifestyle' && instance.lifestyleState.imageSrc ? (
      <LifestyleImageOverlay
        state={instance.lifestyleState}
        previewScale={previewScale}
        onChange={onLifestyleChange}
      />
    ) : null;

  return (
    <div className="h-screen bg-[#CBC8C2] flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-8 h-16 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 -ml-3 px-3 py-1.5 rounded-full transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ lineHeight: '20px' }}>{t('Back')}</span>
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <img src="/lg-logo.svg" alt="LG" style={{ height: 20, width: 'auto' }} draggable={false} />
            <span className="font-lgei font-bold text-[15px] text-gray-900" style={{ lineHeight: '20px' }}>
              {t('Other Promotions Section')}
            </span>
          </div>
        </div>
        <button
          onClick={onSave}
          className="flex items-center gap-2 bg-[#FD312E] hover:bg-[#E22825] text-white text-sm font-medium px-5 py-2 rounded-full transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span style={{ lineHeight: '20px' }}>{t('Save')}</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Preview — fixed in viewport, banner centered */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest">{t('Preview')}</p>
            <div
              className="shadow-2xl"
              style={{
                width: 1200 * previewScale,
                height: 628 * previewScale,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 1200,
                  height: 628,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
              >
                {instance.type === 'promotion' ? (
                  <OtherPromoThemeTemplate
                    state={instance.themeState}
                    imageSectionOverlay={promotionOverlay}
                  />
                ) : (
                  <OtherPromoLifestyleTemplate
                    state={instance.lifestyleState}
                    imageOverlay={lifestyleOverlay}
                  />
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400">1200 × 628</p>
          </div>
        </div>

        {/* Editor panel — owns its scroll */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 shrink-0">
            <p className="font-lgei font-bold text-[14px] text-gray-900" style={{ lineHeight: '18px' }}>
              {t('Editor Panel')}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">

          {/* Banner Type dropdown */}
          <div className="px-5 py-4 border-b border-gray-100">
            <label
              className="block text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide"
              style={{ lineHeight: '16px' }}
            >
              {t('Banner Type')}
            </label>
            <div className="relative">
              <select
                value={instance.type}
                onChange={(e) => onTypeChange(e.target.value as PromoType)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm text-gray-900 hover:border-gray-300 focus:border-[#FD312E] focus:outline-none transition-colors cursor-pointer"
                style={{ lineHeight: '20px' }}
              >
                <option value="promotion">{t('Promotion Theme Version')}</option>
                <option value="lifestyle">{t('Lifestyle Image Version')}</option>
              </select>
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
                width="12" height="12" viewBox="0 0 12 12" fill="none"
              >
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Preset selector — square mini-preview thumbnails, label on hover */}
          {instance.type === 'promotion' && (
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide" style={{ lineHeight: '16px' }}>
                {t('Example banners')}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                {makePromotionPresets(t).map((preset) => {
                  const isActive = instance.themeState.activePresetId === preset.id;
                  const presetState = applyPreset(instance.themeState, preset);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onThemeChange(presetState)}
                      className="group flex-shrink-0 relative overflow-hidden rounded-md border transition-colors"
                      style={{
                        // Banner aspect 1200/628 — fixed thumb width 130 → height ≈ 68
                        width: 130,
                        height: (130 * 628) / 1200,
                        borderColor: isActive ? '#FD312E' : '#e5e7eb',
                        background: '#262626',
                      }}
                    >
                      {/* Always render live (with text). PNG cache replaces it
                          once captured — but live render shows the full preset
                          layout (text + bg + products) instantly with no
                          loading state, matching user expectation. */}
                      {presetThumbCache[preset.id] ? (
                        <img
                          src={presetThumbCache[preset.id]}
                          alt={preset.label}
                          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
                          draggable={false}
                        />
                      ) : (
                        <div
                          style={{
                            width: 1200,
                            height: 628,
                            transform: `scale(${130 / 1200})`,
                            transformOrigin: 'top left',
                            pointerEvents: 'none',
                          }}
                        >
                          <OtherPromoThemeTemplate state={presetState} />
                        </div>
                      )}
                      {/* Hover dim + label overlay */}
                      <div
                        className="absolute inset-0 flex items-center justify-center text-center px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 500,
                          lineHeight: '14px',
                        }}
                      >
                        {preset.label}
                      </div>
                      {isActive && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ boxShadow: 'inset 0 0 0 2px #FD312E' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Type-specific fields */}
          {instance.type === 'promotion' ? (
            <PromotionEditPanel
              state={instance.themeState}
              onChange={onThemeChange}
              selectedImageId={selectedImageId}
              onSelectImage={setSelectedImageId}
            />
          ) : (
            <LifestyleEditPanel
              state={instance.lifestyleState}
              onChange={onLifestyleChange}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Promotion theme — edit panel                */
/* ─────────────────────────────────────────── */

interface PromotionEditPanelProps {
  state: OtherPromoThemeState;
  onChange: (s: OtherPromoThemeState) => void;
  selectedImageId: string | null;
  onSelectImage: (id: string | null) => void;
  /** Show the bottom "Reset" button. Default true (live Other Promotions);
   *  the Store Page Modules Banner passes false. */
  showReset?: boolean;
  /**
   * Which section group to render — 'all' (default, live Other Promotions) /
   * 'text' (Head & Sub copy, CTA, Disclaimer) / 'image' (Image background
   * color, Background text, Theme objects, Plus sign, Product images). Lets
   * the Store Page Modules Banner split text controls (kept inline in the EP)
   * from image controls (moved into a modal) without duplicating this panel.
   */
  sections?: 'all' | 'text' | 'image';
  /**
   * After background removal + brush, trim the product image to the bounding
   * box of its non-transparent (colored) content, so the product fills its
   * frame instead of sitting inside a large transparent margin. Opt-in — only
   * the Store Page Modules Banner passes true; the live Other Promotions
   * section keeps its raw framing.
   */
  autoCropContent?: boolean;
}


export function PromotionEditPanel({
  state,
  onChange,
  selectedImageId,
  onSelectImage,
  showReset = true,
  sections = 'all',
  autoCropContent = false,
}: PromotionEditPanelProps) {
  const showText = sections === 'all' || sections === 'text';
  const showImage = sections === 'all' || sections === 'image';
  const t = useT();
  // Hidden rulers — match template font/width to count wrapped lines / measure width
  const headRulerRef = useRef<HTMLDivElement>(null);
  const subRulerRef = useRef<HTMLDivElement>(null);
  const ctaRulerRef = useRef<HTMLSpanElement>(null);
  const disclaimerRulerRef = useRef<HTMLDivElement>(null);
  const bigTextRulerRef = useRef<HTMLDivElement>(null);
  // Preset thumbnail capture refs + force-update for cache fills
  const presetThumbRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [, forceThumbsUpdate] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    let cancelled = false;
    async function generate() {
      // Wait for fonts so LGEI Headline renders correctly in captures
      try { await (document as any).fonts?.ready; } catch { /* noop */ }
      for (const preset of makePromotionPresets(t)) {
        if (presetThumbCache[preset.id]) continue;
        const el = presetThumbRefs.current[preset.id];
        if (!el) continue;
        try {
          // Wait for product/theme images to load
          const imgs = el.querySelectorAll('img');
          await Promise.all(Array.from(imgs).map((img) => new Promise<void>((res) => {
            if (img.complete && img.naturalWidth > 0) res();
            else { img.onload = () => res(); img.onerror = () => res(); }
          })));
          // 2 warm-up passes to settle fonts + filters before final capture
          await toPng(el, { pixelRatio: 1 });
          await toPng(el, { pixelRatio: 1 });
          const dataUrl = await toPng(el, { pixelRatio: 1 });
          if (!cancelled) {
            presetThumbCache[preset.id] = dataUrl;
            forceThumbsUpdate();
          }
        } catch (err) {
          // Capture failure → fall back to live render in the button
        }
      }
    }
    generate();
    return () => { cancelled = true; };
  }, []);
  // Background removal pipeline state
  const [bgRemoveProgress, setBgRemoveProgress] = useState<string | null>(null);
  const [brushPending, setBrushPending] = useState<{
    bucket: Bucket;
    slotIdx: number;
    originalUrl: string;
    processedUrl: string;
  } | null>(null);
  // Per-slot fetch state for the 4 product image slots
  const [slotUrls, setSlotUrls] = useState<string[]>(() => Array(PRODUCT_SLOT_COUNT).fill(''));
  const [slotScraped, setSlotScraped] = useState<ScrapedImage[][]>(() =>
    Array.from({ length: PRODUCT_SLOT_COUNT }, () => [])
  );
  const [slotLoading, setSlotLoading] = useState<boolean[]>(() => Array(PRODUCT_SLOT_COUNT).fill(false));
  const [slotErrors, setSlotErrors] = useState<(string | null)[]>(() => Array(PRODUCT_SLOT_COUNT).fill(null));
  const [activeGallerySlot, setActiveGallerySlot] = useState<number | null>(null);
  const slotFileRefs = useRef<(HTMLInputElement | null)[]>(Array(PRODUCT_SLOT_COUNT).fill(null));
  // Theme object slot file refs (upload only)
  const themeFileRefs = useRef<(HTMLInputElement | null)[]>(Array(THEME_OBJECT_SLOT_COUNT).fill(null));
  // Asset library picker — open for a specific theme object slot
  const [activeLibrarySlot, setActiveLibrarySlot] = useState<number | null>(null);
  async function handleLibrarySelect(item: AssetItem) {
    if (activeLibrarySlot === null) return;
    const slotIdx = activeLibrarySlot;
    setActiveLibrarySlot(null);
    // item.full is already an absolute jsDelivr URL (or a relative path for
    // legacy manifests). prefetchFullAssetDataUrl memoizes by URL — if the
    // user hovered the thumb first, this resolves instantly from cache.
    const fullUrl = /^https?:\/\//i.test(item.full) ? item.full : '/asset-library/' + item.full.replace(/^\/+/, '');
    const dataUrl = await prefetchFullAssetDataUrl(fullUrl);
    if (!dataUrl) return;
    // Cutouts go straight into the slot — skip BG removal pipeline.
    setSlotImage('themeObjects', slotIdx, dataUrl);
  }

  function patch<K extends keyof OtherPromoThemeState>(key: K, value: OtherPromoThemeState[K]) {
    onChange({ ...state, [key]: value });
  }

  function countLines(ref: React.RefObject<HTMLDivElement | null>, value: string, lineH: number): number {
    const r = ref.current;
    if (!r) return 0;
    r.textContent = value || ' ';
    return Math.round(r.getBoundingClientRect().height / lineH);
  }

  function tryUpdateHead(v: string) {
    if (v.split('\n').length > 4) return;
    if (countLines(headRulerRef, v, 60 * 1.12) > 4) return;
    patch('headCopy', v);
  }
  function tryUpdateSub(v: string) {
    if (v.split('\n').length > 2) return;
    if (countLines(subRulerRef, v, 30 * 1.1) > 2) return;
    patch('subCopy', v);
  }
  function tryUpdateCta(v: string) {
    // CTA text is single-line, nowrap. Box max width = left col 600 - left pad 40 - right safety 40 = 520.
    // Inside, padding 32+32 = 64 → text max width ~456px.
    const r = ctaRulerRef.current;
    if (r) {
      r.textContent = v || ' ';
      if (r.getBoundingClientRect().width > 456) return;
    }
    patch('ctaText', v);
  }
  function tryUpdateDisclaimer(v: string) {
    if (v.split('\n').length > 2) return;
    if (countLines(disclaimerRulerRef, v, 18 * 1.1) > 2) return;
    patch('disclaimerText', v);
  }
  function tryUpdateBigText(v: string) {
    // Auto-wrap is enabled (whitespace: pre-wrap, width 608). Cap at 2 visual
    // lines counting both \n breaks and width-driven wraps.
    if (v.split('\n').length > 2) return;
    if (countLines(bigTextRulerRef, v, 150 * 0.9) > 2) return;
    patch('bigText', v);
  }

  /* ── BG removal pipeline ── */

  /**
   * Run AI background removal on a data URL, then open the BrushMaskEditor
   * for manual refinement. On Done → cleaned dataUrl is written to slot.
   * On Cancel → slot stays unchanged.
   *
   * Mirrors the EI shape banner Builder reference flow.
   */
  async function runBgRemovalPipeline(
    bucket: Bucket,
    slotIdx: number,
    originalDataUrl: string,
  ) {
    setBgRemoveProgress(t('Removing background…'));
    try {
      // Unified with the Store Page Modules flood-based remover (near-white,
      // outside-in) — keeps white products intact where the ML model ate them.
      const processedUrl = await removeBackgroundAI(originalDataUrl, setBgRemoveProgress);
      setBrushPending({ bucket, slotIdx, originalUrl: originalDataUrl, processedUrl });
    } catch (err) {
      console.error('Background removal failed:', err);
      // Fallback: open the brush editor with the ORIGINAL as both layers,
      // so the user can still manually erase the background.
      setBrushPending({ bucket, slotIdx, originalUrl: originalDataUrl, processedUrl: originalDataUrl });
    } finally {
      setBgRemoveProgress(null);
    }
  }

  /** Reopen the brush on a slot's existing cut, so a second visit continues the
   *  first rather than starting over. Both arms measure against the shot as
   *  supplied, which is what the restore brush samples from. */
  function editBgRemoval(bucket: Bucket, slotIdx: number) {
    const slot = bucket === 'productImages'
      ? state.productImages[slotIdx]
      : state.themeObjects[slotIdx];
    if (!slot?.sourceSrc) return;
    setBrushPending({
      bucket, slotIdx, originalUrl: slot.sourceSrc, processedUrl: slot.cutSrc ?? slot.src,
    });
  }

  async function handleBrushDone(resultDataUrl: string) {
    if (!brushPending) return;
    const { bucket, slotIdx, processedUrl, originalUrl } = brushPending;
    if (processedUrl.startsWith('blob:')) URL.revokeObjectURL(processedUrl);
    setBrushPending(null);
    // Banner: trim product images to their colored content so the product
    // fills its frame instead of floating in a transparent margin.
    let finalUrl = resultDataUrl;
    if (autoCropContent && bucket === 'productImages') {
      try { finalUrl = await trimToOpaqueBounds(resultDataUrl); } catch { /* keep original */ }
    }
    // Keep the source, and the untrimmed cut only when trimming actually moved
    // the pixels — otherwise `src` already IS the cut and a second copy of a
    // multi-megabyte data URL would go into every draft for nothing.
    setSlotImage(bucket, slotIdx, finalUrl, {
      sourceSrc: originalUrl,
      ...(finalUrl === resultDataUrl ? {} : { cutSrc: resultDataUrl }),
    });
  }

  function handleBrushCancel() {
    if (!brushPending) return;
    if (brushPending.processedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(brushPending.processedUrl);
    }
    setBrushPending(null);
  }

  /* ── Slot helpers (shared by products + theme objects) ── */

  function setSlotImage(
    bucket: Bucket,
    slotIdx: number,
    dataUrl: string,
    /** What "Edit background removal" resumes from; omitted for images that
     *  never went through it, which clears any stale pair from the slot. */
    cut?: { sourceSrc: string; cutSrc?: string },
  ) {
    const provenance = cut ?? {};
    const tmp = new Image();
    tmp.onload = () => {
      // Always recompute frame size from the NEW image's natural ratio so the
      // edit box matches the uploaded image proportions (not the previous one).
      const maxW = IMAGE_SECTION.width * 0.6;
      const maxH = IMAGE_SECTION.height * 0.6;
      const naturalRatio = tmp.naturalWidth / tmp.naturalHeight;
      let w = maxW;
      let h = w / naturalRatio;
      if (h > maxH) { h = maxH; w = h * naturalRatio; }

      if (bucket === 'productImages') {
        const next = [...state.productImages] as ProductImageSlots;
        const existing = next[slotIdx];
        if (existing) {
          // Replace: keep frame center + rotation. DROP imageScale/Offset since
          // those are preset-specific (e.g. pb-02's 1.59× zoom) and would clip
          // the new image incorrectly. New image renders with default contain-fit.
          const cx = existing.x + existing.width / 2;
          const cy = existing.y + existing.height / 2;
          next[slotIdx] = {
            id: existing.id,
            src: dataUrl,
            x: cx - w / 2,
            y: cy - h / 2,
            width: w,
            height: h,
            ...(existing.rotation !== undefined ? { rotation: existing.rotation } : {}),
            ...provenance,
          };
          onChange({ ...state, productImages: next });
          onSelectImage(existing.id);
        } else {
          const id = `product-${slotIdx}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          next[slotIdx] = {
            id, src: dataUrl,
            x: (IMAGE_SECTION.width - w) / 2,
            y: (IMAGE_SECTION.height - h) / 2,
            width: w, height: h,
            ...provenance,
          };
          onChange({ ...state, productImages: next });
          onSelectImage(id);
        }
      } else {
        const next = [...state.themeObjects] as ThemeObjectSlots;
        const existing = next[slotIdx];
        if (existing) {
          const cx = existing.x + existing.width / 2;
          const cy = existing.y + existing.height / 2;
          next[slotIdx] = {
            id: existing.id,
            src: dataUrl,
            x: cx - w / 2,
            y: cy - h / 2,
            width: w,
            height: h,
            ...(existing.rotation !== undefined ? { rotation: existing.rotation } : {}),
            ...provenance,
          };
          onChange({ ...state, themeObjects: next });
          onSelectImage(existing.id);
        } else {
          const id = `theme-${slotIdx}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          next[slotIdx] = {
            id, src: dataUrl,
            x: (IMAGE_SECTION.width - w) / 2,
            y: (IMAGE_SECTION.height - h) / 2,
            width: w, height: h,
            ...provenance,
          };
          onChange({ ...state, themeObjects: next });
          onSelectImage(id);
        }
      }
    };
    tmp.src = dataUrl;
  }

  function clearSlot(bucket: Bucket, slotIdx: number) {
    if (bucket === 'productImages') {
      const slot = state.productImages[slotIdx];
      const next = [...state.productImages] as ProductImageSlots;
      next[slotIdx] = null;
      onChange({ ...state, productImages: next });
      if (slot && selectedImageId === slot.id) onSelectImage(null);
      setSlotUrls((prev) => { const n = [...prev]; n[slotIdx] = ''; return n; });
      setSlotScraped((prev) => { const n = [...prev]; n[slotIdx] = []; return n; });
    } else {
      const slot = state.themeObjects[slotIdx];
      const next = [...state.themeObjects] as ThemeObjectSlots;
      next[slotIdx] = null;
      onChange({ ...state, themeObjects: next });
      if (slot && selectedImageId === slot.id) onSelectImage(null);
    }
  }

  function handleSlotUpload(
    bucket: Bucket,
    slotIdx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      runBgRemovalPipeline(bucket, slotIdx, dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleSlotFetch(slotIdx: number) {
    const url = slotUrls[slotIdx].trim();
    if (!url) return;
    try { new URL(url); } catch {
      setSlotErrors((prev) => { const n = [...prev]; n[slotIdx] = t('Please enter a valid URL (e.g., https://...)'); return n; });
      return;
    }
    setSlotLoading((prev) => { const n = [...prev]; n[slotIdx] = true; return n; });
    setSlotErrors((prev) => { const n = [...prev]; n[slotIdx] = null; return n; });
    const result = await scrapeProductImages(url);
    setSlotScraped((prev) => { const n = [...prev]; n[slotIdx] = result.images; return n; });
    setSlotErrors((prev) => { const n = [...prev]; n[slotIdx] = result.error || null; return n; });
    setSlotLoading((prev) => { const n = [...prev]; n[slotIdx] = false; return n; });
    if (result.images.length > 0) setActiveGallerySlot(slotIdx);
  }

  async function handleGallerySelect(scraped: ScrapedImage) {
    if (activeGallerySlot === null) return;
    const slotIdx = activeGallerySlot;
    setActiveGallerySlot(null);
    const proxied = getProxiedImageUrl(scraped.url);
    const dataUrl = await fetchAsDataUrl(proxied);
    if (!dataUrl) {
      setSlotErrors((prev) => { const n = [...prev]; n[slotIdx] = t('Could not load image'); return n; });
      return;
    }
    runBgRemovalPipeline('productImages', slotIdx, dataUrl);
  }

  /* ── Reset ── */
  function handleReset() {
    // If a preset was applied, restore that preset's defaults; else fall back
    // to the plain default state.
    const activePreset = state.activePresetId
      ? makePromotionPresets(t).find((p) => p.id === state.activePresetId)
      : undefined;
    const baseDefault = makeOtherPromoThemeState(t);
    onChange(activePreset ? applyPreset(baseDefault, activePreset) : baseDefault);
    setSlotUrls(Array(PRODUCT_SLOT_COUNT).fill(''));
    setSlotScraped(Array.from({ length: PRODUCT_SLOT_COUNT }, () => []));
    setSlotErrors(Array(PRODUCT_SLOT_COUNT).fill(null));
    setSlotLoading(Array(PRODUCT_SLOT_COUNT).fill(false));
    onSelectImage(null);
  }

  // Common ruler style — fixed off-screen, inherits LGEI Headline.
  const rulerBase: React.CSSProperties = {
    position: 'fixed', top: -9999, left: -9999,
    fontFamily: 'var(--obs-font)',
    visibility: 'hidden', pointerEvents: 'none',
    padding: 0, margin: 0, border: 'none',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hidden rulers matched to template font/width */}
      <div ref={headRulerRef} style={{ ...rulerBase, width: 560, fontSize: 60, letterSpacing: 'var(--obs-tracking-head)', fontWeight: 600, lineHeight: 1.12 }} />
      <div ref={subRulerRef} style={{ ...rulerBase, width: 560, fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, lineHeight: 1.1 }} />
      <span ref={ctaRulerRef} style={{ ...rulerBase, whiteSpace: 'nowrap', fontSize: 32, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, lineHeight: 1.2 }} />
      <div ref={disclaimerRulerRef} style={{ ...rulerBase, width: 561, fontSize: 18, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, lineHeight: 1.1 }} />
      {/* Big text ruler — match template's pre-wrap + wordBreak break-word.
          rulerBase already has these, just override width to current preset. */}
      <div ref={bigTextRulerRef} style={{ ...rulerBase, width: state.bigTextWidth, fontSize: 150, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, lineHeight: 0.9 }} />

      {/* Hidden full-size preset render area for thumbnail capture (one-time) */}
      <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        {makePromotionPresets(t).map((preset) => (
          <div
            key={preset.id}
            ref={(el) => { presetThumbRefs.current[preset.id] = el; }}
            style={{ width: 1200, height: 628 }}
          >
            <OtherPromoThemeTemplate state={applyPreset(state, preset)} />
          </div>
        ))}
      </div>

      {showText && (
      <>
      {/* Head + sub copy */}
      <PanelGroup title={t('Head & Sub copy')}>
        <FieldLabel>{t('Head copy')} · {t('Max 4 lines')}</FieldLabel>
        <textarea
          value={state.headCopy}
          onChange={(e) => tryUpdateHead(e.target.value)}
          rows={4}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 hover:border-gray-300 focus:border-[#FD312E] focus:outline-none transition-colors resize-none"
          style={{ lineHeight: '20px' }}
        />
        <div className="flex items-center justify-between mt-3 mb-1">
          <FieldLabel>{t('Sub copy')} · {t('Max 2 lines')}</FieldLabel>
          <ShowToggle checked={state.showSubCopy} onChange={(v) => patch('showSubCopy', v)} />
        </div>
        {state.showSubCopy && (
          <textarea
            value={state.subCopy}
            onChange={(e) => tryUpdateSub(e.target.value)}
            rows={2}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 hover:border-gray-300 focus:border-[#FD312E] focus:outline-none transition-colors resize-none"
            style={{ lineHeight: '20px' }}
          />
        )}
      </PanelGroup>

      {/* CTA */}
      <PanelGroup title={t('CTA text')}>
        <input
          type="text"
          value={state.ctaText}
          onChange={(e) => tryUpdateCta(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 hover:border-gray-300 focus:border-[#FD312E] focus:outline-none transition-colors"
          style={{ lineHeight: '20px' }}
        />
      </PanelGroup>

      {/* Disclaimer */}
      <PanelGroup
        title={`${t('Disclaimer')} · ${t('Max 2 lines')}`}
        right={<ShowToggle checked={state.showDisclaimer} onChange={(v) => patch('showDisclaimer', v)} />}
      >
        {state.showDisclaimer && (
          <textarea
            value={state.disclaimerText}
            onChange={(e) => tryUpdateDisclaimer(e.target.value)}
            rows={2}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 hover:border-gray-300 focus:border-[#FD312E] focus:outline-none transition-colors resize-none"
            style={{ lineHeight: '20px' }}
          />
        )}
      </PanelGroup>
      </>
      )}

      {showImage && (
      <>
      {/* Image background color */}
      <PanelGroup title={t('Image background color')}>
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(IMAGE_BG_COLORS) as ImageBgColorKey[]).map((key) => {
            const isActive = state.imageBgColor === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => patch('imageBgColor', key)}
                title={IMAGE_BG_COLOR_LABELS[key]}
                className="relative w-full aspect-square rounded-md transition-transform"
                style={{
                  background: IMAGE_BG_COLORS[key],
                  border: isActive ? '2px solid #FD312E' : '1px solid #e5e7eb',
                  transform: isActive ? 'scale(1.08)' : 'scale(1)',
                }}
              />
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-2" style={{ lineHeight: '16px' }}>
          {IMAGE_BG_COLOR_LABELS[state.imageBgColor]}
        </p>
      </PanelGroup>

      {/* Background text */}
      <PanelGroup
        title={t('Background text')}
        right={<ShowToggle checked={state.showBigText} onChange={(v) => patch('showBigText', v)} />}
      >
        {state.showBigText && (
          <>
            <textarea
              value={state.bigText}
              onChange={(e) => tryUpdateBigText(e.target.value)}
              rows={2}
              placeholder={t('Up to 2 lines')}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 hover:border-gray-300 focus:border-[#FD312E] focus:outline-none transition-colors resize-none"
              style={{ lineHeight: '20px' }}
            />
            <p className="text-[11px] text-gray-400 mt-1" style={{ lineHeight: '16px' }}>
              {t('Auto-wraps at width; Enter for explicit break. Max 2 lines.')}
            </p>
          </>
        )}
      </PanelGroup>

      {/* Theme objects — 2 fixed slots, upload-only, master toggle */}
      <PanelGroup
        title={t('Theme objects')}
        right={
          <div className="flex items-center gap-1">
            <LockToggle locked={state.lockThemeObjects} onChange={(v) => patch('lockThemeObjects', v)} />
            <ShowToggle checked={state.showThemeObjects} onChange={(v) => patch('showThemeObjects', v)} />
          </div>
        }
      >
        {state.showThemeObjects && (
          <>
            <div className="flex flex-col gap-4">
              {Array.from({ length: THEME_OBJECT_SLOT_COUNT }).map((_, slotIdx) => {
                const slot = state.themeObjects[slotIdx];
                const isSelected = !!slot && selectedImageId === slot.id;
                return (
                  <div
                    key={slotIdx}
                    className="rounded-lg border p-3 transition-colors"
                    style={{
                      borderColor: isSelected ? '#22C55E' : '#e5e7eb',
                      background: isSelected ? '#F0FDF4' : 'white',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                        {t('Theme object')} {slotIdx + 1}
                      </span>
                      {slot && (
                        <>
                          <button
                            type="button"
                            onClick={() => onSelectImage(slot.id)}
                            className="w-7 h-7 rounded bg-gray-100 overflow-hidden flex-shrink-0"
                            title={t('Select')}
                          >
                            <img src={slot.src} alt="" className="w-full h-full object-contain" />
                          </button>
                          <button
                            type="button"
                            onClick={() => clearSlot('themeObjects', slotIdx)}
                            className="ml-auto p-1 text-gray-300 hover:text-red-500 rounded"
                            title={t('Clear slot')}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4M8.5 6v4M3 3.5l.5 8h7l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-stretch gap-1.5">
                      <button
                        type="button"
                        onClick={() => themeFileRefs.current[slotIdx]?.click()}
                        className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
                      >
                        {slot ? t('Replace by upload') : t('Upload image')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLibrarySlot(slotIdx)}
                        className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
                      >
                        {t('Pick from library')}
                      </button>
                    </div>
                    <input
                      ref={(el) => { themeFileRefs.current[slotIdx] = el; }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSlotUpload('themeObjects', slotIdx, e)}
                      className="hidden"
                    />
                    {slot?.sourceSrc && (
                      <button
                        type="button"
                        onClick={() => editBgRemoval('themeObjects', slotIdx)}
                        className="mt-1.5 w-full flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M16.862 3.487a2.25 2.25 0 013.182 3.182L7.5 19.212 3 20.25l1.038-4.5L16.862 3.487z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t('Edit background removal')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">{t('Blur')}</span>
                <span className="text-[11px] text-gray-400 tabular-nums">{state.objectBlur ?? 30}</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={state.objectBlur ?? 30}
                onChange={(e) => patch('objectBlur', Number(e.target.value))}
                className="w-full accent-[#FD312E]"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-3" style={{ lineHeight: '16px' }}>
              {t('Drag to move, corner handle to resize, top handle to rotate.')}
            </p>
          </>
        )}
      </PanelGroup>

      {/* Plus sign — single, for bundle sale banners */}
      <PanelGroup
        title={t('Plus sign')}
        right={
          <div className="flex items-center gap-1">
            <LockToggle locked={state.lockPlusSign} onChange={(v) => patch('lockPlusSign', v)} />
            <ShowToggle checked={state.showPlusSign} onChange={(v) => patch('showPlusSign', v)} />
          </div>
        }
      >
        <p className="text-[11px] text-gray-400" style={{ lineHeight: '16px' }}>
          {t('Use this when creating a bundle sale banner.')}
        </p>
      </PanelGroup>

      {/* Product images — 4 fixed slots */}
      <PanelGroup
        title={t('Product images')}
        right={<LockToggle locked={state.lockProductImages} onChange={(v) => patch('lockProductImages', v)} />}
      >
        <div className="flex flex-col gap-4">
          {Array.from({ length: PRODUCT_SLOT_COUNT }).map((_, slotIdx) => {
            const slot = state.productImages[slotIdx];
            const isSelected = !!slot && selectedImageId === slot.id;
            return (
              <div
                key={slotIdx}
                className="rounded-lg border p-3 transition-colors"
                style={{
                  borderColor: isSelected ? '#FD312E' : '#e5e7eb',
                  background: isSelected ? '#FFF1F4' : 'white',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                    {t('Product')} {slotIdx + 1}
                  </span>
                  {slot && (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectImage(slot.id)}
                        className="w-7 h-7 rounded bg-gray-100 overflow-hidden flex-shrink-0"
                        title={t('Select')}
                      >
                        <img src={slot.src} alt="" className="w-full h-full object-contain" />
                      </button>
                      <button
                        type="button"
                        onClick={() => clearSlot('productImages', slotIdx)}
                        className="ml-auto p-1 text-gray-300 hover:text-red-500 rounded"
                        title={t('Clear slot')}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4M8.5 6v4M3 3.5l.5 8h7l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>

                {/* URL fetch */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={slotUrls[slotIdx]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSlotUrls((prev) => { const n = [...prev]; n[slotIdx] = v; return n; });
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSlotFetch(slotIdx); }}
                    placeholder={t('Paste LG.com product URL...')}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#FD312E]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSlotFetch(slotIdx)}
                    disabled={slotLoading[slotIdx]}
                    className="px-2.5 py-1.5 bg-[#FD312E] text-white text-xs rounded-lg hover:bg-[#E22825] disabled:opacity-50 shrink-0"
                  >
                    {slotLoading[slotIdx] ? '…' : t('Import')}
                  </button>
                </div>
                {slotErrors[slotIdx] && (
                  <p className="text-[11px] text-red-500 mt-1" style={{ lineHeight: '14px' }}>
                    {slotErrors[slotIdx]}
                  </p>
                )}
                {slotScraped[slotIdx].length > 0 && activeGallerySlot !== slotIdx && (
                  <button
                    type="button"
                    onClick={() => setActiveGallerySlot(slotIdx)}
                    className="text-[11px] text-[#FD312E] underline mt-1"
                    style={{ lineHeight: '14px' }}
                  >
                    {t('Change from imported images')}
                  </button>
                )}

                {/* Upload */}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => slotFileRefs.current[slotIdx]?.click()}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
                  >
                    {slot ? t('Replace by upload') : t('Upload image')}
                  </button>
                  <input
                    ref={(el) => { slotFileRefs.current[slotIdx] = el; }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSlotUpload('productImages', slotIdx, e)}
                    className="hidden"
                  />
                </div>

                {/* Reopen the brush on this slot's cut. Only offered where there
                    is a cut to reopen — a slot filled before this existed has no
                    source to restore from, and offering it would open an editor
                    whose restore brush does nothing. */}
                {slot?.sourceSrc && (
                  <button
                    type="button"
                    onClick={() => editBgRemoval('productImages', slotIdx)}
                    className="mt-1.5 w-full flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M16.862 3.487a2.25 2.25 0 013.182 3.182L7.5 19.212 3 20.25l1.038-4.5L16.862 3.487z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {t('Edit background removal')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-3" style={{ lineHeight: '16px' }}>
          {t('Click image in preview to drag. Use corner handle to resize.')}
        </p>

        {/* Shared gallery modal — opens for the active slot */}
        {activeGallerySlot !== null && (
          <ImageGalleryModal
            images={slotScraped[activeGallerySlot]}
            isLoading={slotLoading[activeGallerySlot]}
            error={slotErrors[activeGallerySlot]}
            onSelect={handleGallerySelect}
            onCancel={() => setActiveGallerySlot(null)}
            whiteBackgroundOnly
          />
        )}

        {/* Asset library modal — opens for theme object slots */}
        <AssetLibraryModal
          open={activeLibrarySlot !== null}
          onClose={() => setActiveLibrarySlot(null)}
          onSelect={handleLibrarySelect}
        />

        {/* AI background-removal progress overlay */}
        {bgRemoveProgress && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl px-6 py-5 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-[#FD312E] border-t-transparent animate-spin" />
              <p className="text-sm text-gray-800">{bgRemoveProgress}</p>
            </div>
          </div>
        )}

        {/* Brush mask editor — opens after AI removal for manual touch-up */}
        {brushPending && (
          <BrushMaskEditor
            originalUrl={brushPending.originalUrl}
            processedUrl={brushPending.processedUrl}
            onDone={handleBrushDone}
            onCancel={handleBrushCancel}
          />
        )}
      </PanelGroup>
      </>
      )}

      {/* Reset to default — last */}
      {showReset && (
        <div className="px-5 py-5 border-t border-gray-100">
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 text-sm text-gray-400 rounded-lg border border-gray-200 hover:border-gray-400 hover:text-gray-600 transition-colors"
          >
            {t('Reset')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Panel UI primitives (local)                  */
/* ─────────────────────────────────────────── */

export function PanelGroup({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide" style={{ lineHeight: '16px' }}>
          {title}
        </p>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Padlock toggle — shown in panel headers to lock/unlock a bucket against
 *  selection/drag in the preview. Locked = closed padlock + red tint. */
function LockToggle({ locked, onChange }: { locked: boolean; onChange: (v: boolean) => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => onChange(!locked)}
      className="p-1 rounded transition-colors"
      style={{
        background: locked ? '#FFF1F4' : 'transparent',
        color: locked ? '#FD312E' : '#9ca3af',
      }}
      title={locked ? t('Unlock') : t('Lock')}
    >
      {locked ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="3.5" y="7" width="9" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M5.5 7V4.5a2.5 2.5 0 015 0V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="3.5" y="7" width="9" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M5.5 7V4.5a2.5 2.5 0 014.6-1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-gray-500 mb-1" style={{ lineHeight: '14px' }}>
      {children}
    </p>
  );
}

/* ─────────────────────────────────────────── */
/* PlacedImage overlay — products + theme objs  */
/* Renders at BANNER level (1200×628) so handles*/
/* past image-section bounds aren't clipped.    */
/* No drag clamp — visible portion is masked     */
/* by image-section overflow:hidden.            */
/* ─────────────────────────────────────────── */

interface OverlayProps {
  themeState: OtherPromoThemeState;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  previewScale: number;
  onChange: (s: OtherPromoThemeState) => void;
}

// Rotation snaps magnetically to common design angles when the handle comes within
// ROTATION_SNAP_DEG of one — 0/30/45/60/90/… and their negatives. Free rotation is
// still possible between snap zones.
const ROTATION_SNAP_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, -180, -30, -45, -60, -90, -120, -135, -150];
const ROTATION_SNAP_DEG = 7;
function snapRotation(deg: number): number {
  let best = deg;
  let bestDist = ROTATION_SNAP_DEG;
  for (const a of ROTATION_SNAP_ANGLES) {
    const d = Math.abs(deg - a);
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best;
}

export function PlacedImageOverlay({ themeState, selectedId, onSelect, previewScale, onChange }: OverlayProps) {
  // Smart-guide state during active drag. Stored as image-section coords.
  const [guides, setGuides] = useState<{ vx: number | null; hy: number | null }>({ vx: null, hy: null });

  // Combined entries with their bucket so we can patch the right list.
  // Locked buckets are excluded so their hit areas don't intercept clicks.
  const entries: { img: PlacedImage; bucket: Bucket }[] = [
    ...(themeState.showThemeObjects && !themeState.lockThemeObjects ? themeState.themeObjects
      .filter((img): img is PlacedImage => !!img)
      .map((img) => ({ img, bucket: 'themeObjects' as const })) : []),
    ...(themeState.showPlusSign && !themeState.lockPlusSign
      ? [{ img: themeState.plusSign, bucket: 'plusSign' as const }]
      : []),
    ...(themeState.lockProductImages ? [] : themeState.productImages
      .filter((img): img is PlacedImage => !!img)
      .map((img) => ({ img, bucket: 'productImages' as const }))),
  ];

  function patchImg(bucket: Bucket, id: string, patch: Partial<PlacedImage>) {
    if (bucket === 'themeObjects') {
      const next = themeState.themeObjects.map((i) => (i && i.id === id ? { ...i, ...patch } : i)) as ThemeObjectSlots;
      onChange({ ...themeState, themeObjects: next });
    } else if (bucket === 'plusSign') {
      onChange({ ...themeState, plusSign: { ...themeState.plusSign, ...patch } });
    } else {
      const next = themeState.productImages.map((i) => (i && i.id === id ? { ...i, ...patch } : i)) as ProductImageSlots;
      onChange({ ...themeState, productImages: next });
    }
  }

  function findImg(bucket: Bucket, id: string): PlacedImage | undefined {
    if (bucket === 'plusSign') {
      return themeState.plusSign.id === id ? themeState.plusSign : undefined;
    }
    const list: (PlacedImage | null)[] = bucket === 'themeObjects' ? themeState.themeObjects : themeState.productImages;
    return list.find((i): i is PlacedImage => !!i && i.id === id);
  }

  function startDrag(e: React.PointerEvent, id: string, bucket: Bucket) {
    e.stopPropagation();
    e.preventDefault();
    const img = findImg(bucket, id);
    if (!img) return;
    onSelect(id);
    const startX = e.clientX;
    const startY = e.clientY;
    const startImgX = img.x;
    const startImgY = img.y;

    // Smart-guide targets (image-section coords).
    // - Products: snap to other products' edges + centers + section center
    // - Plus sign: snap to MIDPOINT between any 2 products + section center
    const SNAP_PX = 6;
    const guideTargetsX: number[] = [IMAGE_SECTION.width / 2];
    const guideTargetsY: number[] = [IMAGE_SECTION.height / 2];

    if (bucket === 'productImages') {
      const collect = (other: PlacedImage | null) => {
        if (!other || other.id === id) return;
        guideTargetsX.push(other.x);                      // left
        guideTargetsX.push(other.x + other.width / 2);    // center
        guideTargetsX.push(other.x + other.width);        // right
        guideTargetsY.push(other.y);                      // top
        guideTargetsY.push(other.y + other.height / 2);   // center
        guideTargetsY.push(other.y + other.height);       // bottom
      };
      themeState.productImages.forEach(collect);
      if (themeState.showPlusSign) collect(themeState.plusSign);
    } else if (bucket === 'plusSign') {
      const visible = themeState.productImages.filter((p): p is PlacedImage => !!p);
      // Align the plus sign to each product's edges + center…
      visible.forEach((other) => {
        guideTargetsX.push(other.x);                      // left
        guideTargetsX.push(other.x + other.width / 2);    // center
        guideTargetsX.push(other.x + other.width);        // right
        guideTargetsY.push(other.y);                      // top
        guideTargetsY.push(other.y + other.height / 2);   // center
        guideTargetsY.push(other.y + other.height);       // bottom
      });
      // …and to the midpoint between every PAIR of visible products.
      for (let i = 0; i < visible.length; i++) {
        for (let j = i + 1; j < visible.length; j++) {
          const a = visible[i];
          const b = visible[j];
          guideTargetsX.push((a.x + a.width / 2 + b.x + b.width / 2) / 2);
          guideTargetsY.push((a.y + a.height / 2 + b.y + b.height / 2) / 2);
        }
      }
    }
    const useGuides = bucket === 'productImages' || bucket === 'plusSign';

    function onMove(ev: PointerEvent) {
      const dx = (ev.clientX - startX) / previewScale;
      const dy = (ev.clientY - startY) / previewScale;
      let nextX = startImgX + dx;
      let nextY = startImgY + dy;

      // Smart-guide snap. Try aligning ANY of the dragged frame's 3 X-axis
      // points (left / center / right) to the closest target X; same for Y.
      let snapVx: number | null = null;
      let snapHy: number | null = null;
      if (useGuides) {
        const fromX = [nextX, nextX + img!.width / 2, nextX + img!.width];
        const fromY = [nextY, nextY + img!.height / 2, nextY + img!.height];
        let bestDx = SNAP_PX;
        let snapDeltaX = 0;
        for (const fx of fromX) {
          for (const tx of guideTargetsX) {
            const d = Math.abs(fx - tx);
            if (d < bestDx) { bestDx = d; snapVx = tx; snapDeltaX = tx - fx; }
          }
        }
        nextX += snapDeltaX;
        let bestDy = SNAP_PX;
        let snapDeltaY = 0;
        for (const fy of fromY) {
          for (const ty of guideTargetsY) {
            const d = Math.abs(fy - ty);
            if (d < bestDy) { bestDy = d; snapHy = ty; snapDeltaY = ty - fy; }
          }
        }
        nextY += snapDeltaY;
      }

      // Plus sign: clamp to image-section bounds
      if (bucket === 'plusSign') {
        nextX = Math.max(0, Math.min(IMAGE_SECTION.width - img!.width, nextX));
        nextY = Math.max(0, Math.min(IMAGE_SECTION.height - img!.height, nextY));
      }

      setGuides({ vx: snapVx, hy: snapHy });
      patchImg(bucket, id, { x: nextX, y: nextY });
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setGuides({ vx: null, hy: null });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startRotate(e: React.PointerEvent, id: string, bucket: Bucket) {
    e.stopPropagation();
    e.preventDefault();
    const img = findImg(bucket, id);
    if (!img) return;
    // Frame wrapper is the parent of the handle in DOM. Use its bounding rect
    // (post-transform AABB) — its center == frame center (rotation pivot).
    const wrapper = (e.currentTarget as HTMLElement).parentElement;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const startRot = img.rotation ?? 0;

    function onMove(ev: PointerEvent) {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      let delta = ((angle - startAngle) * 180) / Math.PI;
      let newRot = startRot + delta;
      while (newRot > 180) newRot -= 360;
      while (newRot < -180) newRot += 360;
      newRot = snapRotation(newRot);
      patchImg(bucket, id, { rotation: newRot });
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startResize(e: React.PointerEvent, id: string, bucket: Bucket) {
    e.stopPropagation();
    e.preventDefault();
    const img = findImg(bucket, id);
    if (!img) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = img.width;
    const startH = img.height;
    const ratio = startW / startH;
    const rot = img.rotation ?? 0;
    const cos = Math.cos((rot * Math.PI) / 180);
    const sin = Math.sin((rot * Math.PI) / 180);

    function onMove(ev: PointerEvent) {
      const dxView = (ev.clientX - startX) / previewScale;
      const dyView = (ev.clientY - startY) / previewScale;
      // Project viewport delta onto the rotated frame's local axes
      const dxLocal = dxView * cos + dyView * sin;
      const dyLocal = -dxView * sin + dyView * cos;
      const proposeFromX = startW + dxLocal;
      const proposeFromY = (startH + dyLocal) * ratio;
      let newW = Math.max(40, Math.max(proposeFromX, proposeFromY));
      let newH = newW / ratio;
      patchImg(bucket, id, { width: newW, height: newH });
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Visual handle size — scale-inverse so it stays fixed visual px on screen
  const handleSize = 14 / previewScale;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
      onPointerDown={() => onSelect(null)}
    >
      {/* Smart guides — magenta lines through aligned center, in image-section coords */}
      {guides.vx !== null && (
        <div
          style={{
            position: 'absolute',
            left: IMAGE_SECTION.left + guides.vx,
            top: IMAGE_SECTION.top,
            width: 0,
            height: IMAGE_SECTION.height,
            borderLeft: `${2 / previewScale}px dashed #FF00C8`,
            pointerEvents: 'none',
          }}
        />
      )}
      {guides.hy !== null && (
        <div
          style={{
            position: 'absolute',
            left: IMAGE_SECTION.left,
            top: IMAGE_SECTION.top + guides.hy,
            width: IMAGE_SECTION.width,
            height: 0,
            borderTop: `${2 / previewScale}px dashed #FF00C8`,
            pointerEvents: 'none',
          }}
        />
      )}

      {entries.map(({ img, bucket }) => {
        const isSelected = selectedId === img.id;
        const rot = img.rotation ?? 0;
        // Distinguish bucket types visually:
        //   theme objects = green, plus sign = blue, products = LG red
        const accent =
          bucket === 'themeObjects' ? '#22C55E'
          : bucket === 'plusSign' ? '#3B82F6'
          : '#FD312E';
        // Translate from image-section coords → banner coords for hit area + handle
        const bx = IMAGE_SECTION.left + img.x;
        const by = IMAGE_SECTION.top + img.y;
        return (
          <div
            key={img.id}
            style={{
              position: 'absolute',
              left: bx,
              top: by,
              width: img.width,
              height: img.height,
              transform: rot ? `rotate(${rot}deg)` : undefined,
              transformOrigin: 'center',
              pointerEvents: 'none',
            }}
          >
            {/* Hit area (full frame) */}
            <div
              onPointerDown={(e) => startDrag(e, img.id, bucket)}
              style={{
                position: 'absolute',
                inset: 0,
                cursor: 'move',
                pointerEvents: 'auto',
                outline: isSelected ? `${2 / previewScale}px solid ${accent}` : 'none',
              }}
            />
            {/* Resize handle — bottom-right (not for plus sign — drag-only) */}
            {isSelected && bucket !== 'plusSign' && (
              <div
                onPointerDown={(e) => startResize(e, img.id, bucket)}
                style={{
                  position: 'absolute',
                  left: img.width - handleSize / 2,
                  top: img.height - handleSize / 2,
                  width: handleSize,
                  height: handleSize,
                  background: accent,
                  border: `${2 / previewScale}px solid white`,
                  borderRadius: handleSize / 4,
                  cursor: 'nwse-resize',
                  pointerEvents: 'auto',
                  boxShadow: `0 ${2 / previewScale}px ${4 / previewScale}px rgba(0,0,0,0.3)`,
                }}
              />
            )}
            {/* Rotation handle — top-center, theme objects only */}
            {isSelected && bucket === 'themeObjects' && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    left: img.width / 2 - 1 / previewScale,
                    top: -32 / previewScale,
                    width: 2 / previewScale,
                    height: 32 / previewScale,
                    background: accent,
                    pointerEvents: 'none',
                  }}
                />
                <div
                  onPointerDown={(e) => startRotate(e, img.id, bucket)}
                  style={{
                    position: 'absolute',
                    left: img.width / 2 - handleSize / 2,
                    top: -32 / previewScale - handleSize / 2,
                    width: handleSize,
                    height: handleSize,
                    background: accent,
                    border: `${2 / previewScale}px solid white`,
                    borderRadius: '50%',
                    cursor: 'grab',
                    pointerEvents: 'auto',
                    boxShadow: `0 ${2 / previewScale}px ${4 / previewScale}px rgba(0,0,0,0.3)`,
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Lifestyle — edit panel                       */
/* Same copy controls as Promotion + image      */
/* upload (drag/resize handled in preview)      */
/* ─────────────────────────────────────────── */

interface LifestyleEditPanelProps {
  state: OtherPromoLifestyleState;
  onChange: (s: OtherPromoLifestyleState) => void;
}

function LifestyleEditPanel({ state, onChange }: LifestyleEditPanelProps) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const headRulerRef = useRef<HTMLDivElement>(null);
  const subRulerRef = useRef<HTMLDivElement>(null);
  const ctaRulerRef = useRef<HTMLSpanElement>(null);
  const disclaimerRulerRef = useRef<HTMLDivElement>(null);

  function patch<K extends keyof OtherPromoLifestyleState>(key: K, value: OtherPromoLifestyleState[K]) {
    onChange({ ...state, [key]: value });
  }

  function countLines(ref: React.RefObject<HTMLDivElement | null>, value: string, lineH: number): number {
    const r = ref.current;
    if (!r) return 0;
    r.textContent = value || ' ';
    return Math.round(r.getBoundingClientRect().height / lineH);
  }

  function tryUpdateHead(v: string) {
    if (v.split('\n').length > 4) return;
    if (countLines(headRulerRef, v, 60 * 1.12) > 4) return;
    patch('headCopy', v);
  }
  function tryUpdateSub(v: string) {
    if (v.split('\n').length > 2) return;
    if (countLines(subRulerRef, v, 30 * 1.1) > 2) return;
    patch('subCopy', v);
  }
  function tryUpdateCta(v: string) {
    const r = ctaRulerRef.current;
    if (r) {
      r.textContent = v || ' ';
      if (r.getBoundingClientRect().width > 456) return;
    }
    patch('ctaText', v);
  }
  function tryUpdateDisclaimer(v: string) {
    if (v.split('\n').length > 2) return;
    if (countLines(disclaimerRulerRef, v, 18 * 1.1) > 2) return;
    patch('disclaimerText', v);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const tmp = new Image();
      tmp.onload = () => {
        const naturalRatio = tmp.naturalWidth / tmp.naturalHeight;
        // Masked layer initial: 2× shape size for generous drag/scroll range.
        // Smaller multipliers (e.g. 1.1×) leave only ~5% drag room on each
        // axis, making it impossible to pan to the image edges.
        const SCALE = 2.0;
        const shapeRatio = LIFESTYLE_SHAPE.width / LIFESTYLE_SHAPE.height;
        let w: number;
        let h: number;
        if (naturalRatio > shapeRatio) {
          h = LIFESTYLE_SHAPE.height * SCALE;
          w = h * naturalRatio;
        } else {
          w = LIFESTYLE_SHAPE.width * SCALE;
          h = w / naturalRatio;
        }
        const cx = LIFESTYLE_SHAPE.left + LIFESTYLE_SHAPE.width / 2;
        const cy = LIFESTYLE_SHAPE.top + LIFESTYLE_SHAPE.height / 2;
        onChange({
          ...state,
          imageSrc: dataUrl,
          imageX: cx - w / 2,
          imageY: cy - h / 2,
          imageWidth: w,
          imageHeight: h,
        });
      };
      tmp.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    onChange({ ...state, imageSrc: null });
  }

  function handleReset() {
    onChange(makeOtherPromoLifestyleState(t));
  }

  const rulerBase: React.CSSProperties = {
    position: 'fixed', top: -9999, left: -9999,
    fontFamily: 'var(--obs-font)',
    visibility: 'hidden', pointerEvents: 'none',
    padding: 0, margin: 0, border: 'none',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hidden rulers */}
      <div ref={headRulerRef} style={{ ...rulerBase, width: 560, fontSize: 60, letterSpacing: 'var(--obs-tracking-head)', fontWeight: 600, lineHeight: 1.12 }} />
      <div ref={subRulerRef} style={{ ...rulerBase, width: 560, fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, lineHeight: 1.1 }} />
      <span ref={ctaRulerRef} style={{ ...rulerBase, whiteSpace: 'nowrap', fontSize: 32, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, lineHeight: 1.2 }} />
      <div ref={disclaimerRulerRef} style={{ ...rulerBase, width: 561, fontSize: 18, letterSpacing: 'var(--obs-tracking)', fontWeight: 300, lineHeight: 1.1 }} />

      {/* Head + sub copy */}
      <PanelGroup title={t('Head & Sub copy')}>
        <FieldLabel>{t('Head copy')} · {t('Max 4 lines')}</FieldLabel>
        <textarea
          value={state.headCopy}
          onChange={(e) => tryUpdateHead(e.target.value)}
          rows={4}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 hover:border-gray-300 focus:border-[#FD312E] focus:outline-none transition-colors resize-none"
          style={{ lineHeight: '20px' }}
        />
        <div className="flex items-center justify-between mt-3 mb-1">
          <FieldLabel>{t('Sub copy')} · {t('Max 2 lines')}</FieldLabel>
          <ShowToggle checked={state.showSubCopy} onChange={(v) => patch('showSubCopy', v)} />
        </div>
        {state.showSubCopy && (
          <textarea
            value={state.subCopy}
            onChange={(e) => tryUpdateSub(e.target.value)}
            rows={2}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 hover:border-gray-300 focus:border-[#FD312E] focus:outline-none transition-colors resize-none"
            style={{ lineHeight: '20px' }}
          />
        )}
      </PanelGroup>

      {/* CTA */}
      <PanelGroup title={t('CTA text')}>
        <input
          type="text"
          value={state.ctaText}
          onChange={(e) => tryUpdateCta(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 hover:border-gray-300 focus:border-[#FD312E] focus:outline-none transition-colors"
          style={{ lineHeight: '20px' }}
        />
      </PanelGroup>

      {/* Disclaimer */}
      <PanelGroup
        title={`${t('Disclaimer')} · ${t('Max 2 lines')}`}
        right={<ShowToggle checked={state.showDisclaimer} onChange={(v) => patch('showDisclaimer', v)} />}
      >
        {state.showDisclaimer && (
          <textarea
            value={state.disclaimerText}
            onChange={(e) => tryUpdateDisclaimer(e.target.value)}
            rows={2}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 hover:border-gray-300 focus:border-[#FD312E] focus:outline-none transition-colors resize-none"
            style={{ lineHeight: '20px' }}
          />
        )}
      </PanelGroup>

      {/* Lifestyle image */}
      <PanelGroup title={t('Lifestyle image')}>
        {state.imageSrc ? (
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: '#FD312E', background: '#FFF1F4' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                <img src={state.imageSrc} alt="" className="w-full h-full object-cover" />
              </div>
              <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                {t('Image')}
              </span>
              <button
                type="button"
                onClick={handleRemove}
                className="ml-auto p-1 text-gray-300 hover:text-red-500 rounded"
                title={t('Remove image')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4M8.5 6v4M3 3.5l.5 8h7l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
            >
              {t('Replace lifestyle image')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full text-sm px-3 py-3 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
          >
            {t('Upload lifestyle image')}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <p className="text-[11px] text-gray-400 mt-3" style={{ lineHeight: '16px' }}>
          {state.imageSrc
            ? t('Hover the shape in the preview, then drag to move or scroll to zoom.')
            : t('Upload an image to fill the shape.')}
        </p>
      </PanelGroup>

      {/* Reset to default */}
      <div className="px-5 py-5 border-t border-gray-100">
        <button
          type="button"
          onClick={handleReset}
          className="w-full py-2 text-sm text-gray-400 rounded-lg border border-gray-200 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          {t('Reset')}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Lifestyle — shape-clipped hit overlay        */
/* Drag (move) + Wheel (zoom). Hover hint pill. */
/* No edit box — only the masked area receives  */
/* pointer events.                              */
/* ─────────────────────────────────────────── */

interface LifestyleOverlayProps {
  state: OtherPromoLifestyleState;
  previewScale: number;
  onChange: (s: OtherPromoLifestyleState) => void;
}

/**
 * Clamp masked-image position + size so the image ALWAYS fully covers the
 * shape's bounding rectangle (no BG bleed-through). Min size is 1.1× shape
 * so user always has at least 10% drag room on each axis even at min zoom.
 * Aspect ratio preserved when one dim hits min — both scale uniformly.
 */
function clampLifestyleImage(s: OtherPromoLifestyleState): OtherPromoLifestyleState {
  let { imageX, imageY, imageWidth, imageHeight } = s;
  const minW = LIFESTYLE_SHAPE.width * 1.1;
  const minH = LIFESTYLE_SHAPE.height * 1.1;
  // Min size: scale UNIFORMLY so smallest axis just meets minW/minH (preserves aspect)
  const fix = Math.max(minW / imageWidth, minH / imageHeight, 1);
  if (fix > 1) {
    imageWidth *= fix;
    imageHeight *= fix;
  }
  // Position bounds: image edges must fully cover shape rect
  const minX = LIFESTYLE_SHAPE.left + LIFESTYLE_SHAPE.width - imageWidth;
  const maxX = LIFESTYLE_SHAPE.left;
  const minY = LIFESTYLE_SHAPE.top + LIFESTYLE_SHAPE.height - imageHeight;
  const maxY = LIFESTYLE_SHAPE.top;
  imageX = Math.max(minX, Math.min(maxX, imageX));
  imageY = Math.max(minY, Math.min(maxY, imageY));
  return { ...s, imageX, imageY, imageWidth, imageHeight };
}

export function LifestyleImageOverlay({ state, previewScale, onChange }: LifestyleOverlayProps) {
  const t = useT();
  const hitRef = useRef<HTMLDivElement>(null);
  const reactClipId = React.useId().replace(/[:]/g, '-') + '-hit';
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Refs so the native (non-passive) wheel handler always sees fresh state
  const stateRef = useRef(state);
  stateRef.current = state;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Native wheel listener with passive:false so we can preventDefault to
  // suppress page scroll. Routes by delta dominance + modifier:
  //   |deltaX| > |deltaY|       → horizontal pan (trackpad horizontal swipe)
  //   ctrl/meta + wheel         → zoom (trackpad pinch / explicit zoom)
  //   default deltaY            → zoom (mouse wheel + trackpad vertical swipe)
  // Vertical panning is handled via DRAG (works on both axes freely).
  useEffect(() => {
    const el = hitRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const s = stateRef.current;
      // Horizontal trackpad swipe → horizontal pan (no zoom interference)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        onChangeRef.current(clampLifestyleImage({
          ...s,
          imageX: s.imageX - e.deltaX,
        }));
        return;
      }
      // Default: stiff zoom (1.5%/tick). Ctrl/Cmd + wheel also zooms (trackpad pinch).
      const factor = e.deltaY > 0 ? 0.985 : 1.015;
      const newW = s.imageWidth * factor;
      const newH = s.imageHeight * factor;
      const cx = s.imageX + s.imageWidth / 2;
      const cy = s.imageY + s.imageHeight / 2;
      onChangeRef.current(clampLifestyleImage({
        ...s,
        imageWidth: newW,
        imageHeight: newH,
        imageX: cx - newW / 2,
        imageY: cy - newH / 2,
      }));
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function startDrag(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startImgX = state.imageX;
    const startImgY = state.imageY;
    function onMove(ev: PointerEvent) {
      const dx = (ev.clientX - startX) / previewScale;
      const dy = (ev.clientY - startY) / previewScale;
      onChangeRef.current(clampLifestyleImage({
        ...stateRef.current,
        imageX: startImgX + dx,
        imageY: startImgY + dy,
      }));
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Shape center in banner coords (used to position the hover hint)
  const cxShape = LIFESTYLE_SHAPE.left + LIFESTYLE_SHAPE.width / 2;
  const cyShape = LIFESTYLE_SHAPE.top + LIFESTYLE_SHAPE.height / 2;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Local clip-path defs — silhouette of the shape, used as hit area */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden>
        <defs>
          <clipPath id={reactClipId} clipPathUnits="userSpaceOnUse">
            <path
              d={LIFESTYLE_SHAPE_PATH}
              transform={`translate(${LIFESTYLE_SHAPE.left}, ${LIFESTYLE_SHAPE.top})`}
            />
          </clipPath>
        </defs>
      </svg>

      {/* Hit area — clipped to shape silhouette so only the masked image
          captures pointer events. Background image sits below it untouched. */}
      <div
        ref={hitRef}
        onPointerDown={startDrag}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: `url(#${reactClipId})`,
          WebkitClipPath: `url(#${reactClipId})`,
          cursor: dragging ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
        }}
      />

      {/* Hover hint pill — banner-coord positioned, font sized inverse of
          previewScale so text stays at constant viewport pixels. */}
      {hovered && !dragging && (
        <div
          style={{
            position: 'absolute',
            left: cxShape,
            top: cyShape,
            transform: 'translate(-50%, -50%)',
            padding: `${6 / previewScale}px ${14 / previewScale}px`,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: 13 / previewScale,
            lineHeight: `${18 / previewScale}px`,
            borderRadius: 999,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontWeight: 500,
            letterSpacing: 0.2 / previewScale,
            boxShadow: `0 ${2 / previewScale}px ${8 / previewScale}px rgba(0,0,0,0.3)`,
          }}
        >
          {t('Drag or scroll to adjust')}
        </div>
      )}
    </div>
  );
}
