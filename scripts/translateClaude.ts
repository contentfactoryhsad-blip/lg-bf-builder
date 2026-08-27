/**
 * Build-time translation generator — Claude (Anthropic API) variant.
 *
 * Superseded by scripts/translate.ts (Microsoft Translator), which has zero
 * per-run cost within the free tier. Kept as a fallback for cases where the
 * raw-MT engine mistranslates something a prompted LLM would get right
 * (idiomatic phrasing, sub-copy naturalness, sentence-case conventions) —
 * run this for just the affected language(s) and hand-merge if needed.
 *
 * Reads src/locales/en.json (source of truth) and writes one translated JSON
 * per supported language into src/locales/<code>.json using the Anthropic API
 * (Claude). This runs once per text update — the resulting JSONs are bundled
 * into the app, so runtime has zero API dependency and zero ongoing cost.
 *
 * Usage (locally):
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/translateClaude.ts
 *   # or to translate a single language:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/translateClaude.ts ko ja th
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { LANGUAGES, DEFAULT_LANGUAGE } from '../src/app/i18n/languages';
import { getAnthropicApiKey } from '../envUtils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(REPO_ROOT, 'src', 'locales');
const SOURCE_FILE = path.join(LOCALES_DIR, `${DEFAULT_LANGUAGE}.json`);
/** en.json as it stood at the last successful run — see `translateOne`. */
const SNAPSHOT_FILE = path.join(LOCALES_DIR, '.translated-from.json');

async function readJson(file: string): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

const MODEL = 'claude-haiku-4-5';

// Keys per API request. The full set (~570 keys) in one request risks output
// truncation and silent key omissions (merge falls back to English); smaller
// batches keep each response well inside the output limit.
const CHUNK_SIZE = 120;

function buildPrompt(targetName: string, entries: Record<string, string>): string {
  return `You are translating UI strings for a product-card builder web app used by retail marketers. The app generates 1200×1200 px product thumbnails for LG consumer electronics.

Translate the following English strings into ${targetName}. Return ONLY a JSON object that maps each English key to its translation — no commentary, no code fences, no markdown.

Rules:
1. Keep the JSON keys EXACTLY as provided (do not translate the keys).
2. Translate only the values.
3. Preserve any placeholder tokens like {n}, {count}, {max}, {total}, {query}, {succeeded}, {failed} — do NOT translate or remove them.
4. Preserve \\n newline escapes exactly where they appear — they are intentional line breaks on the rendered card.
5. Keep translations roughly similar in length to the source so UI layout doesn't break. For words shown on small thumbnails (icon labels, voucher titles), aim for short, punchy equivalents.
6. TRANSLATE EVERYTHING into ${targetName}. The ONLY things that stay in the Latin alphabet / English are: (a) the standalone brand NAMES "LG", "Lazada", "Shopee"; (b) product model codes like "OLED65G56LS", "FDC309W", "F4Y913BCTA1", "GSLV80PZXF", "ADQ74793513"; (c) internal color-token names like "Warm Gray 01"; (d) numerals/prices/dates like "25%", "11,877.-", "10 FEB 8pm - 10 MAR". EVERYTHING ELSE must be translated — including common English UI words that are often left in English elsewhere. Specifically DO translate: "Download", "Download ZIP", "Download PNG", "Upload", "Fetch", "Product", "URL", "PNG", "ZIP", "Edit", "Crop", "Official Store", "LG Official Store" (translate to "LG " + the ${targetName} words for "Official Store"), "VIP" (translate the descriptive part but VIP may stay VIP if that's the local convention). A brand SLOGAN or descriptive sentence containing a brand name (like "Made with pride, Promised by LG") MUST be translated — keep only "LG" itself as "LG" within the translated sentence, and prefer a polished premium brand-marketing register.
7. For empty-looking values like "sub copy" / "Sub Copy" — translate as the ${targetName} equivalent of the UI phrase, not literally "sub copy" the English words. Avoid awkward calques (e.g. literal "bottom copy") — pick the term a real product designer in ${targetName} would use for a small descriptive sub-line.
8. Use natural, idiomatic ${targetName} that native speakers actually use for software UI and consumer-electronics retail marketing — not a machine-translated literal — but per rule 6, do NOT leave English tech words untranslated; render them in ${targetName} (transliterate into the local script if that is the natural way, e.g. Thai/Chinese).
9. Use the capitalization convention native to ${targetName}. Many languages (Vietnamese, Spanish, Portuguese, Italian, French, etc.) use SENTENCE case for UI strings, not English-style Title Case — translate accordingly even when the English source is Title-Cased.
10. In JSON string values, any internal double-quote character MUST be escaped as \\" . Do not use curly/typographic quotation marks (", ", „) as substitutes — use escaped straight quotes only, otherwise the JSON becomes invalid.
11. "Lorem ipsum..." values are sample placeholder copy shown on a design canvas. Do NOT keep them as Latin — replace with a short, natural-sounding ${targetName} sample phrase of similar length that a designer would use as dummy headline/body text (generic, not product-specific).
12. Product/model codes ("OLED65G56LS", "FDC309W", "F4Y913BCTA1", "GSLV80PZXF", "ADQ74793513") always stay EXACTLY as-is. In "e.g. ..." example strings, translate only the "e.g." prefix convention into the ${targetName} equivalent and keep the code untouched.
13. Keys that are pure UI spec labels with dimensions (e.g. "Profile Image-600x600", "LAZ Store Header Image-PC-1200x128") — translate the descriptive words but keep the dimension suffix exactly.

Strings to translate:
${JSON.stringify(entries, null, 2)}`;
}

