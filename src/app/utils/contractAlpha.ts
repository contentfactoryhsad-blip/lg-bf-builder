/**
 * Pull a cutout's alpha edge inwards by a fraction of a pixel.
 *
 * Background removal decides per pixel, and the pixels along a product's
 * outline are mixtures: part product, part studio white. Whatever alpha they
 * are given, the colour underneath is still half background, so they read as a
 * pale ragged rim once the cutout is dropped on a darker canvas. Removing that
 * rim means giving up the outermost sliver of the edge — which is exactly what
 * a designer does by hand with a −0.5px contract.
 *
 * Sub-pixel by construction: a full pixel of erosion is the minimum alpha over
 * the four-neighbourhood, so `amount` mixes each pixel that far towards it.
 * Half a pixel therefore halves every partial edge value while leaving solid
 * interior untouched — a pixel whose neighbours are all opaque cannot move.
 *
 * A plus-shaped neighbourhood rather than a 3×3 box: the box also erodes
 * diagonally, which rounds off genuine corners on boxy products.
 *
 * Geometry is preserved — same canvas, same pixel grid, nothing resampled — so
 * the result still lines up with the shot it was cut from, which the brush
 * editor's restore relies on.
 */
export async function contractAlpha(dataUrl: string, amount: number): Promise<string> {
  if (amount <= 0) return dataUrl;

  const img = await load(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return dataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  // Whole pixels first, then whatever fraction is left.
  let left = amount;
  while (left > 0) {
    erode(px, w, h, Math.min(1, left));
    left -= 1;
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}

/** One pass, mixing each alpha `t` of the way towards its neighbourhood
 *  minimum. Reads from a copy so the pass is simultaneous — eroding in place
 *  would let one pixel's new value feed the next one's and eat far more than
 *  asked for. */
function erode(px: Uint8ClampedArray, w: number, h: number, t: number) {
  const alpha = new Uint8ClampedArray(w * h);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = px[i * 4 + 3];

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      const a = alpha[i];
      if (a === 0) continue;
      // Outside the canvas counts as empty, so a product running off the edge
      // of its own frame is contracted there too rather than left with a rim.
      let min = a;
      if (x > 0) min = Math.min(min, alpha[i - 1]); else min = 0;
      if (x < w - 1) min = Math.min(min, alpha[i + 1]); else min = 0;
      if (y > 0) min = Math.min(min, alpha[i - w]); else min = 0;
      if (y < h - 1) min = Math.min(min, alpha[i + w]); else min = 0;
      if (min < a) px[i * 4 + 3] = a + (min - a) * t;
    }
  }
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
