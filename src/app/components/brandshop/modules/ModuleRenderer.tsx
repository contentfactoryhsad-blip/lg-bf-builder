import React from 'react';
import {
  ModuleEditState,
  OfficialStoreState,
  FollowUsState,
  TextModuleState,
  TextVariant,
  KvState,
  KvProductListState,
  ProductCardItem,
  CategoryListState,
  ProductCardsState,
  BannerSlideState,
  VouchersState,
  voucherVisual,
  ValuePropsState,
} from './editStates';
import { OtherPromoThemeTemplate } from '../templates/OtherPromoThemeTemplate';
import { BannerLifestyleTemplate } from './bannerLifestyle';
import { vpIconSrc } from './vpIcons';

const FONT = 'var(--obs-font)';
const WG07 = '#F6F3EB';
const WG05 = '#E6E1D6';
const LG_RED = '#FD312E';
const TEXT_DARK = '#000000';
const TEXT_MID = '#4A4946';
const TEXT_LIGHT = '#716F6A';

// ── Shared atoms ──────────────────────────────────────────────────────────────

function ImgSlot({
  src,
  width,
  height,
  style,
}: {
  src: string | null;
  width: number;
  height: number;
  style?: React.CSSProperties;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width, height, objectFit: 'cover', display: 'block', maxWidth: 'none', ...style }}
      />
    );
  }
  return (
    <div
      style={{
        width,
        height,
        background: '#D8D4CC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#aaa" strokeWidth="1.5" />
        <path d="M3 16l5-5 4 4 3-3 6 6" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="#aaa" />
      </svg>
    </div>
  );
}

function CtaBtn({ text, bg = LG_RED, color = '#fff' }: { text: string; bg?: string; color?: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color,
        height: 73,
        paddingLeft: 32,
        paddingRight: 32,
        borderRadius: 15,
        fontFamily: FONT,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 32, letterSpacing: 'var(--obs-tracking)',
          fontWeight: 300,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          maxWidth: 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
          // Descender headroom: brand faces use LG's descent metric, which is
          // shallower than their Thai marks need. Negative margin cancels the
          // padding so nothing below shifts.
          boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
        }}
      >
        {text || 'Shop Now'}
      </span>
    </div>
  );
}

// ── 1. Official store (1200×180) ──────────────────────────────────────────────

// Frame positions from Figma 2048:17909 (uniform 180×180 frames, two sitting
// half off the top edge). Image rendering is UNIFORM across all slots — the 1:1
// crop output fills the 180×180 box identically everywhere. How large the shape
// sits inside the box is set per-image in the crop window, NOT by a per-slot
// inset.
const OFFICIAL_STORE_SLOTS: Array<{ frame: { left: number; top: number } }> = [
  { frame: { left: 10, top: 50.21 } },    // Slot 1 (left edge, low)
  { frame: { left: 190, top: -44 } },     // Slot 2 (left of the slogan, high)
  { frame: { left: 830, top: 50.21 } },   // Slot 3 (right of the slogan, low)
  { frame: { left: 1010, top: -44 } },    // Slot 4 (right edge, high)
];

const OFFICIAL_STORE_IMG_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  maxWidth: 'none',
  objectFit: 'cover',
};

