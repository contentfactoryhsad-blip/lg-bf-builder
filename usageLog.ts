/**
 * 다운로드 사용 기록 — sales-banner-builder 의 usage 로그를 이 레포에 맞게
 * 옮긴 것. 두 빌더(Content Banner Builder / Promotion Page Builder)가 한
 * CSV 에 쌓고, `#stats` 화면이 탭으로 나눠 본다.
 *
 * 개발(vite-api-plugin.ts)과 운영(server.ts)이 **이 한 벌을 같이 쓴다** —
 * 두 곳에 복사해 두면 반드시 갈라진다.
 *
 * 기록 파일 위치. 기본은 프로젝트 안의 logs/ 인데, Railway 처럼 컨테이너
 * 디스크가 임시인 곳은 재배포 때 통째로 사라진다. 영구 볼륨을 붙이고
 * USAGE_DIR 을 그 경로로 지정하면 남는다. 예) USAGE_DIR=/data
 */
import fs from 'node:fs/promises';
import path from 'node:path';

/** 다운로드 한 번 = 한 줄. */
export interface UsageRecord {
  /** 'content-banner' | 'promotion-page' — 통계 화면의 탭 축. */
  builder: string;
  /** CBB: 고른 에셋 id (kv-main…) · 프로모션 페이지: 'deal-page'. */
  item: string;
  /** CBB: 채널 키 (lgcom/lazada…) · 프로모션 페이지: 'motion' | 'static'. */
  detail: string;
  /** ZIP 에 담긴 파일 수. */
  files: number | string;
}

const USAGE_CSV = path.join(process.env.USAGE_DIR || path.join(process.cwd(), 'logs'), 'usage.csv');
const USAGE_HEADER = 'time,country,region,ip,builder,item,detail,files\n';

/** 프록시 뒤에 있어도 원래 클라이언트 IP 를 찾는다. */
export function clientIp(headers: Record<string, string | string[] | undefined>, fallback?: string): string {
  const fwd = headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  const ip = (first?.split(',')[0] || (headers['x-real-ip'] as string) || fallback || '').trim();
  return ip.replace(/^::ffff:/, '');
}

/** 마지막 자리를 지운다 — IPv4 는 마지막 옥텟, IPv6 는 뒤쪽 블록. */
function maskIp(ip: string): string {
  if (ip.includes(':')) {
    const b = ip.split(':');
    return b.length > 4 ? b.slice(0, 4).join(':') + '::' : ip;
  }
  const p = ip.split('.');
  return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.0` : ip;
}

/**
 * IP → 국가. 사설망이면 조회할 것도 없이 'local'. 외부 조회는 2초만 기다리고,
 * 실패하면 'unknown' — 조회 실패 때문에 기록 자체를 잃으면 안 된다.
 */
async function lookupCountry(ip: string): Promise<{ country: string; region: string }> {
  if (!ip || /^(10\.|192\.168\.|127\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd)/.test(ip)) {
    return { country: 'local', region: '' };
  }
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode,country,regionName`, { signal: ac.signal });
    clearTimeout(t);
    if (!res.ok) return { country: 'unknown', region: '' };
    const j = (await res.json()) as { countryCode?: string; regionName?: string };
    return { country: j.countryCode || 'unknown', region: j.regionName || '' };
  } catch {
    return { country: 'unknown', region: '' };
  }
}

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 한 줄 덧붙인다. 파일이 없으면 헤더부터 만든다. */
export async function appendUsage(rec: Partial<UsageRecord>, ip: string): Promise<void> {
  const { country, region } = await lookupCountry(ip);
  const row = [
    new Date().toISOString(), country, region, maskIp(ip),
    rec.builder ?? '', rec.item ?? '', rec.detail ?? '', rec.files ?? '',
  ].map(csvCell).join(',') + '\n';

  await fs.mkdir(path.dirname(USAGE_CSV), { recursive: true });
  try { await fs.access(USAGE_CSV); }
  catch { await fs.writeFile(USAGE_CSV, USAGE_HEADER, 'utf8'); }
  await fs.appendFile(USAGE_CSV, row, 'utf8');
}

/**
 * 기록을 처음부터 다시 센다 — 기존 CSV 는 지우지 않고 같은 폴더에
 * `usage-until-<시각>.csv` 로 옮겨 둔다. 옮긴 파일 이름을 돌려준다
 * (기록이 없었으면 null).
 */
export async function resetUsage(): Promise<string | null> {
  try { await fs.access(USAGE_CSV); }
  catch { return null; }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backup = path.join(path.dirname(USAGE_CSV), `usage-until-${stamp}.csv`);
  await fs.rename(USAGE_CSV, backup);
  await fs.writeFile(USAGE_CSV, USAGE_HEADER, 'utf8');
  return path.basename(backup);
}

/** 모인 CSV 를 통째로 (없으면 헤더만). */
export async function readUsage(): Promise<string> {
  try { return await fs.readFile(USAGE_CSV, 'utf8'); } catch { return USAGE_HEADER; }
}

/** CSV → 행 객체 배열. 통계 화면이 쓴다. */
export async function readUsageRows(): Promise<Record<string, string>[]> {
  const text = await readUsage();
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const head = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
  });
}

/**
 * 열쇠 검사. 'no-key' = 서버에 USAGE_KEY 미설정(아무도 못 본다),
 * 'mismatch' = 값이 다르다. 나눠야 화면에서 원인을 바로 안다.
 */
export function checkUsageKey(given: unknown): 'ok' | 'no-key' | 'mismatch' {
  const clean = (v: unknown) => String(v ?? '').trim().replace(/^["']|["']$/g, '');
  const key = clean(process.env.USAGE_KEY);
  if (!key) return 'no-key';
  return clean(given) === key ? 'ok' : 'mismatch';
}

/**
 * 내려받을 CSV — 파일에는 UTC(ISO)로 남기고, 내려줄 때만 원하는 시간대로
 * 바꾼다. 헤더에 어느 시간대인지 적어 둔다.
 */
export async function readUsageIn(tz = 'Asia/Seoul'): Promise<string> {
  const text = await readUsage();
  const lines = text.split('\n');
  if (lines.length < 2) return text;

  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  } catch { return text; }

  const head = lines[0].split(',');
  const i = head.indexOf('time');
  if (i < 0) return text;
  head[i] = `time (${tz})`;

  const body = lines.slice(1).map((line) => {
    if (!line.trim()) return line;
    const cells = line.split(',');
    const d = new Date(cells[i]);
    if (!Number.isNaN(d.getTime())) cells[i] = fmt.format(d);
    return cells.join(',');
  });
  return [head.join(','), ...body].join('\n');
}
