/**
 * Build-time translation generator — Google Cloud Translation API (v2,
 * "Basic") variant.
 *
 * Reads src/locales/en.json (source of truth) and writes one translated JSON
 * per supported language into src/locales/<code>.json. This runs once per
 * text update — the resulting JSONs are bundled into the app, so runtime has
 * zero API dependency and zero ongoing cost.
 *
 * Requires a Google Cloud API key with Cloud Translation API enabled (Basic
 * tier is free for the first 500,000 characters/month, far more than this
 * app's ~750-key source needs):
 *   1. console.cloud.google.com → create/select a project
 *   2. APIs & Services → Library → enable "Cloud Translation API"
 *   3. APIs & Services → Credentials → Create Credentials → API key
 *   4. Add to .env.local:
 *        GOOGLE_TRANSLATE_API_KEY=...
 *
 * Usage (locally):
 *   npx tsx scripts/translate.ts
 *   # or to translate a single language:
 *   npx tsx scripts/translate.ts th vi
 *
 * Placeholder protection: {n}/{count}/etc and literal "\n" line-break
 * markers are wrapped in <span class="notranslate"> before sending
 * (format=html) so the raw MT engine can't touch them, then unwrapped from
 * the response. LG-style model codes (e.g. "OLED65G56LS") get the same
 * treatment via a heuristic pattern, since a raw MT engine (unlike a
 * prompted LLM) has no notion of "don't translate product codes".
 *
 * Note: this is a raw machine-translation engine, not a prompted LLM — it
 * won't apply the nuanced house rules the old Claude script used (sentence-
 * case conventions, natural sub-copy phrasing, Lorem-ipsum replacement). For
 * a specific string that comes out awkward, scripts/translateClaude.ts can
 * still be run per-language and hand-merged.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGES, DEFAULT_LANGUAGE } from '../src/app/i18n/languages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(REPO_ROOT, 'src', 'locales');
const SOURCE_FILE = path.join(LOCALES_DIR, `${DEFAULT_LANGUAGE}.json`);

const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';

// Our locale code → Google Translate's "target" language code. Most match;
// Simplified Chinese needs the explicit -CN suffix (bare "zh" is ambiguous).
const GOOGLE_LANG_CODE: Record<string, string> = {
  th: 'th',
  vi: 'vi',
  id: 'id',
  ms: 'ms',
  tl: 'tl',
  'zh-TW': 'zh-TW',
  zh: 'zh-CN',
  es: 'es',
};

// Batch limits (Cloud Translation v2 caps: 128 q[] entries, ~30,000 chars
// per request). Kept well under both to leave headroom for notranslate spans.
const MAX_ARRAY = 100;
const MAX_CHARS = 20000;

// Matches {placeholder} tokens and literal "\n" line-break markers — both
// must survive translation byte-for-byte. Also matches LG-style model codes:
// an uppercase/digit token, ≥5 chars, with at least one letter AND one digit
// (so it doesn't accidentally swallow plain English acronyms like "ZIP").
const PROTECT_RE = /\{[a-zA-Z_]+\}|\\n|\b(?=[A-Z0-9-]{5,}\b)(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*[0-9])[A-Z0-9-]{5,}\b/g;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function protect(text: string): string {
  return text.replace(PROTECT_RE, (m) => `<span class="notranslate">${escapeHtml(m)}</span>`);
}

function unprotect(html: string): string {
  return html
    .replace(/<span class="notranslate">([\s\S]*?)<\/span>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function translateBatch(
  apiKey: string,
  targetCode: string,
  keys: string[],
  source: Record<string, string>,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const body = {
    q: keys.map((k) => protect(source[k])),
    source: 'en',
    target: targetCode,
    format: 'html',
  };

  const MAX_ATTEMPTS = 4;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      const json = (await res.json()) as { data?: { translations: { translatedText: string }[] } };
      const translations = json.data?.translations;
      if (!Array.isArray(translations) || translations.length !== keys.length) {
        throw new Error(`Unexpected response shape (${JSON.stringify(json).slice(0, 200)})`);
      }
      keys.forEach((key, i) => {
        result[key] = unprotect(translations[i].translatedText);
      });
      return result;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) {
        process.stdout.write(`(retry ${attempt}) `);
        await new Promise((r) => setTimeout(r, 3000 * attempt));
        continue;
      }
    }
  }
  throw lastErr;
}

function chunkKeys(keys: string[], source: Record<string, string>): string[][] {
  const chunks: string[][] = [];
  let cur: string[] = [];
  let curChars = 0;
  for (const key of keys) {
    const len = source[key].length;
    if (cur.length > 0 && (cur.length >= MAX_ARRAY || curChars + len > MAX_CHARS)) {
      chunks.push(cur);
      cur = [];
      curChars = 0;
    }
    cur.push(key);
    curChars += len;
  }
  if (cur.length > 0) chunks.push(cur);
  return chunks;
}

async function translateOne(
  apiKey: string,
  langCode: string,
  targetCode: string,
  keys: string[],
  source: Record<string, string>,
): Promise<Record<string, string>> {
  const chunks = chunkKeys(keys, source);
  const merged: Record<string, string> = {};
  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunkResult = await translateBatch(apiKey, targetCode, chunks[i], source);
      Object.assign(merged, chunkResult);
      process.stdout.write(`${Math.min((i + 1) * MAX_ARRAY, keys.length)}/${keys.length} `);
    } catch (err: any) {
      console.log('FAILED');
      throw err;
    }
  }
  return merged;
}

/**
 * Hand-written translations that win over the machine output.
 *
 * Only for strings where the MT result is CORRECT but does not FIT — the
 * templates size their boxes from the English, and some languages need far
 * more characters to say the same thing. Without this map the fix would live
 * in the generated locale file and be silently undone by the next run.
 *
 * Record the box that forced each one, so a later layout change can retire it.
 */
