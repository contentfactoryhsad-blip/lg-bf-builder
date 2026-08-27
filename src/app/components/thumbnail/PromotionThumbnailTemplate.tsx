import React from 'react';
import type { ThumbnailPromotionState, ThumbnailVoucherItem } from './thumbnailTypes';

const FONT = 'var(--obs-font)';

// Ticket-shaped card background (360×165, white on beige, notch cutouts on left/right)
function TicketBackground() {
  return (
    <svg
      width={360} height={165} viewBox="0 0 360 165" fill="none"
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'block' }}
    >
      <path
        d="M348 0C354.627 0.000196725 360 5.3727 360 12V62.5C348.954 62.5 340 71.4543 340 82.5C340 93.5457 348.954 102.5 360 102.5V153C360 159.627 354.627 165 348 165H12C5.37258 165 0 159.627 0 153V102.5C11.0457 102.5 20 93.5457 20 82.5C20 71.4543 11.0457 62.5 0 62.5V12C0 5.37258 5.37258 2.64139e-07 12 0H348Z"
        fill="white"
      />
    </svg>
  );
}

function VoucherCard({ voucher }: { voucher: ThumbnailVoucherItem }) {
  const { title, value, subCopy, subCopyPosition } = voucher;
  // Per-field show/hide (undefined = shown, for drafts saved before the
  // toggles existed). Hiding the title removes its block entirely, so the
  // benefit row — flex:1 inside the fixed-height ticket — auto-centres.
  const showTitle = voucher.showTitle !== false;
  const hasSubCopy = voucher.showSubCopy !== false && subCopy.trim().length > 0;
  const hasValue = voucher.showValue !== false && value.trim().length > 0;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <TicketBackground />
      {/* Content overlay — same size as ticket */}
      <div style={{
        width: 360, height: 165,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px 30px', boxSizing: 'border-box', position: 'relative',
      }}>
        {/* Title — Figma Bold → CSS 600, Figma w-full = 300px, single line with ellipsis */}
        {showTitle && (
          <div style={{ flexShrink: 0, width: '100%', overflow: 'hidden' }}>
            <p style={{ margin: 0, fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, color: '#262626', lineHeight: 1.18, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              // Descender headroom: brand faces use LG's descent metric, which is
              // shallower than their Thai marks need. Negative margin cancels the
              // padding so nothing below shifts.
              boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
            }}>
              {title || 'Voucher'}
            </p>
          </div>
        )}
        {/* Benefit row — outer flex centers the inner group; inner group sizes to content width */}
        <div style={{
          flex: '1 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', minHeight: 0, overflow: 'hidden',
        }}>
          {/* Inner group: no explicit width → shrinks to combined text width → centered by parent */}
          <div style={{
            display: 'flex', flexDirection: 'row', alignItems: 'center',
            gap: 10, maxWidth: 300, overflow: 'hidden',
          }}>
            {hasSubCopy && subCopyPosition === 'left' && (
              <div style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>
                <p style={{
                  margin: 0,
                  fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#4A4946', lineHeight: 0.9,
                  textAlign: hasValue ? 'right' : 'center', wordBreak: 'break-word',
                  display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  // Descender headroom: brand faces use LG's descent metric, which is
                  // shallower than their Thai marks need. Negative margin cancels the
                  // padding so nothing below shifts.
                  boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                }}>
                  {subCopy}
                </p>
              </div>
            )}
            {hasValue && (
              <div style={{ flexShrink: 0, overflow: 'hidden', maxHeight: 90 }}>
                <p style={{ margin: 0, fontSize: 80, letterSpacing: 'var(--obs-tracking)', fontWeight: 600, color: '#262626', lineHeight: 1.1, textAlign: 'center', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                  // Descender headroom: brand faces use LG's descent metric, which is
                  // shallower than their Thai marks need. Negative margin cancels the
                  // padding so nothing below shifts.
                  boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                }}>
                  {value}
                </p>
              </div>
            )}
            {hasSubCopy && subCopyPosition === 'right' && (
              <div style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>
                <p style={{
                  margin: 0,
                  fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#4A4946', lineHeight: 0.9,
                  textAlign: hasValue ? 'left' : 'center', wordBreak: 'break-word',
                  display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  // Descender headroom: brand faces use LG's descent metric, which is
                  // shallower than their Thai marks need. Negative margin cancels the
                  // padding so nothing below shifts.
                  boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
                }}>
                  {subCopy}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PromotionThumbnailTemplate({ state }: { state: ThumbnailPromotionState }) {
  const activeVouchers = state.vouchers.slice(0, state.voucherCount);

  return (
    <div style={{ width: 1200, height: 1200, background: '#ffffff', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      {/* ── Left column header (760px wide) ── */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 760, display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }}>
        {/* Logo row */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', paddingTop: 76, width: '100%', flexShrink: 0 }}>
          <img src="/thumbnail/lg-logo.svg" alt="LG" draggable={false} style={{ height: 48, width: 108.96, display: 'block', flexShrink: 0 }} />
          <div style={{ width: 1, height: 40, background: '#CBC8C2', flexShrink: 0 }} />
          <span style={{ fontSize: 44, fontWeight: 400, color: '#716F6A', letterSpacing: 'calc(-0.88px + var(--obs-tracking))', lineHeight: 1.1, whiteSpace: 'nowrap', flexShrink: 0 }}>Official Store</span>
        </div>
        {/* Model chip */}
        <div style={{ background: '#F0ECE4', borderRadius: 16, height: 66, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
          <p style={{ margin: 0, fontSize: 28, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: '#4A4946', lineHeight: 1.2, maxHeight: 34, maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
            // Descender headroom: brand faces use LG's descent metric, which is
            // shallower than their Thai marks need. Negative margin cancels the
            // padding so nothing below shifts.
            boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
          }}>
            {state.modelName || 'OLED65G56LS'}
          </p>
        </div>
      </div>

      {/* ── Product image — 660×800 frame, object-contain (Figma node 2429:45542) ── */}
      <div style={{
        position: 'absolute', left: 50, top: 280,
        width: 660, height: 800,
      }}>
        <img
          src={state.productImage.url ?? '/thumbnail/default-product-placeholder.png'}
          alt="" draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>

      {/* ── Right column (440px: 40px pad + 360px content + 40px pad) ── */}
      <div style={{
        position: 'absolute', right: 0, top: 0, height: 1200,
        background: '#F0ECE4',
        padding: '50px 40px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30,
      }}>
        {/* Promotion image 360×260 — user image or Figma KV default (2 layers) */}
        <div style={{ width: 360, height: 260, borderRadius: 20, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
          <img
            src={state.promotionImage.url ?? '/thumbnail/promotion-kv.png'}
            alt="" draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* Date range bar */}
        {state.dateRange && (
          <div style={{
            width: 360, background: '#4A4946', borderRadius: 12,
            padding: '18px 20px', boxSizing: 'border-box', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <p style={{
              margin: 0, fontSize: 30, letterSpacing: 'var(--obs-tracking)', fontWeight: 400, color: 'white',
              lineHeight: 1.2, width: '100%',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textAlign: 'center',
              // Descender headroom: brand faces use LG's descent metric, which is
              // shallower than their Thai marks need. Negative margin cancels the
              // padding so nothing below shifts.
              boxSizing: 'content-box', paddingTop: '0.24em', marginTop: '-0.24em', paddingBottom: '0.2em', marginBottom: '-0.2em',
            }}>
              {state.dateRange}
            </p>
          </div>
        )}

        {/* Voucher list — top-aligned per Figma (no justify-center) */}
        <div style={{
          flex: '1 0 0', minHeight: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
          gap: 16, width: '100%',
        }}>
          {activeVouchers.map((v) => (
            <VoucherCard key={v.id} voucher={v} />
          ))}
        </div>
      </div>
    </div>
  );
}
