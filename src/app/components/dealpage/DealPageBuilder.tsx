/**
 * Deal Page Builder — the www.lg.com Deal Page counterpart to
 * StorePageModulesBuilder.
 *
 * Same three-column shell as Shop in Shop (palette → drag canvas → edit panel)
 * and the same draft/unsaved-guard/ZIP-export plumbing, retargeted from the
 * 1200px marketplace upload slot to lg.com's own 1713px page container.
 * Reproduces Figma `fUup3vSq71f6eUIRpmzz8s` frame 1:1212.
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
  closestCenter,
  type CollisionDetection,
  type DragStartEvent,
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
  DEAL_MODULE_DEFS,
  DEAL_PAGE_WIDTH,
  getDealModuleDef,
  type DealModuleDef,
  type DealModuleType,
} from './dealModuleRegistry';
import { createDealDefaultState, type DealEditState } from './dealEditStates';
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

// ── Quick-start presets ───────────────────────────────────────────────────────

/** The shipped lg.com Deal Page, section for section (Figma 1:1212). */
const FULL_DEAL_PAGE_PRESET: DealModuleType[] = [
  'deal-site-header',
  'deal-hero',
  'deal-cards',
  'deal-promo-banner',
  'deal-tab-nav',
  'deal-time-sale',
  'deal-product-list',
  'deal-product-list',
  'deal-category-nav',
  'deal-promo-banner',
  'deal-product-list',
  'deal-promo-banner',
  'deal-product-list',
  'deal-site-footer',
];

/** A short landing variant — hero, the deal grid, one banner, one product row. */
const SHORT_DEAL_PAGE_PRESET: DealModuleType[] = [
  'deal-site-header',
  'deal-hero',
  'deal-cards',
  'deal-promo-banner',
  'deal-product-list',
  'deal-site-footer',
];

type DealPresetKey = 'full' | 'short';

/**
 * Per-position overrides so a preset lands looking like the real page rather
 * than N copies of the same default: the repeated banner/product pairs down
 * the page are Hot Deals, Bundles and Gifts, not three Exclusive-offer banners.
 */
type PresetOverride = (t: TFunction, state: DealEditState) => DealEditState;

function bannerOverride(headline: string, subCopy: string, image: string): PresetOverride {
  return (t, state) => {
    if (state.type !== 'deal-promo-banner') return state;
    // Everything below the hero runs on the 320 banner (Figma 1:2460 etc.);
    // only the exclusive-offer banner at the top is the 400 one.
    return {
      type: 'deal-promo-banner',
      data: { ...state.data, size: 'Standard', headline: t(headline), subCopy: t(subCopy), showLinks: false, image },
    };
  };
}

function productListOverride(sectionTitle: string, tabs: string[], seedFrom: number): PresetOverride {
  return (t, state) => {
    if (state.type !== 'deal-product-list') return state;
    return {
      type: 'deal-product-list',
      data: {
        ...state.data,
        sectionTitle: t(sectionTitle),
        tabs: tabs.map(x => t(x)).join('\n'),
        products: state.data.products.map((_, i) => {
          const base = createDealDefaultState('deal-product-list', t);
          const src = base.type === 'deal-product-list' ? base.data.products : [];
          return src[(seedFrom + i) % src.length] ?? state.data.products[i];
        }),
      },
    };
  };
}

const PRESETS: Record<DealPresetKey, { modules: DealModuleType[]; overrides?: Record<number, PresetOverride> }> = {
  full: {
    modules: FULL_DEAL_PAGE_PRESET,
    overrides: {
      7: productListOverride('Black Friday prices… Don’t miss out!', ['Washers', 'Refrigerators', 'Monitors', 'Speakers'], 1),
      9: bannerOverride('Hot Deals, online only', 'The season’s deepest markdowns, on LG.com only.', '/deal-page/banner-hot-deals.png'),
      10: productListOverride('Hot Deals you won’t find anywhere else', ['Washers', 'Refrigerators', 'Soundbars'], 2),
      11: bannerOverride('Bundles on sale', 'Add two or more and the discount grows with the basket.', '/deal-page/banner-bundles.png'),
      12: productListOverride('Laundry Bundles', ['Bundles'], 0),
    },
  },
  short: { modules: SHORT_DEAL_PAGE_PRESET },
};

