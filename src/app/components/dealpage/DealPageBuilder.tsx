/**
 * Deal Page Builder — the www.lg.com Deal Page counterpart to
 * StorePageModulesBuilder.
 *
 * Same three-column shell as Shop in Shop (palette → drag canvas → edit panel)
 * and the same draft/unsaved-guard/ZIP-export plumbing, retargeted from the
 * 1200px marketplace upload slot to lg.com's own 2280px page.
 * Reproduces Figma `miJcDQgz0yJMskLE5a5HHj`, page "ExporttoFigma | www.lg.com |
 * Deal Page" (body 6080:50977).
 */

import React, { useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  pointerWithin,
  type CollisionDetection,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import {
  artSizeLabel,
  DEAL_MODULE_DEFS,
  DEAL_PAGE_WIDTH,
  getDealModuleDef,
  type DealModuleDef,
  type DealModuleType,
} from './dealModuleRegistry';
import {
  createDealDefaultState,
  dealProductSetItems,
  type DealEditState,
  type DealProductSetKey,
} from './dealEditStates';
import { DealModuleRenderer } from './DealModuleRenderer';
import { DealModuleEditPanel } from './DealModuleEditPanel';
import { saveBlob } from '../../utils/fileSaver';
import { useT, type TFunction } from '../../i18n/LanguageContext';
import { AppHeader } from '../AppHeader';
import { NavRail, type NavRailKey } from '../NavRail';
import type { DraftRecord } from '../../utils/draftStore';
import { useDraftSave } from '../../hooks/useDraftSave';
import { useApplyBrandFont } from '../../fonts/useApplyBrandFont';
import { ensureBrandFontLoaded } from '../../fonts/brandFonts';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { SaveForLaterButton, SaveDraftModal } from '../SaveForLaterButton';
import { UnsavedChangesModal } from '../UnsavedChangesModal';
import { ConfirmModal } from '../ConfirmModal';
import { restoreDealCanvasItems, type DealPagePayloadV1 } from '../../drafts/dealPagePayload';

export interface DealCanvasItem {
  id: string;
  type: DealModuleType;
  editState: DealEditState;
}

const DRAFT_TITLE = 'Deal Page';

// ── Quick start ───────────────────────────────────────────────────────────────

/**
 * ONE preset: the Black Friday Deal Page exactly as the Figma board carries it
 * today, section for section (main content 6080:51043). Order and per-position
 * copy both come from that board — the repeated banner/grid pairs down the page
 * are Time Sale, Hot Deals, Bundles and Gifts, not four copies of one default.
 */
const BLACK_FRIDAY_PAGE_PRESET: DealModuleType[] = [
  'deal-site-header',    // 0
  'deal-hero',           // 1
  'deal-cards',          // 2
  'deal-promo-banner',   // 3  exclusive offer, 400
  'deal-tab-nav',        // 4
  'deal-banner',         // 5  time sale countdown
  'deal-product-list',   // 6
  'deal-product-list',   // 7
  'deal-category-nav',   // 8
  'deal-banner',         // 9  hot deals, 350
  'deal-product-list',   // 10
  'deal-banner',         // 11 bundles, 350
  'deal-product-list',   // 12
  'deal-banner',         // 13 gifts, 350
  'deal-product-list',   // 14
  'deal-promo-banner',   // 15 closing offer — PD Slot, where Membership CTA used to sit
  'deal-site-footer',    // 16
];

type PresetOverride = (t: TFunction, state: DealEditState) => DealEditState;

/** The three lower banners: deal banners (350 tall), 20px sub copy, no legal links. */
function bannerOverride(headline: string, subCopy: string, kvAsset: string): PresetOverride {
  return (t, state) => {
    if (state.type !== 'deal-banner') return state;
    return {
      type: 'deal-banner',
      data: { ...state.data, size: 'Standard', headline: t(headline), subCopy: t(subCopy), showLinks: false, kvAsset, image: null },
    };
  };
}

function productListOverride(sectionTitle: string, tabs: string[], productSet: DealProductSetKey, count = 4): PresetOverride {
  return (t, state) => {
    if (state.type !== 'deal-product-list') return state;
    return {
      type: 'deal-product-list',
      data: {
        ...state.data,
        sectionTitle: t(sectionTitle),
        tabs: tabs.map(x => t(x)).join('\n'),
        showTabs: tabs.length > 0,
        productSet,
        products: dealProductSetItems(t, productSet, count),
      },
    };
  };
}

// Product-list rows follow the board's own curated sets: washers under
// "Black Friday prices…" and "Hot Deals", WashTower under "Laundry Bundles",
// refrigerators under "Free gifts" (three cards there, as on the board).
/** Position 5: the Time Sale banner — a deal banner with the countdown on. */
function timeSaleOverride(): PresetOverride {
  return (t, state) => {
    if (state.type !== 'deal-banner') return state;
    return {
      type: 'deal-banner',
      data: {
        ...state.data,
        headline: t('Time Sale ends in'),
        subCopy: t('Limited hours only — when the clock stops, the price is gone.'),
        showLinks: false,
        kvAsset: 'deal-type-time-sale',
        image: null,
        showCountdown: true,
      },
    };
  };
}

/** Promotion banners: the opener runs PD Centric art, the closer PD Slot. */
function promoBannerOverride(kvAsset: string): PresetOverride {
  return (_t, state) => {
    if (state.type !== 'deal-promo-banner') return state;
    return { type: 'deal-promo-banner', data: { ...state.data, kvAsset } };
  };
}

/** Position 15: the closing PD Slot banner — no legal links, CTA on. */
function closingPromoOverride(): PresetOverride {
  return (_t, state) => {
    if (state.type !== 'deal-promo-banner') return state;
    return {
      type: 'deal-promo-banner',
      data: { ...state.data, showLinks: false, showCta: true },
    };
  };
}

const PRESET_OVERRIDES: Record<number, PresetOverride> = {
  3:  promoBannerOverride('kv-product-centric-1'),
  5:  timeSaleOverride(),
  7:  productListOverride('Black Friday prices… Don’t miss out! 🎁', ['Washers', 'Refrigerators', 'Monitors', 'Speakers'], 'washer'),
  9:  bannerOverride('Hot Deals, online only', 'The season’s deepest markdowns, on LG.com only.', 'deal-type-hot-deal'),
  10: productListOverride('Hot Deals you won’t find anywhere else', ['Washers', 'Refrigerators', 'Soundbars'], 'washer'),
  11: bannerOverride('Bundles on sale', 'Add more to the set and the discount grows with it.', 'deal-type-bundle'),
  12: productListOverride('Laundry Bundles', [], 'washtower'),
  13: bannerOverride('Gifts on sale', 'Get a free gift with select Black Friday purchases.', 'deal-type-gift'),
  14: productListOverride('Free gifts with your purchase', ['Refrigerators', 'Washers'], 'refrigerator', 3),
  15: closingPromoOverride(),
};

// Palette → canvas drops follow the POINTER (closestCenter compared centre
// distances, so next to a tall module the wrong neighbour would win, and a
// release anywhere — even over the palette — still dropped somewhere). The
// insertion slot itself is computed from pointer Y in onDragMove; on-canvas
// reordering needs real overlap with a sibling, so it stays on rectIntersection.
const collisionDetectionStrategy: CollisionDetection = args =>
  args.active.data.current?.source === 'palette' ? pointerWithin(args) : rectIntersection(args);

// ── Palette card ──────────────────────────────────────────────────────────────

const PALETTE_PREVIEWS = Object.fromEntries(
  DEAL_MODULE_DEFS.map(d => [d.type, createDealDefaultState(d.type)]),
) as Record<DealModuleType, DealEditState>;

const PALETTE_THUMB = 56;
const PALETTE_THUMB_SCALE = PALETTE_THUMB / DEAL_PAGE_WIDTH;

function PaletteCard({ def, disabled, count }: { def: DealModuleDef; disabled: boolean; count: number }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette::${def.type}`,
    disabled,
    data: { source: 'palette', moduleType: def.type },
  });

  // `placeholderHeight` is only a guess for the "free"-height modules, so the
  // thumbnail centers against the module's real rendered height.
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
        style={{ width: PALETTE_THUMB, height: PALETTE_THUMB, position: 'relative', background: '#F0ECE4' }}
      >
        <div
          style={{
            width: DEAL_PAGE_WIDTH,
            position: 'absolute',
            left: 0,
            top: offsetY,
            transform: `scale(${PALETTE_THUMB_SCALE})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <div ref={innerRef}>
            <DealModuleRenderer editState={PALETTE_PREVIEWS[def.type]} />
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
        <p className="text-[11px] text-gray-500 leading-tight">{t(def.section)}</p>
        {artSizeLabel(def) && <p className="text-[9px] text-gray-400 mt-0.5">{artSizeLabel(def)}</p>}
      </div>
    </div>
  );
}