function extractJson(text: string): string {
  // Model occasionally wraps output in code fences despite instructions.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

// Lenient fallback parser for when JSON.parse fails on a model response whose
// only defect is unescaped double-quotes INSIDE values (the recurring Haiku
// failure mode). We parse line-by-line as `"key": "value",` and re-escape any
// interior quotes in the value before assembling the object. Keys are known-safe
// (they're our own English strings, echoed back), so we only repair values.
function lenientParse(jsonStr: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  const lineRe = /^\s*"((?:\\.|[^"\\])*)"\s*:\s*"([\s\S]*?)"\s*,?\s*$/;
  let matched = 0;
  for (const rawLine of jsonStr.split('\n')) {
    const line = rawLine.trim();
    if (!line || line === '{' || line === '}') continue;
    const m = line.match(lineRe);
    if (!m) continue;
    try {
      const key = JSON.parse(`"${m[1]}"`);
      // Re-escape stray unescaped quotes in the captured value.
      const safeVal = m[2].replace(/\\"/g, '"').replace(/"/g, '\\"');
      out[key] = JSON.parse(`"${safeVal}"`);
      matched++;
    } catch {
      /* skip unrepairable line */
    }
  }
  return matched > 0 ? out : null;
}

// One chunk request + parse. Haiku occasionally emits an unescaped quote that
// breaks JSON.parse; that's transient, so retry the whole chunk a couple times
// before giving up (each retry is a fresh sample).
async function translateChunk(
  client: Anthropic,
  langCode: string,
  langName: string,
  chunk: Record<string, string>,
): Promise<Record<string, string>> {
  const prompt = buildPrompt(langName, chunk);
  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let msg: Anthropic.Message;
    try {
      msg = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (err) {
      // Transient network failure — back off and retry the chunk.
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) {
        process.stdout.write(`(conn retry ${attempt}) `);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
        continue;
      }
      throw err;
    }
    if (msg.stop_reason === 'max_tokens') {
      throw new Error(`[${langCode}] response truncated at max_tokens — reduce CHUNK_SIZE`);
    }
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const jsonStr = extractJson(text);
    try {
      return JSON.parse(jsonStr);
    } catch (err) {
      lastErr = err;
      // Before spending another API call, try to salvage this response with the
      // lenient line parser — most failures are just unescaped interior quotes.
      const salvaged = lenientParse(jsonStr);
      if (salvaged && Object.keys(salvaged).length >= Object.keys(chunk).length * 0.8) {
        process.stdout.write('(salvaged) ');
        return salvaged;
      }
      if (attempt < MAX_ATTEMPTS) {
        process.stdout.write(`(retry ${attempt}) `);
        continue;
      }
      console.error(`\n[${langCode}] Failed to parse JSON after ${MAX_ATTEMPTS} attempts. Raw response:`);
      console.error(text);
    }
  }
  throw lastErr;
}

