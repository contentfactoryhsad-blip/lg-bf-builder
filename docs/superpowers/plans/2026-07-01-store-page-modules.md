# Store Page Modules Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a drag-and-drop 3-panel page builder for assembling Shop in Shop store pages, with numbered ZIP download.

**Architecture:** `StorePageModulesBuilder` is a self-contained 3-panel component (palette / canvas / edit panel) mounted via a new `'store-page-modules'` step in `BrandShopBuilder`. Module definitions live in `moduleRegistry.ts`. Drag-and-drop uses @dnd-kit with two drag sources: palette cards (add new module) and canvas items (reorder). Download renders each canvas item off-screen via `html-to-image` then bundles into JSZip.

**Tech Stack:** React 18 + TypeScript, @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities (new), html-to-image (existing), JSZip (existing), saveBlob util (existing at `src/app/utils/fileSaver.ts`)

## Global Constraints

- All modules are 1200px wide
- Single-use (max 1): Official store, Follow us, Value props
- Multi-use (unlimited): Text, KV, KV+Product list, Category list, Product cards, Banner, Vouchers
- ZIP filename format: `01_Official_store.png` (single-use), `03_Banner_1.png` / `04_Banner_2.png` (multi-use, 1-based per type, index zero-padded to 2 digits)
- ZIP archive name: `LG_Store_Page_Modules.zip`
- Red: `#A50034`, existing pill button style for Download ZIP
- No MO preview — PC only

---

### Task 1: Install @dnd-kit + create module registry

**Files:**
- Create: `src/app/components/brandshop/modules/moduleRegistry.ts`

**Interfaces:**
- Produces: `ModuleType`, `ModuleDef`, `MODULE_DEFS`, `getModuleDef` — used by all subsequent tasks

- [ ] **Step 1: Install @dnd-kit packages**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: packages appear in `package.json` dependencies.

- [ ] **Step 2: Create module registry**

Create `src/app/components/brandshop/modules/moduleRegistry.ts`:

```typescript
export type ModuleType =
  | 'official-store'
  | 'follow-us'
  | 'text'
  | 'kv'
  | 'kv-product-list'
  | 'category-list'
  | 'product-cards'
  | 'banner'
  | 'vouchers'
  | 'value-props';

export interface ModuleDef {
  type: ModuleType;
  label: string;
  width: number;
  height: number | 'free';
  placeholderHeight: number;
  maxCount: number;    // 1 = single-use, Infinity = unlimited
  zipName: string;     // used in filename, e.g. 'Official_store'
}

export const MODULE_DEFS: ModuleDef[] = [
  { type: 'official-store',  label: 'Official store',   width: 1200, height: 180,    placeholderHeight: 180,  maxCount: 1,        zipName: 'Official_store'  },
  { type: 'follow-us',       label: 'Follow us',        width: 1200, height: 120,    placeholderHeight: 120,  maxCount: 1,        zipName: 'Follow_us'       },
  { type: 'text',            label: 'Text',             width: 1200, height: 160,    placeholderHeight: 160,  maxCount: Infinity, zipName: 'Text'            },
  { type: 'kv',              label: 'KV',               width: 1200, height: 1200,   placeholderHeight: 1200, maxCount: Infinity, zipName: 'KV'              },
  { type: 'kv-product-list', label: 'KV+Product list',  width: 1200, height: 'free', placeholderHeight: 600,  maxCount: Infinity, zipName: 'KV_Product_list' },
  { type: 'category-list',   label: 'Category list',    width: 1200, height: 'free', placeholderHeight: 500,  maxCount: Infinity, zipName: 'Category_list'   },
  { type: 'product-cards',   label: 'Product cards',    width: 1200, height: 'free', placeholderHeight: 500,  maxCount: Infinity, zipName: 'Product_cards'   },
  { type: 'banner',          label: 'Banner',           width: 1200, height: 628,    placeholderHeight: 628,  maxCount: Infinity, zipName: 'Banner'          },
  { type: 'vouchers',        label: 'Vouchers',         width: 1200, height: 'free', placeholderHeight: 400,  maxCount: Infinity, zipName: 'Vouchers'        },
  { type: 'value-props',     label: 'Value props',      width: 1200, height: 346,    placeholderHeight: 346,  maxCount: 1,        zipName: 'Value_props'     },
];

export function getModuleDef(type: ModuleType): ModuleDef {
  return MODULE_DEFS.find(d => d.type === type)!;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors from moduleRegistry.ts.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/components/brandshop/modules/moduleRegistry.ts
git commit -m "feat(store-page-modules): install @dnd-kit + module registry"
```

---

### Task 2: ModulePlaceholder component

**Files:**
- Create: `src/app/components/brandshop/modules/ModulePlaceholder.tsx`

