/**
 * Off-site Banner renderer — Meta / PMax creative.
 *
 * Figma: social_1200x1200 (4023:10065), social_1200x650 (4023:10094).
 *
 * Both sizes share one layer stack — backdrop, podium, product, price tags,
 * copy column, disclaimer — and differ only in the numbers, which live
 * in OFFSITE_LAYOUT. The square centers its copy at the top; the wide runs it
 * as a left column. That single `align` switch is the only structural fork.
 *
 * The podium, product and price tags are placed by the user rather than pinned
 * to Figma coordinates, so their boxes come from state; everything else is
 * fixed chrome.
 *
 * Figma weights are mapped per the LGEI rule (static TTF renders heavier than
 * the variable font): Semibold→600 for the large head copy, Regular→300 for
 * everything general, Bold→600 for the large sale price.
 */

import React from 'react';
import type { BrandFontId } from '../../../fonts/brandFonts';
import {
  SHADOW_FADE_SOLID,
  LG_RED, OFFSITE_LAYOUT, WARM_GRAY_03, bannerBgColor, ctaColors, discountMetrics,
  lgLogoSrc, priceCardHeight, resolveLayers,
  type CastShadow, type DiscountRow, type DiscountSide,
  type FontRole, type OffSiteBlock, type OffSiteCampaign, type OffSiteLayout,
  type PlacedBox, type PricePlacement, type PriceTag,
} from '../offsiteTypes';

/** What `discountMetrics` returns: the size's row numbers with the active
 *  brand font's exceptions already applied. */
type DiscountMetrics = ReturnType<typeof discountMetrics>;

const HEAD_FONT = 'var(--obs-font)';
const TEXT_FONT = 'var(--obs-font-text)';
const fontOf = (role: FontRole) => (role === 'head' ? HEAD_FONT : TEXT_FONT);

/** Thai headroom + line-based clipping.
 *
 *  Every Thai face here inherits LG's Latin-tuned vertical metrics, which are
 *  far shallower than Thai actually draws. Measured with real shaping, Thai ink
 *  reaches 107.4% above the baseline once tone marks stack and 29.6% below it,
 *  against LG's 95% / 22% — so `overflow: hidden` shaves the top marks off the
 *  FIRST line and the tails off the last. Top is the worse end and was the
 *  missing half: at the tightest line-height in the layouts (1.0) the overflow
 *  is 20.9% of the em above and 16.1% below, so 0.24 / 0.20 clear both with
 *  room to spare. The negative margins cancel the padding, so widening the clip
 *  box reveals the marks without moving anything around it. */
function clamp(lines: number): React.CSSProperties {
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
    overflow: 'hidden',
    boxSizing: 'content-box',
    paddingTop: '0.24em',
    marginTop: '-0.24em',
    paddingBottom: '0.20em',
    marginBottom: '-0.20em',
  };
}

const track = (em: number) => (em ? `calc(${em}em + var(--obs-tracking))` : 'var(--obs-tracking)');
/** Head copy carries its own tracking — see brandHeadTrackingEm. */
const trackHead = (em: number) =>
  (em ? `calc(${em}em + var(--obs-tracking-head))` : 'var(--obs-tracking-head)');

/** A placed image: the box is what the user dragged, the art fits inside it.
 *  `shadow` is a drop-shadow filter, so it follows the cutout's alpha rather
 *  than boxing the frame. */
/**
 * `fadeUp` graduates whatever the layer paints: solid over the bottom
 * SHADOW_FADE_SOLID of the box, then falling to nothing at the top. Used for the
 * drop-shadow copy, so the shadow reads as strongest where the product meets the
 * floor and absent at its head — the mask applies to the filtered result, which
 * is what lets a filter be graduated at all.
 */
/** Room left around the art for the shadow to fall into. A mask only paints
 *  inside its element, and `mask-clip: no-clip` does not carry — so the masked
 *  copy is grown by this much on every side, or the part of the shadow BELOW
 *  the cutout, the part worth having, is cut off at the box edge. Comfortably
 *  clears the drop shadow's reach (offset + 2 × blur). */
const FADE_PAD = 24;

