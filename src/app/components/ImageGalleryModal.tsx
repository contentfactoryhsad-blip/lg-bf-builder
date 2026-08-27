import React from 'react';
import { X, Loader2, ImageOff } from 'lucide-react';
import { getProxiedImageUrl, ScrapedImage } from '../services/imageScraperApi';
import { useT } from '../i18n/LanguageContext';
import { checkWhiteBackground } from '../utils/nukkeeDetector';
import { structuralVerdict, largestRendition } from '../utils/lgImageFilter';

interface ImageGalleryModalProps {
  images: ScrapedImage[];
  isLoading: boolean;
  error: string | null;
  /** Called with the chosen image's source data (raw url + context). */
  onSelect: (source: ScrapedImage) => void;
  onCancel: () => void;
  /** If true, only show images with a white/light background (canvas pixel analysis). */
  whiteBackgroundOnly?: boolean;
  /** If true, only show lifestyle images — excludes white-background (nukkee) images. */
  lifestyleOnly?: boolean;
  /**
   * Pre-analysed white-bg results keyed by raw image URL.
   * When provided for a URL, GalleryItem skips its own async canvas analysis.
   */
  precomputedWhiteBg?: ReadonlyMap<string, boolean>;
  /**
   * Order the grid for a cutout workflow: packshots first, then unmeasured,
   * then lifestyle; higher resolution first within each band. Off by default so
   * the builders that rely on the crawl order are unaffected.
   */
  rankForCutout?: boolean;
}


/* ------------------------------------------------------------------ */
/* Cutout ranking (ported from the Sales Banner Builder)               */
/* ------------------------------------------------------------------ */

/**
 * Background removal floods inwards from the border, so it only works on shots
 * that actually have a white surround. Filename and resolution do not tell you
 * which those are — the same gallery series mixes packshots and lifestyle at
 * identical sizes, and the largest image is often the lifestyle one. The share
 * of white border pixels is what separates them cleanly.
 */
const WHITE_MIN = 243;
const CUT_WHITE_RATIO = 0.95;
/** Below this a tile is an icon or logo, not a packshot. */
const CUT_MIN_SIDE = 200;
/** Border sampling runs on a thumbnail — no need to read the full image. */
const PROBE_SIZE = 96;

interface Measured { w: number; h: number; white: number }

/** White share of the one-pixel border, measured on a downscaled copy. */
function measureBorder(img: HTMLImageElement): Measured | null {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;
  const s = Math.min(1, PROBE_SIZE / Math.max(w, h));
  const cw = Math.max(2, Math.round(w * s)), ch = Math.max(2, Math.round(h * s));
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, cw, ch);
    const d = ctx.getImageData(0, 0, cw, ch).data;
    let white = 0, total = 0;
    const chk = (x: number, y: number) => {
      const p = (y * cw + x) * 4;
      total++;
      // an already-transparent border counts too (a PNG cutout)
      if (d[p + 3] < 8) { white++; return; }
      if (d[p] >= WHITE_MIN && d[p + 1] >= WHITE_MIN && d[p + 2] >= WHITE_MIN) white++;
    };
    for (let x = 0; x < cw; x++) { chk(x, 0); chk(x, ch - 1); }
    for (let y = 0; y < ch; y++) { chk(0, y); chk(cw - 1, y); }
    return { w, h, white: total ? white / total : 0 };
  } catch {
    return null;   // a tainted canvas just means no ranking for this tile
  }
}

const isCutReady = (m: Measured) =>
  m.white >= CUT_WHITE_RATIO && Math.max(m.w, m.h) >= CUT_MIN_SIDE;

// Structural classifier (lgImageKind / structuralVerdict) lives in ../utils/lgImageFilter
// so the bulk auto-pick can reuse the exact same rules.

