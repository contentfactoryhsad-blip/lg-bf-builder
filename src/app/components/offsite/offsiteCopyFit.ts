/**
 * Off-site Banner — copy length limits.
 *
 * Copy is bounded at the keyboard rather than clipped at render: once a field
 * would overflow its box, the next character simply does not go in. An ellipsis
 * tells the user their copy was cut only after they have already lost it.
 *
 * One string serves both delivery sizes, so a value has to fit BOTH. The square
 * gives head copy more width but fewer lines than the wide, so neither is
 * reliably the stricter one — every size is measured.
 *
 * Measurement happens in a hidden div rather than canvas `measureText` because
 * canvas ignores `unicode-range`, and the brand fonts split Latin and Thai
 * across faces (see brandFonts.ts). The div also gets the live `--obs-font` and
 * `--obs-tracking`, so a limit reflects the font actually selected.
 */

import { OFFSITE_SIZES } from './offsiteSizes';
import { OFFSITE_LAYOUT, type OffSiteLayout } from './offsiteTypes';

export type CopyField = 'headCopy' | 'subCopy' | 'disclaimer' | 'ctaLabel';

interface Metric {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
  /** Box the text must fit inside. */
  width: number;
  /** Line budget. A single-line field measures width instead of height. */
  maxLines: number;
  singleLine?: boolean;
}

const HEAD = 'var(--obs-font)';
const TEXT = 'var(--obs-font-text)';
const track = (em: number) => (em ? `calc(${em}em + var(--obs-tracking))` : 'var(--obs-tracking)');
/** Head copy tracks tighter on some faces — see brandHeadTrackingEm. The fit
 *  check has to measure with the tracking the banner will actually paint. */
const trackHead = (em: number) =>
  (em ? `calc(${em}em + var(--obs-tracking-head))` : 'var(--obs-tracking-head)');

function metricFor(layout: OffSiteLayout, field: CopyField): Metric {
  const { copy, cta, disclaimer, content } = layout;
  switch (field) {
    case 'headCopy':
      return {
        fontFamily: HEAD, fontSize: copy.headSize, fontWeight: 600,
        lineHeight: copy.lineHeight, letterSpacing: trackHead(0),
        width: content.width, maxLines: copy.headLines,
      };
    case 'subCopy':
      return {
        fontFamily: TEXT, fontSize: copy.subSize, fontWeight: 300,
        lineHeight: copy.subLineHeight, letterSpacing: track(copy.subTracking),
        width: content.width, maxLines: copy.subLines,
      };
    case 'disclaimer':
      return {
        fontFamily: disclaimer.role === 'head' ? HEAD : TEXT,
        fontSize: disclaimer.size, fontWeight: 300,
        lineHeight: disclaimer.lineHeight, letterSpacing: track(0),
        width: layout.w - disclaimer.padX * 2, maxLines: disclaimer.lines,
      };
    case 'ctaLabel':
      // The button hugs its label, and Figma clips that label at `maxW` — so
      // that, not the content column, is the budget a keystroke has to fit.
      return {
        fontFamily: TEXT, fontSize: cta.size, fontWeight: 300,
        lineHeight: cta.lineHeight, letterSpacing: track(0),
        width: cta.maxW, maxLines: 1, singleLine: true,
      };
  }
}

let ruler: HTMLDivElement | null = null;

function getRuler(): HTMLDivElement {
  if (ruler && ruler.isConnected) return ruler;
  ruler = document.createElement('div');
  ruler.setAttribute('aria-hidden', 'true');
  Object.assign(ruler.style, {
    position: 'fixed',
    top: '-10000px',
    left: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
    margin: '0',
    padding: '0',
    border: '0',
  } as CSSStyleDeclaration);
  document.body.appendChild(ruler);
  return ruler;
}

function measure(text: string, m: Metric): { lines: number; width: number } {
  const el = getRuler();
  el.style.fontFamily = m.fontFamily;
  el.style.fontSize = `${m.fontSize}px`;
  el.style.fontWeight = String(m.fontWeight);
  el.style.lineHeight = String(m.lineHeight);
  el.style.letterSpacing = m.letterSpacing;
  el.style.whiteSpace = m.singleLine ? 'pre' : 'pre-line';
  el.style.wordBreak = m.singleLine ? 'normal' : 'break-word';
  el.style.width = m.singleLine ? 'max-content' : `${m.width}px`;
  el.textContent = text;
  const height = el.offsetHeight;
  const width = el.offsetWidth;
  // Same rounding EDITOR_RULES.md uses for the Brand Shop head-copy ruler.
  return { lines: Math.max(1, Math.round(height / (m.fontSize * m.lineHeight))), width };
}

/** True when `text` fits every delivery size's box for this field. */
export function copyFits(field: CopyField, text: string): boolean {
  if (text === '') return true;
  return OFFSITE_SIZES.every((size) => {
    const m = metricFor(OFFSITE_LAYOUT[size.id], field);
    const { lines, width } = measure(text, m);
    return m.singleLine ? width <= m.width : lines <= m.maxLines;
  });
}

/**
 * Accept an edit only if the result still fits. Deletions always pass, so a
 * field that somehow ended up over budget can still be rescued.
 */
export function acceptCopy(field: CopyField, next: string, prev: string): boolean {
  if (next.length <= prev.length) return true;
  return copyFits(field, next);
}
