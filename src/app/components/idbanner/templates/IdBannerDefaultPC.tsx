/**
 * Default ID Banner — PC version (Lazada search results, 1200×300).
 * Frame: Figma 2468:48421. Background: Warm Gray 05 (#E6E1D6).
 *
 * Thailand fills the 5 slots with sales graphics from the shared theme-object
 * library rather than with product shots — same as the Official Store module
 * (see ModuleRenderer.tsx OFFICIAL_STORE_SLOTS). Every slot is a uniform
 * 180×180 box filled via object-fit:cover, so a picked graphic frames itself
 * identically wherever it sits.
 *
 * Figma draws slots 1 and 2 at 93.29% / 76% inside their boxes — the gift and
 * the bell carry less padding of their own and would otherwise out-weigh the
 * rest. That framing is baked into the shipped PNGs (which are therefore drawn
 * at a plain 100% here) and mirrored for a freshly picked asset by
 * ID_BANNER_SALES_GRAPHIC_ZOOM, so both routes land in the same place.
 */

import React from 'react';
import type { SalesGraphicZoomTable } from '../../brandshop/modules/editStates';

export const ID_BANNER_DEFAULT_PC_W = 1200;
export const ID_BANNER_DEFAULT_PC_H = 300;
const SLOT_BOX = 180;

const ASSETS = '/id-banner/default-pc/';

export const ID_BANNER_SALES_GRAPHIC_SLOTS = 5;

export const ID_BANNER_DEFAULT_PRODUCTS: string[] = [
  ASSETS + 'sales-graphic-1.png', // gift-bird
  ASSETS + 'sales-graphic-2.png', // sub-bell-right
  ASSETS + 'sales-graphic-3.png', // clover-side
  ASSETS + 'sales-graphic-4.png', // lgbox-gradient-side
  ASSETS + 'sales-graphic-5.png', // cartbag-blackred-side
];

/** See the note above: the crop window opens a freshly picked gift or bell at
 *  the size Figma draws it, so it does not read heavier than its neighbours. */
export const ID_BANNER_SALES_GRAPHIC_ZOOM: SalesGraphicZoomTable = [
  { match: /sub-bell/i, zoom: 0.76 },
  { match: /gift-/i, zoom: 0.9329 },
];

const SLOT_FRAMES: Array<{ left: number; top: number }> = [
  { left: 363, top: 104 },        // gift — left of slogan, low
  { left: 541.86, top: -83.96 },  // bell — left of slogan, high
  { left: 690.95, top: 222.07 },  // clover — below slogan
  { left: 876.91, top: -66.73 },  // Life's Good box — right of slogan, high
  { left: 1030, top: 118 },       // cart — right edge (Figma: right -10, bottom 2)
];

interface Props {
  productImages?: (string | null)[];
}

export function IdBannerDefaultPCTemplate({ productImages }: Props) {
  return (
    <div
      style={{
        width: ID_BANNER_DEFAULT_PC_W,
        height: ID_BANNER_DEFAULT_PC_H,
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
      {/* LG slogan — centered (offset +178 from horizontal center) */}
      <img
        src={ASSETS + 'lg-slogan.svg'}
        alt=""
        style={{
          position: 'absolute',
          left: 'calc(50% + 178px)',
          top: '50%',
          width: 445.41,
          height: 72.96,
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
