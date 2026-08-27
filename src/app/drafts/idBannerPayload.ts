/**
 * ID Banner draft payloads — Default ver. (5 product image slots) and
 * Promotion ver. (single state object). Same contract as the other payload
 * modules: JSON-safe data, default-merge on restore.
 */

import type { CropState } from '../components/ImageCropModal';
import { ID_BANNER_DEFAULT_PRODUCTS } from '../components/idbanner/templates/IdBannerDefaultPC';
import {
  makeIdBannerPromotionDefault,
  type IdBannerPromotionState,
} from '../components/idbanner/templates/IdBannerPromotionPC';

export const ID_BANNER_DEFAULT_SCHEMA_VERSION = 1;
export const ID_BANNER_PROMOTION_SCHEMA_VERSION = 1;

// ── Default ver. ──────────────────────────────────────────────────────────────

export interface IdBannerDefaultPayloadV1 {
  productImages: (string | null)[];
  productImagesOriginal: (string | null)[];
  productImagesCrop: (CropState | null)[];
}

function pad5<T>(arr: T[] | undefined, fill: T): T[] {
  const base = Array.isArray(arr) ? arr.slice(0, 5) : [];
  while (base.length < 5) base.push(fill);
  return base;
}

export function restoreIdBannerDefault(payload: Partial<IdBannerDefaultPayloadV1>): {
  productImages: (string | null)[];
  productImagesOriginal: (string | null)[];
  productImagesCrop: (CropState | null)[];
} {
  return {
    productImages: payload.productImages ? pad5(payload.productImages, null) : [...ID_BANNER_DEFAULT_PRODUCTS],
    productImagesOriginal: pad5(payload.productImagesOriginal, null),
    productImagesCrop: pad5(payload.productImagesCrop, null),
  };
}

// ── Promotion ver. ────────────────────────────────────────────────────────────

export type IdBannerPromotionPayloadV1 = IdBannerPromotionState;

export function restoreIdBannerPromotion(
  payload: Partial<IdBannerPromotionPayloadV1> | undefined,
  t: (k: string) => string,
): IdBannerPromotionState {
  return { ...makeIdBannerPromotionDefault(t), ...payload };
}
