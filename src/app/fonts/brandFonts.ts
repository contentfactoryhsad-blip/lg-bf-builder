/**
 * Brand fonts for content output (Product Card / Brand Shop / ID Banner).
 *
 * Templates render via the `--obs-font` CSS variable, which BrandFontProvider
 * points at the active `render` stack. A variable rather than props because
 * Brand Shop's export mounts a second React root (StorePageModulesBuilder
 * `createRoot`) that a React context cannot reach, and because
 * ThumbnailBulkGenerator returns a different root element per phase.
 *
 * Canvas measurement cannot use the variable — `ctx.font` does not parse
 * `var()` — so it reads `measure` off the context instead.
 *
 * App UI chrome never reads either one; it stays on the `font-lgei` Tailwind
 * token, so swapping the output font never restyles the editor.
 */

export type BrandFontId = 'lg' | 'shopee' | 'lazada';

/** No live stack named a Thai font before this; Tahoma is the Windows backstop. */
const THAI = `'Noto Sans Thai', 'Leelawadee UI', Thonburi, Tahoma`;
const CJK = `'Microsoft JhengHei UI', 'Microsoft JhengHei', 'PingFang TC', 'PingFang SC', 'Hiragino Sans', 'Apple SD Gothic Neo', 'Noto Sans CJK KR'`;

export interface BrandFont {
  id: BrandFontId;
  /** Shown in the picker. */
  label: string;
  /** Font names behind the label, for the picker's secondary line. */
  detail: string;
  /** Value of `--obs-font`. */
  render: string;
  /**
   * Value of `--obs-font-text`, for body copy that uses LGEI Text rather than
   * LGEI Headline. The brand fonts ship a single family, so they reuse
   * `render`; only LG keeps a distinct text face.
   */
  renderText: string;
  /**
   * Stack for `ctx.font`. Canvas ignores `unicode-range`, so this may differ
   * from `render` when a face is range-restricted; see the Lazada note.
   */
  measure: string;
  /**
   * Extra tracking added on top of each template's own letter-spacing, as an
   * em fraction, used while the content language is NOT Thai. LG and Shopee
   * are 0, so their output is unchanged; only Lazada asks for any.
   */
  trackingEm: number;
  /**
   * Used instead of `trackingEm` while the content language is Thai.
   *
   * Split per language because the two halves of the Lazada pair want opposite
   * corrections — Euclid -1%, DB Helvethaica +1% — and `letter-spacing` is a
   * per-ELEMENT property, so one text node cannot track its Latin and its Thai
   * differently. Switching on the content language is the closest we can get:
   * a Thai banner is overwhelmingly Thai, an English one overwhelmingly Latin,
   * and the few foreign words inside either take the host language's value.
   */
  trackingEmThai: number;
  /** Families to warm up before measuring or exporting. */
  families: string[];
  /** Appended to export filenames; empty for the default so names don't churn. */
  fileTag: string;
}

