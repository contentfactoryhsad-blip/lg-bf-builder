/**
 * Deal Page draft payload — schema, validation and restore.
 * Same shape as storeModulesPayload.ts: the saved payload is the builder's
 * `canvasItems` array verbatim (every edit state is plain JSON; images are
 * dataURLs or /public paths).
 */

import type { DealCanvasItem } from '../components/dealpage/DealPageBuilder';
import { createDealDefaultState, type DealEditState } from '../components/dealpage/dealEditStates';
import { DEAL_MODULE_DEFS, type DealModuleType } from '../components/dealpage/dealModuleRegistry';
import type { TFunction } from '../i18n/LanguageContext';

export const DEAL_PAGE_SCHEMA_VERSION = 1;

export interface DealPagePayloadV1 {
  canvasItems: DealCanvasItem[];
  /** Which canvas the draft was authored on (missing in old drafts → 'pc'). */
  device?: 'pc' | 'mo';
}

function isKnownDealModuleType(type: unknown): type is DealModuleType {
  return typeof type === 'string' && DEAL_MODULE_DEFS.some(d => d.type === type);
}

/**
 * Rebuild canvasItems from a (possibly older) saved payload:
 * - items with unknown module types are skipped (forward compat)
 * - each editState.data is default-merged so fields added after the draft was
 *   saved get their current defaults instead of coming back undefined
 */
export function restoreDealCanvasItems(payload: DealPagePayloadV1, t?: TFunction): DealCanvasItem[] {
  const items = Array.isArray(payload?.canvasItems) ? payload.canvasItems : [];
  const restored: DealCanvasItem[] = [];

  for (const item of items) {
    if (!item) continue;
    let savedData = (item.editState as DealEditState | undefined)?.data as Record<string, unknown> | undefined;
    let rawType = item.type as string;

    // The standalone Time Sale module folded into the deal banner — a
    // 'deal-time-sale' draft becomes a deal banner with the countdown on
    // (its fields carry the same names, so they merge straight over).
    if (rawType === 'deal-time-sale') {
      rawType = 'deal-banner';
      savedData = { ...(savedData ?? {}), showCountdown: true, showLinks: false, showCta: false };
    }

    if (!isKnownDealModuleType(rawType)) continue;

    // The banner heights became module types (promotion 400 / deal 350) — a
    // draft saved when 'deal-promo-banner' still had a size picker maps its
    // Standard instances onto the deal-banner type so they keep their height.
    let type = rawType;
    if (type === 'deal-promo-banner' && savedData?.size === 'Standard') {
      type = 'deal-banner';
    }

    // Banners saved before the key-visual pickers carry an uploaded `image`
    // and no `kvAsset` — pin kvAsset to null so the default-merge below can't
    // swap their art for the new default variant.
    if ((type === 'deal-promo-banner' || type === 'deal-banner') && savedData && !('kvAsset' in savedData)) {
      savedData = { ...savedData, kvAsset: null };
    }

    // The "Art left" layout option was retired — banners run right-art only,
    // so a draft that had flipped one comes back the standard way (there is no
    // control left to unflip it with).
    if ((type === 'deal-promo-banner' || type === 'deal-banner') && savedData?.layout === 'Art left') {
      savedData = { ...savedData, layout: 'Art right' };
    }

    const defaults = createDealDefaultState(type, t);
    restored.push({
      id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
      type,
      editState: {
        type,
        data: { ...(defaults.data as object), ...((savedData ?? {}) as object) },
      } as DealEditState,
    });
  }
  return restored;
}
