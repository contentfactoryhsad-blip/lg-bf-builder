/**
 * Deal Page module templates — MOBILE (360). Reproduces Figma `BF Page_MO`
 * (`miJcDQgz0yJMskLE5a5HHj`, 6287:150182) section for section; the node id
 * each block came from is noted inline, same convention as the PC renderer.
 *
 * Same edit states as the PC templates — the device only changes how a module
 * DRAWS, never what it stores. Unlike the PC page, the mobile sections are
 * full-bleed and butt together: there is no warm band padding around banners.
 *
 * The MO board carries fractional numbers everywhere (12.743, 19.115, 25.49…)
 * — it was assembled from a scaled source. Values below are the measured ones
 * rounded to 0.1px; do not "clean them up" to integers, the rhythm depends on
 * them summing like the board's.
 */

import React from 'react';
import { DEAL_MO_WIDTH } from './dealModuleRegistry';
import {
  PAGE_BG, DEAL_RED, TEXT_DARK, TEXT_SKU, TEXT_STRIKE,
  WARM_RULE, SHIP_BG, SHIP_TEXT, BLACK, WHITE,
  BADGE_GRADIENT, W_SEMIBOLD,
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
import { DEAL_SOCIAL_ICONS } from './dealEditStates';
import { artUrl, artOf, getAsset } from '../contenttemplate/contentTemplateAssets';
import { slotBoxesFor } from '../contenttemplate/lgcomSlots';
import { PD_PLATE_FILL } from '../contenttemplate/paidBoards';
import { HERO_SLOT_ID, HERO_MOTION_ID, HERO_MOTION_SRC } from './dealHeroArt';
import { promoArtStem, dealBannerArtFor } from './dealBannerArt';

const FONT = 'var(--obs-font)';
const FONT_TEXT = 'var(--obs-font-text, var(--obs-font))';

/** Same descender headroom trick as the PC templates. */
const DESCENDER: React.CSSProperties = {
  boxSizing: 'content-box',
  paddingTop: '0.24em',
  marginTop: '-0.24em',
  paddingBottom: '0.2em',
  marginBottom: '-0.2em',
};

/** Splits a textarea value into non-empty lines. */
function lines(v: string): string[] {
  return v.split('\n').map(s => s.trim()).filter(Boolean);
}

/** Outer band: full mobile width. Mobile sections are full-bleed. */
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
        width: DEAL_MO_WIDTH,
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

/** Absolutely-placed text, same as the PC renderer's atom. */
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

// ── Countdown row (Figma 6290:153471 — hero and Time Sale banner share it) ────

/** Digit-box left edges — 46.7-wide boxes on a 62.16 pitch. */
const MO_TS_LEFT = [0, 62.1, 124.3, 186.5];
/** Separator centres hang off each box's right edge. */
const MO_TS_SEP = [55.2, 54.1, 54.1];

function CountdownRowMo({ x, y, data }: { x: number; y: number; data: CountdownFields }) {
  const units = [
    { value: data.days, label: data.dayLabel, sep: '-' },
    { value: data.hours, label: data.hourLabel, sep: ':' },
    { value: data.minutes, label: data.minuteLabel, sep: ':' },
    { value: data.seconds, label: data.secondLabel, sep: null },
  ];
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 249, height: 54 }}>
      {units.map((u, i) => (
        <React.Fragment key={i}>
          <p
            style={{
              position: 'absolute',
              left: MO_TS_LEFT[i],
              top: 0,
              width: 47,
              margin: 0,
              fontFamily: FONT_TEXT,
              fontSize: 36,
              lineHeight: '39px',
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
                left: MO_TS_LEFT[i] + MO_TS_SEP[i] - 9,
                top: 0,
                width: 18,
                margin: 0,
                textAlign: 'center',
                fontFamily: FONT_TEXT,
                fontSize: 36,
                lineHeight: '39px',
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
              left: MO_TS_LEFT[i],
              top: 40.9,
              width: 47,
              margin: 0,
              textAlign: 'center',
              fontFamily: FONT_TEXT,
              fontSize: 12,
              lineHeight: '13.6px',
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

// ── 0. Site header (Figma 6290:156152 — 360×96) ───────────────────────────────

/**
 * Mobile chrome: the 32-tall utility strip (only "Business" survives on the
 * board) over the 64-tall GNB (logo + search / account / cart / menu icons,
 * exported from the board as flat SVGs). The PC header's nav list, search
 * pill and breadcrumb do not exist on mobile — this module renders fixed
 * chrome regardless of the state's fields.
 */
function MoSiteHeaderTemplate({ data: _data }: { data: DealSiteHeaderState }) {
  return (
    <Band height={96}>
      <div style={{ height: 32, background: '#E6E1D6', position: 'relative' }}>
        <At x={299} y={9} w={45} style={{ fontFamily: FONT_TEXT, fontSize: 12, lineHeight: '14px', color: BLACK }}>
          Business
        </At>
      </div>
      <div
        style={{
          height: 64,
          background: PAGE_BG,
          borderBottom: `1px solid ${WARM_RULE}`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <img src="/deal-page/icons/mo-logo.svg" alt="LG" draggable={false} style={{ width: 74, height: 32, display: 'block' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {['search', 'profile', 'cart', 'menu'].map(k => (
            <span key={k} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={`/deal-page/icons/mo-${k}.svg`} alt="" draggable={false} style={{ width: 24, height: 24, display: 'block' }} />
            </span>
          ))}
        </div>
      </div>
    </Band>
  );
}

// ── 1. Hero KV (Figma 6287:150348 — 360×480) ──────────────────────────────────

/** The artwork square inside the mobile hero plate (698² at −169.5, −0.8). */
export const MO_HERO_ART = { x: -169.5, y: -0.8, size: 698 };

function MoHeroTemplate({ data, artOnly }: { data: DealHeroState; artOnly?: boolean }) {
  const motion = data.kvAsset === HERO_MOTION_ID;
  const custom = data.kvAsset === 'custom-upload' ? data.customImage : null;
  const kv = data.kvAsset === 'custom-upload' ? undefined : getAsset(motion ? 'kv-main' : data.kvAsset);
  const plates = kv ? slotBoxesFor(kv.id, HERO_SLOT_ID) : [];
  // Nudge and scale apply here too — scale about the artwork's centre, same
  // recipe as the PC hero.
  const scale = data.kvScale || 1;
  const size = MO_HERO_ART.size * scale;
  const art = {
    x: MO_HERO_ART.x + data.kvNudgeX - (size - MO_HERO_ART.size) / 2,
    y: MO_HERO_ART.y + data.kvNudgeY - (size - MO_HERO_ART.size) / 2,
    size,
  };

  return (
    <Band height={480} background={BLACK}>
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
      {custom && (
        <img
          src={custom}
          alt=""
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

      {/* PD Slot plates follow the artwork square, drawn over the baked ones
          so the plate colour applies here too. */}
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

      {/* Copy — 12.7 rail, 19.1 top pad, flowing column (Figma 6287:150367).
          The PC headline's explicit line break collapses on the narrow rail —
          the mobile frame lets the sentence wrap on its own. The export mode
          ("artOnly") captures only the composed image, so the copy and the
          countdown stay on the canvas mockup. */}
      {!artOnly && (
        <div style={{ position: 'absolute', left: 12.7, top: 19.1, width: 334.5, display: 'flex', flexDirection: 'column', gap: 6.4 }}>
          {data.showEyebrow && (
            <p style={{ margin: 0, fontFamily: FONT_TEXT, fontSize: 16, lineHeight: '19.1px', color: WHITE, ...DESCENDER }}>{data.eyebrow}</p>
          )}
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 36, lineHeight: '36px', fontWeight: 600, letterSpacing: 'var(--obs-tracking-head)', color: WHITE, ...DESCENDER }}>
            {data.headline.replace(/\n/g, ' ')}
          </p>
          {data.showSubCopy && (
            <p style={{ margin: 0, fontFamily: FONT_TEXT, fontSize: 16, lineHeight: '19.1px', color: WHITE, whiteSpace: 'pre-wrap', ...DESCENDER }}>{data.subCopy}</p>
          )}
        </div>
      )}
      {!artOnly && data.showCountdown && <CountdownRowMo x={12.7} y={175.9} data={data} />}
    </Band>
  );
}

// ── 2. Deal cards (Figma 6290:158475 "ST0044_MO" — 360×542) ──────────────────

/**
 * One 310×400 card with the next one peeking in from 345 — the mobile row is
 * a carousel and the canvas shows its resting position, like the PC rail
 * clipping the fourth card used to.
 */
const MO_CARD_W = 310;
const MO_CARD_H = 400;
/** 320 pitch − 310 card. */
const MO_CARD_GAP = 10;

/**
 * Deal-type square art inside a 310×400 card — PER ASSET, from each card's
 * CROP transform on the board (drawn size = 310/a, x = −tx·size). The gift
 * artwork has no card on the board; its numbers interpolate the other three.
 */
const MO_CARD_ART: Record<string, { size: number; x: number; y: number }> = {
  'deal-type-time-sale': { size: 734, x: -212, y: -217.7 },
  'deal-type-hot-deal':  { size: 788, x: -239, y: -248.7 },
  'deal-type-bundle':    { size: 780, x: -233, y: -246.1 },
  'deal-type-gift':      { size: 784, x: -236, y: -247 },
};
const MO_CARD_ART_FALLBACK = { size: 784, x: -236, y: -247 };

/** The card's artwork layer alone — shared by the canvas card and the export crop. */
function MoCardArtLayer({ card }: { card: DealCardsState['cards'][number] }) {
  const custom = card.asset === 'custom-upload' ? card.image : null;
  const art = card.asset === 'custom-upload' ? undefined : getAsset(card.asset ?? null);
  const place = (card.asset && MO_CARD_ART[card.asset]) || MO_CARD_ART_FALLBACK;
  if (custom)
    return (
      <img
        src={custom}
        alt=""
        draggable={false}
        style={{ position: 'absolute', left: place.x, top: place.y, width: place.size, height: place.size, display: 'block', maxWidth: 'none' }}
      />
    );
  if (art)
    return (
      <img
        src={artUrl(artOf(art))}
        alt=""
        draggable={false}
        style={{ position: 'absolute', left: place.x, top: place.y, width: place.size, height: place.size, display: 'block', maxWidth: 'none' }}
      />
    );
  if (card.image)
    return (
      <img
        src={card.image}
        alt=""
        draggable={false}
        style={{ width: MO_CARD_W, height: MO_CARD_H, objectFit: 'cover', display: 'block', maxWidth: 'none' }}
      />
    );
  return null;
}

function MoDealCardsTemplate({ data, artOnly, artIndex }: { data: DealCardsState; artOnly?: boolean; artIndex?: number }) {
  // Export mode — ONE card's artwork at the 310×400 crop, square (the corner
  // rounding is the page's, not the asset's).
  if (artOnly) {
    const card = data.cards[artIndex ?? 0];
    if (!card) return null;
    return (
      <div style={{ position: 'relative', width: MO_CARD_W, height: MO_CARD_H, background: BLACK, overflow: 'hidden' }}>
        <MoCardArtLayer card={card} />
      </div>
    );
  }

  return (
    <Band height={542}>
      {data.showSectionTitle && (
        <At x={16} y={24} w={242} style={{ fontFamily: FONT, fontSize: 28, lineHeight: '32px', fontWeight: 600, letterSpacing: 'var(--obs-tracking-head)', color: BLACK }}>
          {data.sectionTitle}
        </At>
      )}
      {data.showSectionSubtitle && (
        <At x={16} y={92} w={242} style={{ fontFamily: FONT_TEXT, fontSize: 12, lineHeight: '14px', color: TEXT_DARK }}>
          {data.sectionSubtitle}
        </At>
      )}
      {data.showCarousel && (
        <>
          <img src="/deal-page/icons/carousel-prev.png" alt="" draggable={false} style={{ position: 'absolute', left: 264, top: 47, width: 36, height: 36, maxWidth: 'none' }} />
          <img src="/deal-page/icons/carousel-next.png" alt="" draggable={false} style={{ position: 'absolute', left: 308, top: 47, width: 36, height: 36, maxWidth: 'none' }} />
        </>
      )}

      <div style={{ position: 'absolute', left: 0, top: 118, width: DEAL_MO_WIDTH, height: MO_CARD_H, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: MO_CARD_GAP, paddingLeft: 25 }}>
          {data.cards.map((card, i) => {
            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: MO_CARD_W,
                  height: MO_CARD_H,
                  borderRadius: 20,
                  overflow: 'hidden',
                  background: BLACK,
                  flexShrink: 0,
                }}
              >
                <MoCardArtLayer card={card} />

                {/* Text set (Figma "M_Text set_Small_24"): 24 pad, 24/28 Light
                    title over the white 111×44 button. */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <p style={{ margin: 0, width: '100%', fontFamily: FONT_TEXT, fontSize: 24, lineHeight: '28px', fontWeight: 300, color: WHITE, ...DESCENDER }}>
                    {card.title}
                  </p>
                  {data.showCta && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '14px 20px',
                        borderRadius: 8,
                        background: WHITE,
                        border: '1px solid #94928D',
                        boxSizing: 'border-box',
                        color: BLACK,
                        fontFamily: FONT_TEXT,
                        fontSize: 16,
                        lineHeight: '16px',
                        fontWeight: W_SEMIBOLD,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {card.ctaText}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Band>
  );
}

// ── 3. Deal tab nav (Figma 6295:159908 — 360×54) ──────────────────────────────

function MoDealTabNavTemplate({ data }: { data: DealTabNavState }) {
  const tabs = lines(data.tabs);
  const activeIdx = Math.min(Math.max(0, data.activeIndex), Math.max(0, tabs.length - 1));
  return (
    <Band height={54}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderBottom: `1px solid ${WARM_RULE}`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          paddingLeft: 32,
        }}
      >
        {tabs.map((label, i) => (
          <div key={i} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: FONT_TEXT,
                fontSize: 14,
                lineHeight: '16px',
                color: i === activeIdx ? BLACK : TEXT_DARK,
                whiteSpace: 'nowrap',
                ...DESCENDER,
              }}
            >
              {label}
            </span>
            {i === activeIdx && (
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: DEAL_RED }} />
            )}
          </div>
        ))}
      </div>
    </Band>
  );
}

// ── 4. Promotion / deal banner (Figma 6290:159731 / 6297:163629) ──────────────

/**
 * Mobile banner art placements, in plate px. The promotion banner (480) draws
 * its square per key-visual pair — the opener frame crops PD Centric tighter
 * than the closer crops PD Slot; the deal banner (420) shares one placement
 * for Hot Deal / Gift / Bundle and gives Time Sale its own.
 */
const MO_PROMO_ART: Record<string, { size: number; x: number; y: number }> = {
  'kv-product-centric-1': { size: 638, x: -139, y: 8.4 },
  'kv-product-centric-2': { size: 638, x: -139, y: 8.4 },
  'kv-product-slot':           { size: 736, x: -188.1, y: -36.6 },
  'kv-product-slot-character': { size: 736, x: -188.1, y: -36.6 },
};
const MO_PROMO_ART_FALLBACK = { size: 700, x: -170, y: -14 };

const MO_DEAL_ART: Record<string, { w: number; h: number; x: number; y: number }> = {
  'deal-type-time-sale': { w: 678, h: 678, x: -159, y: -32.4 },
  'deal-type-hot-deal':  { w: 730, h: 766.5, x: -185.1, y: -94.6 },
  'deal-type-gift':      { w: 730, h: 766.5, x: -185.1, y: -94.6 },
  'deal-type-bundle':    { w: 730, h: 766.5, x: -185.1, y: -94.6 },
};

/** Product plate row on the closing promo banner (Figma 6298:165753). */
const MO_PROMO_SLOT = { x: 16, y: 381.6, size: 76.7, pitch: 84.1, count: 4, radius: 6.1 };

function MoBannerTemplate({ data, size, artOnly }: { data: DealPromoBannerState; size: DealBannerSize; artOnly?: boolean }) {
  const isPromo = size === 'Large';
  const bannerH = isPromo ? 480 : 420;
  const countdown = data.showCountdown && !isPromo;

  const customArt = data.kvAsset === 'custom-upload' ? data.image : null;
  const promoStem = isPromo && data.kvAsset !== 'custom-upload' ? promoArtStem(data.kvAsset) : null;
  const promoPlace = isPromo ? (data.kvAsset && MO_PROMO_ART[data.kvAsset]) || MO_PROMO_ART_FALLBACK : null;
  const slots = isPromo && promoStem !== null && data.showSlots !== false;

  const dealTile = !isPromo && data.kvAsset !== 'custom-upload' ? dealBannerArtFor(data.kvAsset) : null;
  const dealPlace = !isPromo && data.kvAsset ? MO_DEAL_ART[data.kvAsset] ?? null : null;
  // Art nudge + scale — the plates stay put; only the artwork moves.
  const nx = data.kvNudgeX ?? 0;
  const ny = data.kvNudgeY ?? 0;
  const kvs = data.kvScale || 1;

  return (
    <Band height={bannerH} background={BLACK}>
      {isPromo && promoStem !== null && promoPlace ? (
        <img
          src={artUrl(promoStem)}
          alt=""
          draggable={false}
          style={{ position: 'absolute', left: promoPlace.x + nx - (promoPlace.size * (kvs - 1)) / 2, top: promoPlace.y + ny - (promoPlace.size * (kvs - 1)) / 2, width: promoPlace.size * kvs, height: promoPlace.size * kvs, display: 'block', maxWidth: 'none' }}
        />
      ) : !isPromo && dealTile && dealPlace ? (
        // Mobile draws the square deal-type art directly, not the wide PC crop.
        <img
          src={artUrl(dealTile.id)}
          alt=""
          draggable={false}
          style={{ position: 'absolute', left: dealPlace.x + nx - (dealPlace.w * (kvs - 1)) / 2, top: dealPlace.y + ny - (dealPlace.h * (kvs - 1)) / 2, width: dealPlace.w * kvs, height: dealPlace.h * kvs, display: 'block', maxWidth: 'none' }}
        />
      ) : customArt ? (
        <img
          src={customArt}
          alt=""
          draggable={false}
          style={
            isPromo
              ? { position: 'absolute', left: MO_PROMO_ART_FALLBACK.x + nx - (MO_PROMO_ART_FALLBACK.size * (kvs - 1)) / 2, top: MO_PROMO_ART_FALLBACK.y + ny - (MO_PROMO_ART_FALLBACK.size * (kvs - 1)) / 2, width: MO_PROMO_ART_FALLBACK.size * kvs, height: MO_PROMO_ART_FALLBACK.size * kvs, display: 'block', maxWidth: 'none' }
              : { position: 'absolute', left: -185.1 + nx - (730 * (kvs - 1)) / 2, top: -94.6 + ny - (730 * (kvs - 1)) / 2, width: 730 * kvs, height: 730 * kvs, display: 'block', maxWidth: 'none' }
          }
        />
      ) : data.image ? (
        <img
          src={data.image}
          alt=""
          draggable={false}
          style={{ width: DEAL_MO_WIDTH, height: bannerH, objectFit: 'cover', display: 'block', maxWidth: 'none' }}
        />
      ) : null}

      {/* PD Slot plate row — closing promo banner only. */}
      {slots &&
        Array.from({ length: MO_PROMO_SLOT.count }, (_, i) => {
          const product = data.products[i]?.image ?? null;
          const inset = MO_PROMO_SLOT.size * 0.09;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: MO_PROMO_SLOT.x + i * MO_PROMO_SLOT.pitch,
                top: MO_PROMO_SLOT.y,
                width: MO_PROMO_SLOT.size,
                height: MO_PROMO_SLOT.size,
                borderRadius: MO_PROMO_SLOT.radius,
                background: data.plateColor ?? PD_PLATE_FILL,
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
                    width: MO_PROMO_SLOT.size - inset * 2,
                    height: MO_PROMO_SLOT.size - inset * 2,
                    objectFit: 'contain',
                    maxWidth: 'none',
                  }}
                />
              )}
            </div>
          );
        })}

      {/* Text set (Figma "M_Banner_LGness_block_Type 1_Text_set") — 328 rail
          centred at 16, 24 from the top. Export mode ("artOnly") keeps only
          the composed image (art + product plates), so the whole set is the
          canvas mockup's. */}
      {!artOnly && (
      <div style={{ position: 'absolute', left: 16, top: 24, width: 328, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 36, lineHeight: '36px', fontWeight: 600, letterSpacing: 'var(--obs-tracking-head)', color: WHITE, ...DESCENDER }}>
            {data.headline.replace(/\n/g, ' ')}
          </p>
          {data.showSubCopy && (
            <p style={{ margin: 0, fontFamily: FONT_TEXT, fontSize: 16, lineHeight: isPromo ? '20px' : '24px', color: WHITE, ...DESCENDER }}>
              {data.subCopy}
            </p>
          )}
          {countdown && (
            <div style={{ position: 'relative', width: 249, height: 54, marginTop: 8 }}>
              <CountdownRowMo x={0} y={0} data={data} />
            </div>
          )}
        </div>
        {isPromo && data.showLinks && (
          <div style={{ display: 'flex', gap: 34, marginTop: 4 }}>
            {[data.linkPrimary, data.linkSecondary].filter(Boolean).map((l, i) => (
              <span key={i} style={{ fontFamily: FONT_TEXT, fontSize: 16, lineHeight: '16px', fontWeight: W_SEMIBOLD, color: WHITE, whiteSpace: 'nowrap', ...DESCENDER }}>
                {l}
              </span>
            ))}
          </div>
        )}
        {data.showCta && !countdown && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 100,
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 8,
              background: DEAL_RED,
              border: `1px solid ${DEAL_RED}`,
              color: WHITE,
              fontFamily: FONT_TEXT,
              fontSize: 16,
              lineHeight: '16px',
              fontWeight: W_SEMIBOLD,
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
              marginTop: 4,
            }}
          >
            {data.ctaText}
          </span>
        )}
      </div>
      )}
    </Band>
  );
}

