/**
 * Off-site Banner — image helpers.
 *
 * A backdrop is one square scene that each delivery size PLACES at its own
 * scale and offset (see OffSiteLayout.backdrop), so nothing is pre-cut. These
 * are the two things that still need a canvas: measuring an image, and
 * normalising an upload to the square the layout table is written against.
 */

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Natural width / height, or 1 if the image cannot be read. */
export async function imageAspect(src: string): Promise<number> {
  try {
    const img = await loadImage(src);
    return img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1;
  } catch {
    return 1;
  }
}

/**
 * Normalise a freshly framed backdrop to the square the layout table's windows
 * are expressed against.
 *
 * The crop modal hands back a PNG as large as 2600², which would then sit in
 * component state and in every saved draft — one copy per KV, since the source
 * is what "edit crop" reopens. Re-encoding to a `size`-square JPEG cuts that by
 * an order of magnitude and loses nothing: the widest window takes 0.67 of the
 * source to fill 1200px.
 */
export async function toBackdropSquare(src: string, size: number): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Cap an upload's longest edge before it becomes the campaign's backdrop source.
 *
 * That source is now kept so the framing can be reopened, which means it lands
 * in every saved draft — a phone-sized PNG would put tens of megabytes there.
 * `max` is comfortably above the 1200 square the crop produces, so re-framing
 * still has room to zoom out without visible softening.
 */
export async function capLongestEdge(src: string, max: number): Promise<string> {
  const img = await loadImage(src);
  const { naturalWidth: w, naturalHeight: h } = img;
  if (Math.max(w, h) <= max) return src;
  const k = max / Math.max(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * k);
  canvas.height = Math.round(h * k);
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * The canvas color a framed scene wants behind it, read off one of its edges.
 *
 * Each delivery size fades the scene in from a different side — the square from
 * the top, the wide from the left — and a scene is rarely the same tone on both,
 * so each samples the edge its own blind starts at. Sample where the artwork
 * meets flat color and the ramp has nothing to cross.
 *
 * It reads a short strip rather than one pixel: a single JPEG pixel at the very
 * edge carries block-ringing, which would land a color a few steps off the tone
 * the eye actually reads.
 *
 * Returns null if the image cannot be read — a cross-origin source taints the
 * canvas — in which case the caller leaves the color alone.
 */
export async function edgeColor(src: string, edge: 'top' | 'left'): Promise<string | null> {
  try {
    const img = await loadImage(src);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return null;
    // Long across the edge, thin into the image, whichever way it runs.
    const sw = Math.max(1, Math.round(w * (edge === 'top' ? 0.05 : 0.02)));
    const sh = Math.max(1, Math.round(h * (edge === 'top' ? 0.02 : 0.05)));
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const sx = edge === 'top' ? Math.round((w - sw) / 2) : 0;
    const sy = edge === 'top' ? 0 : Math.round((h - sh) / 2);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const { data } = ctx.getImageData(0, 0, sw, sh);
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
    if (n === 0) return null;
    const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
  } catch {
    return null;
  }
}

/** Centered cover crop to `aspect` (w/h). Returns a JPEG data URL. */
export async function coverCrop(src: string, aspect: number): Promise<string> {
  const img = await loadImage(src);
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  // Widest window of the source that still has the destination aspect.
  const cw = Math.min(sw, sh * aspect);
  const ch = cw / aspect;
  return drawCrop(img, (sw - cw) / 2, (sh - ch) / 2, cw, ch, aspect);
}

function drawCrop(
  img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, aspect: number,
): string {
  const canvas = document.createElement('canvas');
  // Cap the long edge: a 3000px source would otherwise become a data URL big
  // enough to slow every re-render of the preview.
  const MAX = 2400;
  const outW = Math.min(MAX, sw);
  canvas.width = Math.max(1, Math.round(outW));
  canvas.height = Math.max(1, Math.round(outW / aspect));
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
}
