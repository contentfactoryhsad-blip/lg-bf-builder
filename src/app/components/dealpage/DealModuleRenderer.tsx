/**
 * Deal Page module templates — the www.lg.com counterpart to
 * brandshop/modules/ModuleRenderer.tsx.
 *
 * Every template renders at DEAL_PAGE_WIDTH (2280) and reproduces one section
 * of Figma `miJcDQgz0yJMskLE5a5HHj`, page "ExporttoFigma | www.lg.com | Deal
 * Page". Sizes, spacing, radii and type are that board's own numbers — the node
 * id each block came from is noted inline so a future change can be re-measured
 * against the same node.
 *
 * The page is built out of four nested rails, and the type is the same in all
 * of them: LG EI Headline for the 56/60 section heads, LG EI Text for
 * everything else. Copy renders through `--obs-font` / `--obs-font-text` (the
 * shared brand-font variables) for the same reason the Shop in Shop templates
 * do: the ZIP export mounts a second React root that no context can reach.
 */

import React from 'react';
import {
  DEAL_PAGE_WIDTH,
  DEAL_HERO_WIDTH,
  DEAL_BANNER_WIDTH,
  DEAL_CONTENT_WIDTH,
  HERO_INSET,
  BANNER_INSET,
  CONTENT_INSET,
} from './dealModuleRegistry';
import {
  T_HEAD, T_BODY, T_SMALL, T_MICRO, T_DIGIT, T_CARD_TITLE, T_COUNTER, T_PRICE, W_SEMIBOLD,
  PAGE_BG, CHROME_BG, DEAL_RED, TEXT_DARK, TEXT_SKU, TEXT_STRIKE,
  HAIRLINE, WARM_RULE, SEARCH_INK, SHIP_BG, SHIP_TEXT, LEGAL_BG, BLACK, WHITE,
  BADGE_GRADIENT, R_LG, R_MD, R_SM, R_XS,
} from './dealTokens';
import type {
  DealEditState,
  DealSiteHeaderState,
  DealSiteFooterState,
  DealHeroState,
  DealCardsState,
  DealTabNavState,
  DealPromoBannerState,
  DealBannerSize,
  CountdownFields,
  DealProductListState,
  DealProductItem,
  DealCategoryNavState,
} from './dealEditStates';
import { DEAL_SOCIAL_ICONS, DEAL_BANNER_HEIGHT } from './dealEditStates';
import { artOf, artUrl, getAsset, previewUrl } from '../contenttemplate/contentTemplateAssets';
import { slotBoxesFor } from '../contenttemplate/lgcomSlots';
import { PD_PLATE_FILL } from '../contenttemplate/paidBoards';
import { heroArtFor, HERO_SCRIM, HERO_SCRIM_X, HERO_SLOT_ID, HERO_MOTION_ID, HERO_MOTION_SRC } from './dealHeroArt';
import { PROMO_ART, PROMO_SLOT, promoArtHasSlots, promoArtStem, dealBannerArtFor, DEAL_BANNER_SCRIM } from './dealBannerArt';

const FONT = 'var(--obs-font)';
const FONT_TEXT = 'var(--obs-font-text, var(--obs-font))';
const STAR = '/deal-page/icons/star-full.svg';

/**
 * Descender headroom, same trick as the Shop in Shop templates: LG's brand
 * faces carry a shallower descent than Thai marks need, so pad the box and
 * cancel it with a negative margin so nothing below shifts.
 */
const DESCENDER: React.CSSProperties = {
  boxSizing: 'content-box',
  paddingTop: '0.24em',
  marginTop: '-0.24em',
  paddingBottom: '0.2em',
  marginBottom: '-0.2em',
};

// ── Shared atoms ──────────────────────────────────────────────────────────────

/** Splits a textarea value into non-empty lines. */
function lines(v: string): string[] {
  return v.split('\n').map(s => s.trim()).filter(Boolean);
}

/** Outer band: full page width, warm background, no horizontal overflow. */
function Band({
  height,
  children,
  background = PAGE_BG,
}: {
  height?: number;
  children: React.ReactNode;
  background?: string;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: DEAL_PAGE_WIDTH,
        height,
        background,
        fontFamily: FONT,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Full-bleed banner artwork. The Figma banners are ONE baked KV that already
 * contains the lockup and the objects — not a composited object dropped on a
 * black box. So the art simply covers its frame.
 */
function BannerArt({ src, width, height }: { src: string | null; width: number; height: number }) {
  if (!src) return <div style={{ width, height, background: '#161616' }} />;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{ width, height, objectFit: 'cover', display: 'block', maxWidth: 'none' }}
    />
  );
}

/** Absolutely-placed text, the way every measurement on the board is expressed. */
function At({
  x,
  y,
  w,
  style,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <p style={{ position: 'absolute', left: x, top: y, width: w, margin: 0, whiteSpace: 'pre-wrap', ...DESCENDER, ...style }}>
      {children}
    </p>
  );
}

// ── 0. Site header (Figma 6080:50979 — 2280×96) ───────────────────────────────

/** The breadcrumb strip that follows the header (Figma 6080:51032). */
const BREADCRUMB_H = 38;
/** Empty 10×10 separator frame with 4 pad either side. */
const BREADCRUMB_SEP = 18;

