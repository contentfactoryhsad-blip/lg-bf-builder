/**
 * Builds asset library manifest by:
 *   1. Scanning the ASSETS REPO at $ASSETS_REPO_PATH (default: ../lg-retail-obs-assets)
 *   2. Generating 200×200 WebP thumbnails INTO that repo's _thumbs/ folders (idempotent)
 *   3. Writing manifest.json into THIS repo at public/asset-library/manifest.json
 *
 * Manifest URLs point to jsDelivr CDN so the modal fetches assets directly
 * from the global edge — main repo stays lean (only manifest.json shipped).
 *
 * Workflow:
 *   - Add/remove PNGs in the assets repo, commit + push to main
 *   - Run this script: it regenerates thumbs (in assets repo) + manifest (here)
 *   - Push assets repo (new thumbs); commit + push main repo (new manifest.json)
 *
 * Folder convention (in assets repo):
 *   {category-id}/foo.png                          ← original cutout
 *   {category-id}/category-meta.json (optional)    ← { label, order }
 *   {category-id}/_thumbs/foo.webp                 ← generated
 */

import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const ASSETS_REPO_PATH = path.resolve(
  process.env.ASSETS_REPO_PATH ?? path.resolve(process.cwd(), '../lg-retail-obs-assets'),
);
const ASSETS_REPO_SLUG = process.env.ASSETS_REPO_SLUG ?? 'contentfactoryhsad-blip/lg-retail-obs-assets';
const ASSETS_REPO_REF = process.env.ASSETS_REPO_REF ?? 'main';
const CDN_BASE = `https://cdn.jsdelivr.net/gh/${ASSETS_REPO_SLUG}@${ASSETS_REPO_REF}/`;

const MANIFEST_OUT = path.resolve(process.cwd(), 'public/asset-library/manifest.json');
const THUMB_SIZE = 200;
const THUMB_QUALITY = 80;

const SOURCE_EXTS = new Set(['.png', '.webp', '.svg', '.jpg', '.jpeg']);

interface AssetItem {
  id: string;
  name: string;
  full: string;
  thumb: string;
  w: number;
  h: number;
}

interface Category {
  id: string;
  label: string;
  order: number;
  items: AssetItem[];
}

interface Manifest {
  version: string;
  generatedAt: string;
  cdnBase: string;
  categories: Omit<Category, 'order'>[];
}

async function readCategoryMeta(dir: string): Promise<{ label?: string; order?: number }> {
  try {
    const raw = await fs.readFile(path.join(dir, 'category-meta.json'), 'utf-8');
    return JSON.parse(raw);
  } catch { return {}; }
}

async function isOlder(src: string, dst: string): Promise<boolean> {
  try {
    const [s, d] = await Promise.all([fs.stat(src), fs.stat(dst)]);
    return s.mtimeMs > d.mtimeMs;
  } catch { return true; }
}

async function processCategory(catDir: string, catId: string): Promise<Category | null> {
  const entries = await fs.readdir(catDir, { withFileTypes: true });
  const sources = entries
    .filter((e) => e.isFile() && SOURCE_EXTS.has(path.extname(e.name).toLowerCase()) && e.name !== 'category-meta.json')
    .map((e) => e.name)
    .sort();
  if (sources.length === 0) return null;

  const meta = await readCategoryMeta(catDir);
  const thumbsDir = path.join(catDir, '_thumbs');
  await fs.mkdir(thumbsDir, { recursive: true });

  const items: AssetItem[] = [];
  for (const fname of sources) {
    const ext = path.extname(fname).toLowerCase();
    const base = path.basename(fname, ext);
    const fullPath = path.join(catDir, fname);
    const thumbPath = path.join(thumbsDir, `${base}.webp`);

    let w = 0, h = 0;
    if (ext === '.svg') {
      const target = path.join(thumbsDir, fname);
      if (await isOlder(fullPath, target)) {
        await fs.copyFile(fullPath, target);
      }
      const svgBytes = await fs.readFile(target);
      items.push({
        id: `${catId}/${base}`,
        name: base,
        full: CDN_BASE + `${catId}/${fname}`,
        thumb: `data:image/svg+xml;base64,${svgBytes.toString('base64')}`,
        w: 0, h: 0,
      });
      continue;
    }

    if (await isOlder(fullPath, thumbPath)) {
      const img = sharp(fullPath);
      const metadata = await img.metadata();
      w = metadata.width ?? 0;
      h = metadata.height ?? 0;
      await img
        .resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(thumbPath);
      console.log(`  thumb: ${catId}/${fname} (${w}×${h})`);
    } else {
      const metadata = await sharp(fullPath).metadata();
      w = metadata.width ?? 0;
      h = metadata.height ?? 0;
    }

    // Inline the thumb as a data URL so the modal grid renders entirely from
    // the manifest fetch (no per-thumb CDN round-trips). 6KB×81 ≈ 500KB
    // base64-encoded in JSON — single same-origin fetch beats 81 cold
    // jsDelivr edges every time.
    const thumbBytes = await fs.readFile(thumbPath);
    const thumbDataUrl = `data:image/webp;base64,${thumbBytes.toString('base64')}`;

    items.push({
      id: `${catId}/${base}`,
      name: base,
      full: CDN_BASE + `${catId}/${fname}`,
      thumb: thumbDataUrl,
      w, h,
    });
  }

  return {
    id: catId,
    label: meta.label ?? catId,
    order: meta.order ?? 999,
    items,
  };
}

async function main() {
  try {
    await fs.access(ASSETS_REPO_PATH);
  } catch {
    console.error(`[asset-library] ASSETS_REPO_PATH not found: ${ASSETS_REPO_PATH}`);
    console.error(`[asset-library] Clone the assets repo:`);
    console.error(`  git clone https://github.com/${ASSETS_REPO_SLUG}.git ${ASSETS_REPO_PATH}`);
    console.error(`Or set ASSETS_REPO_PATH env var to its location.`);
    process.exit(1);
  }

  const entries = await fs.readdir(ASSETS_REPO_PATH, { withFileTypes: true });
  const catDirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map((e) => e.name);

  console.log(`[asset-library] scanning ${catDirs.length} categories under ${ASSETS_REPO_PATH}`);
  console.log(`[asset-library] CDN base: ${CDN_BASE}`);

  const categories: Category[] = [];
  for (const catId of catDirs) {
    const cat = await processCategory(path.join(ASSETS_REPO_PATH, catId), catId);
    if (cat) categories.push(cat);
  }

  categories.sort((a, b) => (a.order - b.order) || a.label.localeCompare(b.label));

  const manifest: Manifest = {
    version: new Date().toISOString().replace(/[:.]/g, '-'),
    generatedAt: new Date().toISOString(),
    cdnBase: CDN_BASE,
    categories: categories.map(({ order: _o, ...rest }) => rest),
  };

  await fs.mkdir(path.dirname(MANIFEST_OUT), { recursive: true });
  await fs.writeFile(MANIFEST_OUT, JSON.stringify(manifest, null, 2));
  const itemCount = categories.reduce((n, c) => n + c.items.length, 0);
  console.log(`[asset-library] wrote ${MANIFEST_OUT}: ${categories.length} categories, ${itemCount} items`);
  console.log(`[asset-library] next: cd ${ASSETS_REPO_PATH} && git add -A && git commit + push (for new thumbs)`);
}

main().catch((err) => {
  console.error('[asset-library] failed:', err);
  process.exit(1);
});