// ── 6. Product list (Figma 6287:152395 "PD0002_MO") ───────────────────────────

const MO_PCARD_W = 315.4;
const MO_PCARD_H = 391.1;
/** 323.4 pitch − 315.4 card. */
const MO_PCARD_GAP = 8;

function MoProductCard({ data }: { data: DealProductItem }) {
  return (
    <div
      style={{
        position: 'relative',
        width: MO_PCARD_W,
        height: MO_PCARD_H,
        borderRadius: 12.7,
        background: WHITE,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {data.showBadge && (
        <span
          style={{
            position: 'absolute',
            left: 15.9,
            top: 15.9,
            height: 17.5,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 6.4px',
            borderRadius: 3.2,
            background: BADGE_GRADIENT,
            color: WHITE,
            fontFamily: FONT_TEXT,
            fontSize: 12,
            lineHeight: '16px',
            fontWeight: W_SEMIBOLD,
            whiteSpace: 'nowrap',
          }}
        >
          {data.badge}
        </span>
      )}
      <At
        x={15.9}
        y={38.2}
        w={283.5}
        style={{
          fontFamily: FONT_TEXT,
          fontSize: 12,
          lineHeight: '14.3px',
          color: TEXT_DARK,
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          overflow: 'hidden',
          whiteSpace: 'normal',
        }}
      >
        {data.name}
      </At>
      <At x={15.9} y={71.7} w={140} style={{ fontFamily: FONT_TEXT, fontSize: 9.6, lineHeight: '11.2px', color: TEXT_SKU }}>
        {data.sku}
      </At>
      {data.showRating && (
        <div style={{ position: 'absolute', left: 203.1, top: 71.7, display: 'flex', alignItems: 'center', gap: 3 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <img key={i} src="/deal-page/icons/star-full.svg" alt="" style={{ width: 11.2, height: 11.2, display: 'block' }} />
          ))}
          <span style={{ fontFamily: FONT_TEXT, fontSize: 9.6, lineHeight: '11.2px', color: TEXT_DARK, marginLeft: 3 }}>
            {data.rating} {data.reviewCount}
          </span>
        </div>
      )}
      {data.image && (
        <img
          src={data.image}
          alt=""
          draggable={false}
          style={{ position: 'absolute', left: 98, top: 130.6, width: 119.5, height: 119.5, objectFit: 'contain', maxWidth: 'none' }}
        />
      )}

      {/* Price row (Figma y 262.8). */}
      <div style={{ position: 'absolute', left: 15.9, top: 262.8, display: 'flex', alignItems: 'baseline', gap: 3.2 }}>
        {data.showDiscountPercent && (
          <span style={{ fontFamily: FONT_TEXT, fontSize: 18, lineHeight: '18px', fontWeight: W_SEMIBOLD, color: DEAL_RED }}>
            {data.discountPercent}
          </span>
        )}
        <span style={{ fontFamily: FONT_TEXT, fontSize: 15.9, lineHeight: '15.9px', fontWeight: W_SEMIBOLD, color: BLACK }}>
          {data.salePrice}
        </span>
        {data.showOriginalPrice && (
          <span style={{ fontFamily: FONT_TEXT, fontSize: 9.6, lineHeight: '9.6px', color: TEXT_STRIKE, textDecoration: 'line-through' }}>
            {data.originalPrice}
          </span>
        )}
      </div>
      {data.showShippingNote && (
        <div
          style={{
            position: 'absolute',
            left: 15.9,
            top: 308.7,
            width: 283.5,
            height: 25.5,
            borderRadius: 3.2,
            background: SHIP_BG,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 25.5,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontFamily: FONT_TEXT, fontSize: 9.6, lineHeight: '11.2px', fontWeight: W_SEMIBOLD, color: SHIP_TEXT }}>
            {data.shippingNote}
          </span>
        </div>
      )}
      <div style={{ position: 'absolute', left: 15.9, top: 346.9, width: 283.5, height: 30.3, display: 'flex', justifyContent: 'space-between' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 87.6,
            borderRadius: 6.4,
            border: `1px solid ${WARM_RULE}`,
            boxSizing: 'border-box',
            fontFamily: FONT_TEXT,
            fontSize: 11.2,
            lineHeight: '11.2px',
            color: BLACK,
            whiteSpace: 'nowrap',
          }}
        >
          {data.secondaryCta}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 143.4,
            borderRadius: 6.4,
            background: DEAL_RED,
            color: WHITE,
            fontFamily: FONT_TEXT,
            fontSize: 14,
            lineHeight: '14px',
            fontWeight: W_SEMIBOLD,
            whiteSpace: 'nowrap',
          }}
        >
          {data.primaryCta}
        </span>
      </div>
    </div>
  );
}

