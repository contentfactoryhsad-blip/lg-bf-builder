/**
 * Off-site Banner — state model and per-size layout table.
 *
 * Figma: social_1200x1200 (4023:10065) / social_1200x650 (4023:10094).
 * Every number the renderer uses lives in OFFSITE_LAYOUT below, so a design
 * revision is a table edit rather than a template rewrite.
 *
 * Structure: one block = one KV, delivered as both sizes. A block holds up to
 * five products (each with its own cutout and podium) AND its own campaign
 * chrome — backdrop, logos, copy, price tags, CTA, disclaimer. Two KVs in the
 * same session share nothing but the output font.
 *
 * Product, podium and price tags are free-form rather than pinned to
 * Figma — real products differ too much in silhouette for one fixed slot. Until
 * a layer is dragged its box is DERIVED from the block's product count, so
 * adding a fourth product re-flows the row instead of stacking on top of it.
 * Once dragged, the box is stored and stops re-flowing. Everything is clamped
 * to a safe area so it never leaves the frame or collides with the copy column.
 */

import type { BrandFontId } from '../../fonts/brandFonts';
import type { TFunction } from '../../i18n/LanguageContext';
import type { CropState } from '../ImageCropModal';
import { OFFSITE_SIZES } from './offsiteSizes';
import { DEFAULT_BACKGROUND } from './offsiteLibrary';

const ASSETS = '/off-site/';
export const DEFAULT_CAMPAIGN_LOGO = ASSETS + 'campaign-logo.png';
/**
 * The three LG marks Figma allows (491:411) — full colour, white, black. Which
 * one reads depends on the backdrop, so it is a choice, not a toggle: the mark
 * itself is mandatory on every banner.
 */
export type LgLogoVariant = 'color' | 'white' | 'black';
/** CTA button face — see CTA_VARIANTS for the colors. */
export type CtaVariant = 'red' | 'black' | 'white';

/**
 * Which template the banner follows below the head copy (Figma 4138:664 /
 * 4138:791). `subCopy` is the original; `discount` drops the sub copy and puts
 * the offer's figure there instead.
 */
export type TemplateVersion = 'subCopy' | 'discount';
export const TEMPLATE_VERSIONS: { id: TemplateVersion; label: string }[] = [
  { id: 'subCopy', label: 'Sub copy ver.' },
  { id: 'discount', label: 'Discount ver.' },
];

/**
 * Figma's `pick one`: the mark in front of a discount figure. Exactly one of
 * the three, or none — they are alternatives, not layers, and two of them at
 * once is not a design the guide contains.
 */
export type DiscountBadge = 'none' | 'text' | 'baht' | 'percent';
export const DISCOUNT_BADGES: { id: DiscountBadge; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'text', label: 'Text' },
  { id: 'baht', label: '฿' },
  { id: 'percent', label: '%' },
];

/** One figure: an optional mark, the number, and its unit. */
export interface DiscountSide {
  badge: DiscountBadge;
  /** Only read when `badge` is 'text'. Set vertically, reading upwards. */
  badgeText: string;
  value: string;
  unit: string;
}

/** Figma builds the row as two figures joined by a plus. The second is opt-in:
 *  a single-figure offer is the common case, and the plus goes with it. */
export interface DiscountRow {
  left: DiscountSide;
  showRight: boolean;
  right: DiscountSide;
}
export const LG_LOGOS: { id: LgLogoVariant; label: string; src: string }[] = [
  { id: 'color', label: 'Color', src: ASSETS + 'lg-logo-color.svg' },
  { id: 'white', label: 'White', src: ASSETS + 'lg-logo-white.svg' },
  { id: 'black', label: 'Black', src: ASSETS + 'lg-logo-black.svg' },
];
export const lgLogoSrc = (v: LgLogoVariant) =>
  (LG_LOGOS.find((l) => l.id === v) ?? LG_LOGOS[0]).src;
/** Podium A is 493 × 78. Only used until an image reports its own aspect. */
export const DEFAULT_PODIUM_ASPECT = 493 / 78;

const DEFAULT_COPY = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';

/** Up to four price tags per banner — a bundle offer needs one per item. */
export const MAX_PRICE_TAGS = 4;
/** Products per KV. */
export const MAX_ITEMS_PER_BLOCK = 5;
/** Scene props per KV. Platforms are decoupled from the product count — one
 *  podium often carries two products, and a scene can have none at all. */
export const MAX_PODIUMS_PER_BLOCK = 3;
export const MAX_OBJECTS_PER_BLOCK = 3;
/** KV blocks offered up front, and the ceiling. Twenty KVs is 40 files in one
 *  ZIP — the whole point of a session is doing a campaign's worth at once. */
export const DEFAULT_OFFSITE_BLOCKS = 1;
export const MAX_OFFSITE_BLOCKS = 20;

/* ─────────────────────────────────────────── */
/* Placement                                   */
/* ─────────────────────────────────────────── */

/** A freely placed box in banner coordinates. */
export interface PlacedBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Price tags size by width only — the card's height follows its content. */
export interface PricePlacement {
  x: number;
  y: number;
  w: number;
}

export interface PriceTag {
  enabled: boolean;
  originalPrice: string;
  salePrice: string;
}

/** Rectangle the placed layers may not leave. Keeps artwork inside the frame
 *  and clear of the copy column, which is fixed chrome. */
export interface SafeArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** `null` means "still auto" — derived from the product count on render. */
export type MaybeBox = PlacedBox | null;

/** One block's boxes on one delivery size, indexed by item slot. */
export interface BlockPlacement {
  products: MaybeBox[];
  podiums: MaybeBox[];
  objects: MaybeBox[];
  /** Paint order, bottom first, as layer keys. Absent = the natural order
   *  (podiums under cutouts, price tags on top). */
  order?: string[];
  /** Layer keys pinned in place — they still paint, but the canvas ignores
   *  them so a neighbour underneath stays reachable. */
  locked?: string[];
}

/* ─────────────────────────────────────────── */
/* State                                       */
/* ─────────────────────────────────────────── */

/** One product inside a KV. */
export interface OffSiteItem {
  id: string;
  /** LG.com product page the cutout was fetched from. */
  sourceUrl: string;
  /** Read off the crawled page; used in the export filename. */
  name: string;
  image: string | null;
  /** The shot exactly as fetched or uploaded, before background removal and
   *  trimming. Kept so "Remove background again" can start over from it — and
   *  so the brush editor has a restore source that lines up pixel-for-pixel. */
  sourceImage: string | null;
  /**
   * The cutout as it stands BEFORE the transparent margin is trimmed off, so it
   * still lines up pixel-for-pixel with `sourceImage`.
   *
   * `image` cannot serve here: trimming moves every pixel, and the brush editor
   * paints one cutout over the other to let its restore brush sample the
   * original. Without this, reopening the editor had to re-cut from scratch and
   * threw away whatever the user had already brushed.
   */
  editedCutout: string | null;
  /** Natural aspect of `image`, so the auto layout can size its box. */
  aspect: number;
  /**
   * Whether this cutout is lit by the scene's lamp — the only shadow decision
   * left to a product. Everything about HOW the shadow falls belongs to the
   * banner (see OffSiteLight), because one room has one light.
   *
   * On by default: a cutout with no shadow floats. Off is for the products that
   * genuinely have no floor under them — anything wall-mounted.
   */
  showShadow: boolean;
}

