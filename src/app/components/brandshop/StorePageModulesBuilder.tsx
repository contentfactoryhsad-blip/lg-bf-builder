import React, { useState, useRef, useLayoutEffect, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  closestCenter,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { MODULE_DEFS, ModuleType, getModuleDef, type ModuleDef } from './modules/moduleRegistry';
import { type ModuleEditState, type KvProductListState, type BannerSlideState, createDefaultState } from './modules/editStates';
import type { TFunction } from '../../i18n/LanguageContext';
import { ModuleEditPanel, BannerImageLayoutModal, BANNER_IMG_SEC } from './modules/ModuleEditPanel';
import { ModuleRenderer, BannerTemplate } from './modules/ModuleRenderer';
import { BANNER_LS_BOX, bannerLifestylePlacement } from './modules/bannerLifestyle';
import { ImageCropModal } from '../ImageCropModal';
import { saveBlob } from '../../utils/fileSaver';
import { useT } from '../../i18n/LanguageContext';
import { AppHeader } from '../AppHeader';
import { NavRail, type NavRailKey } from '../NavRail';
import type { DraftRecord } from '../../utils/draftStore';
import { useDraftSave } from '../../hooks/useDraftSave';
import { useApplyBrandFont } from '../../fonts/useApplyBrandFont';
import { ensureBrandFontLoaded, fontFileTag, type BrandFontId } from '../../fonts/brandFonts';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { SaveForLaterButton, SaveDraftModal } from '../SaveForLaterButton';
import { UnsavedChangesModal } from '../UnsavedChangesModal';
import { ConfirmModal } from '../ConfirmModal';
import { restoreCanvasItems, restoreFontId, type StoreModulesPayloadV1 } from '../../drafts/storeModulesPayload';

export interface CanvasItem {
  id: string;
  type: ModuleType;
  editState: ModuleEditState;
}

// Quick-start presets — one-click canvas scaffolds for common page structures.
const HERO_PRODUCT_PRESET: ModuleType[] = [
  'official-store', 'follow-us', 'kv', 'kv-product-list', 'category-list', 'banner', 'value-props',
];
const PROMOTION_CENTRIC_PRESET: ModuleType[] = [
  'official-store', 'follow-us', 'kv', 'product-cards', 'vouchers', 'category-list', 'kv-product-list', 'banner', 'text', 'value-props',
];

// "Template for BAU"'s KV+Product list step reproduces Figma node 2528:17523
// ("Image + Product card") for the hero image + feature cards — that Figma
// frame starts directly at the image with no logo row, so the campaign logo
// toggle stays off for this preset (head copy is left at the module's own
// default, as previously implemented).
function heroKvProductListOverride(t: TFunction): KvProductListState {
  const base = createDefaultState('kv-product-list', t).data as KvProductListState;
  return {
    ...base,
    variant: 'Price/Feature ver.',
    showCampaignLogo: false,
    kvImage: '/store-modules/hero-kv-bg.png',
    products: [
      { image: '/store-modules/hero-feature-1.png', rankImage: null, modelName: t('AI Processor'), features: t('alpha 11 AI Processor Gen3 takes OLED performance beyond limits,'), originalPrice: '$729.00', salePrice: '$624.68', discountPercent: '22%', rankLabel: t('1st'), showOriginalPrice: false, showSalePrice: false, showDiscountPercent: false },
      { image: '/store-modules/hero-feature-2.png', rankImage: null, modelName: t('Perfect Black'), features: t('Perfect Black and Perfect Color stay true in brightness and darkness'), originalPrice: '$729.00', salePrice: '$624.68', discountPercent: '22%', rankLabel: t('2nd'), showOriginalPrice: false, showSalePrice: false, showDiscountPercent: false },
      { image: '/store-modules/hero-feature-3.png', rankImage: null, modelName: t('Reflection Free'), features: t("LG's Reflection Free OLED display minimizes reflectance"), originalPrice: '$729.00', salePrice: '$624.68', discountPercent: '22%', rankLabel: t('3rd'), showOriginalPrice: false, showSalePrice: false, showDiscountPercent: false },
    ],
  };
}

type PresetKey = 'hero' | 'promotion';
const PRESETS: Record<PresetKey, { modules: ModuleType[]; overrides?: Partial<Record<ModuleType, (t: TFunction) => ModuleEditState['data']>> }> = {
  hero: { modules: HERO_PRODUCT_PRESET, overrides: { 'kv-product-list': heroKvProductListOverride } },
  promotion: { modules: PROMOTION_CENTRIC_PRESET },
};

// Palette → canvas drops use the original closestCenter (snappy — registers
// as soon as the dragged card is nearest the canvas, no need to fully enter
// it). On-canvas reordering keeps rectIntersection (needs actual overlap
// with a sibling module, avoids snapping mid-drag between items).
const collisionDetectionStrategy: CollisionDetection = args =>
  args.active.data.current?.source === 'palette' ? closestCenter(args) : rectIntersection(args);

// ── Palette card ─────────────────────────────────────────────────────────────
// Default-state previews, precomputed once (module-level, not per-render) —
// purely for the static thumbnail, never edited.
const PALETTE_PREVIEWS = Object.fromEntries(
  MODULE_DEFS.map(d => [d.type, createDefaultState(d.type)])
) as Record<ModuleType, ModuleEditState>;

const PALETTE_THUMB = 56; // square thumbnail — whole module "contained" (fit), not cropped
const PALETTE_THUMB_SCALE = PALETTE_THUMB / 1200; // width is the binding dimension for every module (none is taller than 1200)

function PaletteCard({ def, disabled, count }: { def: ModuleDef; disabled: boolean; count: number }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette::${def.type}`,
    disabled,
    data: { source: 'palette', moduleType: def.type },
  });

  // Measure the module's real rendered height (def.placeholderHeight is only
  // a rough guess for "free"-height types like KV+Product list) so the thumb
  // is centered against its actual content, not an assumed box.
  const innerRef = useRef<HTMLDivElement>(null);
  const [measuredH, setMeasuredH] = useState(def.placeholderHeight);
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height;
      if (h && h > 0) setMeasuredH(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Vertically center the scaled module within the square thumb. When the
  // module is shorter than the box (Follow us, Text…) this letterboxes
  // top/bottom; when it's taller (KV+Product list…) this center-crops it —
  // same "fill the square" look as KV, instead of anchoring to the top.
  const scaledH = measuredH * PALETTE_THUMB_SCALE;
  const offsetY = (PALETTE_THUMB - scaledH) / 2;

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : { ...attributes, ...listeners })}
      className={`w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg border transition-colors select-none ${
        disabled
          ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
          : isDragging
          ? 'opacity-40 border-[#FD312E] bg-white'
          : 'border-gray-200 bg-white hover:border-[#FD312E] hover:text-[#FD312E] cursor-grab active:cursor-grabbing'
      }`}
    >
      <div
        className="shrink-0 rounded-md overflow-hidden"
        style={{ width: PALETTE_THUMB, height: PALETTE_THUMB, position: 'relative', background: '#F8F7F5' }}
      >
        <div
          style={{
            width: 1200,
            position: 'absolute',
            left: 0,
            top: offsetY,
            transform: `scale(${PALETTE_THUMB_SCALE})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <div ref={innerRef}>
            <ModuleRenderer editState={PALETTE_PREVIEWS[def.type]} />
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1 gap-2">
          <p className="text-sm font-medium text-gray-800 leading-tight truncate py-px">{t(def.label)}</p>
          <span className="text-[9px] font-semibold leading-none shrink-0 rounded-full px-1.5 py-0.5 tabular-nums bg-gray-100 text-gray-500">
            {count}/{def.maxCount}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 leading-tight">
          {t('Upload Module')}: <span className="font-medium text-gray-700">{def.uploadModule}</span>
        </p>
        <p className="text-[9px] text-gray-400 mt-0.5">
          1200 × {def.height === 'free' ? 'free' : def.height}
        </p>
      </div>
    </div>
  );
}

