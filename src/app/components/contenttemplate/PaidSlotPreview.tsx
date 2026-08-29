/**
 * Renders one paid-media banner at its true pixel size, then scales the whole
 * thing down to fit the canvas column — the same trick as `LgcomSlotPreview`,
 * so every number in `paidSlots.ts` stays exactly as Figma reports it.
 *
 * The layer order matches the Figma frame: black plate → artwork (soft-masked)
 * → LG logo → copy → CTA → product plates. The plates sit on top because that is
 * where the `slot` frame sits on the PD Slot boards.
 */
import React from 'react';
import { artUrl, type ContentAsset } from './contentTemplateAssets';
import { type SlotCopy } from './SlotCopyEditor';
import { CTA_COLOR, SLOT_BG } from './lgcomSlots';
import { PAID_PLACEHOLDER, paidSlotLabel, type PaidMask, type PaidSlot, type PaidText } from './paidSlots';
import { PD_PLATE_FILL, paidPlacementFor } from './paidBoards';
import { type ProductSlots } from './ProductSlotsEditor';

/** Figma reports tracking as a % of font size; CSS wants an em value. */
const tracking = (pct: number) => `${pct / 100}em`;

/**
 * The Figma mask is a white gradient whose alpha decides where the art shows.
 * A CSS mask reads the same way, so the stops transfer unchanged.
 */
const maskCss = (m: PaidMask) =>
  `linear-gradient(${m.angle}deg, ${m.stops
    .map(([pos, a]) => `rgba(255,255,255,${a}) ${(pos * 100).toFixed(1)}%`)
    .join(', ')})`;

function Line({ spec, text }: { spec: PaidText; text: string }) {
  return (
    <p
      style={{
        position: 'absolute',
        left: spec.x,
        top: spec.y,
        width: spec.w,
        margin: 0,
        fontFamily: spec.face === 'headline' ? 'var(--obs-font)' : 'var(--obs-font-text)',
        fontWeight: spec.face === 'headline' ? 600 : 400,
        fontSize: spec.size,
        // Figma leaves some of these on AUTO; `normal` is the browser's own AUTO.
        lineHeight: spec.lineHeightPct === null ? 'normal' : `${spec.lineHeightPct}%`,
        letterSpacing: tracking(spec.trackingPct),
        textAlign: spec.align,
        color: '#fff',
        whiteSpace: 'pre-line',
      }}
    >
      {text}
    </p>
  );
}

export function PaidSlotPreview({
  slot,
  asset,
  scale,
  copy,
  products,
  plateColor = PD_PLATE_FILL,
}: {
  slot: PaidSlot;
  /** Which artwork this tile stands for. */
  asset: ContentAsset;
  scale: number;
  copy: SlotCopy;
  /** One product per plate on the PD Slot key visuals; empty plates stay bare. */
  products?: ProductSlots;
  /** Fill behind the plates — the Figma value unless the operator changes it. */
  plateColor?: string;
}) {
  /**
   * Key visuals with a board of their own bring their own artwork framing, their
   * own soft edge and — on the PD Slot boards — their own plates. Everything else
   * uses the Key Visual _Main placement recorded on the slot itself.
   */
  const pd = paidPlacementFor(asset.id, slot.key);
  const art = pd ? pd.art : slot.art;
  // those boards switch the soft edge off at most sizes, so the mask travels
  // with the placement rather than with the size
  const mask = pd ? pd.mask : slot.mask;
  const artSrc = pd?.artId ?? asset.src ?? asset.id;
  const ctaLabel = copy.cta.trim() || PAID_PLACEHOLDER.cta;
  const ctaSpec = slot.text.find(s => s.role === 'cta');

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-700">{paidSlotLabel(slot)}</p>

      {/* Outer box reserves the scaled footprint; the inner box is full size. */}
      <div
        data-export-box
        className="relative overflow-hidden rounded"
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
          {/* The mask covers the frame, not the art, so it is applied to a
              frame-sized wrapper — matching how Figma masks the whole layer. */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              ...(mask
                ? { maskImage: maskCss(mask), WebkitMaskImage: maskCss(mask) }
                : null),
            }}
          >
            <img
              src={artUrl(artSrc)}
              alt={asset.label}
              style={{
                position: 'absolute',
                left: art.x,
                top: art.y,
                width: art.size,
                height: art.size,
                // the art is routinely wider than its frame; without this the base
                // stylesheet's `img{max-width:100%}` squashes it
                maxWidth: 'none',
              }}
              draggable={false}
            />
          </div>

          {slot.logo && (
            <div
              style={{
                position: 'absolute',
                left: slot.logo.x,
                top: slot.logo.y,
                width: slot.logo.w,
                height: slot.logo.h,
              }}
            >
              <img
                src="/off-site/lg-logo-white.svg"
                alt="LG"
                style={{ width: '100%', height: '100%', objectFit: 'contain', maxWidth: 'none' }}
                draggable={false}
              />
            </div>
          )}

          {slot.text
            .filter(s => s.role !== 'cta')
            .map(spec => {
              const typed = copy[spec.role].trim();
              return <Line key={spec.role} spec={spec} text={typed || PAID_PLACEHOLDER[spec.role]} />;
            })}

          {slot.cta && (
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
                fontSize: ctaSpec ? ctaSpec.size : Math.round(slot.cta.h * 0.38),
                color: '#fff',
                whiteSpace: 'nowrap',
              }}
            >
              {ctaLabel}
            </div>
          )}

          {pd?.plates?.map((plate, i) => {
              const product = products?.[i]?.image ?? null;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: plate.x,
                    top: plate.y,
                    width: plate.w,
                    height: plate.h,
                    borderRadius: plate.r,
                    background: plateColor,
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
        </div>
      </div>
    </div>
  );
}
