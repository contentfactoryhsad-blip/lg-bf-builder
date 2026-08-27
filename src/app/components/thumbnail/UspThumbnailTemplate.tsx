import React from 'react';
import { getActiveMeasureStack } from '../../fonts/brandFonts';
import type { ThumbnailUspState, ThumbnailUspItem } from './thumbnailTypes';

const FONT = 'var(--obs-font)';
export const USP_FONT = FONT;

// Shown in the 120×120 icon slot until the user uploads their own — so the
// "with image" layout (icon + left-aligned copy) is what the template starts on.
const USP_ICON_PLACEHOLDER = '/thumbnail/placeholder-gift.png';

// Figma's sample copy (node 1934:18876) — the USP card shows the full product
// name, not the short model code the other product-card templates use.
const USP_MODEL_PLACEHOLDER =
  '45" LG UltraGear™ OLED Gaming Monitor, 800R Curve, 5K2K Resolution, 165Hz Refresh Rate, Black';

/** Notice / USP copy cap at 2 rendered lines. */
export const MAX_LINES = 2;
/** Benefits cap at 1 rendered line — shorter than Notice/USP copy. */
export const BENEFIT_MAX_LINES = 1;

// Notice + Benefit boxes: 30px Bold copy, 20px padding all round, full column width.
export const BOX_COPY_SIZE = 30;
export const BOX_COPY_LH = 1.18;
const BOX_PAD = 20;
export const BOX_TEXT_W = 360 - BOX_PAD * 2; // column content 360px minus the box's own padding

// USP row copy: 28px, sits beside the 120px icon (16px gap) inside the 20px-padded white box.
export const USP_COPY_SIZE = 28;
export const USP_COPY_LH = 1.2;
export const USP_COPY_W_WITH_ICON = 360 - 20 * 2 - 120 - 16; // 184
export const USP_COPY_W_NO_ICON = 360 - 20 * 2;              // 320

// Shared offscreen canvas — wrap measurement must match what the card renders.
let measureCtx: CanvasRenderingContext2D | null | undefined;
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx;
  measureCtx = typeof document !== 'undefined'
    ? document.createElement('canvas').getContext('2d')
    : null;
  return measureCtx;
}

// LGEI Headline's @font-face is subset via `unicode-range` to Latin/symbols
// only (src/styles/fonts.css) — it has no Hangul glyphs, so real DOM text
// layout correctly falls through to the CJK fallback font for Korean chars.
// Canvas 2D's `measureText`, however, does NOT reliably honor unicode-range
// when resolving a font-family stack — it can keep measuring Korean runs
// against LGEI Headline's (wrong, sometimes near-zero) glyph metrics. That
// mismeasurement — not a load-timing or safety-margin issue — was the actual
// cause of the guard letting a boundary character through or rejecting a
// character that would have fit: measure each run against whichever font it
// will ACTUALLY render with.
const CJK_FONT = "'Microsoft JhengHei UI', 'PingFang TC', 'Apple SD Gothic Neo', sans-serif";
const CJK_RE = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힣ힰ-퟿㐀-䶿一-鿿぀-ヿ＀-￯]/;

function measureRun(ctx: CanvasRenderingContext2D, text: string, size: number, weight: number): number {
  if (text === '') return 0;
  let width = 0;
  let run = '';
  let runIsCJK: boolean | null = null;
  const flush = () => {
    if (run === '') return;
    ctx.font = `${weight} ${size}px ${runIsCJK ? CJK_FONT : getActiveMeasureStack()}`;
    width += ctx.measureText(run).width;
    run = '';
  };
  for (const ch of text) {
    const isCJK = CJK_RE.test(ch);
    if (runIsCJK !== null && isCJK !== runIsCJK) flush();
    runIsCJK = isCJK;
    run += ch;
  }
  flush();
  return width;
}

// Small residual safety margin for kerning/hinting differences between
// canvas measurement and real DOM wrap — the font-selection fix above
// removes the large, unpredictable part of the drift.
const MEASURE_SAFETY = 0.97;

