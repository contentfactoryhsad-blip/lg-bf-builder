import React from 'react';
import type { ThumbnailDefaultState } from './thumbnailTypes';

interface Props {
  state: ThumbnailDefaultState;
}

export function DefaultThumbnailTemplate({ state }: Props) {
  const { modelName, productImage } = state;
  const productImageUrl = productImage.url;
  const font = 'var(--obs-font)';

  return (
    <div
      style={{
        width: 1200,
        height: 1200,
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: font,
      }}
    >
      {/* ── Product image — 800×800, absolute, centered at (600px, 680px) ── */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          left: '50%',
          top: 'calc(50% + 80px)',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={productImageUrl ?? '/thumbnail/default-product-placeholder.png'}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      {/* ── Logo + Model name — absolute, top-0, full width ─────────────── */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1200,
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
          alignItems: 'center',
        }}
      >
        {/* Logo row: LG logo | divider | Official Store */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 76,
            width: '100%',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {/* Full LG logo: red circle + dark LG wordmark — 108.96×48px */}
          <img
            src="/thumbnail/lg-logo.svg"
            alt="LG"
            draggable={false}
            style={{ height: 48, width: 108.96, display: 'block', flexShrink: 0 }}
          />

          {/* Vertical divider */}
          <div style={{ width: 1, height: 40, background: '#CBC8C2', flexShrink: 0 }} />

          {/* "Official Store" — i18n will handle this in a future pass */}
          <span
            style={{
              fontSize: 44,
              fontWeight: 400, // Figma Semibold → CSS 400 per LGEI weight rule
              color: '#716F6A',
              letterSpacing: 'calc(-0.88px + var(--obs-tracking))',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Official Store
          </span>
        </div>

        {/* Model name chip + optional copy text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {/* Model name chip */}
          <div
            style={{
              background: '#F0ECE4',
              borderRadius: 16,
              height: 66,
              padding: '16px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
          >
            <p
              style={{
                fontSize: 28, letterSpacing: 'var(--obs-tracking)',
                fontWeight: 400, // Figma Semibold → CSS 400 per LGEI weight rule
                color: '#4A4946',
                lineHeight: 1.2,
                maxHeight: 34,
                maxWidth: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                margin: 0,
                // Descender headroom: brand faces use LG's descent metric, which is
                // shallower than their Thai marks need. Negative margin cancels the
                // padding so nothing below shifts.
                boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
              }}
            >
              {modelName || 'OLED65G56LS'}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