function DealSiteHeaderTemplate({ data }: { data: DealSiteHeaderState }) {
  const nav = lines(data.navItems);
  const crumbs = lines(data.breadcrumb);
  const showCrumbs = data.showBreadcrumb && crumbs.length > 0;
  return (
    <Band height={96 + (showCrumbs ? BREADCRUMB_H : 0)}>
      <div style={{ paddingLeft: CONTENT_INSET, paddingRight: CONTENT_INSET, boxSizing: 'border-box' }}>
        {/* Row 1 (h=44): the logo, bottom-aligned at y=12. The board also puts a
            "Business" link on the right of this row; it is deliberately not
            carried into the builder. */}
        <div style={{ height: 44, display: 'flex', alignItems: 'flex-end' }}>
          <img
            src="/lg-logo.svg"
            alt="LG"
            draggable={false}
            style={{ width: 73, height: 32, objectFit: 'contain', display: 'block' }}
          />
        </div>

        {/* Row 2 (h=52): global nav, then the search pill + account + cart. The
            nav list is pulled 12 left so the first label's ink lands on 420. */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', marginLeft: -12 }}>
            {nav.map((label, i) => (
              <span
                key={i}
                style={{
                  fontFamily: FONT_TEXT,
                  ...T_SMALL,
                  lineHeight: '24px',
                  fontWeight: W_SEMIBOLD,
                  color: BLACK,
                  padding: '0 12px',
                  whiteSpace: 'nowrap',
                  ...DESCENDER,
                }}
              >
                {label}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                width: 160,
                height: 36,
                marginRight: 20, // 8 list-item pad + 12 gap
                borderRadius: 999,
                background: WHITE,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 12px',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ width: 24, height: 24, flexShrink: 0 }} />
              <span style={{ fontFamily: FONT_TEXT, ...T_MICRO, lineHeight: '24px', color: SEARCH_INK, ...DESCENDER }}>
                {data.searchLabel}
              </span>
            </span>
            {/* Account and cart: the board carries these as empty 36×36 link
                frames — the icon glyphs never made it into the file, so nothing
                is drawn here either. */}
            <span style={{ width: 36, height: 36, marginRight: 12 }} />
            <span style={{ width: 36, height: 36 }} />
          </div>
        </div>
      </div>

      {/* Breadcrumb band (6080:51032) — its own 38-tall strip on the darker
          chrome, ruled off from the hero below. The board leaves the separator
          between crumbs as an empty 10×10 frame, so it renders as pure gap. */}
      {showCrumbs && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 96,
            width: DEAL_PAGE_WIDTH,
            height: BREADCRUMB_H,
            background: CHROME_BG,
            borderBottom: `1px solid ${WARM_RULE}`,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ position: 'absolute', left: CONTENT_INSET, top: 10, display: 'flex' }}>
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ width: BREADCRUMB_SEP }} />}
                <span
                  style={{
                    fontFamily: FONT_TEXT,
                    ...T_MICRO,
                    lineHeight: '18px',
                    color: BLACK,
                    whiteSpace: 'nowrap',
                    ...DESCENDER,
                  }}
                >
                  {c}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </Band>
  );
}

// ── 1. Hero KV (Figma 6080:51044 — 2280×720) ──────────────────────────────────

function DealHeroTemplate({ data }: { data: DealHeroState }) {
  // Motion is not a registry asset — it plays kv-main's animated master over
  // Main's static art (which doubles as the frame a PNG export can capture).
  const motion = data.kvAsset === HERO_MOTION_ID;
  const kv = getAsset(motion ? 'kv-main' : data.kvAsset);
  // Every key visual has its own framing on the board; the nudge rides on top.
  // Scale is about the artwork's centre, so zooming does not also shift it.
  const base = heroArtFor(data.kvAsset);
  const scale = data.kvScale || 1;
  const size = base.size * scale;
  const art = {
    x: base.x + data.kvNudgeX - (size - base.size) / 2,
    y: base.y + data.kvNudgeY - (size - base.size) / 2,
    size,
  };
  // The PD Slot artworks bake empty plates into the square. Their positions are
  // fractions of that square, so they follow the art wherever it is placed.
  const plates = kv ? slotBoxesFor(kv.id, HERO_SLOT_ID) : [];

  return (
    <Band height={720}>
      {/* The plate is the 1920 video rail (6130:67434), not the full page. */}
      <div style={{ position: 'absolute', left: HERO_INSET, top: 0, width: DEAL_HERO_WIDTH, height: 720, background: BLACK, overflow: 'hidden' }}>
        {kv && (
          <img
            src={artUrl(artOf(kv))}
            alt={kv.label}
            draggable={false}
            style={{
              position: 'absolute',
              left: art.x,
              top: art.y,
              width: art.size,
              height: art.size,
              display: 'block',
              maxWidth: 'none',
            }}
          />
        )}

        {motion && (
          <video
            src={HERO_MOTION_SRC}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              left: art.x,
              top: art.y,
              width: art.size,
              height: art.size,
              objectFit: 'cover',
              display: 'block',
              maxWidth: 'none',
            }}
          />
        )}

        {/* Plates are drawn OVER the baked ones (same recipe as the Content
            Banner Builder's LG.com preview) so their colour can be changed. */}
        {plates.map((box, i) => {
          const product = data.products[i]?.image ?? null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: art.x + box.x * art.size,
                top: art.y + box.y * art.size,
                width: box.w * art.size,
                height: box.h * art.size,
                borderRadius: box.r * art.size,
                background: data.plateColor ?? PD_PLATE_FILL,
                overflow: 'hidden',
              }}
            >
              {product && (
                <img
                  src={product}
                  alt=""
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', maxWidth: 'none' }}
                />
              )}
            </div>
          );
        })}

        {/* Scrim over the left of the plate, so the copy reads against black
            rather than against whatever the artwork happens to put there. It is
            fixed to the plate, so moving or scaling the art does not drag it. */}
        <div
          style={{
            position: 'absolute',
            left: HERO_SCRIM_X,
            top: 0,
            width: base.scrimW,
            height: 720,
            background: HERO_SCRIM,
          }}
        />
      </div>

      {/* Copy hangs off the 420 content rail, not off the plate. */}
      {data.showEyebrow && (
        <At x={CONTENT_INSET} y={80} style={{ fontFamily: FONT_TEXT, ...T_BODY, color: WHITE }}>
          {data.eyebrow}
        </At>
      )}
      <At
        x={CONTENT_INSET}
        y={112}
        w={640}
        style={{ ...T_HEAD, letterSpacing: 'var(--obs-tracking-head)', color: WHITE }}
      >
        {data.headline}
      </At>
      {data.showSubCopy && (
        <At x={CONTENT_INSET} y={240} w={860} style={{ fontFamily: FONT_TEXT, ...T_BODY, color: WHITE }}>
          {data.subCopy}
        </At>
      )}

      {/* Countdown under the copy (Figma 6236:143805) — same digit row as the
          deal banner, on the content rail. */}
      {data.showCountdown && <CountdownRow x={CONTENT_INSET} y={294} data={data} />}
    </Band>
  );
}

