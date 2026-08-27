import { useT } from '../../i18n/LanguageContext';
import React from 'react';
import type { ThumbnailBundleState } from './thumbnailTypes';
import type { Orientation } from './thumbnailRegistry';

const FONT = 'var(--obs-font)';

function LogoRow() {
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', paddingTop: 76, width: '100%', flexShrink: 0 }}>
      <img src="/thumbnail/lg-logo.svg" alt="LG" draggable={false} style={{ height: 48, width: 108.96, display: 'block', flexShrink: 0 }} />
      <div style={{ width: 1, height: 40, background: '#CBC8C2', flexShrink: 0 }} />
      <span style={{ fontSize: 44, fontWeight: 400, color: '#716F6A', letterSpacing: 'calc(-0.88px + var(--obs-tracking))', lineHeight: 1.1, whiteSpace: 'nowrap', flexShrink: 0 }}>Official Store</span>
    </div>
  );
}

// Small plus icon (12.46×12.46) used between model names in chip
function SmallPlusSvg() {
  return (
    <svg width={12.46} height={12.46} viewBox="0 0 12.46 12.46" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M0 4.844H4.844V0H7.644V4.844H12.46V7.644H7.644V12.46H4.844V7.644H0V4.844Z" fill="#4A4946" />
    </svg>
  );
}

// Large plus icon (72×72) between products — dark circle, white plus, no ring
function BundlePlusSvg() {
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <rect width="72" height="72" rx="36" fill="#4A4946" />
      <path d="M56.8232 40.0194H40.4552V56H31.4479V40.0194H15.1768V31.4964H31.4479V16H40.4552V31.4964H56.8232V40.0194Z" fill="white" />
    </svg>
  );
}

function BundleChip({ modelName1, modelName2 }: { modelName1: string; modelName2: string }) {
  const t = useT();
  const name1 = modelName1 || 'FDC309W';
  const name2 = modelName2 || 'F4Y913BCTA1';
  return (
    <div style={{ display: 'flex', borderRadius: 16, height: 66, overflow: 'hidden', flexShrink: 0 }}>
      {/* Black left: "Bundle Deal" */}
      <div style={{ background: '#262626', padding: '16px 32px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#FFFFFF', whiteSpace: 'nowrap', lineHeight: 1.2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis',
          // Descender headroom: brand faces use LG's descent metric, which is
          // shallower than their Thai marks need. Negative margin cancels the
          // padding so nothing below shifts.
          boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
        }}>
          {t('Bundle Deal')}
        </p>
      </div>
      {/* Beige right: model1 + small+ + model2 */}
      <div style={{ background: '#F0ECE4', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#4A4946', whiteSpace: 'nowrap', lineHeight: 1.2, maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis',
          // Descender headroom: brand faces use LG's descent metric, which is
          // shallower than their Thai marks need. Negative margin cancels the
          // padding so nothing below shifts.
          boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
        }}>
          {name1}
        </p>
        <SmallPlusSvg />
        <p style={{ margin: 0, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#4A4946', whiteSpace: 'nowrap', lineHeight: 1.2, maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis',
          // Descender headroom: brand faces use LG's descent metric, which is
          // shallower than their Thai marks need. Negative margin cancels the
          // padding so nothing below shifts.
          boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
        }}>
          {name2}
        </p>
      </div>
    </div>
  );
}

export function BundleThumbnailTemplate({ state, orientation }: { state: ThumbnailBundleState; orientation: Orientation }) {
  const isH = orientation === 'horizontal';

  if (isH) {
    return (
      <div style={{ width: 1200, height: 1200, background: '#ffffff', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
        {/* Header */}
        <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 1200, display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }}>
          <LogoRow />
          <BundleChip modelName1={state.modelName1} modelName2={state.modelName2} />
        </div>
        {/* Products: TV → plus → soundbar (vertical stack, Figma node 2546:52073) */}
        <div style={{
          position: 'absolute', left: 70, top: 300, width: 1060, height: 800,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40,
        }}>
          {/* TV — fixed 450 tall (Figma node 2418:43649) */}
          <div style={{ height: 450, width: '100%', flexShrink: 0, position: 'relative' }}>
            <img
              src={state.product1Image.url ?? '/thumbnail/default-product-placeholder.png'}
              alt="" draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <BundlePlusSvg />
          {/* Soundbar — h-180, full width (Figma node 2418:43578) */}
          <div style={{ height: 180, width: '100%', flexShrink: 0, position: 'relative' }}>
            <img
              src={state.product2Image.url ?? '/thumbnail/placeholder-soundbar.png'}
              alt="" draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Vertical: washer left + plus + dryer right
  return (
    <div style={{ width: 1200, height: 1200, background: '#ffffff', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      {/* Header */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }}>
        <LogoRow />
        <BundleChip modelName1={state.modelName1} modelName2={state.modelName2} />
      </div>
      {/* Products: washer left, dryer right — bottom-aligned (bottom: 120) */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 120, transform: 'translateX(-50%)',
        width: 1200, height: 800, padding: '0 70px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 30,
      }}>
        {/* Washer — full 454×800 slot */}
        <div style={{ width: 454, height: 800, flexShrink: 0, position: 'relative' }}>
          <img
            src={state.product1Image.url ?? '/thumbnail/placeholder-washer.png'}
            alt="" draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
        <BundlePlusSvg />
        {/* Dryer — full 454×800 slot */}
        <div style={{ width: 454, height: 800, flexShrink: 0, position: 'relative' }}>
          <img
            src={state.product2Image.url ?? '/thumbnail/placeholder-dryer.png'}
            alt="" draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}