function MoProductListTemplate({ data }: { data: DealProductListState }) {
  const tabs = data.showTabs ? lines(data.tabs) : [];
  const hasTabs = tabs.length > 0;
  const listTop = hasTabs ? 125.9 : 78.1;
  const height = listTop + MO_PCARD_H + 19.1;
  return (
    <Band height={height}>
      {data.showSectionTitle && (
        <At x={12.7} y={19.1} w={262.8} style={{ fontFamily: FONT, fontSize: 22.3, lineHeight: '25.5px', letterSpacing: 'var(--obs-tracking-head)', color: BLACK }}>
          {data.sectionTitle}
        </At>
      )}
      <img src="/deal-page/icons/carousel-prev.png" alt="" draggable={false} style={{ position: 'absolute', left: 267.6, top: 26.6, width: 36, height: 36, maxWidth: 'none' }} />
      <img src="/deal-page/icons/carousel-next.png" alt="" draggable={false} style={{ position: 'absolute', left: 311.6, top: 26.6, width: 36, height: 36, maxWidth: 'none' }} />

      {hasTabs && (
        <div style={{ position: 'absolute', left: 12.7, top: 87.6, display: 'flex', gap: 19 }}>
          {tabs.map((label, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: 3 }}>
              <span
                style={{
                  fontFamily: FONT_TEXT,
                  fontSize: 12.7,
                  lineHeight: '14.3px',
                  color: i === 0 ? BLACK : TEXT_DARK,
                  whiteSpace: 'nowrap',
                  ...DESCENDER,
                }}
              >
                {label}
              </span>
              {i === 0 && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1.6, background: DEAL_RED }} />}
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'absolute', left: 0, top: listTop, width: DEAL_MO_WIDTH, height: MO_PCARD_H, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: MO_PCARD_GAP, paddingLeft: 12.7 }}>
          {data.products.map((p, i) => (
            <MoProductCard key={i} data={p} />
          ))}
        </div>
      </div>
    </Band>
  );
}

