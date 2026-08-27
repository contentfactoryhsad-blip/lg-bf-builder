import { useT } from '../../i18n/LanguageContext';
import React from 'react';
import type { ThumbnailGwpState } from './thumbnailTypes';
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

function ModelChip({ modelName }: { modelName: string }) {
  return (
    <div style={{ background: '#F0ECE4', borderRadius: 16, height: 66, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
      <p style={{ margin: 0, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#4A4946', lineHeight: 1.2, maxHeight: 34, maxWidth: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
        // Descender headroom: brand faces use LG's descent metric, which is
        // shallower than their Thai marks need. Negative margin cancels the
        // padding so nothing below shifts.
        boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
      }}>
        {modelName || 'GSLV80PZXF'}
      </p>
    </div>
  );
}

// Dark circle with white ring + white plus (66.67×66.67 — Figma "+" frame is 50×50 but the ring overflows it by 16.67% each side)
function GwpPlusSvg() {
  return (
    <svg width={66.6667} height={66.6667} viewBox="0 0 66.6667 66.6667" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <rect x="4.16667" y="4.16667" width="58.3333" height="58.3333" rx="29.1667" fill="#4A4946" />
      <rect x="4.16667" y="4.16667" width="58.3333" height="58.3333" rx="29.1667" stroke="white" strokeWidth="8.33333" />
      <path d="M47.7939 36.1246H36.4272V47.2222H30.1722V36.1246H18.8727V30.2058H30.1722V19.4444H36.4272V30.2058H47.7939V36.1246Z" fill="white" />
    </svg>
  );
}

export function GiftCard({ giftImage, freeGiftText, giftName, giftModelName, showGiftModelName, copyWidth, paddingY, plusSide }: {
  giftImage: string | null;
  freeGiftText: string;
  giftName: string;
  giftModelName: string;
  showGiftModelName: boolean;
  copyWidth: 180 | 320;
  paddingY: 30 | 60;
  plusSide: 'top' | 'left';
}) {
  const t = useT();
  const maxHTitle = plusSide === 'top' ? 44 : 88;
  const maxHName = plusSide === 'top' ? 72 : 144;
  const maxHModel = plusSide === 'top' ? 34 : 68;
  const defaultGiftImage = plusSide === 'top' ? '/thumbnail/gwp-gift-remote-controller.png' : null;
  const defaultName = plusSide === 'top' ? 'Remote Controller' : 'Replacement Water Filter';
  const defaultModel = plusSide === 'top' ? 'A9385028U' : 'ADQ74793513';

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        border: '2px solid #716F6A', borderRadius: 24,
        padding: `${paddingY}px 40px`,
        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 30,
        background: 'white', boxSizing: 'border-box',
      }}>
        {/* Gift image 180×180 */}
        <div style={{ width: 180, height: 180, flexShrink: 0 }}>
          <img
            src={giftImage ?? defaultGiftImage ?? '/thumbnail/placeholder-gift.png'}
            alt="" draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
        {/* Text column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: copyWidth, alignSelf: 'stretch', justifyContent: 'center' }}>
          <p style={{ margin: 0, fontSize: 40, fontWeight: 600, color: '#4A4946', lineHeight: 1.1, letterSpacing: 'calc(-0.4px + var(--obs-tracking))', maxHeight: maxHTitle, overflow: 'hidden', textOverflow: 'ellipsis', width: '100%',
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}>
            {freeGiftText || t('Free Gift')}
          </p>
          <p style={{ margin: 0, fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#4A4946', lineHeight: 1.2, maxHeight: maxHName, overflow: 'hidden', textOverflow: 'ellipsis', width: '100%',
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}>
            {giftName || defaultName}
          </p>
          {showGiftModelName && (
            <p style={{ margin: 0, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#716F6A', lineHeight: 1.2, ...(maxHModel ? { maxHeight: maxHModel } : {}), overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              {giftModelName || defaultModel}
            </p>
          )}
        </div>
      </div>
      {/* Plus icon — centered on the card's top border for H, left border for V */}
      {plusSide === 'top' && (
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)' }}>
          <GwpPlusSvg />
        </div>
      )}
      {plusSide === 'left' && (
        <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%, -50%)' }}>
          <GwpPlusSvg />
        </div>
      )}
    </div>
  );
}

export function GwpThumbnailTemplate({ state, orientation }: { state: ThumbnailGwpState; orientation: Orientation }) {
  const isH = orientation === 'horizontal';

  if (isH) {
    return (
      <div style={{ width: 1200, height: 1200, background: '#ffffff', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
        {/* Header */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }}>
          <LogoRow />
          <ModelChip modelName={state.modelName} />
        </div>
        {/* Content: vertical stack — TV on top, gift card below (Figma node 1992:12843) */}
        <div style={{
          position: 'absolute', left: '50%', top: 300, transform: 'translateX(-50%)',
          width: 1200, height: 800, padding: '0 70px', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 100,
        }}>
          {/* Product image — fixed 450 tall (Figma node 2418:43974) */}
          <div style={{ height: 450, width: '100%', flexShrink: 0, position: 'relative' }}>
            <img
              src={state.productImage.url ?? '/thumbnail/default-product-placeholder.png'}
              alt="" draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          {/* Gift card (plus appears at top) */}
          <GiftCard
            giftImage={state.giftImage.url}
            freeGiftText={state.freeGiftText}
            giftName={state.giftName}
            giftModelName={state.giftModelName}
            showGiftModelName={state.showGiftModelName}
            copyWidth={320}
            paddingY={30}
            plusSide="top"
          />
        </div>
      </div>
    );
  }

  // Vertical: fridge on left, gift card on right
  return (
    <div style={{ width: 1200, height: 1200, background: '#ffffff', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      {/* Header */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }}>
        <LogoRow />
        <ModelChip modelName={state.modelName} />
      </div>
      {/* Content: horizontal — fridge left, gift card right */}
      <div style={{
        position: 'absolute', left: '50%', top: 280, transform: 'translateX(-50%)',
        width: 1200, height: 800, padding: '0 70px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 80,
      }}>
        {/* Fridge — flex-1 fills remaining horizontal space, 800px tall (Figma node 2418:44700) */}
        <div style={{ flex: '1 0 0', height: 800, minWidth: 0, position: 'relative' }}>
          <img
            src={state.productImage.url ?? '/thumbnail/placeholder-fridge.png'}
            alt="" draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
        {/* Gift card (plus appears on left edge) */}
        <GiftCard
          giftImage={state.giftImage.url}
          freeGiftText={state.freeGiftText}
          giftName={state.giftName}
          giftModelName={state.giftModelName}
          showGiftModelName={state.showGiftModelName}
          copyWidth={180}
          paddingY={60}
          plusSide="left"
        />
      </div>
    </div>
  );
}
