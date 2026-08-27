import React from 'react';
import type { ThumbnailGalleryFeatureState } from './thumbnailTypes';

const FONT = 'var(--obs-font)';
const FONT_TEXT = 'var(--obs-font-text)';

export function GalleryFeatureThumbnailTemplate({ state }: { state: ThumbnailGalleryFeatureState }) {
  return (
    <div style={{ width: 1200, height: 1200, background: '#ffffff', overflow: 'hidden', fontFamily: FONT, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 90, boxSizing: 'border-box' }}>
      {/* Text block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 56, fontWeight: 600, color: '#000000', letterSpacing: 'calc(-1.12px + var(--obs-tracking-head))', lineHeight: 1.1, maxHeight: 124, overflow: 'hidden',
          // Descender headroom: brand faces use LG's descent metric, which is
          // shallower than their Thai marks need. Negative margin cancels the
          // padding so nothing below shifts.
          boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
        }}>
          {state.headingText || 'Upgraded for smarter, more powerful processing'}
        </p>
        {state.bodyText !== '' && (
          <p style={{ margin: 0, fontSize: 35, fontWeight: 400, color: '#000000', letterSpacing: 'calc(-0.7px + var(--obs-tracking))', lineHeight: 1.2, maxHeight: 126, overflow: 'hidden', fontFamily: FONT_TEXT,
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}>
            {state.bodyText ?? 'The alpha 7 AI Processor performs sophisticated image optimization to deliver 4K clarity with improved contrast and depth.'}
          </p>
        )}
      </div>
      {/* Feature image — fixed 698px height */}
      <div style={{ height: 698, borderRadius: 15, overflow: 'hidden', flexShrink: 0 }}>
        <img
          src={state.featureImage.url ?? '/thumbnail/feature-gallery-chip.png'}
          alt=""
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    </div>
  );
}
