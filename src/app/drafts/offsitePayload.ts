/**
 * Off-site Banner draft payload. Same contract as the other payload modules:
 * JSON-safe data, default-merge on restore.
 *
 * The saved shape is the builder's whole state — every KV block plus the output
 * font. Restore rebuilds each block from a fresh default and layers the saved
 * fields on top, so a draft written before a field existed still opens.
 */

import type { BrandFontId } from '../fonts/brandFonts';
import type { TFunction } from '../i18n/LanguageContext';
import { OFFSITE_SIZES } from '../components/offsite/offsiteSizes';
import {
  MAX_ITEMS_PER_BLOCK, MAX_OBJECTS_PER_BLOCK, MAX_PODIUMS_PER_BLOCK, MAX_PRICE_TAGS,
  bgColorsBySize, makeOffSiteBlock, makeOffSiteCampaign,
  type BlockPlacement, type MaybeBox, type OffSiteBlock, type OffSiteCampaign,
  type OffSiteItem, type OffSiteProp, type PricePlacement,
} from '../components/offsite/offsiteTypes';

export const OFF_SITE_SCHEMA_VERSION = 1;

export interface OffSitePayloadV1 {
  blocks: OffSiteBlock[];
  fontId: BrandFontId;
}

/** Trim or pad an array to `n`, filling with `fill`. */
function sized<T>(arr: unknown, n: number, fill: T): T[] {
  const base = Array.isArray(arr) ? (arr.slice(0, n) as T[]) : [];
  while (base.length < n) base.push(fill);
  return base;
}

function restorePlacement(saved: Partial<BlockPlacement> | undefined): BlockPlacement {
  return {
    products: sized<MaybeBox>(saved?.products, MAX_ITEMS_PER_BLOCK, null),
    podiums: sized<MaybeBox>(saved?.podiums, MAX_PODIUMS_PER_BLOCK, null),
    objects: sized<MaybeBox>(saved?.objects, MAX_OBJECTS_PER_BLOCK, null),
    order: Array.isArray(saved?.order) ? saved!.order : undefined,
    locked: Array.isArray(saved?.locked) ? saved!.locked : undefined,
  };
}

function restoreCampaign(saved: Partial<OffSiteCampaign> | undefined, t: TFunction): OffSiteCampaign {
  const base = makeOffSiteCampaign(t);
  const prices: Record<string, (PricePlacement | null)[]> = {};
  for (const s of OFFSITE_SIZES) {
    prices[s.id] = sized<PricePlacement | null>(saved?.pricePlacements?.[s.id], MAX_PRICE_TAGS, null);
  }
  return {
    ...base,
    ...saved,
    // Every size needs its own entry: one left out falls back to the shared
    // color and would follow another size's picker. A draft from before the
    // field existed fills from the single color it did save.
    backgroundColorBySize: {
      ...bgColorsBySize(saved?.backgroundColor ?? base.backgroundColor),
      ...saved?.backgroundColorBySize,
    },
    // The disclaimer split off `copyColor`, so a draft that only saved that one
    // keeps rendering exactly as it did before the split. The discount row did
    // not exist back then, so it takes today's default instead.
    discountColor: saved?.discountColor ?? base.discountColor,
    priceColor: saved?.priceColor ?? base.priceColor,
    disclaimerColor: saved?.disclaimerColor ?? saved?.copyColor ?? base.copyColor,
    // Nested, so a spread would replace it wholesale — merge each figure so a
    // draft from before a field existed still gets that field's default.
    discount: {
      ...base.discount!,
      ...saved?.discount,
      left: { ...base.discount!.left, ...saved?.discount?.left },
      right: { ...base.discount!.right, ...saved?.discount?.right },
    },
    priceTags: sized(saved?.priceTags, MAX_PRICE_TAGS, base.priceTags[0]).map((tag, i) => ({
      ...base.priceTags[i],
      ...tag,
    })),
    pricePlacements: prices,
  };
}

function restoreBlock(saved: Partial<OffSiteBlock> | undefined, t: TFunction): OffSiteBlock {
  const base = makeOffSiteBlock(t);
  const placements: Record<string, BlockPlacement> = {};
  for (const s of OFFSITE_SIZES) placements[s.id] = restorePlacement(saved?.placements?.[s.id]);
  return {
    ...base,
    ...saved,
    id: saved?.id ?? base.id,
    campaign: restoreCampaign(saved?.campaign, t),
    items: sized<Partial<OffSiteItem>>(saved?.items, MAX_ITEMS_PER_BLOCK, {}).map((item, i) => ({
      ...base.items[i],
      ...item,
    })),
    // Props are lists, not fixed slots: keep only what was saved, capped.
    podiums: (Array.isArray(saved?.podiums) ? saved!.podiums : [])
      .slice(0, MAX_PODIUMS_PER_BLOCK)
      .map((p: Partial<OffSiteProp>, i) => ({
        id: p.id ?? `podium-${i}`, src: p.src ?? '', aspect: p.aspect ?? 1, flipX: p.flipX ?? false,
      }))
      .filter((p) => p.src !== ''),
    objects: (Array.isArray(saved?.objects) ? saved!.objects : [])
      .slice(0, MAX_OBJECTS_PER_BLOCK)
      .map((p: Partial<OffSiteProp>, i) => ({
        id: p.id ?? `object-${i}`, src: p.src ?? '', aspect: p.aspect ?? 1, flipX: p.flipX ?? false,
      }))
      .filter((p) => p.src !== ''),
    placements,
  };
}

export function restoreOffSite(
  payload: Partial<OffSitePayloadV1> | undefined,
  t: TFunction,
): { blocks: OffSiteBlock[]; fontId: BrandFontId } {
  const saved = Array.isArray(payload?.blocks) ? payload!.blocks : [];
  return {
    blocks: saved.length > 0 ? saved.map((b) => restoreBlock(b, t)) : [makeOffSiteBlock(t)],
    fontId: payload?.fontId ?? 'lg',
  };
}
