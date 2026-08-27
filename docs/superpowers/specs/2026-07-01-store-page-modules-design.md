# Store Page Modules Builder — Design Spec

**Date:** 2026-07-01  
**Context:** Shop in Shop Page Builder > Store Page Modules flow

---

## Overview

A drag-and-drop page builder for assembling Lazada/Shopee Shop in Shop store pages. Users drag module types from a left palette onto a center canvas, reorder them, edit each module's content via a right panel, then download all modules as a numbered ZIP.

---

## Modules

All modules are 1200px wide. Heights:

| Module | Dimensions | Multi-use |
|---|---|---|
| Official store | 1200×180 | No (max 1) |
| Follow us | 1200×120 | No (max 1) |
| Text | 1200×160 | Yes |
| KV | 1200×1200 | Yes |
| KV+Product list | 1200×free | Yes |
| Category list | 1200×free | Yes |
| Product cards | 1200×free | Yes |
| Banner | 1200×628 | Yes |
| Vouchers | 1200×free | Yes |
| Value props | 1200×346 | No (max 1) |

---

## Layout

3-panel layout with fixed header:

```
┌─────────────────────────────────────────────────────────┐
│ ← Back   Store Page Modules          [Download ZIP]     │
├───────────┬─────────────────────────┬───────────────────┤
│  Palette  │       Canvas            │   Edit Panel      │
│  (240px)  │    (flex-1, scroll)     │    (320px)        │
└───────────┴─────────────────────────┴───────────────────┘
```

- **Header:** Back button + title (left) | Download ZIP pill button (right, red border style matching existing builders)
- **Body:** 3-column flex row, each column independently scrollable, fills remaining viewport height

---

## Module Palette (Left, 240px)

- Scrollable vertical list of 10 module type cards
- Each card shows: module name + dimension badge (e.g. `1200×180`)
- Single-use modules (Official store, Follow us, Value props) already present on canvas → card grayed out + drag disabled
- Drag a card → drop onto canvas → inserts at drop position (with drop indicator line between modules)

---

## Canvas (Center, flex-1)

- Renders at actual 1200px width, scaled down via CSS `transform: scale(factor)` where `factor = containerWidth / 1200`
- Modules stack vertically
- Each module block (placeholder for now — gray block showing name + dimensions):
  - Hover → drag handle (⠿) at top + delete button (×) at top-right
  - Click → selected state: red border + activates Edit Panel
  - Drag handle → reorder within canvas via @dnd-kit/sortable
- Drop indicator line appears between modules during palette drag
- Empty state: "Drag a module from the left to get started" centered message

### @dnd-kit setup
- `DndContext` wrapping the full 3-panel body
- `SortableContext` for canvas items (vertical list strategy)
- Custom `DragOverlay` for palette drag preview

---

## Edit Panel (Right, 320px)

- **Nothing selected:** "Click a module on the canvas to edit" — centered gray text
- **Module selected:** shows module name + dimensions header; content is a placeholder ("Edit options coming soon") for now
- Module-specific edit forms filled in incrementally by user

---

## State Shape

```typescript
type ModuleType =
  | 'official-store' | 'follow-us' | 'text' | 'kv'
  | 'kv-product-list' | 'category-list' | 'product-cards'
  | 'banner' | 'vouchers' | 'value-props';

interface CanvasItem {
  id: string;          // nanoid — unique per instance
  type: ModuleType;
  editState: object;   // placeholder; filled per module later
}
```

Instance index for naming is computed at download time by counting preceding items of the same type.

---

## Download ZIP

1. For each canvas item in order, render the module at actual 1200px (off-screen hidden div) and call `html-to-image` `toPng`
2. File naming:
   - Single-use modules: `01_Official_store.png`
   - Multi-use modules: `03_Banner_1.png`, `04_Banner_2.png` (1-based instance counter per type)
   - Index is zero-padded to 2 digits
3. Bundle with JSZip → `saveBlob` as `LG_Store_Page_Modules.zip`

---

## File Structure

```
src/app/components/brandshop/
  StorePageModulesBuilder.tsx   ← new main component
  modules/
    moduleRegistry.ts           ← MODULE_DEFS array (type, label, dimensions, maxCount)
    ModulePlaceholder.tsx       ← shared placeholder render (gray block + name + size)
```

`BrandShopBuilder.tsx` changes:
- Remove old `section-select` step and `BrandShopTemplateSelector` routing for store page
- Add `'store-page-modules'` step → renders `<StorePageModulesBuilder>`
- `SisTypeSelector` "Store Page Modules" card → navigates to `'store-page-modules'`

---

## Free-height Placeholder Heights

For modules with variable (`free`) height, the placeholder block renders at a fixed provisional height until real content is implemented:

| Module | Placeholder height |
|---|---|
| KV+Product list | 600px |
| Category list | 500px |
| Product cards | 500px |
| Vouchers | 400px |

---

## Migration from Old Section Editors

The existing section editors (BigPromotionEditor, BrandTrustEditor, MembershipEditor, OtherPromotionsEditor, MustHaveLGEditor) and the `section-select` routing step in `BrandShopBuilder.tsx` are retired as part of this change. Their template files under `brandshop/templates/` can remain for now but are no longer reachable from the UI.

---

## Out of Scope (this phase)

- MO preview / MO export
- Actual module edit forms (placeholder only)
- Undo/redo
