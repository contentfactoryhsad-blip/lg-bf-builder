import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { getProxiedImageUrl, ScrapedImage } from '../../services/imageScraperApi';
import { lgImageKind } from '../../utils/lgImageFilter';
import { useT } from '../../i18n/LanguageContext';

/** Max FEATURE cards per product — the 01 product card takes one of the
 *  marketplace's slots itself, so 8 feature cards = 9 cards total. */
export const GALLERY_MAX_SELECT = 8;

/** Strip tile edge — SQUARE, mirroring the 1200×1200 slide export. */
export const STRIP_TILE = 300;

// A picture we never want in the strip regardless of kind: mobile / zoom
// duplicates and small thumbnail renditions of a scene we already show larger.
function isStripNoise(url: string): boolean {
  return /zoom/i.test(url)                              // /zoom/, mobilezoom
    || /[-_]m(\.[a-z]+)?($|\?)/i.test(url)              // trailing -m mobile variant
    || /[-_]mobile/i.test(url)
    || /(^|[/_-])(180x180|165x165|350x350|100x100|thum[-b])/i.test(url); // small / thumbnails
}

// Collapse rendition + desktop/mobile variants of the SAME picture to one logical
// key, so e.g. 2010x1344_…_FeatureCard_1 / 1044x1344_…_FeatureCard_1 / 180x180_…
// don't appear as three separate tiles.
function stripLogicalKey(url: string): string {
  let n = (url.split('/').pop() || url).toLowerCase().replace(/\.[a-z]+$/, '');
  n = n.replace(/^\d{2,4}x\d{2,4}[_-]/, ''); // leading dimension prefix (2010x1344_)
  n = n.replace(/[-_](\d{3,4})$/, '');       // trailing size token (-2010)
  n = n.replace(/[-_][dm]$/, '');            // trailing -d / -m
  return n;
}

function urlDimArea(url: string): number {
  const m = (url.split('/').pop() || '').match(/(\d{3,4})x(\d{3,4})/);
  return m ? Number(m[1]) * Number(m[2]) : 0;
}

/**
 * The product's GALLERY CAROUSEL imagery, for the Gallery Feature flow — the
 * user then hand-picks up to GALLERY_MAX_SELECT per product.
 *
 * Primary source: images the crawler tagged `fromGallery` (extracted from the
 * page's own c-gallery carousel), used verbatim in carousel order — exactly
 * what the on-page slider shows, nothing else. No noise filtering there: some
 * carousels name their slides `…DZoom-01.jpg`, which the generic zoom filter
 * would wrongly kill.
 *
 * Fallback (page without a recognisable carousel): the old inclusive heuristic —
 * all non-banner scene imagery minus mobile/zoom dupes and tiny renditions,
 * rendition variants collapsed to their largest.
 */
export function galleryStripImages(scraped: ScrapedImage[]): ScrapedImage[] {
  const tagged = scraped.filter((img) => img.fromGallery);
  if (tagged.length > 0) {
    const best = new Map<string, ScrapedImage>(); // logicalKey → largest rendition
    for (const img of tagged) {
      const key = stripLogicalKey(img.url);
      const prev = best.get(key);
      if (!prev || urlDimArea(img.url) > urlDimArea(prev.url)) best.set(key, img);
    }
    return [...best.values()];
  }

  const best = new Map<string, ScrapedImage>();
  for (const img of scraped) {
    if (lgImageKind(img.url) === 'banner') continue;
    if (isStripNoise(img.url)) continue;
    const key = stripLogicalKey(img.url);
    const prev = best.get(key);
    if (!prev || urlDimArea(img.url) > urlDimArea(prev.url)) best.set(key, img);
  }
  const out = [...best.values()];
  if (out.length > 0) return out;
  return scraped.filter((img) => lgImageKind(img.url) !== 'banner');
}

/**
 * Phase-2 card body for the Gallery Feature bulk flow: one horizontal,
 * scrollable strip of the product's gallery images with a checkbox per slide.
 */
