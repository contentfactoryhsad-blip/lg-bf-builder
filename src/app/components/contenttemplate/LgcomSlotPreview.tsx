/**
 * Renders one LG.com banner slot at its true pixel size, then scales the whole
 * thing down to fit the canvas column.
 *
 * Everything inside is laid out in the slot's own coordinate space (1920×720
 * and friends) and a single CSS `scale` shrinks it, so every number in
 * `lgcomSlots.ts` can stay exactly as Figma reports it — no per-size maths, and
 * the art placement stays honest at any display width.
 *
 * `scale` is supplied by the caller and shared across every slot, so the sizes
 * stay in proportion to each other the way they do on the Figma board. Scaling
 * each slot to fill the column instead would make a 720px mobile banner look
 * wider than a 1920px desktop one.
 */
import React from 'react';
import { useT } from '../../i18n/LanguageContext';
import { artUrl, fullUrl, motionUrl, type ContentAsset } from './contentTemplateAssets';
import { COPY_PLACEHOLDER, type SlotCopy } from './SlotCopyEditor';
import type { ProductSlots } from './ProductSlotsEditor';
import {
  CTA_COLOR,
  iconRowStyle,
  overlayUrl,
  type IconRowStyle,
  type SlotLayers,
  SLOT_BG,
  artFor,
  gradCss,
  gradFor,
  slotBoxesFor,
  slotLabel,
  type LgcomSlot,
  type SlotText,
} from './lgcomSlots';

/** Figma reports tracking as a % of font size; CSS wants an em value. */
const tracking = (pct: number) => `${pct / 100}em`;

function SlotLine({ spec, text }: { spec: SlotText; text: string }) {
  const type = {
    margin: 0,
    fontFamily: spec.face === 'headline' ? 'var(--obs-font)' : 'var(--obs-font-text)',
    fontWeight: spec.weight,
    fontSize: spec.size,
    lineHeight: `${spec.lineHeightPct}%`,
    letterSpacing: tracking(spec.trackingPct),
    textAlign: spec.align,
    color: '#fff',
    whiteSpace: 'pre-line' as const,
  };

  // Figma gives the disclaimer a fixed box and bottom-aligns the copy in it.
  if (spec.h && spec.vAlign === 'bottom') {
    return (
      <div
        style={{
          position: 'absolute',
          left: spec.x,
          top: spec.y,
          width: spec.w,
          height: spec.h,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <p style={{ ...type, width: '100%' }}>{text}</p>
      </div>
    );
  }

  return (
    <p style={{ position: 'absolute', left: spec.x, top: spec.y, width: spec.w, ...type }}>
      {text}
    </p>
  );
}

export function LgcomSlotPreview({
  slot,
  asset,
  scale,
  copy,
  products,
  layers,
  iconStyle,
}: {
  slot: LgcomSlot;
  asset: ContentAsset | undefined;
  scale: number;
  /** Shared copy set; blank fields fall back to the Figma placeholder. */
  copy: SlotCopy;
  /** One product per plate on the PD Slot key visuals; empty plates stay bare. */
  products?: ProductSlots;
  /**
   * Which optional elements to draw. Only the two hero sizes honour this —
   * they are the ones actually shipped as background + icons, so they are the
   * ones the operator strips down. The other four sizes are confirmation
   * mock-ups and always render everything.
   */
  layers: SlotLayers;
  iconStyle: IconRowStyle;
}) {
  const t = useT();
  // the hero sizes are exactly the ones carrying an indicator
  const toggleable = !!slot.indicator;
  const on = (k: keyof SlotLayers) => !toggleable || layers[k];
  // placement is per asset per size — the 15 key visuals are framed differently
  const art = asset ? artFor(asset.id, slot.id) : null;
  // the motion cut is the same square frame as the still, so it takes the same box
  const motion = asset && slot.hero ? motionUrl(asset) : null;
  // the scrim is tuned per asset too — deal-type objects need a wider one
  const grad = asset ? gradFor(asset.id, slot.id) : undefined;
  // the plates live in the artwork, so they ride the same square as the art does
  const plates = asset && art ? slotBoxesFor(asset.id, slot.id) : [];
  // this size may call for the asset's other artwork — see Placement.src
  const stillUrl = asset ? (art?.src ? artUrl(art.src) : fullUrl(asset)) : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-700">
        {slotLabel(slot)}
        {motion && <span className="text-gray-500"> · Motion</span>}
      </p>

      {/* Outer box reserves the scaled footprint; the inner box is full size. */}
      <div
        className="relative overflow-hidden rounded-lg"
        style={{ width: slot.w * scale, height: slot.h * scale, background: SLOT_BG }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: slot.w,
            height: slot.h,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {asset && art && (
            motion ? (
              <video
                key={motion}
                src={motion}
                poster={stillUrl!}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  position: 'absolute',
                  left: art.x,
                  top: art.y,
                  width: art.size,
                  height: art.size,
                  maxWidth: 'none',
                }}
              />
            ) : (
              <img
                // the uncropped 3000px frame — placement here is Figma's, not a crop
                src={stillUrl!}
                alt={asset.label}
                style={{
                  position: 'absolute',
                  left: art.x,
                  top: art.y,
                  width: art.size,
                  height: art.size,
                  // the art is routinely wider than its frame (720x960 places it at
                  // 1731px); without this the base stylesheet's `img{max-width:100%}`
                  // clamps it to the frame and squashes it
                  maxWidth: 'none',
                }}
                draggable={false}
              />
            )
          )}

          {art && plates.map((box, i) => {
            const S = art.size;
            const product = products?.[i]?.image ?? null;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: art.x + box.x * S,
                  top: art.y + box.y * S,
                  width: box.w * S,
                  height: box.h * S,
                  borderRadius: box.r * S,
                  overflow: 'hidden',
                }}
              >
                {product && (
                  <img
                    src={product}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain', maxWidth: 'none' }}
                    draggable={false}
                  />
                )}
              </div>
            );
          })}

          {grad && (
            <div
              style={{
                position: 'absolute',
                left: grad.x,
                top: grad.y,
                width: grad.w,
                height: grad.h,
                background: gradCss(grad),
              }}
            />
          )}

          {on('iconRow') && slot.iconRow && (
            <img
              src={overlayUrl(iconRowStyle(iconStyle).file)}
              alt=""
              style={{
                position: 'absolute',
                left: slot.iconRow.x,
                top: slot.iconRow.y,
                width: slot.iconRow.w,
                height: slot.iconRow.h,
                maxWidth: 'none',
              }}
              draggable={false}
            />
          )}

          {slot.text.filter(spec => on(spec.role)).map(spec => {
            const typed = copy[spec.role].trim();
            return <SlotLine key={spec.role} spec={spec} text={typed || COPY_PLACEHOLDER[spec.role]} />;
          })}

          {on('cta') && (
          <div
            style={{
              position: 'absolute',
              left: slot.cta.x,
              top: slot.cta.y,
              width: slot.cta.w,
              height: slot.cta.h,
              borderRadius: slot.cta.radius,
              background: CTA_COLOR,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--obs-font-text)',
              fontSize: slot.cta.size,
              color: '#fff',
              whiteSpace: 'nowrap',
            }}
          >
            {copy.cta.trim() || t(slot.cta.label)}
          </div>
          )}

          {on('indicator') && slot.indicator && (
            <img
              // topmost, matching Figma: the indicator is the layout's last child
              src={overlayUrl(slot.indicator)}
              alt=""
              style={{ position: 'absolute', inset: 0, width: slot.w, height: slot.h, maxWidth: 'none' }}
              draggable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