export const BRAND_FONTS: BrandFont[] = [
  {
    id: 'lg',
    label: 'LG font',
    detail: 'EN: LG EI Headline, LG EI Text / TH: LINE Seed',
    // LGEI carries no Thai at all, so LINE Seed sits directly behind it,
    // pinned to the Thai block by its unicode-range. Selection is per
    // codepoint, so a run mixing both scripts splits automatically.
    render: `'LGEI Headline', 'LINE Seed Sans TH', ${CJK}, ${THAI}, sans-serif`,
    renderText: `'LGEI Text', 'LINE Seed Sans TH', ${CJK}, ${THAI}, sans-serif`,
    measure: `'LGEI Headline', 'LINE Seed Sans TH', ${CJK}, ${THAI}, sans-serif`,
    trackingEm: 0,
    trackingEmThai: 0,
    families: ['LGEI Headline', 'LGEI Text', 'LINE Seed Sans TH'],
    fileTag: '',
  },
  {
    id: 'shopee',
    label: 'Shopee font',
    detail: 'EN/TH: ShopeeFont Rounded',
    render: `'ShopeeFont Rounded', ${THAI}, ${CJK}, sans-serif`,
    renderText: `'ShopeeFont Rounded', ${THAI}, ${CJK}, sans-serif`,
    measure: `'ShopeeFont Rounded', ${THAI}, ${CJK}, sans-serif`,
    // None. The −2% here was set while brand tracking only reached the few runs
    // that already carried letter-spacing; now that it reaches every line in
    // every builder, the rounded face reads best at its own default fit.
    trackingEm: 0,
    trackingEmThai: 0,
    families: ['ShopeeFont Rounded'],
    fileTag: 'shopee',
  },
  {
    id: 'lazada',
    label: 'Lazada font',
    detail: 'EN: Euclid Circular A / TH: DB Helvethaica X',
    // Euclid leads and carries all Latin and numerals; DB Helvethaica is
    // pinned to the Thai block by its unicode-range, so nothing else can
    // land on it.
    render: `'Euclid Circular A', 'DB Helvethaica X', ${THAI}, ${CJK}, sans-serif`,
    renderText: `'Euclid Circular A', 'DB Helvethaica X', ${THAI}, ${CJK}, sans-serif`,
    // Same as render, which is now safe: canvas ignores unicode-range, but
    // Euclid genuinely has no Thai glyphs, so canvas falls through to
    // DB Helvethaica for Thai exactly as the DOM does. (Before the roles
    // swapped, Euclid had to be dropped here — canvas would otherwise have
    // measured all Latin against the digits-only face.)
    measure: `'Euclid Circular A', 'DB Helvethaica X', ${THAI}, ${CJK}, sans-serif`,
    // Euclid -0.34px at 34, DB Helvethaica +0.5px at 50 — both 1%, opposite
    // signs, which is exactly why this cannot be one number.
    trackingEm: -0.01,
    trackingEmThai: 0.01,
    families: ['Euclid Circular A', 'DB Helvethaica X'],
    fileTag: 'lazada',
  },
];

export const DEFAULT_BRAND_FONT: BrandFontId = 'lg';

export function getBrandFont(id: BrandFontId | undefined): BrandFont {
  return BRAND_FONTS.find((f) => f.id === id) ?? BRAND_FONTS[0];
}

/** The tracking to publish for a font in a given content language. Every font
 *  carries both values; only Lazada actually differs between them. */
export function brandTrackingEm(font: BrandFont, lang: string): number {
  return lang === 'th' ? font.trackingEmThai : font.trackingEm;
}

/**
 * Extra tracking carried by head copy alone, on top of `brandTrackingEm`.
 *
 * Display sizes need tighter fitting than body text does — the same optical
 * gap that reads as comfortable at 20px reads as a gap at 60px — and how much
 * tighter is a property of the face. Euclid Circular A is the wide one here, so
 * Lazada's Latin head copy takes another percent; nothing else needs it.
 *
 * Latin only. Thai is already set apart by `trackingEmThai`, and it runs the
 * opposite way — Lazada's Thai wants MORE tracking, not less, so tightening its
 * display sizes would undo the correction it was given.
 */
export function brandHeadTrackingEm(font: BrandFont, lang: string): number {
  return brandTrackingEm(font, lang) + (font.id === 'lazada' && lang !== 'th' ? -0.01 : 0);
}