/**
 * The scene's one lamp — Photoshop's Global Light, banner-wide.
 *
 * A banner is a single space, so every product in it has to be lit from the
 * same place: two cutouts throwing shadows in different directions is the
 * quickest way to make a composite look pasted together. Only the toggle is
 * per-product; direction never is.
 *
 * `angle` is where the light comes FROM, in degrees anticlockwise from screen
 * right — Photoshop's convention, so 90° is straight above and the shadow falls
 * straight down. `altitude` is how high it stands: 0° grazes the floor and
 * throws a long shadow, 90° is directly overhead and throws almost none.
 */
export interface OffSiteLight {
  angle: number;
  altitude: number;
  /** Shadow strength, as a percent — see SHADOW_OPACITY_MIN/MAX/STEP. Lives on
   *  the lamp with everything else: one room, one set of shadows. */
  opacity: number;
}

/**
 * A lamp in front of the scene, off to the right and high: the shadow runs back
 * behind the product, leaning left, and stays short.
 *
 * Not Photoshop's own 90°/30° default, which throws a long shadow forward into
 * the foreground — the wrong way round for a product shot, where the floor in
 * front of the product is where the copy and the price tag have to live.
 */
export const DEFAULT_LIGHT: OffSiteLight = { angle: 340, altitude: 65, opacity: 20 };

/** How far the shadow leans at a fully sidelit angle. Past this the projection
 *  stops reading as a floor and starts reading as a second product lying down. */
const CAST_MAX_SKEW = 55;
/** Shadow length per unit of `1/tan(altitude)`. The floor is seen almost
 *  edge-on in these banners, so the projection is heavily foreshortened. */
const CAST_DEPTH = 0.26;
/**
 * Longest shadow, as a fraction of the product's own height — approached, never
 * reached.
 *
 * A ceiling is needed because length runs away at the bottom of the dial: 1/tan
 * is 3.7 at 15° and 11.4 at 5°, so a lamp near the horizon throws a shadow
 * several times the product's height and it becomes the biggest shape on the
 * banner. Past roughly a third, it has stopped being scenery.
 *
 * Applied as a soft saturation rather than a clamp. A clamp would make every
 * lamp below some altitude produce the same shadow, and a stretch of the dial
 * that does nothing is exactly what made the earlier attempt at limiting this —
 * a floor on the altitude itself — unpleasant to use. Through `tanh` the top of
 * the range still responds, just less and less, and the working range above 50°
 * is left essentially untouched: 65° gives 11.5% where the raw figure is 12.1%.
 */
const CAST_MAX = 0.3;

/**
 * How low the lamp may be set, in degrees.
 *
 * The floor of the dial rather than a clamp behind it: the handle stops at the
 * rim, so the limit is felt while dragging instead of being applied silently
 * after the fact. It also buys precision — the same radius now spends itself
 * over 40° instead of 90°, about a degree per pixel.
 *
 * At 50° the longest shadow is under a fifth of the product's height. Below
 * that it grows fast (a third by 30°) and there is no banner here that wants
 * it. `CAST_MAX` stays as the backstop for drafts saved before this existed.
 */
export const LIGHT_ALTITUDE_MIN = 50;
/**
 * Length kept even with the lamp overhead, so a product always has contact.
 *
 * Deliberately tiny. This floor holds wherever the shadow is shorter than it,
 * which near the horizontal is a wide band of the dial: at 0.06 and a lamp at
 * 65°, every angle within 30° of the horizon came out the same length, so half
 * the dial did nothing and then the shadow flipped sides all at once. At 0.015
 * that dead band is about 7°, and the angles in between read as the different
 * lengths they are.
 */
const CAST_MIN = 0.015;
/**
 * Blur, as a fraction of the BANNER's width rather than the product's.
 *
 * Softness belongs to the lamp, not to the object under it: two products in one
 * scene lit by one light have edges of the same sharpness whatever their size.
 * Scaling it per product made a wide TV visibly blurrier than a washing machine
 * standing beside it, which reads as two different rooms.
 *
 * Roughly half what the per-product figure worked out to, because the blur now
 * applies outside the projection: the old value was chosen against a blur the
 * vertical squash was quietly cancelling, so only its sideways half was ever
 * visible — and that half was too soft on its own.
 */
const CAST_BLUR = 0.0015;

/** A silhouette cast on the floor: the cutout's own art, projected from its
 *  base, leaned by the light's direction and stretched by its height. */
export interface CastShadow {
  /**
   * Vertical scale of the projected copy — the shadow's length AND which side
   * of the base it falls on. Negative flips the copy down in front of the
   * product; positive leaves it upright, so the shadow runs back behind it and
   * the product's own art covers most of it.
   */
  scaleY: number;
  /** Lean, in degrees. Positive tips the far end left. */
  skewDeg: number;
  /** In banner pixels — see CAST_BLUR. */
  blur: number;
  opacity: number;
}

/**
 * Cast geometry from the scene's lamp — a ground-plane projection.
 *
 * A point `h` above the base lands `h / tan(altitude)` away from the product
 * along the floor, in the direction opposite the lamp. That floor offset splits
 * into two screen quantities: its sideways part is a lean (`skewX`), and its
 * depth part is a vertical scale, foreshortened by `CAST_DEPTH` because these
 * banners view the floor almost edge-on.
 *
 * The depth part is what carries the shadow BEHIND the product. A lamp at the
 * back of the scene throws the shadow towards the viewer, down the screen; a
 * lamp at the front throws it away, up the screen and behind the cutout. Which
 * is exactly Photoshop's drop-shadow convention — angle 90° puts the shadow
 * straight down, 270° straight up — so the dial reads the way it looks.
 *
 * Sidelight, dead on the horizontal, is the one degenerate case: the shadow
 * lies along the viewer's own eye line and has no depth to show. `CAST_MIN`
 * keeps a sliver there rather than letting it vanish.
 */
export function castShadow(layout: OffSiteLayout, light: OffSiteLight): CastShadow {
  const azimuth = (light.angle * Math.PI) / 180;
  // Clamped short of the horizon: 1/tan(0) is infinite.
  const altitude = (Math.min(90, Math.max(LIGHT_ALTITUDE_MIN, light.altitude)) * Math.PI) / 180;
  const length = Math.min(1 / Math.tan(altitude), 6);
  // Negative = flipped down in front. Zero (pure sidelight) counts as in front.
  const depth = -Math.sin(azimuth) * length * CAST_DEPTH;
  // Saturating, so no dial position is wasted — see CAST_MAX.
  const scale = Math.max(CAST_MAX * Math.tanh(Math.abs(depth) / CAST_MAX), CAST_MIN);
  return {
    scaleY: depth > 0 ? scale : -scale,
    // A positive skew carries the far end (above the origin) to the left, which
    // is where a lamp on the right belongs — hence the unnegated cosine.
    skewDeg: Math.max(
      -CAST_MAX_SKEW,
      Math.min(CAST_MAX_SKEW, (Math.atan(length * Math.cos(azimuth)) * 180) / Math.PI),
    ),
    blur: layout.w * CAST_BLUR,
    opacity: light.opacity / 100,
  };
}

/**
 * Shadow strength, in percent: a slider that snaps to tens.
 *
 * The step is what keeps it usable — the difference between 34% and 36% is not
 * a decision worth having, and free movement invites nudging a shadow forever.
 *
 * The range starts at 10 rather than 30 because what it now multiplies is a
 * black silhouette, not the pre-lightened shadow art it was written for: a
 * tenth of solid black is a perfectly visible shadow, where a tenth of that art
 * was indistinguishable from off. The ceiling stays at 60 — past that a cast
 * shadow reads as a second, darker product.
 */
export const SHADOW_OPACITY_MIN = 10;
export const SHADOW_OPACITY_MAX = 60;
export const SHADOW_OPACITY_STEP = 10;

