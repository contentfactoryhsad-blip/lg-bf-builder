# Changelog

작업 세션 단위로 정리한 변경 이력. 커밋 해시는 `main` 브랜치 기준.

## 2026-08-21

### Deal Page Builder 신설 — www.lg.com Deal Page
Figma `fUup3vSq71f6eUIRpmzz8s` 프레임 `1:1212`("ExporttoFigma | www.lg.com | Deal Page")를
Shop in Shop과 **같은 아키텍처**(모듈 레지스트리 → 기본 상태 → 렌더러 → 편집 패널 → 드래그 캔버스 → ZIP export)로 이식.
마켓플레이스 업로드 슬롯(1200px)이 아니라 lg.com 자체 페이지 컨테이너(**1713px**)가 출력 규격이라
`uploadModule` 개념이 없고, 모든 모듈이 1713 폭으로 렌더된다.

- 새 파일 `components/dealpage/` — `dealModuleRegistry.ts`(9개 모듈), `dealEditStates.ts`, `DealModuleRenderer.tsx`,
  `DealModuleEditPanel.tsx`, `DealPageBuilder.tsx`. draft 페이로드는 `drafts/dealPagePayload.ts`(`deal-page` BuilderKey).
- 모듈: Site header(free) / Hero KV(1713×642) / Deal cards(free) / Promotion banner(1713×496) / Time Sale(1713×398) /
  Product list(free) / Category nav(free) / Site footer(1713×848).
- Quick Start 프리셋 2종 — "Template for Deal Page"(Figma 원본 13섹션 그대로, 위치별 override로 Hot Deals·Bundles 배너까지 재현)
  와 "Template for Short Deal Page".
- 컬러는 Figma export PNG에서 직접 샘플링: 페이지 배경 `#F0ECE4`, deal red `#EA1917`(앱 크롬의 `#FD312E`와 다름),
  배지 그라디언트 `#E31619→#C70C25`, 배송 pill `#FFEDE0`, hairline `#DFDFDF`.
- 에셋은 `public/deal-page/` — 히어로 KV / 오브제 4종(clock·cube·puzzle·gift)은 Figma raw image,
  카테고리 아이콘·별점·외부링크 아이콘은 Figma SVG export. 상품 사진 기본값은 기존 `store-modules/kvpl-product*.png` 재사용.
- **공홈 크롬 2종 추가** — `Site header`(1713×134: LG 로고 + GNB + Business + Search/계정/장바구니 + breadcrumb, Figma `1:1214`/`1:1267`)와
  `Site footer`(1713×848: 고지문 2줄 + 링크 6컬럼 + 로케일/소셜 + 다크 legal bar, Figma `1:3102`). 두 프리셋 모두 앞뒤에 자동으로 깔린다.
  로고·검색/계정/장바구니 클러스터·하단 배지는 Figma export 이미지 그대로 쓰는 고정 크롬이고, 나머지 문구는 전부 편집 가능.
- **오브제 아트는 `mix-blend-mode: screen`으로 합성한다.** clock/cube/puzzle/gift는 각자 near-black 배경을 가진 정사각 렌더라
  카드·배너에 얹으면 정사각 이음매가 보인다. screen은 검정을 지우므로 어떤 크기로 놓아도 검은 띠에 녹는다.
  **단 시계(Time Sale)만 예외** — 배경이 중간 회색이라 screen으로 안 지워져서 좌측 페이드 마스크로 처리했다.
- **검증 하네스 `deal-preview.html`** — vite dev로 서빙되는 루트 하네스. 8개 모듈을 1713px로 세로로 쌓아 렌더한다.
  `fonts.css`를 import하고 `--obs-font*`를 직접 세팅하므로 폴백 폰트로 재는 사고가 안 난다(CLAUDE.md 검증 규칙 참고).
  캡쳐: `npx playwright screenshot --channel chrome --full-page --viewport-size "1760,1000" --wait-for-timeout 4000 http://localhost:5174/deal-preview.html out.png`
  (`vite build`는 `index.html`만 엔트리로 잡으므로 배포물에는 안 들어간다.)
- 편집 패널의 필드 atom(`TextField`/`ToggleField`/`ImageField`/`CountSelector`)은 `ModuleEditPanel.tsx`에서 import하지 않고
  이 폴더에 재선언 — 3.5k줄짜리 마켓플레이스 전용 패널이 lazy 청크에 딸려오는 걸 피하기 위해서다.
  `ShowToggle`/`ImageCropModal`은 이미 공용이라 그대로 재사용.

### Deal Page — Figma 실측치로 전면 재작업 (같은 날 2차)
1차는 스크린샷에서 눈대중으로 잡은 값이 많아서 원본과 어긋났다. `get_design_context`로 노드별 변수를 다시 읽어 전부 교체.

- **`dealTokens.ts` 신설** — 타입/컬러/라디우스를 Figma 변수 그대로 상수화. lg.com Deal Page는 **타입 스케일이 아주 납작하다**:
  섹션 타이틀·배너 헤드라인·히어로 H1이 **전부 56/60 weight 400** 한 종류고, 본문은 20/24 weight 400이다.
  1차에서 40px semibold로 잡았던 게 가장 큰 오차였다.