/**
 * Hand corrections, applied after the model and before writing.
 *
 * For strings the machine gets wrong in a way no prompt reliably fixes — a word
 * whose sense depends on our domain, or a term of art that has to match the
 * tool the designer already knows. Editing the locale JSON directly is not an
 * option: the next run rewrites the file whole.
 *
 * Note beside each one WHAT the machine produced and why it is wrong, or the
 * entry becomes unreviewable.
 */
const OVERRIDES: Record<string, Record<string, string>> = {
  th: {
    // Every "copy" here is advertising copy. The model read them as "a
    // duplicate" (สำเนา) or "to duplicate" (คัดลอก). Set as ข้อความ, which is
    // what the sibling keys already use — Sub copy is ข้อความรอง.
    'Copy': 'ข้อความ',
    'COPY 1': 'ข้อความ 1',
    'COPY 2': 'ข้อความ 2',
    'Copy color': 'สีข้อความ',
    'Rewrite copy': 'เขียนข้อความใหม่',
    // The section sets a direction, so say so — Photoshop's "Global Light" is
    // jargon, and the machine read the "global" in it as "worldwide" (ทั่วโลก).
    'Light direction': 'ทิศทางแสง',
    // A and B are asset names, matching Podium A/B beside them. The model
    // localised the letters to Thai (ก/ข) here but not there.
    'Object A': 'วัตถุ A',
    'Object B': 'วัตถุ B',
    // The canvas shape, against "wide". สี่เหลี่ยม is any quadrilateral.
    'square': 'จัตุรัส',
    // Warranty at an LG service centre, not a generic guarantee.
    'Official Warranty': 'รับประกันศูนย์',
    // Value prop 5, in a 130px label capped at 2 lines. สิทธิประโยชน์โปรโมชัน
    // takes 3 of them in ShopeeFont Rounded — the widest of the Thai faces —
    // and clipped. This says the same thing and fits in all three.
    'Promotion Benefits': 'สิทธิพิเศษโปรโมชัน',
    // The KV / KV+Product list head copy placeholder, 72px in a 1040px box
    // capped at 2 lines. The \n put a break in the right place, but the first
    // segment alone was wider than the box, so it wrapped to three and clipped
    // in both LG and Shopee. Shorter halves, same "sample text for design".
    'Lorem ipsum dolor sit amet,\nconsectetur adipiscing elit': 'ข้อความตัวอย่าง\nสำหรับงานออกแบบ',
    // Voucher ticket 1, 40px in a 260px box capped at 2 lines. ลดราคา pushed
    // the second line to wrap into a third; ลด alone says the same and matches
    // the Off on the small voucher cards.
    'Up to\n$240* Off': 'สูงสุด\n$240* ลด',
    // The "Off" printed after a voucher's price ("$40 Off") — a discount, not
    // a power state. The model had it as ปิด, i.e. switched off, set in 30px
    // on the black voucher cards.
    'Off': 'ลด',
    '"Off" label': 'ป้ายกำกับ "ลด"',
    // "Voucher" came back five different ways across one module, and two of
    // the transliterated spellings were not even Thai: วาউเชอร์ carries a
    // BENGALI U (U+0989) and วาउเชอร์ a DEVANAGARI U (U+0909), both mid-word,
    // both printed on artwork. Settle every one of them on บัตรลดราคา —
    // Sohee's call, and already what Store Voucher came back as.
    'Promotion Vouchers': 'บัตรลดราคาโปรโมชัน',
    'Limited Time Vouchers': 'บัตรลดราคามีระยะเวลาจำกัด',
    'Member-exclusive Voucher': 'บัตรลดราคาเฉพาะสมาชิก',
    'Member-exclusive Voucher Drop': 'บัตรลดราคาเฉพาะสมาชิกแบบจำกัด',
    'Join as a member for free and enjoy a special voucher': 'เข้าร่วมเป็นสมาชิกฟรีและรับบัตรลดราคาพิเศษ',
    'Other Vouchers': 'บัตรลดราคาอื่นๆ',
    'Store Voucher': 'บัตรลดราคาของร้าน',
    // Without พร้อม ("with"): at 24px the full phrase needs 295px in a 260px
    // label and ellipsises. The + between the tickets already says "with", and
    // dropping it makes this parallel to the store's card beside it.
    'with Platform Voucher': 'บัตรลดราคาแพลตฟอร์ม',
    'Voucher': 'บัตรลดราคา',
    'Number of vouchers': 'จำนวนบัตรลดราคา',
    'Group 1 — Ticket vouchers': 'กลุ่มที่ 1 — บัตรลดราคาแบบตั๋ว',
    'Group 2 — Member voucher': 'กลุ่มที่ 2 — บัตรลดราคาสมาชิก',
    'Group 3 — Small vouchers': 'กลุ่มที่ 3 — บัตรลดราคาขนาดเล็ก',
    // The 2026-08-13 run scattered it again, this time as คูปอง (coupon) on the
    // plural and on every panel label — so one section header said คูปอง while
    // the rows under it said บัตรลดราคา. Singular and plural of one word cannot
    // be two different words.
    'Vouchers': 'บัตรลดราคา',
    'Number of Vouchers': 'จำนวนบัตรลดราคา',
    'Voucher {n}': 'บัตรลดราคา {n}',
    'Vouchers (Max 3)': 'บัตรลดราคา (สูงสุด 3)',
    'Vouchers (0–4)': 'บัตรลดราคา (0–4)',
    // The placeholder tells the user to type "Store Voucher"; it has to name it
    // the way the artwork will set it.
    'e.g. Store Voucher': 'ตัวอย่าง บัตรลดราคาของร้าน',
    'Gradient background + Key visual + Voucher list': 'พื้นหลังแบบไล่สี + ภาพหลัก + รายการบัตรลดราคา',
    'Text exceeds the voucher area. Please shorten sub copy or discount/price.':
      'ข้อความเกินพื้นที่บัตรลดราคา โปรดย่อข้อความย่อหรือส่วนลด/ราคา',
    // "session" came back as เซッชั่น — a JAPANESE small tsu (U+30C3) inside a
    // Thai word. This one is live, in the off-site shared-settings note.
    'Changing any of these updates every banner in this session.':
      'การเปลี่ยนแปลงใด ๆ เหล่านี้จะอัปเดตแบนเนอร์ทุกแบนเนอร์ในเซสชันนี้',
    // These came back in JAPANESE (イベント), with a leading space on the bare one.
    'Event': 'กิจกรรม',
    'VIP Event': 'กิจกรรม VIP',
    // Rank badges. 1st–3rd already came back as bare numerals, and the badge
    // is a numeral in the art, so keep 4th–6th in step — a "อันดับ 4" next to
    // a "3" is the mismatch that Object A/B ran into.
    '4th': '4',
    '5th': '5',
    '6th': '6',
  },
};

