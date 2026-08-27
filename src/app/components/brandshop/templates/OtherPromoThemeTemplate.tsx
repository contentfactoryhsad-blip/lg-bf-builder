import React from 'react';
import type { TFunction } from '../../../i18n/LanguageContext';

/* ─────────────────────────────────────────── */
/* Image section bg color options              */
/* ─────────────────────────────────────────── */

export const IMAGE_BG_COLORS = {
  red: '#BC4344',
  green: '#5E897F',
  purple: '#806289',
  brown: '#8F4749',
  'warm-gray-03': '#716F6A',
  'warm-gray-04': '#CBC8C2',
  'warm-gray-05': '#E6E1D6',
} as const;

export type ImageBgColorKey = keyof typeof IMAGE_BG_COLORS;

export const IMAGE_BG_COLOR_LABELS: Record<ImageBgColorKey, string> = {
  red: 'Red',
  green: 'Green',
  purple: 'Purple',
  brown: 'Brown',
  'warm-gray-03': 'Warm Gray 03',
  'warm-gray-04': 'Warm Gray 04',
  'warm-gray-05': 'Warm Gray 05',
};

/* ─────────────────────────────────────────── */
/* Free-placement image                         */
/* x/y/width/height in image-section coords     */
/* (may exceed bounds — masked by section)      */
/* rotation: degrees, around frame center        */
/* ─────────────────────────────────────────── */

export interface PlacedImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  /**
   * Optional inner image transform (fraction of frame size). Lets a preset
   * reproduce Figma's "image bigger than frame, clipped" pattern exactly.
   * If omitted, image fills frame with objectFit:contain.
   */
  imageScale?: number;     // image width as fraction of frame width (e.g. 1.5904)
  imageOffsetX?: number;   // image left as fraction of frame width (negative = overflows on left)
  imageOffsetY?: number;   // image top as fraction of frame height
  /**
   * What "Edit background removal" reopens the brush with. Both are needed and
   * neither is `src`: the restore brush samples the shot as supplied, so it has
   * to line up pixel-for-pixel with the cut it is shown beside — and `src` may
   * have been trimmed to its opaque bounds afterwards, which moves every pixel.
   * Absent on slots filled before this existed, and on any image that never went
   * through background removal.
   */
  sourceSrc?: string;      // the shot as supplied, before removal
  cutSrc?: string;         // the cut as it stands, untrimmed
}

export type ProductImageSlots = [
  PlacedImage | null,
  PlacedImage | null,
  PlacedImage | null,
  PlacedImage | null,
];

export type ThemeObjectSlots = [
  PlacedImage | null,
  PlacedImage | null,
];

export const PRODUCT_SLOT_COUNT = 4;
export const THEME_OBJECT_SLOT_COUNT = 2;

export interface OtherPromoThemeState {
  headCopy: string;
  showSubCopy: boolean;
  subCopy: string;
  ctaText: string;
  showDisclaimer: boolean;
  disclaimerText: string;
  imageBgColor: ImageBgColorKey;
  showBigText: boolean;
  bigText: string;
  /** Background text layout — matches Figma per-preset (Title element) */
  bigTextLeft: number;   // x in image-section coords
  bigTextTop: number;    // y in image-section coords
  bigTextWidth: number;  // wrap width
  /** Bundle sale plus sign — single placeable element, toggle visibility */
  showPlusSign: boolean;
  plusSign: PlacedImage;
  /** Master visibility for the entire theme object group */
  showThemeObjects: boolean;
  /** Theme-object blur, in slider units 0–30 (30 = full THEME_OBJECT_BLUR_PX,
   *  0 = sharp). Undefined ⇒ treated as 30 (the original look). */
  objectBlur?: number;
  /** Fixed 2 slots — upload-only */
  themeObjects: ThemeObjectSlots;
  /** Fixed 4 slots — fetch or upload */
  productImages: ProductImageSlots;
  /** Lock flags — when true, the bucket is visible but not selectable/draggable in editor */
  lockThemeObjects: boolean;
  lockProductImages: boolean;
  lockPlusSign: boolean;
  /** Last preset applied — used by Reset to Default to restore that preset's initial state */
  activePresetId?: string;
}

/**
 * Default theme object positions/sizes are computed from Figma
 * (file 5Vqt1jiDnaERLEdNLAzP5t, node 1572:22842).
 *
 * Figma structure:
 * - outer wrap (positioning frame, NOT rotated) holds a rotated inner rect
 * - inner rotated rect (the visible bbox of rotated image) is what we model
 *
 * Center of outer wrap = center of inner rotated rect.
 * Theme 1 outer: x=-131.78 y=-114.67 w=537.84 h=483.33 → center (137.14, 127.00)
 *   inner: w=443.28 h=350.43 rot=20.47°
 *   → x = 137.14 - 443.28/2 = -84.50, y = 127.00 - 350.43/2 = -48.22
 *
 * Theme 2 outer: x=256.26 y=373.44 w=310.49 h=268.40 → center (411.50, 507.64)
 *   inner: w=269.17 h=212.80 rot=-13.14°
 *   → x = 411.50 - 269.17/2 = 276.92, y = 507.64 - 212.80/2 = 401.24
 */
