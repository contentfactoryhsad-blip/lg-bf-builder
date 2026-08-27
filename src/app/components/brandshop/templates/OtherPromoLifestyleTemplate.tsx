import React from 'react';
import type { TFunction } from '../../../i18n/LanguageContext';

/* ─────────────────────────────────────────── */
/* Mask shape (Figma node 802:7424)             */
/* SHAPE clipped at left=660, top=-8.054        */
/* in banner-coord space (1200 × 628)            */
/* ─────────────────────────────────────────── */

export const SHAPE_PATH =
  'M37.5411 4.30759C43.956 1.45098 50.5626 0.000557898 57.201 0.000557898L214.778 0L555.933 0.300702L555.933 642.668L57.3661 642.668C50.7702 642.668 44.2062 641.235 37.818 638.405C3.73653 623.282 -10.7276 554.316 9.5818 505.709C32.1164 451.761 44.2009 387.341 44.1583 321.312C44.1157 255.291 31.962 190.907 9.35821 137.039C-11.0204 88.5203 3.45971 19.5458 37.5411 4.30759Z';
export const LIFESTYLE_SHAPE = {
  left: 660,
  top: -8.054,
  width: 555.934,
  height: 642.668,
};

/**
 * Fixed background — Figma frame 1633:41818, node 1633:41869 image position.
 * Image at left:-32.1%, top:-96.81%, w:167.92%, h:258.46% of banner (1200×628),
 * which equates to (-385.2, -607.97) sized (2015.04, 1623.13). This is the
 * canonical Figma BG placement (image's center vertically anchored slightly
 * above banner center, horizontally near banner center).
 */
export const LIFESTYLE_BG_FIXED = {
  x: -385.2,
  y: -607.97,
  width: 2015.04,
  height: 1623.13,
};
const LIFESTYLE_BG_BLUR_PX = 100;     // Figma backdrop-blur-[100px]
const LIFESTYLE_BG_TINT_ALPHA = 0.6;  // Figma 0.5 + 10% (lifts dark images)

/**
 * Default masked-layer placement — Figma frame 1633:41818, node 1633:41872.
 * Outer div: left=-316.02, top=-606.79, w=1898.204, h=1616.883 in banner coords.
 * Mask offset within div: (976.017, 598.739) → mask in banner = (660, -8.051).
 */
export const LIFESTYLE_MASK_DEFAULT = {
  x: -316.02,
  y: -606.79,
  width: 1898.204,
  height: 1616.883,
};

/** Lifestyle mask SVG asset path (saved from Figma asset 34a6d62d...svg) */
export const LIFESTYLE_MASK_SVG = '/brand-shop/other-promotion/lifestyle-shape.svg';

export interface OtherPromoLifestyleState {
  headCopy: string;
  showSubCopy: boolean;
  subCopy: string;
  ctaText: string;
  showDisclaimer: boolean;
  disclaimerText: string;
  imageSrc: string | null;
  /** Original, uncropped upload/fetch source — needed to re-run the crop
   *  non-destructively (re-cropping the already-cropped output would feed
   *  react-easy-crop coordinates that don't correspond to that image's
   *  actual pixel dimensions). Falls back to imageSrc if absent (legacy/default state).
   *  Used by the Store Page Modules Banner's Lifestyle ver.; unused live here. */
  imageSrcOriginal?: string | null;
  /** User-adjustable masked (sharp) image placement. BG layer is independent
   *  (LIFESTYLE_BG_FIXED) and never moves regardless of these values. */
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
}

export function makeOtherPromoLifestyleState(t: TFunction): OtherPromoLifestyleState {
  return {
    headCopy: t('Enter the head copy with the text component'),
    showSubCopy: true,
    subCopy: t('Enter the sub copy with the text component'),
    ctaText: t('Buy now'),
    showDisclaimer: true,
    disclaimerText: t('*T&Cs apply'),
    imageSrc: '/brand-shop/other-promotion/lifestyle-default.png',
    imageX: LIFESTYLE_MASK_DEFAULT.x,
    imageY: LIFESTYLE_MASK_DEFAULT.y,
    imageWidth: LIFESTYLE_MASK_DEFAULT.width,
    imageHeight: LIFESTYLE_MASK_DEFAULT.height,
  };
}

