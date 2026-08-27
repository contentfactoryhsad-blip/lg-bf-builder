/**
 * Deal Page module templates — the www.lg.com counterpart to
 * brandshop/modules/ModuleRenderer.tsx.
 *
 * Every template renders at DEAL_PAGE_WIDTH (1713). Sizes, spacing, radii and
 * type are the Figma frame's own values, pulled with `get_design_context` off
 * `fUup3vSq71f6eUIRpmzz8s` frame 1:1212 — the node id each block came from is
 * noted inline so a future change can be re-measured against the same node.
 *
 * Copy renders through `--obs-font` (the shared brand-font variable) for the
 * same reason the Shop in Shop templates do: the ZIP export mounts a second
 * React root that no context can reach.
 */

import React from 'react';
import {
  DEAL_PAGE_WIDTH,
  DEAL_CONTAINER_WIDTH,
  DEAL_BANNER_WIDTH,
  DEAL_GRID_WIDTH,
  DEAL_CHROME_WIDTH,
} from './dealModuleRegistry';
import {
  T_HEAD, T_BODY, T_SMALL, T_MICRO, T_DIGIT, W_SEMIBOLD,
  PAGE_BG, CHROME_BG, DEAL_RED, TEXT_DARK, TEXT_SKU, TEXT_STRIKE,
  BTN_BORDER, HAIRLINE, CARD_BASE, SHIP_BG, SHIP_TEXT, LEGAL_BG, BLACK, WHITE,
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
  DealTimeSaleState,
  DealProductListState,
  DealProductItem,
  DealCategoryNavState,
} from './dealEditStates';
import { DEAL_SOCIAL_ICONS, DEAL_BANNER_HEIGHT } from './dealEditStates';

const FONT = 'var(--obs-font)';
const FONT_TEXT = 'var(--obs-font-text, var(--obs-font))';
const STAR = '/deal-page/icons/star-full.svg';

// Rail insets, all measured from the 2280 page edge — these are the x values
// the Figma frames actually sit at (283.5 / 340 / 396 / 420).
/** Content container (Figma 1:1280 at x=283.5). */
const CONTAINER_INSET = (DEAL_PAGE_WIDTH - DEAL_CONTAINER_WIDTH) / 2;
/** Banner rail (Figma 1:1501 at x=340). */
const BANNER_INSET = (DEAL_PAGE_WIDTH - DEAL_BANNER_WIDTH) / 2;
/** Product grid + header/footer content (Figma 1:1528 at x=396). */
const GRID_INSET = (DEAL_PAGE_WIDTH - DEAL_GRID_WIDTH) / 2;
/** Tab-bar rail (Figma 1:1487 at x=420). */
const CHROME_INSET = (DEAL_PAGE_WIDTH - DEAL_CHROME_WIDTH) / 2;
/** Section content gutter: most rails indent a further 24 for their copy. */
const GUTTER = 24;

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

