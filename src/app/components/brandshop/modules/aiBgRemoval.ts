// Conservative background removal for product images.
//
// Deliberately NOT ML-based. The `@imgly/background-removal` model kept eating
// white product bodies (a white LG washer/dryer on a white studio background):
// it makes the whole white body transparent in one border-connected sweep, so
// even a connectivity guard can't tell it apart from the real background
// (see memory: feedback_bg_remove_attempts).
//
// The shape of the thing:
//   1. Measure the backdrop's own brightness off the frame edge, and treat only
//      pixels within a couple of levels of it as erasable background.
//   2. Flood-fill inward from the image border through those white pixels —
//      erase from the OUTSIDE in. Any white region not reachable from the
//      border (a white product panel enclosed by its own darker edges/shadows)
//      is never touched.
//   3. Repair the mask, then feather and de-fringe its edge.
//
// Step 3 is what makes a white product usable. A white body on a white backdrop
// is separated from it by nothing but a faint grey outline, and JPEG noise
// pushes that outline above and below the threshold from one pixel to the next.
// The flood leaks a few pixels into the body wherever the outline reads as
// white, which is the ragged, crinkled edge that made this unusable — not one
// big failure but hundreds of shallow bites.
//
// Those bites are narrow, so morphology closes them: dilate-then-erode bridges
// any notch thinner than twice its radius while leaving the true silhouette
// where it is. It can only ADD product back, never take more away, which is the
// property every earlier attempt at a smarter flood lacked.
//
// Falls back to the original image on any failure.

import {
  ALPHA_MIN, backdropThresholds, edgeCoverage, morph,
} from '../../../utils/backdrop';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

/**
 * Flood-fill inward from every border pixel, expanding only through pixels the
 * `passable` predicate accepts. Returns a per-pixel reached/not-reached map.
 * Iterative (typed-array stack) to survive multi-million-pixel images.
 */
function floodFromBorder(w: number, h: number, passable: (i: number) => boolean): Uint8Array {
  return flood(w, h, (i) => {
    const x = i % w;
    const y = (i / w) | 0;
    return x === 0 || y === 0 || x === w - 1 || y === h - 1;
  }, passable);
}

