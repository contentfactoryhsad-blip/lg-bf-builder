import React, { useEffect, useRef, useState } from 'react';
import type { OtherPromoLifestyleState } from '../templates/OtherPromoLifestyleTemplate';

/* ─────────────────────────────────────────────────────────────────────────────
 * Store Page Modules — Banner "Lifestyle ver." (revised Figma layout)
 *
 * Figma node 2147:3540. Unlike the live Other Promotions lifestyle (organic
 * blob mask + blurred backdrop), the revised layout masks the photo into a
 * simple 500×548 rounded rectangle (radius 30) sitting in the same right-side
 * box as the product image section, over a warm-gray #F6F3EB banner with black
 * copy. Image coords in `state` are BOX-RELATIVE (0,0 = box top-left).
 * ──────────────────────────────────────────────────────────────────────────── */

const FONT = 'var(--obs-font)';

export const BANNER_LS_BOX = { left: 660, top: 40, width: 500, height: 548, radius: 30 };

/** Clamp the masked image so it always fully covers the box (no bg bleed).
 *  Min size = box; smaller-than-box scales up uniformly (aspect preserved). */
export function clampBannerLifestyle(s: OtherPromoLifestyleState): OtherPromoLifestyleState {
  let { imageX, imageY, imageWidth, imageHeight } = s;
  const fix = Math.max(BANNER_LS_BOX.width / imageWidth, BANNER_LS_BOX.height / imageHeight, 1);
  if (fix > 1) {
    imageWidth *= fix;
    imageHeight *= fix;
  }
  const minX = BANNER_LS_BOX.width - imageWidth;   // ≤ 0
  const minY = BANNER_LS_BOX.height - imageHeight; // ≤ 0
  imageX = Math.max(minX, Math.min(0, imageX));
  imageY = Math.max(minY, Math.min(0, imageY));
  return { ...s, imageX, imageY, imageWidth, imageHeight };
}

/** Box-relative placement for a freshly set image — box size × zoom, centered,
 *  giving drag room on each axis. */
export function bannerLifestylePlacement(zoom = 1.15): Pick<
  OtherPromoLifestyleState,
  'imageX' | 'imageY' | 'imageWidth' | 'imageHeight'
> {
  const w = BANNER_LS_BOX.width * zoom;
  const h = BANNER_LS_BOX.height * zoom;
  return {
    imageWidth: w,
    imageHeight: h,
    imageX: (BANNER_LS_BOX.width - w) / 2,
    imageY: (BANNER_LS_BOX.height - h) / 2,
  };
}

interface TemplateProps {
  state: OtherPromoLifestyleState;
  imageOverlay?: React.ReactNode;
  hideText?: boolean;
}

