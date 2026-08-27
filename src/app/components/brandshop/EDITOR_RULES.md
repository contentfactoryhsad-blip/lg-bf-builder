# Brand Shop Editor Rules

## Head Copy 2-line limit

- 배너 copy area 기준: width 600px, font 52px LGEI Headline, weight 600, lineHeight 1.24
- 자동 줄바꿈(`pre-wrap` + `word-break: break-word`) 허용
- 배너 기준 총 2줄 초과 시 입력 차단
- Enter는 줄바꿈으로 인식, 2번 이상 불가
- **측정 방식**: ruler div를 컴포넌트에 항상 마운트(fixed, top:-9999px)해 line1+`\n`+line2를 하나의 div로 측정
  - 폰트가 로드된 후 측정되므로 정확
  - `Math.round(height / (52 * 1.24))`로 줄 수 계산
  - line1 + line2 각각 측정하지 말 것 (결합해서 측정해야 정확)

## 브랜드 폰트 전환의 영향

Head Copy 2줄 제한은 **활성 출력 폰트 기준으로 측정된다** — ruler div가
`var(--obs-font)`를 쓰므로, Shopee/Lazada를 고르면 같은 문구라도 줄 수가 달라질 수 있다.
52px / weight 600 / lineHeight 1.24 라는 기준 자체는 그대로지만, 글자폭이 서체마다 달라서
**2줄 예산은 폰트에 따라 달라진다**. 이건 의도된 동작이다 — ruler를 LGEI로 고정하면
Shopee에서 실제로는 3줄인 문구가 2줄로 통과해 잘린 채 export된다.
