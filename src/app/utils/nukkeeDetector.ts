// Canvas-based product cutout (누끼) analysis utilities.
// All functions require a proxied (same-origin) URL so getImageData doesn't throw CORS errors.

const BORDER_S = 30;

/**
 * Crops the image tightly to the non-white/non-transparent product pixels and
 * returns a PNG data URL. The longer product dimension fills the output canvas edge.
 * Output is capped at OUTPUT_MAX px on the longer side to keep memory reasonable.
 */
export interface AutoCropResult {
  url: string;
  w: number;
  h: number;
  /** outW/outH before square padding — < 1 = portrait, > 1 = landscape */
  productAspect: number;
}

export function autoCropProduct(proxiedSrc: string): Promise<AutoCropResult | null> {
  const ANALYZE_MAX = 600;
  const OUTPUT_MAX = 800;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;

        // Step 1: detect bounding box at reduced resolution
        const aScale = Math.min(1, ANALYZE_MAX / Math.max(nw, nh));
        const aw = Math.round(nw * aScale);
        const ah = Math.round(nh * aScale);
        const ac = document.createElement('canvas');
        ac.width = aw; ac.height = ah;
        const actx = ac.getContext('2d');
        if (!actx) { resolve(null); return; }
        actx.drawImage(img, 0, 0, aw, ah);
        const data = actx.getImageData(0, 0, aw, ah).data;

        let minX = aw, minY = ah, maxX = -1, maxY = -1;
        for (let y = 0; y < ah; y++) {
          for (let x = 0; x < aw; x++) {
            const i = (y * aw + x) * 4;
            const isWhite = data[i + 3] < 30 || (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235);
            if (!isWhite) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < minX || maxY < minY) { resolve(null); return; }

        // 4% padding (reduced from 8% to make product appear larger)
        const padX = Math.round((maxX - minX) * 0.04);
        const padY = Math.round((maxY - minY) * 0.04);
        const rx1 = Math.max(0, minX - padX) / aScale;
        const ry1 = Math.max(0, minY - padY) / aScale;
        const rx2 = Math.min(aw - 1, maxX + padX) / aScale;
        const ry2 = Math.min(ah - 1, maxY + padY) / aScale;

        const cropW = Math.round(rx2 - rx1);
        const cropH = Math.round(ry2 - ry1);

        // Step 2: draw crop at capped output resolution
        const outScale = Math.min(1, OUTPUT_MAX / Math.max(cropW, cropH));
        const outW = Math.round(cropW * outScale);
        const outH = Math.round(cropH * outScale);

        const out = document.createElement('canvas');
        out.width = outW; out.height = outH;
        const octx = out.getContext('2d');
        if (!octx) { resolve(null); return; }
        octx.drawImage(img, Math.round(rx1), Math.round(ry1), cropW, cropH, 0, 0, outW, outH);

        // Pad to square so zoom=1 (cover) in the crop frame always shows the full product.
        // Portrait/landscape products appear centered with white padding on the shorter sides.
        const sq = Math.max(outW, outH);
        const sqCanvas = document.createElement('canvas');
        sqCanvas.width = sq; sqCanvas.height = sq;
        const sqCtx = sqCanvas.getContext('2d');
        if (!sqCtx) { resolve(null); return; }
        sqCtx.fillStyle = '#ffffff';
        sqCtx.fillRect(0, 0, sq, sq);
        sqCtx.drawImage(out, Math.round((sq - outW) / 2), Math.round((sq - outH) / 2), outW, outH);

        resolve({ url: sqCanvas.toDataURL('image/png'), w: sq, h: sq, productAspect: outW / outH });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = proxiedSrc;
  });
}

/** Width the copy-card row profile is sampled at (see hasStackedCopyCard). */
const PROFILE_W = 240;

/**
 * Detects LG's pre-composed "USP card" layout: two or three thin lines of baked-in copy
 * (eyebrow / headline / subcopy) stacked on white above one large artwork block. These sit
 * inside the numbered gallery carousel next to genuine cutouts (S80TY's DZ-01/DZ-02/MZ-01)
 * and pass every background test, since their background really is white.
 *
 * Works off the per-row "ink" profile (count of non-white pixels per row), split into bands
 * separated by all-white gaps. Measured on the S80TY gallery, the split is total: composed
 * cards give 4 bands — three h4-16 copy lines over one h121-186 artwork block — while every
 * real cutout, dimension diagram and detail shot gives exactly 1. Thresholds sit in the wide
 * gap between those (copy lines ≤6% of height, artwork ≥40%), so a product that merely has a
 * badge or a second item above it (2 bands) is never mistaken for a card.
 */
function hasStackedCopyCard(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  const bands: Array<[number, number]> = [];
  let start = -1;
  for (let y = 0; y < h; y++) {
    let ink = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!(data[i + 3] < 30 || (data[i] >= 235 && data[i + 1] >= 235 && data[i + 2] >= 235))) ink++;
    }
    const inked = ink >= 3; // ignore single-pixel JPEG speckle
    if (inked && start < 0) start = y;
    if (!inked && start >= 0) { bands.push([start, y - 1]); start = -1; }
  }
  if (start >= 0) bands.push([start, h - 1]);

  if (bands.length < 3) return false;
  const heightOf = ([a, b]: [number, number]) => b - a + 1;
  const artwork = bands[bands.length - 1];
  if (heightOf(artwork) < h * 0.4) return false;
  return bands.slice(0, -1).every((b) => heightOf(b) <= h * 0.12);
}