function PlacedArt({
  src, box, shadow, fadeUp, flipX,
}: { src: string; box: PlacedBox; shadow?: string; fadeUp?: boolean; flipX?: boolean }) {
  const art = (
    <img
      src={src}
      alt=""
      style={{
        position: 'absolute',
        left: fadeUp ? FADE_PAD : box.x,
        top: fadeUp ? FADE_PAD : box.y,
        width: box.w,
        height: box.h,
        maxWidth: 'none',
        objectFit: 'contain',
        display: 'block',
        userSelect: 'none',
        // Mirrored in place: the box is what the user dragged, so flipping must
        // not move it.
        transform: flipX ? 'scaleX(-1)' : undefined,
        filter: shadow ? `drop-shadow(${shadow})` : undefined,
      }}
      draggable={false}
    />
  );
  if (!fadeUp) return art;

  // Stops are in the PADDED box's terms: solid from its bottom up past the pad
  // to `SHADOW_FADE_SOLID` of the art's own height, then out to nothing.
  const outer = box.h + FADE_PAD * 2;
  const solid = ((FADE_PAD + SHADOW_FADE_SOLID * box.h) / outer) * 100;
  const mask = `linear-gradient(to top, #000 0%, #000 ${solid.toFixed(2)}%, transparent 100%)`;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x - FADE_PAD,
        top: box.y - FADE_PAD,
        width: box.w + FADE_PAD * 2,
        height: outer,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    >
      {art}
    </div>
  );
}

/** Room for the projection to fall into, beyond the product's own box. The
 *  flipped copy reaches `scaleY` × the product's height below its base and
 *  leans up to `CAST_MAX_SKEW` sideways, and the mask paints nothing outside
 *  its own element — so the wrapper is grown, in the product's own terms rather
 *  than by a fixed pixel figure, which would run out on a large banner. */
const CAST_PAD_Y = 1.6;
const CAST_PAD_X = 1.2;

/**
 * How far below the cutout's own bottom edge the shadow starts, in banner
 * pixels — both banner sizes are 1200 wide, so this reads the same on each.
 *
 * Pinning the contact exactly on the edge is what a cutout does, not what a
 * product does: a real base has a lip, a foot or a rounded corner that the
 * camera sees slightly above where the object actually meets the floor.
 */
const CAST_DROP = 0;

/**
 * The product's own silhouette thrown on the floor by the scene's lamp.
 *
 * A second copy of the cutout, blacked out, flipped about the product's base
 * and squashed: it therefore follows the alpha exactly, legs, gaps and all,
 * which is the whole point of casting rather than sliding a PNG under the art.
 * The mask fades it along its length so it is darkest where the product touches
 * the floor and gone at the tip — a mask is applied in the element's own
 * coordinate space, before its transform, so it fades along the shadow rather
 * than down the screen.
 *
 * The blur sits on the OUTER element, outside the transform, which is the only
 * place it reads evenly. Blurring the art first and squashing afterwards
 * divides the vertical softness by `scaleY` — at a short shadow that is a
 * factor of five or more, so the silhouette's horizontal edges survive the blur
 * as hard creases while its sides stay soft.
 */