async function translateOne(
  client: Anthropic,
  langCode: string,
  langName: string,
  source: Record<string, string>,
  existing: Record<string, string>,
  snapshot: Record<string, string>,
  retranslateAll: boolean,
): Promise<Record<string, string>> {
  const keys = Object.keys(source);
  // Only what is new or whose English has changed since it was last translated.
  //
  // The model is not deterministic, so translating everything every time
  // re-rolls copy that was already reviewed and signed off: one added key once
  // rewrote 298 live strings, and some came back worse — a hint text picked up a
  // duplicated word and lost its comma. Nothing here is cheaper than not asking.
  const stale = retranslateAll
    ? keys
    : keys.filter((k) => !(k in existing) || snapshot[k] !== source[k]);
  const reused = keys.length - stale.length;
  if (reused > 0) console.log(`\n[${langCode}] reusing ${reused} existing translation(s), ${stale.length} to do`);

  const parsed: Record<string, string> = {};
  for (let i = 0; i < stale.length; i += CHUNK_SIZE) {
    const chunkKeys = stale.slice(i, i + CHUNK_SIZE);
    const chunk = Object.fromEntries(chunkKeys.map((k) => [k, source[k]]));
    const result = await translateChunk(client, langCode, langName, chunk);
    Object.assign(parsed, result);
    process.stdout.write(`${Math.min(i + CHUNK_SIZE, stale.length)}/${stale.length} `);
  }

  // Merge: every source key gets a value, and only source keys survive — a key
  // deleted from en.json goes with it. Fresh translation wins, then the existing
  // one, then the English itself.
  const merged: Record<string, string> = {};
  const missed: string[] = [];
  for (const key of keys) {
    if (stale.includes(key) && parsed[key] === undefined) missed.push(key);
    merged[key] = parsed[key] ?? existing[key] ?? source[key];
  }
  if (missed.length > 0) {
    console.warn(`\n[${langCode}] ${missed.length} key(s) missing from model output (fell back to English):`);
    missed.slice(0, 10).forEach((k) => console.warn(`  - ${JSON.stringify(k)}`));
  }

  const overrides = OVERRIDES[langCode] ?? {};
  const applied = Object.keys(overrides).filter((k) => k in merged);
  applied.forEach((k) => { merged[k] = overrides[k]; });
  if (applied.length > 0) console.log(`\n[${langCode}] ${applied.length} hand override(s) applied`);
  // An override for a key that no longer exists has outlived the string it was
  // written for — say so, or it rots unnoticed.
  Object.keys(overrides)
    .filter((k) => !(k in merged))
    .forEach((k) => console.warn(`[${langCode}] override for a key not in en.json: ${JSON.stringify(k)}`));

  return merged;
}