/**
 * How much of the cutout's height, measured up from its base, carries the drop
 * shadow at full strength before it starts fading out. Above this it ramps to
 * nothing at the top, so the shadow belongs to where the product meets the
 * floor rather than hanging off its whole silhouette.
 */
export const SHADOW_FADE_SOLID = 0.1;

/** A scene prop picked from the library or uploaded — a podium or a decorative
 *  object. Both behave identically: added to the KV, then placed. */
export interface OffSiteProp {
  id: string;
  src: string;
  aspect: number;
  /**
   * Mirrored left-to-right. The library ships each podium and object lit from
   * one side, so a scene that wants the highlight on the other — or simply the
   * same shape reading differently beside its twin — flips it rather than
   * needing a second file.
   *
   * Optional: drafts written before it existed are unmirrored.
   */
  flipX?: boolean;
}

/** One KV's chrome: everything that is not a product. */
export interface OffSiteCampaign {
  /** Flat color behind everything. The backdrop only covers its blind, so on
   *  the wide this is the whole left-hand column the copy sits on.
   *
   *  Kept as the fallback for `backgroundColorBySize`, which is what actually
   *  renders — a draft saved before that field existed reads from here. */
  backgroundColor: string;
  /**
   * Per delivery size, because the two do not fade in from the same side: the
   * square meets the scene along its top edge and the wide along its left, and
   * a scene is rarely the same tone on both.
   *
   * Always holds an entry for every size — a size left out would fall back to
   * the shared field and move whenever another size's picker did, which is the
   * opposite of the point. Still optional on the type so a draft written before
   * this field can be restored and filled in.
   */
  backgroundColorBySize?: Record<string, string>;
  /**
   * Ink for the head copy, and for the sub copy on the sub copy version. Free
   * colour: the copy sits on the flat canvas the user also picks, so it is not
   * limited to black and white the way the disclaimer is.
   */
  copyColor: string;
  /** Ink for the discount row, so the offer can be set apart from the head
   *  copy above it. Only read on the discount version. Optional — a draft
   *  written before it existed falls back to `copyColor`. */
  discountColor?: string;
  /**
   * Ink for the sale price on every price tag. Free colour, like the discount
   * row: the tag is the offer, and a campaign that has settled on its own
   * accent should not be stuck with LG red for the one figure that has to carry
   * it. Optional — a draft written before it falls back to LG_RED.
   */
  priceColor?: string;
  /** Ink for the disclaimer. Black or white only: it is small type that has to
   *  stay legible wherever the scene fades in behind it, and a mid tone fails
   *  against one backdrop or the other. Optional for the same draft reason. */
  disclaimerColor?: string;
  /** What the scene is framed FROM: a library file, or an upload normalised to
   *  the guide's square. Kept alongside the framed result so "edit crop" can
   *  zoom back out — re-cropping the crop could only ever zoom further in. */
  backgroundSource: string | null;
  /** Last framing, so reopening the crop resumes instead of resetting. */
  backgroundCrop?: CropState;
  /** One square scene, placed per size — see OffSiteLayout.backdrop. Both sizes
   *  show the same placement, so there is no per-size framing to store. */
  backgroundOriginal: string | null;
  /**
   * The scene's lamp. Campaign-wide rather than per-banner: a set of banners is
   * one shoot, and two KVs lit from different sides do not read as a campaign
   * any more than two different inks would. Optional — drafts written before it
   * fall back to DEFAULT_LIGHT.
   */
  light?: OffSiteLight;
  /** Which LG mark. Never hidden — Figma marks only the campaign lockup optional. */
  lgLogoVariant: LgLogoVariant;
  /** The campaign lockup beside it, which IS optional. */
  showLogos: boolean;
  campaignLogoUrl: string | null;
  /**
   * Which template the head copy is followed by. Shared: the two versions are
   * different campaign propositions, not a per-banner styling choice.
   * Optional so a draft written before the discount version opens on `subCopy`.
   */
  templateVersion?: TemplateVersion;
  headCopy: string;
  showSubCopy: boolean;
  subCopy: string;
  /** The discount version's figure. Per banner — each one prices its own
   *  product. Optional for the same draft reason as `templateVersion`. */
  discount?: DiscountRow;
  /** Content is campaign-wide; only the position is per size. */
  priceTags: PriceTag[];
  /** `null` until dragged — see resolvePricePlacement. */
  pricePlacements: Record<string, (PricePlacement | null)[]>;
  showCta: boolean;
  ctaLabel: string;
  /** Shared with the LG mark rather than set per banner — the button is brand
   *  chrome, and a campaign that mixes red and black CTAs reads as a mistake. */
  ctaVariant: CtaVariant;
  showDisclaimer: boolean;
  disclaimer: string;
}

/** One KV. Rendered once per delivery size. */
export interface OffSiteBlock {
  id: string;
  /** Overrides the auto name (first product's) in the export filename. */
  title: string;
  /** This KV's own chrome — edited in the panel while the block is selected. */
  campaign: OffSiteCampaign;
  items: OffSiteItem[];
  /** Platforms, then decorative props. Both start empty — a KV opts into them. */
  podiums: OffSiteProp[];
  objects: OffSiteProp[];
  /** Boxes per OffSiteSize.id. Entries stay null until dragged. */
  placements: Record<string, BlockPlacement>;
}

