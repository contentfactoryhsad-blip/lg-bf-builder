/**
 * Thumbnail builder draft payloads — single editor (feature-text) and the
 * bulk generator. Same contract as storeModulesPayload: JSON-safe data,
 * default-merge on restore so drafts saved before new fields were added
 * still open cleanly.
 */

import {
  makeInitialThumbnailStates,
  type ThumbnailAllStates,
} from '../components/thumbnail/thumbnailTypes';
import type { BrandFontId } from '../fonts/brandFonts';
import type { Orientation, ThumbnailType } from '../components/thumbnail/thumbnailRegistry';
import type { TFunction } from '../i18n/LanguageContext';

export const THUMBNAIL_SINGLE_SCHEMA_VERSION = 1;
export const THUMBNAIL_BULK_SCHEMA_VERSION = 1;

// ── Shared: ThumbnailAllStates default-merge ─────────────────────────────────

/** Two-level default-merge: per thumbnail type, and per orientation slot for
 *  gwp/bundle (which nest {horizontal, vertical}). */
export function restoreAllStates(saved: Partial<ThumbnailAllStates> | undefined, t?: TFunction): ThumbnailAllStates {
  const base = makeInitialThumbnailStates(t);
  if (!saved) return base;
  const out = { ...base } as ThumbnailAllStates;
  for (const key of Object.keys(base) as (keyof ThumbnailAllStates)[]) {
    const savedVal = saved[key];
    if (savedVal == null) continue;
    if (key === 'gwp' || key === 'bundle') {
      out[key] = {
        horizontal: { ...(base[key] as any).horizontal, ...(savedVal as any).horizontal },
        vertical: { ...(base[key] as any).vertical, ...(savedVal as any).vertical },
      } as any;
    } else {
      out[key] = { ...(base[key] as any), ...(savedVal as any) };
    }
  }
  return out;
}

// ── Single editor (feature-text) ─────────────────────────────────────────────

export interface ThumbnailSinglePayloadV1 {
  slotId: ThumbnailType;
  orientation: Orientation;
  allStates: ThumbnailAllStates;
}

export function restoreThumbnailSingle(payload: ThumbnailSinglePayloadV1, t?: TFunction): {
  slotId: ThumbnailType;
  orientation: Orientation;
  allStates: ThumbnailAllStates;
} {
  return {
    slotId: payload.slotId ?? 'feature-text',
    orientation: payload.orientation === 'vertical' ? 'vertical' : 'horizontal',
    allStates: restoreAllStates(payload.allStates, t),
  };
}

// ── Bulk generator ───────────────────────────────────────────────────────────
// Mirrors ThumbnailBulkGenerator's persistent state. Transient UI state
// (selection, export progress, modal, in-flight scrapes) is NOT saved.

export interface BulkUrlEntryV1 {
  id: string;
  mainUrl: string;
  giftUrl: string;
  product2Url: string;
}

export interface BulkItemV1 {
  id: string;
  mainUrl: string;
  giftUrl?: string;
  product2Url?: string;
  scrapeStatus: 'idle' | 'loading' | 'done' | 'error';
  errorMsg?: string;
  scrapedImages: { url: string; context?: string }[];
  allStates: ThumbnailAllStates;
  orientation: Orientation;
}

export interface ThumbnailBulkPayloadV1 {
  slotId: ThumbnailType;
  phase: 'urls' | 'list' | 'feature' | 'generate';
  urlEntries: BulkUrlEntryV1[];
  items: BulkItemV1[];
  sharedPromo: unknown; // SharedPromoConfig — CropImage + dateRange, JSON-safe
  /** Review-step checkbox state. Optional — missing on drafts saved before
   *  this field existed; restore falls back to "everything checked". */
  selectedItemIds?: string[];
  /** Optional — missing on drafts saved before the brand-font picker. */
  fontId?: BrandFontId;
  excludedSlides?: string[];
  excludedTextCards?: string[];
}

export function restoreThumbnailBulk(payload: ThumbnailBulkPayloadV1, t?: TFunction): ThumbnailBulkPayloadV1 {
  const items = Array.isArray(payload.items) ? payload.items : [];
  // Any non-'urls' phase needs items to land in — an empty draft always
  // opens on 'urls' regardless of what phase it thinks it was saved from.
  const canRestorePhase = items.length > 0
    && (payload.phase === 'list' || payload.phase === 'feature' || payload.phase === 'generate');
  return {
    slotId: payload.slotId ?? 'default',
    phase: canRestorePhase ? payload.phase : 'urls',
    urlEntries: Array.isArray(payload.urlEntries) ? payload.urlEntries : [],
    items: items.map((it) => ({
      ...it,
      // In-flight scrapes can't survive a reload — surface them as retryable.
      scrapeStatus: it.scrapeStatus === 'loading' ? 'idle' : it.scrapeStatus,
      allStates: restoreAllStates(it.allStates, t),
      orientation: it.orientation === 'vertical' ? 'vertical' : 'horizontal',
    })),
    sharedPromo: payload.sharedPromo,
    fontId: payload.fontId ?? 'lg',
    // Old drafts (saved before this field existed) default to every product
    // checked — matches the fresh-scrape flow's initial state.
    selectedItemIds: Array.isArray(payload.selectedItemIds)
      ? payload.selectedItemIds
      : items.map((it) => it.id),
    excludedSlides: Array.isArray(payload.excludedSlides) ? payload.excludedSlides : [],
    excludedTextCards: Array.isArray(payload.excludedTextCards) ? payload.excludedTextCards : [],
  };
}