// ── Sortable canvas item ──────────────────────────────────────────────────────
interface CarouselControls {
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  /** Increments on every arrow press — drives the slide-in animation. */
  navSeq: number;
  /** Direction of the last navigation, for which way the new banner slides in. */
  dir: 'next' | 'prev';
}

function SortableCanvasItem({
  item,
  scale,
  isSelected,
  canDuplicate,
  onSelect,
  onRemove,
  onDuplicate,
  onEditImage,
  bannerSlideIndex,
  onBannerSlideIndexChange,
}: {
  item: CanvasItem;
  scale: number;
  isSelected: boolean;
  canDuplicate: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onEditImage: () => void;
  /** Banner only — which slide of the carousel group is shown/edited, shared
   *  with the edit panel's slide picker so both stay in sync. */
  bannerSlideIndex?: number;
  onBannerSlideIndexChange?: (i: number) => void;
}) {
  const t = useT();
  const isBanner = item.editState.type === 'banner';
  const slides = item.editState.type === 'banner' ? item.editState.data.slides : null;
  const previewIdx = slides ? Math.min(bannerSlideIndex ?? 0, slides.length - 1) : 0;
  const activeSlide = slides ? slides[previewIdx] : null;
  const isLifestyle = activeSlide?.variant === 'Lifestyle ver.';
  const imageBox = isLifestyle ? BANNER_LS_BOX : BANNER_IMG_SEC;
  // Lifestyle ver. has nothing to edit-crop until a photo exists (adding one
  // happens via the EP's fetch/upload, not this hotspot).
  const canEditImage = isBanner && (!isLifestyle || !!activeSlide?.lifestyleState.imageSrc);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { source: 'canvas' },
  });

  // Carousel controls — navigates this group's OWN internal slides array
  // (not sibling canvas items, unlike the old flat-instance model).
  const [bannerNav, setBannerNav] = useState<{ seq: number; dir: 'next' | 'prev' }>({ seq: 0, dir: 'next' });
  const carousel: CarouselControls | undefined = slides && slides.length > 1 ? {
    index: previewIdx,
    count: slides.length,
    navSeq: bannerNav.seq,
    dir: bannerNav.dir,
    onPrev: () => {
      const ni = (previewIdx - 1 + slides.length) % slides.length;
      onBannerSlideIndexChange?.(ni);
      setBannerNav(n => ({ seq: n.seq + 1, dir: 'prev' }));
    },
    onNext: () => {
      const ni = (previewIdx + 1) % slides.length;
      onBannerSlideIndexChange?.(ni);
      setBannerNav(n => ({ seq: n.seq + 1, dir: 'next' }));
    },
  } : undefined;

  // Measure the real rendered height of the 1200px-wide inner module
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerHeight, setInnerHeight] = useState(getModuleDef(item.type).placeholderHeight);
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    const h = entries[0]?.contentRect.height;
    if (h && h > 0) setInnerHeight(h);
  }, []);
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(handleResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [handleResize]);

  // Carousel slide-in — animate the new banner in from the pushed direction
  // whenever an arrow bumps navSeq.
  const slideRef = useRef<HTMLDivElement>(null);
  const lastNavSeq = useRef(carousel?.navSeq ?? 0);
  useEffect(() => {
    if (!carousel) return;
    if (carousel.navSeq === lastNavSeq.current) return;
    lastNavSeq.current = carousel.navSeq;
    const el = slideRef.current;
    if (!el) return;
    const boxW = 1200 * scale;
    const from = carousel.dir === 'next' ? boxW : -boxW;
    el.animate(
      [
        { transform: `translateX(${from}px)`, opacity: 0.35 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 280, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
    );
  }, [carousel?.navSeq, carousel?.dir, scale]);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        position: 'relative',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        marginBottom: 2,
        touchAction: 'none',
      }}
      className="group"
    >
      {/* Centered wrapper */}
      <div style={{ width: 1200 * scale, margin: '0 auto', position: 'relative' }}>
        {/* Module — click to select, drag to reorder */}
        <div
          onClick={e => { e.stopPropagation(); onSelect(); }}
          style={{
            width: 1200 * scale,
            height: innerHeight * scale,
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          <div
            ref={slideRef}
            style={{ position: 'absolute', top: 0, left: 0, width: 1200 * scale, height: innerHeight * scale }}
          >
            <div
              ref={innerRef}
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 1200, position: 'absolute', top: 0, left: 0 }}
            >
              {activeSlide ? <BannerTemplate data={activeSlide} /> : <ModuleRenderer editState={item.editState} />}
            </div>
          </div>
        </div>

        {/* Selection / hover border */}
        <div
          className={`absolute inset-0 border-2 pointer-events-none transition-colors ${
            isSelected ? 'border-[#FD312E]' : 'border-transparent group-hover:border-gray-300'
          }`}
        />

        {/* Banner — hover-dim + "Click to edit" hotspot over the image area */}
        {isSelected && canEditImage && (
          <div
            onClick={e => { e.stopPropagation(); onEditImage(); }}
            className="absolute group/hotspot cursor-pointer"
            style={{
              left: imageBox.left * scale,
              top: imageBox.top * scale,
              width: imageBox.width * scale,
              height: imageBox.height * scale,
              borderRadius: ('radius' in imageBox ? imageBox.radius : 0) * scale,
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover/hotspot:opacity-100 transition-opacity flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 'inherit' }}
            >
              <span className="text-white text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.35)' }}>
                {t('Click to edit')}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Banner carousel — left/right arrows sit outside the module in the
          canvas gutter, not overlapping the image; position pill sits at the
          same horizontal offset as the right arrow, aligned to the module's
          bottom edge. */}
      {carousel && carousel.count > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); carousel.onPrev(); }}
            className="absolute flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
            style={{ left: `calc(50% - ${1200 * scale / 2}px - 48px)`, top: (innerHeight * scale) / 2, transform: 'translateY(-50%)', width: 32, height: 32, zIndex: 5 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); carousel.onNext(); }}
            className="absolute flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
            style={{ left: `calc(50% + ${1200 * scale / 2}px + 16px)`, top: (innerHeight * scale) / 2, transform: 'translateY(-50%)', width: 32, height: 32, zIndex: 5 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div
            className="absolute text-gray-500 text-[11px] font-medium px-2.5 py-1 rounded-full pointer-events-none bg-white border border-gray-200 shadow-sm"
            style={{ left: `calc(50% + ${1200 * scale / 2}px + 16px)`, bottom: 0, zIndex: 5 }}
          >
            {carousel.index + 1} / {carousel.count}
          </div>
        </>
      )}

      {/* Action bar — floats to the right of the centered thumbnail */}
      {isSelected && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `calc(50% + ${1200 * scale / 2 + 8}px)`,
            top: 6,
            zIndex: 10,
            display: 'flex', alignItems: 'center',
            background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={e => { e.stopPropagation(); onDuplicate(); }}
            disabled={!canDuplicate}
            title={t('Duplicate')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32,
              background: 'none', border: 'none',
              color: canDuplicate ? '#374151' : '#d1d5db',
              cursor: canDuplicate ? 'pointer' : 'not-allowed',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 4.5V3A1.5 1.5 0 008 1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          </button>
          <div style={{ width: 1, alignSelf: 'stretch', background: '#e5e7eb' }} />
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            title={t('Delete')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32,
              background: 'none', border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5 3.5V2.5a1 1 0 011-1h2a1 1 0 011 1v1M5.5 6.5v4M8.5 6.5v4M3 3.5l.6 6.5a1 1 0 001 .9h4.8a1 1 0 001-.9l.6-6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Canvas droppable wrapper ──────────────────────────────────────────────────
function CanvasDropZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });
  return (
    <div ref={setNodeRef} className={`min-h-64 rounded-lg transition-colors ${isOver && isEmpty ? 'bg-red-50/60' : ''}`}>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  onBack: () => void;
  /** Resume a saved draft: reuse its id and seed the canvas from its payload. */
  initialDraft?: { id: string; title: string; payload: StoreModulesPayloadV1 };
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}

export function StorePageModulesBuilder({ onBack, initialDraft, railActive, onRailNavigate, onOpenDraft }: Props) {
  const t = useT();
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(
    () => (initialDraft ? restoreCanvasItems(initialDraft.payload, t) : []),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  // Banner image editor modal — which canvas item it's open for (null = closed).
  const [imageEditId, setImageEditId] = useState<string | null>(null);
  // Each Banner canvas item is a carousel GROUP of up to BANNER_SLIDE_MAX
  // slides (editStates.ts BannerGroupState) — this is which slide is shown
  // on the canvas preview / edited in the panel, per group id. Shared between
  // the canvas arrows and the edit panel's slide picker so both stay in sync.
  const [bannerSlideIndex, setBannerSlideIndex] = useState<Record<string, number>>({});
  const getBannerSlideIdx = useCallback((id: string) => bannerSlideIndex[id] ?? 0, [bannerSlideIndex]);
  const setBannerSlideIdxFor = useCallback((id: string, idx: number) => {
    setBannerSlideIndex(prev => ({ ...prev, [id]: idx }));
  }, []);
  // Quick-start preset pending confirmation (only asked when it would replace existing canvas content).
  const [pendingPreset, setPendingPreset] = useState<PresetKey | null>(null);

  // No font picker in the header any more — the font is fixed to the brand
  // default (or whatever a resumed draft was saved with).
  const [fontId] = useState<BrandFontId>(
    () => (initialDraft ? restoreFontId(initialDraft.payload) : 'lg'),
  );
  useApplyBrandFont(fontId);

  // Local draft: MANUAL save only ("Save for Later") — nothing is stored
  // until the user confirms the save modal; only saved work shows on home.
  // `fontId` rides inside the compared state because useDraftSave's `dirty`
  // is a reference check on it — leaving it out would let a font change go
  // unsaved without tripping the unsaved-changes guard.
  const draftState = useMemo(() => ({ canvasItems, fontId }), [canvasItems, fontId]);
  const draft = useDraftSave({
    builder: 'sis-store-modules',
    initialDraftId: initialDraft?.id,
    state: draftState,
    title: initialDraft?.title ?? 'Shop in Shop page Module',
    serialize: st => ({ canvasItems: st.canvasItems, fontId: st.fontId }),
  });
  const defaultDraftName = initialDraft?.title ?? 'Shop in Shop page Module';
  const {
    guard,
    showModal: showUnsavedModal,
    showNameModal: showUnsavedNameModal,
    handleSave: handleUnsavedSave,
    handleNameConfirm: handleUnsavedNameConfirm,
    handleNameCancel: handleUnsavedNameCancel,
    handleDiscard: handleUnsavedDiscard,
  } = useUnsavedGuard(draft, defaultDraftName);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const hiddenRenderRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setScale(Math.min(w / 1200, 0.3));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const countOnCanvas = useCallback(
    (type: ModuleType) => canvasItems.filter(i => i.type === type).length,
    [canvasItems]
  );

  const selectedItem = selectedId
    ? canvasItems.find(i => i.id === selectedId) ?? null
    : null;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveDragId(String(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Palette → Canvas
    if (activeId.startsWith('palette::')) {
      const moduleType = activeId.replace('palette::', '') as ModuleType;
      const def = getModuleDef(moduleType);
      if (countOnCanvas(moduleType) >= def.maxCount) return;

      const newItem: CanvasItem = { id: crypto.randomUUID(), type: moduleType, editState: createDefaultState(moduleType, t) };

      if (overId === 'canvas') {
        setCanvasItems(prev => [...prev, newItem]);
      } else {
        const overIndex = canvasItems.findIndex(i => i.id === overId);
        setCanvasItems(prev => {
          const next = [...prev];
          next.splice(overIndex === -1 ? next.length : overIndex, 0, newItem);
          return next;
        });
      }
      return;
    }

    // Canvas → Canvas (reorder)
    if (activeId !== overId && overId !== 'canvas') {
      const oldIdx = canvasItems.findIndex(i => i.id === activeId);
      const newIdx = canvasItems.findIndex(i => i.id === overId);
      if (oldIdx !== -1 && newIdx !== -1) {
        setCanvasItems(prev => arrayMove(prev, oldIdx, newIdx));
      }
    }
  };

  const removeModule = useCallback((id: string) => {
    setCanvasItems(prev => prev.filter(i => i.id !== id));
    setSelectedId(prev => prev === id ? null : prev);
  }, []);

  const applyPreset = useCallback((key: PresetKey) => {
    const { modules, overrides } = PRESETS[key];
    setCanvasItems(modules.map(type => {
      const override = overrides?.[type];
      const editState = (override ? { type, data: override(t) } : createDefaultState(type, t)) as ModuleEditState;
      return { id: crypto.randomUUID(), type, editState };
    }));
    setSelectedId(null);
  }, [t]);

  const handlePresetClick = useCallback((key: PresetKey) => {
    if (canvasItems.length > 0) setPendingPreset(key);
    else applyPreset(key);
  }, [canvasItems.length, applyPreset]);

  const duplicateModule = useCallback((id: string) => {
    const idx = canvasItems.findIndex(i => i.id === id);
    if (idx === -1) return;
    const item = canvasItems[idx];
    const def = getModuleDef(item.type);
    if (canvasItems.filter(i => i.type === item.type).length >= def.maxCount) return;
    const newItem: CanvasItem = { id: crypto.randomUUID(), type: item.type, editState: { ...item.editState, data: { ...(item.editState as any).data } } };
    const next = [...canvasItems];
    next.splice(idx + 1, 0, newItem);
    setCanvasItems(next);
    setSelectedId(newItem.id);
  }, [canvasItems]);

  const updateEditState = useCallback((id: string, newState: ModuleEditState) => {
    setCanvasItems(prev => prev.map(item => item.id === id ? { ...item, editState: newState } : item));
  }, []);

  // Writes one slide back into a Banner group's slides array.
  const updateBannerSlide = useCallback((id: string, slideIdx: number, slide: BannerSlideState) => {
    setCanvasItems(prev => prev.map(item => {
      if (item.id !== id || item.editState.type !== 'banner') return item;
      const slides = item.editState.data.slides.map((s, i) => i === slideIdx ? slide : s);
      return { ...item, editState: { type: 'banner', data: { slides } } };
    }));
  }, []);

  const handleDownload = async () => {
    if (canvasItems.length === 0 || !hiddenRenderRef.current) return;
    setDownloading(true);
    const container = hiddenRenderRef.current;
    const root = createRoot(container);
    try {
      // The brand faces must be resolved before the first capture — the
      // two-pass warmup below caches images, not fonts, so a font still in
      // flight gets baked into the PNG as a fallback.
      await ensureBrandFontLoaded(fontId);

      const zip = new JSZip();
      const d = new Date();
      const date6 = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

      for (let i = 0; i < canvasItems.length; i++) {
        const item = canvasItems[i];
        const def = getModuleDef(item.type);
        const index = String(i + 1).padStart(2, '0');

        // A Banner canvas item is a carousel GROUP — export one PNG per slide
        // (matches the marketplace's actual carousel upload, one image per
        // slide). Every other module type is still a single render.
        const renders: Array<{ editState: ModuleEditState; suffix: string }> =
          item.editState.type === 'banner'
            ? item.editState.data.slides.map((slide, si) => ({
                editState: { type: 'banner' as const, data: { slides: [slide] } },
                suffix: item.editState.type === 'banner' && item.editState.data.slides.length > 1 ? `-${si + 1}` : '',
              }))
            : [{ editState: item.editState, suffix: '' }];

        for (const { editState, suffix } of renders) {
          // Render the real module template at 1200px
          await new Promise<void>(resolve => {
            root.render(<ModuleRenderer editState={editState} />);
            setTimeout(resolve, 250);
          });

          const el = container.firstElementChild as HTMLElement;
          if (!el) continue;

          // Size = module's actual rendered canvas size (element sits unscaled off-screen,
          // so offsetW/H is the design px — 1200 × content height). The leading `index`
          // already numbers duplicates, so no trailing instance count is needed.
          const size = `${Math.round(el.offsetWidth)}x${Math.round(el.offsetHeight)}`;
          // Schema: NN[-slide]-module name-WxH-upload module type-date (all lowercased),
          // e.g. "01-official store-1200x180-single banner-260709.png" or, for a
          // 3-slide Banner group at position 3, "03-1-banner-...", "03-2-banner-...".
          const fileName = `${index}${suffix}-${def.label.toLowerCase()}-${size}-${def.uploadModule.toLowerCase()}-${fontFileTag(fontId)}${date6}.png`;

          await toPng(el);
          await toPng(el);
          const dataUrl = await toPng(el, { cacheBust: true });
          zip.file(fileName, dataUrl.replace(/^data:image\/png;base64,/, ''), { base64: true });
        }
      }

      root.unmount();
      const blob = await zip.generateAsync({ type: 'blob' });
      saveBlob(blob, `LG-shop-in-shop-modules.zip`);
    } finally {
      setDownloading(false);
    }
  };

  // Active drag preview content
  const activePaletteType = activeDragId?.startsWith('palette::')
    ? (activeDragId.replace('palette::', '') as ModuleType)
    : null;
  const activeCanvasItem = activeDragId && !activeDragId.startsWith('palette::')
    ? canvasItems.find(i => i.id === activeDragId) ?? null
    : null;
  const activeDragPreviewItem = activeCanvasItem;

  return (
    <div className="flex flex-col h-screen bg-[#f8f7f5]">
      <AppHeader
        title={t('ex')}
        onBack={() => guard(onBack)}
        right={
          <>
            <SaveForLaterButton
              draft={draft}
              defaultName={defaultDraftName}
              disabled={canvasItems.length === 0}
            />
            <button
              onClick={handleDownload}
              disabled={canvasItems.length === 0 || downloading}
              className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-full border transition-colors border-[#FD312E] text-[#FD312E] hover:bg-[#FD312E] hover:text-white disabled:opacity-40 disabled:pointer-events-none"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {downloading ? t('Preparing…') : t('Download ZIP')}
            </button>
          </>
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          <NavRail active={railActive} onNavigate={(key) => guard(() => onRailNavigate(key))} onOpenDraft={onOpenDraft} />
          {/* Left — Palette */}
          <aside className="w-64 shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col gap-1 p-3">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide px-1 pb-1">{t('Quick Start')}</p>
            <div className="flex flex-col gap-1.5 pb-3 mb-2 border-b border-gray-100">
              <button
                type="button"
                onClick={() => handlePresetClick('hero')}
                className="text-left text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-[#FD312E] border border-gray-200 rounded-lg px-3 py-2 transition-colors"
              >
                {t('Template for BAU')}
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('promotion')}
                className="text-left text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-[#FD312E] border border-gray-200 rounded-lg px-3 py-2 transition-colors"
              >
                {t('Template for Promotions')}
              </button>
            </div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide px-1 pb-1">{t('Modules')}</p>
            {MODULE_DEFS.map(def => {
              const count = countOnCanvas(def.type);
              return (
                <PaletteCard
                  key={def.type}
                  def={def}
                  count={count}
                  disabled={count >= def.maxCount}
                />
              );
            })}
          </aside>

          {/* Center — Canvas */}
          <main
            ref={canvasContainerRef}
            className="flex-1 overflow-y-auto p-6"
            style={{ background: '#CDC8C1' }}
            onClick={() => setSelectedId(null)}
          >
            <SortableContext items={canvasItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <CanvasDropZone isEmpty={canvasItems.length === 0}>
                {canvasItems.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-400 text-sm">{t('Drag a module from the left to get started.')}</p>
                  </div>
                ) : (
                  canvasItems.map(item => (
                    <SortableCanvasItem
                      key={item.id}
                      item={item}
                      scale={scale}
                      isSelected={item.id === selectedId}
                      canDuplicate={countOnCanvas(item.type) < getModuleDef(item.type).maxCount}
                      onSelect={() => setSelectedId(item.id)}
                      onRemove={() => removeModule(item.id)}
                      onDuplicate={() => duplicateModule(item.id)}
                      onEditImage={() => { setSelectedId(item.id); setImageEditId(item.id); }}
                      bannerSlideIndex={getBannerSlideIdx(item.id)}
                      onBannerSlideIndexChange={idx => setBannerSlideIdxFor(item.id, idx)}
                    />
                  ))
                )}
              </CanvasDropZone>
            </SortableContext>
          </main>

          {/* Right — Edit Panel */}
          <aside className="w-80 shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
            {selectedItem ? (() => {
              const def = getModuleDef(selectedItem.type);
              // Banner reuses the Other Promotions edit panel, whose sections
              // carry their own px-5 padding — so drop the wrapper's horizontal
              // padding for it (header keeps px-5) to avoid doubled side margins.
              const isBanner = selectedItem.type === 'banner';
              return (
                <div className={isBanner ? 'py-5' : 'p-5'}>
                  <div className={isBanner ? 'px-5' : ''}>
                    <p className="font-lgei font-bold text-[15px] text-gray-900 mb-0.5">{t(def.label)}</p>
                    <p className="text-xs text-gray-400 mb-5">
                      1200 × {def.height === 'free' ? 'free' : def.height}
                    </p>
                  </div>
                  <ModuleEditPanel
                    editState={selectedItem.editState}
                    onUpdate={newState => updateEditState(selectedItem.id, newState)}
                    onEditImage={() => setImageEditId(selectedItem.id)}
                    bannerActiveSlideIndex={getBannerSlideIdx(selectedItem.id)}
                    onBannerSlideIndexChange={idx => setBannerSlideIdxFor(selectedItem.id, idx)}
                  />
                </div>
              );
            })() : (
              <div className="flex items-center justify-center h-full p-5">
                <p className="text-sm text-gray-400 text-center">{t('Click a module on the canvas to edit.')}</p>
              </div>
            )}
          </aside>
        </div>

        <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
          {activePaletteType && (
            <div className="bg-white border border-[#FD312E] rounded-lg px-3 py-2.5 shadow-lg opacity-90 pointer-events-none">
              <p className="text-sm font-medium text-[#FD312E]">{t(getModuleDef(activePaletteType).label)}</p>
            </div>
          )}
          {activeDragPreviewItem && (() => {
            const previewW = 220;
            const previewScale = previewW / 1200;
            const def = getModuleDef(activeDragPreviewItem.type);
            return (
              <div style={{ width: previewW, height: def.placeholderHeight * previewScale, overflow: 'hidden', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', opacity: 0.85, pointerEvents: 'none' }}>
                <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: 1200 }}>
                  <ModuleRenderer editState={activeDragPreviewItem.editState} />
                </div>
              </div>
            );
          })()}
        </DragOverlay>
      </DndContext>

      {/* Banner image editor modal — Product ver. (full theme editor) or
          Lifestyle ver. (fetch/upload/crop), opened from the canvas hotspot
          or the EP's "Click to edit image" button. */}
      {imageEditId && (() => {
        const item = canvasItems.find(i => i.id === imageEditId);
        if (!item || item.editState.type !== 'banner') return null;
        const slideIdx = getBannerSlideIdx(item.id);
        const slide = item.editState.data.slides[slideIdx];
        const lifestyleState = slide.lifestyleState;
        if (slide.variant === 'Product ver.') {
          return (
            <BannerImageLayoutModal
              themeState={slide.themeState}
              onChange={s => updateBannerSlide(item.id, slideIdx, { ...slide, themeState: s })}
              onClose={() => setImageEditId(null)}
            />
          );
        }
        if (!lifestyleState.imageSrc) return null;
        // Derive the crop tool's initial framing from the CURRENTLY DISPLAYED
        // placement (box-relative imageX/Y/width/height) — see the identical
        // helper + explanation in ModuleEditPanel.tsx's BannerLifestylePanel.
        const computeInitialFraming = (naturalW: number, naturalH: number) => {
          const coverScale = Math.max(BANNER_LS_BOX.width / naturalW, BANNER_LS_BOX.height / naturalH);
          const zoom = Math.min(3, Math.max(1, lifestyleState.imageWidth / (naturalW * coverScale)));
          const bcx = (BANNER_LS_BOX.width / 2 - lifestyleState.imageX) / lifestyleState.imageWidth;
          const bcy = (BANNER_LS_BOX.height / 2 - lifestyleState.imageY) / lifestyleState.imageHeight;
          return { bcx, bcy, zoom };
        };
        return (
          <ImageCropModal
            imageSrc={lifestyleState.imageSrcOriginal ?? lifestyleState.imageSrc}
            aspectRatio={BANNER_LS_BOX.width / BANNER_LS_BOX.height}
            title={t('Lifestyle image')}
            computeInitialFraming={computeInitialFraming}
            onConfirm={cropped => {
              updateBannerSlide(item.id, slideIdx, {
                ...slide,
                lifestyleState: {
                  ...lifestyleState,
                  imageSrc: cropped,
                  imageSrcOriginal: lifestyleState.imageSrcOriginal ?? lifestyleState.imageSrc,
                  ...bannerLifestylePlacement(1),
                },
              });
              setImageEditId(null);
            }}
            onCancel={() => setImageEditId(null)}
          />
        );
      })()}

      {/* Hidden render area for export */}
      <div
        ref={hiddenRenderRef}
        aria-hidden
        style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none', zIndex: -1 }}
      />

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
      {pendingPreset && (
        <ConfirmModal
          title={t('Replace current modules?')}
          message={t('This will replace all modules currently on the canvas.')}
          confirmLabel={t('Replace')}
          cancelLabel={t('Cancel')}
          onConfirm={() => { applyPreset(pendingPreset); setPendingPreset(null); }}
          onCancel={() => setPendingPreset(null)}
        />
      )}
    </div>
  );
}
