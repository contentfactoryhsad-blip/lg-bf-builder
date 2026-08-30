/**
 * Where each key visual sits inside the 1920×720 hero plate.
 *
 * Read off the six hero frames the designer laid out on Figma
 * `miJcDQgz0yJMskLE5a5HHj`, page "ExporttoFigma | www.lg.com | Deal Page",
 * section "Page Template" (6153:68977 … 6153:69076) — one frame per key visual,
 * because a single placement does not suit all six: the PD Slot art carries its
 * plate row low in the square and has to sit larger and higher than Main does.
 *
 * Figma expresses the placement as an `imageTransform` on the CROP fill, which
 * maps the plate's unit rect into the image's unit rect. Converting back:
 *
 *     size = 1920 / a          x = -tx · size          y = -ty · size
 *
 * (the horizontal and vertical solutions agree to 0.1px on all six, so the
 * crops really are uniform). Re-derive the same way if the frames move.
 */

export interface HeroArt {
  /** Top-left of the artwork square inside the 1920×720 plate. */
  x: number;
  y: number;
  /** Rendered edge of the (square) key visual. */
  size: number;
  /**
   * Width of the black scrim over the left of the plate ("Rectangle 1"). Drawn
   * per frame by hand, so it is the one value that differs between the two
   * artworks of a pair — it is pulled in far enough to clear that key visual's
   * own objects, not set from a formula.
   */
  scrimW: number;
}

export const HERO_ART: Record<string, HeroArt> = {
  'kv-main':                   { x: 355.3, y: -695.9, size: 2136.9, scrimW: 1035 },
  // Motion is kv-main's animated master — same square, same framing.
  'kv-main-motion':            { x: 355.3, y: -695.9, size: 2136.9, scrimW: 1035 },
  'kv-main-character':         { x: 355.3, y: -695.9, size: 2136.9, scrimW: 1038 },
  'kv-product-centric-1':      { x: 327.7, y: -695.9, size: 2146.9, scrimW: 991 },
  'kv-product-centric-2':      { x: 327.7, y: -695.9, size: 2146.9, scrimW: 1019 },
  'kv-product-slot':           { x: 477.6, y: -545.6, size: 1786.1, scrimW: 1018 },
  'kv-product-slot-character': { x: 477.6, y: -545.6, size: 1786.1, scrimW: 1029 },
};

/** The scrim starts 5px in from the plate edge on every frame. */
export const HERO_SCRIM_X = 5;

/**
 * The scrim ramp, as CSS.
 *
 * Figma's `gradientTransform` maps object space into gradient space, so with a
 * first row of [-1, 0, 1] the ramp runs `t = 1 − px` — right to left, which is
 * 270deg in CSS. Stops transfer unchanged: clear at 7.21% in from the right,
 * fully black by 52.4%, and black the rest of the way so the copy sits on a
 * solid ground rather than on the artwork.
 */
export const HERO_SCRIM =
  'linear-gradient(270deg, rgba(0,0,0,0) 7.21%, rgba(0,0,0,1) 52.4%, rgba(0,0,0,1) 100%)';

/**
 * The Motion key visual — kv-main's animated master
 * (`lg-bf-kv-main-motion-3000x3000.mp4`, derived into
 * `public/content-template/motion/`). Not a registry asset: the picker offers
 * it as its own tile, the placement is EXACTLY Main's (same square, same
 * framing), and the renderer plays the video over Main's static art so a PNG
 * export still shows the artwork where a video can't rasterise.
 */
export const HERO_MOTION_ID = 'kv-main-motion';
export const HERO_MOTION_SRC = '/content-template/motion/kv-main-motion.mp4';

/** Fallback for a key visual the board has no hero frame for yet. */
export const DEFAULT_HERO_ART: HeroArt = HERO_ART['kv-main'];

export const heroArtFor = (assetId: string | null | undefined): HeroArt =>
  (assetId && HERO_ART[assetId]) || DEFAULT_HERO_ART;

/**
 * Which LG.com banner size the hero borrows its product-plate geometry from.
 *
 * `SLOT_BOXES` stores plates as fractions of the artwork square, so any size
 * whose art is the row-of-four master describes the same plates. The hero is a
 * wide PC frame on that master, so it reads the 1920×720 row.
 */
export const HERO_SLOT_ID = 'ST0001-pc-1920x720';

/** How far the nudge control may push the artwork, in plate pixels. */
export const HERO_NUDGE_LIMIT = 400;

/**
 * Scale range for the nudge control, as a multiplier on the board's own size.
 * Wide enough to pull a lockup clear of a long headline or fill more of the
 * plate, tight enough that the result is still the framing the board designed.
 *
 * Scaling happens about the artwork's CENTRE, not its top-left, so growing the
 * art does not also slide it right and down.
 */
export const HERO_SCALE_MIN = 0.6;
export const HERO_SCALE_MAX = 1.6;
export const HERO_SCALE_STEP = 0.05;
