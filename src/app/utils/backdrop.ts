/**
 * Where the studio backdrop ends and the product begins, measured off the photo
 * itself rather than guessed at with a constant.
 *
 * Shared by the automatic cutout (`aiBgRemoval`) and the AI brush's smart fill,
 * so a click in the brush cannot erase what the automatic pass just took care to
 * keep. Kept in its own module rather than exported from `aiBgRemoval` because
 * the off-site builder loads that one on demand to keep its canvas code out of
 * the bundle until a cut is actually run.
 */

/** Source alpha below this counts as already-transparent. */
export const ALPHA_MIN = 8;

/**
 * Fallback per-channel minimum for "near-pure-white" background, used only when
 * the backdrop can't be measured off the frame.
 */
export const WHITE_MIN = 243;

/**
 * How far below the measured backdrop level a pixel may sit and still be read as
 * backdrop. Covers JPEG noise on a flat sweep, nothing more.
 */
export const BACKDROP_TOL = 3;

/**
 * How far either side of the mask boundary the mixture is solved for, and how
 * far it looks for the solid product colour behind it.
 */
const BAND_R = 3;
const SOLID_R = 5;
/**
 * Below this much contrast between backdrop and product there is no mixture to
 * recover — dividing by that difference only amplifies noise — so the binary
 * mask stands. Same figure the de-fringe uses, for the same reason.
 */
const MATTE_MIN_CONTRAST = 24;

export interface BackdropThresholds {
  /** Measured backdrop brightness, or null when the frame isn't a flat sweep. */
  level: number | null;
  /** At or above this reads as backdrop. */
  hi: number;
}

/**
 * Read the backdrop's brightness off the frame edge.
 *
 * A studio backdrop is not merely "near white", it is FLAT. On this catalogue it
 * is exactly 255 while the product's own brightest highlight reaches 250, and
 * almost nothing lies between them. A fixed threshold has to guess where that
 * gap sits, and 243 guessed low enough to land inside the product's tonal range
 * (a white fridge door ramps 235→250) — so the specular highlight read as
 * backdrop, the flood found a way in along the door's top edge, and it ate the
 * highlight out of the middle of the product.
 *
 * Measuring instead of guessing makes the threshold follow the photograph: 252
 * here, lower on a shot with a dimmer sweep. The mode rather than the mean, so a
 * product running off the edge of the frame doesn't drag the estimate down.
 *
 * `hi` is never looser than `WHITE_MIN`, so measuring can only ever keep MORE
 * product than the old constant did, never take more away.
 */
export function backdropThresholds(
  sd: Uint8ClampedArray, w: number, h: number,
): BackdropThresholds {
  const hist = new Int32Array(256);
  let n = 0;
  const add = (x: number, y: number) => {
    const p = (y * w + x) * 4;
    if (sd[p + 3] < ALPHA_MIN) return;
    hist[Math.min(sd[p], sd[p + 1], sd[p + 2])]++;
    n++;
  };
  const ring = Math.max(1, Math.round(Math.min(w, h) * 0.004));
  for (let y = 0; y < h; y++) for (let d = 0; d < ring; d++) { add(d, y); add(w - 1 - d, y); }
  for (let x = 0; x < w; x++) for (let d = 0; d < ring; d++) { add(x, d); add(x, h - 1 - d); }

  let level: number | null = null;
  if (n > 0) {
    let mode = 0;
    for (let v = 1; v < 256; v++) if (hist[v] > hist[mode]) mode = v;
    // Only trust the reading when the frame really is one flat light tone. A
    // dark or busy border means this isn't a cutout shot and the fallback stands.
    if (mode >= 235 && hist[mode] >= n * 0.5) level = mode;
  }

  return { level, hi: level !== null ? Math.max(WHITE_MIN, level - BACKDROP_TOL) : WHITE_MIN };
}

/**
 * Separable box dilate/erode on a 0/1 mask.
 *
 * Out of frame is neutral rather than empty: a product that runs off the edge of
 * the photo would otherwise be eroded away along that edge.
 */
