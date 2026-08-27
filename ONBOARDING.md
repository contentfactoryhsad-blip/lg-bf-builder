# LG Retail OBS Content Builder — 기능 정리

LG 리테일 마켓플레이스(Lazada/Shopee 등) 노출용 제품 이미지·배너를 브라우저에서 자동 생성하는 웹앱. URL 입력 → 이미지 크롤링 → 템플릿 편집 → PNG 다운로드 워크플로를 제공한다.

## 공통 기반 (Cross-cutting)

- **이미지 크롤링**: 제품 페이지 URL을 붙여넣으면 서버(`/api/crawl-page`)가 HTML을 파싱해 제품 이미지 후보를 추출. og:image / JSON-LD / 갤러리 셀렉터 / `<img>` / `<picture>` / background-image 등에서 수집, 프로모션 배너·GNB·트래킹 픽셀은 필터링 (최대 80장).
- **CORS 프록시**: `/api/proxy-image?url=...` 로 외부 이미지를 우회 로드.
- **이미지 크롭**: `react-easy-crop` 기반 모달, 템플릿별 종횡비 고정 + 줌 슬라이더, 업로드 후 재크롭 지원.
- **에셋 라이브러리**: 별도 assets repo + jsDelivr CDN 기반 공용 에셋 picker (썸네일 인라인 로딩).
- **배경 제거 / 브러시 마스크**: `@imgly/background-removal` 동적 import + 브러시 편집기.
- **PNG 내보내기**: `html-to-image`로 1:1 픽셀 렌더, 폰트·이미지 로드 보장을 위한 워밍업 패스 + cache-bust. 파일명에 `YYMMDD` 날짜 스탬프.
- **다국어(i18n)**: 10개 로케일 — `en, th, vi, id, ms, tl, zh-TW, zh, pt, es`. 빌드 타임 번역(`scripts/translate.ts`), 언어별 독립 상태 슬롯(편집 중 언어 잠금).
- **텍스트 제약 룰러**: 입력 시점에 숨겨진 ruler로 폰트 메트릭 측정 → 최대 줄 수/너비 초과 입력 차단.

---

## 1. Product Card Builder (제품 썸네일)

**산출물**: 1200 × 1200 px PNG

3종 템플릿:

| 템플릿 | 배경 | 주요 구성 |
|--------|------|-----------|
| **Default** | 웜그레이 (#F0ECE4) | 제품 이미지 + Feature & Benefit 블록 0~5개 |
| **Promotion Ver.1** | 그라데이션 (Lazada Pink / Shopee Orange 프리셋 + 커스텀) | 제품 + KV 이미지(1:1) + 기간 텍스트 + 바우처 1~3개 |
| **Promotion Ver.2** | 그라데이션 | 제품 + Feature & Benefit 블록 0~5개 + 로고(높이 64px 고정) + 할인 텍스트 |

**편집 기능**
- 제품 이미지: URL fetch 갤러리 선택 또는 직접 업로드 → 크롭.
- Feature & Benefit 블록: 블록별 이미지/아이콘 타입 토글, 아이콘 picker(42종), 텍스트(카드 기준 최대 3줄, 실시간 측정), 아이콘 선택 시 라벨 자동 입력.
- Promo1 바우처: 개수(1~3), 타이틀·할인값·서브카피, 서브카피 위치(좌/우), 너비 초과 차단.
- 그라데이션 프리셋 + 커스텀 컬러 피커.

---

## 2. Bulk Generator (대량 생성)

**산출물**: ZIP (1200 × 1200 PNG 다수)

4단계 플로우:
1. **URL 입력**: 여러 제품 페이지 URL 입력 (행 추가/삭제).
2. **편집**: URL별 병렬 이미지 fetch → 첫 이미지 자동 주입, 카드별 개별 편집(단일 에디터와 동일).
3. **선택**: 썸네일 그리드, 카드별 템플릿 지정, 선택/해제, 클릭 재편집.
4. **ZIP 다운로드**: 일괄 렌더 후 압축 다운로드.

---

## 3. Brand Shop Page Builder (브랜드샵 페이지)

브랜드샵 페이지를 5개 섹션으로 나눠 각각 편집. 섹션별 PNG/ZIP 산출.

### 3-1. Brand Trust Section
신뢰도·브랜드 가치 배너. 4개 템플릿 변형.

| 변형 | 사이즈 | 특징 |
|------|--------|------|
| BT01 | 1200×320 | 헤드카피 단일 배너 (최대 2줄) |
| BT02 | 1200×320 | 헤드카피 + 서브카피(구분선 토글) |
| BT03 | 1200×320 | 아이콘+텍스트 블록 **3~7개 선택**, 슬롯별 아이콘 드롭다운(7종), 중복 아이콘 차단, 중앙 정렬 |
| BT04 | 1200×262 | Multi-clickable 제품 버튼 3~5개 (이미지 fetch+크롭+라벨) |

### 3-2. Membership Section
멤버십 혜택 배너. 2종:
- **Default**: 1200 × 628 (Yes 경로)
- **Square**: 1200 × 1200 (No 경로)

### 3-3. Big Promotion Section
대형 프로모션 캠페인 배너. **5개 배너 × 9개 컬러 테마** (red, green, purple, brown, Shopee Orange, Lazada Pink, warm-gray 3종). 테마 토큰 + `setColorTheme` 자동 전파. 배너별 제품/KV 이미지·헤드/서브카피·로고·CTA·바우처 편집.

### 3-4. Other Promotions Section
추가 프로모션 배너. **산출물 1200 × 628 PNG (다중 인스턴스 → ZIP)**. 2개 변형:
- **Promotion Theme Version**: 제품 이미지 + 테마 오브젝트 + 플러스 사인, 배너 내 드래그/리사이즈/회전, 스마트 가이드 스냅, 프리셋 6종.
- **Lifestyle Image Version**: 라이프스타일 이미지 기반.

이미지를 IMAGE_SECTION 경계 너머로 키워도 시각적으로는 섹션 안에서만 클립되어 보임 (edit box는 경계 밖까지 노출).

### 3-5. Must Have LG Section
플래그십 제품 스포트라이트. 폭 1200px 고정, 제품 카드 **최대 6개(2열)** — 카드 수에 따라 높이 가변. 카드별 이미지 위치 드래그/스크롤 조정.

---

## 4. ID Banner Builder (Lazada 인도네시아 배너)

PC + MO 사이즈 동시 생성, ZIP 다운로드.

| 변형 | PC | MO | 특징 |
|------|----|----|------|
| **Default** | 1200×300 | 702×320 | 웜그레이 배경 정적 레이아웃 |
| **Promotion** | 1200×300 | 702×320 | 9개 컬러 테마, single panel 편집 → PC/MO 공유 반영 |

---

## 실행

```bash
npm run dev     # Vite dev 서버 (API 미들웨어 포함) — localhost:5173
npm run build   # 프로덕션 빌드 → dist/
```

배포: Railway (https://lg-retail-obs.ax4squad.dev)