/**
 * Head/sub weights for the 18–38px band, per brand and per CONTENT language.
 *
 * The band needs its own answer because the two rules that govern weight here
 * pull against each other.
 *
 * The first is the LGEI correction: LGEI's static TTFs render heavier than the
 * variable font Figma previews, so Figma's Semibold is set at 400 and its
 * Regular at 300. That is an LGEI fact — it was never true of ShopeeFont or of
 * Euclid, and applying it to them was the bug.
 *
 * The second is that a head must out-weigh the sub beneath it. Two of the
 * families here have no Light at all — LINE Seed Sans TH (LG's Thai face) ships
 * Regular / Bold / ExtraBold, ShopeeFont Rounded ships Regular upwards — so on
 * those, 400 and 300 are the SAME face and the pair reads as one weight.
 *
 * So: Figma's own numbers everywhere, and the correction only where it came
 * from — LG's Latin. LG's Thai is excluded too, and deliberately: Thai copy in
 * this catalogue is full of Latin product names, and correcting only the Latin
 * half leaves `ซื้อ LG OLED evo วันนี้` with the Thai in Bold and the model
 * name in Regular, patchy inside a single line.
 */
export type SmallCopyRole = 'head' | 'sub';

export function smallCopyWeight(font: BrandFont, lang: string, role: SmallCopyRole): number {
  const corrected = font.id === 'lg' && lang !== 'th';
  if (role === 'head') return corrected ? 400 : 600;
  return corrected ? 300 : 400;
}

/** `<tag>-` segment for export filenames, '' for the LG default. */
export function fontFileTag(id: BrandFontId | undefined): string {
  const tag = getBrandFont(id).fileTag;
  return tag ? `${tag}-` : '';
}

/**
 * Canvas counterpart to the `--obs-font` custom property.
 *
 * `ctx.font` cannot parse `var()`, and the measurement helpers that need this
 * (`countLines`, `uspCapacity`, `estimateEmFrac`, …) are module-level
 * functions called from a dozen places — threading a stack argument through
 * all of them would churn every caller. Module state is sound here for the
 * same reason the CSS variable is: App renders exactly one builder at a time,
 * and BrandFontProvider owns both values in one effect.
 */
let activeMeasureStack = BRAND_FONTS[0].measure;

export function setActiveMeasureStack(stack: string): void {
  activeMeasureStack = stack;
}

export function getActiveMeasureStack(): string {
  return activeMeasureStack;
}

/** Canvas counterpart to `--obs-tracking`, in em. */
let activeTrackingEm = BRAND_FONTS[0].trackingEm;
let activeHeadTrackingEm = BRAND_FONTS[0].trackingEm;

export function setActiveHeadTrackingEm(em: number): void {
  activeHeadTrackingEm = em;
}

/** Canvas counterpart to `--obs-tracking-head`. */
export function getActiveHeadTrackingEm(): number {
  return activeHeadTrackingEm;
}

export function setActiveTrackingEm(em: number): void {
  activeTrackingEm = em;
}

export function getActiveTrackingEm(): number {
  return activeTrackingEm;
}

/** Weights the output templates actually render at. 800 is the off-site
 *  discount row's true-Bold exception — see the note in fonts.css. */
const WARMUP_WEIGHTS = [300, 400, 600, 700, 800];

/**
 * Sample text for `document.fonts.load()`.
 *
 * Required, not optional: the second argument defaults to a single space, and
 * a space falls outside Euclid Circular A's digits-only `unicode-range`, so
 * the default matches no face and Euclid silently never loads. Characters a
 * family doesn't cover are simply ignored, so one string works for all three.
 */
const WARMUP_TEXT = '0123456789 Aa \u0E01';

/**
 * `document.fonts.load()` specs for every family/weight the templates use.
 * `document.fonts.ready` alone is not enough — it can resolve before a font is
 * ever requested, leaving measurement and export running on fallback metrics.
 */
export function fontWarmupSpecs(id: BrandFontId | undefined): string[] {
  return getBrandFont(id).families.flatMap((family) =>
    WARMUP_WEIGHTS.map((w) => `${w} 32px "${family}"`),
  );
}

/** Resolves once the active brand font is usable for measuring and exporting. */
export async function ensureBrandFontLoaded(id: BrandFontId | undefined): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  await Promise.all(
    fontWarmupSpecs(id).map((spec) => document.fonts.load(spec, WARMUP_TEXT)),
  );
  await document.fonts.ready;
}
