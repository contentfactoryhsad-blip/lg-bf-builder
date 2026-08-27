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
    if (!item || !isKnownDealModuleType(item.type)) continue;
    const defaults = createDealDefaultState(item.type, t);
    const savedData = (item.editState as DealEditState | undefined)?.data;
    restored.push({
      id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
      type: item.type,
      editState: {
        type: item.type,
        data: { ...(defaults.data as object), ...((savedData ?? {}) as object) },
      } as DealEditState,
    });
  }
  return restored;
}