function CastShadowArt({ src, box, cast }: { src: string; box: PlacedBox; cast: CastShadow }) {
  const padX = box.w * CAST_PAD_X;
  const padY = box.h * CAST_PAD_Y;
  const outerH = box.h + padY * 2;
  // Stops measured up from the wrapper's bottom. Full strength over the first
  // SHADOW_FADE_SOLID of the shadow's length, then out to nothing at its tip —
  // the same profile the cutout's own drop shadow uses, so contact reads as
  // contact on both. The whole span is the product's height, which the
  // transform maps onto the shadow's length.
  const solid = ((padY + SHADOW_FADE_SOLID * box.h) / outerH) * 100;
  const tip = ((padY + box.h) / outerH) * 100;
  const mask = `linear-gradient(to top, #000 0%, #000 ${solid.toFixed(2)}%, transparent ${tip.toFixed(2)}%)`;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x - padX,
        // The whole projection moves, pivot included, so the shadow starts
        // below the base rather than being slid off the product it belongs to.
        top: box.y - padY + CAST_DROP,
        width: box.w + padX * 2,
        height: outerH,
        filter: `blur(${cast.blur.toFixed(1)}px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          maskImage: mask,
          WebkitMaskImage: mask,
          // The product's base, which is what the shadow pivots about.
          transformOrigin: `50% ${padY + box.h}px`,
          // Signed: negative throws the shadow forward, positive back behind the
          // product. Skew is applied first, so both read as a shear about the base.
          transform: `scaleY(${cast.scaleY.toFixed(3)}) skewX(${cast.skewDeg.toFixed(2)}deg)`,
        }}
      >
        <img
          src={src}
          alt=""
          style={{
            position: 'absolute',
            left: padX,
            top: padY,
            width: box.w,
            height: box.h,
            maxWidth: 'none',
            objectFit: 'contain',
            display: 'block',
            userSelect: 'none',
            opacity: cast.opacity,
            filter: 'brightness(0)',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

/**
 * `#rrggbb` to `rgba()`. Gradients have to fade to an explicit zero-alpha copy
 * of the same color: fading to the `transparent` keyword can interpolate
 * through transparent black and leave a grey band across the ramp.
 */
function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* ─────────────────────────────────────────── */
/* Parts                                       */
/* ─────────────────────────────────────────── */

function LogoRow({ layout, campaign }: { layout: OffSiteLayout; campaign: OffSiteCampaign }) {
  const { logo } = layout;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: logo.gap,
        flexShrink: 0,
        alignSelf: layout.align === 'center' ? 'center' : 'flex-start',
      }}
    >
      {/* Campaign lockup first, LG mark last — Figma 4137:225 / 4138:695. */}
      {campaign.campaignLogoUrl && (
        <>
          <img
            src={campaign.campaignLogoUrl}
            alt=""
            style={{ height: logo.campaignH, width: 'auto', maxWidth: 'none', display: 'block', flexShrink: 0, userSelect: 'none' }}
            draggable={false}
          />
          {/* The rule between the marks belongs to the LG one: a white mark on
              a dark canvas needs a white rule, whatever the copy is set to. */}
          <div
            style={{
              width: 1,
              height: logo.dividerH,
              background: campaign.lgLogoVariant === 'white' ? '#FFFFFF' : campaign.copyColor,
              opacity: 0.35,
              flexShrink: 0,
            }}
          />
        </>
      )}
      <img
        src={lgLogoSrc(campaign.lgLogoVariant)}
        alt="LG"
        style={{ width: logo.lgW, height: logo.lgH, display: 'block', flexShrink: 0, userSelect: 'none' }}
        draggable={false}
      />
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Discount row                                */
/* ─────────────────────────────────────────── */

/** Figma's `pick one` marks (4138:818), inlined rather than shipped as files so
 *  they take the copy color and never cost the export a second fetch. */
