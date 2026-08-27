/**
 * Content Template Builder — source asset pipeline.
 *
 * The delivered sources are 3000×3000 PNGs (79 MB for 14 files); shipping those
 * to the browser is not an option. This derives two WebP sizes per asset:
 *
 *   thumb/   240×240   palette grid (66px slot, 2× for retina, plus headroom)
 *   preview/ 1960×928  canvas preview box (980:464), zoomed 2.5×
 *   source/  800×800   edit panel — the whole delivered frame, uncropped
 *   full/    3000×3000 banner slots — the delivered frame at source resolution
 *
 * Idempotent — an output newer than its source is left alone, so re-running
 * after adding one file only processes that file.
 *
 * Usage:  npm run assets:content-template
 *         SOURCE_DIR=/some/other/path npm run assets:content-template
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = resolve(
  process.env.SOURCE_DIR ?? join(process.cwd(), '..', 'content template builder source'),
);
const OUT_DIR = join(process.cwd(), 'public', 'content-template');

/**
 * The sources frame the artwork small inside a large dark vignette, so a
 * straight downscale reads as "tiny logo floating in black" at palette size.
 *
 * A fixed centre crop does not fix it either: the artwork occupies a different
 * fraction of every file (the Figma mock ended up hand-tuned per image, from
 * 2.06× to 3.22×). So the thumbnails crop to the *detected artwork bounds*
 * instead, which keeps every cell at a similar visual weight and needs no
 * tuning when new art lands.
 *
 * `preview` is cut to the canvas box's own shape instead. A square preview
 * dropped into that wide box leaves the box background showing down both sides,
 * which reads as a panel-inside-a-panel — so the region taken from the source
 * carries the box's 980:464 ratio, zoomed 2.5×. Cropping here rather than
 * scaling in CSS keeps it sharp, since the region is cut from the 3000px original.
 *
 * PREVIEW_RATIO must track the `aspect-[980/464]` box in ContentTemplateBuilder.
 */
const PREVIEW_ZOOM = 2.5;
const PREVIEW_RATIO = 980 / 464;
const PREVIEW_W = 1960;
const BBOX_PADDING = 0.12; // breathing room around the detected artwork

/**
 * Crops lifted verbatim from the Figma mock's CROP fills
 * (`fUup3vSq71f6eUIRpmzz8s`, page "Content Template Builder", board `26:2`),
 * as `[left, top, width, height]` fractions of the source.
 *
 * 🔴 Not square any more. Each rect carries its tile's own shape — the key
 * visuals are 140×64 letterbox tiles and everything else is 66×64 — so the
 * thumbnail is cut to that shape here rather than being squeezed by CSS. Read
 * them off the fill's `imageTransform`: row 0 is `[w, 0, x]`, row 1 `[0, h, y]`.
 *
 * These win over the detector. The detector reads the artwork's true bounds,
 * which for the deal-type objects sits noticeably tighter than the framing the
 * designer chose (bundle: 3.50× detected vs 2.73× in Figma) — the extra air is
 * deliberate, so the designed value is the one to ship. Assets with no Figma
 * counterpart still fall through to detection.
 */
const FIGMA_CROP: Record<string, [number, number, number, number]> = {
  // KEY VISUAL — 140×64 tiles (2.19:1)
  'kv-main':                    [0.1539, 0.3394, 0.6927, 0.3167],
  'kv-main-character':          [0.1635, 0.3462, 0.6731, 0.3077],
  'kv-product-centric-1':       [0.1429, 0.3348, 0.7143, 0.3265],
  'kv-product-centric-2':       [0.1667, 0.3476, 0.6667, 0.3048],
  'kv-product-slot':            [0.1196, 0.3261, 0.7609, 0.3478],
  'kv-product-slot-character':  [0.1196, 0.3261, 0.7609, 0.3478],
  // Ver.2 is hidden in the palette but still built, so re-enabling it is a flag
  // flip rather than a rebuild. Its tiles are the 66×64 shape.
  'kv-product-slot2':           [0.2481, 0.2454, 0.5116, 0.4945],
  'kv-product-slot2-character': [0.2489, 0.2514, 0.5058, 0.4889],
  // DEAL TYPE — 66×64 tiles
  'deal-type-bundle':           [0.3158, 0.3241, 0.3657, 0.3546],
  'deal-type-time-sale':        [0.3006, 0.2991, 0.3988, 0.3867],
  'deal-type-gift':             [0.3308, 0.3333, 0.3284, 0.3184],
  'deal-type-hot-deal':         [0.3065, 0.3050, 0.3871, 0.3754],
  // AD CREATIVE — Figma's `Ad — B` (Joy & Ryder) and `Ad — C` (Benefit), 66×64.
  // `Ad — A` (Teasing) carries no fill in the mock; it borrows `kv-main`'s art
  // and, being a 136×64 tile, its letterbox crop too.
  'ad-creative-a-1':            [0.3447, 0.3506, 0.3106, 0.3012],
  'ad-creative-b-1':            [0.3059, 0.3147, 0.3882, 0.3765],
};