function OfficialStoreTemplate({ data }: { data: OfficialStoreState }) {
  return (
    <div
      style={{
        width: 1200,
        height: 180,
        background: WG05,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      {OFFICIAL_STORE_SLOTS.map((slot, i) => {
        const src = data.productImages[i] ?? null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: slot.frame.left,
              top: slot.frame.top,
              width: 180,
              height: 180,
              overflow: 'hidden',
            }}
          >
            {src ? (
              <img src={src} alt="" draggable={false} style={OFFICIAL_STORE_IMG_STYLE} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: '#D8D4CC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="#aaa" strokeWidth="1.5" />
                  <path d="M3 16l5-5 4 4 3-3 6 6" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="#aaa" />
                </svg>
              </div>
            )}
          </div>
        );
      })}

      {/* Center: LG slogan SVG (fixed) + store name (editable) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 38,
          gap: 10,
        }}
      >
        <img
          src="/id-banner/default-pc/lg-slogan.svg"
          alt="Life's Good."
          draggable={false}
          style={{ width: 430, height: 70, maxWidth: 'none', flexShrink: 0 }}
        />
        <div
          style={{
            fontSize: 32,
            fontWeight: 300,
            color: TEXT_MID,
            letterSpacing: 'calc(-0.64px + var(--obs-tracking))',
            lineHeight: 1.2,
            textAlign: 'center',
            maxWidth: 440,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}
        >
          {data.storeNameText}
        </div>
      </div>
    </div>
  );
}

// ── 2. Follow us (1200×120) ───────────────────────────────────────────────────
function FollowUsTemplate({ data }: { data: FollowUsState }) {
  const hasSubCopy = data.showSubCopy && data.subCopy.trim().length > 0;
  return (
    <div
      style={{
        width: 1200,
        height: 120,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      {/* Fixed gradient background */}
      <img
        src="/store-modules/follow-us-bg.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          maxWidth: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 40px',
          gap: 30,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 56, letterSpacing: 'var(--obs-tracking-head)',
            // Head copy is LGEI Headline Semibold everywhere; this one sat on
            // Regular. Barely visible in Latin, obvious in Thai — LINE Seed has
            // no face between Regular and Bold, so the same one-step gap opens
            // into two.
            fontWeight: 600,
            lineHeight: 1.12,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            maxHeight: 67,
            flexShrink: 0,
            textAlign: hasSubCopy ? 'right' : 'center',
            ...(hasSubCopy ? {} : { width: '100%' }),
          }}
        >
          {data.mainCopy}
        </p>
        {hasSubCopy && (
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            {data.subCopy.split('\n').map((line, i) => (
              <span
                key={i}
                style={{
                  fontSize: 27, letterSpacing: 'var(--obs-tracking)',
                  fontWeight: 300,
                  lineHeight: 1.12,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                }}
              >
                {line}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 3. Text module (1200×160) ─────────────────────────────────────────────────
const TEXT_VARIANT_BG: Record<TextVariant, string> = {
  'Warm Gray 07': WG07,          // #F6F3EB
  'Warm Gray 05': WG05,          // #E6E1D6
  'Warm Gray 01': '#262626',     // dark charcoal
  'Gradient': '',                // uses background image
};
const TEXT_VARIANT_COLOR: Record<TextVariant, string> = {
  'Warm Gray 07': TEXT_DARK,
  'Warm Gray 05': TEXT_DARK,
  'Warm Gray 01': '#FFFFFF',
  'Gradient': '#FFFFFF',
};
// Separator line color per variant
const TEXT_SEPARATOR_COLOR: Record<TextVariant, string> = {
  'Warm Gray 07': TEXT_DARK,
  'Warm Gray 05': TEXT_DARK,
  'Warm Gray 01': '#FFFFFF',
  'Gradient': '#FFFFFF',
};

const TEXT_COPY_BASE: React.CSSProperties = {
  margin: 0,
  fontSize: 54, letterSpacing: 'var(--obs-tracking-head)',
  fontWeight: 600,
  lineHeight: 1.12,
  maxHeight: 67,       // 54 × 1.12 + 7px descender room
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  flexShrink: 0,       // hug content width,
  // Descender headroom: brand faces use LG's descent metric, which is
  // shallower than their Thai marks need. Negative margin cancels the
  // padding so nothing below shifts.
  boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
};

function TextModuleTemplate({ data }: { data: TextModuleState }) {
  const showTwo = data.showSecondCopy;
  const textColor = TEXT_VARIANT_COLOR[data.variant];
  const isGradient = data.variant === 'Gradient';

  return (
    <div
      style={{
        width: 1200,
        height: 160,
        background: isGradient ? undefined : TEXT_VARIANT_BG[data.variant],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 40,
        paddingRight: 40,
        boxSizing: 'border-box',
        fontFamily: FONT,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isGradient && (
        <img
          src="/store-modules/text-gradient-bg.png"
          alt=""
          draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none' }}
        />
      )}

      {showTwo ? (
        // 2-copy: hug width, copy1 right-align → separator ← copy2 left-align
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, position: 'relative' }}>
          <p style={{ ...TEXT_COPY_BASE, color: textColor, textAlign: 'right' }}>
            {data.textLeft}
          </p>
          <div style={{ width: 1, height: 60, background: TEXT_SEPARATOR_COLOR[data.variant], flexShrink: 0 }} />
          <p style={{ ...TEXT_COPY_BASE, color: textColor, textAlign: 'left' }}>
            {data.textRight}
          </p>
        </div>
      ) : (
        // 1-copy: full width, centered
        <p style={{ ...TEXT_COPY_BASE, color: textColor, textAlign: 'center', width: '100%', position: 'relative' }}>
          {data.textLeft}
        </p>
      )}
    </div>
  );
}

// ── 4. KV (1200×1200) ────────────────────────────────────────────────────────
// The image band sits at a fixed place on the canvas; only Info grows and
// shrinks (1–2 line headline, optional sub copy and logo), inside its own
// absolutely-positioned box above it.
const KV_IMG_TOP = 400;
const KV_IMG_H = 800;

function KvTemplate({ data }: { data: KvState }) {

  return (
    <div
      style={{
        width: 1200,
        height: 1200,
        background: WG07,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      {/* Info section — pinned to the top of the canvas, so its own height
          never moves the image band below it. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          paddingTop: 60,
          paddingLeft: 80,
          paddingRight: 80,
          zIndex: 3,
          boxSizing: 'border-box',
        }}
      >
          {/* Promotion logo + LG logo row (optional) */}
          {data.showCampaignLogo && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, height: 45, flexShrink: 0 }}>
              {/* Width-locked and cropped vertically. Uploaded logos come at
                  every aspect, and fixing the height instead left the narrow
                  ones looking thin next to the LG mark. */}
              <div style={{ width: 289.193, height: 40, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                {data.campaignLogo ? (
                  <img
                    src={data.campaignLogo}
                    alt=""
                    draggable={false}
                    style={{ position: 'absolute', left: 0, top: '-6.72%', width: '100%', height: '141.43%', display: 'block', maxWidth: 'none' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#D8D4CC', borderRadius: 4 }} />
                )}
              </div>
              <div style={{ width: 1.5, height: 42, background: 'rgba(0,0,0,0.5)', flexShrink: 0 }} />
              <img
                src="/store-modules/kv-lg-logo.svg"
                alt="LG"
                draggable={false}
                style={{ width: 102.151, height: 45, display: 'block', flexShrink: 0, maxWidth: 'none' }}
              />
            </div>
          )}

          {/* Copy + CTA */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, flexShrink: 0 }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 72, letterSpacing: 'var(--obs-tracking-head)',
                  fontWeight: 600,
                  lineHeight: 1.1,
                  color: TEXT_DARK,
                  textAlign: 'center',
                  maxHeight: data.showSubCopy ? 158 : 238,
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  width: '100%',
                  // Descender headroom: brand faces use LG's descent metric, which is
                  // shallower than their Thai marks need. Negative margin cancels the
                  // padding so nothing below shifts.
                  boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                }}
              >
                {data.headline}
              </p>
              {data.showSubCopy && data.subCopy && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 36, letterSpacing: 'var(--obs-tracking)',
                    fontWeight: 300,
                    lineHeight: 1.1,
                    color: TEXT_DARK,
                    textAlign: 'center',
                    maxHeight: 80,
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    // Descender headroom: brand faces use LG's descent metric, which is
                    // shallower than their Thai marks need. Negative margin cancels the
                    // padding so nothing below shifts.
                    boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                  }}
                >
                  {data.subCopy}
                </p>
              )}
            </div>
            {data.ctaText && <CtaBtn text={data.ctaText} />}
          </div>
      </div>

      {/* Image — 1200 wide, exactly the canvas, pinned at a fixed top no matter
          how tall Info grew. Figma authors the wave mask wider than the box
          (1440×800, node 2015:7559), but that overhang belongs to the MASK
          PATTERN alone: widen this div to 1440 and the photo's own
          object-fit:cover starts covering a 1440×800 box instead of the real
          1200×800 one, over-zooming it. So the overhang goes on mask-size and
          mask-position instead. */}
      <div
        style={{
          position: 'absolute',
          top: KV_IMG_TOP,
          left: 0,
          width: 1200,
          height: KV_IMG_H,
          overflow: 'hidden',
          zIndex: 1,
          maskImage: "url('/store-modules/kv-mask-shape.svg')",
          WebkitMaskImage: "url('/store-modules/kv-mask-shape.svg')",
          maskSize: '1440px 800px',
          WebkitMaskSize: '1440px 800px',
          maskPosition: '-121.834px 1.177px',
          WebkitMaskPosition: '-121.834px 1.177px',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      >
        {data.kvImage ? (
          <img
            src={data.kvImage}
            alt=""
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', maxWidth: 'none' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: WG05, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImgSlot src={null} width={600} height={400} />
          </div>
        )}
      </div>

      {/* Disclaimer — absolute on canvas, bottom-left, above image */}
      {data.showDisclaimer && data.disclaimer && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 1200,
            paddingBottom: 40,
            paddingLeft: 40,
            paddingRight: 40,
            display: 'flex',
            alignItems: 'flex-end',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 18, letterSpacing: 'var(--obs-tracking)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: data.disclaimerColor ?? TEXT_DARK,
              opacity: 0.8,
              flex: 1,
              maxHeight: 40,
              overflow: 'hidden',
              // Descender headroom: brand faces use LG's descent metric, which is
              // shallower than their Thai marks need. Negative margin cancels the
              // padding so nothing below shifts.
              boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
            }}
          >
            {data.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}

// ── 5. KV + Product list (1200×free) ─────────────────────────────────────────
const KVPL_RANK_LABELS = ['1st', '2nd', '3rd'];

function KvProductListCard({ p, rank, cols }: { p: ProductCardItem; rank?: string; cols?: number }) {
  // Product cards pass `cols` and the card flex-fills its row: 2 per row gives
  // a wide image, 3 per row keeps the square one in a card ~3px wider than the
  // old fixed 350. Filling the row is what stops the left/right edges wobbling
  // as the count changes — the fixed-350 row hugged 10px short of the content
  // width. KV+Product list passes nothing and keeps the fixed card.
  const wideImage = cols === 2;
  // Two to a row, the card is wide enough to set the prices side by side
  // (Figma 2783:41965) rather than stacked. Three to a row there is no room, so
  // they stay stacked — as they do in KV + Product list, which passes no `cols`.
  const priceRow = cols === 2;
  return (
    <div style={cols
      ? { flex: '1 1 0', minWidth: 0, alignSelf: 'stretch' }
      : { flex: '0 0 350px', width: 350, alignSelf: 'stretch' }
    }>
      <div
        style={{
          height: '100%',
          background: '#fff',
          borderRadius: 23,
          padding: rank ? '100px 30px 40px' : '30px 30px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          position: 'relative',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
      {rank && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 90,
            transform: 'translateX(-50%) translateY(-50%)',
            width: 350,
            height: 180,
            fontSize: 180, letterSpacing: 'var(--obs-tracking)',
            fontWeight: 600,
            lineHeight: 1,
            color: '#CBC8C2',
            opacity: 0.5,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            fontFamily: FONT,
          }}
        >
          {rank}
        </div>
      )}
      {!rank && p.showDiscountPercent && p.discountPercent && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: LG_RED,
            color: '#fff',
            fontSize: 28, letterSpacing: 'var(--obs-tracking)',
            fontWeight: 700,
            borderRadius: 999,
            padding: '8px 14px',
            lineHeight: 1,
            fontFamily: FONT,
            zIndex: 2,
            maxWidth: 278, // Figma "num" text max-width 250 + 14px×2 pill padding
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {p.discountPercent}
        </div>
      )}
      {/* At 2 per row the image widens with the card to 485×290. The source is
          always cropped at that full frame (the EP's wideCrop), so `cover` here
          shows real photo on both sides rather than a stretched square. At 3
          per row the 290×290 box shows the same source's centre square — which
          is exactly the square guide the user framed against at crop time —
          centred, since the flex-filled card is a touch wider than 290. */}
      <div style={wideImage
        ? { width: '100%', height: 290, borderRadius: 15, overflow: 'hidden', flexShrink: 0, position: 'relative', zIndex: 1 }
        : { width: 290, height: 290, borderRadius: 15, overflow: 'hidden', flexShrink: 0, position: 'relative', zIndex: 1, alignSelf: cols ? 'center' : 'stretch' }
      }>
        <ImgSlot src={rank ? p.rankImage : p.image} width={290} height={290} style={wideImage ? { borderRadius: 15, width: '100%' } : { borderRadius: 15 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p
          style={{
            margin: 0,
            fontSize: 34,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: 'calc(-0.34px + var(--obs-tracking))',
            color: TEXT_DARK,
            maxHeight: 150, // 4 lines (34 × 1.1 × 4)
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}
        >
          {p.modelName}
        </p>
        {p.features && (
          <p
            style={{
              margin: 0,
              fontSize: 24, letterSpacing: 'var(--obs-tracking)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: TEXT_DARK,
              maxHeight: 78,
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              // Descender headroom: brand faces use LG's descent metric, which is
              // shallower than their Thai marks need. Negative margin cancels the
              // padding so nothing below shifts.
              boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
            }}
          >
            {p.features}
          </p>
        )}
      </div>
      {!rank && p.showSalePrice && (
        <div style={priceRow
          ? { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }
          : { display: 'flex', flexDirection: 'column', gap: 10 }
        }>
          {p.showOriginalPrice && p.showSalePrice && p.originalPrice && (
            <p
              style={{
                margin: 0,
                fontSize: 24, letterSpacing: 'var(--obs-tracking)',
                fontWeight: 400,
                lineHeight: 1,
                color: TEXT_LIGHT,
                textDecoration: 'line-through',
                maxHeight: 24,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                // Side by side the two prices share one line, and the sale price
                // is the one that must survive: if a pair is ever too long for
                // the card, the struck-through price gives way first rather than
                // pushing the red one off the edge.
                ...(priceRow ? { minWidth: 0, textOverflow: 'ellipsis' } : null),
                // Descender headroom: brand faces use LG's descent metric, which is
                // shallower than their Thai marks need. Negative margin cancels the
                // padding so nothing below shifts.
                boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
              }}
            >
              {p.originalPrice}
            </p>
          )}
          {p.showSalePrice && p.salePrice && (
            <p
              style={{
                margin: 0,
                fontSize: 56, letterSpacing: 'var(--obs-tracking-head)',
                fontWeight: 700,
                lineHeight: 1,
                color: LG_RED,
                maxHeight: 56,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                ...(priceRow ? { flexShrink: 0 } : null),
                // Descender headroom: brand faces use LG's descent metric, which is
                // shallower than their Thai marks need. Negative margin cancels the
                // padding so nothing below shifts.
                boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
              }}
            >
              {p.salePrice}
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function KvProductListTemplate({ data }: { data: KvProductListState }) {
  const isRank = data.variant === 'Rank ver.';
  return (
    <div style={{ width: 1200, background: WG07, fontFamily: FONT, flexShrink: 0 }}>
      {/* Info section — same as KV module */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          padding: '60px 80px',
          boxSizing: 'border-box',
        }}
      >
        {data.showCampaignLogo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, height: 45, flexShrink: 0 }}>
            <div style={{ height: 40, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              {data.campaignLogo ? (
                <img
                  src={data.campaignLogo}
                  alt=""
                  draggable={false}
                  style={{ height: 40, width: 'auto', display: 'block', maxWidth: 'none' }}
                />
              ) : (
                <div style={{ width: 180, height: 40, background: '#D8D4CC', borderRadius: 4 }} />
              )}
            </div>
            <div style={{ width: 1.5, height: 42, background: 'rgba(0,0,0,0.5)', flexShrink: 0 }} />
            <img
              src="/store-modules/kv-lg-logo.svg"
              alt="LG"
              draggable={false}
              style={{ width: 102.151, height: 45, display: 'block', flexShrink: 0, maxWidth: 'none' }}
            />
          </div>
        )}
        {data.headline && (
          <p
            style={{
              margin: 0,
              fontSize: 72, letterSpacing: 'var(--obs-tracking-head)',
              fontWeight: 600,
              lineHeight: 1.1,
              color: TEXT_DARK,
              textAlign: 'center',
              maxHeight: 158,
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              width: '100%',
              // Descender headroom: brand faces use LG's descent metric, which is
              // shallower than their Thai marks need. Negative margin cancels the
              // padding so nothing below shifts.
              boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
            }}
          >
            {data.headline}
          </p>
        )}
      </div>

      {/* Image + cards */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* KV image — 800px tall, rounded top corners, overlaps cards by 200px */}
        <div
          style={{
            width: 1200,
            height: 800,
            marginBottom: -200,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '40px 40px 0 0',
            flexShrink: 0,
          }}
        >
          {data.kvImage ? (
            <img
              src={data.kvImage}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'right center', display: 'block', maxWidth: 'none' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: WG05, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImgSlot src={null} width={320} height={220} />
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 260,
              background: `linear-gradient(to bottom, transparent, ${WG07})`,
            }}
          />
        </div>

        {/* Product cards */}
        <div
          style={{
            display: 'flex',
            gap: 30,
            justifyContent: 'center',
            alignItems: 'stretch',
            paddingTop: 40,
            paddingBottom: 40,
            boxSizing: 'border-box',
            width: 1200,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {(isRank ? (data.rankProducts ?? data.products) : data.products).map((p, i) => (
            <KvProductListCard
              key={i}
              p={p}
              rank={isRank ? (p.rankLabel || KVPL_RANK_LABELS[i]) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 6. Category list (1200×free) ─────────────────────────────────────────────
// Figma 2015:7797 — uniform 180×180 image box, object-contain so any product
// (portrait fridge, landscape TV, narrow remote) shows in full without cropping.
const CATEGORY_IMG_BOX = 180;

function CategoryListTemplate({ data }: { data: CategoryListState }) {
  return (
    <div
      style={{
        width: 1200,
        background: WG05,
        padding: 40,
        fontFamily: FONT,
        boxSizing: 'border-box',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
      }}
    >
      {data.sectionTitle && (
        <p
          style={{
            margin: 0,
            fontSize: 52, letterSpacing: 'var(--obs-tracking-head)',
            fontWeight: 600,
            lineHeight: 1.24,
            color: TEXT_DARK,
            textAlign: 'center',
            width: '100%',
            maxHeight: 64,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}
        >
          {data.sectionTitle}
        </p>
      )}
      <div style={{ display: 'flex', gap: 50, justifyContent: 'center', alignItems: 'flex-start' }}>
        {data.categories.map((cat, i) => {
          return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: CATEGORY_IMG_BOX,
                height: CATEGORY_IMG_BOX,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                borderRadius: 12,
              }}
            >
              {cat.image ? (
                <img
                  src={cat.image}
                  alt=""
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxWidth: 'none' }}
                />
              ) : (
                <ImgSlot src={null} width={CATEGORY_IMG_BOX} height={CATEGORY_IMG_BOX} />
              )}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 30, letterSpacing: 'var(--obs-tracking)',
                fontWeight: 600,
                lineHeight: 1.1,
                color: TEXT_DARK,
                textAlign: 'center',
                wordBreak: 'break-word',
                width: 180,
                maxHeight: 66,
                overflow: 'hidden',
                // Descender headroom: brand faces use LG's descent metric, which is
                // shallower than their Thai marks need. Negative margin cancels the
                // padding so nothing below shifts.
                boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
              }}
            >
              {cat.name}
            </p>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 7. Product cards (1200×free) ─────────────────────────────────────────────
const RANK_LABELS = ['1st', '2nd', '3rd'];

function ProductCardsTemplate({ data }: { data: ProductCardsState }) {
  const isRank = data.variant === 'Rank ver.';
  const products = isRank ? (data.rankProducts ?? data.products) : data.products;
  // 2 and 4 go two to a row (wide 485×290 image); 3 and 6 go three to a row
  // (the image stays a 290 square). Rows always fill the full 1120 content
  // width, so switching count no longer shifts the left and right edges.
  const cols = products.length === 3 || products.length === 6 ? 3 : 2;
  const rows: ProductCardItem[][] = [];
  for (let i = 0; i < products.length; i += cols) rows.push(products.slice(i, i + cols));
  return (
    <div
      style={{
        width: 1200,
        background: WG05,
        padding: 40,
        fontFamily: FONT,
        boxSizing: 'border-box',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
      }}
    >
      {/* Header — title (+ period below, Price ver. only) */}
      <div style={{ width: 908, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {data.sectionTitle && (
          <p
            style={{
              margin: 0,
              fontSize: 52, letterSpacing: 'var(--obs-tracking-head)',
              fontWeight: 600,
              lineHeight: 1.24,
              color: TEXT_DARK,
              textAlign: 'center',
              width: '100%',
              maxHeight: 64,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              // Descender headroom: brand faces use LG's descent metric, which is
              // shallower than their Thai marks need. Negative margin cancels the
              // padding so nothing below shifts.
              boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
            }}
          >
            {data.sectionTitle}
          </p>
        )}
        {!isRank && data.showPeriod && data.period && (
          <p
            style={{
              margin: 0,
              fontSize: 36, letterSpacing: 'var(--obs-tracking)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: TEXT_DARK,
              textAlign: 'center',
              width: '100%',
              maxHeight: 40,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              // Descender headroom: brand faces use LG's descent metric, which is
              // shallower than their Thai marks need. Negative margin cancels the
              // padding so nothing below shifts.
              boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
            }}
          >
            {data.period}
          </p>
        )}
      </div>

      {/* Cards — same card as KV+Product list, laid out row by row so each row
          flex-fills the content width. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: '100%' }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 30, justifyContent: 'center', alignItems: 'stretch', width: '100%' }}>
            {row.map((p, i) => {
              const idx = ri * cols + i;
              return (
                <KvProductListCard
                  key={idx}
                  p={p}
                  rank={isRank ? (p.rankLabel || RANK_LABELS[idx]) : undefined}
                  cols={cols}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* CTA (optional) — black, full width, chevron */}
      {data.showCta && data.ctaText && (
        <div
          style={{
            width: '100%',
            height: 73,
            background: '#000',
            borderRadius: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 32, letterSpacing: 'var(--obs-tracking)',
              fontWeight: 300,
              lineHeight: 1.2,
              color: '#fff',
              whiteSpace: 'nowrap',
              maxWidth: 1000,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
              textAlign: 'center',
              // Descender headroom: brand faces use LG's descent metric, which is
              // shallower than their Thai marks need. Negative margin cancels the
              // padding so nothing below shifts.
              boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
            }}
          >
            {data.ctaText}
          </span>
          <img
            src="/store-modules/cta-arrow.svg"
            alt=""
            draggable={false}
            style={{ width: 16.5, height: 16.5, transform: 'rotate(45deg)', maxWidth: 'none', display: 'block', flexShrink: 0 }}
          />
        </div>
      )}
    </div>
  );
}

// ── 8. Banner (1200×628) ─────────────────────────────────────────────────────
// Reuses the Other Promotions system: Product ver. → theme banner (example
// banners, image bg color, background text, theme objects, plus sign, product
// images); Lifestyle ver. → shape-masked lifestyle image.
export function BannerTemplate({ data }: { data: BannerSlideState }) {
  return data.variant === 'Lifestyle ver.'
    ? <BannerLifestyleTemplate state={data.lifestyleState} />
    : <OtherPromoThemeTemplate state={data.themeState} light />;
}

// ── 9. Vouchers (1200×free) ───────────────────────────────────────────────────
const VOUCHER_SHAPES = [
  '/store-modules/voucher-shape-1.svg', // white, red outline
  '/store-modules/voucher-shape-2.svg', // red fill
  '/store-modules/voucher-shape-3.svg', // white, red outline
];

function VoucherGroupSubtitle({ subtitle, period }: { subtitle: string; period: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
      {subtitle && (
        <p style={{ margin: 0, fontSize: 34, fontWeight: 600, lineHeight: 1.1, letterSpacing: 'calc(-0.34px + var(--obs-tracking))', color: TEXT_DARK, textAlign: 'center', whiteSpace: 'nowrap', maxHeight: 37, overflow: 'hidden', flexShrink: 0,
          // Descender headroom: brand faces use LG's descent metric, which is
          // shallower than their Thai marks need. Negative margin cancels the
          // padding so nothing below shifts.
          boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
        }}>
        {subtitle}
        </p>
      )}
      {subtitle && period && <div style={{ width: 1, height: 32, background: TEXT_LIGHT, flexShrink: 0 }} />}
      {period && (
        <p style={{ margin: 0, fontSize: 34, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, lineHeight: 1.1, color: TEXT_MID, textAlign: 'center', whiteSpace: 'nowrap', maxHeight: 37, overflow: 'hidden', flexShrink: 0,
          // Descender headroom: brand faces use LG's descent metric, which is
          // shallower than their Thai marks need. Negative margin cancels the
          // padding so nothing below shifts.
          boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
        }}>
          {period}
        </p>
      )}
    </div>
  );
}

function VouchersTemplate({ data }: { data: VouchersState }) {
  return (
    <div
      style={{
        width: 1200,
        background: WG07,
        padding: 40,
        fontFamily: FONT,
        boxSizing: 'border-box',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {data.sectionTitle && (
        <p
          style={{
            margin: 0,
            fontSize: 52, letterSpacing: 'var(--obs-tracking-head)',
            fontWeight: 600,
            lineHeight: 1.24,
            color: TEXT_DARK,
            textAlign: 'center',
            width: '100%',
            maxHeight: 64,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}
        >
          {data.sectionTitle}
        </p>
      )}

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
        {/* Group 1 — ticket vouchers (optional) */}
        {data.showGroup1 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <VoucherGroupSubtitle subtitle={data.showGroup1Subtitle ? data.group1Subtitle : ''} period={data.showGroup1Period ? data.group1Period : ''} />
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: data.vouchers.length === 3 ? 'space-between' : 'center',
                gap: data.vouchers.length === 3 ? undefined : 40,
              }}
            >
              {data.vouchers.map((v, i) => {
                const { isRed: isRedTicket, shapeIndex } = voucherVisual(data.vouchers.length, i);
                return (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <img
                        src="/store-modules/voucher-plus.svg"
                        alt=""
                        draggable={false}
                        style={{ width: 31.235, height: 30, maxWidth: 'none', display: 'block', flexShrink: 0 }}
                      />
                    )}
                    <div
                      style={{
                        position: 'relative',
                        width: 346.047,
                        height: 186,
                        flexShrink: 0,
                        filter: 'drop-shadow(2px 2px 3px rgba(178,171,152,0.5))',
                      }}
                    >
                      <img
                        src={VOUCHER_SHAPES[shapeIndex]}
                        alt=""
                        draggable={false}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none', display: 'block' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: 260,
                          height: 166,
                          padding: '20px 0',
                          boxSizing: 'border-box',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          textAlign: 'center',
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 24, letterSpacing: 'var(--obs-tracking)',
                            fontWeight: 600,
                            lineHeight: 1.1,
                            color: isRedTicket ? '#fff' : LG_RED,
                            width: '100%',
                            maxHeight: 26,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            flexShrink: 0,
                            // Descender headroom: brand faces use LG's descent metric, which is
                            // shallower than their Thai marks need. Negative margin cancels the
                            // padding so nothing below shifts.
                            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                          }}
                        >
                          {v.typeLabel}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 40, letterSpacing: 'var(--obs-tracking)',
                            fontWeight: 600,
                            lineHeight: 1.1,
                            color: isRedTicket ? '#fff' : TEXT_DARK,
                            width: '100%',
                            maxHeight: 88,
                            overflow: 'hidden',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            // Descender headroom: brand faces use LG's descent metric, which is
                            // shallower than their Thai marks need. Negative margin cancels the
                            // padding so nothing below shifts.
                            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                          }}
                        >
                          {v.valueText}
                        </p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Group 2 — member voucher banner (optional) */}
        {data.showGroup2 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <VoucherGroupSubtitle subtitle={data.showGroup2Subtitle ? data.group2Subtitle : ''} period={data.showGroup2Period ? data.group2Period : ''} />
            <div
              style={{
                width: '100%',
                height: 200,
                background: '#fff',
                borderRadius: 10,
                padding: '30px 40px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}
            >
              <div style={{ width: 500, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, flexShrink: 0 }}>
                {data.group2SmallCopy && (
                  <p style={{ margin: 0, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, lineHeight: 1.1, color: TEXT_LIGHT, width: '100%', maxHeight: 31, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    // Descender headroom: brand faces use LG's descent metric, which is
                    // shallower than their Thai marks need. Negative margin cancels the
                    // padding so nothing below shifts.
                    boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                  }}>
                    {data.group2SmallCopy}
                  </p>
                )}
                {data.group2Copy && (
                  <p style={{ margin: 0, fontSize: 40, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, lineHeight: 1.1, color: TEXT_DARK, width: '100%', maxHeight: 90, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    // Descender headroom: brand faces use LG's descent metric, which is
                    // shallower than their Thai marks need. Negative margin cancels the
                    // padding so nothing below shifts.
                    boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                  }}>
                    {data.group2Copy}
                  </p>
                )}
              </div>

              {/* Coupon graphic + overlay text */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src="/store-modules/voucher-coupon.png"
                  alt=""
                  draggable={false}
                  style={{ width: 266, height: 127.957, maxWidth: 'none', display: 'block' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 16.52,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 160,
                    height: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-end',
                    overflow: 'hidden',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 -5px',
                      fontSize: 40, letterSpacing: 'var(--obs-tracking)',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: LG_RED,
                      width: '100%',
                      maxHeight: 50,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {data.couponDiscountValue}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 19,
                      fontWeight: 400,
                      lineHeight: 1.2,
                      letterSpacing: 'calc(0.19px + var(--obs-tracking))',
                      color: TEXT_DARK,
                      width: '100%',
                      maxHeight: 48,
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      // Descender headroom: brand faces use LG's descent metric, which is
                      // shallower than their Thai marks need. Negative margin cancels the
                      // padding so nothing below shifts.
                      boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                    }}
                  >
                    {data.couponMinSpend}
                  </p>
                </div>
              </div>

              {data.ctaText && <CtaBtn text={data.ctaText} />}
            </div>
          </div>
        )}

        {/* Group 3 — small vouchers row (optional), Figma 2753:20827 */}
        {data.showGroup3 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <VoucherGroupSubtitle
              subtitle={data.showGroup3Subtitle ? data.group3Subtitle : ''}
              period={data.showGroup3Period ? data.group3Period : ''}
            />
            <div style={{ width: '100%', display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 16 }}>
              {(data.smallVouchers ?? []).map((v, i) => (
                <div
                  key={i}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    background: '#262626',
                    borderRadius: 10,
                    padding: '16px 20px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, width: '100%' }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 46,
                        fontWeight: 700,
                        lineHeight: 1.1,
                        letterSpacing: 'calc(0.46px + var(--obs-tracking))',
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                        // Descender headroom: brand faces use LG's descent metric, which is
                        // shallower than their Thai marks need. Negative margin cancels the
                        // padding so nothing below shifts.
                        boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                      }}
                    >
                      {v.price}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 30, letterSpacing: 'var(--obs-tracking)',
                        fontWeight: 600,
                        lineHeight: 1.1,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        // Descender headroom: brand faces use LG's descent metric, which is
                        // shallower than their Thai marks need. Negative margin cancels the
                        // padding so nothing below shifts.
                        boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                      }}
                    >
                      {data.group3OffLabel}
                    </p>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 18, letterSpacing: 'var(--obs-tracking)',
                      fontWeight: 400,
                      lineHeight: 1.1,
                      color: '#fff',
                      textAlign: 'center',
                      width: '100%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      // Descender headroom: brand faces use LG's descent metric, which is
                      // shallower than their Thai marks need. Negative margin cancels the
                      // padding so nothing below shifts.
                      boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                    }}
                  >
                    {v.subCopy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {data.showDisclaimer && data.disclaimer && (
        <p style={{ margin: 0, fontSize: 18, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, lineHeight: 1.1, color: TEXT_DARK, opacity: 0.8, width: '100%', maxHeight: 60, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          // Descender headroom: brand faces use LG's descent metric, which is
          // shallower than their Thai marks need. Negative margin cancels the
          // padding so nothing below shifts.
          boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
        }}>
          {data.disclaimer}
        </p>
      )}
    </div>
  );
}

// ── 10. Value props (1200×346) ────────────────────────────────────────────────
// Icons come from the Figma "Icons" component set (Line black variants) —
// each SVG is the full 96×96 frame incl. padding, so rendering at 120×120
// matches the module's Figma layout exactly. See vpIcons.ts.

function ValuePropsTemplate({ data }: { data: ValuePropsState }) {
  return (
    <div
      style={{
        width: 1200,
        height: 346,
        background: WG05,
        padding: 40,
        fontFamily: FONT,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
        flexShrink: 0,
      }}
    >
      {data.sectionTitle && (
        <p
          style={{
            margin: 0,
            fontSize: 52, letterSpacing: 'var(--obs-tracking-head)',
            fontWeight: 600,
            lineHeight: 1.24,
            color: TEXT_DARK,
            textAlign: 'center',
            width: '100%',
            maxHeight: 64,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}
        >
          {data.sectionTitle}
        </p>
      )}
      <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
        {data.props.map((p, i) => {
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                <img
                  src={vpIconSrc(p.icon)}
                  alt=""
                  draggable={false}
                  style={{ width: 120, height: 120, maxWidth: 'none', display: 'block' }}
                />
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 24, letterSpacing: 'var(--obs-tracking)',
                  fontWeight: 400,
                  lineHeight: 1.1,
                  color: TEXT_DARK,
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  width: 130,
                  maxHeight: 56.8, // 24×1.1×2 + 4px descender headroom
                  overflow: 'hidden',
                  // Descender headroom: brand faces use LG's descent metric, which is
                  // shallower than their Thai marks need. Negative margin cancels the
                  // padding so nothing below shifts.
                  boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                }}
              >
                {p.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

interface Props {
  editState: ModuleEditState;
}

export function ModuleRenderer({ editState }: Props) {
  switch (editState.type) {
    case 'official-store':  return <OfficialStoreTemplate data={editState.data} />;
    case 'follow-us':       return <FollowUsTemplate data={editState.data} />;
    case 'text':            return <TextModuleTemplate data={editState.data} />;
    case 'kv':              return <KvTemplate data={editState.data} />;
    case 'kv-product-list': return <KvProductListTemplate data={editState.data} />;
    case 'category-list':   return <CategoryListTemplate data={editState.data} />;
    case 'product-cards':   return <ProductCardsTemplate data={editState.data} />;
    // A group renders as its first slide; the canvas and the ZIP export pick
    // which slide they want by handing BannerTemplate that one directly.
    case 'banner':          return <BannerTemplate data={editState.data.slides[0]} />;
    case 'vouchers':        return <VouchersTemplate data={editState.data} />;
    case 'value-props':     return <ValuePropsTemplate data={editState.data} />;
  }
}
