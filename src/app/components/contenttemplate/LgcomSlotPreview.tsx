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
import { PD_PLATE_FILL } from './paidBoards';
import { IconRowInline } from './icons/IconRowInline';
import {
  SHORT_DISCLAIMER,
  disclaimerMaxChars,
  lgcomDisclaimerEditable,
  CTA_COLOR,
  overlayUrl,
  type IconRowStyle,
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

function SlotLine({ spec, text, slotH, dy = 0, pRef }: {
  spec: SlotText;
  text: string;
  slotH?: number;
  /** How far the Figma auto-layout pulls this line up (see `pullUp`). */
  dy?: number;
  pRef?: React.Ref<HTMLParagraphElement>;
}) {
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
  // Anchoring by the bottom edge (not a fixed-height flex box) lets a long
  // disclaimer grow upward instead of spilling past the frame.
  if (spec.h && spec.vAlign === 'bottom') {
    return (
      <p
        style={{
          ...type,
          position: 'absolute',
          left: spec.x,
          width: spec.w,
          ...(spec.maxLines
            ? {
                maxHeight: Math.ceil(spec.size * (spec.lineHeightPct / 100) * spec.maxLines),
                overflow: 'hidden',
              }
            : null),
          ...(slotH != null
            ? { bottom: slotH - (spec.y + spec.h) }
            : { top: spec.y }),
        }}
      >
        {text}
      </p>
    );
  }

  return (
    <p ref={pRef} style={{ position: 'absolute', left: spec.x, top: spec.y - dy, width: spec.w, ...type }}>
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
  plateColor = PD_PLATE_FILL,
  showIconRow,
  iconStyle,
  iconIds,
  iconLabels,
  showDisclaimer = true,
  showIndicator = true,
  bare = false,
}: {
  slot: LgcomSlot;
  asset: ContentAsset | undefined;
  scale: number;
  /** Shared copy set; blank fields fall back to the Figma placeholder. */
  copy: SlotCopy;
  /** One product per plate on the PD Slot key visuals; empty plates stay bare. */
  products?: ProductSlots;
  /**
   * Fill painted over the plates baked into the PD Slot artwork. `SLOT_BOXES`
   * was measured off those baked plates, so the paint sits exactly on top of
   * them — which is what lets the colour change at all on LG.com, where the
   * plate is part of the image.
   */
  plateColor?: string;
  /**
   * Whether to draw the benefit icons. Only the two hero sizes carry an
   * `iconRow` box, so the other four ignore this. Every other element is part
   * of the layout and always renders.
   */
  showIconRow: boolean;
  iconStyle: IconRowStyle;
  /** Which benefit each group shows, already cut to the chosen count. */
  iconIds: string[];
  /** Caption overrides aligned with `iconIds`; null falls back to the registry. */
  iconLabels?: (string | null)[];
  /** Panel toggle — off drops the disclaimer from every size. */
  showDisclaimer?: boolean;
  /** Panel toggle — off drops the carousel indicator from the two hero sizes. */
  showIndicator?: boolean;
  /**
   * Artwork and benefit icons only — no eyebrow, headline, subcopy, CTA,
   * disclaimer or carousel indicator. The two ST0001 hero placements ship this
   * way: the copy is set live on LG.com, so baking it into the delivered image
   * would double it up. Every other size ships exactly as it previews.
   */
  bare?: boolean;
}) {
  const t = useT();
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

  // Figma stacks headline → subcopy → CTA in a vertical auto-layout. The four
  // ST0001 sizes top-pack it (primary=MIN), so shorter copy pulls everything
  // below it up by the difference against the Figma box height. The two ST0044
  // sizes bottom-pack (primary=MAX) — their headline is bottom-anchored via
  // `vAlign` instead and the CTA never moves, so they are excluded here.
  const flowRef = React.useRef<Record<string, HTMLParagraphElement | null>>({});
  const [flowH, setFlowH] = React.useState<Record<string, number>>({});
  React.useLayoutEffect(() => {
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
  });
  const flowSpecs = slot.text.filter(
    s => (s.role === 'headline' || s.role === 'subcopy') && s.h != null && s.vAlign !== 'bottom',
  );
  const pullUp = (y: number) =>
    flowSpecs.reduce((acc, s) => {
      const h = flowH[s.role];
      return h != null && y >= s.y + (s.h ?? 0) - 1 ? acc + ((s.h ?? 0) - h) : acc;
    }, 0);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-700">
        {slotLabel(slot)}
        {motion && <span className="text-gray-500"> · Motion</span>}
      </p>

      {/* Outer box reserves the scaled footprint; the inner box is full size. */}
      <div
        data-export-box
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

          {showIconRow && slot.iconRow && (
            <IconRowInline box={slot.iconRow} style={iconStyle} iconIds={iconIds} labels={iconLabels} />
          )}

          {!bare && slot.text.map(spec => {
            if (spec.role === 'disclaimer' && !showDisclaimer) return null;
            // small sizes lock the disclaimer to the short version
            if (spec.role === 'disclaimer' && !lgcomDisclaimerEditable(slot)) {
              return <SlotLine key={spec.role} spec={spec} text={SHORT_DISCLAIMER} slotH={slot.h} />;
            }
            let typed = copy[spec.role].trim();
            if (spec.role === 'disclaimer') typed = typed.slice(0, disclaimerMaxChars(slot.id));
            const flows = flowSpecs.some(fs => fs.role === spec.role);
            return (
              <SlotLine
                key={spec.role}
                spec={spec}
                text={typed || COPY_PLACEHOLDER[spec.role]}
                slotH={slot.h}
                dy={pullUp(spec.y)}
                pRef={flows ? el => { flowRef.current[spec.role] = el; } : undefined}
              />
            );
          })}

          {!bare && (
            <div
              style={{
                position: 'absolute',
                /* The two ST0044 placements centre their copy, so a growing
                   pill grows from its middle; the four left-anchored layouts
                   keep their left edge and grow rightward. */
                left: slot.code === 'ST0044' ? slot.cta.x + slot.cta.w / 2 : slot.cta.x,
                top: slot.cta.y - pullUp(slot.cta.y),
                transform: slot.code === 'ST0044' ? 'translateX(-50%)' : undefined,
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
                fontSize: slot.cta.size,
                color: '#fff',
                whiteSpace: 'nowrap',
              }}
            >
              {copy.cta.trim() || t(slot.cta.label)}
            </div>
          )}

          {!bare && showIndicator && slot.indicator && (
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