export function makeOtherPromoThemeState(t: TFunction): OtherPromoThemeState {
  return {
  headCopy: t('New Year Home Appliance Deals Up to 48% Off*'),
  showSubCopy: true,
  subCopy: t('Now till 15 FEB, 2026'),
  ctaText: t('Shop now'),
  showDisclaimer: true,
  disclaimerText: t('*T&Cs apply. Stocks subject to availability. Pictures for illustrations only.'),
  imageBgColor: 'red',
  showBigText: true,
  bigText: 'New\nYear',
  // Default = pb-01 New Year layout (Figma frame 1572:22846)
  bigTextLeft: -10,
  bigTextTop: 0,
  bigTextWidth: 530,
  showPlusSign: false,
  showThemeObjects: true,
  plusSign: {
    id: 'plus-sign',
    src: '/brand-shop/other-promotion/plus-sign.svg',
    x: (500 - 50) / 2,
    y: (548 - 50) / 2,
    width: 50,
    height: 50,
  },
  themeObjects: [
    {
      id: 'default-theme-1',
      src: '/brand-shop/other-promotion/new-year-shape.png',
      x: -84.50,
      y: -48.22,
      width: 443.28,
      height: 350.43,
      rotation: 20.47,
    },
    {
      id: 'default-theme-2',
      src: '/brand-shop/other-promotion/new-year-shape.png',
      x: 276.92,
      y: 401.24,
      width: 269.17,
      height: 212.80,
      rotation: -13.14,
    },
  ],
  productImages: [
    {
      id: 'default-ref',
      src: '/brand-shop/other-promotion/ref-side-1.png',
      x: 302.02,
      y: 72.56,
      width: 208.37,
      height: 350.87,
    },
    {
      id: 'default-wm',
      src: '/brand-shop/other-promotion/wm-side-1.png',
      x: -9.22,
      y: 281.95,
      width: 255.22,
      height: 311.64,
    },
    null,
    null,
  ],
  lockThemeObjects: false,
  lockProductImages: false,
  lockPlusSign: false,
  };
}

export const IMAGE_SECTION = {
  width: 500,
  height: 548,
  left: 661,
  top: 40,
  borderRadius: 30,
};

/** Blur radius applied to all theme objects (matches Figma's layer blur). */
export const THEME_OBJECT_BLUR_PX = 5;

interface Props {
  state: OtherPromoThemeState;
  imageSectionOverlay?: React.ReactNode;
  /** Hide text (head/sub/CTA/disclaimer/bigText) — used for thumbnail fallback
   *  to avoid sub-pixel font misalignment at very small scale. */
  hideText?: boolean;
  /** Light layout (Store Page Modules Banner) — warm-gray banner bg + black
   *  copy. Default (false) = the live Other Promotions dark #262626 layout. */
  light?: boolean;
}