const OVERRIDES: Record<string, Record<string, string>> = {
  th: {
    // Value Props item label — 130px wide, 24px, clipped at 2 lines. The MT
    // output "การรับประกันอย่างเป็นทางการ" runs to 3 lines in all three brand
    // fonts. This is the standard Thai retail term for the same thing.
    'Official Warranty': 'รับประกันศูนย์',
  },
};

async function main() {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_TRANSLATE_API_KEY is not set. Aborting.');
    console.error('Add it to .env.local (see the header comment in this file for setup steps).');
    process.exit(1);
  }

  const source = JSON.parse(await fs.readFile(SOURCE_FILE, 'utf8')) as Record<string, string>;
  const keys = Object.keys(source);
  console.log(`Source: ${SOURCE_FILE} (${keys.length} keys)`);

  const cliTargets = process.argv.slice(2);
  const targets = LANGUAGES.filter((l) => l.code !== DEFAULT_LANGUAGE)
    .filter((l) => cliTargets.length === 0 || cliTargets.includes(l.code))
    .map((l) => ({ code: l.code, googleCode: GOOGLE_LANG_CODE[l.code] }));

  const unmapped = targets.filter((t) => !t.googleCode);
  if (unmapped.length > 0) {
    console.error(`No Google Translate language code mapped for: ${unmapped.map((t) => t.code).join(', ')}`);
    process.exit(1);
  }

  console.log(`Translating into ${targets.length} language(s): ${targets.map((t) => t.code).join(', ')}\n`);

  await fs.mkdir(LOCALES_DIR, { recursive: true });

  for (const t of targets) {
    const outPath = path.join(LOCALES_DIR, `${t.code}.json`);
    process.stdout.write(`[${t.code}] ${t.googleCode}… `);
    const start = Date.now();
    try {
      const translatedMap = await translateOne(apiKey, t.code, t.googleCode, keys, source);
      const translated: Record<string, string> = {};
      const missed: string[] = [];
      const overrides = OVERRIDES[t.code] ?? {};
      for (const key of keys) {
        if (translatedMap[key] === undefined) missed.push(key);
        translated[key] = overrides[key] ?? translatedMap[key] ?? source[key];
      }
      const applied = Object.keys(overrides).filter((k) => k in translated);
      const orphaned = Object.keys(overrides).filter((k) => !(k in translated));
      await fs.writeFile(outPath, JSON.stringify(translated, null, 2) + '\n', 'utf8');
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`done in ${elapsed}s → ${path.relative(REPO_ROOT, outPath)}`);
      if (applied.length > 0) console.log(`  ${applied.length} hand override(s) applied`);
      // A key that no longer exists in en.json means the override outlived the
      // string it was written for — worth saying, or it rots unnoticed.
      orphaned.forEach((k) => console.warn(`  override for a key not in en.json: ${JSON.stringify(k)}`));
      if (missed.length > 0) {
        console.warn(`  ${missed.length} key(s) missing from MT output (fell back to English):`);
        missed.slice(0, 10).forEach((k) => console.warn(`    - ${JSON.stringify(k)}`));
      }
    } catch (err: any) {
      console.log('FAILED');
      console.error(`  ${err?.message ?? err}`);
      process.exitCode = 1;
    }
  }

  console.log('\nAll done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