interface Props {
  state: OtherPromoLifestyleState;
  /** Optional editor overlay rendered above the banner — handles for drag/resize */
  imageOverlay?: React.ReactNode;
  /** Hide text — used for thumbnail fallback to avoid sub-pixel font misalignment */
  hideText?: boolean;
}

export function OtherPromoLifestyleTemplate({ state, imageOverlay, hideText }: Props) {
  // CSS mask offset within the outer image box, so the mask silhouette stays
  // anchored at banner (LIFESTYLE_SHAPE.left, LIFESTYLE_SHAPE.top) regardless
  // of where the user drags the masked image.
  const maskOffsetX = LIFESTYLE_SHAPE.left - state.imageX;
  const maskOffsetY = LIFESTYLE_SHAPE.top - state.imageY;

  return (
    <div
      style={{
        width: 1200,
        height: 628,
        position: 'relative',
        overflow: 'hidden',
        background: '#E8E5DF',
        fontFamily: 'var(--obs-font)',
        flexShrink: 0,
      }}
    >
      {state.imageSrc ? (
        <>
          {/* Blurred background — TRULY FIXED (LIFESTYLE_BG_FIXED constant).
              200% banner size, centered, blurred. Independent of state.image*
              so the masked layer can move freely without dragging the bg. */}
          <img
            src={state.imageSrc}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: LIFESTYLE_BG_FIXED.x,
              top: LIFESTYLE_BG_FIXED.y,
              width: LIFESTYLE_BG_FIXED.width,
              height: LIFESTYLE_BG_FIXED.height,
              objectFit: 'cover',
              filter: `blur(${LIFESTYLE_BG_BLUR_PX}px)`,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
          {/* White tint blur-effect layer — Figma bg-[rgba(255,255,255,0.5)] */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgba(255,255,255,${LIFESTYLE_BG_TINT_ALPHA})`,
              pointerEvents: 'none',
            }}
          />
          {/* Sharp masked image — Figma node 1633:41872 structure.
              Outer div at (state.imageX, state.imageY) sized (W, H); CSS mask
              positioned so silhouette stays at banner (660, -8.054). Image
              inside fills the div with objectFit:cover (preserves aspect). */}
          <div
            style={{
              position: 'absolute',
              left: state.imageX,
              top: state.imageY,
              width: state.imageWidth,
              height: state.imageHeight,
              maskImage: `url('${LIFESTYLE_MASK_SVG}')`,
              WebkitMaskImage: `url('${LIFESTYLE_MASK_SVG}')`,
              maskPosition: `${maskOffsetX}px ${maskOffsetY}px`,
              WebkitMaskPosition: `${maskOffsetX}px ${maskOffsetY}px`,
              maskSize: `${LIFESTYLE_SHAPE.width}px ${LIFESTYLE_SHAPE.height}px`,
              WebkitMaskSize: `${LIFESTYLE_SHAPE.width}px ${LIFESTYLE_SHAPE.height}px`,
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <img
              src={state.imageSrc}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                userSelect: 'none',
              }}
            />
          </div>
        </>
      ) : (
        <>
          {/* Empty-state placeholder — gray shape outline */}
          <svg
            style={{
              position: 'absolute',
              left: LIFESTYLE_SHAPE.left,
              top: LIFESTYLE_SHAPE.top,
              pointerEvents: 'none',
            }}
            width={LIFESTYLE_SHAPE.width}
            height={LIFESTYLE_SHAPE.height}
            viewBox={`0 0 ${LIFESTYLE_SHAPE.width} ${LIFESTYLE_SHAPE.height}`}
            fill="none"
          >
            <path d={SHAPE_PATH} fill="#D1CDC4" />
          </svg>
        </>
      )}

      {/* Left column — head + sub + CTA (BLACK text on lifestyle) */}
      {!hideText && (
        <div
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
                color: '#000000',
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
                  color: '#000000',
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
        </div>
      )}

      {!hideText && state.showDisclaimer && (
        <div style={{ position: 'absolute', bottom: 40, left: 40, width: 561 }}>
          <p
            style={{
              margin: 0,
              fontSize: 18, letterSpacing: 'var(--obs-tracking)',
              fontWeight: 300,
              lineHeight: 1.1,
              color: '#000000',
              fontFamily: 'var(--obs-font)',
              opacity: 0.8,
            }}
          >
            {state.disclaimerText}
          </p>
        </div>
      )}

      {imageOverlay}
    </div>
  );
}