/** Greedy-wrapped line count for `text` at `size`px/`weight` inside `maxW`.
 *  A word too wide to fit on its own empty line is broken mid-word (mirrors
 *  the cards' `wordBreak:'break-word'`) instead of being left unmeasured —
 *  without this, a single long unbroken run of characters (no spaces —
 *  common typing continuous Korean without 띄어쓰기) was never detected as
 *  overflow and could grow the field without limit. */
export function countLines(text: string, size: number, weight: number, maxW: number): number {
  const t = text.trim();
  if (t === '') return 0;
  const ctx = getMeasureCtx();
  if (!ctx) return 1;
  const mw = (s: string) => measureRun(ctx, s, size, weight);
  const safeMaxW = maxW * MEASURE_SAFETY;
  const spaceW = mw(' ');

  let lines = 1;
  let lineWidth = 0;
  let lineHasContent = false;
  const startNewLine = () => { lines += 1; lineWidth = 0; lineHasContent = false; };

  for (const word of t.split(/\s+/)) {
    if (word === '') continue;
    let remaining = word;
    while (remaining !== '') {
      const w = mw(remaining);
      if (lineWidth + (lineHasContent ? spaceW : 0) + w <= safeMaxW) {
        lineWidth += (lineHasContent ? spaceW : 0) + w;
        lineHasContent = true;
        break;
      }
      if (!lineHasContent) {
        // Whole word doesn't fit even on an empty line — break it mid-word.
        let chunk = '';
        for (const ch of remaining) {
          const test = chunk + ch;
          if (chunk !== '' && mw(test) > safeMaxW) break;
          chunk = test;
        }
        if (chunk === '') chunk = remaining[0]; // pathological: force progress
        lineWidth = mw(chunk);
        lineHasContent = true;
        remaining = remaining.slice(chunk.length);
        if (remaining !== '') startNewLine();
      } else {
        startNewLine();
      }
    }
  }
  return lines;
}

/** Lines the notice/benefit box copy wraps to (as the card renders it). */
export function boxLines(text: string): number {
  return countLines(text, BOX_COPY_SIZE, 600, BOX_TEXT_W);
}

/** Lines a USP's copy wraps to, given whether its icon takes up room. */
export function uspCopyLines(usp: ThumbnailUspItem): number {
  const w = (usp.showImage ?? true) ? USP_COPY_W_WITH_ICON : USP_COPY_W_NO_ICON;
  return countLines(usp.copy, USP_COPY_SIZE, 400, w);
}

/** Greedily keeps whole words while the text still wraps to `maxLines` or fewer. */
function truncateToLines(text: string, size: number, weight: number, maxW: number, maxLines: number): string {
  // Character-by-character (not whole-word) — a whole-token version would
  // return '' the instant the very first token alone needed >maxLines (e.g.
  // Korean typed as one continuous run with no spaces), which looked like
  // the field getting wiped and reset instead of just holding at the limit.
  const t = text.trim();
  let result = '';
  for (const ch of t) {
    const candidate = result + ch;
    if (countLines(candidate, size, weight, maxW) > maxLines) break;
    result = candidate;
  }
  return result.trimEnd();
}

/** Trims auto-filled context text (e.g. a scraped image caption) down to what
 *  a USP's copy can actually hold, so it never gets silently rejected by the
 *  editor's line-count guard. */
export function truncateUspCopy(text: string, showImage: boolean): string {
  const w = showImage ? USP_COPY_W_WITH_ICON : USP_COPY_W_NO_ICON;
  return truncateToLines(text, USP_COPY_SIZE, 400, w, MAX_LINES);
}

/** Same trim, for Notice/Benefit box copy — used to settle text back onto its
 *  line budget once IME composition ends (mid-composition input bypasses the
 *  per-keystroke guard, so it can briefly overshoot). */
export function truncateBoxCopy(text: string, maxLines: number): string {
  return truncateToLines(text, BOX_COPY_SIZE, 600, BOX_TEXT_W, maxLines);
}