const BADGE_VIEWBOX = '0 0 53.3008 84';
const BADGE_PATHS: Record<'baht' | 'percent', string> = {
  baht: 'M53.3007 59.797V0H31.3534V1.57895C31.3534 4.19549 29.2556 6.31579 26.6617 6.31579C24.0677 6.31579 21.9699 4.19549 21.9699 1.57895V0H0V59.797H9.31579V64.8722H0V84H21.9474V82.4211C21.9474 79.782 24.0451 77.6842 26.6391 77.6842C29.2331 77.6842 31.3308 79.8045 31.3308 82.4211V84H53.2782V64.8722H44.7519V59.797H53.2782H53.3007ZM24.6767 64.8722H14.0526V59.797H24.6767V64.8722ZM40.015 64.8722H29.391V59.797H40.015V64.8722ZM29.9098 47.4361H29.2556V50.5714H24.4962V47.4361H17.5714V15.7444H24.4962V12.5414H29.2556V15.7669C34.5113 16.1053 37.985 19.9624 37.985 24.4737C37.985 27.2932 36.7895 29.3008 35.0301 30.5865C37.9398 31.782 40.1278 34.1955 40.1278 38.1203C40.1278 43.3985 35.9323 47.4135 29.9098 47.4135V47.4361ZM32.8421 24.7895C32.8421 22.4662 31.1053 20.5038 28.2406 20.5038H22.8045V29.0752H28.2406C31.1053 29.0752 32.8421 27.203 32.8421 24.7895ZM29.7744 33.5414H22.8045V42.6541H29.7744C33.1128 42.6541 35.0301 40.7368 35.0301 38.0977C35.0301 35.4586 33.1579 33.5414 29.7744 33.5414Z',
  percent: 'M18.6992 23.7068C18.6992 21.9248 17.2331 20.4812 15.4511 20.4812C13.6692 20.4812 12.203 21.9248 12.203 23.7068C12.203 25.4887 13.6692 26.9323 15.4511 26.9323C17.2331 26.9323 18.6992 25.4887 18.6992 23.7068ZM37.8496 35.2782C36.0677 35.2782 34.6015 36.7218 34.6015 38.5038C34.6015 40.2857 36.0677 41.7293 37.8496 41.7293C39.6316 41.7293 41.0977 40.2857 41.0977 38.5038C41.0977 36.7218 39.6316 35.2782 37.8496 35.2782ZM53.3007 59.797V0H31.3534V1.57895C31.3534 4.19549 29.2556 6.31579 26.6617 6.31579C24.0677 6.31579 21.9699 4.19549 21.9699 1.57895V0H0V59.797H9.31579V64.8722H0V84H21.9474V82.4211C21.9474 79.8045 24.0451 77.6842 26.6391 77.6842C29.2331 77.6842 31.3308 79.8045 31.3308 82.4211V84H53.2782V64.8722H44.7519V59.797H53.2782H53.3007ZM7.51128 23.7068C7.51128 19.3534 11.0752 15.8346 15.4511 15.8346C19.8271 15.8346 23.391 19.3759 23.391 23.7068C23.391 28.0376 19.8271 31.5789 15.4511 31.5789C11.0752 31.5789 7.51128 28.0376 7.51128 23.7068ZM24.6767 64.8722H14.0526V59.797H24.6767V64.8722ZM19.3083 47.2556L15.3383 44.797L15.406 44.7068L33.9699 14.9549H33.9925L37.9624 17.4135L37.8947 17.5038L19.3083 47.2556ZM40.015 64.8722H29.391V59.797H40.015V64.8722ZM37.8496 46.3759C33.4737 46.3759 29.9098 42.8346 29.9098 38.5038C29.9098 34.1729 33.4737 30.6316 37.8496 30.6316C42.2256 30.6316 45.7895 34.1729 45.7895 38.5038C45.7895 42.8346 42.2256 46.3759 37.8496 46.3759Z',
};
/** The plus between the two figures (4138:826). */
const PLUS_PATH = 'M0 17.3H17.3V0H27.3V17.3H44.5V27.3H27.3V44.5H17.3V27.3H0V17.3Z';

/**
 * The rotated label's weight (Figma 4139:304). One value covers all three
 * brands — 600 lands on LGEI Semibold, Shopee Medium and DB Helvethaica 65 Med
 * through fonts.css's substitution table, which is exactly what Figma names.
 * The number and the unit do NOT agree across brands, so they carry their own
 * weights in `DiscountFontSpec`.
 */
const LABEL_WEIGHT = 600;

function BadgeMark({ kind, w, h, color }: {
  kind: 'baht' | 'percent'; w: number; h: number; color: string;
}) {
  return (
    <svg width={w} height={h} viewBox={BADGE_VIEWBOX} fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <path d={BADGE_PATHS[kind]} fill={color} />
    </svg>
  );
}

/**
 * One figure: an optional mark, the number, and its unit.
 *
 * The text mark is set upright and turned a quarter turn, so its box is the
 * rotated one (narrow and tall) while the type inside is laid out along the
 * long side — rotating the box instead would stretch the glyphs.
 */