export function OtherPromoThemeTemplate({ state, imageSectionOverlay, hideText, light }: Props) {
  const bannerBg = light ? '#F6F3EB' : '#262626';
  const copyColor = light ? '#000000' : '#FFFFFF';
  // Theme-object blur strength: slider 0–30 maps linearly onto 0–THEME_OBJECT_BLUR_PX,
  // so 30 keeps the original look and 0 removes the blur. Undefined ⇒ original (30).
  const objectBlurPx = ((state.objectBlur ?? 30) / 30) * THEME_OBJECT_BLUR_PX;
  return (
    <div
      style={{
        width: 1200,
        height: 628,
        position: 'relative',
        // Outer is overflow:visible so the editor overlay (selection boxes,
        // resize handles) can render beyond the banner edge. Banner content
        // still gets clipped by the inner wrapper below.
        overflow: 'visible',
        fontFamily: 'var(--obs-font)',
        flexShrink: 0,
      }}
    >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: bannerBg,
        overflow: 'hidden',
      }}
    >
      {/* Left column — head + sub + CTA */}
      {!hideText && <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 600,
          height: 628,
          paddingLeft: 40,
          paddingTop: 40,
          paddingBottom: 40,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 40,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
          <p
            style={{
              margin: 0,
              fontSize: 60, letterSpacing: 'var(--obs-tracking-head)',
              fontWeight: 600,
              lineHeight: 1.12,
              color: copyColor,
              fontFamily: 'var(--obs-font)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {state.headCopy}
          </p>
          {state.showSubCopy && (
            <p
              style={{
                margin: 0,
                fontSize: 30, letterSpacing: 'var(--obs-tracking)',
                fontWeight: 300,
                lineHeight: 1.1,
                color: copyColor,
                fontFamily: 'var(--obs-font)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {state.subCopy}
            </p>
          )}
        </div>

        <div
          style={{
            background: '#FD312E',
            borderRadius: 15,
            height: 73,
            paddingLeft: 32,
            paddingRight: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 32, letterSpacing: 'var(--obs-tracking)',
              fontWeight: 300,
              lineHeight: 1.2,
              color: '#FFFFFF',
              fontFamily: 'var(--obs-font)',
              whiteSpace: 'nowrap',
            }}
          >
            {state.ctaText}
          </span>
        </div>
      </div>}

      {!hideText && state.showDisclaimer && (
        <div style={{ position: 'absolute', bottom: 40, left: 40, width: 561 }}>
          <p
            style={{
              margin: 0,
              fontSize: 18, letterSpacing: 'var(--obs-tracking)',
              fontWeight: 300,
              lineHeight: 1.1,
              color: copyColor,
              fontFamily: 'var(--obs-font)',
              opacity: 0.8,
            }}
          >
            {state.disclaimerText}
          </p>
        </div>
      )}

      {/* Image section — single masking container (bg + theme + bg text + products) */}
      <div
        style={{
          position: 'absolute',
          left: IMAGE_SECTION.left,
          top: IMAGE_SECTION.top,
          width: IMAGE_SECTION.width,
          height: IMAGE_SECTION.height,
          background: IMAGE_BG_COLORS[state.imageBgColor],
          borderRadius: IMAGE_SECTION.borderRadius,
          overflow: 'hidden',
        }}
      >
        {/* Theme objects — rotated, blurred, semi-transparent decorations */}
        {state.showThemeObjects && state.themeObjects.filter((img): img is PlacedImage => !!img).map((img) => {
          const rot = img.rotation ?? 0;
          return (
            <div
              key={img.id}
              style={{
                position: 'absolute',
                left: img.x,
                top: img.y,
                width: img.width,
                height: img.height,
                transform: rot ? `rotate(${rot}deg)` : undefined,
                transformOrigin: 'center',
                opacity: 0.5,
                filter: `blur(${objectBlurPx}px)`,
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              <img
                src={img.src}
                alt=""
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  display: 'block',
                  userSelect: 'none',
                }}
              />
            </div>
          );
        })}

        {/* Background text — Figma per-preset position + width 530 (auto-wrap
            at width). Long words break to fit. Locked at max 2 lines. */}
        {!hideText && state.showBigText && (
          <div
            style={{
              position: 'absolute',
              left: state.bigTextLeft,
              top: state.bigTextTop,
              width: state.bigTextWidth,
              opacity: 0.5,
              color: '#FFFFFF',
              fontSize: 150, letterSpacing: 'var(--obs-tracking)',
              fontFamily: 'var(--obs-font)',
              fontWeight: 600,
              lineHeight: 0.9,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              // 2-line lock: 150 × 0.9 × 2 = 270, +5px descender safety
              maxHeight: 275,
              overflow: 'hidden',
              pointerEvents: 'none',
              // Descender headroom: brand faces use LG's descent metric, which is
              // shallower than their Thai marks need. Negative margin cancels the
              // padding so nothing below shifts.
              boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
            }}
          >
            {state.bigText}
          </div>
        )}

        {/* Product images — 4 slots, render only filled */}
        {state.productImages.filter((img): img is PlacedImage => !!img).map((img) => {
          const rot = img.rotation ?? 0;
          const hasZoom = img.imageScale !== undefined || img.imageOffsetX !== undefined || img.imageOffsetY !== undefined;
          // When a preset specifies imageScale/offset, render frame as
          // overflow:hidden box with image positioned/scaled inside (matches
          // Figma's "image bigger than frame, clipped" pattern). Otherwise
          // use plain objectFit:contain.
          if (hasZoom) {
            const scale = img.imageScale ?? 1;
            const offX = img.imageOffsetX ?? 0;
            const offY = img.imageOffsetY ?? 0;
            return (
              <div
                key={img.id}
                style={{
                  position: 'absolute',
                  left: img.x,
                  top: img.y,
                  width: img.width,
                  height: img.height,
                  overflow: 'hidden',
                  transform: rot ? `rotate(${rot}deg)` : undefined,
                  transformOrigin: 'center',
                  pointerEvents: 'none',
                }}
              >
                <img
                  src={img.src}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    width: `${scale * 100}%`,
                    height: 'auto',
                    left: `${offX * 100}%`,
                    top: `${offY * 100}%`,
                    maxWidth: 'none',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />
              </div>
            );
          }
          return (
            <img
              key={img.id}
              src={img.src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: img.x,
                top: img.y,
                width: img.width,
                height: img.height,
                maxWidth: 'none',
                objectFit: 'contain',
                transform: rot ? `rotate(${rot}deg)` : undefined,
                transformOrigin: 'center',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          );
        })}

        {/* Bundle sale plus sign — always rendered above product images */}
        {state.showPlusSign && (
          <img
            src={state.plusSign.src}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: state.plusSign.x,
              top: state.plusSign.y,
              width: state.plusSign.width,
              height: state.plusSign.height,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        )}
      </div>

    </div>
      {/* Editor overlay — at banner level, outside the inner clipped wrapper
          so selection boxes / resize handles can extend beyond banner edges. */}
      {imageSectionOverlay}
    </div>
  );
}