// ── 2. Deal cards (Figma 6149:67786 — 2280×561) ───────────────────────────────

const DEAL_CARD_W = 464;
const DEAL_CARD_H = 368;
/** 488 pitch − 464 card. */
const DEAL_CARD_GAP = 24;

/**
 * Deal-type artwork placement inside a card — PER ASSET, because the baked
 * Figma cards NORMALISE the objects: on the board every object reads ~187px
 * tall centred at (232, 125), but in the 1960×928 previews the raw objects
 * range from 640px (clock) down to 491px (gift box). One shared scale renders
 * the clock a third larger than the board. Each entry is
 * scale = 187 / <object px height in preview>, then x/y place the measured
 * object centre at (232, 125). The plate always overflows the card's sides
 * and top; its bottom edge (y 264–308 depending on scale) must sit below the
 * scrim's full-black line or it shows as a hairline seam.
 */
const DEAL_CARD_ART: Record<string, { w: number; x: number; y: number }> = {
  // object bbox in preview: x 712–1250, y 132–772 → centre (981, 452), h 640
  'deal-type-time-sale': { w: 573, x: -55, y: -7 },
  // x 712–1255, y 176–754 → centre (983.5, 465), h 578
  'deal-type-hot-deal':  { w: 634, x: -86, y: -25 },
  // x 710–1234, y 192–732 → centre (972, 462), h 540
  'deal-type-bundle':    { w: 679, x: -105, y: -35 },
  // x 659–1300, y 200–691 → centre (979.5, 445.5), h 491
  'deal-type-gift':      { w: 747, x: -141, y: -45 },
};
/** A future fifth artwork renders mid-range until it gets measured in. */
const DEAL_CARD_ART_FALLBACK = { w: 647, x: -91, y: -24 };
/**
 * Bottom scrim over the artwork — fades the plate into black under the copy
 * and CTA, standing in for the scrim the old baked renders carried. Fully
 * black by y 262: above the highest plate bottom edge (time sale, y 264).
 */
const DEAL_CARD_SCRIM =
  'linear-gradient(to bottom, rgba(0,0,0,0) 205px, rgba(0,0,0,1) 262px)';

/**
 * The two round carousel arrows (6149:68180 / 6149:68181).
 *
 * ⚠️ The board carries TWO overlapping pairs — this one, and the slider
 * component's own prev/next 3px right and 10px down. Only this pair paints, and
 * it is centred on the 60-tall title box (49 + (60 − 64) / 2 = 47), so both
 * arrows and the "1 / 2" counter sit on the title's centre line.
 *
 * Exported whole rather than redrawn: the two rings carry different greys
 * (#CBC8C2 disabled, #646464 active) and different glyphs (chevron vs arrow).
 */
function CarouselArrow({ x, dir }: { x: number; dir: 'prev' | 'next' }) {
  return (
    <img
      src={`/deal-page/icons/carousel-${dir}.png`}
      alt=""
      draggable={false}
      style={{ position: 'absolute', left: x, top: 47, width: 64, height: 64, display: 'block', maxWidth: 'none' }}
    />
  );
}

function DealCardsTemplate({ data }: { data: DealCardsState }) {
  return (
    <Band height={561}>
      {data.showSectionTitle && (
        <At x={CONTENT_INSET} y={49} style={{ ...T_HEAD, letterSpacing: 'var(--obs-tracking-head)', color: BLACK }}>
          {data.sectionTitle}
        </At>
      )}

      {data.showCarousel && (
        <>
          <At x={1670} y={65} style={{ fontFamily: FONT, ...T_COUNTER, color: TEXT_STRIKE }}>
            {`1 / ${data.slideCount}`}
          </At>
          <CarouselArrow x={1723} dir="prev" />
          <CarouselArrow x={1795} dir="next" />
        </>
      )}

      {/* Card row — 464×368 at a 488 pitch. The rail is a 1440-wide window that
          CLIPS (Figma "Slider Label Title" 6149:67807): three cards show and a
          fourth waits off-stage as the carousel's next slide. */}
      <div
        style={{
          position: 'absolute',
          left: CONTENT_INSET,
          top: 137,
          width: DEAL_CONTENT_WIDTH,
          height: DEAL_CARD_H,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', gap: DEAL_CARD_GAP }}>
        {data.cards.map((card, i) => {
          const art = getAsset(card.asset ?? null);
          const place = (card.asset && DEAL_CARD_ART[card.asset]) || DEAL_CARD_ART_FALLBACK;
          return (
          <div
            key={i}
            style={{
              position: 'relative',
              width: DEAL_CARD_W,
              height: DEAL_CARD_H,
              borderRadius: R_LG,
              overflow: 'hidden',
              background: BLACK,
              flexShrink: 0,
            }}
          >
            {art ? (
              <>
                <img
                  src={previewUrl(art)}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: place.x,
                    top: place.y,
                    width: place.w,
                    display: 'block',
                    maxWidth: 'none',
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, background: DEAL_CARD_SCRIM }} />
              </>
            ) : card.image ? (
              // Drafts saved before the asset picker carry a baked 464×368 render.
              <img
                src={card.image}
                alt=""
                draggable={false}
                style={{ width: DEAL_CARD_W, height: DEAL_CARD_H, objectFit: 'cover', display: 'block', maxWidth: 'none' }}
              />
            ) : null}
            {/* Copy sits inside a 32 pad, bottom-aligned and CENTRED across the
                card — the 400-wide box is the 464 card minus its 32 pads. */}
            <p
              style={{
                position: 'absolute',
                left: 32,
                top: 232,
                width: 400,
                margin: 0,
                fontFamily: FONT_TEXT,
                ...T_CARD_TITLE,
                color: WHITE,
                textAlign: 'center',
                ...DESCENDER,
              }}
            >
              {card.title}
            </p>
            {data.showCta && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 292,
                  height: 44,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 111,
                    height: 44,
                    padding: '0 20px',
                    borderRadius: R_SM,
                    background: WHITE,
                    boxSizing: 'border-box',
                    color: BLACK,
                    fontFamily: FONT_TEXT,
                    ...T_SMALL,
                    lineHeight: '16px',
                    fontWeight: W_SEMIBOLD,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {card.ctaText}
                </span>
              </span>
            )}
          </div>
          );
        })}
        </div>
      </div>
    </Band>
  );
}

