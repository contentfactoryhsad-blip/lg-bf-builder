import React from 'react';
import type { ThumbnailFeatureTextState } from './thumbnailTypes';

const FONT = 'var(--obs-font)';
const FONT_TEXT = 'var(--obs-font-text)';

export function FeatureTextThumbnailTemplate({ state }: { state: ThumbnailFeatureTextState }) {
  const count = state.bulletCount ?? 6;
  const bullets = state.bulletPoints.slice(0, count);

  return (
    <div style={{ width: 1200, height: 1200, background: '#F6F3EB', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      {/* Logo row — absolute at top */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 1200, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', paddingTop: 76, flexShrink: 0 }}>
        <img src="/thumbnail/lg-logo.svg" alt="LG" draggable={false} style={{ height: 48, width: 108.96, display: 'block', flexShrink: 0 }} />
        <div style={{ width: 1, height: 40, background: '#CBC8C2', flexShrink: 0 }} />
        <span style={{ fontSize: 44, fontWeight: 400, color: '#716F6A', letterSpacing: 'calc(-0.88px + var(--obs-tracking))', lineHeight: 1.1, whiteSpace: 'nowrap', flexShrink: 0 }}>Official Store</span>
      </div>
      {/* Title + bullet list — pt 206, pb 160, px 102, gap 60 */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 1200, height: 1200,
        padding: '206px 102px 160px',
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 60,
      }}>
        <p style={{ margin: 0, fontSize: 56, fontWeight: 600, color: '#000000', letterSpacing: 'calc(-1.12px + var(--obs-tracking-head))', lineHeight: 1.1, textAlign: 'center', width: '100%', flexShrink: 0 }}>
          {state.headingText || 'Delivery & Installation Guide'}
        </p>
        <ul style={{ margin: 0, paddingLeft: 52.5, display: 'flex', flexDirection: 'column', gap: 30, listStyleType: 'disc', width: '100%', flexShrink: 0 }}>
          {bullets.map((bp, i) => (
            <li key={i} style={{ fontSize: 35, fontWeight: 400, color: '#000000', letterSpacing: 'calc(-0.7px + var(--obs-tracking))', lineHeight: 1.2, fontFamily: FONT_TEXT }}>{bp}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
