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
import { CTA_COLOR, SHORT_DISCLAIMER, SLOT_BG, longDisclaimer } from './lgcomSlots';
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

function Line({ spec, text, slotH }: { spec: PaidText; text: string; slotH?: number }) {
  return (
    <p
      style={{
        position: 'absolute',
        left: spec.x,
        // the disclaimer is bottom-anchored so extra lines grow upward
        ...(spec.role === 'disclaimer' && slotH != null
          ? { bottom: slotH - (spec.y + spec.h) }
          : { top: spec.y }),
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
  hideArt = false,
  motionSrc = null,
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
  /**
   * Copy layers only — no artwork, transparent ground. The Dynamic mp4 export
   * rasterises this and composites it over the video cut.
   */
  hideArt?: boolean;
  /** Play the motion master in the art box instead of the still — Dynamic sizes. */
  motionSrc?: string | null;
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
        style={{ width: slot.w * scale, height: slot.h * scale, background: hideArt ? 'transparent' : SLOT_BG }}
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
            {!hideArt && motionSrc && (
              <video
                key={motionSrc}
                src={motionSrc}
                poster={artUrl(artSrc)}
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
                  objectFit: 'cover',
                }}
              />
            )}
            {!hideArt && !motionSrc && (
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
            )}
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
              // small sizes lock the disclaimer to the short version
              if (spec.role === 'disclaimer' && !longDisclaimer(slot.w, slot.h)) {
                return <Line key={spec.role} spec={spec} text={SHORT_DISCLAIMER} slotH={slot.h} />;
              }
              const typed = copy[spec.role].trim();
              return <Line key={spec.role} spec={spec} text={typed || PAID_PLACEHOLDER[spec.role]} slotH={slot.h} />;
            })}

          {slot.cta && (
            /* The pill hugs its label past the design width. Centred layouts
               grow from the middle (the design box's centre), left layouts from
               their left edge — matching how the copy above them is anchored. */
            <div
              style={{
                position: 'absolute',
                left: slot.text.find(t2 => t2.role === 'headline')?.align === 'center'
                  ? slot.cta.x + slot.cta.w / 2
                  : slot.cta.x,
                top: slot.cta.y,
                minWidth: slot.cta.w,
                width: 'fit-content',
                padding: `0 ${Math.round(slot.cta.h * 0.46)}px`,
                boxSizing: 'border-box',
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
                transform: slot.text.find(t2 => t2.role === 'headline')?.align === 'center'
                  ? 'translateX(-50%)'
                  : undefined,
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