// Per-image item that handles its own white-bg analysis (with precomputed fast-path).
function GalleryItem({
  img,
  index,
  isSelected,
  whiteBackgroundOnly,
  lifestyleOnly,
  precomputedWhiteBg,
  onClick,
  onDoubleClick,
  onMeasured,
  measured,
}: {
  img: ScrapedImage;
  index: number;
  isSelected: boolean;
  whiteBackgroundOnly: boolean;
  lifestyleOnly: boolean;
  precomputedWhiteBg?: ReadonlyMap<string, boolean>;
  onClick: () => void;
  onDoubleClick: () => void;
  /** Reports the loaded element so the grid can rank by border/resolution. */
  onMeasured?: (url: string, el: HTMLImageElement) => void;
  /** Set once the tile has loaded and `rankForCutout` is on. */
  measured?: Measured;
}) {
  const t = useT();
  // Trust LG's URL/filename structure first (works for both the product and feature
  // pickers); only fall back to the colour heuristic when the path gives no verdict.
  const verdict = (whiteBackgroundOnly || lifestyleOnly)
    ? structuralVerdict(img.url, whiteBackgroundOnly, lifestyleOnly)
    : null;
  const needsAnalysis = (whiteBackgroundOnly || lifestyleOnly) && verdict === null;
  const precomputed = precomputedWhiteBg?.get(img.url);
  const [isWhite, setIsWhite] = React.useState<boolean | null>(
    precomputed !== undefined ? precomputed : (needsAnalysis ? null : true),
  );

  // Apply precomputed value when it arrives after initial render
  React.useEffect(() => {
    if (precomputed !== undefined) setIsWhite(precomputed);
  }, [precomputed]);

  // Fallback: own async analysis when precomputed value isn't available yet
  React.useEffect(() => {
    if (precomputed !== undefined) return;
    if (!needsAnalysis) return;
    let cancelled = false;
    checkWhiteBackground(getProxiedImageUrl(img.url)).then((result) => {
      if (!cancelled) setIsWhite(result);
    });
    return () => { cancelled = true; };
  }, [img.url, needsAnalysis, precomputed]);

  // Structural verdict wins when the URL is classifiable (no color analysis needed):
  // product picker keeps 누끼 & drops feature scenes/banners; feature picker the inverse.
  if (verdict === 'hide') return null;
  // (verdict === 'show' → skip the color checks below and render)

  // Analysing — show skeleton placeholder
  if (isWhite === null) {
    return <div className="aspect-square rounded-xl bg-gray-100 animate-pulse" />;
  }

  // Fallback white-bg heuristic — only for images the URL couldn't classify (verdict null).
  if (whiteBackgroundOnly && verdict === null && isWhite === false) return null;
  if (lifestyleOnly && verdict === null && isWhite === true) return null;

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={img.context || undefined}
      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:shadow-md ${
        isSelected ? 'border-[#FD312E] shadow-md' : 'border-transparent'
      } ${isWhite ? 'bg-white' : 'bg-gray-50'}`}
    >
      <img
        src={getProxiedImageUrl(img.url)}
        alt={img.context || `Product ${index + 1}`}
        className="w-full h-full object-contain"
        loading="lazy"
        onLoad={(e) => onMeasured?.(img.url, e.target as HTMLImageElement)}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      {measured && (
        <span className="absolute bottom-0 inset-x-0 px-1 py-0.5 text-[9px] leading-tight tabular-nums text-white bg-black/45 text-center z-10">
          {measured.w}×{measured.h}
        </span>
      )}
      {measured && isCutReady(measured) && (
        <span className="absolute top-1 left-1 px-1 py-px rounded text-[8px] font-medium text-white bg-[#FD312E]/85 z-10">
          CUTOUT
        </span>
      )}
      {img.context && !measured && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
          <p className="text-[10px] text-white text-left leading-tight line-clamp-2">
            {img.context}
          </p>
        </div>
      )}
      {isSelected && (
        <div className="absolute inset-0 bg-[#FD312E]/10 flex items-center justify-center">
          <div className="bg-[#FD312E] text-white text-xs font-semibold rounded-full px-3 py-1">
            {t('Selected')}
          </div>
        </div>
      )}
    </button>
  );
}

export function ImageGalleryModal({
  images: rawImages,
  isLoading,
  error,
  onSelect,
  onCancel,
  whiteBackgroundOnly = false,
  lifestyleOnly = false,
  precomputedWhiteBg,
  rankForCutout = false,
}: ImageGalleryModalProps) {
  const t = useT();
  const images = React.useMemo(
    // When any bg-filter is active, include all images (canvas analysis does the filtering).
    // `rankForCutout` opts out too: the context dedup drops exactly the images it
    // wants. LG's product gallery series (…_2010x1334_2.jpg and friends) carries no
    // caption, so a context filter throws away every packshot and leaves only the
    // captioned lifestyle shots. The border measurement does the sorting instead.
    // Otherwise keep the context-based dedup (skip no-context images except the first).
    () => (whiteBackgroundOnly || lifestyleOnly || rankForCutout)
      ? rawImages
      : rawImages.filter((img, i) => i === 0 || !!img.context),
    [rawImages, whiteBackgroundOnly, lifestyleOnly, rankForCutout],
  );
  const [selected, setSelected] = React.useState<number | null>(null);

  // Border measurements accumulate as tiles load; the grid re-sorts as they land.
  const [measured, setMeasured] = React.useState<Record<string, Measured>>({});
  const onMeasured = React.useCallback((url: string, el: HTMLImageElement) => {
    if (!rankForCutout) return;
    const m = measureBorder(el);
    if (m) setMeasured(prev => (prev[url] ? prev : { ...prev, [url]: m }));
  }, [rankForCutout]);

  const cutCount = React.useMemo(
    () => (rankForCutout
      ? images.filter(im => measured[im.url] && isCutReady(measured[im.url])).length
      : 0),
    [images, measured, rankForCutout],
  );

  const ordered = React.useMemo(() => {
    if (!rankForCutout) return images;
    const band = (img: ScrapedImage) => {
      const m = measured[img.url];
      if (!m) return 1;                 // not measured yet — hold its place
      return isCutReady(m) ? 0 : 2;     // packshot → unmeasured → lifestyle
    };
    return images
      .map((img, i) => ({ img, i }))
      .sort((a, b) => {
        const ba = band(a.img), bb = band(b.img);
        if (ba !== bb) return ba - bb;
        const ma = measured[a.img.url], mb = measured[b.img.url];
        if (ma && mb) {
          const byArea = mb.w * mb.h - ma.w * ma.h;
          if (byArea) return byArea;
        }
        return a.i - b.i;               // otherwise keep the crawl order
      })
      .map(x => x.img);
  }, [images, measured, rankForCutout]);

  /**
   * Hand back the largest rendition of whatever tile was clicked.
   *
   * LG lists the same photograph at several widths and the grid shows them as
   * separate tiles, so a pick is a coin toss between a 350px thumbnail and the
   * 2010px original. Everything downstream — background removal, auto-crop,
   * the export — is done at that resolution, and a cutout made at 350px comes
   * out ragged once it is scaled back up. The URL is the only thing that
   * changes; the picture is the same one that was clicked.
   */
  function choose(img: ScrapedImage) {
    onSelect({ ...img, url: largestRendition(img.url, rawImages.map((im) => im.url)) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-[680px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{t('Select Product Image')}</h2>
            {cutCount > 0 && (
              <span className="text-[11px] text-gray-400">
                {t('{n} cutout-ready first').replace('{n}', String(cutCount))}
              </span>
            )}
            {whiteBackgroundOnly && (
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {t('White BG only')}
              </span>
            )}
            {lifestyleOnly && (
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {t('Lifestyle only')}
              </span>
            )}
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 size={32} className="animate-spin mb-3" />
              <p className="text-sm">{t('Importing images from page...')}</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              <ImageOff size={32} className="mb-3" />
              <p className="text-sm text-center">{error}</p>
              <p className="text-xs text-gray-400 mt-2">{t('Please download the image manually and upload it.')}</p>
            </div>
          )}

          {!isLoading && !error && ordered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ImageOff size={32} className="mb-3" />
              <p className="text-sm">{t('No product images found.')}</p>
              <p className="text-xs mt-1">{t('Try a different URL or upload manually.')}</p>
            </div>
          )}

          {!isLoading && ordered.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {ordered.map((img, i) => (
                <GalleryItem
                  key={i}
                  img={img}
                  index={i}
                  isSelected={selected === i}
                  whiteBackgroundOnly={whiteBackgroundOnly}
                  lifestyleOnly={lifestyleOnly}
                  precomputedWhiteBg={precomputedWhiteBg}
                  onClick={() => setSelected(i)}
                  onDoubleClick={() => choose(img)}
                  onMeasured={onMeasured}
                  measured={rankForCutout ? measured[img.url] : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {t('Cancel')}
          </button>
          <button
            disabled={selected === null}
            onClick={() => {
              if (selected !== null) choose(images[selected]);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-[#FD312E] rounded-lg hover:bg-[#E22825] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {t('Use This Image')}
          </button>
        </div>
      </div>
    </div>
  );
}