/**
 * Full-bleed banner artwork. The Figma banners are ONE baked KV that already
 * contains the lockup, the objects and (on the exclusive-offer banner) the
 * product thumbnails — not a composited object dropped on a black box. So the
 * art simply covers its frame.
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

// ── 0. Site header (Figma 1:1214 header + 1:1267 breadcrumb) ──────────────────

const CHROME_INNER = GRID_INSET + GUTTER; // = 420, same rail as the tab bar

function DealSiteHeaderTemplate({ data }: { data: DealSiteHeaderState }) {
  const nav = lines(data.navItems);
  const crumbs = lines(data.breadcrumb);
  return (
    <div style={{ width: DEAL_PAGE_WIDTH, background: PAGE_BG, fontFamily: FONT, flexShrink: 0 }}>
      {/* Logo + utility row (frame 1:1219, h=44). */}
      <div style={{ paddingLeft: CHROME_INNER, paddingRight: CHROME_INNER, boxSizing: 'border-box' }}>
        <div style={{ height: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <img src="/lg-logo.svg" alt="LG" draggable={false} style={{ height: 32, width: 'auto', display: 'block' }} />
          {data.showBusinessLabel && (
            <span style={{ fontFamily: FONT_TEXT, ...T_SMALL, color: BLACK, marginBottom: 13, ...DESCENDER }}>
              {data.businessLabel}
            </span>
          )}
        </div>

        {/* Global nav + utility cluster (frame 1:1234, h=52). */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
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
          {/* Search pill + account + cart, exported whole from frame 1:1253 —
              site chrome icons, not authored content. */}
          <img
            src="/deal-page/header-utility.png"
            alt=""
            draggable={false}
            style={{ width: 264, height: 36, display: 'block', maxWidth: 'none' }}
          />
        </div>
      </div>

      {/* Breadcrumb band (frame 1:1268, h=38). */}
      {data.showBreadcrumb && crumbs.length > 0 && (
        <div
          style={{
            marginLeft: CONTAINER_INSET,
            width: DEAL_CONTAINER_WIDTH,
            height: 38,
            background: CHROME_BG,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: CHROME_INNER - CONTAINER_INSET,
            boxSizing: 'border-box',
          }}
        >
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ fontFamily: FONT_TEXT, ...T_MICRO, lineHeight: '18px', color: BLACK, ...DESCENDER }}>{c}</span>
              {i < crumbs.length - 1 && (
                <img
                  src="/deal-page/icons/chevron-right.png"
                  alt=""
                  draggable={false}
                  style={{ width: 10, height: 10, display: 'block', margin: '0 8px' }}
                />
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 1. Hero KV (Figma 1:1279 — 1713×642) ──────────────────────────────────────

function DealHeroTemplate({ data }: { data: DealHeroState }) {
  return (
    <div
      style={{
        width: DEAL_PAGE_WIDTH,
        height: 642,
        background: PAGE_BG,
        position: 'relative',
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      {/* The black band is the 1713 container (frame 1:1280), not the page. */}
      <div
        style={{
          position: 'absolute',
          left: CONTAINER_INSET,
          top: 0,
          width: DEAL_CONTAINER_WIDTH,
          height: 642,
          background: BLACK,
          overflow: 'hidden',
        }}
      >
      {/* Art bleeds past the top and right edges exactly as frame 1:1288 does. */}
      <div style={{ position: 'absolute', left: 536.5, top: -50, width: 1509, height: 750 }}>
        {data.kvImage ? (
          <img
            src={data.kvImage}
            alt=""
            draggable={false}
            style={{ width: 1509, height: 750, objectFit: 'cover', display: 'block', maxWidth: 'none' }}
          />
        ) : (
          <div style={{ width: 1509, height: 750, background: '#161616' }} />
        )}
      </div>

      {/* Copy block — frame 1:1292 sits at 56.5 + 80 from the container edge. */}
      <div style={{ position: 'absolute', left: 136.5, top: 80, width: 900 }}>
        {data.showEyebrow && (
          <p style={{ margin: 0, fontFamily: FONT_TEXT, ...T_BODY, color: WHITE, ...DESCENDER }}>{data.eyebrow}</p>
        )}
        <p
          style={{
            margin: 0,
            marginTop: 8,
            ...T_HEAD,
            letterSpacing: 'var(--obs-tracking-head)',
            color: WHITE,
            whiteSpace: 'pre-line',
            ...DESCENDER,
          }}
        >
          {data.headline}
        </p>
        {data.showSubCopy && (
          <p style={{ margin: 0, marginTop: 8, fontFamily: FONT_TEXT, ...T_BODY, color: WHITE, whiteSpace: 'pre-line', ...DESCENDER }}>
            {data.subCopy}
          </p>
        )}
      </div>
      </div>
    </div>
  );
}

// ── 2. Deal cards (Figma 1:1298 — "Discover exclusive deals") ─────────────────

const DEAL_CARD_W = 398;
const DEAL_CARD_H = 368;
const DEAL_CARD_GUTTER = 24;
/**
 * The card art is an OVERSIZED square placed behind the copy, not a contained
 * thumbnail: frame 1:1311 draws it at 179.27% × 193.89% of the card, offset
 * −39.82% / −61.05%. Those percentages are what make the object sit high in
 * the frame and read as a lit backdrop instead of a pasted-on icon.
 */
const DEAL_CARD_ART = {
  width: DEAL_CARD_W * 1.7927,
  height: DEAL_CARD_H * 1.9389,
  left: DEAL_CARD_W * -0.3982,
  top: DEAL_CARD_H * -0.6105,
};

function DealCardsTemplate({ data }: { data: DealCardsState }) {
  return (
    <div
      style={{
        width: DEAL_PAGE_WIDTH,
        background: PAGE_BG,
        // Frame 1:1299 starts 49 down; 1:1382 leaves 56 below the row.
        padding: `49px ${CONTAINER_INSET + GUTTER}px 56px`,
        boxSizing: 'border-box',
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      {data.showSectionTitle && (
        <p
          style={{
            margin: 0,
            paddingBottom: 8,
            ...T_HEAD,
            letterSpacing: 'var(--obs-tracking-head)',
            color: BLACK,
            whiteSpace: 'nowrap',
            ...DESCENDER,
          }}
        >
          {data.sectionTitle}
        </p>
      )}
      <div style={{ marginTop: 19.6, display: 'flex', gap: DEAL_CARD_GUTTER }}>
        {data.cards.map((card, i) => (
          <div
            key={i}
            style={{
              width: DEAL_CARD_W,
              height: DEAL_CARD_H,
              borderRadius: R_LG,
              overflow: 'hidden',
              position: 'relative',
              background: CARD_BASE,
              flexShrink: 0,
            }}
          >
            {card.image && (
              <img
                src={card.image}
                alt=""
                draggable={false}
                style={{ position: 'absolute', ...DEAL_CARD_ART, objectFit: 'cover', display: 'block', maxWidth: 'none' }}
              />
            )}
            {/* Copy sits bottom-aligned inside a 32 pad (frame 1:1311). */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                padding: 32,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: FONT_TEXT,
                  ...T_BODY,
                  lineHeight: '36px',
                  color: WHITE,
                  textAlign: 'center',
                  ...DESCENDER,
                }}
              >
                {card.title}
              </p>
              {data.showCta && (
                <div style={{ height: 68, paddingTop: 24, boxSizing: 'border-box', display: 'flex', justifyContent: 'center' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 100,
                      minHeight: 44,
                      padding: '0 20px',
                      borderRadius: R_SM,
                      background: WHITE,
                      border: `1px solid ${BTN_BORDER}`,
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
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. Deal tab nav (Figma 1:1486 — 1713×98) ──────────────────────────────────

/** The rail is 1440 wide at x=420 of the 2280 page (frame 1:1487). */
const TAB_NAV_INSET = CHROME_INSET;

function DealTabNavTemplate({ data }: { data: DealTabNavState }) {
  const tabs = lines(data.tabs);
  const activeIdx = Math.min(Math.max(0, data.activeIndex), Math.max(0, tabs.length - 1));
  return (
    <div style={{ width: DEAL_PAGE_WIDTH, background: PAGE_BG, fontFamily: FONT, flexShrink: 0 }}>
      <div
        style={{
          marginLeft: TAB_NAV_INSET,
          width: DEAL_CHROME_WIDTH,
          borderTop: `1px solid ${HAIRLINE}`,
          borderBottom: `1px solid ${HAIRLINE}`,
          display: 'flex',
          boxSizing: 'border-box',
        }}
      >
        {tabs.map((label, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '0 10px',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                fontFamily: FONT_TEXT,
                ...T_BODY,
                color: i === activeIdx ? BLACK : TEXT_DARK,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                ...DESCENDER,
              }}
            >
              {label}
            </span>
            {/* Frame 1:1491 — a 4px rule the full width of the active tab. */}
            {i === activeIdx && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: 92, height: 4, background: DEAL_RED }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Promotion banner (Figma 1:1383 / 1:2457 / 1:2670 / 1:2874) ─────────────

function DealPromoBannerTemplate({ data }: { data: DealPromoBannerState }) {
  const artLeft = data.layout === 'Art left';
  const bannerH = DEAL_BANNER_HEIGHT[data.size] ?? 400;
  return (
    <div
      style={{
        width: DEAL_PAGE_WIDTH,
        height: bannerH + 96,
        background: PAGE_BG,
        padding: `48px ${BANNER_INSET}px`,
        boxSizing: 'border-box',
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: DEAL_BANNER_WIDTH,
          height: bannerH,
          borderRadius: R_LG,
          background: BLACK,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Frame 1:1446 — one baked KV covering the whole banner. "Art left"
            mirrors it rather than re-cropping, so the copy has a clean side. */}
        <div style={{ position: 'absolute', inset: 0, transform: artLeft ? 'scaleX(-1)' : undefined }}>
          <BannerArt src={data.image} width={DEAL_BANNER_WIDTH} height={bannerH} />
        </div>

        {/* Copy — 80 pad, vertically centred (frames 1:1450 / 1:1451). */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '0 80px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: artLeft ? 'flex-end' : 'flex-start',
          }}
        >
          <div style={{ width: 860, textAlign: artLeft ? 'right' : 'left' }}>
            <p
              style={{
                margin: 0,
                ...T_HEAD,
                letterSpacing: 'var(--obs-tracking-head)',
                color: WHITE,
                whiteSpace: 'pre-line',
                ...DESCENDER,
              }}
            >
              {data.headline}
            </p>
            {data.showSubCopy && (
              <p style={{ margin: 0, marginTop: 8, fontFamily: FONT_TEXT, ...T_SMALL, color: WHITE, whiteSpace: 'pre-line', ...DESCENDER }}>
                {data.subCopy}
              </p>
            )}
            {data.showLinks && (
              <div style={{ marginTop: 24, display: 'flex', gap: 24, justifyContent: artLeft ? 'flex-end' : 'flex-start' }}>
                {[data.linkPrimary, data.linkSecondary].filter(Boolean).map((l, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: FONT_TEXT,
                      ...T_SMALL,
                      lineHeight: '16px',
                      fontWeight: W_SEMIBOLD,
                      color: WHITE,
                      ...DESCENDER,
                    }}
                  >
                    {l}
                  </span>
                ))}
              </div>
            )}
            {data.showCta && (
              <div style={{ marginTop: 24, display: 'flex', justifyContent: artLeft ? 'flex-end' : 'flex-start' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 162,
                    height: 44,
                    padding: '0 12px',
                    borderRadius: R_SM,
                    background: DEAL_RED,
                    color: WHITE,
                    fontFamily: FONT_TEXT,
                    ...T_SMALL,
                    lineHeight: '18px',
                    fontWeight: W_SEMIBOLD,
                  }}
                >
                  {data.ctaText}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 5. Time Sale (Figma 1:1499 — 1600×350 banner) ─────────────────────────────

/** Unit pitch inside the 511-wide countdown (frame 1:1510). */
const TS_UNIT_LEFT = [0, 127.66, 255.34, 383.03];
/** The separator hangs off the right of each unit (frame 1:1513). */
const TS_SEP_LEFT = 112.34;

function DealTimeSaleTemplate({ data }: { data: DealTimeSaleState }) {
  const units = [
    { value: data.days, label: data.dayLabel, sep: '-' },
    { value: data.hours, label: data.hourLabel, sep: ':' },
    { value: data.minutes, label: data.minuteLabel, sep: ':' },
    { value: data.seconds, label: data.secondLabel, sep: null },
  ];
  return (
    <div
      style={{
        width: DEAL_PAGE_WIDTH,
        height: 398,
        background: PAGE_BG,
        padding: `48px ${BANNER_INSET}px 0`,
        boxSizing: 'border-box',
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: DEAL_BANNER_WIDTH,
          height: 350,
          borderRadius: R_LG,
          background: BLACK,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          <BannerArt src={data.image} width={DEAL_BANNER_WIDTH} height={350} />
        </div>

        {/* Copy — 80 pad, vertically centred (frames 1:1503 / 1:1504). */}
        <div style={{ position: 'absolute', inset: 0, padding: '0 80px', boxSizing: 'border-box', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 860 }}>
            <p style={{ margin: 0, ...T_HEAD, letterSpacing: 'var(--obs-tracking-head)', color: WHITE, ...DESCENDER }}>
              {data.headline}
            </p>
            {data.showSubCopy && (
              <p style={{ margin: 0, marginTop: 8, fontFamily: FONT_TEXT, ...T_BODY, color: WHITE, ...DESCENDER }}>{data.subCopy}</p>
            )}
            <div style={{ marginTop: 24, position: 'relative', width: 511, height: 110 }}>
              {units.map((u, i) => (
                <div key={i} style={{ position: 'absolute', left: TS_UNIT_LEFT[i], top: 0, width: 96, height: 80 }}>
                  <p
                    style={{
                      margin: 0,
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      fontFamily: FONT_TEXT,
                      ...T_DIGIT,
                      color: WHITE,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {u.value}
                  </p>
                  {u.sep && (
                    <p
                      style={{
                        margin: 0,
                        position: 'absolute',
                        left: TS_SEP_LEFT,
                        top: 0,
                        transform: 'translateX(-50%)',
                        fontFamily: FONT_TEXT,
                        ...T_DIGIT,
                        color: WHITE,
                      }}
                    >
                      {u.sep}
                    </p>
                  )}
                  <p
                    style={{
                      margin: 0,
                      position: 'absolute',
                      left: 0,
                      top: 84,
                      width: 96,
                      textAlign: 'center',
                      fontFamily: FONT_TEXT,
                      fontSize: 24,
                      lineHeight: '28px',
                      color: WHITE,
                      ...DESCENDER,
                    }}
                  >
                    {u.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 6. Product list (Figma 1:1526 / 1:1727) ───────────────────────────────────

/**
 * Card width is FIXED (frames 1:1541 / 1:1745) — the row is left-aligned and
 * simply leaves space when there are fewer than four. Stretching the cards to
 * fill the rail is what made the 3-up row look wrong.
 */
const PRODUCT_CARD_W = 342;
const PRODUCT_GUTTER = 24;

function DealProductCard({ data }: { data: DealProductItem }) {
  return (
    <div
      style={{
        width: PRODUCT_CARD_W,
        background: WHITE,
        borderRadius: R_MD,
        padding: 20,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Badge (frame 1:1546) — a three-stop diagonal gradient. */}
      <div style={{ minHeight: 24, display: 'flex', alignItems: 'flex-start' }}>
        {data.showBadge && data.badge && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 24,
              padding: '3px 8px',
              boxSizing: 'border-box',
              borderRadius: R_XS,
              background: BADGE_GRADIENT,
              color: WHITE,
              fontFamily: FONT_TEXT,
              ...T_MICRO,
              lineHeight: '16px',
              fontWeight: W_SEMIBOLD,
              letterSpacing: '-0.24px',
              whiteSpace: 'nowrap',
            }}
          >
            {data.badge}
          </span>
        )}
      </div>

      {/* Name — clamped to two lines at 20/24 (frame 1:1549). */}
      <p style={{ margin: 0, marginTop: 8, height: 48, overflow: 'hidden', fontFamily: FONT_TEXT, ...T_BODY, color: TEXT_DARK }}>
        {data.name}
      </p>

      {/* Model code + rating (frame 1:1551). */}
      <div style={{ marginTop: 8, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: FONT_TEXT, ...T_MICRO, lineHeight: '14px', color: TEXT_SKU }}>{data.sku}</span>
          <img src="/deal-page/icons/external.png" alt="" draggable={false} style={{ width: 12, height: 12, display: 'block' }} />
        </span>
        {data.showRating && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
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
      </div>

      {/* Product shot — 180×180 in a 192 box, with the 48 spacer above
          (frames 1:1575 / 1:1578). */}
      <div style={{ height: 48 }} />
      <div style={{ height: 192, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* Price row (frame 1:1583). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {data.showDiscountPercent && data.discountPercent && (
          <span style={{ fontFamily: FONT_TEXT, ...T_BODY, lineHeight: '20px', fontWeight: W_SEMIBOLD, color: DEAL_RED }}>
            {data.discountPercent}
          </span>
        )}
        <span style={{ fontFamily: FONT_TEXT, fontSize: 24, lineHeight: '24px', fontWeight: W_SEMIBOLD, color: BLACK }}>
          {data.salePrice}
        </span>
        {data.showOriginalPrice && data.originalPrice && (
          <span style={{ fontFamily: FONT_TEXT, ...T_SMALL, lineHeight: '16px', color: TEXT_STRIKE, textDecoration: 'line-through' }}>
            {data.originalPrice}
          </span>
        )}
      </div>

      {/* Shipping pill (frame 1:1591). */}
      {data.showShippingNote && data.shippingNote && (
        <div
          style={{
            marginTop: 16,
            height: 32,
            borderRadius: R_XS,
            background: SHIP_BG,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 32,
            paddingRight: 8,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontFamily: FONT_TEXT, fontSize: 12, lineHeight: '14px', fontWeight: W_SEMIBOLD, color: SHIP_TEXT }}>
            {data.shippingNote}
          </span>
        </div>
      )}

      {/* CTA row — the secondary action is a plain text link, not a second
          outlined button (frame 1:1596). */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
        <span
          style={{
            maxWidth: 130,
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
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
            flexShrink: 0,
          }}
        >
          {data.primaryCta}
        </span>
      </div>
    </div>
  );
}

function DealProductListTemplate({ data }: { data: DealProductListState }) {
  const tabLabels = lines(data.tabs);

  return (
    <div
      style={{
        width: DEAL_PAGE_WIDTH,
        background: PAGE_BG,
        padding: `48px ${GRID_INSET + GUTTER}px 64px`,
        boxSizing: 'border-box',
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      {data.showSectionTitle && (
        <p style={{ margin: 0, height: 60, ...T_HEAD, letterSpacing: 'var(--obs-tracking-head)', color: BLACK, ...DESCENDER }}>
          {data.sectionTitle}
        </p>
      )}

      {/* Tab strip (frame 1:1534) — a 2px red rule under the active label only. */}
      {data.showTabs && tabLabels.length > 0 && (
        <div style={{ height: 64, paddingTop: 12, boxSizing: 'border-box', display: 'flex', gap: 36, alignItems: 'flex-start' }}>
          {tabLabels.map((label, i) => (
            <span
              key={i}
              style={{
                position: 'relative',
                display: 'inline-block',
                paddingBottom: 10,
                fontFamily: FONT_TEXT,
                ...T_BODY,
                color: i === 0 ? BLACK : TEXT_DARK,
                whiteSpace: 'nowrap',
                ...DESCENDER,
              }}
            >
              {label}
              {i === 0 && <span style={{ position: 'absolute', left: 0, right: 0, top: 27, height: 2, background: DEAL_RED }} />}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', gap: PRODUCT_GUTTER }}>
        {data.products.map((p, i) => (
          <DealProductCard key={i} data={p} />
        ))}
      </div>
    </div>
  );
}

// ── 7. Category nav (Figma 1:2365) ────────────────────────────────────────────

function DealCategoryNavTemplate({ data }: { data: DealCategoryNavState }) {
  return (
    <div style={{ width: DEAL_PAGE_WIDTH, background: PAGE_BG, fontFamily: FONT, boxSizing: 'border-box', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 24px 24px' }}>
        {data.items.map((item, i) => (
          <div
            key={i}
            style={{
              width: 132,
              padding: '12px 8px',
              borderRadius: R_SM,
              background: i === 0 ? WHITE : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon ? (
                <img
                  src={item.icon}
                  alt=""
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxWidth: 'none' }}
                />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: R_XS, background: '#E2DED6' }} />
              )}
            </div>
            <span
              style={{
                fontFamily: FONT_TEXT,
                ...T_MICRO,
                lineHeight: '18px',
                color: BLACK,
                textAlign: 'center',
                fontWeight: i === 0 ? W_SEMIBOLD : 400,
                ...DESCENDER,
              }}
            >
              {item.name}
            </span>
          </div>
        ))}
      </div>

      {data.showResultsBar && (
        <div
          style={{
            borderTop: `1px solid ${HAIRLINE}`,
            padding: `20px ${GRID_INSET}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontFamily: FONT_TEXT, ...T_MICRO, color: BLACK }}>{data.resultsText}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: FONT_TEXT, ...T_MICRO, color: BLACK }}>{data.sortLabel}</span>
            <span
              style={{
                width: 220,
                height: 34,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: 2,
                background: WHITE,
                display: 'inline-flex',
                alignItems: 'center',
                paddingLeft: 10,
                boxSizing: 'border-box',
              }}
            >
              <img src="/deal-page/icons/chevron-down.png" alt="" draggable={false} style={{ width: 14, height: 14, display: 'block' }} />
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── 8. Site footer (Figma 1:3102 — 1713×848) ──────────────────────────────────

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
        <div style={{ height: 126, paddingLeft: CHROME_INNER, paddingRight: CHROME_INNER, paddingTop: 21, boxSizing: 'border-box' }}>
          {disclaimers.slice(0, 2).map((line, i) => (
            <div key={i} style={{ marginTop: i === 0 ? 0 : 41 }}>
              <FooterDisclaimer text={line} moreLabel={data.moreLabel} />
            </div>
          ))}
        </div>
      )}

      {/* Link columns (frame 1:3121 — 220 wide, 244 pitch). */}
      <div style={{ height: 483, paddingLeft: CHROME_INNER, paddingTop: 41, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: 24, width: DEAL_CHROME_WIDTH }}>
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

      {/* Locale + social (frame 1:3221, h=81). */}
      <div
        style={{
          height: 81,
          paddingLeft: CHROME_INNER,
          paddingRight: CHROME_INNER,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(0,0,0,0.10)',
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

      {/* Legal bar (frame 1:3246, h=158). */}
      <div style={{ height: 158, background: LEGAL_BG, position: 'relative', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', left: CHROME_INNER, top: 24, width: 1020 }}>
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
          <p style={{ margin: 0, marginTop: 24, fontFamily: FONT_TEXT, ...T_MICRO, color: WHITE, ...DESCENDER }}>{data.copyright}</p>
          <p style={{ margin: 0, marginTop: 2, fontFamily: FONT_TEXT, ...T_MICRO, color: WHITE, textDecoration: 'underline', ...DESCENDER }}>
            {data.officialNotice}
          </p>
        </div>
        {data.showBadges && (
          <img
            src="/deal-page/footer-badges.png"
            alt=""
            draggable={false}
            style={{ position: 'absolute', left: GRID_INSET + 1068.6, top: 0, width: 395.4, height: 158, display: 'block', maxWidth: 'none' }}
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
    case 'deal-promo-banner': return <DealPromoBannerTemplate data={editState.data} />;
    case 'deal-time-sale':    return <DealTimeSaleTemplate data={editState.data} />;
    case 'deal-product-list': return <DealProductListTemplate data={editState.data} />;
    case 'deal-category-nav': return <DealCategoryNavTemplate data={editState.data} />;
    case 'deal-site-footer':  return <DealSiteFooterTemplate data={editState.data} />;
  }
}