// ── Sortable canvas item ──────────────────────────────────────────────────────

function SortableCanvasItem({
  item,
  scale,
  isSelected,
  canDuplicate,
  indicator,
  onSelect,
  onRemove,
  onDuplicate,
}: {
  item: DealCanvasItem;
  scale: number;
  isSelected: boolean;
  canDuplicate: boolean;
  /** Palette-drag insertion marker — which edge the new module would land on. */
  indicator: 'above' | 'below' | null;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { source: 'canvas' },
  });

  const innerRef = useRef<HTMLDivElement>(null);
  const [innerHeight, setInnerHeight] = useState(getDealModuleDef(item.type).placeholderHeight);
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height;
      if (h && h > 0) setInnerHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const boxW = DEAL_PAGE_WIDTH * scale;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-deal-canvas-item
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
      {indicator && (
        <div
          style={{
            position: 'absolute',
            left: `calc(50% - ${boxW / 2}px)`,
            width: boxW,
            height: 3,
            borderRadius: 2,
            background: '#FD312E',
            ...(indicator === 'above' ? { top: -2.5 } : { bottom: -2.5 }),
            zIndex: 20,
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ width: boxW, margin: '0 auto', position: 'relative' }}>
        <div
          onClick={e => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            width: boxW,
            height: innerHeight * scale,
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          <div
            ref={innerRef}
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: DEAL_PAGE_WIDTH, position: 'absolute', top: 0, left: 0 }}
          >
            <DealModuleRenderer editState={item.editState} />
          </div>
        </div>

        <div
          className={`absolute inset-0 border-2 pointer-events-none transition-colors ${
            isSelected ? 'border-[#FD312E]' : 'border-transparent group-hover:border-gray-300'
          }`}
        />
      </div>

      {isSelected && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `calc(50% + ${boxW / 2 + 8}px)`,
            top: 6,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={e => {
              e.stopPropagation();
              onDuplicate();
            }}
            disabled={!canDuplicate}
            title={t('Duplicate')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'none',
              border: 'none',
              color: canDuplicate ? '#374151' : '#d1d5db',
              cursor: canDuplicate ? 'pointer' : 'not-allowed',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M9.5 4.5V3A1.5 1.5 0 008 1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
          <div style={{ width: 1, alignSelf: 'stretch', background: '#e5e7eb' }} />
          <button
            onClick={e => {
              e.stopPropagation();
              onRemove();
            }}
            title={t('Delete')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 3.5h10M5 3.5V2.5a1 1 0 011-1h2a1 1 0 011 1v1M5.5 6.5v4M8.5 6.5v4M3 3.5l.6 6.5a1 1 0 001 .9h4.8a1 1 0 001-.9l.6-6.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

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
  initialDraft?: { id: string; title: string; payload: DealPagePayloadV1 };
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}

export function DealPageBuilder({ onBack, initialDraft, railActive, onRailNavigate, onOpenDraft }: Props) {
  const t = useT();
  const [canvasItems, setCanvasItems] = useState<DealCanvasItem[]>(() =>
    initialDraft ? restoreDealCanvasItems(initialDraft.payload, t) : [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [pendingPreset, setPendingPreset] = useState(false);
  const [pendingReset, setPendingReset] = useState(false);

  // lg.com pages are always set in the LG brand face — no picker here.
  useApplyBrandFont('lg');

  const draftState = useMemo(() => ({ canvasItems }), [canvasItems]);
  const draft = useDraftSave({
    builder: 'deal-page',
    initialDraftId: initialDraft?.id,
    state: draftState,
    title: initialDraft?.title ?? DRAFT_TITLE,
    serialize: st => ({ canvasItems: st.canvasItems }),
  });
  const defaultDraftName = initialDraft?.title ?? DRAFT_TITLE;
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
  const [scale, setScale] = useState(0.4);

  // Cap higher than Shop in Shop's 0.3: the Deal Page is 2280 wide and its
  // product cards carry far more small copy, so a 0.3 preview would be
  // unreadable.
  useLayoutEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setScale(Math.min(w / DEAL_PAGE_WIDTH, 0.42));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const countOnCanvas = useCallback(
    (type: DealModuleType) => canvasItems.filter(i => i.type === type).length,
    [canvasItems],
  );

  const selectedItem = selectedId ? canvasItems.find(i => i.id === selectedId) ?? null : null;

  const handleDragStart = ({ active }: DragStartEvent) => setActiveDragId(String(active.id));

  /**
   * Palette-drag insertion slot, computed from POINTER Y against the rendered
   * modules' midpoints — above a module's midpoint lands before it, below
   * lands after. dnd-kit's `over` can't express that (it only names a module,
   * and the old code always inserted before it), so the slot is tracked here
   * and `handleDragEnd` consumes it. State drives the indicator line; the ref
   * is what the drop reads, immune to a stale render.
   */
  const [dragInsertIndex, setDragInsertIndex] = useState<number | null>(null);
  const dragInsertRef = useRef<number | null>(null);
  const setInsertIndex = (idx: number | null) => {
    dragInsertRef.current = idx;
    setDragInsertIndex(prev => (prev === idx ? prev : idx));
  };

  const handleDragMove = ({ active }: DragMoveEvent) => {
    if (!String(active.id).startsWith('palette::')) return;
    const container = canvasContainerRef.current;
    const rect = active.rect.current.translated; // snapCenterToCursor → centre ≈ pointer
    if (!container || !rect) return setInsertIndex(null);
    const px = rect.left + rect.width / 2;
    const py = rect.top + rect.height / 2;
    const cb = container.getBoundingClientRect();
    if (px < cb.left || px > cb.right || py < cb.top || py > cb.bottom) return setInsertIndex(null);
    const nodes = container.querySelectorAll('[data-deal-canvas-item]');
    let idx = 0;
    nodes.forEach(node => {
      const r = node.getBoundingClientRect();
      if (py > r.top + r.height / 2) idx += 1;
    });
    setInsertIndex(idx);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    const insertIdx = dragInsertRef.current;
    setInsertIndex(null);

    const activeId = String(active.id);

    // Palette → Canvas — lands at the slot the indicator showed.
    if (activeId.startsWith('palette::')) {
      if (insertIdx === null && !over) return; // released outside the canvas
      const moduleType = activeId.replace('palette::', '') as DealModuleType;
      const def = getDealModuleDef(moduleType);
      if (countOnCanvas(moduleType) >= def.maxCount) return;

      const newItem: DealCanvasItem = {
        id: crypto.randomUUID(),
        type: moduleType,
        editState: createDealDefaultState(moduleType, t),
      };

      setCanvasItems(prev => {
        const next = [...prev];
        next.splice(insertIdx === null ? next.length : Math.min(insertIdx, next.length), 0, newItem);
        return next;
      });
      return;
    }

    // Canvas → Canvas (reorder)
    if (!over) return;
    const overId = String(over.id);
    if (activeId !== overId && overId !== 'canvas') {
      const oldIdx = canvasItems.findIndex(i => i.id === activeId);
      const newIdx = canvasItems.findIndex(i => i.id === overId);
      if (oldIdx !== -1 && newIdx !== -1) setCanvasItems(prev => arrayMove(prev, oldIdx, newIdx));
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setInsertIndex(null);
  };

  const removeModule = useCallback((id: string) => {
    setCanvasItems(prev => prev.filter(i => i.id !== id));
    setSelectedId(prev => (prev === id ? null : prev));
  }, []);

  const applyPreset = useCallback(() => {
    setCanvasItems(
      BLACK_FRIDAY_PAGE_PRESET.map((type, idx) => {
        const base = createDealDefaultState(type, t);
        const override = PRESET_OVERRIDES[idx];
        return { id: crypto.randomUUID(), type, editState: override ? override(t, base) : base };
      }),
    );
    setSelectedId(null);
  }, [t]);

  const handlePresetClick = useCallback(() => {
    if (canvasItems.length > 0) setPendingPreset(true);
    else applyPreset();
  }, [canvasItems.length, applyPreset]);

  /** Back to an empty canvas — the way out of a session of poking at modules. */
  const clearCanvas = useCallback(() => {
    setCanvasItems([]);
    setSelectedId(null);
  }, []);

  const duplicateModule = useCallback(
    (id: string) => {
      const idx = canvasItems.findIndex(i => i.id === id);
      if (idx === -1) return;
      const item = canvasItems[idx];
      const def = getDealModuleDef(item.type);
      if (canvasItems.filter(i => i.type === item.type).length >= def.maxCount) return;
      const newItem: DealCanvasItem = {
        id: crypto.randomUUID(),
        type: item.type,
        editState: { ...item.editState, data: { ...(item.editState as { data: object }).data } } as DealEditState,
      };
      const next = [...canvasItems];
      next.splice(idx + 1, 0, newItem);
      setCanvasItems(next);
      setSelectedId(newItem.id);
    },
    [canvasItems],
  );

  const updateEditState = useCallback((id: string, newState: DealEditState) => {
    setCanvasItems(prev => prev.map(item => (item.id === id ? { ...item, editState: newState } : item)));
  }, []);

  const handleDownload = async () => {
    if (canvasItems.length === 0 || !hiddenRenderRef.current) return;
    setDownloading(true);
    const container = hiddenRenderRef.current;
    const root = createRoot(container);
    try {
      // Resolve the brand faces before the first capture — the two-pass warmup
      // below caches images, not fonts.
      await ensureBrandFontLoaded('lg');

      const zip = new JSZip();
      const d = new Date();
      const date6 = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

      for (let i = 0; i < canvasItems.length; i++) {
        const item = canvasItems[i];
        const def = getDealModuleDef(item.type);
        const index = String(i + 1).padStart(2, '0');

        await new Promise<void>(resolve => {
          root.render(<DealModuleRenderer editState={item.editState} />);
          setTimeout(resolve, 250);
        });

        const el = container.firstElementChild as HTMLElement | null;
        if (!el) continue;

        const size = `${Math.round(el.offsetWidth)}x${Math.round(el.offsetHeight)}`;
        // Schema: NN-module name-WxH-deal page-date, e.g.
        // "01-hero kv-1713x642-deal page-260821.png".
        const fileName = `${index}-${def.label.toLowerCase()}-${size}-deal page-${date6}.png`;

        await toPng(el);
        await toPng(el);
        const dataUrl = await toPng(el, { cacheBust: true });
        zip.file(fileName, dataUrl.replace(/^data:image\/png;base64,/, ''), { base64: true });
      }

      root.unmount();
      const blob = await zip.generateAsync({ type: 'blob' });
      saveBlob(blob, 'LG-deal-page-modules.zip');
    } finally {
      setDownloading(false);
    }
  };

  const activePaletteType = activeDragId?.startsWith('palette::')
    ? (activeDragId.replace('palette::', '') as DealModuleType)
    : null;
  const activeCanvasItem =
    activeDragId && !activeDragId.startsWith('palette::') ? canvasItems.find(i => i.id === activeDragId) ?? null : null;

  return (
    <div className="flex flex-col h-screen bg-[#f8f7f5]">
      <AppHeader
        title={t('Promotion Page Builder')}
        onBack={() => guard(onBack)}
        right={
          <>
            <SaveForLaterButton draft={draft} defaultName={defaultDraftName} disabled={canvasItems.length === 0} />
            <button
              onClick={handleDownload}
              disabled={canvasItems.length === 0 || downloading}
              className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-full border transition-colors border-[#FD312E] text-[#FD312E] hover:bg-[#FD312E] hover:text-white disabled:opacity-40 disabled:pointer-events-none"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-1 overflow-hidden">
          <NavRail active={railActive} onNavigate={key => guard(() => onRailNavigate(key))} onOpenDraft={onOpenDraft} />

          {/* Left — Palette */}
          <aside className="w-64 shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col gap-1 p-3">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide px-1 pb-1">{t('Quick Start')}</p>
            <div className="flex flex-col gap-1.5 pb-3 mb-2 border-b border-gray-100">
              <button
                type="button"
                onClick={handlePresetClick}
                className="text-left text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-[#FD312E] border border-gray-200 rounded-lg px-3 py-2 transition-colors"
              >
                {t('Template for Black Friday Page')}
              </button>
            </div>
            <div className="flex items-center px-1 pb-1">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{t('Modules')}</p>
              <button
                type="button"
                onClick={() => setPendingReset(true)}
                disabled={canvasItems.length === 0}
                className="ml-auto text-[11px] font-medium text-gray-400 hover:text-[#FD312E] disabled:text-gray-300 disabled:cursor-default transition-colors"
              >
                {t('Reset')}
              </button>
            </div>
            {DEAL_MODULE_DEFS.map(def => {
              const count = countOnCanvas(def.type);
              return <PaletteCard key={def.type} def={def} count={count} disabled={count >= def.maxCount} />;
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
                  canvasItems.map((item, i) => (
                    <SortableCanvasItem
                      key={item.id}
                      item={item}
                      scale={scale}
                      isSelected={item.id === selectedId}
                      canDuplicate={countOnCanvas(item.type) < getDealModuleDef(item.type).maxCount}
                      indicator={
                        dragInsertIndex === null
                          ? null
                          : dragInsertIndex === i
                          ? 'above'
                          : dragInsertIndex === i + 1 && i === canvasItems.length - 1
                          ? 'below'
                          : null
                      }
                      onSelect={() => setSelectedId(item.id)}
                      onRemove={() => removeModule(item.id)}
                      onDuplicate={() => duplicateModule(item.id)}
                    />
                  ))
                )}
              </CanvasDropZone>
            </SortableContext>
          </main>

          {/* Right — Edit Panel */}
          <aside className="w-80 shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
            {selectedItem ? (
              (() => {
                const def = getDealModuleDef(selectedItem.type);
                // Each banner type carries a fixed height now (promotion 400,
                // deal 350), so the registry's own artSize is the answer.
                const size = artSizeLabel(def);
                return (
                  <div className="p-5">
                    <p className={`font-lgei font-bold text-[15px] text-gray-900 ${size ? 'mb-0.5' : 'mb-5'}`}>
                      {t(def.label)}
                    </p>
                    {size && <p className="text-xs text-gray-400 mb-5">{size}</p>}
                    <DealModuleEditPanel
                      editState={selectedItem.editState}
                      onUpdate={newState => updateEditState(selectedItem.id, newState)}
                    />
                  </div>
                );
              })()
            ) : (
              <div className="flex items-center justify-center h-full p-5">
                <p className="text-sm text-gray-400 text-center">{t('Click a module on the canvas to edit.')}</p>
              </div>
            )}
          </aside>
        </div>

        <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
          {activePaletteType && (
            <div className="bg-white border border-[#FD312E] rounded-lg px-3 py-2.5 shadow-lg opacity-90 pointer-events-none">
              <p className="text-sm font-medium text-[#FD312E]">{t(getDealModuleDef(activePaletteType).label)}</p>
            </div>
          )}
          {activeCanvasItem &&
            (() => {
              const previewW = 300;
              const previewScale = previewW / DEAL_PAGE_WIDTH;
              const def = getDealModuleDef(activeCanvasItem.type);
              return (
                <div
                  style={{
                    width: previewW,
                    height: def.placeholderHeight * previewScale,
                    overflow: 'hidden',
                    borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    opacity: 0.85,
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: DEAL_PAGE_WIDTH }}>
                    <DealModuleRenderer editState={activeCanvasItem.editState} />
                  </div>
                </div>
              );
            })()}
        </DragOverlay>
      </DndContext>

      {/* Hidden render area for export */}
      <div
        ref={hiddenRenderRef}
        aria-hidden
        style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none', zIndex: -1 }}
      />

      {showUnsavedModal && <UnsavedChangesModal onSave={handleUnsavedSave} onDiscard={handleUnsavedDiscard} />}
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
          onConfirm={() => {
            applyPreset();
            setPendingPreset(false);
          }}
          onCancel={() => setPendingPreset(false)}
        />
      )}
      {pendingReset && (
        <ConfirmModal
          title={t('Clear the canvas?')}
          message={t('This removes every module on the canvas. Saved versions are not affected.')}
          confirmLabel={t('Clear')}
          cancelLabel={t('Cancel')}
          onConfirm={() => {
            clearCanvas();
            setPendingReset(false);
          }}
          onCancel={() => setPendingReset(false)}
        />
      )}
    </div>
  );
}