/** Flood outward from every seed pixel, expanding only through `passable`. */
function flood(
  w: number, h: number, isSeed: (i: number) => boolean, passable: (i: number) => boolean,
): Uint8Array {
  const N = w * h;
  const reached = new Uint8Array(N);
  const stack = new Int32Array(N);
  let sp = 0;
  const push = (i: number) => {
    if (!reached[i] && passable(i)) { reached[i] = 1; stack[sp++] = i; }
  };
  for (let i = 0; i < N; i++) if (isSeed(i)) push(i);
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  return reached;
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/**
 * Necks up to this wide, as a fraction of the shorter side, are read as a breach
 * in the outline and snapped by the leak guard. Sized in image terms rather than
 * pixels so a 600px thumbnail and a 2400px hero get the same treatment; the
 * clamp keeps it from severing a real isthmus on a very large photo.
 */
const CLOSE_FRACTION = 1 / 400;
const CLOSE_MAX = 3;
/** Radius of the silhouette repair — see where it's used for why it's this small. */
const REPAIR_R = 1;
/**
 * Below this a partly-transparent pixel's own colour is too close to the white
 * it was shot against to un-mix reliably — dividing by that difference only
 * amplifies noise into a coloured rim. White products land here and simply keep
 * the colour they came with.
 */
const DEFRINGE_MIN_CONTRAST = 24;

async function floodWhiteBackground(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  // Keep native resolution (product photos are modest); cap only enormous ones
  // so the flood-fill stays fast.
  const MAX_SIDE = 3000;
  const nW = img.naturalWidth;
  const nH = img.naturalHeight;
  const scale = Math.min(1, MAX_SIDE / Math.max(nW, nH));
  const w = Math.max(1, Math.round(nW * scale));
  const h = Math.max(1, Math.round(nH * scale));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) throw new Error('Canvas context unavailable');
  srcCtx.drawImage(img, 0, 0, w, h);
  const sd = srcCtx.getImageData(0, 0, w, h).data;
  const N = w * h;

  // Threshold read off this photo's own backdrop, never looser than the fixed
  // fallback — so this can only ever keep MORE product, never take more away.
  const { level, hi } = backdropThresholds(sd, w, h);

  // Erasable background = connected to the frame edge AND either near-pure-white
  // or already transparent. Without the transparency arm, re-running this on a
  // cutout would read its transparent surround as RGB(0,0,0) — "not white", so
  // "product" — and hand back a black rectangle.
  const isClear = (i: number) => sd[i * 4 + 3] < ALPHA_MIN;
  const minCh = (i: number) => {
    const p = i * 4;
    return Math.min(sd[p], sd[p + 1], sd[p + 2]);
  };
  const bgRaw = floodFromBorder(w, h, (i) => isClear(i) || minCh(i) >= hi);

  /* ── Leak guard ─────────────────────────────────────────────────────── */

  // The failure that made this unusable on white products: the outline between
  // a white body and a white backdrop is a hairline, and JPEG noise pushes a
  // few of its pixels above the threshold. The flood slips through that pinhole
  // and, finding nothing but white inside, takes the ENTIRE body. One breach
  // anywhere costs the whole product — which is why raising or lowering the
  // fixed threshold never fixed this, it only moved which photo it happened to.
  // (Measuring the threshold off the backdrop, as step 1 now does, closes most
  // of those pinholes; this guard is what catches the ones it doesn't.)
  //
  // A breach is always a NECK: a couple of pixels wide, opening into a wide
  // region. Opening by reconstruction removes exactly that and nothing else —
  // erode the background so necks thinner than 2r snap, keep only what still
  // reaches the frame, then grow it back inside the original background. The
  // true backdrop is far wider than any neck, so it survives erosion and
  // reconstructs to its exact original shape; the balloon behind the breach no
  // longer has a path to the frame and stays product.
  const r = Math.max(1, Math.min(CLOSE_MAX, Math.round(Math.min(w, h) * CLOSE_FRACTION)));
  const eroded = morph(bgRaw, w, h, r, 'erode');
  const trunk = floodFromBorder(w, h, (i) => eroded[i] === 1);
  const bg = flood(w, h, (i) => trunk[i] === 1, (i) => bgRaw[i] === 1);

  // Binary keep mask (1 = product). Transparent pixels are dropped whether or
  // not the border could reach them, so interior holes survive.
  let keep = new Uint8Array(N);
  for (let i = 0; i < N; i++) keep[i] = bg[i] || sd[i * 4 + 3] < ALPHA_MIN ? 0 : 1;

  /* ── Repair ─────────────────────────────────────────────────────────── */

  // Close: fill the bites the flood took out of the silhouette. Adds only.
  //
  // Radius 1, not the leak guard's. This used to close at the same width and
  // that is far more than the measured threshold leaves to repair — on this
  // catalogue it added 146px of genuine fill out of 620,000 kept, while its 7×7
  // structuring element squared the whole outline off and hung white rectangles
  // of backdrop off every slanted edge. A closing can only add, so when there is
  // nothing to add it can only do harm.
  keep = morph(morph(keep, w, h, REPAIR_R, 'dilate'), w, h, REPAIR_R, 'erode');
  // Open at radius 1: drop the single-pixel flecks of background the flood
  // could not reach — the speckle left behind around a noisy outline.
  keep = morph(morph(keep, w, h, 1, 'erode'), w, h, 1, 'dilate');
  // Whatever the closing sealed off is interior, not background: a dark drum
  // ringed by product is not a hole to see through.
  const outside = floodFromBorder(w, h, (i) => keep[i] === 0);
  for (let i = 0; i < N; i++) if (!keep[i] && !outside[i]) keep[i] = 1;

  /* ── Matte ──────────────────────────────────────────────────────────── */

  // Sub-pixel alpha, solved from the pixels rather than read off the mask —
  // see `edgeCoverage`. This is what keeps a slanted or curved outline from
  // coming out as a staircase.
  const cover = edgeCoverage(sd, keep, w, h, level);

  const out = srcCtx.createImageData(w, h);
  const od = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const p = i * 4;
      const c = cover[i];
      // Local solid product colour, for the un-mix below.
      let solidR = 0, solidG = 0, solidB = 0, solidN = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = yy * w + xx;
          if (!keep[j]) continue;
          const q = j * 4;
          solidR += sd[q]; solidG += sd[q + 1]; solidB += sd[q + 2]; solidN++;
        }
      }
      od[p] = sd[p];
      od[p + 1] = sd[p + 1];
      od[p + 2] = sd[p + 2];
      // Scale by the source alpha rather than 255, so a semi-transparent input
      // keeps its softness instead of being forced opaque.
      od[p + 3] = Math.round(c * sd[p + 3]);

      // De-fringe. An edge pixel is a mix of the product and the white it was
      // shot against; left as-is it is what puts a pale rim around a cutout
      // once it is composited onto a coloured canvas. Un-mix it —
      //   observed = cover × product + (1 − cover) × white
      // — and keep the product term. Skipped where the product is itself near
      // white, since there the division has nothing to recover.
      if (c > 0 && c < 1 && solidN > 0) {
        const pr = solidR / solidN, pg = solidG / solidN, pb = solidB / solidN;
        if (255 - Math.max(pr, pg, pb) >= DEFRINGE_MIN_CONTRAST) {
          od[p] = clamp255((sd[p] - (1 - c) * 255) / c);
          od[p + 1] = clamp255((sd[p + 1] - (1 - c) * 255) / c);
          od[p + 2] = clamp255((sd[p + 2] - (1 - c) * 255) / c);
        }
      }
    }
  }
  srcCtx.putImageData(out, 0, 0);
  return srcCanvas.toDataURL('image/png');
}

/**
 * Remove a near-white background from a product photo (outside-in flood, mask
 * repair, feather + de-fringe). Signature/name kept for existing callers.
 */
export async function removeBackgroundAI(
  dataUrl: string,
  onProgress?: (message: string) => void,
): Promise<string> {
  try {
    onProgress?.('Removing background…');
    return await floodWhiteBackground(dataUrl);
  } catch (err) {
    console.error('Background removal failed:', err);
    return dataUrl;
  }
}
