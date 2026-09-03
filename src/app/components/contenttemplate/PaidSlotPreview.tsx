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
import { CTA_COLOR, SHORT_DISCLAIMER, SLOT_BG, disclaimerMaxChars, longDisclaimer } from './lgcomSlots';
import { PAID_PLACEHOLDER, paidSlotLabel, type PaidMask, type PaidSlot, type PaidText } from './paidSlots';
import { AD_BENEFIT_BOXES, PD_PLATE_FILL, paidPlacementFor } from './paidBoards';
import { BENEFIT_ASSETS, type BenefitSlots } from './BenefitSlotsEditor';
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

function Line({ spec, text, slotH, dy = 0, pRef }: {
  spec: PaidText;
  text: string;
  slotH?: number;
  /** How far the Figma auto-layout pulls this line up (see `pullUp`). */
  dy?: number;
  pRef?: React.Ref<HTMLParagraphElement>;
}) {
  return (
    <p
      ref={pRef}
      style={{
        position: 'absolute',
        left: spec.x,
        // the disclaimer is bottom-anchored so extra lines grow upward
        ...(spec.role === 'disclaimer' && slotH != null
          ? { bottom: slotH - (spec.y + spec.h) }
          : { top: spec.y - dy }),
        width: spec.w,
        margin: 0,
        fontFamily: spec.face === 'headline' ? 'var(--obs-font)' : 'var(--obs-font-text)',
        fontWeight: spec.face === 'headline' ? 600 : 400,
        fontSize: spec.size,
        // Figma leaves some of these on AUTO; `normal` is the browser's own AUTO.
        lineHeight: spec.lineHeightPct === null ? 'normal' : `${spec.lineHeightPct}%`,
        letterSpacing: tracking(spec.trackingPct),
        textAlign: spec.align,
        // the disclaimer reads at 50% strength across the builder (2026-09-03)
        color: spec.role === 'disclaimer' ? 'rgba(255,255,255,0.5)' : '#fff',
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
  showDisclaimer = true,
  benefitSlots,
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
  /** Panel toggle — off drops the disclaimer from every size. */
  showDisclaimer?: boolean;
  /** The Benefit cube's six boxes — product cut-outs / picked assets. */
  benefitSlots?: BenefitSlots;
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

  // Figma stacks headline → (subcopy) → CTA in a vertical auto-layout, so when
  // the typed copy takes fewer lines than the design box everything below pulls
  // up by the difference (and pushes down when it takes more). We measure the
  // rendered flow texts and shift only layers that start BELOW a flow text's
  // design box — a CTA sitting beside the copy never moves. The disclaimer is
  // anchored to the frame bottom in Figma, so it never moves either.
  const flowRef = React.useRef<Record<string, HTMLParagraphElement | null>>({});
  const [flowH, setFlowH] = React.useState<Record<string, number>>({});
  React.useLayoutEffect(() => {
    const measure = () => {
      const next: Record<string, number> = {};
      for (const [role, el] of Object.entries(flowRef.current)) {
        if (el) next[role] = el.offsetHeight;
      }
      setFlowH(prev =>
        Object.keys(next).length === Object.keys(prev).length &&
        Object.entries(next).every(([k, v]) => prev[k] === v)
          ? prev
          : next,
      );
    };
    measure();
    // fonts land after mount and reflow the text without a React render — the
    // observer catches that (and any other silent resize) and re-measures
    const ro = new ResizeObserver(measure);
    for (const el of Object.values(flowRef.current)) if (el) ro.observe(el);
    return () => ro.disconnect();
  });
  const flowSpecs = slot.text.filter(s => s.role === 'headline' || s.role === 'subcopy');
  const pullUp = (y: number) =>
    flowSpecs.reduce((acc, s) => {
      const h = flowH[s.role];
      return h != null && y >= s.y + s.h - 1 ? acc + (s.h - h) : acc;
    }, 0);

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
            {/* Benefit boxes ride the art's transform (component 2000-space) */}
            {benefitSlots && benefitSlots.map((bs, i) => {
              const isAsset = !bs.image && !!bs.assetId;
              const src = bs.image ?? BENEFIT_ASSETS.find(a2 => a2.id === bs.assetId)?.src ?? null;
              if (!src) return null;
              const S = art.size / AD_BENEFIT_BOXES.base;
              const [bx, by] = AD_BENEFIT_BOXES.xy[i];
              // picked assets sit at 70% of the box so they breathe like the
              // reference cube faces; product cut-outs keep the full box
              const k = isAsset ? 0.7 : 1;
              const w = AD_BENEFIT_BOXES.w * S, h = AD_BENEFIT_BOXES.h * S;
              return (
                <img
                  key={i}
                  src={src}
                  alt=""
                  style={{
                    position: 'absolute',
                    left: art.x + bx * S + (w - w * k) / 2,
                    top: art.y + by * S + (h - h * k) / 2,
                    width: w * k,
                    height: h * k,
                    objectFit: 'contain',
                    maxWidth: 'none',
                  }}
                  draggable={false}
                />
              );
            })}
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
              if (spec.role === 'disclaimer' && !showDisclaimer) return null;
              // small sizes lock the disclaimer to the short version
              if (spec.role === 'disclaimer' && !longDisclaimer(slot.w, slot.h)) {
                return <Line key={spec.role} spec={spec} text={SHORT_DISCLAIMER} slotH={slot.h} />;
              }
              let typed = copy[spec.role].trim();
              if (spec.role === 'disclaimer') typed = typed.slice(0, disclaimerMaxChars());
              const flows = spec.role === 'headline' || spec.role === 'subcopy';
              return (
                <Line
                  key={spec.role}
                  spec={spec}
                  text={typed || PAID_PLACEHOLDER[spec.role]}
                  slotH={slot.h}
                  dy={pullUp(spec.y)}
                  pRef={flows ? el => { flowRef.current[spec.role] = el; } : undefined}
                />
              );
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
                top: slot.cta.y - pullUp(slot.cta.y),
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
