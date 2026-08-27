import React from 'react';
import { getActiveHeadTrackingEm, getActiveMeasureStack, getActiveTrackingEm } from '../../fonts/brandFonts';

// Spec step 4: ALL slide copy renders in LGEI Headline (head AND sub).
const FONT = 'var(--obs-font)';

/** Bump when the analysis result shape/semantics change — slides analyzed with
 *  an older pass are re-run automatically. */
export const SLIDE_SCHEMA_V = 26;

/** One text line measured from the actual pixels — exact ink rows. */
export interface ZoneLine {
  y: number;   // top, fraction of image height
  h: number;   // ink height, fraction of image height
  x0: number;  // left ink edge, fraction of image width
  x1: number;  // right ink edge, fraction of image width
}

/** One pixel-measured TEXT REGION of the slide: a cluster of consecutive
 *  similar lines, plus its eyedropped background/ink colours. */
export interface SlideRegion {
  lines: ZoneLine[];  // top-to-bottom
  bg: string;         // per-channel MEDIAN of the non-ink pixels in the region
  text?: string;      // modal-bucket MEAN of the ink pixels
  /** Ink fraction of the region box — photo-like clusters score high and are
   *  never masked without assigned text. */
  inkRatio?: number;
  /** Modal colour bucket's share of the ink pixels — glyphs are one colour
   *  (high), photography smears across hundreds of buckets (low). */
  inkPurity?: number;
}

/** Kept for backwards type-compat with pre-v6 stored analyses. */
export interface RefinedGeom {
  lines: ZoneLine[];
  bg: string;
  text?: string;
}

/** One marketing text block from the vision pass — supplies the WORDS
 *  (reading + translation); geometry comes from the pixel regions. */
export interface GallerySlideBlock {
  role: 'title' | 'body';
  original: string;
  /** Translation into the session language — editable by the user in Review. */
  translated: string;
  /** Model's coarse box (fractions 0–1) — zone bounds / geometry fallback. */
  bbox: { x: number; y: number; w: number; h: number };
  /** Model-reported per-line ink boxes (fallback geometry). */
  lines?: Array<{ x: number; y: number; w: number; h: number }>;
  lineCount: number;
  align: 'left' | 'center';
  /** Median per-line ink height as a fraction of the image height (fallback). */
  lineHeightFraction: number;
  bgColor: string;
  textColor: string;
  /** Index into GallerySlideData.regions this block's text belongs to. */
  regionIdx?: number;
  /** Pre-v6 per-block geometry (no longer populated). */
  refined?: RefinedGeom;
}

/** Per-slide analysis result, stored on the bulk item keyed by raw image URL. */
export interface GallerySlideData {
  status: 'loading' | 'done' | 'error';
  imgW: number;
  imgH: number;
  blocks: GallerySlideBlock[];
  /** Pixel-measured text regions (one zone scan per slide). */
  regions?: SlideRegion[];
  /** User choice (Review modal toggle): render the ORIGINAL image untouched —
   *  no masks, no re-typeset — while keeping the analyzed blocks so the
   *  toggle can be switched back on at any time. */
  useOriginal?: boolean;
  /** Review crop (pass-through cards only — cards whose text is re-typeset
   *  keep their measured geometry and cannot be cropped): the cropped square
   *  replaces the render source; the pre-crop source + crop state are kept
   *  so the crop can be re-opened and adjusted. */
  croppedUrl?: string;
  cropSource?: string;
  cropState?: { crop: { x: number; y: number }; zoom: number };
  /** Bottom of the white copy band, image-height fraction (0=top,1=bottom) —
   *  the row where the artwork below starts. The re-typeset head/sub may flow
   *  (wrap) freely down to this floor before shrinking. Undefined only for
   *  slides analyzed before this was measured (re-run automatically via
   *  SLIDE_SCHEMA_V). */
  copyZoneBottom?: number;
  /** Analysis schema version (SLIDE_SCHEMA_V when current). */
  v?: number;
  /** Failure reason when status === 'error' (shown on the tile for self-diagnosis). */
  error?: string;
  /** Free local pre-scan found a white-background copy card — a candidate for
   *  the manual rewrite panel (blocks stays [] either way; there is no AI
   *  detection/translation step anymore). */
  translatable?: boolean;
  /** Free local pre-scan: force-fitting this (wider-than-tall) image into the
   *  1:1 card would clip real content out of frame — routes to Crop even when
   *  `translatable` is true, so the user picks the framing before anything
   *  else. False (or unset) for square/portrait sources and for wide sources
   *  whose clipped side margins are just blank background. */
  needsCrop?: boolean;
  /** Manual head/sub copy the user types directly in the Edit modal — zero
   *  API cost, no OCR/translation involved. */
  rewrite?: { headCopy: string; subCopy: string };
  /** Whether the manual rewrite is currently shown (mask + typed copy) over
   *  the original image. Off by default — original image is the pass-through. */
  rewriteOn?: boolean;
}

/**
 * Pooled-lines alignment judgment for one analyzed slide. `confident` is false
 * when the measured lines can't discriminate (too few lines, or left edges AND
 * centres both agree/disagree equally). Gallery slides of one product almost
 * always share a layout — an unconfident slide should borrow the product-level
 * majority (passed to the template as `alignHint`).
 */
