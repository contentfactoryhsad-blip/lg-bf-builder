/**
 * Build-time translation generator — Microsoft Translator (Azure AI
 * Translator Text API v3.0) variant.
 *
 * Superseded by scripts/translate.ts (Google Cloud Translation API) — kept
 * as a fallback in case Google's account setup or output quality ever
 * becomes a problem.
 *
 * Reads src/locales/en.json (source of truth) and writes one translated JSON
 * per supported language into src/locales/<code>.json. This runs once per
 * text update — the resulting JSONs are bundled into the app, so runtime has
 * zero API dependency and zero ongoing cost.
 *
 * Requires an Azure Translator resource (the "F0" free tier covers 2M
 * characters/month, far more than this app's ~750-key source needs):
 *   1. portal.azure.com → Create a resource → "Translator"
 *   2. After creation → Keys and Endpoint → copy KEY 1 and Region
 *   3. Add to .env.local:
 *        AZURE_TRANSLATOR_KEY=...
 *        AZURE_TRANSLATOR_REGION=...   (e.g. "eastasia", "global")
 *
 * Usage (locally):
 *   npx tsx scripts/translate.ts
 *   # or to translate a single language:
 *   npx tsx scripts/translate.ts th vi
 *
 * Placeholder protection: {n}/{count}/etc and literal "\n" line-break
 * markers are wrapped in <span class="notranslate"> before sending
 * (textType=html) so the raw MT engine can't touch them, then unwrapped from
 * the response. LG-style model codes (e.g. "OLED65G56LS") get the same
 * treatment via a heuristic pattern, since a raw MT engine (unlike a
 * prompted LLM) has no notion of "don't translate product codes".
 *
 * Note: this is a raw machine-translation engine, not a prompted LLM — it
 * won't apply the nuanced house rules the old Claude script used (sentence-
 * case conventions, natural sub-copy phrasing, Lorem-ipsum replacement).
 * For a specific string that comes out awkward, scripts/translateClaude.ts
 * can still be run per-language and hand-merged.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGES, DEFAULT_LANGUAGE } from '../src/app/i18n/languages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(REPO_ROOT, 'src', 'locales');
const SOURCE_FILE = path.join(LOCALES_DIR, `${DEFAULT_LANGUAGE}.json`);

const ENDPOINT = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

// Our locale code → Microsoft Translator's "to" language code. Most match;
// Filipino and the two Chinese variants use different codes on the MS side.
const MS_LANG_CODE: Record<string, string> = {
  th: 'th',
  vi: 'vi',
  id: 'id',
  ms: 'ms',
  tl: 'fil',
  'zh-TW': 'zh-Hant',
  zh: 'zh-Hans',
  es: 'es',
};

// Batch limits (Translator v3 caps: 100 array elements, 50,000 chars/request
// including markup). Kept well under both to leave headroom for the
// notranslate spans we inject.
const MAX_ARRAY = 90;
const MAX_CHARS = 40000;

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

interface MsTranslation {
  text: string;
  to: string;
}

async function translateBatch(
  apiKey: string,
  region: string,
  keys: string[],
  source: Record<string, string>,
  targets: { code: string; msCode: string }[],
): Promise<Record<string, Record<string, string>>> {
  // result[langCode][key] = translated string
  const result: Record<string, Record<string, string>> = {};
  for (const t of targets) result[t.code] = {};

  const toParams = targets.map((t) => `to=${encodeURIComponent(t.msCode)}`).join('&');
  const url = `${ENDPOINT}/translate?api-version=3.0&from=en&textType=html&${toParams}`;

  const body = keys.map((k) => ({ Text: protect(source[k]) }));

  const MAX_ATTEMPTS = 4;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Ocp-Apim-Subscription-Region': region,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      const json = (await res.json()) as Array<{ translations: MsTranslation[] }>;
      if (!Array.isArray(json) || json.length !== keys.length) {
        throw new Error(`Unexpected response shape (${JSON.stringify(json).slice(0, 200)})`);
      }
      keys.forEach((key, i) => {
        for (const tr of json[i].translations) {
          const target = targets.find((t) => t.msCode === tr.to);
          if (!target) continue;
          result[target.code][key] = unprotect(tr.text);
        }
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

async function main() {
  const apiKey = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!apiKey || !region) {
    console.error('AZURE_TRANSLATOR_KEY and/or AZURE_TRANSLATOR_REGION is not set. Aborting.');
    console.error('Add both to .env.local (see the header comment in this file for setup steps).');
    process.exit(1);
  }

  const source = JSON.parse(await fs.readFile(SOURCE_FILE, 'utf8')) as Record<string, string>;
  const keys = Object.keys(source);
  console.log(`Source: ${SOURCE_FILE} (${keys.length} keys)`);

  const cliTargets = process.argv.slice(2);
  const targets = LANGUAGES.filter((l) => l.code !== DEFAULT_LANGUAGE)
    .filter((l) => cliTargets.length === 0 || cliTargets.includes(l.code))
    .map((l) => ({ code: l.code, msCode: MS_LANG_CODE[l.code] }));

  const unmapped = targets.filter((t) => !t.msCode);
  if (unmapped.length > 0) {
    console.error(`No Microsoft Translator language code mapped for: ${unmapped.map((t) => t.code).join(', ')}`);
    process.exit(1);
  }

  console.log(`Translating into ${targets.length} language(s): ${targets.map((t) => t.code).join(', ')}\n`);

  const chunks = chunkKeys(keys, source);
  const merged: Record<string, Record<string, string>> = {};
  for (const t of targets) merged[t.code] = {};

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    process.stdout.write(`Batch ${i + 1}/${chunks.length} (${chunk.length} keys)… `);
    try {
      const batchResult = await translateBatch(apiKey, region, chunk, source, targets);
      for (const t of targets) Object.assign(merged[t.code], batchResult[t.code]);
      console.log('done');
    } catch (err: any) {
      console.log('FAILED');
      console.error(`  ${err?.message ?? err}`);
      process.exitCode = 1;
    }
  }

  await fs.mkdir(LOCALES_DIR, { recursive: true });
  for (const t of targets) {
    const outPath = path.join(LOCALES_DIR, `${t.code}.json`);
    const translated: Record<string, string> = {};
    const missed: string[] = [];
    for (const key of keys) {
      if (merged[t.code][key] === undefined) missed.push(key);
      translated[key] = merged[t.code][key] ?? source[key];
    }
    if (missed.length > 0) {
      console.warn(`[${t.code}] ${missed.length} key(s) missing from MT output (fell back to English):`);
      missed.slice(0, 10).forEach((k) => console.warn(`  - ${JSON.stringify(k)}`));
    }
    await fs.writeFile(outPath, JSON.stringify(translated, null, 2) + '\n', 'utf8');
    console.log(`→ ${path.relative(REPO_ROOT, outPath)}`);
  }

  console.log('\nAll done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