**Interfaces:**
- Consumes: `ModuleDef` from `moduleRegistry.ts`
- Produces: `<ModulePlaceholder def={ModuleDef} />` — used by canvas and off-screen export renderer

- [ ] **Step 1: Create ModulePlaceholder**

Create `src/app/components/brandshop/modules/ModulePlaceholder.tsx`:

```tsx
import React from 'react';
import { ModuleDef } from './moduleRegistry';

interface Props {
  def: ModuleDef;
}

export function ModulePlaceholder({ def }: Props) {
  return (
    <div
      style={{
        width: def.width,
        height: def.placeholderHeight,
        background: '#E5E5E5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        userSelect: 'none',
        fontFamily: 'sans-serif',
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 600, color: '#999' }}>
        {def.label}
      </span>
      <span style={{ fontSize: 13, color: '#bbb' }}>
        {def.width} × {def.height === 'free' ? 'free' : def.height}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/brandshop/modules/ModulePlaceholder.tsx
git commit -m "feat(store-page-modules): ModulePlaceholder component"
```

---

### Task 3: StorePageModulesBuilder (3-panel + drag-and-drop) + routing

**Files:**
- Create: `src/app/components/brandshop/StorePageModulesBuilder.tsx`
- Modify: `src/app/components/BrandShopBuilder.tsx`

**Interfaces:**
- Consumes: `MODULE_DEFS`, `ModuleType`, `getModuleDef`, `ModuleDef` from `moduleRegistry.ts`; `ModulePlaceholder` from `ModulePlaceholder.tsx`; `@dnd-kit/*`
- Produces: `<StorePageModulesBuilder onBack={fn} />` mounted by BrandShopBuilder on step `'store-page-modules'`

- [ ] **Step 1: Create StorePageModulesBuilder.tsx**

Create `src/app/components/brandshop/StorePageModulesBuilder.tsx`:

