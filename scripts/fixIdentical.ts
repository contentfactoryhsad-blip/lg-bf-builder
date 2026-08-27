/**
 * Second-pass fixup: for each locale, find values still identical to English,
 * exclude genuine proper nouns / model names / tokens, and re-translate that
 * mini-batch with an explicit "these were wrongly left in English" instruction.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const LOCALES_DIR = '/Users/sohee.kim/Documents/CLAUDE/retail-obs-content-builder/src/locales';
const MODEL = 'claude-haiku-4-5';

const LANGS: Record<string, string> = {
  th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay',
  tl: 'Filipino', 'zh-TW': 'Chinese (Traditional)', zh: 'Chinese (Simplified)', es: 'Spanish',
};

// Keys that legitimately stay in English/Latin — skip them.
const KEEP: RegExp[] = [
  /^(LG|Lazada|Shopee|VIP|PC|MO|KV|AI|H \/ V|OK)$/,
  /^Retail OBS Content Builder$/,
  /^Warm Gray \d+$/,
  /^(Lazada Pink|Shopee Orange)$/,
  // product/spec names & model codes
  /UA7350|OLED evo|A9 AI Processor|Alpha 11|alpha 7|webOS|Dolby|Super Scaling|Smart Inverter|WashTower|Aero Furniture|OLED TV/i,
  /^[A-Z0-9]{6,}$/,                       // bare model codes (FDC309W …)
  /^\d[\d\s./:-]*$/,                       // numbers/dates only
  /^10 FEB 8pm - 10 MAR$/,
  /^2026/,
];

function shouldKeep(key: string): boolean {
  return KEEP.some((re) => re.test(key));
}

function buildPrompt(langName: string, entries: Record<string, string>): string {
  return `These UI strings from an LG retail web app were supposed to be translated into ${langName}, but were incorrectly left in English. Translate EVERY value into ${langName} now. This is a hard product requirement: even words commonly kept in English in casual ${langName} usage (e.g. "Accessories", "Care", "Accent", "Banner", "URLs") MUST be rendered in ${langName} (for Filipino: use the natural Tagalog/Filipino equivalent, e.g. "Mga Aksesorya"; borrow-words respelled per local orthography are fine). Returning the English value unchanged is treated as a FAILURE unless it is a brand name (LG/Lazada/Shopee), a model code, or a dimension suffix like "1200x320" (translate the words around it).

Hard rules:
1. Keys stay EXACTLY as provided; translate only values.
2. Do NOT leave any value in English. Only these fragments may remain in Latin letters INSIDE a translated sentence: brand names "LG", "Lazada", "Shopee", product model codes (letters+digits), file formats "PNG"/"ZIP"/"URL" ONLY when ${langName} convention writes them in Latin script (Thai/Chinese should transliterate common words like Download but may keep PNG/ZIP/URL acronyms).
3. "LG Official Store" → keep "LG" + translate "Official Store" into ${langName}.
4. Preserve placeholder tokens {n} {count} {max} {total} {query} {selected} {done} {failed} {succeeded} {name} and \\n newlines exactly.
5. Keep translations compact — similar length to the English where possible.
6. Return ONLY a JSON object mapping each key to its ${langName} translation. Escape interior double quotes as \\". No commentary, no code fences.

Strings:
${JSON.stringify(entries, null, 2)}`;
}

function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  return a >= 0 && b > a ? text.slice(a, b + 1) : text.trim();
}

function lenientParse(jsonStr: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  const lineRe = /^\s*"((?:\\.|[^"\\])*)"\s*:\s*"([\s\S]*?)"\s*,?\s*$/;
  let n = 0;
  for (const raw of jsonStr.split('\n')) {
    const line = raw.trim();
    if (!line || line === '{' || line === '}') continue;
    const m = line.match(lineRe);
    if (!m) continue;
    try {
      const key = JSON.parse(`"${m[1]}"`);
      const val = m[2].replace(/\\"/g, '"').replace(/"/g, '\\"');
      out[key] = JSON.parse(`"${val}"`);
      n++;
    } catch { /* skip */ }
  }
  return n > 0 ? out : null;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('no key'); process.exit(1); }
  const client = new Anthropic({ apiKey });
  const en = JSON.parse(await fs.readFile(path.join(LOCALES_DIR, 'en.json'), 'utf8')) as Record<string, string>;

  for (const [code, name] of Object.entries(LANGS)) {
    const p = path.join(LOCALES_DIR, `${code}.json`);
    const cur = JSON.parse(await fs.readFile(p, 'utf8')) as Record<string, string>;
    const stuck = Object.keys(en).filter(
      (k) => (cur[k] === undefined || cur[k] === en[k]) && /[A-Za-z]{3}/.test(en[k]) && !shouldKeep(k),
    );
    if (stuck.length === 0) { console.log(`[${code}] nothing to fix`); continue; }
    process.stdout.write(`[${code}] fixing ${stuck.length} keys… `);

    const CHUNK = 80;
    let fixed = 0;
    for (let i = 0; i < stuck.length; i += CHUNK) {
      const batchKeys = stuck.slice(i, i + CHUNK);
      const batch = Object.fromEntries(batchKeys.map((k) => [k, en[k]]));
      const prompt = buildPrompt(name, batch);
      let parsed: Record<string, string> | null = null;
      for (let attempt = 1; attempt <= 3 && !parsed; attempt++) {
        try {
          const msg = await client.messages.create({
            model: MODEL, max_tokens: 16000,
            messages: [{ role: 'user', content: prompt }],
          });
          const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n');
          const js = extractJson(text);
          try { parsed = JSON.parse(js); } catch { parsed = lenientParse(js); }
        } catch (e) {
          if (attempt === 3) throw e;
          await new Promise((r) => setTimeout(r, 4000 * attempt));
        }
      }
      if (parsed) {
        for (const k of batchKeys) {
          const v = parsed[k];
          if (typeof v === 'string' && v.trim()) {
            if (v !== en[k]) fixed++;
            // Always write: fills keys missing from the locale file even when
            // the model kept the English form (legit for tl loan-words).
            cur[k] = v;
          } else if (cur[k] === undefined) {
            cur[k] = en[k];
          }
        }
      }
    }
    await fs.writeFile(p, JSON.stringify(cur, null, 2) + '\n', 'utf8');
    console.log(`fixed ${fixed}/${stuck.length}`);
  }
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