/**
 * Returns true when the image is a plain product cutout on white — 85%+ of border pixels
 * transparent or near-white (>235 all channels), and no baked-in copy card layout.
 *
 * Measured against real LG product photography: clean cutouts commonly land at 87-100%
 * (a soft studio floor shadow/reflection touching the bottom border keeps them under a
 * strict 95%), while lifestyle/feature scenes measure ~0% — 85% cleanly separates the two
 * without needing to be as strict as "no shadow pixels at all".
 */
export function checkWhiteBackground(proxiedSrc: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = BORDER_S; canvas.height = BORDER_S;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(false); return; }
        ctx.drawImage(img, 0, 0, BORDER_S, BORDER_S);
        const data = ctx.getImageData(0, 0, BORDER_S, BORDER_S).data;
        const isLight = (x: number, y: number) => {
          const i = (y * BORDER_S + x) * 4;
          return data[i + 3] < 30 || (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235);
        };
        let total = 0, bright = 0;
        for (let x = 0; x < BORDER_S; x++) {
          if (isLight(x, 0)) bright++; total++;
          if (isLight(x, BORDER_S - 1)) bright++; total++;
        }
        for (let y = 1; y < BORDER_S - 1; y++) {
          if (isLight(0, y)) bright++; total++;
          if (isLight(BORDER_S - 1, y)) bright++; total++;
        }
        if (bright / total < 0.85) { resolve(false); return; }

        // White border alone can't tell a cutout from a composed USP card — both sit on
        // white. Re-render at a taller raster so thin copy lines survive downscaling.
        const ph = Math.max(1, Math.round((PROFILE_W * img.naturalHeight) / img.naturalWidth));
        canvas.width = PROFILE_W; canvas.height = ph;
        ctx.drawImage(img, 0, 0, PROFILE_W, ph);
        resolve(!hasStackedCopyCard(ctx, PROFILE_W, ph));
      } catch { resolve(false); }
    };
    img.onerror = () => resolve(false);
    img.src = proxiedSrc;
  });
}

/**
 * Detects the product bounding box on a white/transparent background and returns
 * react-easy-crop { crop, zoom } values that center and fill the crop frame with the product.
 *
 * @param proxiedSrc   Same-origin (proxied) image URL
 * @param naturalW     Natural image width (pixels)
 * @param naturalH     Natural image height (pixels)
 * @param containerW   Crop canvas container CSS width (default: 660 — matches ImageCropModal)
 * @param containerH   Crop canvas container CSS height (default: 420 — matches ImageCropModal)
 * @param cropAspect   Crop frame aspect ratio width/height (default: 1 for 1:1)
 * @param cropSize     Explicit crop-frame size (px, in container space). When the caller
 *                     pins the frame to a fixed size smaller than the aspect-fit container
 *                     (see ImageCropModal's `cropSize`), pass it here too — otherwise this
 *                     function assumes the frame fills the container and computes a zoom
 *                     calibrated for a bigger frame than what's actually rendered, making
 *                     the product appear over-zoomed relative to the real (smaller) box.
 */
export function detectProductCropHint(
  proxiedSrc: string,
  naturalW: number,
  naturalH: number,
  containerW = 660,
  containerH = 420,
  cropAspect = 1,
  cropSize?: { width: number; height: number },
): Promise<{ crop: { x: number; y: number }; zoom: number } | null> {
  const DS = 100; // analyse at 100×100
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = DS; canvas.height = DS;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, DS, DS);
        const data = ctx.getImageData(0, 0, DS, DS).data;

        // Bounding box of non-white/non-transparent pixels
        let minX = DS, minY = DS, maxX = -1, maxY = -1;
        for (let y = 0; y < DS; y++) {
          for (let x = 0; x < DS; x++) {
            const i = (y * DS + x) * 4;
            const isWhite = data[i + 3] < 30 || (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235);
            if (!isWhite) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < minX || maxY < minY) { resolve(null); return; }

        // 8% padding on each side
        const pad = Math.floor(DS * 0.08);
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(DS - 1, maxX + pad);
        maxY = Math.min(DS - 1, maxY + pad);

        // Normalized bbox (0–1 of image)
        const bcx = (minX + maxX) / 2 / DS; // product center x
        const bcy = (minY + maxY) / 2 / DS; // product center y
        const bw  = (maxX - minX) / DS;     // product fraction of image width
        const bh  = (maxY - minY) / DS;     // product fraction of image height

        // How the image appears at zoom=1: scaled to cover the crop frame
        const contAspect  = containerW / containerH;
        const cropFrameW  = cropSize ? cropSize.width : (cropAspect >= contAspect ? containerW : containerH * cropAspect);
        const cropFrameH  = cropSize ? cropSize.height : (cropAspect >= contAspect ? containerW / cropAspect : containerH);
        const coverScale  = Math.max(cropFrameW / naturalW, cropFrameH / naturalH);
        const fitW        = naturalW * coverScale; // image display width at zoom=1
        const fitH        = naturalH * coverScale;

        // Product display size at zoom=1
        const prodW = bw * fitW;
        const prodH = bh * fitH;

        // Zoom so product fills the crop frame (100% — no breathing room)
        const zoom = Math.min(3, Math.min(cropFrameW / prodW, cropFrameH / prodH) * 1.0);

        // Crop offset: center product in the view
        // Positive crop.x shifts image right (shows left side); negative shifts left (shows right)
        const crop = {
          x: -(bcx - 0.5) * fitW * zoom,
          y: -(bcy - 0.5) * fitH * zoom,
        };

        resolve({ crop, zoom: Math.max(1, zoom) });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = proxiedSrc;
  });
}
