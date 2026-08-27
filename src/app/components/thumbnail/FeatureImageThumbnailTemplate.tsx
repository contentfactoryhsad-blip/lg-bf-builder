import React from 'react';
import type { ThumbnailFeatureImageState } from './thumbnailTypes';

const FONT = 'var(--obs-font)';

export function FeatureImageThumbnailTemplate({ state }: { state: ThumbnailFeatureImageState }) {
  return (
    <div style={{ width: 1200, height: 1200, position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      {/* Full-bleed background image covers entire canvas */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <img
          src={state.featureImage.url ?? '/thumbnail/feature-image-bg.png'}
          alt=""
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      {/* Logo + model chip overlaid on top of image */}
      <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 1200, display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', paddingTop: 76, width: '100%', flexShrink: 0 }}>
          <img src="/thumbnail/lg-logo.svg" alt="LG" draggable={false} style={{ height: 48, width: 108.96, display: 'block', flexShrink: 0 }} />
          <div style={{ width: 1, height: 40, background: '#CBC8C2', flexShrink: 0 }} />
          <span style={{ fontSize: 44, fontWeight: 400, color: '#716F6A', letterSpacing: 'calc(-0.88px + var(--obs-tracking))', lineHeight: 1.1, whiteSpace: 'nowrap', flexShrink: 0 }}>Official Store</span>
        </div>
        <div style={{ background: '#F0ECE4', borderRadius: 16, height: 66, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
          <p style={{ margin: 0, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#4A4946', lineHeight: 1.2, maxHeight: 34, maxWidth: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}>
            {state.modelName || 'OLED65G56LS'}
          </p>
        </div>
      </div>
    </div>
  );
}
