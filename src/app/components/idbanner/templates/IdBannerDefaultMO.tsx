/**
 * Default ID Banner — MO version (Lazada mobile, 702×320).
 * Frame: Figma 2468:48447. Background: Warm Gray 05 (#E6E1D6).
 *
 * Same uniform-box, object-fit:cover strategy as the PC template — see
 * IdBannerDefaultPC.tsx. Box size is 158.944 (Figma). Sales graphics are shared
 * with PC (same square source files, same state), so the pre-baked framing of
 * the gift and the bell carries over untouched; only the LG slogan SVG differs
 * (smaller, and dead-centred rather than offset).
 */

import React from 'react';
import { ID_BANNER_DEFAULT_PRODUCTS } from './IdBannerDefaultPC';

export const ID_BANNER_DEFAULT_MO_W = 702;
export const ID_BANNER_DEFAULT_MO_H = 320;
const SLOT_BOX = 158.944;

const ASSETS = '/id-banner/default-mo/';

const SLOT_FRAMES: Array<{ left: number; top: number }> = [
  { left: -29.51, top: 115.19 },  // gift — left edge, low
  { left: 147.08, top: -55.91 },  // bell — left of slogan, high
  { left: 274.72, top: 224.33 },  // clover — below slogan
  { left: 431.94, top: -39.69 },  // Life's Good box — right of slogan, high
  { left: 560.29, top: 134.2 },   // cart — right edge (Figma: right -17.23, bottom 26.86)
];

interface Props {
  productImages?: (string | null)[];
}

export function IdBannerDefaultMOTemplate({ productImages }: Props) {
  return (
    <div
      style={{
        width: ID_BANNER_DEFAULT_MO_W,
        height: ID_BANNER_DEFAULT_MO_H,
        background: '#E6E1D6',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {SLOT_FRAMES.map((frame, i) => {
        const src = productImages?.[i] ?? ID_BANNER_DEFAULT_PRODUCTS[i];
        return (
          <div
            key={i}
            style={{ position: 'absolute', left: frame.left, top: frame.top, width: SLOT_BOX, height: SLOT_BOX, overflow: 'hidden' }}
          >
            {src && (
              <img
                src={src}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                draggable={false}
              />
            )}
          </div>
        );
      })}
      {/* LG slogan — dead-centred, smaller than PC */}
      <img
        src={ASSETS + 'lg-slogan.svg'}
        alt=""
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 393.305,
          height: 64.425,
          transform: 'translate(-50%, -50%)',
          display: 'block',
          maxWidth: 'none',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
        draggable={false}
      />
    </div>
  );
}