```tsx
import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
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
import { CSS } from '@dnd-kit/utilities';
import { MODULE_DEFS, ModuleType, getModuleDef, type ModuleDef } from './modules/moduleRegistry';
import { ModulePlaceholder } from './modules/ModulePlaceholder';

interface CanvasItem {
  id: string;
  type: ModuleType;
  editState: object;
}

// ── Palette card ─────────────────────────────────────────────────────────────
function PaletteCard({ def, disabled }: { def: ModuleDef; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette::${def.type}`,
    disabled,
    data: { source: 'palette', moduleType: def.type },
  });

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : { ...attributes, ...listeners })}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors select-none ${
        disabled
          ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
          : isDragging
          ? 'opacity-40 border-[#A50034] bg-white'
          : 'border-gray-200 bg-white hover:border-[#A50034] hover:text-[#A50034] cursor-grab active:cursor-grabbing'
      }`}
    >
      <p className="text-sm font-medium text-gray-800 leading-none mb-1">{def.label}</p>
      <p className="text-[11px] text-gray-400">
        1200 × {def.height === 'free' ? 'free' : def.height}
      </p>
    </div>
  );
}

// ── Sortable canvas item ──────────────────────────────────────────────────────
function SortableCanvasItem({
  item,
  scale,
  isSelected,
  onSelect,
  onRemove,
}: {
  item: CanvasItem;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const def = getModuleDef(item.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { source: 'canvas' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        marginBottom: 2,
        position: 'relative',
      }}
      className="group"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="absolute top-1 left-1 z-10 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 cursor-grab active:cursor-grabbing"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="3" cy="2" r="1" fill="#999"/>
          <circle cx="7" cy="2" r="1" fill="#999"/>
          <circle cx="3" cy="5" r="1" fill="#999"/>
          <circle cx="7" cy="5" r="1" fill="#999"/>
          <circle cx="3" cy="8" r="1" fill="#999"/>
          <circle cx="7" cy="8" r="1" fill="#999"/>
        </svg>
      </div>

      {/* Module — scaled wrapper clips overflow so layout stays correct */}
      <div
        onClick={e => { e.stopPropagation(); onSelect(); }}
        style={{ width: 1200 * scale, height: def.placeholderHeight * scale, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 1200, position: 'absolute', top: 0, left: 0 }}>
          <ModulePlaceholder def={def} />
        </div>
      </div>

      {/* Selection / hover border */}
      <div
        className={`absolute inset-0 border-2 pointer-events-none transition-colors ${
          isSelected ? 'border-[#A50034]' : 'border-transparent group-hover:border-gray-300'
        }`}
      />

      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-300"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1l8 8M9 1L1 9" stroke="#666" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>
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
}

export function StorePageModulesBuilder({ onBack }: Props) {
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setScale(w / 1200);
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

  const selectedDef = selectedId
    ? getModuleDef(canvasItems.find(i => i.id === selectedId)!.type)
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

      const newItem: CanvasItem = { id: crypto.randomUUID(), type: moduleType, editState: {} };

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

  // Active drag preview content
  const activePaletteType = activeDragId?.startsWith('palette::')
    ? (activeDragId.replace('palette::', '') as ModuleType)
    : null;
  const activeCanvasItem = activeDragId && !activeDragId.startsWith('palette::')
    ? canvasItems.find(i => i.id === activeDragId) ?? null
    : null;

  return (
    <div className="flex flex-col h-screen bg-[#f8f7f5]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          <span className="font-lgei font-bold text-[15px] text-gray-900">Store Page Modules</span>
        </div>
        <button
          onClick={() => { /* wired in Task 4 */ }}
          disabled={canvasItems.length === 0 || downloading}
          className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-full border transition-colors border-[#A50034] text-[#A50034] hover:bg-[#A50034] hover:text-white disabled:opacity-40 disabled:pointer-events-none"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Download ZIP
        </button>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          {/* Left — Palette */}
          <aside className="w-60 shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col gap-1 p-3">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide px-1 pb-1">Modules</p>
            {MODULE_DEFS.map(def => (
              <PaletteCard
                key={def.type}
                def={def}
                disabled={countOnCanvas(def.type) >= def.maxCount}
              />
            ))}
          </aside>

          {/* Center — Canvas */}
          <main
            ref={canvasContainerRef}
            className="flex-1 overflow-y-auto p-6"
            onClick={() => setSelectedId(null)}
          >
            <SortableContext items={canvasItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <CanvasDropZone isEmpty={canvasItems.length === 0}>
                {canvasItems.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-400 text-sm">Drag a module from the left to get started.</p>
                  </div>
                ) : (
                  canvasItems.map(item => (
                    <SortableCanvasItem
                      key={item.id}
                      item={item}
                      scale={scale}
                      isSelected={item.id === selectedId}
                      onSelect={() => setSelectedId(item.id)}
                      onRemove={() => removeModule(item.id)}
                    />
                  ))
                )}
              </CanvasDropZone>
            </SortableContext>
          </main>

          {/* Right — Edit Panel */}
          <aside className="w-80 shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
            {selectedDef ? (
              <div className="p-5">
                <p className="font-lgei font-bold text-[15px] text-gray-900 mb-0.5">{selectedDef.label}</p>
                <p className="text-xs text-gray-400 mb-6">
                  1200 × {selectedDef.height === 'free' ? 'free' : selectedDef.height}
                </p>
                <p className="text-sm text-gray-400">Edit options coming soon.</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-5">
                <p className="text-sm text-gray-400 text-center">Click a module on the canvas to edit.</p>
              </div>
            )}
          </aside>
        </div>

        <DragOverlay>
          {activePaletteType && (
            <div className="bg-white border border-[#A50034] rounded-lg px-3 py-2.5 shadow-lg opacity-90 pointer-events-none">
              <p className="text-sm font-medium text-[#A50034]">{getModuleDef(activePaletteType).label}</p>
            </div>
          )}
          {activeCanvasItem && (() => {
            const def = getModuleDef(activeCanvasItem.type);
            const previewW = 220;
            const previewScale = previewW / 1200;
            return (
              <div style={{ width: previewW, height: def.placeholderHeight * previewScale, overflow: 'hidden', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', opacity: 0.85, pointerEvents: 'none' }}>
                <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: 1200 }}>
                  <ModulePlaceholder def={def} />
                </div>
              </div>
            );
          })()}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
```

- [ ] **Step 2: Update BrandShopBuilder.tsx**

In `src/app/components/BrandShopBuilder.tsx`, make these changes:

**a) Add import:**
```tsx
import { StorePageModulesBuilder } from './brandshop/StorePageModulesBuilder';
```

**b) Update BrandShopStep type** — replace the full union with:
```typescript
type BrandShopStep =
  | 'type-select'
  | 'profile-settings'
  | 'store-page-modules';
```

**c) In `SisTypeSelector`, change the Store Page Modules card's `onSelect` call from `'section-select'` to `'store-page-modules'`.**

Find the cards array entry with `key: 'section-select'` and update:
```typescript
{ key: 'store-page-modules' as const, ... }
```
And the `onSelect` prop type accordingly.

**d) Remove old step routing** — delete these lines from `BrandShopBuilder`:
```tsx
if (step === 'section-select')   return <BrandShopTemplateSelector ... />;
if (step === 'brand-trust')      return <BrandTrustEditor ... />;
if (step === 'membership')       return <MembershipEditor ... />;
if (step === 'big-promotion')    return <BigPromotionEditor ... />;
if (step === 'other-promotions') return <OtherPromotionsEditor ... />;
if (step === 'must-have-lg')     return <MustHaveLGEditor ... />;
```

**e) Add new routing** (after the profile-settings line):
```tsx
if (step === 'store-page-modules') return <StorePageModulesBuilder onBack={() => setStep('type-select')} />;
```