/**
 * Palette tiles are 64 CSS px tall; 3× covers retina. Width is not fixed — the
 * thumbnail keeps its Figma crop's shape (see FIGMA_CROP), so a 140×64 key
 * visual tile and a 66×64 deal tile each get a file already cut to that shape
 * instead of a square one squeezed by CSS.
 */
const THUMB_H = 192;

const SIZES = [
  { dir: 'thumb', w: 0, h: THUMB_H, quality: 82, cropToContent: true, zoom: 0 },
  // Shown in the edit panel so the operator can see the source frame they are
  // working from — deliberately the full 3000² composition, not a crop of it.
  { dir: 'source', w: 800, h: 800, quality: 86, cropToContent: false, zoom: 0 },
  // Banner slots place this art as large as 1809px inside a 1920 frame, so the
  // 800px `source` copy visibly softens once a slot scales it up. The Figma
  // placements were judged against the 3000px original, so this keeps that
  // resolution rather than resampling to the component's 2000px box.
  { dir: 'full', w: 3000, h: 3000, quality: 88, cropToContent: false, zoom: 0 },
  {
    dir: 'preview',
    w: PREVIEW_W,
    h: Math.round(PREVIEW_W / PREVIEW_RATIO),
    quality: 88,
    cropToContent: false,
    zoom: PREVIEW_ZOOM,
  },
] as const;

/**
 * Centred region of the box's aspect, spanning 1/zoom of the frame's *height*.
 *
 * Height is what the zoom has to key off: the box is far wider than it is tall,
 * so sizing the region by width leaves a band too shallow to hold the artwork
 * (at 2.5× that is 19% of the frame, and every asset's art is taller than that).
 * Keying off height gives a 40% band — comfortably clear of the ~26–32% the
 * artwork occupies — and the width simply follows the ratio.
 */
function zoomRegion(zoom: number, ratio: number, width: number, height: number): Region {
  const h = Math.min(Math.round(Math.min(width, height) / zoom), height);
  const w = Math.min(Math.round(h * ratio), width);
  return {
    left: Math.round((width - w) / 2),
    top: Math.round((height - h) / 2),
    width: w,
    height: h,
  };
}

interface Region { left: number; top: number; width: number; height: number }

/**
 * Square region covering the non-background artwork. Works off a 300px
 * greyscale copy: the background is a dark vignette, so anything meaningfully
 * brighter than the border level is content.
 */
