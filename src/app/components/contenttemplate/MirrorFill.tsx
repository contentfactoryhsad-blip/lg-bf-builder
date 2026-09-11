/**
 * Mirror-stretch fill for the custom upload — the banner-automation plugin's
 * "Color Expand" (9-slice mirror stretch), drawn onto a canvas so it renders
 * live and exports through the same html-to-image pass as everything else.
 *
 * Wherever the art square leaves frame uncovered, a thin edge strip of the
 * image (INSET_FRAC of its height/width) is flipped outward and stretched to
 * fill the gap; corners flip both ways. Flipping is what keeps the seam
 * invisible: the pixel touching the art edge is the art edge.
 * (A true 1:1 reflection pass was tried and rejected — 2026-09-11 — mirrored
 * content in the gap reads as a duplicated image, not an extension.)
 *
 * 🔴 Must stay canvas-based. The first version rendered each strip as an
 * <img> blown up to gap/INSET_FRAC px (tens of thousands of px) — on Retina
 * (DPR 2) that exceeds the GPU texture limit (16384) and the strips silently
 * don't paint, leaving only the flat sampled ground. drawImage with a source
 * rect never creates an oversized surface.
 *
 * Sits under the artwork, over the sampled ground color (which stays as the
 * base for anything the strips cannot reach).
 */
import React, { useEffect, useRef } from 'react';

/** Edge strip thickness, as a fraction of the source square (30px of 3000). */
const INSET_FRAC = 0.01;

interface Art { x: number; y: number; size: number }

export function MirrorFill({ src, art, w, h }: { src: string; art: Art; w: number; h: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  const gapT = Math.max(0, art.y);
  const gapB = Math.max(0, h - (art.y + art.size));
  const gapL = Math.max(0, art.x);
  const gapR = Math.max(0, w - (art.x + art.size));
  const hasGap = gapT > 0 || gapB > 0 || gapL > 0 || gapR > 0;

  useEffect(() => {
    if (!hasGap) return;
    const canvas = ref.current;
    if (!canvas) return;
    let dead = false;
    const img = new Image();
    img.onload = () => {
      if (dead) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const fx = Math.max(1, Math.round(nw * INSET_FRAC));
      const fy = Math.max(1, Math.round(nh * INSET_FRAC));
      // overlap the strips 2px under the art so subpixel rounding between the
      // canvas and the art <img> never shows the ground as a hairline seam
      const OV = 2;
      const x1 = art.x + art.size - OV;
      const y1 = art.y + art.size - OV;

      // Draw a source rect into a dest rect, optionally mirrored, so that the
      // image edge lands exactly on the art edge.
      const draw = (
        sx: number, sy: number, sw: number, sh: number,
        dx: number, dy: number, dw: number, dh: number,
        flipX: boolean, flipY: boolean,
      ) => {
        ctx.save();
        ctx.translate(dx + (flipX ? dw : 0), dy + (flipY ? dh : 0));
        ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
        ctx.restore();
      };

      // edges
      if (gapT > 0) draw(0, 0, nw, fy, art.x, 0, art.size, gapT + OV, false, true);
      if (gapB > 0) draw(0, nh - fy, nw, fy, art.x, y1, art.size, gapB + OV, false, true);
      if (gapL > 0) draw(0, 0, fx, nh, 0, art.y, gapL + OV, art.size, true, false);
      if (gapR > 0) draw(nw - fx, 0, fx, nh, x1, art.y, gapR + OV, art.size, true, false);
      // corners — both mirrors
      if (gapT > 0 && gapL > 0) draw(0, 0, fx, fy, 0, 0, gapL + OV, gapT + OV, true, true);
      if (gapT > 0 && gapR > 0) draw(nw - fx, 0, fx, fy, x1, 0, gapR + OV, gapT + OV, true, true);
      if (gapB > 0 && gapL > 0) draw(0, nh - fy, fx, fy, 0, y1, gapL + OV, gapB + OV, true, true);
      if (gapB > 0 && gapR > 0) draw(nw - fx, nh - fy, fx, fy, x1, y1, gapR + OV, gapB + OV, true, true);
    };
    img.src = src;
    return () => { dead = true; };
  }, [src, art.x, art.y, art.size, w, h, hasGap, gapT, gapB, gapL, gapR]);

  if (!hasGap) return null;
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}
    />
  );
}
