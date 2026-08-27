/**
 * Export the Thumbnail Builder's Figma frames to public/thumbnail/*.png.
 *
 * Re-run whenever the Figma designs change:
 *   npm run thumbnails:export
 *
 * Requires FIGMA_TOKEN (a Figma personal access token) in .env.local.
 * Node IDs come from the "thumbnail" frame in the Retail-OBS-Shop file; update
 * SLOTS below if frames are added/renamed in Figma.
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const FILE_KEY = '5Vqt1jiDnaERLEdNLAzP5t';

// Figma node id → output filename (without extension). Horizontal is the
// primary file for GWP/Bundle; "-v" is the vertical variant.
const SLOTS: Record<string, string> = {
  '1885:18236': 'default',
  '1973:18602': 'gwp-h',
  '1934:18716': 'gwp-v',
  '1934:18810': 'bundle-h',
  '1934:18755': 'bundle-v',
  '1934:18876': 'promotion',
  '1934:18898': 'feature-image',
  '2322:11434': 'feature-gallery',
  '2006:17604': 'feature-text',
};

function loadToken(): string {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN;
  try {
    const env = readFileSync(path.resolve('.env.local'), 'utf8');
    const m = env.match(/^FIGMA_TOKEN=(.+)$/m);
    if (m) return m[1].trim();
  } catch {
    /* ignore */
  }
  throw new Error('FIGMA_TOKEN not set (env or .env.local).');
}

async function main() {
  const token = loadToken();
  const outDir = path.resolve('public/thumbnail');
  await mkdir(outDir, { recursive: true });

  // Use curl (system cert store) to avoid SSL-inspection issues with Node fetch.
  const curlGet = (url: string, extraArgs: string[] = []) =>
    JSON.parse(execFileSync('curl', ['-sf', '-H', `X-Figma-Token: ${token}`, ...extraArgs, url]).toString());

  const ids = Object.keys(SLOTS).join(',');
  const api = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=1`;
  const data = curlGet(api) as { err: string | null; images: Record<string, string> };
  if (data.err) throw new Error(`Figma API error: ${data.err}`);

  for (const [nodeId, name] of Object.entries(SLOTS)) {
    const url = data.images[nodeId];
    if (!url) {
      console.warn(`  MISSING render for ${nodeId} (${name})`);
      continue;
    }
    const dest = path.join(outDir, `${name}.png`);
    execFileSync('curl', ['-sf', '-o', dest, url]);
    console.log(`  saved ${name}.png`);
  }
  console.log('Done. Tip: run pngquant on public/thumbnail/*.png to shrink before commit.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
