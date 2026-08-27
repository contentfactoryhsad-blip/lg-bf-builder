// Structural classifier for LG PDP images, shared by the fetch gallery picker
// (ImageGalleryModal) and the bulk auto-pick (ThumbnailBulkGenerator) so the two stay
// consistent — the auto-loaded image is always one the gallery would also show.
//
// Colour alone can't tell a product cutout (누끼) from a feature scene (both sit on
// white), and LG's URL patterns vary across product families (TVs vs laundry vs
// accessories), so we combine a robust path signal with the white-bg colour heuristic.

export type LgImageKind = 'banner' | 'feature-page' | 'product' | 'gallery' | null;

/** A small square "hero" rendition LG serves per-product OUTSIDE the numbered gallery
 *  carousel (e.g. ".../fs15gpbk0_ahk_easl_sg_c/FS15GPBK0-Aerotower-...-450.jpg", or nested
 *  under a "01-basic" gallery subfolder — ".../gallery/01-basic/...-basic-large.jpg"). Always
 *  a plain product cutout in practice, and worth trusting explicitly: some product lines'
 *  numbered `/gallery/` carousel is ALL lifestyle/feature scenes with no cutout at all (e.g.
 *  Puricare AeroTower), so this is often the only real 누끼 source going. The bare 3-digit
 *  size suffix (200-999) is deliberately narrow — LG's higher-res renditions use 4-digit
 *  widths (e.g. "-2010.jpg") or "WxH" suffixes, neither of which this matches. */
const HERO_RE = /-[2-9]\d{2}\.(jpg|jpeg|png|webp)(\?|$)/i;

/**
 *   - '/promotion' | '/01-assets/general/'  → award/lineup banners & footer badges (never wanted)
 *   - '/feature/' | '/features/'            → detail-page feature scenes/diagrams
 *   - '-product-' | 'gallery-basic'         → an explicitly-named product cutout (2026 TV naming)
 *   - 'basic-large' | '/01-basic/' | HERO_RE → a per-product hero cutout outside the gallery
 *   - '/gallery/' | '-gallery-'             → the product gallery carousel (holds the 누끼 shots).
 *     Most families put these under a `/gallery/` folder, but some (e.g. UK monitors —
 *     ".../monitor/45gx950a-b/ultragear-gaming-45gx950a-2025-gallery-gallery-01-2010.jpg")
 *     have no such folder and only the filename carries "-gallery-".
 *   - null                                  → unknown host/page (non-LG)
 * Path notes: `/promotion` matches `/promotion/` and `/promotions/` but NOT a legit
 * `.../2025-promotions/...` product path (no leading slash before "promotion" there);
 * `/features?/` matches both the `/feature/` and `/features/` spellings LG uses.
 */
export function lgImageKind(url: string): LgImageKind {
  const u = url.toLowerCase();
  if (u.includes('/promotion') || u.includes('/01-assets/general/')) return 'banner';
  if (/\/features?\//.test(u)) return 'feature-page';
  if (u.includes('-product-') || u.includes('gallery-basic')) return 'product';
  if (u.includes('basic-large') || u.includes('/01-basic/') || HERO_RE.test(u)) return 'product';
  if (u.includes('/gallery/') || u.includes('-gallery-')) return 'gallery';
  return null;
}

/* ─────────────────────────────────────────── */
/* Renditions                                  */
/* ─────────────────────────────────────────── */

/**
 * LG serves the same photograph at several widths and puts the width in the
 * filename: `02_WT1410NHWW-350.jpg` and `02_WT1410NHWW-2010.jpg` are one shot,
 * not two. A crawl lists every rendition, so whichever one is picked is a
 * coin toss unless something reads the suffix.
 *
 * The suffix must look like a PIXEL WIDTH, not a shot number, because plenty of
 * galleries number their shots in the same position — `OLED83C6PSA-2010-01.jpg`
 * through `-14.jpg` are fourteen DIFFERENT photographs that all happen to be
 * 2010px wide. Two rules separate them: a width is at least three digits (shot
 * numbers are zero-padded to two), and it never carries a leading zero. Get
 * this wrong and every shot on such a page collapses onto one key, so picking
 * any of them hands back whichever has the highest number.
 */
const RENDITION_RE = /-([1-9]\d{2,4})(?:x\d{2,5})?\.(?:jpg|jpeg|png|webp)(?:\?|$)/i;

/** Pixel width from the filename suffix, or 0 when there is none. */
export function renditionWidth(url: string): number {
  const m = RENDITION_RE.exec(url);
  return m ? Number(m[1]) : 0;
}

/** The shot a URL is a rendition OF: its path with the size suffix and any
 *  query dropped, so every size of one photograph shares a key. */
export function shotKey(url: string): string {
  return url.split('?')[0].replace(RENDITION_RE, '.');
}

/**
 * Same photograph, at the largest width the page offered.
 *
 * Worth doing before ANY pixel work. Background removal separates a product
 * from its backdrop along a one-pixel outline, so at 350px that outline is
 * mostly JPEG noise and the cut comes out ragged; at 2010px it is a clean
 * edge. The ragged result then gets scaled UP into a 1200px banner, which is
 * where it becomes impossible to miss.
 */
export function largestRendition(url: string, all: string[]): string {
  const key = shotKey(url);
  let best = url;
  let bestW = renditionWidth(url);
  for (const other of all) {
    if (shotKey(other) !== key) continue;
    const w = renditionWidth(other);
    if (w > bestW) { best = other; bestW = w; }
  }
  return best;
}

/**
 * Verdict for the active picker. Only the unambiguous path signals decide; the numbered
 * `/gallery/` carousel always defers to the white-bg colour heuristic, because LG mixes
 * genuine 누끼 shots and lifestyle scenes inside it with no distinguishing filename (e.g.
 * S80TY's DZ-01..DZ-12 holds both). Judging those by colour keeps real cutouts in the
 * product picker and real scenes in the feature picker.
 *  - whiteBackgroundOnly (product picker): drop banners + feature-page scenes; keep explicit
 *    product cutouts; gallery/unknown → white-bg (show the white 누끼).
 *  - lifestyleOnly (feature picker): keep feature-page; drop explicit product cutouts +
 *    banners; gallery/unknown → white-bg (hide the white 누끼, keep any non-white scene).
 * Returns 'show' | 'hide' | null, where null means "defer to the white-bg colour heuristic".
 */
export function structuralVerdict(
  url: string,
  whiteBackgroundOnly: boolean,
  lifestyleOnly: boolean,
): 'show' | 'hide' | null {
  const kind = lgImageKind(url);
  if (kind === 'banner') return 'hide';
  if (whiteBackgroundOnly) {
    if (kind === 'feature-page') return 'hide';
    if (kind === 'product') return 'show';
    return null;
  }
  if (lifestyleOnly) {
    if (kind === 'feature-page') return 'show';
    if (kind === 'product') return 'hide';
    return null;
  }
  return null;
}
