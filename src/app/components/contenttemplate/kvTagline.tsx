/**
 * "Only at LG.com" — the endorsement that sits on the KV lockup.
 *
 * Shared by both preview paths because the visual spec is one spec: the LG.com
 * boards and the paid-media boards place it at the same optical spot on the same
 * lockup, and only the surrounding layout differs.
 *
 * 🔴 Every ratio is a fraction of the ARTWORK SQUARE, never of the frame. The
 * line rides the lockup, and each banner size reframes the art differently — an
 * anchor on the frame walks it off the logo as soon as the crop changes.
 *
 * The operator types the two runs (see `SlotCopy.taglineLead` / `taglineBrand`),
 * so this draws live text rather than relying on art with the line burnt in.
 * Artwork that does bake it in must not be given a ratio row anywhere, or the
 * two print on top of each other.
 */
import React from 'react';

/** Where the line sits on the artwork square, and how big it is. */
export interface TaglineRatios {
  x: number;
  y: number;
  size: number;
  /** Figma's own line-height on the same scale — only used to re-centre line 1. */
  figmaLineHeight: number;
  /** Width of Figma's text box. Only used to find its centre. */
  w: number;
}

/** The artwork square in frame pixels, as both slot tables record it. */
export interface ArtBox { x: number; y: number; size: number }

export interface TaglineSpec {
  /** Left edge of Figma's own box — kept for reference. */
  x: number;
  /** Centre of that box. The line is centred here and grows both ways. */
  cx: number;
  y: number;
  size: number;
  lineHeight: number;
  /** Ready-made CSS `text-shadow`, so it tracks the glyphs as Figma's does. */
  shadow: string;
}

/**
 * Figma leaves the line-height at ~70% of the font size, which is fine for the
 * single line it draws and far too tight once the operator breaks the lead.
 * 110% is what every other LG.com text spec uses.
 */
const LINE_HEIGHT_PCT = 110;

/**
 * The boards shadow the line so it holds over the busy part of the lockup.
 * Every value is a multiple of the font size, and all three KV families agree to
 * five decimals — so it is one ratio, not a per-size table.
 */
const SHADOW = { x: 0.076793, y: 0.153586, blur: 0.127989, alpha: 0.6 } as const;

/** Frame-space geometry for the line on this artwork placement. */
export function taglineSpec(art: ArtBox, r: TaglineRatios): TaglineSpec {
  const size = r.size * art.size;
  const lineHeight = size * (LINE_HEIGHT_PCT / 100);
  // The extra leading is split above and below the line box, so pull the box up
  // by half of it — the FIRST line then sits exactly where Figma has it and only
  // a second one adds height.
  const lead = (lineHeight - r.figmaLineHeight * art.size) / 2;
  return {
    x: art.x + r.x * art.size,
    cx: art.x + (r.x + r.w / 2) * art.size,
    y: art.y + r.y * art.size - lead,
    size,
    lineHeight,
    shadow: `${(SHADOW.x * size).toFixed(3)}px ${(SHADOW.y * size).toFixed(3)}px `
      + `${(SHADOW.blur * size).toFixed(3)}px rgba(0,0,0,${SHADOW.alpha})`,
  };
}

/**
 * Artwork stems ship in two cuts: the delivered one with the line burnt in, and
 * a clean one without. Live text needs the clean cut or the two double-print.
 *
 * 🔴 `kv-product-slot001*` is the re-arted board-001 cut; its clean counterpart
 * is named for the older `kv-product-slot` stem. Verified by comparing pixels
 * outside the tagline band (0.03 vs 1.32 against a genuinely different cut).
 */
const CLEAN_ART: Record<string, string> = {
  'kv-main': 'kv-main-clean',
  'kv-main-character': 'kv-main-character-clean',
  'kv-product-centric-1': 'kv-product-centric-1-clean',
  'kv-product-centric-2': 'kv-product-centric-2-clean',
  'kv-product-slot001': 'kv-product-slot-clean',
  'kv-product-slot001-character': 'kv-product-slot-character-clean',
  'kv-product-slot': 'kv-product-slot-clean',
  'kv-product-slot-character': 'kv-product-slot-character-clean',
  'kv-product-slot2': 'kv-product-slot2-clean',
  'kv-product-slot2-character': 'kv-product-slot2-character-clean',
};

/** The cut without the line burnt in, or the stem unchanged when there is none. */
export const cleanArtId = (stem: string) => CLEAN_ART[stem] ?? stem;

/**
 * The line itself: two runs on one line, Regular then Bold, centred on the
 * lockup so a longer localisation grows both ways instead of drifting off it.
 */
export function KvTagline({ spec, ink, lead, brand }: {
  spec: TaglineSpec;
  ink: string;
  lead: string;
  brand: string;
}) {
  return (
    <p
      style={{
        position: 'absolute',
        left: spec.cx,
        transform: 'translateX(-50%)',
        top: spec.y,
        margin: 0,
        fontFamily: 'var(--obs-font)',
        fontSize: spec.size,
        lineHeight: `${spec.lineHeight}px`,
        letterSpacing: 0,
        color: ink,
        textShadow: spec.shadow,
        textAlign: 'center',
        // `pre`, not `pre-line` — honour the operator's own break and never
        // re-wrap on the small sizes, where the box is shrink-wrapped
        whiteSpace: 'pre',
      }}
    >
      {/* Figma sets Regular + Bold, but LGEI's static TTFs render heavier than
          Figma's variable font, so Bold comes out ~5% too inky. Measured against
          the board's own render (ink coverage over the lockup box): 400/700 =
          0.2877, 400/600 = 0.2673, Figma 0.2731 — Semibold is the closest. */}
      <span style={{ fontWeight: 400 }}>{lead}</span>
      {lead && brand && !/\s$/.test(lead) ? ' ' : ''}
      <span style={{ fontWeight: 600 }}>{brand}</span>
    </p>
  );
}