export function judgeSlideAlign(data: GallerySlideData): { align: 'left' | 'center'; confident: boolean } {
  const blocks = data.blocks;
  const majority: 'left' | 'center' =
    blocks.filter((b) => b.align === 'center').length >= blocks.length / 2 ? 'center' : 'left';
  const pool = blocks.flatMap((b) => b.refined?.lines ?? []);
  if (pool.length < 2) return { align: majority, confident: false };
  const x0s = pool.map((l) => l.x0);
  const cs = pool.map((l) => (l.x0 + l.x1) / 2);
  const span = (a: number[]) => Math.max(...a) - Math.min(...a);
  const sx = span(x0s);
  const sc = span(cs);
  if (sx <= sc * 0.7) return { align: 'left', confident: true };
  if (sc < sx * 0.7) return { align: 'center', confident: true };
  return { align: majority, confident: false };
}

/** Product-level layout consensus computed over one item's analyzed slides —
 *  gallery slides of one product share a layout, so an individual slide's
 *  small measurement wobbles snap to the product's values (alignment, per-role
 *  type size, text-column baseline). */
export interface GalleryLayoutHint {
  align?: 'left' | 'center';
  /** Consensus type size per EP role, as an EM estimate in image-height
   *  fraction — NOT raw ink height, which varies with descender presence
   *  ("Design" vs "Typography" ink differs ~20% at the same em size). */
  emByRole: { title?: number; body?: number };
  /** Left-aligned products: consensus text-column left edge (image fraction). */
  x0?: number;
  /** Centred products: consensus centre axis (image fraction). */
  cx?: number;
  /** Consensus head→sub ink gap (image-height fraction) — same-product cards
   *  share one spacing, so per-slide measurement wobble snaps to it. */
  gapHeadSub?: number;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const MIN_FONT = 12;
const MAX_FONT = 130;
const MARGIN = 2;        // user spec: mask = tight ink box + ~2px
const LINE_HEIGHT = 1.16;

// Manual rewrite panel: fixed sizes (no AI-measured em estimate). Head/sub
// share ONE combined max-height budget instead of separate fixed line caps —
// a short head leaves sub more room and vice versa — and whichever one would
// overflow that budget is hard-clipped with NO ellipsis (content is still
// there in storage, just visually cut at the exact line boundary).
// The whole rewrite-panel composition (image + white copy band + text) is
// laid out here at its ORIGINAL 100% sizes, then a single `transform: scale`
// wrapper (RW_IMAGE_SCALE, centred) shrinks image AND text together as one
// unit — this guarantees they stay in lockstep (no separate per-constant
// scaling to keep in sync) and gives margin on all four sides for free.
const RW_IMAGE_SCALE = 0.9;
const REWRITE_HEAD_SIZE = 62;
const REWRITE_SUB_SIZE = 36;
const REWRITE_PAD_X = 55; // matches the established 1090px safe text width used elsewhere in this file
const REWRITE_PAD_TOP = 37;
const REWRITE_GAP = 30;
const REWRITE_BOTTOM_MARGIN = 8;
const REWRITE_HEAD_TRACKING_EM = 0; // +2% from the shared trackingOf() default (-0.02em)
const REWRITE_SUB_TRACKING_EM = 0.01; // +2% from the shared trackingOf() default (-0.01em)

/** Manual rewrite mode: mask the free-scanned white copy zone (0..copyZoneBottom,
 *  full width — that whole band is already known white from the pixel scan
 *  that set `translatable`) and draw the user-typed head/sub copy at FIXED
 *  sizes. No AI, no per-slide measurement — the simplest, zero-cost path. */
function ManualRewriteSlide({
  imageSrc, data, dw, dh, left, top,
}: {
  imageSrc: string;
  data: GallerySlideData;
  dw: number; dh: number; left: number; top: number;
}) {
  const bottom = top + (data.copyZoneBottom ?? 0.3) * dh;
  const headCopy = data.rewrite?.headCopy ?? '';
  const subCopy = data.rewrite?.subCopy ?? '';
  const wrapW = 1200 - REWRITE_PAD_X * 2;
  const headPitch = REWRITE_HEAD_SIZE * LINE_HEIGHT;
  const subPitch = REWRITE_SUB_SIZE * LINE_HEIGHT;
  const maxH = Math.max(0, bottom - REWRITE_PAD_TOP - REWRITE_BOTTOM_MARGIN);

  const headTrackingPx = (REWRITE_HEAD_TRACKING_EM + getActiveHeadTrackingEm()) * REWRITE_HEAD_SIZE;
  const headWrapped = headCopy.trim() !== ''
    ? measureWrap(headCopy, `600 ${REWRITE_HEAD_SIZE}px ${getActiveMeasureStack()}`, wrapW, headTrackingPx).lines
    : 0;
  const subTrackingPx = (REWRITE_SUB_TRACKING_EM + getActiveTrackingEm()) * REWRITE_SUB_SIZE;
  const subWrapped = subCopy.trim() !== ''
    ? measureWrap(subCopy, `400 ${REWRITE_SUB_SIZE}px ${getActiveMeasureStack()}`, wrapW, subTrackingPx).lines
    : 0;

  // Combined responsive budget: head is drawn first at its natural wrap, then
  // whatever height remains decides how many sub lines fit. If head alone
  // already overflows the budget, head itself gets clipped and sub gets none.
  let headLines = headWrapped;
  let subLines = subWrapped;
  const headH = headWrapped * headPitch;
  if (headH > maxH) {
    headLines = Math.max(headWrapped > 0 ? 1 : 0, Math.floor(maxH / headPitch));
    subLines = 0;
  } else {
    const gapUsed = headWrapped > 0 && subWrapped > 0 ? REWRITE_GAP : 0;
    const remaining = maxH - headH - gapUsed;
    subLines = Math.min(subWrapped, Math.max(0, Math.floor(remaining / subPitch)));
  }

  const clamp = (n: number): React.CSSProperties => ({
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: n,
    overflow: 'hidden',
    textOverflow: 'clip', // hard cut at the line boundary — no "…"
    paddingBottom: 4,
    marginBottom: -4,
  });

  return (
    <div style={{ width: 1200, height: 1200, background: '#ffffff', overflow: 'hidden', position: 'relative', fontFamily: FONT }}>
      {/* Image, white copy band and text all laid out at their ORIGINAL 100%
          positions inside this wrapper, then shrunk + centred TOGETHER by one
          transform — so text can never drift out of sync with the image
          (see RW_IMAGE_SCALE above). */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 1200, transform: `scale(${RW_IMAGE_SCALE})`, transformOrigin: 'center center' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 1200, overflow: 'hidden' }}>
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            style={{ position: 'absolute', left, top, width: dw, height: dh, display: 'block', maxWidth: 'none' }}
          />
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: bottom, background: '#ffffff' }} />
        <div style={{ position: 'absolute', left: REWRITE_PAD_X, top: REWRITE_PAD_TOP, width: wrapW }}>
          {headLines > 0 && (
            <div
              style={{
                fontSize: REWRITE_HEAD_SIZE,
                lineHeight: `${headPitch}px`,
                fontWeight: 600,
                color: '#000000',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                letterSpacing: `calc(${REWRITE_HEAD_TRACKING_EM}em + var(--obs-tracking-head))`,
                ...clamp(headLines),
              }}
            >
              {headCopy}
            </div>
          )}
          {subLines > 0 && (
            <div
              style={{
                marginTop: headLines > 0 ? REWRITE_GAP : 0,
                fontSize: REWRITE_SUB_SIZE,
                lineHeight: `${subPitch}px`,
                fontWeight: 400,
                color: '#000000',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                letterSpacing: `calc(${REWRITE_SUB_TRACKING_EM}em + var(--obs-tracking))`,
                ...clamp(subLines),
              }}
            >
              {subCopy}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Relative luminance (0–1) of a #rgb / #rrggbb colour. */
function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const n = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Shared offscreen canvas for text measurement.
let measureCtx: CanvasRenderingContext2D | null | undefined;
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx;
  measureCtx = typeof document !== 'undefined'
    ? document.createElement('canvas').getContext('2d')
    : null;
  return measureCtx;
}

/** letter-spacing (px) the CSS render applies at a given font size.
 *  Includes the brand's extra tracking so canvas wrap points match the DOM. */
function trackingOf(px: number): number {
  return ((px >= 40 ? -0.02 : -0.01) + getActiveTrackingEm()) * px;
}

/**
 * EM-size estimate (image-height fraction) for text whose measured per-line
 * ink height is `lhFrac`: divides by the TEXT'S OWN ink-per-em ratio (canvas
 * actualBoundingBox at the role's weight) so descender presence doesn't skew
 * the estimate. Shared by the render and the product-consensus computation.
 */
export function estimateEmFrac(text: string, role: 'title' | 'body', lhFrac: number): number {
  const ctx = getMeasureCtx();
  let inkPerEm = 0.93; // mixed-case with descenders, fallback
  const t = text.trim();
  if (ctx && t !== '') {
    ctx.font = `${role === 'title' ? 600 : 400} 100px ${getActiveMeasureStack()}`;
    const tm = ctx.measureText(t);
    if (typeof tm.actualBoundingBoxAscent === 'number' && typeof tm.actualBoundingBoxDescent === 'number') {
      const r = (tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent) / 100;
      if (r > 0.5 && r < 1.3) inkPerEm = r;
    }
  }
  return lhFrac / inkPerEm;
}

/** Greedy-wrap `text` at `maxW`; returns line count and widest line width.
 *  `letterSpacingPx` mirrors the CSS tracking so measured wrap points match
 *  the rendered ones exactly (canvas ignores CSS letter-spacing otherwise). */
function measureWrap(text: string, fontCss: string, maxW: number, letterSpacingPx = 0): { lines: number; maxLineW: number } {
  const ctx = getMeasureCtx();
  if (!ctx) return { lines: Math.max(1, Math.ceil(text.length / 24)), maxLineW: maxW };
  ctx.font = fontCss;
  try { (ctx as unknown as { letterSpacing: string }).letterSpacing = `${letterSpacingPx}px`; } catch { /* unsupported engine */ }
  let lines = 0;
  let maxLineW = 0;
  const flush = (s: string) => {
    if (s === '') return;
    lines += 1;
    maxLineW = Math.max(maxLineW, ctx.measureText(s).width);
  };
  // Hard-break a token wider than maxW on its own — mirrors CSS
  // `overflow-wrap: break-word`, which the rendered <div> uses. Without this,
  // a single long word (model number, hyphenated term, no-space script) was
  // always kept on one line here ("cur === '' → accept regardless of width"),
  // undercounting the true line count the DOM produces once it hard-breaks
  // that word — the font then never shrank even though the real render
  // overflowed the box by a line.
  const packChars = (tok: string): string => {
    let cur = '';
    for (const ch of Array.from(tok)) {
      const test = cur + ch;
      if (cur === '' || ctx.measureText(test).width <= maxW) cur = test;
      else { flush(cur); cur = ch; }
    }
    return cur;
  };
  for (const para of text.split('\n')) {
    if (para.trim() === '') { lines += 1; continue; }
    const hasSpaces = /\s/.test(para.trim());
    const tokens = hasSpaces ? para.match(/\S+\s*/g) || [para] : Array.from(para);
    let cur = '';
    for (const tok of tokens) {
      const test = cur + tok;
      if (ctx.measureText(test).width <= maxW) { cur = test; continue; }
      if (cur !== '') flush(cur);
      const bare = cur === '' ? tok : tok.replace(/^\s+/, '');
      cur = ctx.measureText(bare).width <= maxW ? bare : packChars(bare);
    }
    flush(cur);
  }
  return { lines: Math.max(1, lines), maxLineW: Math.min(maxW, maxLineW) };
}

interface RenderUnit {
  txt: string;
  /** The original (untranslated) reading — its OWN ink-per-em ratio is what
   *  the measured ink height must be divided by to recover the design's true
   *  em size (see estimateEmFrac); the translated string's ink-per-em can
   *  differ sharply (e.g. no-descender CJK vs Latin), which was silently
   *  producing wrong — often too small — target sizes. */
  original: string;
  lines: ZoneLine[];       // measured lines (may be empty in fallback path)
  nLines: number;          // ORIGINAL line count — the render's hard line limit
  lhMed: number;           // median per-line ink height, IMAGE fraction
  inkTop: number; inkBottom: number; inkLeft: number; inkRight: number; // display px
  bg: string | null;       // eyedropped (null → resolve in colour pass)
  ink: string | null;
  modelBg: string;
  modelText: string;
  modelAlign: 'left' | 'center';
  modelRole: 'title' | 'body'; // weight tie-breaker when sizes are too close to call
}

/**
 * 1200×1200 canvas implementing the user-confirmed 6-step logic:
 *   1. Each pixel-measured text REGION (w/h from ONE zone scan per slide) is
 *      masked with its eyedropped background colour.
 *   2. The vision pass supplies the region's text (reading + translation).
 *   3. The translation is typeset INSIDE that region — overflowing text
 *      shrinks its font size until it fits.
 *   4. Everything renders in LGEI Headline; the region whose ORIGINAL lines
 *      are tallest is the Head copy (prominence is measured on the original,
 *      NOT on the post-shrink size — a heavily-shrunk head stays the head).
 *   5. Head = SemiBold(600), Sub = Regular(400).
 *   6. Product cutout shots are skipped upstream (no text pass at all).
 * The slide renders height-filling a centred 1100×1100 window (50px frame);
 * text/mask boxes stay inside the centred 1000×1000 area.
 */
export function GallerySlideTemplate({
  imageSrc,
  data,
  layoutHint,
}: {
  /** Display/render source (proxied or data URL). */
  imageSrc: string;
  data: GallerySlideData;
  /** Product-level layout consensus (alignment / type size / baseline) —
   *  same-product gallery layouts match, so slides borrow from each other. */
  layoutHint?: GalleryLayoutHint;
}) {
  const { imgW, imgH } = data;
  // "Use original" toggle: keep the analysis but render the untouched image —
  // no masks, no re-typeset (blocks stay stored so the toggle can flip back).
  const blocks = data.useOriginal ? [] : data.blocks;
  const regions = data.useOriginal ? undefined : data.regions;
  // FULL-BLEED: the slide fills the whole 1200×1200 card (no white frame
  // ring) — matching the text feature card, per user request.
  const FIT = 1200;
  const FRAME = (1200 - FIT) / 2; // 0
  const scale = imgH > 0 ? FIT / imgH : 1;
  const dw = imgW * scale;
  const dh = FIT;
  const left = (1200 - dw) / 2; // negative when the slide is wider than 1:1
  const top = FRAME;

  if (data.rewriteOn && data.rewrite && (data.rewrite.headCopy.trim() !== '' || data.rewrite.subCopy.trim() !== '')) {
    // ManualRewriteSlide lays the whole composition out at its original 100%
    // sizes/positions and shrinks + centres image AND text together with one
    // CSS transform (RW_IMAGE_SCALE) — margin on all four sides, text always
    // in lockstep with the image.
    return <ManualRewriteSlide imageSrc={imageSrc} data={data} dw={dw} dh={dh} left={left} top={top} />;
  }

  // Pass-through preview: two cases fall through to here.
  // 1. TV Edit-eligible (`translatable`) but rewriteOn is off / no copy typed
  //    yet (its default state, before the user opens Edit) — render at the
  //    SAME RW_IMAGE_SCALE the card will actually use once edited (above),
  //    so the preview never mismatches the real result the way it did when
  //    this briefly stayed at natural scale.
  // 2. Genuinely Crop-only cards, before the user has cropped (slideSrc still
  //    points at the raw source): landscape images fill height and always
  //    overflow width at natural scale (dw>1200, sides clipped by the window
  //    below) with no way to see what's being lost until Crop is opened.
  //    Mirrors the Crop modal's own "landscape defaults to 0.65, portrait/
  //    square already fits" rule. Portrait/square (imgW<=imgH) already has
  //    dw<=1200 — never clips — so it renders unchanged.
  const ptScale = data.translatable ? RW_IMAGE_SCALE : (imgW > imgH ? 0.65 : 1);
  const ptDw = dw * ptScale;
  const ptDh = dh * ptScale;
  const ptLeft = left + (dw - ptDw) / 2;
  const ptTop = top + (dh - ptDh) / 2;

  // EP↔render 1:1: every Edit-Panel block renders, no exceptions. Duplicate
  // readings are removed at ANALYSIS time (before the EP ever shows them) —
  // a render-side dedupe silently dropped blocks the panel still displayed
  // ("Design" head vanished because its word appears inside the sub copy).
  const kept: GallerySlideBlock[] = blocks.filter((b) => b.original.trim() !== '');
  kept.sort((a, b) => a.bbox.y - b.bbox.y);

  // ─── Build render units: ONE per Edit-Panel block ──────────────────────────
  // The Edit Panel's head/sub split is the source of truth — the render
  // mirrors it 1:1 (texts are never joined or re-split). Each block carries
  // the pixel lines the analysis distributed to it; blocks without measured
  // lines fall back to the model's own box.
  const units: RenderUnit[] = [];
  for (const b of kept) {
    const rl = b.refined?.lines ?? [];
    if (rl.length > 0) {
      const hs = rl.map((l) => l.h).sort((a, c) => a - c);
      const lhMed = hs[Math.floor(hs.length / 2)];
      // User spec: the box is the TIGHT measured ink rect — no model-bbox
      // blending (it inflated masks whenever the model guessed a wide box).
      const inkTop = top + Math.min(...rl.map((l) => l.y)) * dh;
      const inkBottom = top + Math.max(...rl.map((l) => l.y + l.h)) * dh;
      const inkLeft = left + Math.min(...rl.map((l) => l.x0)) * dw;
      const inkRight = left + Math.max(...rl.map((l) => l.x1)) * dw;
      units.push({
        // An EMPTIED translation is a deliberate deletion — keep the white
        // mask, render nothing ('' stays ''; ?? only covers legacy records
        // where translated was never seeded).
        txt: b.translated ?? b.original,
        original: b.original,
        lines: rl,
        nLines: rl.length,
        lhMed,
        inkTop,
        inkBottom,
        inkLeft,
        inkRight,
        bg: b.refined && HEX_RE.test(b.refined.bg) ? b.refined.bg : null,
        ink: null,
        modelBg: b.bgColor,
        modelText: b.textColor,
        modelAlign: b.align,
        modelRole: b.role,
      });
    } else {
      // Model-geometry fallback for blocks the pixel pass couldn't measure.
      units.push({
        // An EMPTIED translation is a deliberate deletion — keep the white
        // mask, render nothing ('' stays ''; ?? only covers legacy records
        // where translated was never seeded).
        txt: b.translated ?? b.original,
        original: b.original,
        lines: [],
        nLines: Math.max(1, b.lineCount),
        lhMed: Math.max(1e-4, b.lineHeightFraction),
        inkTop: top + b.bbox.y * dh,
        inkBottom: top + (b.bbox.y + Math.max(0.012, b.bbox.h)) * dh,
        inkLeft: left + b.bbox.x * dw,
        inkRight: left + (b.bbox.x + Math.max(0.03, b.bbox.w)) * dw,
        bg: null,
        ink: null,
        modelBg: b.bgColor,
        modelText: b.textColor,
        modelAlign: b.align,
        modelRole: b.role,
      });
    }
  }
  // Leftover measured regions no block claimed: if the model read copy near
  // one, it's original text we failed to attach — mask it (no re-typeset) so
  // it can't leak. Photo-like clusters (high ink ratio) stay untouched.
  for (const rg of regions ?? []) {
    if (rg.lines.length === 0 || (rg.inkRatio ?? 0) > 0.45 || (rg.inkPurity ?? 1) < 0.18) continue;
    // A "line" far taller than real text is a slice of photography the row
    // scan failed to reject — masking it stamps a flat slab over the visual.
    const hsAllR = rg.lines.map((l) => l.h).sort((a, c) => a - c);
    if (hsAllR[hsAllR.length >> 1] > 0.09) continue;
    const rTop = Math.min(...rg.lines.map((l) => l.y));
    const rBot = Math.max(...rg.lines.map((l) => l.y + l.h));
    // 0.03 margin: the model's bbox often stops a couple of line heights above
    // stray copy (footnotes) that still must be masked; junk further below the
    // blocks stays untouched.
    const nearBlock = kept.some((b) => b.bbox.y < rBot + 0.03 && b.bbox.y + b.bbox.h > rTop - 0.03);
    if (!nearBlock) continue;
    const hs0 = rg.lines.map((l) => l.h).sort((a, c) => a - c);
    units.push({
      txt: '',
      original: '',
      lines: rg.lines,
      nLines: rg.lines.length,
      lhMed: hs0[Math.floor(hs0.length / 2)],
      inkTop: top + rTop * dh,
      inkBottom: top + rBot * dh,
      inkLeft: left + Math.min(...rg.lines.map((l) => l.x0)) * dw,
      inkRight: left + Math.max(...rg.lines.map((l) => l.x1)) * dw,
      bg: HEX_RE.test(rg.bg) ? rg.bg : null,
      ink: null,
      modelBg: '#ffffff',
      modelText: '#000000',
      modelAlign: 'center',
      modelRole: 'body',
    });
  }
  units.sort((a, b) => a.inkTop - b.inkTop);

  // ─── Layout per unit: fit inside the region, anchor to its ink ────────────
  // Head/Sub (spec 4–5): follow the vision's Head/Sub labels when they are
  // discriminative — the Review panel labels its textareas with them, and the
  // render must never contradict what the panel says. Only when the labels
  // can't tell units apart (all title / all body) fall back to comparing the
  // measured line sizes (bigger = head).
  // ONE alignment per slide (user rule: a centred slide centres everything, a
  // left slide left-aligns everything). Judged from ALL measured lines pooled;
  // when this slide alone can't tell, the product-level majority (alignHint)
  // decides — same-product gallery slides share a layout.
  const own = judgeSlideAlign(data);
  const slideAlign: 'left' | 'center' = own.confident ? own.align : (layoutHint?.align ?? own.align);
  // User rule: NEW text stays inside the centred 1000×1000 area (canvas
  // 100..1100), intersected with the visible image. MASKS may reach the full
  // 1100×1100 image window — original ink in the 50px ring between the two
  // boxes must still be paintable over, or it peeks out beside the mask.
  const TEXT_BOX = 1090; // same relative safe inset as the pre-full-bleed 1000/1100
  const boxEdge = (1200 - TEXT_BOX) / 2; // 100
  const visL = Math.max(boxEdge, left);
  const visR = Math.min(boxEdge + TEXT_BOX, left + dw);
  const winL = Math.max(FRAME, left);
  const winR = Math.min(FRAME + FIT, left + dw);
  const winT = FRAME;
  const winB = FRAME + FIT;
  // The ORIGINAL per-unit ink box still defines the WRAP WIDTH (margin-mirror
  // logic below) and the tight per-unit mask that hides that original ink —
  // but no longer the vertical position of the re-typeset text. Head/sub
  // text now FLOWS top-to-bottom instead: the first block anchors at its own
  // original top, each next block follows at the ORIGINAL measured gap, and
  // every block may wrap to as many lines as it needs (no more hard cap at
  // the original line count) as long as the stack still fits above the
  // white band's floor (`copyZoneBottom` — where the artwork starts). Only
  // when it doesn't do head AND sub shrink together, 1px at a time, until it
  // fits — this both stops heads from being undersized by a strict per-block
  // line cap and keeps the head↔sub gap the ORIGINAL measured distance
  // instead of drifting when one block's post-shrink height no longer
  // matches its original box height.
  const textUnits = units.filter((u) => u.txt.trim() !== '');
  const leftoverUnits = units.filter((u) => u.txt.trim() === '');

  interface FlowUnit {
    u: RenderUnit;
    weight: number;
    L: number; R: number; wrapW: number; renderW: number;
    baseEm: number;   // px target size before any shared shrink
    gapAfter: number; // original measured px gap to the NEXT text unit
  }
  const flowUnits: FlowUnit[] = textUnits.map((u, i) => {
    // WRAP box: left edge is the measured ink; right edge mirrors the LEFT
    // margin (gap from the safe text area's edge to the ink) onto the right
    // side instead of the tight ink width alone — these white-card copy
    // columns keep matching side margins, so mirroring reproduces the true
    // available width. Never narrower than the measured ink so the original
    // text itself always still fits.
    let L = Math.max(u.inkLeft, visL);
    const inkR = Math.min(u.inkRight, visR);
    L = Math.min(L, inkR - 40);
    const leftMargin = L - visL;
    const R = Math.max(inkR, visR - leftMargin);
    const boxW = Math.max(40, R - L);
    const wrapW = Math.max(120, boxW * 1.01);
    // The render div is 2% wider than the measured wrap width — the rendered
    // line count can never exceed the measured one even when CSS metrics
    // differ minutely from the canvas.
    const renderW = boxW * 1.03;

    // Weight follows the Edit Panel's label 1:1 — HEAD COPY is always
    // SemiBold, SUB COPY always Regular.
    const role: 'title' | 'body' = u.modelRole === 'title' ? 'title' : 'body';
    const weight = role === 'title' ? 600 : 400;

    // TARGET SIZE: the descender-normalized em estimate uses the ORIGINAL
    // reading, not the translation — the measured ink height belongs to the
    // ORIGINAL glyphs, so recovering the true em size must divide by the
    // ORIGINAL text's own ink-per-em ratio. Dividing by the TRANSLATION's
    // ratio instead (e.g. a no-descender CJK string standing in for a
    // descender-bearing Latin original) silently produced the wrong — often
    // too small — starting size before any overflow shrink even ran. The
    // PRODUCT consensus (same-role copy across a product's slides is one
    // size) still absorbs per-slide measurement wobble (≤20%).
    let emFrac = estimateEmFrac(u.original, role, u.lhMed);
    const consEm = layoutHint?.emByRole[role];
    if (consEm !== undefined && Math.abs(emFrac - consEm) / consEm <= 0.2) emFrac = consEm;
    const baseEm = Math.min(MAX_FONT, Math.max(MIN_FONT, Math.floor(emFrac * dh)));

    const next = textUnits[i + 1];
    let gapAfter = next ? Math.max(0, next.inkTop - u.inkBottom) : 0;
    // Same-product cards share one head→sub spacing: snap this slide's
    // measured gap to the product consensus when they roughly agree (wide
    // tolerance — the wobble this absorbs IS the visible inconsistency).
    if (role === 'title' && gapAfter > 0 && layoutHint?.gapHeadSub !== undefined) {
      const hg = layoutHint.gapHeadSub * dh;
      if (hg > 0 && Math.abs(gapAfter - hg) / hg <= 0.35) gapAfter = hg;
    }
    return { u, weight, L, R, wrapW, renderW, baseEm, gapAfter };
  });

  // Floor: bottom of the masked white band, i.e. where the artwork starts.
  // Falls back to the union of the units' own measured bottoms for a slide
  // analyzed before this was measured (transient — SLIDE_SCHEMA_V forces a
  // re-run).
  const T0 = flowUnits.length > 0 ? flowUnits[0].u.inkTop : top;
  const fallbackFloor = units.length > 0
    ? Math.max(...units.map((u) => u.inkBottom)) + MARGIN + 2
    : T0;
  const floor = Math.min(
    data.copyZoneBottom !== undefined ? top + data.copyZoneBottom * dh : fallbackFloor,
    boxEdge + TEXT_BOX,
    winB,
  );

  // Resolved pitch + glyph padding for a block, from the font ACTUALLY
  // RESOLVED for its text (LGEI Headline has no CJK/Thai glyphs — those
  // translations fall back to a system font per the FONT stack). The fixed
  // LINE_HEIGHT=1.16 multiplier was tuned for LGEI Headline's own metrics;
  // a fallback font's natural ascent+descent can exceed that, which drove
  // half-leading NEGATIVE and made the ink-height formula below think the
  // block was taller than it is — every translated block then pushed the
  // next one down by that overshoot, on top of the gap fix already applied,
  // which read as "translated gap is bigger than English". The pitch here
  // is never let go under the resolved font's own single-line box, so
  // English (already fitting under 1.16) is unaffected.
  const measureGlyph = (weight: number, txt: string, fontSize: number): { pitch: number; top: number; bottom: number } => {
    const fallbackPitch = fontSize * LINE_HEIGHT;
    const fallback = 0.16 * fontSize;
    const mctx = getMeasureCtx();
    if (!mctx || txt.trim() === '') return { pitch: fallbackPitch, top: fallback, bottom: fallback };
    mctx.font = `${weight} ${fontSize}px ${getActiveMeasureStack()}`;
    try { (mctx as unknown as { letterSpacing: string }).letterSpacing = `${trackingOf(fontSize)}px`; } catch { /* unsupported */ }
    const tm = mctx.measureText(txt.trim().slice(0, 40));
    if (typeof tm.fontBoundingBoxAscent !== 'number' || typeof tm.actualBoundingBoxAscent !== 'number'
      || typeof tm.fontBoundingBoxDescent !== 'number' || typeof tm.actualBoundingBoxDescent !== 'number') {
      return { pitch: fallbackPitch, top: fallback, bottom: fallback };
    }
    const pitch = Math.max(fallbackPitch, tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent);
    const halfLeading = (pitch - (tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent)) / 2;
    return {
      pitch,
      top: halfLeading + (tm.fontBoundingBoxAscent - tm.actualBoundingBoxAscent),
      bottom: halfLeading + (tm.fontBoundingBoxDescent - tm.actualBoundingBoxDescent),
    };
  };

  // Shrink loop: try every flow unit at its target size; if the stacked
  // height (ink height per block + the ORIGINAL measured gaps) overflows
  // the floor, drop every unit by 1px and retry.
  let shrink = 0;
  let sizes: number[] = [];
  let heights: number[] = []; // ink height per block (line-box height minus top/bottom padding)
  for (;;) {
    sizes = flowUnits.map((f) => Math.max(MIN_FONT, f.baseEm - shrink));
    heights = flowUnits.map((f, i) => {
      const px = sizes[i];
      const { pitch, top, bottom } = measureGlyph(f.weight, f.u.txt, px);
      const lines = f.u.txt.trim() === ''
        ? 1
        : measureWrap(f.u.txt, `${f.weight} ${px}px ${getActiveMeasureStack()}`, f.wrapW, trackingOf(px)).lines;
      return Math.max(0, lines * pitch - top - bottom);
    });
    const total = heights.reduce((a, b) => a + b, 0) + flowUnits.reduce((a, f) => a + f.gapAfter, 0);
    const fits = T0 + total <= floor + 0.5 || sizes.every((s) => s <= MIN_FONT);
    if (fits) break;
    shrink += 1;
  }

  // Stack top-to-bottom: block 0 at T0, each next block at the previous
  // one's INK bottom + its ORIGINAL measured gap (not the taller line-box
  // bottom — see measureGlyph above).
  let cursor = T0;
  const flowDraft = flowUnits.map((f, i) => {
    const fontSize = sizes[i];
    const { pitch, top: padTop } = measureGlyph(f.weight, f.u.txt, fontSize);
    const T = cursor;
    cursor += heights[i] + f.gapAfter;

    // Vertical anchor: the block's glyph top lands on T.
    const textTop = T - padTop;

    // Horizontal: the product BASELINE consensus absorbs per-slide wobble
    // (≤1% of the width) — left columns share one left edge, centred cards
    // one axis.
    let textLeft: number;
    if (slideAlign === 'center') {
      let cx = (f.L + f.R) / 2;
      if (layoutHint?.cx !== undefined) {
        const hcx = left + layoutHint.cx * dw;
        if (Math.abs(cx - hcx) <= 0.01 * dw) cx = hcx;
      }
      textLeft = cx - f.renderW / 2;
    } else {
      let L = f.L;
      if (layoutHint?.x0 !== undefined) {
        const hx = left + layoutHint.x0 * dw;
        if (Math.abs(L - hx) <= 0.01 * dw) L = Math.max(visL, hx);
      }
      textLeft = L;
    }

    return {
      txt: f.u.txt, fontSize, weight: f.weight, align: slideAlign, pitch,
      bgRefined: f.u.bg, modelBg: f.u.modelBg, modelText: f.u.modelText,
      inkTop: f.u.inkTop,
      maxW: f.renderW, textTop, textLeft,
      // Tight mask over the ORIGINAL ink (independent of where the new text
      // now flows) — the full-band mask below additionally covers wherever
      // the reflowed text actually lands.
      maskLeft: f.u.inkLeft - MARGIN,
      maskRight: f.u.inkRight + MARGIN,
      maskTop: f.u.inkTop - MARGIN,
      maskBottom: f.u.inkBottom + MARGIN + 2,
    };
  });

  // Leftover (footnote) units: unchanged tight-box masking, no re-typeset.
  const leftoverDraft = leftoverUnits.map((u) => ({
    txt: '', fontSize: MIN_FONT, letterSpacing: 'var(--obs-tracking)', weight: 400, align: slideAlign, pitch: MIN_FONT * LINE_HEIGHT,
    bgRefined: u.bg, modelBg: u.modelBg, modelText: u.modelText,
    inkTop: u.inkTop,
    maxW: 0, textTop: 0, textLeft: 0,
    maskLeft: u.inkLeft - MARGIN,
    maskRight: u.inkRight + MARGIN,
    maskTop: u.inkTop - MARGIN,
    maskBottom: u.inkBottom + MARGIN + 2,
  }));

  const draft = [...flowDraft, ...leftoverDraft];

  // Colour pass: a unit without its own eyedropped bg borrows the vertically
  // nearest refined unit's; only when none exists does the model guess apply.
  // Text colour is strictly BLACK or WHITE by background luminance — sampled
  // ink colours wash out to grey (anti-aliased edges dominate thin glyphs).
  const withBg = draft.filter((d) => d.bgRefined);
  const placed = draft.map((d) => {
    const bg = d.bgRefined
      ?? (withBg.length > 0
        ? withBg.reduce((a, c) => (Math.abs(c.inkTop - d.inkTop) < Math.abs(a.inkTop - d.inkTop) ? c : a)).bgRefined!
        : (HEX_RE.test(d.modelBg) ? d.modelBg : '#ffffff'));
    const color = luminance(bg) > 0.5 ? '#000000' : '#ffffff';
    return { ...d, bg, color };
  });

  return (
    <div style={{ width: 1200, height: 1200, background: '#ffffff', overflow: 'hidden', position: 'relative', fontFamily: FONT }}>
      {/* 1100×1100 window: image height fills it, centred, sides clipped —
          except landscape sources, scaled to ptDw/ptDh so nothing is lost
          off-frame by default (see ptScale above). */}
      <div style={{ position: 'absolute', left: FRAME, top: FRAME, width: FIT, height: FIT, overflow: 'hidden' }}>
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          style={{ position: 'absolute', left: ptLeft - FRAME, top: ptTop, width: ptDw, height: ptDh, display: 'block', maxWidth: 'none' }}
        />
      </div>

      {/* ONE full-width mask spans the whole white FLOW BAND — the first
          block's original top down to the artwork floor (`copyZoneBottom`)
          — instead of a tight box per unit. Every slide reaching this
          template is already gated to a pure-white background
          (isWhiteCopyCard), so painting the full band is safe: it gives the
          reflowed head/sub a safe canvas wherever they actually land, since
          a block may now sit at a different y than its own original ink
          (flow layout above). */}
      {flowUnits.length > 0 && (() => {
        const mL = winL;
        const mR = winR;
        const mT = Math.max(winT, T0 - MARGIN);
        const mB = Math.min(winB, floor);
        if (mR <= mL || mB <= mT) return null;
        return (
          <div
            style={{
              position: 'absolute',
              left: mL,
              top: mT,
              width: mR - mL,
              height: mB - mT,
              background: placed[0].bg,
            }}
          />
        );
      })()}
      {/* Individual tight masks over each block's ORIGINAL ink — still
          needed since the flow band above only spans from the first block's
          original top; anything outside that (a leftover footnote sitting
          lower, or a slide with no text units at all) still needs its own
          cover. */}
      {placed.map((p, i) => {
        const mL = Math.max(p.maskLeft, winL);
        const mR = Math.min(p.maskRight, winR);
        const mT = Math.max(p.maskTop, winT);
        const mB = Math.min(p.maskBottom, winB);
        if (mR <= mL || mB <= mT) return null;
        return (
          <div
            key={`m${i}`}
            style={{
              position: 'absolute',
              left: mL,
              top: mT,
              width: mR - mL,
              height: mB - mT,
              background: p.bg,
            }}
          />
        );
      })}
      {placed.filter((p) => p.txt.trim() !== '').map((p, i) => (
        <div
          key={`t${i}`}
          style={{
            position: 'absolute',
            left: p.textLeft,
            top: p.textTop,
            width: p.maxW,
            fontSize: p.fontSize,
            lineHeight: `${p.pitch}px`, // original leading, measured
            fontWeight: p.weight,        // Head = SemiBold(600), Sub = Regular(400)
            fontFamily: FONT,            // everything in LGEI Headline
            color: p.color,
            textAlign: p.align,
            letterSpacing: `calc(${p.fontSize >= 40 ? '-0.02em' : '-0.01em'} + var(--obs-tracking))`,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
          }}
        >
          {p.txt}
        </div>
      ))}
    </div>
  );
}