export function GalleryStripCard({
  images,
  selected,
  onToggle,
  orderBase,
  extraCount = 0,
  leading,
  trailing,
}: {
  images: ScrapedImage[];
  selected: string[];
  onToggle: (url: string) => void;
  /** When set, a selected tile shows its export number (position in
   *  `selected` + orderBase) instead of a plain checkmark — e.g. orderBase 2
   *  when the product card itself takes 01. */
  orderBase?: number;
  /** Feature cards that live OUTSIDE `selected` (the text card) but still
   *  count toward the GALLERY_MAX_SELECT cap. */
  extraCount?: number;
  /** Pinned tile(s) at the strip's LEFT edge — stays put while the gallery
   *  scrolls (the confirmed 01 product card). Gets a tinted panel + divider. */
  leading?: React.ReactNode;
  /** Extra tiles rendered at the far right of the strip (upload / text-card
   *  buttons, uploaded-image tiles). */
  trailing?: React.ReactNode;
}) {
  const t = useT();
  const full = selected.length + extraCount >= GALLERY_MAX_SELECT;
  return (
    <div className="flex">
      {/* Fixed product-card zone — OUTSIDE the scroll container, so it stays
          put without sticky tricks. Full-height fill in the same gray as the
          card header, separated from the gallery by a right divider. */}
      {leading && (
        <div className="shrink-0 flex items-center bg-gray-50 border-r border-gray-200 px-4 py-4">
          {leading}
        </div>
      )}
      <div className="flex-1 min-w-0 px-5 py-4">
      {images.length === 0 && !trailing ? (
        <div className="flex items-center gap-2 text-gray-400 text-xs py-6 justify-center">
          <AlertCircle size={14} />
          {t('No gallery images found.')}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((img) => {
            const isSel = selected.includes(img.url);
            const blocked = !isSel && full;
            const orderNo = isSel && orderBase !== undefined
              ? String(selected.indexOf(img.url) + orderBase).padStart(2, '0')
              : null;
            return (
              <button
                key={img.url}
                type="button"
                onClick={() => { if (!blocked) onToggle(img.url); }}
                className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all bg-white ${
                  isSel ? 'border-[#FD312E] shadow-md' : 'border-gray-200 hover:border-gray-400'
                } ${blocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{ width: STRIP_TILE, height: STRIP_TILE }}
              >
                {/* Mirror the 1200×1200 export framing: the slide height-fills
                    the square, centred — sides crop for landscape, white
                    letterbox for portrait — so the tile IS the final card,
                    not a shrunken contain-fit of the raw image. max-w-none:
                    Tailwind's img preflight would otherwise cap the width.
                    Full height-fill (100%) matches the same full-bleed
                    baseline the confirmed-card preview (GallerySlideTemplate)
                    and the Review grid use — this tile used to default to
                    80%, which read as extra margin here that the later
                    screens didn't have. Landscape sources overflow the tile
                    width at that fill, though — same problem as the Crop
                    modal and GallerySlideTemplate's pass-through preview, so
                    this picker mirrors their fix (0.65 default, same as
                    Crop's own default) once the image loads and its real
                    aspect is known. Portrait/square already fits at 100%
                    height — untouched. */}
                <span className="w-full h-full bg-white overflow-hidden flex items-center justify-center">
                  <img
                    src={getProxiedImageUrl(img.url)}
                    alt=""
                    loading="lazy"
                    className="w-auto max-w-none shrink-0"
                    style={{ height: '100%' }}
                    onLoad={(e) => {
                      const el = e.currentTarget;
                      const w = el.naturalWidth, h = el.naturalHeight;
                      if (!w || !h || w <= h) return;
                      const naturalDisplayW = (w / h) * STRIP_TILE;
                      const fitScale = Math.min(0.65, STRIP_TILE / naturalDisplayW);
                      el.style.height = `${100 * fitScale}%`;
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                </span>
                {/* Checkbox / order number — same pattern as the review grid */}
                <span className={`absolute top-2 left-2 ${orderNo ? 'min-w-5 h-5 px-1' : 'w-5 h-5'} rounded border-2 flex items-center justify-center transition-colors ${
                  isSel ? 'bg-[#FD312E] border-[#FD312E]' : 'bg-white/80 border-gray-400'
                }`}>
                  {orderNo ? (
                    <span className="text-[10px] font-bold text-white leading-none tabular-nums">{orderNo}</span>
                  ) : isSel && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
          {trailing}
        </div>
      )}
      </div>
    </div>
  );
}

/** Loading placeholder for a strip while its product is still being scraped. */
export function GalleryStripSkeleton() {
  return (
    <div className="px-5 py-4 flex gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="shrink-0 rounded-lg bg-gray-100 animate-pulse flex items-center justify-center" style={{ width: STRIP_TILE, height: STRIP_TILE }}>
          {i === 2 && <Loader2 size={18} className="animate-spin text-gray-300" />}
        </div>
      ))}
    </div>
  );
}