// ── 3. Deal tab nav (Figma 6080:51251 — 2280×98) ──────────────────────────────

function DealTabNavTemplate({ data }: { data: DealTabNavState }) {
  const tabs = lines(data.tabs);
  const activeIdx = Math.min(Math.max(0, data.activeIndex), Math.max(0, tabs.length - 1));
  return (
    <Band height={98}>
      {/* 1440 rail with a 1px warm rule top and bottom, split into equal cells.
          The active cell carries a 4px red rule the full width of the cell. */}
      <div
        style={{
          position: 'absolute',
          left: CONTENT_INSET,
          top: 0,
          width: DEAL_CONTENT_WIDTH,
          height: 98,
          borderTop: `1px solid ${WARM_RULE}`,
          borderBottom: `1px solid ${WARM_RULE}`,
          boxSizing: 'border-box',
          display: 'flex',
        }}
      >
        {tabs.map((label, i) => (
          <div
            key={i}
            style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span
              style={{
                fontFamily: FONT_TEXT,
                ...T_BODY,
                color: i === activeIdx ? BLACK : TEXT_DARK,
                whiteSpace: 'nowrap',
                ...DESCENDER,
              }}
            >
              {label}
            </span>
            {i === activeIdx && (
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: DEAL_RED }} />
            )}
          </div>
        ))}
      </div>
    </Band>
  );
}

// ── 4. Promotion banner (Figma 6080:51148 / 52223 / 52436 / 52640) ────────────

/**
 * The two banner heights are not one frame scaled — they run a different copy
 * rhythm. The 400 promotion banner carries the legal links and sets its sub
 * copy at 16px; the 350 deal banner drops the links and sets it at 20px. Its
 * copy keeps the 320-era offsets (the extra 30px grows the banner downward)
 * until the 350 board frames land to re-measure against.
 */
const BANNER_COPY = {
  Large:    { headTop: 90, subTop: 218, subSize: T_SMALL, linkTop: 262, padBottom: 48 },
  Standard: { headTop: 88, subTop: 156, subSize: T_BODY,  linkTop: null, padBottom: 0 },
} as const;

/** Both legal links sit on a fixed 204 pitch, whatever the first one measures. */
const BANNER_LINK_PITCH = 204;

/**
 * Shared by `deal-promo-banner` (size forced to Large / 400) and `deal-banner`
 * (forced to Standard / 350) — the module type owns the height now, `data.size`
 * only carries what old drafts said.
 */
/**
 * Countdown copy rhythm (the old Time Sale banner, Figma 6080:51264) — with
 * the digit row in the banner the copy sits higher than the plain deal
 * banner's 88/156.
 */
const BANNER_COPY_COUNTDOWN = { headTop: 66, subTop: 134, subSize: T_BODY, linkTop: null, padBottom: 0 } as const;

/** Digit-box left edges inside the countdown banner, from the 80 copy rail. */
const TS_UNIT_LEFT = [0, 128, 256, 383];
/** Each separator hangs off the right of its own digit box, centred in it. */
const TS_SEP = [
  { left: 96, w: 32 },
  { left: 103, w: 18 },
  { left: 102, w: 18 },
];

/**
 * The Time Sale digit row (Figma 6236:143805 / 6080:51264) — one component on
 * the board, reused by the hero and the deal banner. 511×112 including the
 * labels; the caller places it.
 */
function CountdownRow({ x, y, data }: { x: number; y: number; data: CountdownFields }) {
  const units = [
    { value: data.days, label: data.dayLabel, sep: '-' },
    { value: data.hours, label: data.hourLabel, sep: ':' },
    { value: data.minutes, label: data.minuteLabel, sep: ':' },
    { value: data.seconds, label: data.secondLabel, sep: null },
  ];
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 511, height: 112 }}>
      {units.map((u, i) => (
        <React.Fragment key={i}>
          <p
            style={{
              position: 'absolute',
              left: TS_UNIT_LEFT[i],
              top: 0,
              width: 96,
              margin: 0,
              fontFamily: FONT_TEXT,
              ...T_DIGIT,
              fontWeight: W_SEMIBOLD,
              color: WHITE,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {u.value}
          </p>
          {u.sep && (
            <p
              style={{
                position: 'absolute',
                left: TS_UNIT_LEFT[i] + TS_SEP[i].left,
                top: 0,
                width: TS_SEP[i].w,
                margin: 0,
                textAlign: 'center',
                fontFamily: FONT_TEXT,
                ...T_DIGIT,
                fontWeight: W_SEMIBOLD,
                color: WHITE,
              }}
            >
              {u.sep}
            </p>
          )}
          <p
            style={{
              position: 'absolute',
              left: TS_UNIT_LEFT[i],
              top: 84,
              width: 96,
              margin: 0,
              textAlign: 'center',
              fontFamily: FONT_TEXT,
              ...T_COUNTER,
              color: WHITE,
              ...DESCENDER,
            }}
          >
            {u.label}
          </p>
        </React.Fragment>
      ))}
    </div>
  );
}

