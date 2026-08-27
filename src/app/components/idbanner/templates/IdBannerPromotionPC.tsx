/**
 * Promotion ID Banner — PC version (Lazada search results, 1200×300).
 * Frame: Figma 2468:48520 (Light) / 2468:48522 (Dark) — redesign replacing the
 * old 9-color-swatch theme + wave-shape system with a simple light/dark toggle.
 *
 * Layout (Figma):
 *   - KV image masked into an organic wavy-edge shape (523.451×360.182,
 *     `/id-banner/promo-kv-mask.svg`), right side, at left:720 top:-30.09.
 *     The mask shape is identical across light/dark/PC/MO — only its position
 *     within the frame differs between PC and MO. The image is cropped
 *     (via ImageCropModal, aspectRatio = mask box aspect) to exactly the mask
 *     box's aspect ratio before being placed, so no drag/zoom is needed here —
 *     object-fit:cover fills the box exactly.
 *   - Center-left Info block at left:400, w:280, py:30, vertical center
 *     - Logos row (toggle): promotion logo h:20 + 1px divider (opacity 0.5)
 *       + LG logo 54.48×24 (colored asset in light mode, white asset in dark)
 *     - Head copy: 30px Semibold(→CSS 400), max 3 lines
 *     - Sub copy: 20px Regular(→CSS 300), max 3 lines
 */

import React from 'react';
import type { BrandFontId } from '../../../fonts/brandFonts';
import type { TFunction } from '../../i18n/LanguageContext';
import type { CropState } from '../ImageCropModal';

export type IdBannerPromotionTheme = 'light' | 'dark';

export const PROMO_THEME_TOKENS: Record<IdBannerPromotionTheme, { bg: string; text: string }> = {
  light: { bg: '#F0ECE4', text: '#000000' },
  dark: { bg: '#262626', text: '#FFFFFF' },
};

export const ID_BANNER_PROMOTION_PC_W = 1200;
export const ID_BANNER_PROMOTION_PC_H = 300;

// Organic KV image. The full wavy shape (523.451×360.182) bleeds off the frame edges,
// so each orientation's VISIBLE window is (wavy shape ∩ frame) — a different size and
// aspect for PC vs MO. We render each window as its own box: the user's cropped image
// (cropped to EXACTLY that window's aspect) fills the box via object-cover, and the
// full wavy mask, positioned by (maskX,maskY), clips the wavy left edge. So the crop
// aspect the editor uses = the real visible aspect (PC 1.6, MO ~1.13), and
// "what you crop is what shows". The two windows are cropped independently.
export const PROMO_KV_MASK_URL = '/id-banner/promo-kv-mask.svg';
export const PROMO_MASK_W = 523.451;
export const PROMO_MASK_H = 360.182;

export interface PromoKvShape {
  left: number; top: number; width: number; height: number;
  maskX: number; maskY: number;
  aspect: number;
}

// Per-orientation visible window (= frame ∩ wavy shape) in frame coords, plus the
// mask offset that aligns the wavy left edge and the crop aspect.
export const PC_KV: PromoKvShape = {
  left: 720, top: 0, width: 480, height: 300, maskX: 0, maskY: -30.09,
  aspect: 480 / 300,
};
export const MO_KV: PromoKvShape = {
  left: 340, top: 0, width: 362, height: 320, maskX: 0, maskY: -20.09,
  aspect: 362 / 320,
};

// Default crop framing (normalized view center + zoom) per orientation, so opening
// "Edit Crop" on the untouched default image resumes at the Figma default window.
export const PC_KV_DEFAULT_FRAMING = { bcx: 0.62026, bcy: 0.35434, zoom: 1.5604 };
export const MO_KV_DEFAULT_FRAMING = { bcx: 0.62617, bcy: 0.36145, zoom: 1.5546 };

/** Renders the (already window-aspect-cropped) KV image into its visible window,
 *  clipped by the wavy mask. Shared by PC + MO templates. */
export function PromoKvImage({ src, shape }: { src: string; shape: PromoKvShape }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: shape.left,
        top: shape.top,
        width: shape.width,
        height: shape.height,
        overflow: 'hidden',
        maskImage: `url('${PROMO_KV_MASK_URL}')`,
        WebkitMaskImage: `url('${PROMO_KV_MASK_URL}')`,
        maskSize: `${PROMO_MASK_W}px ${PROMO_MASK_H}px`,
        WebkitMaskSize: `${PROMO_MASK_W}px ${PROMO_MASK_H}px`,
        maskPosition: `${shape.maskX}px ${shape.maskY}px`,
        WebkitMaskPosition: `${shape.maskX}px ${shape.maskY}px`,
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        pointerEvents: 'none',
      }}
    >
      <img
        src={src}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none', display: 'block', userSelect: 'none' }}
        draggable={false}
      />
    </div>
  );
}

const ASSETS = '/id-banner/promotion-pc/';
const DEFAULT_PROMO_LOGO = ASSETS + 'promo-logo-default.png';
// Uncropped source (for re-crop) + the two pre-cropped shape-box fills that
// reproduce the Figma default window per orientation.
const DEFAULT_KV_ORIGINAL = ASSETS + 'kv-default.png';
const DEFAULT_KV_PC = ASSETS + 'kv-default-pc.png';
const DEFAULT_KV_MO = ASSETS + 'kv-default-mo.png';
const DEFAULT_COPY = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';