export interface OffSiteState {
  blocks: OffSiteBlock[];
  fontId: BrandFontId;
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}${(seq += 1)}-${seq * 7919}`;

export function makeOffSiteProp(src: string, aspect: number): OffSiteProp {
  return { id: nextId('p'), src, aspect, flipX: false };
}

export function makeOffSiteItem(): OffSiteItem {
  return {
    id: nextId('i'),
    sourceUrl: '',
    name: '',
    image: null,
    sourceImage: null,
    editedCutout: null,
    aspect: 1,
    showShadow: true,
  };
}

function makeBlockPlacements(): Record<string, BlockPlacement> {
  const out: Record<string, BlockPlacement> = {};
  for (const s of OFFSITE_SIZES) {
    out[s.id] = {
      products: Array(MAX_ITEMS_PER_BLOCK).fill(null),
      podiums: Array(MAX_PODIUMS_PER_BLOCK).fill(null),
      objects: Array(MAX_OBJECTS_PER_BLOCK).fill(null),
    };
  }
  return out;
}

/**
 * A new KV starts from `seed` — the campaign of the block it was added after —
 * so a second KV in the same campaign does not mean re-uploading the backdrop
 * and retyping the copy. It is a starting point only: the copy is deep enough
 * that editing one block never touches another.
 */
export function makeOffSiteBlock(t: TFunction, seed?: OffSiteCampaign): OffSiteBlock {
  return {
    id: nextId('b'),
    title: '',
    campaign: seed ? cloneCampaign(seed) : makeOffSiteCampaign(t),
    items: Array.from({ length: MAX_ITEMS_PER_BLOCK }, () => makeOffSiteItem()),
    podiums: [],
    objects: [],
    placements: makeBlockPlacements(),
  };
}

/** All four start off. A banner opens on its scene and copy; a price is a
 *  campaign decision, so it is turned on rather than removed. */
function makePriceTags(): PriceTag[] {
  return Array.from({ length: MAX_PRICE_TAGS }, () => ({
    enabled: false,
    originalPrice: '$729.00',
    salePrice: '$624.68',
  }));
}

function makePricePlacements(): Record<string, (PricePlacement | null)[]> {
  const out: Record<string, (PricePlacement | null)[]> = {};
  for (const s of OFFSITE_SIZES) out[s.id] = Array(MAX_PRICE_TAGS).fill(null);
  return out;
}

export function makeOffSiteCampaign(t: TFunction): OffSiteCampaign {
  return {
    // The per-size windows are derived on mount rather than shipped as extra
    // files, so a change to OffSiteLayout.backdrop can never leave a stale crop
    // baked into the repo.
    backgroundColor: DEFAULT_BG_COLOR,
    backgroundColorBySize: bgColorsBySize(DEFAULT_BG_COLOR),
    copyColor: COPY_COLORS[0],
    // The one free-colour run starts on the brand red rather than the copy's
    // black: the discount figures are the banner's headline offer, and a red
    // that has to be dialled in by hand on every campaign is a step nobody
    // would skip on purpose.
    discountColor: LG_RED,
    priceColor: LG_RED,
    disclaimerColor: COPY_COLORS[0],
    backgroundSource: DEFAULT_BACKGROUND,
    backgroundOriginal: DEFAULT_BACKGROUND,
    light: { ...DEFAULT_LIGHT },
    lgLogoVariant: 'color',
    showLogos: true,
    campaignLogoUrl: DEFAULT_CAMPAIGN_LOGO,
    templateVersion: 'subCopy',
    headCopy: t(DEFAULT_COPY),
    showSubCopy: true,
    subCopy: t(DEFAULT_COPY),
    discount: makeDiscountRow(t),
    priceTags: makePriceTags(),
    pricePlacements: makePricePlacements(),
    showCta: true,
    ctaLabel: t('Shop now'),
    ctaVariant: 'red',
    showDisclaimer: true,
    disclaimer: t('*T&Cs apply'),
  };
}

/** Figma's own figure (4138:876): UP TO 55% + [coupon] 25%. */
export function makeDiscountRow(t: TFunction): DiscountRow {
  return {
    left: { badge: 'text', badgeText: t('UP TO'), value: '55', unit: '%' },
    showRight: true,
    right: { badge: 'text', badgeText: t('EXTRA'), value: '25', unit: '%' },
  };
}

/** Deep enough that nothing is shared by reference between two blocks. */
export function cloneCampaign(c: OffSiteCampaign): OffSiteCampaign {
  const placements: Record<string, (PricePlacement | null)[]> = {};
  for (const [k, v] of Object.entries(c.pricePlacements)) {
    placements[k] = v.map((p) => (p ? { ...p } : null));
  }
  return {
    ...c,
    backgroundColorBySize: { ...c.backgroundColorBySize },
    light: c.light && { ...c.light },
    discount: c.discount && {
      left: { ...c.discount.left },
      showRight: c.discount.showRight,
      right: { ...c.discount.right },
    },
    priceTags: c.priceTags.map((tg) => ({ ...tg })),
    pricePlacements: placements,
  };
}

export function makeOffSiteState(t: TFunction): OffSiteState {
  return {
    blocks: Array.from({ length: DEFAULT_OFFSITE_BLOCKS }, () => makeOffSiteBlock(t)),
    fontId: 'lg',
  };
}

/** Items with artwork, in slot order — the ones that actually render. */
export function visibleItems(block: OffSiteBlock): { item: OffSiteItem; slot: number }[] {
  return block.items
    .map((item, slot) => ({ item, slot }))
    .filter(({ item }) => item.image !== null);
}

/** Blocks that will be rendered and exported. A row the user never filled in is
 *  scaffolding, not a KV. */
export function filledBlocks(blocks: OffSiteBlock[]): OffSiteBlock[] {
  return blocks.filter((b) => b.items.some((i) => i.image !== null || i.sourceUrl.trim() !== ''));
}

/** Filename stem for a block. */
export function blockName(block: OffSiteBlock, ordinal: number): string {
  const raw = block.title || block.items.find((i) => i.name)?.name || '';
  const slug = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Drop trailing all-digit groups. The auto name is the crawled product title,
  // which usually ends in a spec rather than an identity — "WashTower 21/16"
  // slugs to washtower-21-16, and the capacity says nothing about which file
  // this is. Groups carrying a letter (c4, oled65) are identity and stay, as
  // does a name that is nothing but digits.
  const trimmed = slug.replace(/(-\d+)+$/, '');
  return trimmed || slug || `kv-${ordinal + 1}`;
}

/* ─────────────────────────────────────────── */
/* Layout table                                */
/* ─────────────────────────────────────────── */

/** Which of the two brand faces a text run uses. */
export type FontRole = 'head' | 'text';

/**
 * A brand font's own type settings for the discount row (Figma 4139:304).
 *
 * Everywhere else a font swap only changes the family: `size-adjust` in
 * fonts.css already trims each face so ONE template size reads the same across
 * all three. The discount row is the exception — the designer normalised these
 * figures by hand in Figma instead, stating a size per face.
 *
 * Both corrections at once would double up, so the sizes below are Figma's raw
 * px and `textAdjust`/`figureAdjust` divide the CSS `size-adjust` back out.
 * Without that the Lazada label lands ~37% oversized, which is the whole reason
 * this struct exists.
 *
 * Tracking is likewise ABSOLUTE — Figma states the full letter-spacing for
 * these runs, so `--obs-tracking` is deliberately not folded in.
 */
export interface DiscountFontSpec {
  /** The rotated label's line box across the row. A layout number, not type:
   *  it is NOT divided by `textAdjust`. */
  textW: number;
  /** All three as Figma states them, before the size-adjust division. */
  textSize: number;
  numSize: number;
  unitSize: number;
  /** em OF THE FIGMA SIZE, on the label and the number. The unit is never
   *  tracked. Resolved to px so the divided size cannot shrink it. */
  tracking: number;
  /** `size-adjust` of the face that run lands on, from fonts.css. Kept as two
   *  fields because Figma authors the label and the figures separately and has
   *  had them on different families before. */
  textAdjust: number;
  figureAdjust: number;
  /**
   * Figma names a face per run rather than going through fonts.css's
   * substitution table, and the number and the unit do not always agree — on
   * Lazada the number is Euclid Semibold and the unit Euclid Bold. 800 is the
   * true-Bold slot the two brand families declare for this row alone.
   * The label is 600 in every variant, so it stays a constant in the template.
   */
  numWeight: number;
  unitWeight: number;
  /** Figure → plus → figure, the row's own gap. */
  rowGap: number;
  /** Label → figure. Lazada tightens it; the other two do not. */
  groupGap: number;
  /** Number → unit. Only Shopee opens this at all. */
  figureGap: number;
}

export interface OffSiteLayout {
  w: number;
  h: number;
  /** Square stacks its content centered at the top; wide runs a left column. */
  align: 'center' | 'left';
  content: { top: number; left: number; width: number };
  logo: { lgW: number; lgH: number; gap: number; dividerH: number; campaignH: number };
  gapLogoToCopy: number;
  copy: {
    gap: number;
    /** Head and sub carry their own leading — the wide banner sets them apart. */
    lineHeight: number;
    subLineHeight: number;
    headSize: number;
    headLines: number;
    subSize: number;
    subLines: number;
    /** em, folded into calc() with --obs-tracking. */
    subTracking: number;
  };
  /** Head copy → the discount row, on the discount version. */
  gapCopyToDiscount: number;
  /**
   * The discount row (Figma 4138:876): [label] number unit  +  [label] number
   * unit. The boxes and gaps here are shared; the type sizes are not, so they
   * live per brand font in `byFont`.
   */
  discount: {
    h: number; plus: number;
    badgeW: number; badgeH: number;
    /** The rotated label's length limit — its height once turned. */
    textMaxLen: number;
    /** Figma clips each run to one line, and to a width as well. */
    numMaxH: number; numMaxW: number;
    unitMaxH: number; unitMaxW: number; unitPadY: number;
    /** Type sizes per brand font — see `DiscountFontSpec`. */
    byFont: Record<BrandFontId, DiscountFontSpec>;
  };
  gapCopyToCta: number;
  /** The button hugs its label; `maxW` is the width Figma clips that LABEL to,
   *  so the button itself tops out at `maxW + 2 × padX`. */
  cta: { h: number; padX: number; radius: number; size: number; lineHeight: number; maxW: number };
  /** Price badge metrics at the reference width `w`; everything scales with the
   *  dragged width so resizing keeps the card's proportions. */
  price: {
    w: number; pad: number; gap: number; radius: number; shadow: string;
    /** Font size, and the box Figma clips that line to. They are NOT the same:
     *  the sale price is set at 56 inside a 52-tall box, which is what makes the
     *  card 126 rather than 130. Layout uses the boxes, type uses the sizes. */
    originalSize: number; originalH: number; saleSize: number; saleH: number;
    /** Default corner for each of the four tags. */
    slots: { x: number; y: number }[];
  };
  disclaimer: {
    padX: number; padBottom: number; size: number; lines: number;
    lineHeight: number; role: FontRole; opacity: number;
  };
  /** Drives the auto row: products stand side by side on `baseline`, each in an
   *  equal cell of the safe area inset by `margin`. */
  stage: { margin: number; baseline: number; maxPodiumW: number; maxProductH: number };
  /**
   * Where the backdrop source — one BACKDROP_SOURCE_SIZE square — is drawn, in
   * banner coordinates. It is PLACED, not cropped: the square size sets the
   * scale and the corner sets the offset, exactly as Figma's Background image
   * instance does.
   */
  backdrop: { x: number; y: number; size: number };
  /**
   * Figma's `blind`: the window the backdrop shows through, and how it fades in.
   *
   * The mask is not a hard rectangle — the scene is fully hidden until
   * `hiddenUntil`, ramps in from there, and is fully solid at `solidAt`, both
   * fractions of the window measured from `from`. That ramp is what keeps the
   * copy on flat color and lets the scene emerge underneath it; a hard edge
   * reads as a pasted-on panel. `hiddenUntil: 0` starts the ramp at the very
   * edge, which is what the wide banner does.
   */
  blind: {
    x: number; y: number; w: number; h: number;
    fade: { from: 'top' | 'left'; hiddenUntil: number; solidAt: number };
  };
  /**
   * Contact shadow under the product cutout — Figma puts it on the `product`
   * group only (4113:746 square / 4137:631 wide), never on podiums or props.
   * Both sizes carry the same value, unscaled: the designer sets one blur for
   * both frames rather than shrinking it with the canvas. It stays per-size
   * anyway, because they have been authored apart before.
   */
  productShadow: string;
  objectDefault: PlacedBox;
  /** Everything placeable is clamped into this rect — below the copy column on
   *  the square, right of it on the wide. */
  safeArea: SafeArea;
}

const SQUARE: OffSiteLayout = {
  w: 1200,
  h: 1200,
  align: 'center',
  content: { top: 60, left: 80, width: 1040 },
  logo: { lgW: 102.151, lgH: 45, gap: 24, dividerH: 42, campaignH: 40 },
  gapLogoToCopy: 20,
  // Figma 4137:230 — head clipped to 162 (2 × 74 × 1.1), sub to 46 (1 line).
  copy: {
    gap: 14, lineHeight: 1.1, subLineHeight: 1.1,
    headSize: 74, headLines: 2, subSize: 42, subLines: 1, subTracking: 0,
  },
  // Figma 4138:700 — the discount row's own gap, set on a different frame from
  // the sub copy's and wider than it.
  gapCopyToDiscount: 18,
  discount: {
    h: 120, plus: 44.5,
    badgeW: 53.301, badgeH: 84,
    textMaxLen: 140,
    numMaxH: 120, numMaxW: 250,
    unitMaxH: 60, unitMaxW: 100, unitPadY: 10,
    // Figma 4139:304 — one variant per brand font. Sizes, tracking, weights
    // AND the two inner gaps are all authored per variant.
    byFont: {
      lg: {
        textW: 30, textSize: 30, numSize: 120, unitSize: 60, tracking: 0,
        textAdjust: 1, figureAdjust: 1, numWeight: 700, unitWeight: 700,
        rowGap: 20, groupGap: 10, figureGap: 0,
      },
      shopee: {
        textW: 28, textSize: 28, numSize: 118, unitSize: 55, tracking: -0.02,
        textAdjust: 0.95, figureAdjust: 0.95, numWeight: 800, unitWeight: 700,
        rowGap: 22, groupGap: 10, figureGap: 4,
      },
      lazada: {
        textW: 28, textSize: 28, numSize: 116, unitSize: 52, tracking: -0.02,
        textAdjust: 0.93, figureAdjust: 0.93, numWeight: 700, unitWeight: 700,
        rowGap: 20, groupGap: 10, figureGap: 4,
      },
    },
  },
  gapCopyToCta: 30,
  // Figma 4116:8899 — the shared CTA component, placed here at 1:1.
  cta: { h: 78, padX: 36, radius: 16, size: 30, lineHeight: 1, maxW: 300 },
  price: {
    // Figma 4115:8892 — 230 × 126 at (842, 437).
    w: 230, pad: 20, gap: 10, radius: 20,
    shadow: '2px 2px 4px rgba(0,0,0,0.1)',
    originalSize: 24, originalH: 24, saleSize: 56, saleH: 52,
    // The first is Figma's; the rest fan out from it so a second tag is not
    // dropped on top of the first.
    slots: [{ x: 842, y: 437 }, { x: 842, y: 587 }, { x: 128, y: 437 }, { x: 128, y: 587 }],
  },
  // Figma 4023:10081 — LG EI Text at 20/1.1, clipped to 44 (2 lines), 80% ink.
  disclaimer: { padX: 40, padBottom: 40, size: 20, lines: 2, lineHeight: 1.1, role: 'text', opacity: 0.8 },
  // `baseline` is where podium A stands in Figma (4113:613, bottom 664.71
  // inside a frame starting at 400); `maxPodiumW` is that same podium's width.
  // Both sizes read the pair off the SAME podium, which is what makes their
  // ratio the scale mapBoxToSize uses — see PRIMARY_SIZE_ID.
  stage: { margin: 40, baseline: 1064.71, maxPodiumW: 473.72, maxProductH: 460 },
  // Figma 4113:504 / 4113:545 — the 1300 source is placed 50 outside the frame
  // on every side, so the square shows all of it but the outer 50.
  backdrop: { x: -50, y: -50, size: 1300 },
  // Figma 4113:545 — vertical ramp: nothing shows for the first 30% (y 360),
  // then it comes in over 10% and is fully open from 40% (y 480) down.
  blind: { x: 0, y: 0, w: 1200, h: 1200, fade: { from: 'top', hiddenUntil: 0.3, solidAt: 0.4 } },
  productShadow: '0px 6px 3px rgba(0,0,0,0.5)',
  // Figma object A, 4113:621 — (784.037, 548.728) inside a frame that starts at 400.
  objectDefault: { x: 784.037, y: 948.728, w: 186.616, h: 125.169 },
  // The `object & podium` frame (4113:611), which the designer sets to say
  // where artwork may go. It deliberately reaches up behind the copy column —
  // a product peeking past the head copy is intended, so this is NOT clamped
  // to the Content frame. Figma's separate `product` frame (4113:746) starts
  // 13px higher; one rect for everything is close enough that splitting them
  // would only add a second clamp to thread through every helper.
  safeArea: { x: 0, y: 400, w: 1200, h: 800 },
};

const WIDE: OffSiteLayout = {
  w: 1200,
  h: 650,
  align: 'left',
  content: { top: 40, left: 40, width: 486 },
  logo: { lgW: 91.936, lgH: 40.5, gap: 21.6, dividerH: 37.8, campaignH: 36 },
  gapLogoToCopy: 40,
  // Figma 4137:283 / 4138:802 — head runs 4 lines (220 ≈ 4 × 52 × 1.06) on both
  // versions, sub 2 (74 ≈ 2 × 34 × 1.1). The sub is the one run that does not
  // share the head's leading, so it carries its own.
  copy: {
    gap: 12, lineHeight: 1.06, subLineHeight: 1.1,
    headSize: 52, headLines: 4, subSize: 34, subLines: 2, subTracking: -0.02,
  },
  // Figma 4138:801 / 4138:898 — the square's row at a flat 0.75 (90 / 120).
  gapCopyToDiscount: 14,
  discount: {
    h: 90, plus: 33.375,
    badgeW: 39.976, badgeH: 63,
    textMaxLen: 105,
    numMaxH: 90, numMaxW: 187.5,
    unitMaxH: 45, unitMaxW: 75, unitPadY: 7.5,
    // The square's variants at the same 0.75. Tracking is an em fraction, the
    // adjusts are the faces' own and the weights are slots, so none of those
    // scale — only the lengths do.
    byFont: {
      lg: {
        textW: 22.5, textSize: 22.5, numSize: 90, unitSize: 45, tracking: 0,
        textAdjust: 1, figureAdjust: 1, numWeight: 700, unitWeight: 700,
        rowGap: 15, groupGap: 7.5, figureGap: 0,
      },
      shopee: {
        textW: 21, textSize: 21, numSize: 88.5, unitSize: 41.25, tracking: -0.02,
        textAdjust: 0.95, figureAdjust: 0.95, numWeight: 800, unitWeight: 700,
        rowGap: 16.5, groupGap: 7.5, figureGap: 3,
      },
      lazada: {
        textW: 21, textSize: 21, numSize: 87, unitSize: 39, tracking: -0.02,
        textAdjust: 0.93, figureAdjust: 0.93, numWeight: 700, unitWeight: 700,
        rowGap: 15, groupGap: 7.5, figureGap: 3,
      },
    },
  },
  gapCopyToCta: 28,
  // Figma 4116:8915 — the same component at 0.897436, the scale the wide banner
  // carries the CTA lockup at (78 → 70). The radius is the one value the
  // designer left unscaled.
  cta: { h: 70, padX: 32.308, radius: 16, size: 26.923, lineHeight: 1, maxW: 269.231 },
  price: {
    // Figma 4137:628 — the square's card carried over by the 0.696032 backdrop
    // transform, which is exactly what Figma did to it.
    w: 160.087, pad: 13.921, gap: 6.96, radius: 13.921,
    shadow: '1.392px 1.392px 2.784px rgba(0,0,0,0.1)',
    originalSize: 16.705, originalH: 17, saleSize: 38.978, saleH: 36.194,
    slots: [
      { x: 1023.865, y: 84.126 }, { x: 1023.865, y: 188.531 },
      { x: 526.899, y: 84.126 }, { x: 526.899, y: 188.531 },
    ],
  },
  // Figma 4024:11630 — auto leading, which measures 1.15 on this face; clipped
  // to 46, exactly two of those lines.
  disclaimer: {
    padX: 40, padBottom: 20, size: 20, lines: 2, lineHeight: 1.15, role: 'text', opacity: 1,
  },
  // Every number here is the square's carried over by the backdrop transform
  // (× 0.696032), which is how the designer built this frame: Figma's own
  // podium A lands on 521.032 wide and 329.724 across, to the third decimal.
  stage: { margin: 27.841, baseline: 521.032, maxPodiumW: 329.724, maxProductH: 320.175 },
  // Figma 4137:615 — the 1300 source at 0.696032, its top above the frame, with
  // the blind showing a 797-wide window of it on the right.
  backdrop: { x: 403.005, y: -254.841, size: 904.841 },
  // Figma 4113:517 — horizontal ramp, clear until 25.34% (x 202 into the window).
  blind: { x: 403.005, y: 0, w: 796.995, h: 650, fade: { from: 'left', hiddenUntil: 0, solidAt: 0.253377 } },
  productShadow: '0px 6px 3px rgba(0,0,0,0.5)',
  // Both defaults below are the square's, carried over by mapBoxToSize — kept
  // here so the table reads as the Figma frame does. Only the primary size's
  // copies are actually consulted.
  // Figma object A, 4137:626 — the square's, carried over. Figma's own frame
  // sits 3px left of the transform (it rounded `object & podium` to x 526), too
  // little to be worth a second rule for one default.
  objectDefault: { x: 983.521, y: 440.305, w: 129.891, h: 87.122 },
  // The `object & podium` frame (4137:616): the full height of the right-hand
  // 674px. The scene still bleeds past its left edge — Figma has podium G at
  // -91.19 — which BLEEDS_SIDEWAYS allows.
  safeArea: { x: 526, y: 0, w: 674, h: 650 },
};

export const OFFSITE_LAYOUT: Record<string, OffSiteLayout> = {
  '1200x1200': SQUARE,
  '1200x650': WIDE,
};

/* ─────────────────────────────────────────── */
/* Auto layout                                 */
/* ─────────────────────────────────────────── */

/** The size a KV is designed at. Every other size starts from its layout. */
export const PRIMARY_SIZE_ID = OFFSITE_SIZES[0].id;

/**
 * Carry a box from the size it was arranged on to another size.
 *
 * Both sizes place the same square backdrop, so that placement IS the shared
 * coordinate system: mapping through it puts every layer exactly where Figma
 * puts the corresponding one, to a hundredth of a pixel. (Deriving the scale
 * from the frames instead does not work — the wide `object & podium` frame is
 * the full 650 tall, not the square's frame scaled down.)
 */
export function mapBoxToSize(
  box: PlacedBox, from: OffSiteLayout, to: OffSiteLayout, kind: LayerKind,
): PlacedBox {
  const k = to.backdrop.size / from.backdrop.size;
  return clampLayerBox(
    {
      x: to.backdrop.x + (box.x - from.backdrop.x) * k,
      y: to.backdrop.y + (box.y - from.backdrop.y) * k,
      w: box.w * k,
      h: box.h * k,
    },
    to,
    kind,
  );
}

/** Where a price tag sits: dragged position, else the primary size's position
 *  carried over, else the Figma default corner. */
export function resolvePricePlacement(
  layout: OffSiteLayout, block: OffSiteBlock, sizeId: string, index: number,
): PricePlacement {
  const stored = block.campaign.pricePlacements[sizeId]?.[index];
  // Clamp on read as well as on drag: a draft saved before the range existed,
  // or one restored against a size whose default has since changed, would
  // otherwise keep a width the editor can no longer produce.
  if (stored) {
    const range = priceWidthRange(layout);
    return { ...stored, w: Math.min(Math.max(stored.w, range.min), range.max) };
  }
  const primaryStored = block.campaign.pricePlacements[PRIMARY_SIZE_ID]?.[index];
  // Untouched on the primary too: use this size's own Figma corner. The
  // designer places the card per size rather than transforming it — on the wide
  // it sits 22px left of where the backdrop transform would put it — so
  // inheriting is only right once the user has actually arranged one.
  if (sizeId === PRIMARY_SIZE_ID || !primaryStored) {
    return { ...layout.price.slots[index], w: layout.price.w };
  }
  const primary = OFFSITE_LAYOUT[PRIMARY_SIZE_ID];
  const from = resolvePricePlacement(primary, block, PRIMARY_SIZE_ID, index);
  const tag = block.campaign.priceTags[index];
  const box = mapBoxToSize(
    { x: from.x, y: from.y, w: from.w, h: priceCardHeight(primary, tag, from.w) },
    primary,
    layout,
    'price',
  );
  return { x: box.x, y: box.y, w: box.w };
}

/** Fan repeated defaults out so a second prop is not hidden under the first. */
function cascade(base: PlacedBox, index: number, aspect: number): PlacedBox {
  const h = base.h;
  const w = aspect > 0 ? h * aspect : base.w;
  return { x: base.x + index * 36, y: base.y + index * 36, w, h };
}

function cell(layout: OffSiteLayout, count: number, ordinal: number) {
  const { safeArea: safe, stage } = layout;
  const bandX = safe.x + stage.margin;
  const bandW = Math.max(1, safe.w - stage.margin * 2);
  const cellW = bandW / Math.max(1, count);
  return { cx: bandX + cellW * (ordinal + 0.5), cellW };
}

/** Auto podium box: centred on the stage, fanned out so a second platform is
 *  not hidden under the first. */
export function autoPodiumBox(layout: OffSiteLayout, index: number, aspect: number): PlacedBox {
  const w = layout.stage.maxPodiumW;
  const h = w / (aspect > 0 ? aspect : DEFAULT_PODIUM_ASPECT);
  const cx = layout.safeArea.x + layout.safeArea.w / 2;
  return { x: cx - w / 2 + index * 40, y: layout.stage.baseline - h - index * 20, w, h };
}

/** Auto product box, standing on the stage baseline. */
export function autoProductBox(
  layout: OffSiteLayout, count: number, ordinal: number, aspect: number,
): PlacedBox {
  const { cx, cellW } = cell(layout, count, ordinal);
  const a = aspect > 0 ? aspect : 1;
  let h = Math.min(layout.stage.maxProductH, cellW * 1.15);
  let w = h * a;
  const maxW = cellW * 0.9;
  if (w > maxW) {
    w = maxW;
    h = w / a;
  }
  return { x: cx - w / 2, y: layout.stage.baseline - h, w, h };
}

export interface ResolvedItem {
  slot: number;
  item: OffSiteItem;
  product: PlacedBox;
}

/** Resolve one block's product boxes on one size: stored where dragged, derived
 *  where not. Returned in visible order, carrying each entry's slot index so a
 *  drag can be written back to the right place. */
export function resolveBoxes(
  layout: OffSiteLayout,
  block: OffSiteBlock,
  sizeId: string,
): ResolvedItem[] {
  const stored = block.placements[sizeId];
  const shown = visibleItems(block);
  return shown.map(({ item, slot }, ordinal) => ({
    slot,
    item,
    product:
      stored?.products[slot] ??
      inherit(layout, sizeId, 'product', (l) => autoProductBox(l, shown.length, ordinal, item.aspect), (b) =>
        b.placements[PRIMARY_SIZE_ID]?.products[slot] ?? null,
      )(block),
  }));
}

/**
 * A size other than the primary starts from what the user arranged there, not
 * from its own auto row — the KV is designed once and then re-framed. Dragging
 * a layer on this size stores a box, which pins it and stops it following.
 */
function inherit(
  layout: OffSiteLayout,
  sizeId: string,
  kind: LayerKind,
  auto: (l: OffSiteLayout) => PlacedBox,
  fromPrimary: (b: OffSiteBlock) => PlacedBox | null,
): (block: OffSiteBlock) => PlacedBox {
  return (block) => {
    const primary = OFFSITE_LAYOUT[PRIMARY_SIZE_ID];
    if (sizeId === PRIMARY_SIZE_ID) return auto(layout);
    return mapBoxToSize(fromPrimary(block) ?? auto(primary), primary, layout, kind);
  };
}

/* ─────────────────────────────────────────── */
/* Layer stack                                 */
/* ─────────────────────────────────────────── */

export type LayerKind = 'podium' | 'product' | 'object' | 'price';

/** One paintable thing on a banner, in stack order. The template, the drag
 *  overlay and the layer list all read the same array, so what you reorder is
 *  exactly what gets painted and exactly what a click hits. */
export interface OffSiteLayer {
  key: string;
  kind: LayerKind;
  /** Item slot for `podium` / `product`. */
  slot?: number;
  /** Tag index for `price`. */
  index?: number;
  box: PlacedBox;
  /** Image layers only. */
  src?: string;
  /** Props only — see OffSiteProp.flipX. */
  flipX?: boolean;
  tag?: PriceTag;
  label: string;
  /**
   * How the scene's lamp throws this `product` layer's shadow. The shadow is
   * the layer's own art projected, so there is no second image and no box of
   * its own — just the geometry to project it by.
   *
   * Carried on the product rather than added as a layer of its own: the layer
   * array is what the drag overlay hit-tests and what the reorder list shows,
   * and a shadow must not be separately grabbable or restackable — it belongs
   * to its cutout and moves with it.
   */
  cast?: CastShadow;
}

/** Reconcile a stored order against the layers that currently exist: keep the
 *  user's relative order for everything still present, and slot anything new in
 *  at its natural position rather than dumping it on top. */
function reconcileOrder(natural: string[], stored?: string[]): string[] {
  if (!stored) return natural;
  const exists = new Set(natural);
  const kept = stored.filter((k) => exists.has(k));
  if (kept.length === natural.length) return kept;
  const out = [...kept];
  natural.forEach((k, i) => {
    if (!out.includes(k)) out.splice(Math.min(i, out.length), 0, k);
  });
  return out;
}

/** Every layer of one block on one size, bottom first. */
export function resolveLayers(
  layout: OffSiteLayout, block: OffSiteBlock, sizeId: string,
): OffSiteLayer[] {
  const placed = resolveBoxes(layout, block, sizeId);
  const byKey = new Map<string, OffSiteLayer>();
  const natural: string[] = [];

  const add = (l: OffSiteLayer) => {
    byKey.set(l.key, l);
    natural.push(l.key);
  };

  block.podiums.forEach((p, index) => {
    add({
      key: `podium:${index}`, kind: 'podium', index,
      box:
        block.placements[sizeId]?.podiums[index] ??
        inherit(layout, sizeId, 'podium', (l) => autoPodiumBox(l, index, p.aspect), (b) =>
          b.placements[PRIMARY_SIZE_ID]?.podiums[index] ?? null,
        )(block),
      src: p.src, flipX: p.flipX, label: `Podium ${index + 1}`,
    });
  });
  placed.forEach(({ slot, item, product }, ordinal) => {
    if (!item.image) return;
    add({
      key: `product:${slot}`, kind: 'product', slot, box: product,
      src: item.image, label: item.name || `Product ${ordinal + 1}`,
      // Drafts written before either existed have neither field, and both
      // default on: a floating cutout is what this is here to fix.
      cast: (item.showShadow ?? true)
        ? castShadow(layout, block.campaign.light ?? DEFAULT_LIGHT)
        : undefined,
    });
  });
  block.objects.forEach((o, index) => {
    add({
      key: `object:${index}`, kind: 'object', index,
      box:
        block.placements[sizeId]?.objects[index] ??
        inherit(layout, sizeId, 'object', (l) => cascade(l.objectDefault, index, o.aspect), (b) =>
          b.placements[PRIMARY_SIZE_ID]?.objects[index] ?? null,
        )(block),
      src: o.src, flipX: o.flipX, label: `Object ${index + 1}`,
    });
  });
  block.campaign.priceTags.forEach((tag, index) => {
    if (!tag.enabled) return;
    const place = resolvePricePlacement(layout, block, sizeId, index);
    add({
      key: `price:${index}`, kind: 'price', index,
      box: { x: place.x, y: place.y, w: place.w, h: priceCardHeight(layout, tag, place.w) },
      tag, label: `Price tag ${index + 1}`,
    });
  });
  return reconcileOrder(natural, block.placements[sizeId]?.order)
    .map((k) => byKey.get(k))
    .filter((l): l is OffSiteLayer => !!l);
}

/**
 * Rendered height of a price card at width `w`.
 *
 * Each row is a fixed box clipped to one line, so the height is fully
 * determined — no measurement needed. The drag overlay needs it for the hit
 * box, and the renderer needs it to agree exactly.
 */
export function priceCardHeight(layout: OffSiteLayout, tag: PriceTag, w: number): number {
  const k = w / layout.price.w;
  const rows: number[] = [];
  if (tag.originalPrice) rows.push(layout.price.originalH);
  if (tag.salePrice) rows.push(layout.price.saleH);
  if (rows.length === 0) rows.push(layout.price.saleH);
  const content = rows.reduce((a, b) => a + b, 0) + layout.price.gap * (rows.length - 1);
  return (layout.price.pad * 2 + content) * k;
}

/** Keep a box inside the safe area. When the box is larger than the area it is
 *  pinned to the area's top-left rather than pushed off the opposite edge. */
export function clampBox(box: PlacedBox, safe: SafeArea): PlacedBox {
  return {
    ...box,
    x: Math.min(Math.max(box.x, safe.x), Math.max(safe.x, safe.x + safe.w - box.w)),
    y: Math.min(Math.max(box.y, safe.y), Math.max(safe.y, safe.y + safe.h - box.h)),
  };
}

/** Set dressing bleeds off the sides — Figma puts podium G at x -39 on the
 *  square and further left on the wide. Products and price tags carry the
 *  message, so they stay fully inside. */
const BLEEDS_SIDEWAYS: LayerKind[] = ['podium', 'object'];
/** Never let a bleeding layer leave the canvas entirely; this much stays
 *  grabbable so it can be dragged back. */
const KEEP_GRABBABLE = 80;

/**
 * Where a layer that must stay wholly visible may go: the designer's frame,
 * trimmed to the canvas.
 *
 * The wide frame deliberately overruns the banner — it is a scene frame, and
 * the podiums in it are meant to run off the right edge. Set dressing follows
 * that frame as authored; a product or a price tag cannot, because half a price
 * is not a price. So they get the part of the frame that is actually on screen.
 */
function messageArea(layout: OffSiteLayout): SafeArea {
  const safe = layout.safeArea;
  const x = Math.max(safe.x, 0);
  const y = Math.max(safe.y, 0);
  return {
    x,
    y,
    w: Math.max(1, Math.min(safe.x + safe.w, layout.w) - x),
    h: Math.max(1, Math.min(safe.y + safe.h, layout.h) - y),
  };
}

export function clampLayerBox(box: PlacedBox, layout: OffSiteLayout, kind: LayerKind): PlacedBox {
  if (!BLEEDS_SIDEWAYS.includes(kind)) return clampBox(box, messageArea(layout));
  const safe = layout.safeArea;
  const y = Math.min(Math.max(box.y, safe.y), Math.max(safe.y, safe.y + safe.h - box.h));
  const minX = KEEP_GRABBABLE - box.w;
  const maxX = layout.w - KEEP_GRABBABLE;
  return { ...box, y, x: Math.min(Math.max(box.x, minX), Math.max(minX, maxX)) };
}

/**
 * How far a price card may be resized: 80–120% of the size's own default.
 *
 * The card is type on a plate — shrink it and the price stops being legible at
 * thumbnail size, grow it and it starts competing with the head copy. Products
 * and set dressing have no such constraint because their scale IS the design
 * decision; a price tag's is not.
 */
export const PRICE_SCALE_RANGE = { min: 0.8, max: 1.2 };

export function priceWidthRange(layout: OffSiteLayout): { min: number; max: number } {
  return {
    min: layout.price.w * PRICE_SCALE_RANGE.min,
    max: layout.price.w * PRICE_SCALE_RANGE.max,
  };
}

/** Widest a box can grow from its current corner without breaking its clamp. */
export function maxLayerWidth(box: PlacedBox, layout: OffSiteLayout, kind: LayerKind): number {
  const ratio = box.w / box.h;
  if (kind === 'price') return priceWidthRange(layout).max;
  if (BLEEDS_SIDEWAYS.includes(kind)) {
    const safe = layout.safeArea;
    return (safe.y + safe.h - box.y) * ratio;
  }
  const area = messageArea(layout);
  return Math.min(area.x + area.w - box.x, (area.y + area.h - box.y) * ratio);
}

/**
 * Canvas color a KV starts on — Figma's social frames fill with it and let the
 * backdrop sit on top. Per-campaign from here on, so this is only the default.
 */
export const DEFAULT_BG_COLOR = '#E1DDD8';
/** The only two the disclaimer is offered. Black first — it is the default,
 *  and it seeds the free-colour copy fields too. */
export const COPY_COLORS = ['#000000', '#FFFFFF'];
export const LG_RED = '#FD312E';
/** Warm Gray 03 — struck-through original price. */
export const WARM_GRAY_03 = '#716F6A';

/**
 * The CTA button's three authored faces (Figma 4116:8899). The label color is
 * part of the variant rather than following `copyColor`: the button is a solid
 * chip, so its text has to contrast with the chip, not with the canvas.
 */
export const CTA_VARIANTS: { id: CtaVariant; label: string; bg: string; fg: string }[] = [
  { id: 'red', label: 'Red', bg: LG_RED, fg: '#FFFFFF' },
  { id: 'black', label: 'Black', bg: '#000000', fg: '#FFFFFF' },
  { id: 'white', label: 'White', bg: '#FFFFFF', fg: '#000000' },
];
export const ctaColors = (v: CtaVariant) =>
  CTA_VARIANTS.find((c) => c.id === v) ?? CTA_VARIANTS[0];

/**
 * The discount row ready to render, for the active brand font: this size's
 * shared boxes plus that font's type, with the two corrections resolved —
 * `size-adjust` divided back out of the sizes, and tracking turned into px.
 * See `DiscountFontSpec` for why both are needed.
 */
export function discountMetrics(layout: OffSiteLayout, fontId: BrandFontId | undefined) {
  const d = layout.discount;
  const f = d.byFont[fontId ?? 'lg'] ?? d.byFont.lg;
  return {
    ...d,
    textW: f.textW,
    textSize: f.textSize / f.textAdjust,
    numSize: f.numSize / f.figureAdjust,
    unitSize: f.unitSize / f.figureAdjust,
    textTrack: f.tracking * f.textSize,
    numTrack: f.tracking * f.numSize,
    numWeight: f.numWeight,
    unitWeight: f.unitWeight,
    rowGap: f.rowGap,
    groupGap: f.groupGap,
    figureGap: f.figureGap,
  };
}

/** This size's canvas color, falling back to the campaign-wide one. */
export function bannerBgColor(campaign: OffSiteCampaign, sizeId: string): string {
  return campaign.backgroundColorBySize?.[sizeId] ?? campaign.backgroundColor;
}

/** Every size on one color — the starting point, and what a restore fills the
 *  gaps of. */
export function bgColorsBySize(hex: string): Record<string, string> {
  return Object.fromEntries(OFFSITE_SIZES.map((s) => [s.id, hex]));
}