function DealPromoBannerTemplate({ data, size }: { data: DealPromoBannerState; size: DealBannerSize }) {
  const bannerH = DEAL_BANNER_HEIGHT[size] ?? 400;
  // The countdown only ever runs on the deal banner — the panel gates the
  // toggle, this guard keeps a stray flag off the 400 promotion banner.
  const countdown = data.showCountdown && size === 'Standard';
  const m = countdown ? BANNER_COPY_COUNTDOWN : BANNER_COPY[size] ?? BANNER_COPY.Large;
  const ink = WHITE;
  // Promotion banner (400) key-visual art — takes precedence over the legacy
  // uploaded image; PD Slot variants also draw the four product plates.
  const kvStem = size === 'Large' ? promoArtStem(data.kvAsset) : null;
  const slots = kvStem !== null && promoArtHasSlots(data.kvAsset);
  // Deal banner (350) type art — the four Deal Banner_* frames, art + scrim.
  const dealArt = size === 'Standard' ? dealBannerArtFor(data.kvAsset) : null;

  return (
    <Band height={48 + bannerH + m.padBottom}>
      <div
        style={{
          position: 'absolute',
          left: BANNER_INSET,
          top: 48,
          width: DEAL_BANNER_WIDTH,
          height: bannerH,
          borderRadius: R_LG,
          background: BLACK,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: data.layout === 'Art left' ? 'scaleX(-1)' : undefined }}>
          {kvStem !== null ? (
            <>
              <img
                src={artUrl(kvStem)}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: PROMO_ART.x,
                  top: PROMO_ART.y,
                  width: PROMO_ART.size,
                  height: PROMO_ART.size,
                  display: 'block',
                  maxWidth: 'none',
                }}
              />
              {/* Product plates (Figma "slot" 6240:143919) — drawn by the
                  frame, not baked into the art, so empty plates still show. */}
              {slots &&
                Array.from({ length: PROMO_SLOT.count }, (_, i) => {
                  const product = data.products[i]?.image ?? null;
                  const inset = PROMO_SLOT.size * PROMO_SLOT.inset;
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: PROMO_SLOT.x + i * PROMO_SLOT.pitch,
                        top: PROMO_SLOT.y,
                        width: PROMO_SLOT.size,
                        height: PROMO_SLOT.size,
                        borderRadius: PROMO_SLOT.radius,
                        background: data.plateColor ?? PROMO_SLOT.plate,
                        overflow: 'hidden',
                      }}
                    >
                      {product && (
                        <img
                          src={product}
                          alt=""
                          draggable={false}
                          style={{
                            position: 'absolute',
                            left: inset,
                            top: inset,
                            width: PROMO_SLOT.size - inset * 2,
                            height: PROMO_SLOT.size - inset * 2,
                            objectFit: 'contain',
                            maxWidth: 'none',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
            </>
          ) : dealArt ? (
            <>
              <img
                src={dealArt.file}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: dealArt.x,
                  top: dealArt.y,
                  width: dealArt.w,
                  height: dealArt.h,
                  display: 'block',
                  maxWidth: 'none',
                }}
              />
              {/* Left scrim ("Rectangle 2") — copy always sits on black. */}
              <div
                style={{
                  position: 'absolute',
                  left: DEAL_BANNER_SCRIM.x,
                  top: DEAL_BANNER_SCRIM.y,
                  width: DEAL_BANNER_SCRIM.w,
                  height: DEAL_BANNER_SCRIM.h,
                  background: DEAL_BANNER_SCRIM.gradient,
                }}
              />
            </>
          ) : (
            <BannerArt src={data.image} width={DEAL_BANNER_WIDTH} height={bannerH} />
          )}
        </div>

        {/* Copy — 80 in from the banner edge, which is the 420 content rail. */}
        <At x={80} y={m.headTop} w={860} style={{ ...T_HEAD, letterSpacing: 'var(--obs-tracking-head)', color: ink }}>
          {data.headline}
        </At>
        {data.showSubCopy && (
          <At x={80} y={m.subTop} w={860} style={{ fontFamily: FONT_TEXT, ...m.subSize, color: ink }}>
            {data.subCopy}
          </At>
        )}
        {countdown && <CountdownRow x={80} y={182} data={data} />}
        {data.showLinks && m.linkTop !== null && (
          <div style={{ position: 'absolute', left: 80, top: m.linkTop, display: 'flex' }}>
            {[data.linkPrimary, data.linkSecondary].filter(Boolean).map((l, i) => (
              <span
                key={i}
                style={{
                  width: i === 0 ? BANNER_LINK_PITCH : undefined,
                  fontFamily: FONT_TEXT,
                  ...T_SMALL,
                  lineHeight: '16px',
                  fontWeight: W_SEMIBOLD,
                  color: ink,
                  whiteSpace: 'nowrap',
                  ...DESCENDER,
                }}
              >
                {l}
              </span>
            ))}
          </div>
        )}
        {/* CTA — the button layer the board carries (Figma 6241:145174):
            DEAL_RED plate, r8, min 100×44, 20px side pads, 16/16 SemiBold,
            24 below the legal links (links top + 16 link height + 24 + 8 pad). */}
        {data.showCta && !countdown && (
          <span
            style={{
              position: 'absolute',
              left: 80,
              top: m.linkTop !== null ? m.linkTop + 48 : m.subTop + 84,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 100,
              minHeight: 44,
              padding: '0 20px',
              borderRadius: R_SM,
              background: DEAL_RED,
              border: `1px solid ${DEAL_RED}`,
              color: WHITE,
              fontFamily: FONT_TEXT,
              ...T_SMALL,
              lineHeight: '16px',
              fontWeight: W_SEMIBOLD,
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
            }}
          >
            {data.ctaText}
          </span>
        )}
      </div>
    </Band>
  );
}

// ── 6. Product list (Figma 6080:51291 — 2280×796) ─────────────────────────────

/**
 * Card width is FIXED (6080:51306) — the row is left-aligned on the content
 * rail and simply leaves space when there are fewer than four. Stretching the
 * cards to fill the rail is what made the 3-up row look wrong.
 */
const PRODUCT_CARD_W = 342;
const PRODUCT_CARD_H = 540;
/** 366 pitch − 342 card. */
const PRODUCT_GUTTER = 24;

function DealProductCard({ data }: { data: DealProductItem }) {
  return (
    <div
      style={{
        position: 'relative',
        width: PRODUCT_CARD_W,
        height: PRODUCT_CARD_H,
        background: WHITE,
        borderRadius: R_MD,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Badge (6080:51311) — a three-stop diagonal, not a flat red. */}
      {data.showBadge && data.badge && (
        <span
          style={{
            position: 'absolute',
            left: 20,
            top: 20,
            height: 24,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 8px',
            boxSizing: 'border-box',
            borderRadius: R_XS,
            background: BADGE_GRADIENT,
            color: WHITE,
            fontFamily: FONT_TEXT,
            ...T_MICRO,
            lineHeight: '16px',
            fontWeight: W_SEMIBOLD,
            whiteSpace: 'nowrap',
          }}
        >
          {data.badge}
        </span>
      )}

      {/* Name — the slot is two lines at 20/24 (6080:51317). Figma lets a long
          name spill over the model-code row; clipping keeps the row readable. */}
      <p
        style={{
          position: 'absolute',
          left: 20,
          top: 52,
          width: 302,
          height: 48,
          margin: 0,
          overflow: 'hidden',
          fontFamily: FONT_TEXT,
          ...T_BODY,
          color: TEXT_DARK,
        }}
      >
        {data.name}
      </p>

      {/* Model code + rating (6080:51319). */}
      <span style={{ position: 'absolute', left: 20, top: 108, display: 'inline-flex', alignItems: 'center', gap: 4, height: 24 }}>
        <span style={{ fontFamily: FONT_TEXT, ...T_MICRO, lineHeight: '14px', color: TEXT_SKU }}>{data.sku}</span>
        <img src="/deal-page/icons/external.png" alt="" draggable={false} style={{ width: 12, height: 12, display: 'block' }} />
      </span>
      {data.showRating && (
        <span
          style={{
            position: 'absolute',
            right: 20,
            top: 108,
            height: 24,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span style={{ display: 'inline-flex' }}>
            {[0, 1, 2, 3, 4].map(i => (
              <img key={i} src={STAR} alt="" draggable={false} style={{ width: 15, height: 14, display: 'block' }} />
            ))}
          </span>
          <span style={{ fontFamily: FONT_TEXT, ...T_MICRO, color: TEXT_DARK }}>
            {data.rating} {data.reviewCount}
          </span>
        </span>
      )}

      {/* Product shot — 180×180 centred at y=192 (6080:51345). The 48-tall gap
          above it is where lg.com draws its stock bar. */}
      <div style={{ position: 'absolute', left: 81, top: 192, width: 180, height: 180 }}>
        {data.image ? (
          <img
            src={data.image}
            alt=""
            draggable={false}
            style={{ width: 180, height: 180, objectFit: 'contain', display: 'block', maxWidth: 'none' }}
          />
        ) : (
          <div style={{ width: 180, height: 180, background: '#EFEFEF', borderRadius: R_XS }} />
        )}
      </div>

      {/* Price row (6080:51350) — 20/24/16 on one baseline-ish line. */}
      <div style={{ position: 'absolute', left: 20, top: 388, height: 24, display: 'flex', alignItems: 'baseline', gap: 4 }}>
        {data.showDiscountPercent && data.discountPercent && (
          <span style={{ fontFamily: FONT_TEXT, ...T_BODY, lineHeight: '20px', fontWeight: W_SEMIBOLD, color: DEAL_RED }}>
            {data.discountPercent}
          </span>
        )}
        <span style={{ fontFamily: FONT_TEXT, ...T_PRICE, color: BLACK }}>{data.salePrice}</span>
        {data.showOriginalPrice && data.originalPrice && (
          <span style={{ fontFamily: FONT_TEXT, ...T_SMALL, lineHeight: '16px', color: TEXT_STRIKE, textDecoration: 'line-through' }}>
            {data.originalPrice}
          </span>
        )}
      </div>

      {/* Shipping pill (6080:51360). */}
      {data.showShippingNote && data.shippingNote && (
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 428,
            width: 302,
            height: 32,
            borderRadius: R_XS,
            background: SHIP_BG,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 32,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontFamily: FONT_TEXT, fontSize: 12, lineHeight: '14px', fontWeight: W_SEMIBOLD, color: SHIP_TEXT }}>
            {data.shippingNote}
          </span>
        </div>
      )}

      {/* CTA row (6080:51366) — the secondary action is a plain text link. */}
      <span
        style={{
          position: 'absolute',
          left: 20,
          top: 476,
          width: 124,
          height: 44,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingRight: 11,
          boxSizing: 'border-box',
          color: BLACK,
          fontFamily: FONT_TEXT,
          ...T_SMALL,
          lineHeight: '18px',
          whiteSpace: 'nowrap',
        }}
      >
        {data.secondaryCta}
      </span>
      <span
        style={{
          position: 'absolute',
          left: 160,
          top: 476,
          width: 162,
          height: 44,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: R_SM,
          background: DEAL_RED,
          color: WHITE,
          fontFamily: FONT_TEXT,
          ...T_SMALL,
          lineHeight: '18px',
          fontWeight: W_SEMIBOLD,
        }}
      >
        {data.primaryCta}
      </span>
    </div>
  );
}

/**
 * Two vertical rhythms, both straight off the board: with the tab strip the
 * grid starts at 192 in a 796 band (6080:51291), without it at 131 in a 732
 * band (6080:52447).
 */
const GRID_TOP = { tabs: 192, noTabs: 131 };
const GRID_BOTTOM = { tabs: 64, noTabs: 61 };

function DealProductListTemplate({ data }: { data: DealProductListState }) {
  const tabLabels = lines(data.tabs);
  const showTabs = data.showTabs && tabLabels.length > 0;
  const gridTop = showTabs ? GRID_TOP.tabs : GRID_TOP.noTabs;

  return (
    <Band height={gridTop + PRODUCT_CARD_H + (showTabs ? GRID_BOTTOM.tabs : GRID_BOTTOM.noTabs)}>
      {data.showSectionTitle && (
        <At x={CONTENT_INSET} y={48} style={{ ...T_HEAD, letterSpacing: 'var(--obs-tracking-head)', color: BLACK }}>
          {data.sectionTitle}
        </At>
      )}

      {/* Tab strip (6080:51296) — 36 gap, and a 2px red rule under the active
          label sitting 27 below the label's own box top (Figma y130 → y157). */}
      {showTabs && (
        <div style={{ position: 'absolute', left: CONTENT_INSET, top: 130, display: 'flex', gap: 36 }}>
          {tabLabels.map((label, i) => (
            <div key={i} style={{ position: 'relative', height: 29 }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: FONT_TEXT,
                  ...T_BODY,
                  color: i === 0 ? BLACK : TEXT_DARK,
                  whiteSpace: 'nowrap',
                  ...DESCENDER,
                }}
              >
                {label}
              </span>
              {i === 0 && (
                <span style={{ position: 'absolute', left: 0, right: 0, top: 27, height: 2, background: DEAL_RED }} />
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'absolute', left: CONTENT_INSET, top: gridTop, display: 'flex', gap: PRODUCT_GUTTER }}>
        {data.products.map((p, i) => (
          <DealProductCard key={i} data={p} />
        ))}
      </div>
    </Band>
  );
}

// ── 7. Category nav (Figma 6080:52130 — 2280×353) ─────────────────────────────

/**
 * Each category is a 140×128 chip (Figma 6080:52142) on a 164 pitch, and the
 * row is centred inside the 1440 content rail — NOT on the page, which is where
 * the 2px drift came from. The active chip gets a warm-white r12 plate.
 */
const CAT_TAB_W = 140;
const CAT_TAB_H = 128;
const CAT_TAB_GAP = 24;
/** Label box inside the chip's 8 pad. */
const CAT_LABEL_W = CAT_TAB_W - 16;
/** The chip row's own band, ruled top and bottom. */
const CAT_ROW_BAND_H = 176;
const CAT_ACTIVE_BG = '#FAF9F5';
/**
 * This band is the one section built on a 2276 page rather than 2280, so its
 * own rail lands on 418 instead of the usual 420. Only the chip row and the
 * results count hang off it — the "Sort by" label and the dropdown are placed
 * from the page edge and stay on the normal grid.
 */
const CAT_RAIL = CONTENT_INSET - 2;

function DealCategoryNavTemplate({ data }: { data: DealCategoryNavState }) {
  const rowW = data.items.length * CAT_TAB_W + (data.items.length - 1) * CAT_TAB_GAP;
  const rowLeft = CAT_RAIL + Math.round((DEAL_CONTENT_WIDTH - rowW) / 2);
  return (
    <Band height={353}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: DEAL_PAGE_WIDTH,
          height: CAT_ROW_BAND_H + 1,
          borderTop: `1px solid ${WARM_RULE}`,
          borderBottom: `1px solid ${WARM_RULE}`,
          boxSizing: 'border-box',
        }}
      />

      <div style={{ position: 'absolute', left: rowLeft, top: 25, display: 'flex', gap: CAT_TAB_GAP }}>
        {data.items.map((item, i) => (
          <div
            key={i}
            style={{
              width: CAT_TAB_W,
              height: CAT_TAB_H,
              padding: 8,
              boxSizing: 'border-box',
              borderRadius: 12,
              background: i === 0 ? CAT_ACTIVE_BG : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon ? (
                <img
                  src={item.icon}
                  alt=""
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxWidth: 'none' }}
                />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: R_XS, background: '#E2DED6' }} />
              )}
            </div>
            {/* 8 pad above the label, applied on the wrapper so DESCENDER's own
                margins (which would overwrite a marginTop) stay intact. */}
            <div style={{ paddingTop: 8 }}>
              <span
                style={{
                  display: 'block',
                  width: CAT_LABEL_W,
                  fontFamily: FONT_TEXT,
                  ...T_SMALL,
                  fontWeight: W_SEMIBOLD,
                  color: i === 0 ? BLACK : TEXT_STRIKE,
                  textAlign: 'center',
                  ...DESCENDER,
                }}
              >
                {item.name}
              </span>
            </div>
          </div>
        ))}
      </div>

      {data.showResultsBar && (
        <>
          <At x={CAT_RAIL} y={208} style={{ fontFamily: FONT_TEXT, ...T_MICRO, lineHeight: '14px', fontWeight: W_SEMIBOLD, color: BLACK }}>
            {data.resultsText}
          </At>
          <At x={1517} y={208} style={{ fontFamily: FONT_TEXT, ...T_MICRO, lineHeight: '14px', fontWeight: W_SEMIBOLD, color: TEXT_STRIKE }}>
            {data.sortLabel}
          </At>
          <img
            src="/deal-page/icons/sort-dropdown.png"
            alt=""
            draggable={false}
            style={{ position: 'absolute', left: 1571, top: 193, width: 288, height: 44, display: 'block', maxWidth: 'none' }}
          />
        </>
      )}

      {data.showEmptyText && (
        <p
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 333,
            margin: 0,
            textAlign: 'center',
            fontFamily: FONT_TEXT,
            ...T_SMALL,
            color: BLACK,
            ...DESCENDER,
          }}
        >
          {data.emptyText}
        </p>
      )}
    </Band>
  );
}