// ── 7. Category nav (Figma 6287:152195 — 360×238) ─────────────────────────────

function MoCategoryNavTemplate({ data }: { data: DealCategoryNavState }) {
  return (
    <Band height={238}>
      {/* Icon tab strip — 73.3-tall tiles, icon 38 over a 9.6 semibold label. */}
      <div style={{ position: 'absolute', left: 12.7, top: 10.4, width: 334.5, height: 73.3, overflow: 'hidden', display: 'flex', gap: 3.2 }}>
        {data.items.map((item, i) => (
          <div
            key={i}
            style={{
              height: 73.3,
              minWidth: 63.7,
              padding: '4.8px 4.8px 0',
              borderRadius: 6.4,
              background: i === 0 ? '#FAF9F5' : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          >
            <span style={{ width: 38.2, height: 38.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon && <img src={item.icon} alt="" draggable={false} style={{ maxWidth: 38.2, maxHeight: 38.2, display: 'block' }} />}
            </span>
            <span
              style={{
                marginTop: 4.8,
                fontFamily: FONT_TEXT,
                fontSize: 9.6,
                lineHeight: '11px',
                fontWeight: W_SEMIBOLD,
                color: i === 0 ? BLACK : TEXT_STRIKE,
                whiteSpace: 'nowrap',
              }}
            >
              {item.name}
            </span>
          </div>
        ))}
      </div>

      {data.showResultsBar && (
        <>
          <At x={12.7} y={110.3} w={100} style={{ fontFamily: FONT_TEXT, fontSize: 11.2, lineHeight: '11.2px', fontWeight: W_SEMIBOLD, color: BLACK }}>
            {data.resultsText}
          </At>
          <div
            style={{
              position: 'absolute',
              left: 141,
              top: 100.4,
              width: 206.3,
              height: 31.9,
              borderRadius: 4.8,
              border: `1px solid ${WARM_RULE}`,
              background: WHITE,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 9.6px',
            }}
          >
            <span style={{ fontFamily: FONT_TEXT, fontSize: 11.2, lineHeight: '12px', color: TEXT_DARK }}>{data.sortLabel}</span>
            <span style={{ fontFamily: FONT_TEXT, fontSize: 9.6, color: TEXT_STRIKE }}>▾</span>
          </div>
        </>
      )}

      {data.showEmptyText && (
        <At x={0} y={202.3} w={360} style={{ fontFamily: FONT_TEXT, fontSize: 12.7, lineHeight: '15.9px', color: BLACK, textAlign: 'center' }}>
          {data.emptyText}
        </At>
      )}
    </Band>
  );
}

// ── 9. Site footer (Figma 6287:153264 — 360×940) ──────────────────────────────

/**
 * The mobile footer nav is board chrome, not the PC footer's six columns —
 * the board lists nine fixed links (Electronic Receipts, LG AI and About LG
 * have no PC column). Rendered as the closed accordion the board shows.
 */
const MO_FOOTER_NAV = [
  'e-Shop',
  'TV/Audio/Video',
  'Home Appliances',
  'Air Conditioning',
  'Computing',
  'Electronic Receipts',
  'LG AI',
  'Support',
  'About LG',
];

function MoSiteFooterTemplate({ data }: { data: DealSiteFooterState }) {
  const disclaimers = data.showDisclaimers ? lines(data.disclaimers) : [];
  const legal = lines(data.legalLinks);
  return (
    <Band height={940} background="#E6E1D6">
      {/* Disclaimers — one truncated line each, with the underlined More. */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 360 }}>
        {disclaimers.slice(0, 2).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', padding: '16.7px 12.7px 15.9px', gap: 12, borderBottom: `1px solid ${WARM_RULE}` }}>
            <span
              style={{
                flex: 1,
                fontFamily: FONT_TEXT,
                fontSize: 12.7,
                lineHeight: '20px',
                color: TEXT_SKU,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {d}
            </span>
            <span style={{ fontFamily: FONT_TEXT, fontSize: 12.7, lineHeight: '15.9px', color: BLACK, whiteSpace: 'nowrap', textDecoration: 'underline' }}>
              {data.moreLabel}
            </span>
          </div>
        ))}
      </div>

      {/* Nav — the board's nine fixed rows (Figma "Navigation", y 100.4). */}
      <div style={{ position: 'absolute', left: 12.7, top: 107.5, width: 334.5 }}>
        {MO_FOOTER_NAV.map((label, i) => (
          <div
            key={i}
            style={{
              height: 46.3,
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid ${WARM_RULE}`,
            }}
          >
            <span style={{ fontFamily: FONT_TEXT, fontSize: 15.9, lineHeight: '19.1px', color: BLACK, ...DESCENDER }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Locale + social (Figma y 541.6 / 584.6). */}
      <At x={39.8} y={541.6} w={200} style={{ fontFamily: FONT_TEXT, fontSize: 12.7, lineHeight: '19.1px', color: BLACK, textDecoration: 'underline' }}>
        {data.localeLabel}
      </At>
      {data.showSocial && (
        <div style={{ position: 'absolute', left: 12.7, top: 584.6, display: 'flex', gap: 8 }}>
          {DEAL_SOCIAL_ICONS.map(src => (
            <img key={src} src={src} alt="" draggable={false} style={{ width: 25.5, height: 25.5, display: 'block' }} />
          ))}
        </div>
      )}

      {/* Legal block — dark band (Figma y 629.2, h 298.8) with the white
          Libro badge row and the ethics-hotline row inside it. */}
      <div style={{ position: 'absolute', left: 0, top: 629.2, width: 360, height: 298.8, background: TEXT_DARK }}>
        <p style={{ margin: 0, padding: '15.9px 12.7px 0', fontFamily: FONT_TEXT, fontSize: 12.7, lineHeight: '25.5px', color: WHITE }}>
          {legal.map((l, i) => (
            <span key={i} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
              {l}
              {i < legal.length - 1 && <span style={{ color: TEXT_SKU, padding: '0 9.6px' }}>|</span>}
            </span>
          ))}
        </p>
        <p style={{ position: 'absolute', left: 12.7, top: 124.2, right: 12.7, margin: 0, fontFamily: FONT_TEXT, fontSize: 12.7, lineHeight: '20px', color: '#E1E2E5' }}>
          {data.copyright}
        </p>
        <p style={{ position: 'absolute', left: 12.7, top: 144.2, right: 12.7, margin: 0, fontFamily: FONT_TEXT, fontSize: 12.7, lineHeight: '20px', color: '#E1E2E5', textDecoration: 'underline' }}>
          {data.officialNotice}
        </p>
        {data.showBadges && (
          <div style={{ position: 'absolute', left: 0, top: 195.2, width: 360, height: 51.8, background: WHITE, display: 'flex', alignItems: 'center', paddingLeft: 12.7, boxSizing: 'border-box' }}>
            <img src="/deal-page/mo-badge-libro.png" alt="" draggable={false} style={{ height: 44, display: 'block' }} />
          </div>
        )}
        <div style={{ position: 'absolute', left: 0, top: 247, width: 360, height: 51.8, background: PAGE_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: FONT_TEXT, fontSize: 12.7, lineHeight: '15.9px', color: BLACK }}>LG Jeong-Do Management Ethics hotline</span>
        </div>
      </div>
    </Band>
  );
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export function DealModuleRendererMo({
  editState,
  artOnly,
  artIndex,
}: {
  editState: DealEditState;
  /** ZIP export: only the composed image at its art crop — see DealModuleRenderer. */
  artOnly?: boolean;
  artIndex?: number;
}) {
  switch (editState.type) {
    case 'deal-site-header':  return <MoSiteHeaderTemplate data={editState.data} />;
    case 'deal-hero':         return <MoHeroTemplate data={editState.data} artOnly={artOnly} />;
    case 'deal-cards':        return <MoDealCardsTemplate data={editState.data} artOnly={artOnly} artIndex={artIndex} />;
    case 'deal-tab-nav':      return <MoDealTabNavTemplate data={editState.data} />;
    case 'deal-promo-banner': return <MoBannerTemplate data={editState.data} size="Large" artOnly={artOnly} />;
    case 'deal-banner':       return <MoBannerTemplate data={editState.data} size="Standard" artOnly={artOnly} />;
    case 'deal-product-list': return <MoProductListTemplate data={editState.data} />;
    case 'deal-category-nav': return <MoCategoryNavTemplate data={editState.data} />;
    case 'deal-site-footer':  return <MoSiteFooterTemplate data={editState.data} />;
  }
}