function DiscountFigure({ side, d, color }: {
  side: DiscountSide; d: DiscountMetrics; color: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: d.groupGap, flexShrink: 0 }}>
      {side.badge === 'text' && side.badgeText && (
        // Figma's own structure: a fixed-width box that hugs the label's
        // length and clips it at `textMaxLen`, with the label centred inside.
        // The box has to be its own element because the label's line box is
        // the brand font's, not `textW` — Shopee and Lazada are set at
        // different sizes and would otherwise sit off-centre in the row.
        <div
          style={{
            width: d.textW,
            maxHeight: d.textMaxLen,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            // Thai headroom, on the INLINE axis because the run is rotated:
            // `textW` is one em, and Thai draws 1.37 of one. It has to go on
            // this box rather than the label, since this is what clips. The
            // negative margins hold the row's geometry at `textW`.
            boxSizing: 'content-box',
            paddingLeft: `${d.textSize * 0.24}px`,
            marginLeft: `${d.textSize * -0.24}px`,
            paddingRight: `${d.textSize * 0.2}px`,
            marginRight: `${d.textSize * -0.2}px`,
          }}
        >
          {/* Vertical writing mode rather than a rotate(): the box then takes
              its height from the text's own length, exactly as Figma's hugging
              frame does. A rotated box keeps its horizontal size and would
              have to be measured to match. vertical-rl reads top-to-bottom;
              the half turn puts it back upright. */}
          <p
            style={{
              margin: 0,
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              textAlign: 'center',
              fontFamily: HEAD_FONT,
              fontSize: d.textSize,
              fontWeight: LABEL_WEIGHT,
              lineHeight: 1,
              letterSpacing: d.textTrack,
              whiteSpace: 'nowrap',
            }}
          >
            {side.badgeText}
          </p>
        </div>
      )}
      {(side.badge === 'baht' || side.badge === 'percent') && (
        <BadgeMark kind={side.badge} w={d.badgeW} h={d.badgeH} color={color} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: d.figureGap, flexShrink: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: HEAD_FONT,
            fontSize: d.numSize,
            fontWeight: d.numWeight,
            lineHeight: 1,
            letterSpacing: d.numTrack,
            whiteSpace: 'nowrap',
            maxHeight: d.numMaxH,
            maxWidth: d.numMaxW,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {side.value}
        </p>
        {side.unit && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: d.unitPadY,
              paddingBottom: d.unitPadY,
              flexShrink: 0,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: HEAD_FONT,
                fontSize: d.unitSize,
                fontWeight: d.unitWeight,
                lineHeight: 1,
                // Figma tracks the label and the number but never the unit.
                letterSpacing: 0,
                whiteSpace: 'nowrap',
                maxHeight: d.unitMaxH,
                maxWidth: d.unitMaxW,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                // `unitMaxH` is exactly one em at line-height 1, which fits
                // Latin and a ฿ but shears the tone marks off a Thai unit.
                boxSizing: 'content-box',
                paddingTop: '0.24em',
                marginTop: '-0.24em',
                paddingBottom: '0.2em',
                marginBottom: '-0.2em',
              }}
            >
              {side.unit}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DiscountRowView({ row, d, color }: {
  row: DiscountRow; d: DiscountMetrics; color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: d.rowGap,
        height: d.h,
        color,
        flexShrink: 0,
      }}
    >
      <DiscountFigure side={row.left} d={d} color={color} />
      {row.showRight && (
        <>
          <svg width={d.plus} height={d.plus} viewBox="0 0 44.5 44.5" fill="none" style={{ display: 'block', flexShrink: 0 }}>
            <path d={PLUS_PATH} fill={color} />
          </svg>
          <DiscountFigure side={row.right} d={d} color={color} />
        </>
      )}
    </div>
  );
}

/** One price tag. Every metric scales with the dragged width, so resizing the
 *  card keeps the Figma proportions instead of reflowing the type. */