**f) Remove now-unused imports** — delete imports for `BrandShopTemplateSelector`, `BigPromotionEditor`, `BrandTrustEditor`, `MembershipEditor`, `OtherPromotionsEditor`, `MustHaveLGEditor`.

- [ ] **Step 3: Run dev server and visual verify**

```bash
npm run dev
```

Check:
- Shop in Shop → Store Page Modules card → 3-panel layout appears
- Dragging palette card onto canvas adds module (gray placeholder block, correct height)
- Dragging canvas item by ⠿ handle reorders it
- Single-use modules (Official store, Follow us, Value props) gray out after one add
- Click module → red border + right panel shows name/size
- Hover module → delete × button appears and removes the item
- DragOverlay shows a small preview while dragging

- [ ] **Step 4: Commit**

```bash
git add src/app/components/brandshop/StorePageModulesBuilder.tsx src/app/components/BrandShopBuilder.tsx
git commit -m "feat(store-page-modules): 3-panel DnD builder + routing"
```

---

### Task 4: Download ZIP

**Files:**
- Modify: `src/app/components/brandshop/StorePageModulesBuilder.tsx`

**Interfaces:**
- Consumes: `toPng` from `html-to-image`; `JSZip` from `jszip`; `saveBlob` from `'../utils/fileSaver'`
- Produces: `LG_Store_Page_Modules.zip` with numbered PNGs

- [ ] **Step 1: Add imports + hiddenRenderRef + handleDownload**

At the top of `StorePageModulesBuilder.tsx`, add:

```tsx
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveBlob } from '../utils/fileSaver';
```

Inside the `StorePageModulesBuilder` component body, add:

```tsx
const hiddenRenderRef = useRef<HTMLDivElement>(null);

const handleDownload = async () => {
  if (canvasItems.length === 0 || !hiddenRenderRef.current) return;
  setDownloading(true);
  try {
    const zip = new JSZip();
    const instanceCounts: Partial<Record<ModuleType, number>> = {};

    for (let i = 0; i < canvasItems.length; i++) {
      const item = canvasItems[i];
      const def = getModuleDef(item.type);
      const index = String(i + 1).padStart(2, '0');

      let fileName: string;
      if (def.maxCount === 1) {
        fileName = `${index}_${def.zipName}.png`;
      } else {
        instanceCounts[item.type] = (instanceCounts[item.type] ?? 0) + 1;
        fileName = `${index}_${def.zipName}_${instanceCounts[item.type]}.png`;
      }

      // Build module element for export
      const container = hiddenRenderRef.current;
      container.innerHTML = '';
      const el = document.createElement('div');
      el.style.cssText = `width:${def.width}px;height:${def.placeholderHeight}px;background:#E5E5E5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-family:sans-serif;`;
      const nameEl = document.createElement('span');
      nameEl.style.cssText = 'font-size:18px;font-weight:600;color:#999;';
      nameEl.textContent = def.label;
      const sizeEl = document.createElement('span');
      sizeEl.style.cssText = 'font-size:13px;color:#bbb;';
      sizeEl.textContent = `${def.width} × ${def.height === 'free' ? 'free' : def.height}`;
      el.appendChild(nameEl);
      el.appendChild(sizeEl);
      container.appendChild(el);

      // Two warmup passes + final export (matches existing export pattern)
      await toPng(el);
      await toPng(el);
      const dataUrl = await toPng(el, { cacheBust: true });
      zip.file(fileName, dataUrl.replace(/^data:image\/png;base64,/, ''), { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveBlob(blob, 'LG_Store_Page_Modules.zip');
  } finally {
    setDownloading(false);
    if (hiddenRenderRef.current) hiddenRenderRef.current.innerHTML = '';
  }
};
```

- [ ] **Step 2: Wire the download button and add hidden render div**

Replace the Download ZIP button's `onClick`:
```tsx
onClick={handleDownload}
```

Add the hidden render div as the last child inside the component's root `<div>` (after the `DndContext`):
```tsx
<div
  ref={hiddenRenderRef}
  aria-hidden
  style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none', zIndex: -1 }}
/>
```

- [ ] **Step 3: Visual verify**

```bash
npm run dev
```

Add modules: e.g. Official store → KV → Banner → Banner.  
Click Download ZIP. Verify:
- File downloads as `LG_Store_Page_Modules.zip`
- Contents: `01_Official_store.png`, `02_KV.png`, `03_Banner_1.png`, `04_Banner_2.png`
- Each PNG renders the gray placeholder at the correct module size
- Button shows disabled state when canvas is empty
- Button text doesn't change (no count badge needed)

- [ ] **Step 4: Commit**

```bash
git add src/app/components/brandshop/StorePageModulesBuilder.tsx
git commit -m "feat(store-page-modules): Download ZIP with numbered filenames"
```
