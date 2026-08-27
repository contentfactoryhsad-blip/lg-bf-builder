/**
 * Store Page Modules draft payload — schema, validation and restore.
 * The saved payload is the builder's `canvasItems` array verbatim (all module
 * edit states are plain JSON-safe objects; images are dataURLs or /public paths).
 */

import type { CanvasItem } from '../components/brandshop/StorePageModulesBuilder';
import {
  createDefaultState,
  makeDefaultBannerSlide,
  BANNER_SLIDE_MAX,
  type ModuleEditState,
  type BannerSlideState,
} from '../components/brandshop/modules/editStates';
import { MODULE_DEFS, type ModuleType } from '../components/brandshop/modules/moduleRegistry';
import type { TFunction } from '../i18n/LanguageContext';
import type { BrandFontId } from '../fonts/brandFonts';

export const STORE_MODULES_SCHEMA_VERSION = 1;

export interface StoreModulesPayloadV1 {
  canvasItems: CanvasItem[];
  /** Optional — missing on drafts saved before the brand-font picker. */
  fontId?: BrandFontId;
}

/** The output font a draft was saved with; older drafts predate the picker. */
export function restoreFontId(payload: StoreModulesPayloadV1): BrandFontId {
  return payload.fontId ?? 'lg';
}

function isKnownModuleType(type: unknown): type is ModuleType {
  return typeof type === 'string' && MODULE_DEFS.some((d) => d.type === type);
}

/**
 * Rebuild canvasItems from a (possibly older) saved payload:
 * - items with unknown module types are skipped (forward compat)
 * - each editState.data is default-merged so optional fields added after the
 *   draft was saved get their current defaults
 */
export function restoreCanvasItems(payload: StoreModulesPayloadV1, t?: TFunction): CanvasItem[] {
  const items = Array.isArray(payload?.canvasItems) ? payload.canvasItems : [];
  const restored: CanvasItem[] = [];
  // Pre-group-model drafts saved one flat CanvasItem per carousel slide (the
  // canvas faked a single carousel row out of N sibling 'banner' items — see
  // git history around BannerGroupState). Merge every old-shape banner item
  // (data has no `slides` array), in order, into ONE new-shape group at the
  // position of the first one encountered — same visual carousel, new model.
  let migratedBannerSlides: BannerSlideState[] | null = null;
  const tFn = t ?? ((s: string) => s) as TFunction;

  for (const item of items) {
    if (!item || !isKnownModuleType(item.type)) continue;

    if (item.type === 'banner') {
      const rawData = (item.editState as ModuleEditState | undefined)?.data as any;
      const isOldFlatShape = rawData && !Array.isArray(rawData.slides);
      if (isOldFlatShape) {
        const isFirst = migratedBannerSlides === null;
        if (isFirst) migratedBannerSlides = [];
        if (migratedBannerSlides!.length < BANNER_SLIDE_MAX) {
          migratedBannerSlides!.push({ ...makeDefaultBannerSlide(tFn), ...rawData });
        }
        if (isFirst) {
          // Push once — migratedBannerSlides is pushed by reference, so later
          // old-shape items appended to it above still land in this group.
          restored.push({
            id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
            type: 'banner',
            editState: { type: 'banner', data: { slides: migratedBannerSlides! } },
          });
        }
        continue;
      }
    }

    const defaults = createDefaultState(item.type, t);
    const savedData = (item.editState as ModuleEditState | undefined)?.data;
    restored.push({
      id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
      type: item.type,
      editState: {
        type: item.type,
        data: { ...(defaults.data as object), ...((savedData ?? {}) as object) },
      } as ModuleEditState,
    });
  }
  return restored;
}