export function PriceTagCard({
  layout, tag, place, accent,
}: {
  layout: OffSiteLayout;
  tag: PriceTag;
  place: PricePlacement;
  /** Ink for the sale price — the one figure the card exists to shout. */
  accent: string;
}) {
  const { price } = layout;
  const k = place.w / price.w;
  return (
    <div
      style={{
        position: 'absolute',
        left: place.x,
        top: place.y,
        width: place.w,
        height: priceCardHeight(layout, tag, place.w),
        boxSizing: 'border-box',
        background: '#FFFFFF',
        borderRadius: price.radius * k,
        padding: price.pad * k,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: price.gap * k,
        filter: `drop-shadow(${price.shadow})`,
      }}
    >
      {tag.originalPrice && (
        <p
          style={{
            margin: 0,
            width: '100%',
            fontFamily: HEAD_FONT,
            fontSize: price.originalSize * k,
            height: price.originalH * k,
            fontWeight: 300,
            lineHeight: 1,
            letterSpacing: track(0),
            color: WARM_GRAY_03,
            textDecoration: 'line-through',
            ...clamp(1),
          }}
        >
          {tag.originalPrice}
        </p>
      )}
      {tag.salePrice && (
        <p
          style={{
            margin: 0,
            width: '100%',
            fontFamily: HEAD_FONT,
            fontSize: price.saleSize * k,
            height: price.saleH * k,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: track(0),
            color: accent,
            ...clamp(1),
          }}
        >
          {tag.salePrice}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Banner                                      */
/* ─────────────────────────────────────────── */

export interface OffSiteBannerProps {
  sizeId: string;
  block: OffSiteBlock;
  /**
   * The active brand font. Every other run reads the family off `--obs-font`
   * and needs nothing here; the discount row is the exception, because its
   * sizes and tracking change with the face — see `DiscountFontSpec`.
   */
  fontId?: BrandFontId;
}

/**
 * Memoised on identity. A session can hold twenty KVs, and every one of them is
 * mounted at once — as a preview on the canvas and again, full size, on the
 * hidden export stage. Every `setBlocks` rebuilds only the block it touched and
 * passes the rest through by reference, so this keeps a keystroke in the panel
 * from re-rendering forty banners that did not change.
 */
export const OffSiteBannerTemplate = React.memo(function OffSiteBannerTemplate(
  { sizeId, block, fontId }: OffSiteBannerProps,
) {
  const layout = OFFSITE_LAYOUT[sizeId];
  if (!layout) return null;
  const { campaign } = block;

  const { copy, cta, disclaimer, content } = layout;
  const ctaFace = ctaColors(campaign.ctaVariant);
  const bgColor = bannerBgColor(campaign, sizeId);
  const discountVer = campaign.templateVersion === 'discount';
  const discountRow = campaign.discount;
  const centered = layout.align === 'center';
  const { backdrop, blind } = layout;
  const source = campaign.backgroundOriginal;
  const layers = resolveLayers(layout, block, sizeId);

  return (
    <div
      style={{
        width: layout.w,
        height: layout.h,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        background: bgColor,
        fontFamily: HEAD_FONT,
      }}
    >
      {/* Backdrop, inside Figma's `blind`. The source is one square scene
          PLACED at this size's scale and offset, not stretched to the canvas —
          which is what makes the two sizes show the same scene at the same
          physical size rather than two differently-squashed copies. Everything
          the blind does not cover stays the flat background colour. */}
      {source && (
        <>
          <div
            style={{
              position: 'absolute',
              left: blind.x,
              top: blind.y,
              width: blind.w,
              height: blind.h,
              overflow: 'hidden',
            }}
          >
            <img
              src={source}
              alt=""
              style={{
                position: 'absolute',
                left: backdrop.x - blind.x,
                top: backdrop.y - blind.y,
                width: backdrop.size,
                height: backdrop.size,
                maxWidth: 'none',
                display: 'block',
                userSelect: 'none',
              }}
              draggable={false}
            />
          </div>
          {/* The blind's alpha ramp, as a wash of the background color over the
              scene rather than a CSS mask on it. Behind the backdrop there is
              nothing but that color, so the two are pixel-identical — and a
              plain gradient is one less thing for html-to-image to get wrong.

              It is a SIBLING of the clip, deliberately. Inside it, the clip's
              antialiased edge thins the wash exactly where it thins the image,
              so a sliver of scene survives at the blind's edge and reads as a
              hairline once the banner is scaled down to a preview. Sitting
              outside, and overhanging by a pixel, it paints over that edge.
              The overhang is safe in every direction: the wash is the same
              color as the canvas it spills onto, and transparent at the far
              end of the ramp. */}
          <div
            style={{
              position: 'absolute',
              left: blind.x - 1,
              top: blind.y - 1,
              width: blind.w + 2,
              height: blind.h + 2,
              background: `linear-gradient(to ${blind.fade.from === 'top' ? 'bottom' : 'right'}, ${
                rgba(bgColor, 1)
              } 0%, ${rgba(bgColor, 1)} ${blind.fade.hiddenUntil * 100}%, ${
                rgba(bgColor, 0)
              } ${blind.fade.solidAt * 100}%)`,
            }}
          />
        </>
      )}

      {/* Podium / cutout / price tag, in the block's stack order */}
      {layers.map((l) =>
        l.kind === 'price' && l.tag ? (
          <PriceTagCard
            key={l.key}
            layout={layout}
            tag={l.tag}
            place={{ x: l.box.x, y: l.box.y, w: l.box.w }}
            accent={campaign.priceColor ?? LG_RED}
          />
        ) : l.src ? (
          <React.Fragment key={l.key}>
            {/* Cast shadow first, so it sits under its own cutout but still
                above whatever the product was stacked over. Rendered here
                rather than as its own layer because it must never be draggable
                or restackable away from the product it belongs to. */}
            {l.cast && <CastShadowArt src={l.src} box={l.box} cast={l.cast} />}
            {/* The cutout's own drop shadow is painted by a second copy of the
                art sitting underneath, masked to fade out towards the top. A
                filter alone cannot be graduated, and the copy's own pixels do
                not show: the clean one above covers them exactly. */}
            {l.kind === 'product' && (
              <PlacedArt src={l.src} box={l.box} shadow={layout.productShadow} fadeUp />
            )}
            <PlacedArt src={l.src} box={l.box} flipX={l.flipX} />
          </React.Fragment>
        ) : null,
      )}

      {/* Copy column — logo row, head/sub, CTA */}
      <div
        style={{
          position: 'absolute',
          top: content.top,
          left: content.left,
          width: content.width,
          display: 'flex',
          flexDirection: 'column',
          alignItems: centered ? 'center' : 'flex-start',
          gap: layout.gapLogoToCopy,
        }}
      >
        {campaign.showLogos && <LogoRow layout={layout} campaign={campaign} />}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: centered ? 'center' : 'flex-start',
            gap: layout.gapCopyToCta,
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: centered ? 'center' : 'flex-start',
              // The two versions sit the same distance below the head copy in
              // their own frame, and it is not the same distance.
              gap: discountVer ? layout.gapCopyToDiscount : copy.gap,
              width: '100%',
              color: campaign.copyColor,
              textAlign: centered ? 'center' : 'left',
            }}
          >
            {campaign.headCopy && (
              <p
                style={{
                  margin: 0,
                  width: '100%',
                  fontFamily: HEAD_FONT,
                  fontSize: copy.headSize,
                  fontWeight: 600,
                  lineHeight: copy.lineHeight,
                  // Head copy has its own tracking — see brandHeadTrackingEm.
                  letterSpacing: trackHead(0),
                  whiteSpace: 'pre-line',
                  wordBreak: 'break-word',
                  ...clamp(copy.headLines),
                }}
              >
                {campaign.headCopy}
              </p>
            )}
            {discountVer ? (
              discountRow && (
                <DiscountRowView
                  row={discountRow}
                  d={discountMetrics(layout, fontId)}
                  color={campaign.discountColor ?? campaign.copyColor}
                />
              )
            ) : (
              campaign.showSubCopy && campaign.subCopy && (
                <p
                  style={{
                    margin: 0,
                    width: '100%',
                    fontFamily: TEXT_FONT,
                    fontSize: copy.subSize,
                    fontWeight: 300,
                    lineHeight: copy.subLineHeight,
                    letterSpacing: track(copy.subTracking),
                    whiteSpace: 'pre-line',
                    wordBreak: 'break-word',
                    ...clamp(copy.subLines),
                  }}
                >
                  {campaign.subCopy}
                </p>
              )
            )}
          </div>

          {/* The discount version has no CTA at all — the figures carry the
              call to action, so the button is not part of that frame. */}
          {!discountVer && campaign.showCta && campaign.ctaLabel && (
            <div
              style={{
                height: cta.h,
                paddingLeft: cta.padX,
                paddingRight: cta.padX,
                boxSizing: 'border-box',
                background: ctaFace.bg,
                borderRadius: cta.radius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: TEXT_FONT,
                  fontSize: cta.size,
                  fontWeight: 300,
                  lineHeight: cta.lineHeight,
                  letterSpacing: track(0),
                  color: ctaFace.fg,
                  whiteSpace: 'nowrap',
                  // Figma clips the label, not the button — the button hugs
                  // whatever is left after the clip.
                  maxWidth: cta.maxW,
                  ...clamp(1),
                }}
              >
                {campaign.ctaLabel}
              </p>
            </div>
          )}
        </div>
      </div>

      {campaign.showDisclaimer && campaign.disclaimer && (
        <div
          style={{
            position: 'absolute',
            left: disclaimer.padX,
            right: disclaimer.padX,
            bottom: disclaimer.padBottom,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: fontOf(disclaimer.role),
              fontSize: disclaimer.size,
              fontWeight: 300,
              lineHeight: disclaimer.lineHeight,
              letterSpacing: track(0),
              color: campaign.disclaimerColor ?? campaign.copyColor,
              opacity: disclaimer.opacity,
              whiteSpace: 'pre-line',
              wordBreak: 'break-word',
              ...clamp(disclaimer.lines),
            }}
          >
            {campaign.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
});
