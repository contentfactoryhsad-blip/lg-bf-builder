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
}): Promise<void> {
  try {
    await fetch('/api/log-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rec),
      keepalive: true, // 다운로드 직후 창을 닫아도 전송이 살아남는다
    });
  } catch {
    /* 조용히 무시 */
  }
}