// Palette → canvas drops use closestCenter (registers as soon as the dragged
// card is nearest the canvas); on-canvas reordering needs real overlap with a
// sibling, so it stays on rectIntersection. Same split as Shop in Shop.
const collisionDetectionStrategy: CollisionDetection = args =>
  args.active.data.current?.source === 'palette' ? closestCenter(args) : rectIntersection(args);

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
        <p className="text-[9px] text-gray-400 mt-0.5">
          {DEAL_PAGE_WIDTH} × {def.height === 'free' ? 'free' : def.height}
        </p>
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
  onSelect,
  onRemove,
  onDuplicate,
}: {
  item: DealCanvasItem;
  scale: number;
  isSelected: boolean;
  canDuplicate: boolean;
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
  const [pendingPreset, setPendingPreset] = useState<DealPresetKey | null>(null);

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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Palette → Canvas
    if (activeId.startsWith('palette::')) {
      const moduleType = activeId.replace('palette::', '') as DealModuleType;
      const def = getDealModuleDef(moduleType);
      if (countOnCanvas(moduleType) >= def.maxCount) return;

      const newItem: DealCanvasItem = {
        id: crypto.randomUUID(),
        type: moduleType,
        editState: createDealDefaultState(moduleType, t),
      };

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
      if (oldIdx !== -1 && newIdx !== -1) setCanvasItems(prev => arrayMove(prev, oldIdx, newIdx));
    }
  };

  const removeModule = useCallback((id: string) => {
    setCanvasItems(prev => prev.filter(i => i.id !== id));
    setSelectedId(prev => (prev === id ? null : prev));
  }, []);

  const applyPreset = useCallback(
    (key: DealPresetKey) => {
      const { modules, overrides } = PRESETS[key];
      setCanvasItems(
        modules.map((type, idx) => {
          const base = createDealDefaultState(type, t);
          const override = overrides?.[idx];
          return { id: crypto.randomUUID(), type, editState: override ? override(t, base) : base };
        }),
      );
      setSelectedId(null);
    },
    [t],
  );

  const handlePresetClick = useCallback(
    (key: DealPresetKey) => {
      if (canvasItems.length > 0) setPendingPreset(key);
      else applyPreset(key);
    },
    [canvasItems.length, applyPreset],
  );

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
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          <NavRail active={railActive} onNavigate={key => guard(() => onRailNavigate(key))} onOpenDraft={onOpenDraft} />

          {/* Left — Palette */}
          <aside className="w-64 shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col gap-1 p-3">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide px-1 pb-1">{t('Quick Start')}</p>
            <div className="flex flex-col gap-1.5 pb-3 mb-2 border-b border-gray-100">
              <button
                type="button"
                onClick={() => handlePresetClick('full')}
                className="text-left text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-[#FD312E] border border-gray-200 rounded-lg px-3 py-2 transition-colors"
              >
                {t('Template for Deal Page')}
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('short')}
                className="text-left text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-[#FD312E] border border-gray-200 rounded-lg px-3 py-2 transition-colors"
              >
                {t('Template for Short Deal Page')}
              </button>
            </div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide px-1 pb-1">{t('Modules')}</p>
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
                  canvasItems.map(item => (
                    <SortableCanvasItem
                      key={item.id}
                      item={item}
                      scale={scale}
                      isSelected={item.id === selectedId}
                      canDuplicate={countOnCanvas(item.type) < getDealModuleDef(item.type).maxCount}
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
                return (
                  <div className="p-5">
                    <p className="font-lgei font-bold text-[15px] text-gray-900 mb-0.5">{t(def.label)}</p>
                    <p className="text-xs text-gray-400 mb-5">
                      {DEAL_PAGE_WIDTH} × {def.height === 'free' ? 'free' : def.height}
                    </p>
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
            applyPreset(pendingPreset);
            setPendingPreset(null);
          }}
          onCancel={() => setPendingPreset(null)}
        />
      )}
    </div>
  );
}