- **라디우스 누락 수정** — `radius/28`(딜 카드·프로모 배너·타임세일), 상품카드 16, 버튼 8, 배지/배송 pill 4. 1차엔 전부 8이었다.
- **딜 카드 아트 배치** — 프레임 `1:1311`은 아트를 카드의 **179.27% × 193.89%** 크기로 `-39.82% / -61.05%` 위치에 깐다.
  오브제가 프레임 위쪽에 걸려 조명처럼 읽히는 게 이 수치 때문이다. 1차의 `mix-blend-mode: screen` 합성은 불필요해져서 제거.
  카드 바닥은 `#505050`(`1:1310`), 버튼은 흰 배경 + `#94928D` 보더 + 44 높이.
- **배너 아트는 오브제가 아니라 통짜 KV였다** — `1:1446`/`1:1502`/`1:2461`/`1:2674`/`1:2878`을 각각 export해서
  `banner-exclusive`(1600×400) / `banner-time-sale`(1600×350) / `banner-hot-deals`·`banner-bundles`·`banner-gifts`(1600×320)로 저장.
  Exclusive offer 배너의 제품 썸네일 4개도 이 KV 안에 들어있다(1차에 못 찾던 것).
- **배너 높이 2종** — 히어로 옆 exclusive는 400(`1:1388`), 아래쪽 Hot Deals/Bundles/Gifts는 320(`1:2460` 등).
  `DealBannerSize`로 편집 패널에서 고른다.
- **누락 섹션 `Deal tabs` 추가**(`1:1486`) — Time Sale / Hot Deals / Bundles / Gift 4탭, 1440 레일에 상하 hairline,
  활성 탭 아래 4px `#EA1917`. 프리셋에서 exclusive 배너와 타임세일 사이에 들어간다.
- **Time Sale 카운트다운** — 숫자 80/80, 라벨 24/28, 유닛 피치 127.66 (`1:1510`). 1차는 56px/14px이었다.
- **상품 카드** — 이름 20/24, 배지는 3-stop 대각 그라디언트(`#FF681C→#EA1917→#A50034`), 배송 pill 텍스트 `#934B01`,
  **"Learn more"는 아웃라인 버튼이 아니라 그냥 텍스트 링크**, "Buy now"는 162×44. 카드 폭은 342 **고정**이고
  행은 좌측 정렬이라 3개일 때 오른쪽이 비는 게 정상이다(늘리면 안 된다).
- 기본 상품 사진도 Figma의 실제 냉장고 컷으로 교체.

### 🔴 캔버스 폭을 1713 → 2280으로 (Figma 아트보드 폭)
Deal Page의 모든 섹션은 **2280 폭 밴드**이고 1713은 그 안에 가운데 놓인 컨테이너다.
좌우로 남는 웜그레이 배경은 여백이 아니라 **디자인의 일부**인데, 1차·2차 모두 1713만 잘라 옮겨서 그 배경이 통째로 없었다.

- `DEAL_PAGE_WIDTH` 2280(페이지). 그 안의 레일 4종을 상수로 분리 —
  `DEAL_CONTAINER_WIDTH` 1713(x=283.5) / `DEAL_BANNER_WIDTH` 1600(x=340) /
  `DEAL_GRID_WIDTH` 1488(x=396) / `DEAL_CHROME_WIDTH` 1440(x=420).
- 히어로의 검은 띠는 페이지가 아니라 **1713 컨테이너**다(`1:1280`) — 좌우에 웜그레이가 보이는 게 맞다.
  breadcrumb 밴드도 1713 폭.
- 반대로 **푸터 4개 밴드(고지문·링크·로케일·legal)와 카테고리 nav는 2280 풀블리드**다(`1:3103`/`1:3119`/`1:3219`/`1:3246`).
  어떤 게 풀블리드고 어떤 게 레일인지는 Figma 노드 폭이 그대로 답이다 — 임의로 통일하지 말 것.
- 캔버스 미리보기 스케일 상한 0.42, 드래그 프리뷰 300px로 조정.

### Promotion Page Builder 진입 단순화
- Profile Settings / Shop in Shop page Module 선택 화면을 건너뛰고 모듈 빌더로 바로 진입(`BrandShopBuilder`의 기본 step 변경).
  선택 화면 코드는 `initialStep`으로 여전히 도달 가능해서 남겨둠.
- 헤더 타이틀 `Shop in Shop page Module` → `Promotion Page Builder`, 헤더의 LG font 드롭다운(`BrandFontSelector`) 제거.
  폰트는 브랜드 기본값 `lg` 고정 — `fontId` 상태는 파일명 태그·draft 저장에 계속 쓰이므로 setter만 제거.

## 2026-07-15