async function contentRegion(src: string, width: number, height: number): Promise<Region | null> {
  const N = 300;
  const { data } = await sharp(src).greyscale().resize(N, N, { fit: 'fill' })
    .raw().toBuffer({ resolveWithObject: true });

  const border: number[] = [];
  for (let i = 0; i < N; i++) {
    border.push(data[i], data[(N - 1) * N + i], data[i * N], data[i * N + N - 1]);
  }
  border.sort((a, b) => a - b);
  const bg = border[border.length >> 1];
  let max = 0;
  for (let i = 0; i < data.length; i++) if (data[i] > max) max = data[i];
  if (max - bg < 12) return null; // near-uniform frame — nothing to crop to

  const threshold = bg + (max - bg) * 0.18;
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (data[y * N + x] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;

  // back to source scale, squared up and padded
  const sx = width / N, sy = height / N;
  const cx = ((x0 + x1) / 2) * sx;
  const cy = ((y0 + y1) / 2) * sy;
  let side = Math.max((x1 - x0) * sx, (y1 - y0) * sy) * (1 + BBOX_PADDING * 2);
  side = Math.min(side, width, height);

  const clamp = (v: number, hi: number) => Math.max(0, Math.min(v, hi - side));
  return {
    left: Math.round(clamp(cx - side / 2, width)),
    top: Math.round(clamp(cy - side / 2, height)),
    width: Math.round(side),
    height: Math.round(side),
  };
}

/** Figma's designed crop for this asset, if one was recorded. */
function cropRegion(id: string, width: number, height: number): Region | null {
  const c = FIGMA_CROP[id];
  if (!c) return null;
  const [left, top, w, h] = c;
  return {
    left: Math.round(width * left),
    top: Math.round(height * top),
    width: Math.round(width * w),
    height: Math.round(height * h),
  };
}

/** `lg-bf-kv-product-centric-1-3000x3000.png` → `kv-product-centric-1` */
function idFromFilename(file: string): string {
  return basename(file)
    .replace(/\.[^.]+$/, '')
    .replace(/^lg-bf-/, '')
    .replace(/-\d+x\d+$/, '');
}

async function main() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`Source folder not found: ${SOURCE_DIR}`);
    console.error('Pass SOURCE_DIR=/path/to/folder to point somewhere else.');
    process.exit(1);
  }

  for (const { dir } of SIZES) mkdirSync(join(OUT_DIR, dir), { recursive: true });
  mkdirSync(join(OUT_DIR, 'motion'), { recursive: true });

  const files = readdirSync(SOURCE_DIR).filter(f => /\.(png|jpe?g|webp|mp4)$/i.test(f)).sort();
  const manifest: Record<string, { width: number; height: number; motion?: string }> = {};
  let built = 0;
  let skipped = 0;
  const crops: string[] = [];

  for (const file of files) {
    const src = join(SOURCE_DIR, file);
    const id = idFromFilename(file);
    const srcStat = statSync(src);

    // Video passes through untouched — sharp can't transcode and the single
    // motion file is already a reasonable 10 MB.
    if (/\.mp4$/i.test(file)) {
      const dest = join(OUT_DIR, 'motion', `${id}.mp4`);
      if (!existsSync(dest) || statSync(dest).mtimeMs < srcStat.mtimeMs) {
        copyFileSync(src, dest);
        built++;
      } else skipped++;
      continue;
    }

    const meta = await sharp(src).metadata();
    manifest[id] = { width: meta.width ?? 0, height: meta.height ?? 0 };

    let region: Region | null | undefined;

    for (const { dir, w: outW, h: outH, quality, cropToContent, zoom } of SIZES) {
      const dest = join(OUT_DIR, dir, `${id}.webp`);
      if (existsSync(dest) && statSync(dest).mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        continue;
      }

      let pipe = sharp(src);
      if (zoom > 1 && meta.width && meta.height) {
        pipe = pipe.extract(zoomRegion(zoom, outW / outH, meta.width, meta.height));
      } else if (cropToContent && meta.width && meta.height) {
        if (region === undefined) region = cropRegion(id, meta.width, meta.height)
          ?? await contentRegion(src, meta.width, meta.height);
        if (region) {
          pipe = pipe.extract(region);
          const zoom = +(meta.width / region.width).toFixed(2);
          crops.push(`${id} ${zoom}×${FIGMA_CROP[id] ? '' : '(auto)'}`);
        }
      }
      // w: 0 means "follow the crop's aspect at this height" — see THUMB_H.
      const fitW = outW || (region ? Math.round(outH * region.width / region.height) : outH);
      await pipe.resize(fitW, outH, { fit: 'cover' }).webp({ quality }).toFile(dest);
      built++;
    }
  }

  // Motion variants are keyed off the still they animate (`kv-main-motion` → `kv-main`).
  for (const id of Object.keys(manifest)) {
    const motion = join(OUT_DIR, 'motion', `${id}-motion.mp4`);
    if (existsSync(motion)) manifest[id].motion = `/content-template/motion/${id}-motion.mp4`;
  }

  // Derivatives keep the same filenames when the art is replaced, so a browser
  // that already has one will happily keep showing it. The stamp goes into every
  // asset URL as `?v=` — see contentTemplateAssets.ts — which is enough to make
  // the browser fetch the new bytes without disabling caching for everyone else.
  const stamp = Math.max(
    ...readdirSync(SOURCE_DIR)
      .filter(f => /\.(png|jpe?g|webp|mp4)$/i.test(f))
      .map(f => statSync(join(SOURCE_DIR, f)).mtimeMs),
  );
  writeFileSync(
    join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ generatedFrom: basename(SOURCE_DIR), stamp: Math.round(stamp), assets: manifest }, null, 2),
  );

  // The app imports this rather than fetching the manifest, so the stamp is
  // baked into the bundle and costs no round trip.
  writeFileSync(
    join('src', 'app', 'components', 'contenttemplate', 'assetStamp.ts'),
    `/**\n` +
      ` * Written by \`npm run assets:content-template\` — the newest mtime among the\n` +
      ` * files in \`content template builder source/\`. Used only to version the derived\n` +
      ` * asset URLs so a replaced image actually reaches the browser.\n` +
      ` *\n` +
      ` * Do not edit by hand; re-run the script instead.\n` +
      ` */\n` +
      `export const ASSET_STAMP = ${Math.round(stamp)};\n`,
  );

  console.log(`content-template assets — built ${built}, skipped ${skipped}, ${Object.keys(manifest).length} stills`);
  if (crops.length) console.log('  thumb crop zoom:', crops.join('  '));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