function UspRow({ usp }: { usp: ThumbnailUspItem }) {
  const showImage = usp.showImage ?? true;
  const iconSrc = usp.image.url ?? USP_ICON_PLACEHOLDER;
  const lines = Math.max(1, Math.min(MAX_LINES, countLines(usp.copy, USP_COPY_SIZE, 400, showImage ? USP_COPY_W_WITH_ICON : USP_COPY_W_NO_ICON)));
  return (
    <div style={{ display: 'flex', gap: 16, height: 120, alignItems: 'center', width: '100%', flexShrink: 0 }}>
      {showImage && (
        <div style={{ width: 120, height: 120, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: '#F6F3EB' }}>
          <img src={iconSrc} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div
        style={{
          flex: '1 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          height: '100%', maxHeight: 120, minWidth: 0,
          alignItems: showImage ? 'flex-start' : 'center',
        }}
      >
        <p style={{
          margin: 0, fontSize: USP_COPY_SIZE, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#4A4946', lineHeight: USP_COPY_LH,
          textAlign: showImage ? 'left' : 'center',
          // +4px descender headroom (same convention as the model chip below) —
          // without it, a last line ending in g/y/p/j/q gets its descender
          // clipped by `overflow:hidden`, which reads as extra bottom margin.
          height: Math.ceil(lines * USP_COPY_SIZE * USP_COPY_LH) + 4,
          overflow: 'hidden', wordBreak: 'break-word',
          width: '100%',
          // Descender headroom: brand faces use LG's descent metric, which is
          // shallower than their Thai marks need. Negative margin cancels the
          // padding so nothing below shifts.
          boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
        }}>
          {usp.copy}
        </p>
      </div>
    </div>
  );
}

// ── Right-column height budget ────────────────────────────────────────────
// The column is a fixed 1200px tall with 50px padding top/bottom, and its
// three blocks (Notice / Benefits / USPs) are separated by a 30px gap. Adding
// one more benefit or USP must never overflow it — the editor asks
// `uspCapacity()` which counts are still affordable and disables the rest.
const COL_H = 1200;
const COL_PAD_Y = 50;
const COL_GAP = 30;
const BENEFIT_GAP = 16;
const USP_BOX_PAD = 20;
const USP_ROW_H = 120;
const USP_ROW_GAP = 10;   // also the gap on each side of the hairline divider

/** A notice/benefit box grows with its copy — 1 line ≈ 75px, 2 lines ≈ 111px. */
function boxHeight(text: string, maxLines: number): number {
  const lines = Math.min(maxLines, boxLines(text));
  if (lines === 0) return 0;
  return BOX_PAD * 2 + Math.ceil(lines * BOX_COPY_SIZE * BOX_COPY_LH);
}

function noticeHeight(state: ThumbnailUspState): number {
  return state.showNotice ? boxHeight(state.notice, MAX_LINES) : 0;
}

function benefitsHeight(state: ThumbnailUspState, n: number): number {
  const hs = state.benefits.slice(0, n).map((b) => boxHeight(b, BENEFIT_MAX_LINES)).filter((h) => h > 0);
  if (hs.length === 0) return 0;
  return hs.reduce((a, b) => a + b, 0) + (hs.length - 1) * BENEFIT_GAP;
}

function uspsHeight(n: number): number {
  if (n <= 0) return 0;
  const rows = n * USP_ROW_H;
  // Divider lines sit in a 0-height wrapper (absolute overlay, matching
  // Figma) — they add no layout height of their own, only the flex gap on
  // each side: n rows + (n-1) zero-height dividers = 2n-1 children, 2n-2 gaps.
  const gaps = (2 * n - 2) * USP_ROW_GAP;
  return rows + gaps + USP_BOX_PAD * 2;
}

/** Total right-column content height for a given benefit/USP count. */
function columnHeight(state: ThumbnailUspState, benefits: number, usps: number): number {
  const blocks = [noticeHeight(state), benefitsHeight(state, benefits), uspsHeight(usps)].filter((h) => h > 0);
  if (blocks.length === 0) return COL_PAD_Y * 2;
  return COL_PAD_Y * 2 + blocks.reduce((a, b) => a + b, 0) + (blocks.length - 1) * COL_GAP;
}

// Each box height rounds UP to a whole pixel (`Math.ceil`), and there are up
// to 3 of them stacked — that rounding can stack to a few px of estimated
// overflow that was never actually visible (the column clips via
// `overflow:hidden`, and a sub-pixel-scale sliver at the very bottom of a
// 120px icon row is imperceptible). Notice(2 lines) + Benefits(4) + USPs(4) —
// the app's own default state — lands exactly in this rounding gap. Without
// slack it reads as "Benefits 4 is disabled" the instant the card loads.
const CAPACITY_SLACK = 4;

/**
 * The largest benefit / USP counts that still fit the 1200px column, given the
 * other one's current count. The editor greys out the counts above these and
 * warns instead of silently clipping the card.
 */
export function uspCapacity(state: ThumbnailUspState): { maxBenefits: number; maxUsps: number } {
  let maxBenefits = 0;
  for (let n = 4; n >= 0; n--) {
    if (columnHeight(state, n, state.uspCount) <= COL_H + CAPACITY_SLACK) { maxBenefits = n; break; }
  }
  let maxUsps = 0;
  for (let n = 4; n >= 0; n--) {
    if (columnHeight(state, state.benefitCount, n) <= COL_H + CAPACITY_SLACK) { maxUsps = n; break; }
  }
  return { maxBenefits, maxUsps };
}

/** Whether turning Notice ON fits within the column at the CURRENT benefit/USP
 *  counts — `maxBenefits`/`maxUsps` above only check growing those two, they
 *  never re-check Notice against an already-full Benefits+USPs column. Probes
 *  with the current notice text (or a nominal 1-line stand-in if still empty,
 *  since the user is about to type one). */
export function noticeFits(state: ThumbnailUspState): boolean {
  const probe: ThumbnailUspState = {
    ...state,
    showNotice: true,
    notice: state.notice.trim() !== '' ? state.notice : 'x',
  };
  return columnHeight(probe, state.benefitCount, state.uspCount) <= COL_H + CAPACITY_SLACK;
}

/**
 * Product Card — USP ver. Left column (logo/Official Store/model chip) and
 * product frame are byte-identical to PromotionThumbnailTemplate (same
 * Figma spec) — right column swaps vouchers for a Notice banner, a Benefits
 * list, and a USP list (each item an optional 120×120 icon + copy).
 */
// Notice + benefit copy: centred, hard-capped by pixel height (not
// -webkit-line-clamp — WebKit/Blink always draws its own "…" for clamped
// boxes no matter what text-overflow is set to, so a true no-ellipsis cut
// needs a plain height + overflow:hidden instead). `height` (not `maxHeight`)
// is set to exactly the real line count's pixel height — a soft maxHeight
// cap left a few px of slack once text crossed into 2 lines, which read as
// the box's bottom margin suddenly widening at the wrap point.
function boxCopyStyleFor(text: string, maxLines: number): React.CSSProperties {
  const lines = Math.max(1, Math.min(maxLines, boxLines(text)));
  return {
    margin: 0, fontSize: BOX_COPY_SIZE, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, lineHeight: BOX_COPY_LH, textAlign: 'center',
    wordBreak: 'break-word',
    height: Math.ceil(lines * BOX_COPY_SIZE * BOX_COPY_LH),
    overflow: 'hidden',
    // Descender headroom: brand faces use LG's descent metric, which is
    // shallower than their Thai marks need. Negative margin cancels the
    // padding so nothing below shifts.
    boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
  };
}

export function UspThumbnailTemplate({ state }: { state: ThumbnailUspState }) {
  const activeBenefits = state.benefits.slice(0, state.benefitCount).filter((b) => b.trim() !== '');
  const activeUsps = state.usps.slice(0, state.uspCount);

  return (
    <div style={{ width: 1200, height: 1200, background: '#ffffff', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      {/* ── Left column header (760px wide) — identical to Promotion ver ── */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 760, display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', paddingTop: 76, width: '100%', flexShrink: 0 }}>
          <img src="/thumbnail/lg-logo.svg" alt="LG" draggable={false} style={{ height: 48, width: 108.96, display: 'block', flexShrink: 0 }} />
          <div style={{ width: 1, height: 40, background: '#CBC8C2', flexShrink: 0 }} />
          <span style={{ fontSize: 44, fontWeight: 400, color: '#716F6A', letterSpacing: 'calc(-0.88px + var(--obs-tracking))', lineHeight: 1.1, whiteSpace: 'nowrap', flexShrink: 0 }}>Official Store</span>
        </div>
        {/* Model chip — unlike Promotion ver's short model code, the USP card
            carries the full product name, so it wraps to at most 2 lines. */}
        <div style={{ background: '#F0ECE4', borderRadius: 16, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box', maxWidth: 660 }}>
          <p style={{
            margin: 0, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#4A4946', lineHeight: 1.2,
            textAlign: 'center', wordBreak: 'break-word',
            maxHeight: Math.ceil(2 * 28 * 1.2) + 4,
            overflow: 'hidden',
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}>
            {state.modelName || USP_MODEL_PLACEHOLDER}
          </p>
        </div>
      </div>

      {/* ── Product image — 660×800 frame, identical to Promotion ver ── */}
      <div style={{ position: 'absolute', left: 50, top: 280, width: 660, height: 800 }}>
        <img
          src={state.productImage.url ?? '/thumbnail/default-product-placeholder.png'}
          alt="" draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>

      {/* ── Right column (440px: 40px pad + 360px content + 40px pad) ── */}
      <div style={{
        position: 'absolute', right: 0, top: 0, height: 1200, width: 440,
        background: '#F0ECE4',
        padding: '50px 40px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30,
        overflow: 'hidden',
      }}>
        {/* Notice banner — optional, single */}
        {state.showNotice && state.notice.trim() !== '' && (
          <div style={{ width: '100%', background: '#4A4946', borderRadius: 16, padding: BOX_PAD, boxSizing: 'border-box', flexShrink: 0 }}>
            <p style={{ ...boxCopyStyleFor(state.notice, MAX_LINES), color: '#ffffff' }}>
              {state.notice}
            </p>
          </div>
        )}

        {/* Benefits — light beige, up to 4 */}
        {activeBenefits.length > 0 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: BENEFIT_GAP, flexShrink: 0 }}>
            {activeBenefits.map((b, i) => (
              <div key={i} style={{ width: '100%', background: '#F6F3EB', borderRadius: 16, padding: BOX_PAD, boxSizing: 'border-box' }}>
                <p style={{ ...boxCopyStyleFor(b, BENEFIT_MAX_LINES), color: '#4A4946' }}>
                  {b}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* USPs — white box, up to 4, hairline divider between items. The divider
            sits in a 0-height wrapper (absolute overlay) so it adds no layout
            height, only the flex gap on each side. Height HUGS its content (no
            flex-grow): with 4 benefits the column may run out of room, and a
            stretched box would push past the 1200px canvas — `minHeight: 0` +
            `flexShrink: 1` lets it give way instead. */}
        {activeUsps.length > 0 && (
          <div style={{
            width: '100%', flexShrink: 1, minHeight: 0,
            background: '#ffffff', borderRadius: 16, padding: 20, boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: USP_ROW_GAP,
            overflow: 'hidden',
          }}>
            {activeUsps.map((u, i) => (
              <React.Fragment key={u.id}>
                {i > 0 && (
                  <div style={{ width: '100%', height: 0, position: 'relative', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1.5, background: '#F0ECE4' }} />
                  </div>
                )}
                <UspRow usp={u} />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
