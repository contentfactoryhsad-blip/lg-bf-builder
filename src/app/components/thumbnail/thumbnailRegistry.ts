import React from 'react';
import { ThumbnailTemplate } from './ThumbnailTemplate';

/**
 * Single source of truth for the Thumbnail Builder's slots.
 *
 * The selector, editor, and (later) bulk generator all derive from this list —
 * add/rename a slot here and the whole builder follows. Each slot currently
 * renders `ThumbnailPlaceholderTemplate`; swap a slot's `Template` for its real
 * component once that layout is specified.
 */

export type ThumbnailCategory = 'product-card' | 'feature-card';

export type ThumbnailType =
  | 'default'
  | 'gwp'
  | 'bundle'
  | 'usp'
  | 'promotion'
  | 'feature-image'
  | 'feature-gallery'
  | 'feature-text';

export type Orientation = 'horizontal' | 'vertical';

export interface ThumbnailTemplateProps {
  slot: ThumbnailSlot;
  orientation: Orientation;
}

export interface ThumbnailSlot {
  id: ThumbnailType;
  category: ThumbnailCategory;
  /** English label, used directly as an i18n key (t() falls back to the key). */
  nameKey: string;
  descKey: string;
  /** GWP / Bundle expose a horizontal↔vertical toggle in the Edit panel. */
  hasOrientation: boolean;
  size: { w: number; h: number };
  /** Exported Figma PNGs under public/thumbnail/. Horizontal shown first. */
  images: Partial<Record<Orientation, string>>;
  Template: React.FC<ThumbnailTemplateProps>;
}

const SQUARE = { w: 1200, h: 1200 };
const IMG = (name: string) => `/thumbnail/${name}.png`;

export const THUMBNAIL_SLOTS: ThumbnailSlot[] = [
  // ── Product Card ─────────────────────────────────────────────
  {
    id: 'default',
    category: 'product-card',
    nameKey: 'Default',
    descKey: 'Standard product thumbnail',
    hasOrientation: false,
    size: SQUARE,
    images: { horizontal: IMG('default') },
    Template: ThumbnailTemplate,
  },
  {
    id: 'gwp',
    category: 'product-card',
    nameKey: 'GWP',
    descKey: 'Gift with purchase — horizontal / vertical',
    hasOrientation: true,
    size: SQUARE,
    images: { horizontal: IMG('gwp-h'), vertical: IMG('gwp-v') },
    Template: ThumbnailTemplate,
  },
  {
    id: 'bundle',
    category: 'product-card',
    nameKey: 'Bundle',
    descKey: 'Bundle offer — horizontal / vertical',
    hasOrientation: true,
    size: SQUARE,
    images: { horizontal: IMG('bundle-h'), vertical: IMG('bundle-v') },
    Template: ThumbnailTemplate,
  },
  {
    id: 'usp',
    category: 'product-card',
    nameKey: 'USP',
    descKey: 'Benefits & User selling points',
    hasOrientation: false,
    size: SQUARE,
    images: { horizontal: IMG('usp') },
    Template: ThumbnailTemplate,
  },
  {
    id: 'promotion',
    category: 'product-card',
    nameKey: 'Promotion',
    descKey: 'Promotional product thumbnail',
    hasOrientation: false,
    size: SQUARE,
    images: { horizontal: IMG('promotion') },
    Template: ThumbnailTemplate,
  },
  // ── Feature Card ─────────────────────────────────────────────
  {
    id: 'feature-image',
    category: 'feature-card',
    nameKey: 'Image',
    descKey: 'Lifestyle feature card',
    hasOrientation: false,
    size: SQUARE,
    images: { horizontal: IMG('feature-image') },
    Template: ThumbnailTemplate,
  },
  {
    id: 'feature-gallery',
    category: 'feature-card',
    nameKey: 'Gallery Feature',
    descKey: 'Gallery feature card',
    hasOrientation: false,
    size: SQUARE,
    images: { horizontal: IMG('feature-gallery') },
    Template: ThumbnailTemplate,
  },
  {
    id: 'feature-text',
    category: 'feature-card',
    nameKey: 'Text',
    descKey: 'Announcement text only feature card',
    hasOrientation: false,
    size: SQUARE,
    images: { horizontal: IMG('feature-text') },
    Template: ThumbnailTemplate,
  },
];

export const CATEGORY_ORDER: ThumbnailCategory[] = ['product-card', 'feature-card'];

export const CATEGORY_LABELS: Record<ThumbnailCategory, string> = {
  'product-card': 'Product Card',
  'feature-card': 'Feature Card',
};

export function getSlot(id: ThumbnailType): ThumbnailSlot {
  const slot = THUMBNAIL_SLOTS.find((s) => s.id === id);
  if (!slot) throw new Error(`Unknown thumbnail slot: ${id}`);
  return slot;
}

export function slotsByCategory(category: ThumbnailCategory): ThumbnailSlot[] {
  return THUMBNAIL_SLOTS.filter((s) => s.category === category);
}