export interface IdBannerPromotionState {
  theme: IdBannerPromotionTheme;
  showLogos: boolean;
  promotionLogoUrl: string | null;
  headCopy: string;
  showSubCopy: boolean;
  subCopy: string;
  /** KV image, cropped per orientation — PC and MO show different regions of
   *  the source (their mask windows sit at different offsets), so each keeps
   *  its own crop and can be re-framed independently via the preview hotspot. */
  pcKvImage: string | null;
  moKvImage: string | null;
  /** Original, uncropped upload/fetch source — shared by both orientations so
   *  "Edit Crop" re-crops non-destructively from the full image (re-cropping the
   *  already-cropped output would feed react-easy-crop coordinates that don't
   *  match that image's pixel dimensions). Falls back to the cropped image if absent. */
  kvOriginal?: string | null;
  /** Last crop/zoom per orientation, so "Edit Crop" resumes instead of resetting. */
  pcKvCrop?: CropState;
  moKvCrop?: CropState;
  /** Output font. Lives in state so the draft saves, restores and dirty-tracks
   *  it for free (restoreIdBannerPromotion default-merges onto this shape). */
  fontId: BrandFontId;
}

export function makeIdBannerPromotionDefault(t: TFunction): IdBannerPromotionState {
  return {
    theme: 'light',
    showLogos: true,
    promotionLogoUrl: DEFAULT_PROMO_LOGO,
    headCopy: t(DEFAULT_COPY),
    showSubCopy: true,
    subCopy: t(DEFAULT_COPY),
    pcKvImage: DEFAULT_KV_PC,
    moKvImage: DEFAULT_KV_MO,
    kvOriginal: DEFAULT_KV_ORIGINAL,
    fontId: 'lg',
  };
}

interface Props {
  state: IdBannerPromotionState;
}

export function IdBannerPromotionPCTemplate({ state }: Props) {
  const tokens = PROMO_THEME_TOKENS[state.theme];
  const lgLogoSrc = state.theme === 'light' ? ASSETS + 'lg-logo-colored.svg' : ASSETS + 'lg-logo-fill.svg';
  return (
    <div
      style={{
        width: ID_BANNER_PROMOTION_PC_W,
        height: ID_BANNER_PROMOTION_PC_H,
        background: tokens.bg,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        fontFamily: 'var(--obs-font)',
      }}
    >
      {/* KV image — cropped fill inside the wavy shape box (PC position) */}
      {state.pcKvImage && <PromoKvImage src={state.pcKvImage} shape={PC_KV} />}

      {/* Info block: Logos + Head + Sub, left 400, w 280, vertically centered, items-start */}
      <div
        style={{
          position: 'absolute',
          left: 400,
          top: '50%',
          width: 280,
          height: 300,
          transform: 'translateY(-50%)',
          paddingTop: 30,
          paddingBottom: 30,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        {/* Logos row (toggle) — Figma exact: promo h:20, divider 1×22.4 @ 0.5 opacity, LG 54.48×24 */}
        {state.showLogos && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12.8, alignSelf: 'flex-start' }}>
            {state.promotionLogoUrl && (
              <img
                src={state.promotionLogoUrl}
                alt=""
                style={{ height: 20, width: 'auto', display: 'block', flexShrink: 0, userSelect: 'none', pointerEvents: 'none' }}
                draggable={false}
              />
            )}
            <div style={{ width: 1, height: 22.4, background: tokens.text, opacity: 0.5, flexShrink: 0 }} />
            <img
              src={lgLogoSrc}
              alt="LG"
              style={{ width: 54.48, height: 24, display: 'block', flexShrink: 0, userSelect: 'none', pointerEvents: 'none' }}
              draggable={false}
            />
          </div>
        )}

        {/* Head + Sub copy — gap:10, all text left-aligned */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, color: tokens.text, width: '100%' }}>
          {state.headCopy && (
            <p
              style={{
                margin: 0,
                fontSize: 30,
                // Resolved per brand and content language — see smallCopyWeight.
                fontWeight: 'var(--obs-w-head-sm, 400)',
                // Brand tracking. Missing here until now, so Lazada ran at 0 where
                // its face is drawn for −1% — and once the head stepped up to 600 it
                // had no room left and took a fourth line the other fonts did not.
                letterSpacing: 'var(--obs-tracking)',
                lineHeight: 1.08,
                textAlign: 'left',
                whiteSpace: 'pre-line',
                wordBreak: 'break-word',
                maxHeight: 128,
                overflow: 'hidden',
                // Descender headroom: brand faces use LG's descent metric, which is
                // shallower than their Thai marks need. Negative margin cancels the
                // padding so nothing below shifts.
                boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
              }}
            >
              {state.headCopy}
            </p>
          )}
          {state.showSubCopy && state.subCopy && (
            <p
              style={{
                margin: 0,
                fontSize: 20,
                // Resolved per brand and content language — see smallCopyWeight.
                // Figma sets the sub in LG EI Text, not Headline — the banner-level
                // family is the head's. Off-site splits the two the same way.
                fontFamily: 'var(--obs-font-text)',
                fontWeight: 'var(--obs-w-sub-sm, 300)',
                letterSpacing: 'var(--obs-tracking)',
                lineHeight: 1.1,
                textAlign: 'left',
                whiteSpace: 'pre-line',
                wordBreak: 'break-word',
                maxHeight: 44,
                overflow: 'hidden',
                // Descender headroom: brand faces use LG's descent metric, which is
                // shallower than their Thai marks need. Negative margin cancels the
                // padding so nothing below shifts.
                boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
              }}
            >
              {state.subCopy}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