async function main() {
  // Same resolution the dev server uses: env first, then .env.local — so this
  // runs without prefixing the key on every invocation.
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set (checked env and .env.local). Aborting.');
    process.exit(1);
  }

  const source = JSON.parse(await fs.readFile(SOURCE_FILE, 'utf8')) as Record<string, string>;
  const sourceKeyCount = Object.keys(source).length;
  console.log(`Source: ${SOURCE_FILE} (${sourceKeyCount} keys)`);

  // Allow CLI to limit which languages to translate. `--all` forces every key
  // to be re-translated instead of only what changed.
  const argv = process.argv.slice(2);
  const retranslateAll = argv.includes('--all');
  const cliTargets = argv.filter((a) => !a.startsWith('--'));
  const targets = LANGUAGES.filter((l) => l.code !== DEFAULT_LANGUAGE)
    .filter((l) => cliTargets.length === 0 || cliTargets.includes(l.code));

  console.log(`Translating into ${targets.length} language(s): ${targets.map((l) => l.code).join(', ')}`);
  if (retranslateAll) console.log('--all: re-translating every key\n'); else console.log('');

  // The English each existing translation was made from. Without it, an edit to
  // a value in en.json that leaves its key alone would never be noticed — and
  // one key does differ from its value today ("OBS Only" → "OBS only"), so the
  // key alone cannot stand in for the source.
  const snapshot = await readJson(SNAPSHOT_FILE);

  const client = new Anthropic({ apiKey });
  await fs.mkdir(LOCALES_DIR, { recursive: true });

  let wrote = false;
  for (const lang of targets) {
    const outPath = path.join(LOCALES_DIR, `${lang.code}.json`);
    process.stdout.write(`[${lang.code}] ${lang.name}… `);
    const start = Date.now();
    try {
      const existing = await readJson(outPath);
      const translated = await translateOne(
        client, lang.code, lang.name, source, existing, snapshot, retranslateAll,
      );
      await fs.writeFile(outPath, JSON.stringify(translated, null, 2) + '\n', 'utf8');
      wrote = true;
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`done in ${elapsed}s → ${path.relative(REPO_ROOT, outPath)}`);
    } catch (err: any) {
      console.log('FAILED');
      console.error(`  ${err?.message ?? err}`);
      process.exitCode = 1;
    }
  }

  // Only after a successful write, or a failed run would mark keys as done.
  if (wrote && process.exitCode !== 1) {
    await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(source, null, 2) + '\n', 'utf8');
  }

  console.log('\nAll done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
