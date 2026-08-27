/**
 * Trim a (background-removed) image to the bounding box of its opaque content,
 * so a product fills its frame instead of sitting inside a large transparent
 * margin left over from the studio shot.
 *
 * Returns the cropped PNG dataURL, or the input unchanged if it is fully
 * transparent or already tight. `pad` keeps a few px of breathing room.
 *
 * Shared by the Store Page Modules banner and the Off-site Banner builder.
 */
export async function trimToOpaqueBounds(dataUrl: string, pad = 2): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      const ALPHA_MIN = 12; // ignore near-transparent anti-alias fringe
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > ALPHA_MIN) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < minX || maxY < minY) { resolve(dataUrl); return; } // fully transparent
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(w - 1, maxX + pad);
      maxY = Math.min(h - 1, maxY + pad);
      const cw = maxX - minX + 1;
      const ch = maxY - minY + 1;
      if (cw >= w && ch >= h) { resolve(dataUrl); return; } // already tight
      const outCanvas = document.createElement('canvas');
      outCanvas.width = cw;
      outCanvas.height = ch;
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) { resolve(dataUrl); return; }
      outCtx.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
      resolve(outCanvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
