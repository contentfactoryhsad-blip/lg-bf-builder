/**
 * Draft kind registry — one entry per builder that supports local drafts.
 * Adding a builder later (Thumbnail, ID Banner, …) means: add a BuilderKey,
 * a DraftKindDef here, a payload module next to storeModulesPayload.ts, and
 * one resume `case` in App.tsx. Nothing else.
 */

import { STORE_MODULES_SCHEMA_VERSION } from './storeModulesPayload';
import { DEAL_PAGE_SCHEMA_VERSION } from './dealPagePayload';
import { THUMBNAIL_SINGLE_SCHEMA_VERSION, THUMBNAIL_BULK_SCHEMA_VERSION } from './thumbnailPayload';
import { ID_BANNER_DEFAULT_SCHEMA_VERSION, ID_BANNER_PROMOTION_SCHEMA_VERSION } from './idBannerPayload';
import { OFF_SITE_SCHEMA_VERSION } from './offsitePayload';

export type BuilderKey =
  | 'sis-store-modules'
  | 'deal-page'
  | 'thumbnail-single'
  | 'thumbnail-bulk'
  | 'id-banner-default'
  | 'id-banner-promotion'
  | 'off-site';

export interface DraftKindDef {
  key: BuilderKey;
  /** English label; render through t(). */
  title: string;
  /** Static icon for the home Recent Work list (v1 has no live thumbnails). */
  previewImg: string;
  /** Current payload schema version for this builder. */
  schemaVersion: number;
  /**
   * Migrate a payload saved at version `from` to the current schema.
   * Return null when unsupported (e.g. saved by a NEWER app version).
   */
  migrate: (payload: unknown, from: number) => unknown | null;
}

export const DRAFT_KINDS: Record<BuilderKey, DraftKindDef> = {
  'sis-store-modules': {
    key: 'sis-store-modules',
    title: 'Shop in Shop page Module',
    previewImg: '/shop-in-shop/sct-preview.png',
    schemaVersion: STORE_MODULES_SCHEMA_VERSION,
    migrate: (payload, from) => {
      if (from === STORE_MODULES_SCHEMA_VERSION) return payload;
      // v1 is the first schema — anything else came from a newer app.
      return null;
    },
  },
  'deal-page': {
    key: 'deal-page',
    title: 'Deal Page',
    previewImg: '/deal-page/preview.png',
    schemaVersion: DEAL_PAGE_SCHEMA_VERSION,
    migrate: (payload, from) => (from === DEAL_PAGE_SCHEMA_VERSION ? payload : null),
  },
  'thumbnail-single': {
    key: 'thumbnail-single',
    title: 'Thumbnail Builder',
    // No live capture yet (see project_local_drafts memory) — fall back to the
    // slot's static template render rather than a blank icon.
    previewImg: '/thumbnail/feature-text.png',
    schemaVersion: THUMBNAIL_SINGLE_SCHEMA_VERSION,
    migrate: (payload, from) => (from === THUMBNAIL_SINGLE_SCHEMA_VERSION ? payload : null),
  },
  'thumbnail-bulk': {
    key: 'thumbnail-bulk',
    title: 'Thumbnail Builder',
    previewImg: '/thumbnail/default.png',
    schemaVersion: THUMBNAIL_BULK_SCHEMA_VERSION,
    migrate: (payload, from) => (from === THUMBNAIL_BULK_SCHEMA_VERSION ? payload : null),
  },
  'id-banner-default': {
    key: 'id-banner-default',
    title: 'ID Banner Builder',
    previewImg: '/id-banner/preview.png',
    schemaVersion: ID_BANNER_DEFAULT_SCHEMA_VERSION,
    migrate: (payload, from) => (from === ID_BANNER_DEFAULT_SCHEMA_VERSION ? payload : null),
  },
  'id-banner-promotion': {
    key: 'id-banner-promotion',
    title: 'ID Banner Builder',
    previewImg: '/id-banner/preview.png',
    schemaVersion: ID_BANNER_PROMOTION_SCHEMA_VERSION,
    migrate: (payload, from) => (from === ID_BANNER_PROMOTION_SCHEMA_VERSION ? payload : null),
  },
  'off-site': {
    key: 'off-site',
    title: 'Off-site Banner Builder',
    previewImg: '/off-site/preview.png',
    schemaVersion: OFF_SITE_SCHEMA_VERSION,
    migrate: (payload, from) => (from === OFF_SITE_SCHEMA_VERSION ? payload : null),
  },
};

export function getDraftKind(builder: string): DraftKindDef | undefined {
  return (DRAFT_KINDS as Record<string, DraftKindDef>)[builder];
}
