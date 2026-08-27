/**
 * Promotion ID Banner — MO version (Lazada mobile, 702×320).
 * Frame: Figma 2468:48616 (Light) / 2468:48618 (Dark). Same redesign as PC —
 * see IdBannerPromotionPC.tsx file doc for the mask/theme system.
 *
 * Layout (Figma):
 *   - KV image masked into the same organic shape as PC, at left:340 top:-30.09.
 *   - Info block at left:30.14, w:280, h:320, py:30, vertical center
 *     - Logos row / Head / Sub copy — identical structure and sizing to PC.
 */

import React from 'react';
import { IdBannerPromotionState, PROMO_THEME_TOKENS, PromoKvImage, MO_KV } from './IdBannerPromotionPC';

export const ID_BANNER_PROMOTION_MO_W = 702;
export const ID_BANNER_PROMOTION_MO_H = 320;

const ASSETS = '/id-banner/promotion-mo/';

interface Props {
  state: IdBannerPromotionState;
}

export function IdBannerPromotionMOTemplate({ state }: Props) {
  const tokens = PROMO_THEME_TOKENS[state.theme];
  const lgLogoSrc = state.theme === 'light' ? ASSETS + 'lg-logo-colored.svg' : ASSETS + 'lg-logo-fill.svg';
  return (
    <div
      style={{
        width: ID_BANNER_PROMOTION_MO_W,
        height: ID_BANNER_PROMOTION_MO_H,
        background: tokens.bg,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        fontFamily: 'var(--obs-font)',
      }}
    >
      {/* KV image — cropped fill inside the wavy shape box (MO position) */}
      {state.moKvImage && <PromoKvImage src={state.moKvImage} shape={MO_KV} />}

      {/* Info block: left:30.14, w:280, h:320, py:30, vertically centered, items-start */}
      <div
        style={{
          position: 'absolute',
          left: 30.14,
          top: '50%',
          width: 280,
          height: 320,
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
        {/* Logos row (toggle) */}
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

        {/* Head + Sub copy — gap:10 */}
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
