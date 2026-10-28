import { getHubCountry } from './hubCountry';

/**
 * 사용 기록을 서버에 남긴다 (`/api/log-usage` → logs/usage.csv, `#stats` 가
 * 읽는다). 다운로드가 끝난 **뒤에** 부르고, 실패해도 조용히 넘어간다 —
 * 기록이 안 남는 건 아쉽지만 사용자의 결과물에는 아무 영향이 없다.
 */
export async function logUsage(rec: {
  builder: 'content-banner' | 'promotion-page';
  item: string;
  detail: string;
  files: number;
  /** 결과 썸네일 폴더 id — `uploadOutput` 과 같은 값 */
  output?: string;
}): Promise<void> {
  try {
    // Builder Hub 에서 고른 국가 — 있으면 서버가 IP 추정 대신 이 값을 찍는다
    const hub = getHubCountry();
    await fetch('/api/log-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hub ? { ...rec, country: hub.country } : rec),
      keepalive: true, // 다운로드 직후 창을 닫아도 전송이 살아남는다
    });
  } catch {
    /* 조용히 무시 */
  }
}

/*
  결과 썸네일 — sales-banner-builder 와 같은 구조. 다운로드한 PNG 마다 긴 변
  600px JPEG 를 만들어 두었다가, ZIP 저장이 끝난 뒤 서버에 올린다. 통계 화면의
  '보기'가 이걸 보여준다. 어느 단계든 실패하면 조용히 빠진다 — 썸네일이 없다고
  다운로드가 막히면 안 된다. 영상(mp4)은 썸네일을 만들지 않는다.
*/

export interface OutputThumb { name: string; blob: Blob }

/** 긴 변 600px JPEG. 원본 PNG 의 1/10 이하라 서버에 계속 쌓아도 부담이 적다. */
export async function makeThumb(png: Blob, longSide = 600): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(png);
    const k = Math.min(1, longSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bmp.width * k));
    canvas.height = Math.max(1, Math.round(bmp.height * k));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff'; // JPEG 는 투명이 없다 — 비치는 곳은 흰색으로
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
  } catch {
    return null;
  }
}

/** 서버가 받는 이름 꼴(영숫자 · - · _ , 80자)로 맞춘다. 공백 같은 건 _ 로. */
export const thumbName = (s: string) =>
  s.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80);

/** 기록 한 줄과 썸네일 폴더를 잇는 ID */
export function newOutputId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 썸네일을 서버에 올린다. 다운로드가 끝난 **뒤에** 부르고, 실패는 조용히 넘어간다.
 * 한꺼번에 다 쏘지 않고 4장씩 — 회사망에서 다른 요청을 막지 않게.
 */
export async function uploadOutput(id: string, thumbs: OutputThumb[]): Promise<void> {
  const queue = [...thumbs];
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      try {
        await fetch(`/api/output?id=${encodeURIComponent(id)}&name=${encodeURIComponent(t.name)}`, {
          method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: t.blob,
        });
      } catch { /* 조용히 무시 */ }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}