// ── 9. Site footer (Figma 6080:52867 — 2280×848) ──────────────────────────────

function FooterDisclaimer({ text, moreLabel }: { text: string; moreLabel: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <p
        style={{
          margin: 0,
          flex: 1,
          fontFamily: FONT_TEXT,
          ...T_MICRO,
          color: BLACK,
          height: 20,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {text}
      </p>
      <span style={{ fontFamily: FONT_TEXT, ...T_MICRO, fontWeight: 700, color: BLACK, textDecoration: 'underline', whiteSpace: 'nowrap' }}>
        {moreLabel}
      </span>
    </div>
  );
}

function DealSiteFooterTemplate({ data }: { data: DealSiteFooterState }) {
  const disclaimers = lines(data.disclaimers);
  const legalLinks = lines(data.legalLinks);

  return (
    <div style={{ width: DEAL_PAGE_WIDTH, height: 848, background: CHROME_BG, fontFamily: FONT, flexShrink: 0, overflow: 'hidden' }}>
      {data.showDisclaimers && (
        <div style={{ height: 126, paddingLeft: CONTENT_INSET, paddingRight: CONTENT_INSET, paddingTop: 21, boxSizing: 'border-box' }}>
          {disclaimers.slice(0, 2).map((line, i) => (
            <div key={i} style={{ marginTop: i === 0 ? 0 : 41 }}>
              <FooterDisclaimer text={line} moreLabel={data.moreLabel} />
            </div>
          ))}
        </div>
      )}

      {/* Link columns — 220 wide on a 244 pitch inside the 1440 rail. */}
      <div style={{ height: 483, paddingLeft: CONTENT_INSET, paddingTop: 41, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: 24, width: DEAL_CONTENT_WIDTH }}>
          {data.columns.map((col, i) => (
            <div key={i} style={{ width: 220, flexShrink: 0 }}>
              <p style={{ margin: 0, fontFamily: FONT_TEXT, ...T_SMALL, lineHeight: '24px', fontWeight: 700, color: BLACK, ...DESCENDER }}>
                {col.title}
              </p>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lines(col.links).map((l, j) => (
                  <span key={j} style={{ fontFamily: FONT_TEXT, ...T_MICRO, lineHeight: '18px', color: BLACK, ...DESCENDER }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Locale + social (h=81). */}
      <div
        style={{
          height: 81,
          paddingLeft: CONTENT_INSET,
          paddingRight: CONTENT_INSET,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `1px solid ${HAIRLINE}`,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <img src="/deal-page/icons/globe.png" alt="" draggable={false} style={{ width: 24, height: 24, display: 'block' }} />
          <span style={{ fontFamily: FONT_TEXT, ...T_MICRO, color: BLACK, textDecoration: 'underline', ...DESCENDER }}>
            {data.localeLabel}
          </span>
        </span>
        {data.showSocial && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            {DEAL_SOCIAL_ICONS.map(src => (
              <img key={src} src={src} alt="" draggable={false} style={{ width: 32, height: 32, display: 'block' }} />
            ))}
          </span>
        )}
      </div>

      {/* Legal bar (h=158). */}
      <div style={{ height: 158, background: LEGAL_BG, position: 'relative', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', left: CONTENT_INSET, top: 24, width: 1021 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: 12 }}>
            {legalLinks.map((l, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontFamily: FONT_TEXT, ...T_MICRO, color: WHITE, ...DESCENDER }}>{l}</span>
                {i < legalLinks.length - 1 && (
                  <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.35)', margin: '0 12px' }} />
                )}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p style={{ margin: 0, fontFamily: FONT_TEXT, ...T_MICRO, color: WHITE, ...DESCENDER }}>{data.copyright}</p>
            <p style={{ margin: 0, fontFamily: FONT_TEXT, ...T_MICRO, color: WHITE, textDecoration: 'underline', ...DESCENDER }}>
              {data.officialNotice}
            </p>
          </div>
        </div>
        {data.showBadges && (
          <img
            src="/deal-page/footer-badges.png"
            alt=""
            draggable={false}
            style={{ position: 'absolute', left: 1465, top: 0, width: 395, height: 158, display: 'block', maxWidth: 'none' }}
          />
        )}
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export function DealModuleRenderer({ editState }: { editState: DealEditState }) {
  switch (editState.type) {
    case 'deal-site-header':  return <DealSiteHeaderTemplate data={editState.data} />;
    case 'deal-hero':         return <DealHeroTemplate data={editState.data} />;
    case 'deal-cards':        return <DealCardsTemplate data={editState.data} />;
    case 'deal-tab-nav':      return <DealTabNavTemplate data={editState.data} />;
    case 'deal-promo-banner': return <DealPromoBannerTemplate data={editState.data} size="Large" />;
    case 'deal-banner':       return <DealPromoBannerTemplate data={editState.data} size="Standard" />;
    case 'deal-product-list': return <DealProductListTemplate data={editState.data} />;
    case 'deal-category-nav': return <DealCategoryNavTemplate data={editState.data} />;
    case 'deal-site-footer':  return <DealSiteFooterTemplate data={editState.data} />;
  }
}