### 코드 정리 & 최적화 (`02a2413`, `5894488`)
- 죽은 코드 18개 파일 삭제: 예전 Brand Shop 섹션 라우팅(`BigPromotionEditor`/`BrandTrustEditor`/`MembershipEditor`/`MustHaveLGEditor` + 전용 템플릿들) — `StorePageModulesBuilder`로 완전히 대체되어 참조가 하나도 남아있지 않았음. 그 외 고아 파일(`ThumbnailTypeSelector`, `ImageWithFallback`, `ModulePlaceholder`), 미사용 함수(`estimateStorage`), 디버그 `console.log` 제거.
- `package.json`에서 미사용 의존성 51개 제거 (Radix UI 전체, MUI, Emotion, `react-dnd`, `react-router`, `sonner`, `vaul` 등) — shadcn/ui 스캐폴딩 잔재로 실제 코드에서 import된 적 없음. `depcheck` + 수동 import grep으로 교차검증, 삭제 전후 빌드 산출물 바이트 동일함 확인, 3개 빌더 전체 스모크 테스트 통과.
- `CLAUDE.md`의 Brand Shop 섹션 설명을 실제 구조에 맞게 갱신.

### Save for Later 복원 버그 수정 (`02a2413`)
- Review 단계에서 저장하면 항상 Edit 단계로 복원되던 문제 → 실제 저장 시점의 phase(`feature`/`generate`)로 그대로 복원되도록 수정. 복원된 draft가 `feature`/`generate`로 바로 진입할 때 분석이 안 도는 gap을 메우는 mount effect 추가.
- 이어서 발견된 2차 회귀(bundle 타입에서 URL 업로드 단계까지 밀려나던 문제): `src/app/drafts/thumbnailPayload.ts`의 `restoreThumbnailBulk`가 별도의 좁은 `phase` 타입/클램프를 갖고 있어서 새 phase 값을 인식 못하고 있었음 — 타입과 클램프 로직 동기화.
- Review 단계 체크박스(`selectedItemIds`/`excludedSlides`/`excludedTextCards`) 상태가 저장/복원되지 않아 항상 전부 미체크로 열리던 문제 수정 — draft에 함께 저장하도록 반영.
- 위 체크박스 상태 fix 과정에서 `useState` 선언보다 먼저 `useMemo`가 해당 state를 참조하는 TDZ(temporal dead zone) 에러가 생겨, 썸네일 빌더 진입 시 흰 화면이 뜨는 회귀 발생 → 선언 순서 재배치로 수정, Playwright 헤드리스 브라우저로 실제 크래시 재현 후 수정 확인.
- Feature Cards 진입 시마다 매번 전체 갤러리 재분석이 돌아 화면이 느려지던 문제 → 위 mount effect를 "실제 draft 복원 시"로만 제한(일반 `list`→`feature` 이동에서는 재분석 스킵).

## 2026-07-14

### USP 썸네일 디자인 개선 (`0193dbb`, `1be551a`)
- USP 리스트 항목 사이 구분선 추가/제거를 Figma 갱신에 맞춰 반복 조정 (gap 30→20→10, 선 컬러 `#F0ECE4` / stroke-width 1.5로 확정).
- Benefits/USPs 카드 용량 계산의 반올림 오차로 Benefits=4가 간헐적으로 disabled되던 버그 수정 (`CAPACITY_SLACK` 도입).
- "카드가 꽉 찼습니다" 경고 문구 3종(Benefits/USPs/Notice) 전부 삭제, 기본 Benefits 개수 3→4 변경, 4번째 benefit 예시 문구를 "OBS Only"로 교체.
- USP 카피 텍스트의 디센더(글자 하단 획)가 마지막 줄에서 잘려 보이던 문제 → +4px 여유 추가.
- Store Page Modules EP(Value Props 등) 신규 텍스트 9개 로케일 수동 번역 추가 (translate.ts API 미사용 — 사용료 절감 목적, 손으로 직접 번역).

### Gallery Feature Cards Edit/Crop 판정 로직 재정비 (`1348e27`)
- Review 단계에서 카드가 "Crop"(원본 그대로) vs "Edit"(직접 타이핑 재작성)로 갈리는 기준이 여러 차례 반대로 뒤집히는 문제를 다각도로 시도 끝에 해결.
- 여러 라운드의 픽셀 임계값 조정(정사각형 center-crop 분석, 배경색 무관 일반화, 1:1 소스 게이트)이 서로 다른 케이스를 번갈아 깨뜨리는 whack-a-mole이었음 — 결국 원본 픽셀 분석 로직(`gallerySlideApi.ts`)은 세션 시작 시점 그대로 완전히 되돌리고, TV 제품군 여부를 판별하는 `isTvProductUrl()` 게이트 하나만 추가하는 것으로 확정.
- **최종 규칙**: TV 제품군이 아니면 무조건 Crop, TV인 경우만 원본 이미지 기준 흰 배경 텍스트 존재 여부(`whiteCopyZone()`)로 Edit/Crop 판정.
- 이 판정 로직 재발 방지를 위해 별도 메모리 노트(`feedback_gallery_edit_crop_gating`)에 "시도했다가 되돌린 접근법" 3가지를 명시적으로 기록.

---

*이 파일은 세션 단위로 계속 추가됩니다. 작성 시점 기준 최신 커밋: `5894488`.*