export function BannerLifestyleTemplate({ state, imageOverlay, hideText }: TemplateProps) {
  return (
    <div
      style={{
        width: 1200,
        height: 628,
        position: 'relative',
        overflow: 'visible',
        background: '#F6F3EB',
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* Left column — head + sub + CTA (black copy) */}
        {!hideText && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 600,
              height: 628,
              paddingLeft: 40,
              paddingTop: 40,
              paddingBottom: 40,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 40,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 60, letterSpacing: 'var(--obs-tracking-head)',
                  fontWeight: 600,
                  lineHeight: 1.12,
                  color: '#000000',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {state.headCopy}
              </p>
              {state.showSubCopy && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 30, letterSpacing: 'var(--obs-tracking)',
                    fontWeight: 300,
                    lineHeight: 1.1,
                    color: '#000000',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {state.subCopy}
                </p>
              )}
            </div>
            <div
              style={{
                background: '#FD312E',
                borderRadius: 15,
                height: 73,
                paddingLeft: 32,
                paddingRight: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 32, letterSpacing: 'var(--obs-tracking)',
                  fontWeight: 300,
                  lineHeight: 1.2,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                }}
              >
                {state.ctaText}
              </span>
            </div>
          </div>
        )}

        {!hideText && state.showDisclaimer && (
          <div style={{ position: 'absolute', bottom: 40, left: 40, width: 561 }}>
            <p
              style={{
                margin: 0,
                fontSize: 18, letterSpacing: 'var(--obs-tracking)',
                fontWeight: 300,
                lineHeight: 1.1,
                color: '#000000',
                opacity: 0.8,
              }}
            >
              {state.disclaimerText}
            </p>
          </div>
        )}

        {/* Right image box — 500×548 rounded rect, cover image (box-relative coords) */}
        <div
          style={{
            position: 'absolute',
            left: BANNER_LS_BOX.left,
            top: BANNER_LS_BOX.top,
            width: BANNER_LS_BOX.width,
            height: BANNER_LS_BOX.height,
            borderRadius: BANNER_LS_BOX.radius,
            overflow: 'hidden',
            background: '#D1CDC4',
          }}
        >
          {state.imageSrc && (
            <img
              src={state.imageSrc}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: state.imageX,
                top: state.imageY,
                width: state.imageWidth,
                height: state.imageHeight,
                objectFit: 'cover',
                maxWidth: 'none',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          )}
        </div>
      </div>

      {imageOverlay}
    </div>
  );
}

interface OverlayProps {
  state: OtherPromoLifestyleState;
  previewScale: number;
  onChange: (s: OtherPromoLifestyleState) => void;
}

/** Drag to move + wheel to zoom (horizontal swipe pans). Hit area = the rounded
 *  box only. Mirrors the validated shape-image pan/zoom UX. */
export function BannerLifestyleOverlay({ state, previewScale, onChange }: OverlayProps) {
  const hitRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = hitRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const s = stateRef.current;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        onChangeRef.current(clampBannerLifestyle({ ...s, imageX: s.imageX - e.deltaX }));
        return;
      }
      const factor = e.deltaY > 0 ? 0.985 : 1.015;
      const newW = s.imageWidth * factor;
      const newH = s.imageHeight * factor;
      const cx = s.imageX + s.imageWidth / 2;
      const cy = s.imageY + s.imageHeight / 2;
      onChangeRef.current(clampBannerLifestyle({
        ...s,
        imageWidth: newW,
        imageHeight: newH,
        imageX: cx - newW / 2,
        imageY: cy - newH / 2,
      }));
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function startDrag(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startImgX = state.imageX;
    const startImgY = state.imageY;
    function onMove(ev: PointerEvent) {
      const dx = (ev.clientX - startX) / previewScale;
      const dy = (ev.clientY - startY) / previewScale;
      onChangeRef.current(clampBannerLifestyle({
        ...stateRef.current,
        imageX: startImgX + dx,
        imageY: startImgY + dy,
      }));
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  if (!state.imageSrc) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div
        ref={hitRef}
        onPointerDown={startDrag}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'absolute',
          left: BANNER_LS_BOX.left,
          top: BANNER_LS_BOX.top,
          width: BANNER_LS_BOX.width,
          height: BANNER_LS_BOX.height,
          borderRadius: BANNER_LS_BOX.radius,
          cursor: dragging ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
        }}
      />
      {hovered && !dragging && (
        <div
          style={{
            position: 'absolute',
            left: BANNER_LS_BOX.left + BANNER_LS_BOX.width / 2,
            top: BANNER_LS_BOX.top + BANNER_LS_BOX.height / 2,
            transform: 'translate(-50%, -50%)',
            padding: `${6 / previewScale}px ${14 / previewScale}px`,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: 13 / previewScale,
            lineHeight: `${18 / previewScale}px`,
            borderRadius: 999,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontWeight: 500,
            boxShadow: `0 ${2 / previewScale}px ${8 / previewScale}px rgba(0,0,0,0.3)`,
          }}
        >
          Drag or scroll to adjust
        </div>
      )}
    </div>
  );
}