export function morph(
  mask: Uint8Array, w: number, h: number, r: number, mode: 'dilate' | 'erode',
): Uint8Array {
  if (r <= 0) return mask;
  const want = mode === 'dilate' ? 1 : 0;
  const other = want ^ 1;
  const tmp = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let hit = false;
      for (let d = -r; d <= r; d++) {
        const xx = x + d;
        if (xx < 0 || xx >= w) continue;
        if (mask[row + xx] === want) { hit = true; break; }
      }
      tmp[row + x] = hit ? want : other;
    }
  }
  const out = new Uint8Array(mask.length);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let hit = false;
      for (let d = -r; d <= r; d++) {
        const yy = y + d;
        if (yy < 0 || yy >= h) continue;
        if (tmp[yy * w + x] === want) { hit = true; break; }
      }
      out[y * w + x] = hit ? want : other;
    }
  }
  return out;
}

/**
 * Per-pixel coverage of the product, in [0,1] — the cutout's alpha.
 *
 * The mask says which pixels are product; this says how much of each edge pixel
 * is. That distinction is the whole difference between a cutout that looks cut
 * and one that looks pasted. A boundary pixel is a mixture,
 *
 *     observed = a · product + (1 − a) · backdrop
 *
 * and on a flat measured backdrop the only unknown is `a`, so it can be solved
 * for — least squares across the three channels. What comes back is the
 * antialiasing the camera actually produced: a shallow diagonal under a TV stand
 * reads as a smooth line instead of a staircase, because the staircase was never
 * in the photograph, it was in the thresholding.
 *
 * Blurring the mask afterwards cannot do this. The sub-pixel information lives in
 * the pixel VALUES, and a binary mask has already thrown it away — smoothing only
 * spreads the staircase out.
 *
 * Where the product is nearly as bright as the backdrop the division has nothing
 * to recover, and those edges are hard steps in the source anyway, so they fall
 * back to a 3×3 tent over the mask. The tent's extra weight on the centre keeps
 * the transition inside one pixel rather than smearing it over three.
 */
export function edgeCoverage(
  sd: Uint8ClampedArray, keep: Uint8Array, w: number, h: number, level: number | null,
): Float32Array {
  const cov = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) cov[i] = keep[i];

  // Tent fallback — only where it can differ from the mask, which is the one
  // pixel either side of the boundary. Running it over the whole frame costs
  // nine reads per pixel to reproduce a value already in `keep`, and the brush
  // pays this on every click and every drag step.
  const near = morph(keep, w, h, 1, 'dilate');
  const core = morph(keep, w, h, 1, 'erode');
  const WEIGHT = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (core[i] || !near[i]) continue;
      let sum = 0;
      let total = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const wt = WEIGHT[(dy + 1) * 3 + (dx + 1)];
          sum += keep[yy * w + xx] * wt;
          total += wt;
        }
      }
      cov[i] = sum / total;
    }
  }
  if (level === null) return cov;

  const outer = morph(keep, w, h, BAND_R, 'dilate');
  const inner = morph(keep, w, h, BAND_R, 'erode');
  const solid = core;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!outer[i] || inner[i]) continue;   // not near the boundary

      // Local solid product colour. Averaged over the eroded mask so the
      // estimate isn't itself contaminated by the mixture being solved for.
      let sR = 0, sG = 0, sB = 0, sN = 0;
      const gather = (src: Uint8Array) => {
        for (let dy = -SOLID_R; dy <= SOLID_R; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -SOLID_R; dx <= SOLID_R; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = yy * w + xx;
            if (!src[j]) continue;
            const q = j * 4;
            sR += sd[q]; sG += sd[q + 1]; sB += sd[q + 2]; sN++;
          }
        }
      };
      gather(solid);
      // A structure thinner than the erosion — a bezel's edge, a stand's lip —
      // has no core to average. Falling through to the raw mask beats leaving
      // the pixel binary, which put a white line down one TV's left edge.
      if (sN === 0) gather(keep);
      if (sN === 0) continue;

      const dR = level - sR / sN, dG = level - sG / sN, dB = level - sB / sN;
      const denom = dR * dR + dG * dG + dB * dB;
      if (Math.sqrt(denom / 3) < MATTE_MIN_CONTRAST) continue;

      const p = i * 4;
      const num = (level - sd[p]) * dR + (level - sd[p + 1]) * dG + (level - sd[p + 2]) * dB;
      cov[i] = Math.min(1, Math.max(0, num / denom));
    }
  }
  return cov;
}
