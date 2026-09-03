# LG Retail OBS Content Builder — Thailand

## ⚠️ 이 레포는 태국 법인 전용 fork입니다
2026-07-30, `lg-retail-obs-content-builder`(광고주용 원본, 배포: https://lg-retail-obs.ax4squad.dev)에서
전체 히스토리를 그대로 이전해 분리 생성됨. 이 시점 이후 두 레포는 **완전히 독립적으로 움직이며 서로 영향받지 않는다** —
코드도, 배포(Railway 별도 프로젝트)도, Asset Library 에셋 레포도 전부 분리됨.
원본 레포에 반영된 버그 fix 등을 이 레포에 가져오고 싶으면 수동으로 cherry-pick할 것 (자동 동기화 없음).

## Project Overview
LG 리테일/D2C 콘텐츠 자동 생성 웹앱. 단일 "제품 썸네일 빌더"에서 **4개 빌더를 묶은 멀티 빌더**로 확장됨.
SE Asia / LatAm 리테일 매체(Shopee, Lazada)용 이미지 자산을 만들고, 10개 언어로 번역해 export 한다.
GitHub: `https://github.com/contentfactoryhsad-blip/lg-retail-obs-content-builder-th`
원본(광고주용) GitHub: `https://github.com/contentfactoryhsad-blip/lg-retail-obs-content-builder`

## Tech Stack
- React 18.3.1 + TypeScript 5.6 + Vite 6.3 + Tailwind CSS v4 (`@tailwindcss/vite`)
- `html-to-image` (PNG export), `react-easy-crop` (crop), `react-dnd` (drag-and-drop), Radix UI
- `express` + `cheerio` (이미지 크롤링/프록시 서버), `sharp` (자산 썸네일 생성)
- `jszip` (bulk ZIP export), `@anthropic-ai/sdk` (i18n 번역 스크립트)
- `tsx`로 서버/스크립트 실행

## Entry & Routing
- `src/app/App.tsx` → `<LanguageProvider>` + `<AppInner>`. step 상태: `'home' | 'select' | 'edit' | 'bulk' | 'brand-shop' | 'id-banner'`.
- `src/app/components/ContentBuilderHome.tsx` — 새 홈/라우터. 빌더 카드(Content Template / Promotion Page / Deal Page) + 외부 가이드 링크(`https://retail-obs-guide.lge-d2c.com/`).
- 언어는 **언어별 상태 슬롯**으로 관리 — 한 언어에서 한 편집이 영어(원본)로 역류하지 않음. 영어가 source of truth.

## The Builders

### 1) Product Card Builder — 1200×1200 PNG
- `components/thumbnail/`: `ThumbnailSelector`(타입 선택) → `ThumbnailEditor`(편집) → `ThumbnailBulkGenerator`(배치/ZIP). `App.tsx`가 이 셋을 lazy로 물고 있다
- 템플릿도 같은 폴더, 등록은 `thumbnailRegistry.ts`: `DefaultThumbnailTemplate`, `PromotionThumbnailTemplate`, `BundleThumbnailTemplate`, `GwpThumbnailTemplate`, `UspThumbnailTemplate`, `FeatureImageThumbnailTemplate`, `FeatureTextThumbnailTemplate`, `GalleryFeatureThumbnailTemplate`, `GallerySlideTemplate`(+`GallerySlideBulk`), `ThumbnailPlaceholderTemplate`
- 상태 타입은 `components/thumbnail/thumbnailTypes.ts` (`ThumbnailDefaultState`, `ThumbnailPromotionState`, `ThumbnailBundleState` …)
- **구현이 한 번 통째로 갈아엎어졌다.** 구버전(`ProductCardEditor`/`TemplateSelector`/`BulkGenerator`/`EditorPanel`/`components/templates/`/`src/app/types.ts`/`i18n/sloganFit.ts`/`components/icons/FeatureIcons.tsx`/`src/imports/`)은 진입점부터 그래프를 타서 **어디에서도 닿지 않는 것을 확인하고 삭제**(2026-08-13). 옛 문서나 AHQ 레포에서 이 이름을 보면 위 thumbnail 쪽을 보면 된다

### 1.7) Content Banner Builder — 에셋 조합 → 채널별 사이즈
(화면 이름은 2026-08-31부터 Content Banner Builder. 코드 폴더·내부 키는 `contenttemplate` 그대로다.
DYNAMIC 그룹 = 구 AD CREATIVE의 Teasing Content 타일이 독립한 것 — 모션 에셋 `ad-teasing` 하나뿐이고,
Key Visual 행처럼 캡션 없이 행 제목이 이름을 댄다. 목업 판 `miJcDQgz0yJMskLE5a5HHj`의 `6068:45105`도 같은 구조.
UPLOAD 그룹(2026-09-01) = 운영자가 3000×3000 정방형을 올리는 자리 — `CUSTOM_ASSET_ID`('custom-upload'),
파일은 object URL로 `setCustomArt`에 실리고 URL 헬퍼들이 그걸 우선 반환한다(blob URL엔 `?v=` 스탬프 금지).
배치는 전 채널에서 **Key Visual _Main 뼈대 그대로**(`artFor`/`gradFor`의 kv-main 폴백 + `PAID_ASSETS` 등록).
비정방형은 업로드 시 alert로 거부(±1%). 세션 한정 — 드래프트 저장 없음.
Dynamic의 유료매체는 표준 41종이 아니라 **자기 보드의 영상 사이즈 세트**를 쓴다(`DYNAMIC_PAID_SLOTS`,
보드 `6255:145194`): Criteo 16:9/1:1/9:16 · DV360 16:9/9:16 · Pmax 16:9/9:16/1:1 · Meta **3:4(1080×1440)**/9:16/**4:5(1080×1350)** (Meta 1:1은 2026-09-04에 3:4로 교체).
프레임은 bare가 아니다 — 사이즈 컴포넌트 안에 **로고/헤드라인/서브카피/CTA/디스클레이머가 들어있다**
(비율당 레이아웃 한 벌, 채널 공통). 캔버스는 `PaidSlotPreview`가 **모션을 video로 재생**하며 카피를 얹고
(`motionSrc` prop), **전부 mp4로 익스포트**된다(짝수 픽셀 ✓) — 카피 레이어는 `hideArt` 모드의
PaidSlotPreview를 투명 배경으로 래스터해 컷 위에 합성(`renderPaidOverlaySlot` 호스트).
배치 5벌: 16:9=-22,-825,2730 · 1:1=-360,-157,1810 · 3:4=-694,-295,2478 · 9:16=-1006,-400,3130 · 4:5=-614,-254,2318.
Dynamic은 영상이라 **LG.com에서 히어로 2칸만 돈다** — `lgcomSlotsFor(assetId)`가 `hero` 플래그로 거르고,
`LG.com — Dynamic` 보드(`6210:73073`, 구 Teasing Content)도 그 4칸을 숨겨놨다. 캔버스·ZIP 둘 다 이 필터를 탄다.)
- `components/contenttemplate/` — `ContentTemplateBuilder.tsx`(옆 빌더와 같은 4분할 셸)가
  `contentTemplateAssets.ts`(에셋·채널 레지스트리)를 물고 있다. **모듈을 쌓는 빌더가 아니다** —
  팔레트가 담는 건 페이지 모듈이 아니라 **소재(에셋) 소스**고, 캔버스는 드롭존이 아니라 **결과 미리보기**다.
- 흐름: 구분선 위에서 Key Visual / Deal Type / Dynamic / Ad Creative를 **그룹당 하나씩** 고르고,
  아래에서 Channel을 고르면 그 채널이 집행하는 사이즈 세트가 캔버스에 쌓인다.
- 레이아웃 수치는 Figma 목업(`fUup3vSq71f6eUIRpmzz8s`, 페이지 "Content Template Builder", 프레임 `26:2`)에서 그대로 왔다 —
  레일 80 / 팔레트 320 / 편집 384, 썸네일 66px에 거터 8. 이 세 폭은 **다른 빌더(64/256/320)와 다르다**.
- 🔴 **원본 소재는 3000×3000 PNG 14장(79MB)이라 그대로 못 쓴다.** `npm run assets:content-template`이
  `public/content-template/{thumb,preview}/`에 240/1200px WebP를 굽는다(79MB → 10MB, 그중 9.8MB가 모션 mp4).
  소스 폴더는 레포 **바깥** `../content template builder source/`이고 `SOURCE_DIR`로 바꿀 수 있다.
  스크립트는 idempotent(출력이 소스보다 새로우면 건너뜀)라 파일 하나 추가 후 재실행해도 그것만 처리한다.
- 에셋 id = 파생 파일명 stem(`lg-bf-kv-main-3000x3000.png` → `kv-main`). 소재를 늘리려면
  폴더에 넣고 → 스크립트 재실행 → `CONTENT_ASSETS`에 한 줄 추가, 이 순서다.
- **Key Visual만 2열, 나머지는 4열**이다(`AssetGroup.columns`). 키비주얼 캡션이 길어서(`PD Centric (Non AC)`) 2열이 필요하다.
- **채널 사이즈는 LG.com만 실측치**다(Memberdays 참조 화면에서 읽음). Criteo/DV360/Pmax/Meta는 `sizes: []`이고
  UI가 "스펙 미등록"을 명시한다 — 추측한 사이즈로 export하는 사고를 막으려는 것이니 빈 배열을 임의로 채우지 말 것.
- 🔴 **PD Slot의 제품 박스(`SLOT_BOXES`)는 에셋당이 아니라 에셋×사이즈로 갖는다.** Figma 보드에서 6개 프레임에
  각각 손으로 그린 것이라 같은 에셋도 사이즈마다 비율이 다르다(Ver.2가 1920×720에선 0.10072, 342×228에선 0.10317).
  에셋당 하나로 합치면 1920×720 말고 전부 2~5px 어긋난다. 라디우스도 프레임 px로 그려져 있어 상수가 아니다(`SlotBox.r`).
- 🔴 **팔레트 타일 1개가 아트워크 2개를 숨긴다.** PD Slot 보드에는 마스터 컴포넌트가 둘 있고,
  PC 2사이즈는 가로 4열 아트, 모바일·342 4사이즈는 2×2 아트를 쓴다. 그래서 아트 소스는 에셋이 아니라
  **사이즈의 속성**이다 — `Placement.src`로 사이즈별 stem을 지정하고 `LgcomSlotPreview`가 `artUrl()`로 읽는다.
  `kv-product-slot2*`는 팔레트에서 숨겨져 있지만(`hidden: true`) **이 아트 소스로 쓰이므로 지우면 안 된다**.
- 🔴 **유료매체(Criteo/DV360/Pmax/Meta)는 `paidSlots.ts`에 따로 있다.** Figma 보드
  `External Banner Black Friday_Main`(`miJcDQgz0yJMskLE5a5HHj`, 섹션 `6080:46054`)에서 56개 사이즈를 옮긴 것.
  **배치는 에셋이 아니라 사이즈의 속성**이다 — 그 보드는 마스터 컴포넌트 2개(Main / Main (Character))를 두고
  프레임마다 배치는 한 번만 잡은 뒤 어느 마스터를 따르는지만 고른다. 그래서 KEY VISUAL_Main 두 타일이
  같은 표를 쓰고 아트 파일만 다르다(`PAID_ASSETS`).
  56개 중 **15개는 아직 카피가 없다**(`text: []`) — Figma의 레이아웃 컴포넌트가 비어 있는 상태 그대로다. 지어내지 말 것.
  그라데이션은 Figma가 흰색 그라데이션 **마스크**로 그리므로 CSS `mask-image`로 옮겼다(`PaidMask.angle`은 `gradientTransform` 환산값).
- **LG.com 히어로 2사이즈(1920×720·720×960)만 추가 레이어를 갖는다** — `indicator`(캐러셀 표시)와
  `iconRow`(혜택 아이콘, variant 4종). 🔴 **끌 수 있는 건 아이콘 로우 하나뿐이다**(`showIconRow`, 기본 off) —
  카피·CTA·디스클레이머·indicator는 레이아웃의 일부라 전 사이즈에서 항상 그린다.
  🔴 **PD Slot 자산 4종은 아이콘 로우 자체가 없다** — 제품 플레이트가 그 자리를 쓴다. 판정은 `productSlotCount > 0`
  (`SLOT_BOXES`를 가진 자산이 정확히 PD Slot 4종)이고, 체크박스가 숨는 것뿐 아니라 미리보기도 안 그린다.
  이에 맞춰 Figma의 `LG.com — PD Slot` / `PD Slot (Character)` 보드는 **720×960에서만** KV와 슬롯을 40px 내렸다
  (KV y −107 → −67). `SLOT_BOXES`는 아트 기준 비율이라 둘이 같이 내려가 값이 그대로고, `ART`의 y만 바뀐다. 오른쪽 바는 카피를 쓰는 곳이지
  레이아웃을 조립하는 곳이 아니다. 구버전의 `SlotLayers`/`DEFAULT_LAYERS`(요소별 on/off 7개)는 2026-08-28에
  불린 하나로 접었으니 되살리지 말 것. 아이콘 로우 체크박스 UI 자체도 LG.com 채널에서만 나온다
  (`showIconRowToggle`); 유료매체는 완성본 출고라 필요 없다. 🔴 **아이콘 로우는 2026-09-01부터 라이브 렌더다** — promotion-banner-variation에서 포트
  (`contenttemplate/icons/`: IconRegistry 36종 + IconCombobox(radix popover) + IconRowInline).
  패널은 None/Solid/Line × Black/White × 개수(1–3) × 그룹별 콤보박스; solid와 line은 선택을 따로 기억한다.
  비례는 전부 row 높이 기준(소스의 IconRowGroup 그대로)이라 PC(424×60)/MO(510×72)가 수치 없이 스케일된다.
  mp4 합성은 숨김 호스트에서 IconRowInline만 투명 배경으로 `toPng` 래스터해 objectURL로 넘긴다
  (`renderIconRowSlot` 상태). 구 오버레이 PNG 4장(`overlay/icon-row-*.png`)과 `ICON_ROW_STYLES`
  스와치는 이제 미사용 — indicator PNG는 여전히 overlay에서 온다.
- 🔴 **Figma 보드의 박스는 읽기만 한다.** 사용자가 직접 그리는 것이라 스크립트로 지우거나 다시 그리지 말 것(두 번 사고 났다).
  옮길 땐 각 프레임의 `Slot n` 사각형을 그 프레임 `KV` 인스턴스 기준 비율로 환산해서 가져온다.

- **SHORTS = 완성 영상 그대로.** `content template builder source/shorts/`의
  `lg-bf-shorts-{a1,a2,a3}-{1080x1920,1080x1440}.mp4`를 `public/content-template/motion/shorts-{type}-{size}.mp4`로
  **수동 복사**한다(파생 스크립트는 하위 폴더를 안 본다). 팔레트 썸네일은 9:16 컷 1초 프레임을
  ffmpeg(png) → sharp(webp)로 뽑아 `thumb/shorts-0N.webp`. 타일 매칭: LGNESS=a1, LGNESS PD=a2, CUBE=a3
  (`ContentAsset.video` 필드). 캔버스는 선택 사이즈의 mp4를 그대로 재생하고 편집·ZIP 대상이 아니다.

- 선택 상태는 **그룹당 하나**(`Selection = Partial<Record<AssetGroupKey, string>>`)고, 같은 걸 다시 누르면 해제된다.
  미리보기는 **마지막으로 누른 것**(`focused`)을 따라가며, 없으면 key visual로 폴백한다.

- **AD Benefit 보드/에디터** (2026-09-04, 뼈대 단계). Figma에 `External Banner Black Friday_AD Benefit` 보드가 따로 생겼고
  (Deal Type & AD에서 Benefit 분리), 보드 자체 Component 섹션의 `Black Friday Image / AD_Benefit`(6338:174533, 2000²)에
  Benefit 아트 + **Box1~6**(145×138, 3×2, `Asset` 그룹)이 있다 — 보드 전 사이즈의 아트 인스턴스가 이 컴포넌트를 물고 있어
  박스가 사이즈마다 자동 스케일된다. 빌더는 `BenefitSlotsEditor`(ad-benefit 전용, Edit 패널 하단): 박스당 PD Slot과 같은
  제품 파이프라인(URL→갤러리→누끼→브러시→크롭, `ProductRow` 재사용) + 어셋 콤보박스(썸네일+이름, IconCombobox 스타일).
  어셋 7종은 `content template builder source/object/` → `public/content-template/object/` 수동 복사, `BENEFIT_ASSETS` 등록.
  캔버스/다운로드 반영 완료(2026-09-04): `AD_BENEFIT_PLACEMENT`(41칸, 보드 실측; 왼쪽으로 밀린 그라데이션 랙트는 프레임
  좌표로 환산) + `AD_BENEFIT_BOXES`(2000² 기준 6칸)로 박스가 아트 변환을 타고 사이즈별 자동 배치된다. 아트는
  `ad-creative-benefit-no-object`(빈 큐브), 팔레트 썸네일만 `ad-creative-benefit`(`ContentAsset.thumb` 오버라이드).

- 🔴 **카피 스택은 Figma 오토레이아웃을 실측으로 흉내 낸다** (2026-09-02). Figma는 headline → (subcopy) → CTA를
  세로 오토레이아웃으로 묶어 두므로, 카피가 디자인 박스보다 짧아지면 아래 레이어가 그만큼 당겨 올라와야 한다.
  `PaidSlotPreview`·`LgcomSlotPreview` 둘 다: headline/subcopy `<p>`의 `offsetHeight`를 `useLayoutEffect`로 실측하고,
  **그 텍스트의 디자인 박스 아래에서 시작하는 레이어만** `pullUp(y)`만큼 위로 민다(길어지면 반대로 밀려 내려간다).
  - 옆에 앉은 CTA(가로 스택: 468x60·728x90·970x90·320x50)는 y 조건에 안 걸려 안 움직인다 — 의도된 것.
  - **LG.com ST0044 두 칸(656×436·342×228)은 예외**: Figma 스택이 `primary=MAX`(아래 정렬)라 CTA가 고정이고
    headline이 `vAlign:'bottom'`으로 아래에 매달린다(`lgcomSlots.ts`에 `h`+`vAlign` 기록). 나머지 LG.com 4칸과
    유료매체 세로 스택 전부는 `primary=MIN`(위 정렬)이라 pullUp 대상.
  - disclaimer는 Figma에서 스택 밖 프레임 하단 고정 — 절대 안 움직인다.
  - pullUp 판정에는 텍스트 spec의 `h`(Figma 박스 높이)가 필요하다. 새 사이즈를 옮길 때 headline/subcopy에 `h`를 같이 적을 것.

### 1.5) Deal Page Builder — www.lg.com Deal Page, 2280px 고정 폭
- `components/dealpage/` — `DealPageBuilder.tsx`(3분할 셸: 팔레트 / 드래그 캔버스 / 편집 패널)가
  `dealModuleRegistry.ts`(9개 모듈 — 콘텐츠 7 + 공홈 크롬 2) + `dealEditStates.ts` + `DealModuleRenderer.tsx` + `DealModuleEditPanel.tsx`를 물고 있다.
- **Shop in Shop과 같은 구조지만 출력 대상이 다르다.** 저쪽은 마켓플레이스 업로드 슬롯(1200px, `uploadModule` 타입별 파일명)이고,
  이쪽은 lg.com 페이지 컨테이너(1713px)다. 그래서 `DealModuleDef`에는 `uploadModule`이 없고 `section`(원본 lg.com 섹션명)이 대신 들어간다.
- 원본은 Figma `fUup3vSq71f6eUIRpmzz8s` 프레임 `1:1212`. 렌더러의 px 값은 전부 그 프레임의 실측치이고,
  각 블록 위에 출처 노드 id를 주석으로 남겨뒀다(예: `Figma 1:1292`).
- 🔴 **모듈은 2280 폭으로 그린다.** 페이지의 모든 섹션이 2280 밴드이고 1713은 그 안에 가운데 놓인 컨테이너다 —
  좌우로 남는 웜그레이는 여백이 아니라 디자인이다. 1713만 잘라 옮기면 배경이 통째로 사라진다(실제로 두 번 그랬다).
- 레일 상수는 `dealModuleRegistry.ts`에 모여 있고, 각 값은 Figma 프레임의 실제 x다 —
  `DEAL_PAGE_WIDTH` 2280 / `DEAL_CONTAINER_WIDTH` 1713(x=283.5) / `DEAL_BANNER_WIDTH` 1600(x=340) /
  `DEAL_GRID_WIDTH` 1488(x=396) / `DEAL_CHROME_WIDTH` 1440(x=420). 다섯 값이 전부 다르니 임의로 통일하지 말 것.
- **풀블리드와 레일을 섞지 말 것** — 히어로 검은 띠·breadcrumb은 1713 레일이고,
  푸터 4개 밴드와 카테고리 nav는 2280 풀블리드다. 어느 쪽인지는 Figma 노드 폭이 그대로 답이다.
- 🔴 **디자인 값은 전부 `dealTokens.ts`에 있고, Figma 변수에서 읽은 것이다**(스크린샷 눈대중 아님).
  이 페이지는 **타입 스케일이 납작하다** — 섹션 타이틀·배너 헤드라인·히어로 H1이 **전부 56/60 weight 400** 한 종류다.
  중간 크기(40px 같은)를 끼워넣거나 semibold로 바꾸면 페이지가 통째로 다르게 읽힌다. 본문은 20/24 weight 400.
- **`DEAL_RED = #EA1917`은 앱 크롬의 LG red `#FD312E`와 다른 색이다** — 편집 패널(앱 UI)은 `#FD312E`, 출력물은 `#EA1917`.
- 라디우스도 토큰이다 — `R_LG=28`(딜 카드·배너·타임세일), `R_MD=16`(상품카드), `R_SM=8`(버튼), `R_XS=4`(배지·pill).
- 🔴 **배너 아트는 오브제 합성이 아니라 통짜 KV다.** `public/deal-page/banner-*.png`는 Figma의 이미지 프레임을
  통째로 export한 것이고, LG Black Friday 락업·오브제·제품 썸네일이 이미 그 안에 들어있다. 검은 박스에 오브제를
  얹는 식으로 다시 만들지 말 것.
- 🔴 **배너 높이 2종은 사이즈 피커가 아니라 모듈 타입이다**(2026-08-30) — `deal-promo-banner`(Promotion banner,
  400, 최대 4) / `deal-banner`(Deal banner, 350, 최대 6). **Standard=350은 기획 스펙이고 보드 프레임
  (6080:52226/52439/52643)은 아직 320이다** — 보드가 따라오면 `BANNER_COPY.Standard` 오프셋을 재실측할 것.
  구 드래프트의 Standard 프로모션 배너는 `dealPagePayload.ts` 복원에서 `deal-banner`로 이관된다.
- 🔴 **프로모션 배너(400)는 업로드가 아니라 히어로식 KV 피커다**(2026-08-30, `dealBannerArt.ts`) — 보드 우측
  `Promotion Banner_*` 프레임 5장(6240:144564 standard setting + 변형 4)에서 옮김. 네 변형 모두 배치는 한 벌
  (`PROMO_ART`: 1154.7² @ 652.6,−376.9)이고 아트만 다르다. 🔴 **PD Slot 변형의 아트 스템은 레지스트리 id와
  다르다** — 타일 id는 `kv-product-slot(-character)`(라벨·썸네일용)인데 그리는 파일은 `kv-product-slot001(-character)`
  (플레이트 없는 v1, paidBoards와 같은 스템). 플레이트 4칸은 아트에 구운 게 아니라 **프레임이 그린 박스**라
  렌더러가 직접 그린다(`PROMO_SLOT`: 1002,276.75 / 102.88 박스 / 112.88 피치 / r8.12 / #333) — 빈 칸도 보인다.
  제품은 히어로와 같은 크롤+누끼 플로우(`ProductSlotsEditor`)고, 기본값은 standard setting 프레임의 제품 4종
  (`banner-product-1..4.png`, AC스탠드/TV/냉장고/세탁기). `image`는 레거시 폴백 — 복원 시 `kvAsset` 없는 구
  드래프트엔 null을 박아 업로드 아트를 지킨다.
- **딜 배너(350)도 업로드가 아니라 타입 피커다**(2026-08-30, `DEAL_KV_TILES`) — 보드 y2057의 `Deal Banner_*`
  프레임 4장(Time Sale 6240:144854 / Hot Deal 144775 / Gift 144882 / Bundle 144910·이름 없는 프레임)에서 옮김.
  네 프레임은 템플릿이 같고 **아트만 다르며, 아트는 타입별로 크롭이 달라** 배치도 타입별이다(파일
  `deal-banner-art-*.jpg`, 2000px로 다운스케일). 아트 위에 좌측 스크림(`DEAL_BANNER_SCRIM`, Rectangle 2 실측)을
  덮는다. 타일 id는 딜 카드와 같은 deal-type 레지스트리 4종. 프리셋의 Hot Deals/Bundles/Gifts/Time Sale 배너도
  전부 kvAsset으로 갈아탔고, `banner-*.png` 업로드 아트는 레거시 폴백으로만 남는다.
- **배너의 "Art right / Art left" 레이아웃 피커는 삭제됐다**(2026-08-30) — 우측 아트 고정. 필드는 상태에 남아
  있고 복원이 'Art left'를 'Art right'로 정규화한다. **Legal links 컨트롤은 프로모션 배너(400)에만 있다** —
  350 딜 배너는 링크를 그리지 않으므로 패널에서도 뺐다.
- **Hero KV 피커에 KEY VISUAL_Motion 타일이 있다**(2026-08-30, `HERO_MOTION_ID`) — 레지스트리 에셋이 아니라
  kv-main의 모션 마스터(`/content-template/motion/kv-main-motion.mp4`)를 트는 것. 배치는 Main과 동일
  (`HERO_ART['kv-main-motion']`)하고, 렌더는 **kv-main 정적 아트 위에 `<video autoplay loop muted>`를 얹는다** —
  html-to-image가 비디오를 못 굽기 때문에 PNG export에는 정적 아트가 찍힌다(의도된 폴백).
- **Category nav 패널은 이름 7칸 + Results bar/Empty state뿐이다**(2026-08-30) — 개수 컨트롤과 아이콘
  업로드를 걷어냈다(아이콘은 사이트 크롬). 상태의 `icon` 필드와 MIN/MAX 상수는 남아 있다.
- **PD Slot 플레이트 컬러는 모듈 상태다**(`plateColor`, 기본 `PD_PLATE_FILL`) — 히어로는 구운 플레이트 위에
  같은 자리 박스를 **덧그려서**(Content Banner Builder의 LG.com 미리보기와 같은 레시피) 리컬러를 가능하게 했고,
  패널은 `ProductSlotsEditor`의 내장 `color`/`onColorChange`(Slot Color 필드)를 그대로 쓴다. 헤더의
  로고·타이틀은 `AppHeader onHome`으로 홈으로 간다(unsaved guard 통과).
- 🔴 **PC/모바일 두 캔버스다**(2026-09-02, `DealDevice`) — Figma가 `BF Page_PC`(6080:50977 개정)와
  `BF Page_MO`(6287:150182, 360폭 신규)로 갈라졌고, 빌더는 Quick Start 아래 PC/Mobile 토글로 **같은 모듈·
  같은 상태를 두 렌더러로 그린다**(`DealModuleRenderer device` prop → `DealModuleRendererMo.tsx`).
  모바일 섹션은 풀블리드로 맞닿는다(웜 밴드 패딩 없음). MO 보드 수치는 전부 소수(12.743, 19.115…)인데
  스케일된 소스에서 조립된 것이라 **정수로 "정리"하지 말 것**. 모바일 캔버스는 스케일 캡 1(1:1),
  export 파일명에 `-mobile` 태그, 드래프트에 `device` 저장. 딜 배너 MO는 PC의 와이드 크롭 jpg가 아니라
  **3000² 정사각 아트를 직접** 그린다(`MO_DEAL_ART`); 히어로/배너 MO 카피는 flow 컬럼이고 PC 헤드라인의
  명시적 줄바꿈은 모바일에서 공백으로 접는다.
- **PC 딜 카드는 2026-09-02 보드 개정판이다**(ST0044_PC 6290:158826, 밴드 561→812) — 카드 464×600 r28,
  타이틀 56/60 **Semibold** + 서브타이틀 24/28(신규 `sectionSubtitle`), 카드 안 좌하단 텍스트셋
  (36/42 Light + 화이트 아웃라인 버튼). 아트는 deal-type 정사각을 카드별 실측 크롭으로 건다(`DEAL_CARD_ART`,
  이전 스크림 방식 폐기). 보드의 새 blur 화살표 SVG는 export가 못 담아 구 링 PNG를 유지 중.
- **Membership CTA 모듈은 삭제됐다**(2026-08-30) — 레지스트리/상태/렌더러/패널/프리셋에서 전부 걷어냈고,
  구 드래프트의 membership 아이템은 복원에서 조용히 스킵된다(unknown type 경로). `banner-membership.png`는
  public 원칙대로 남겨뒀다.
- **Time Sale은 모듈이 아니라 `showCountdown` 토글이다**(2026-08-30). 카운트다운은 보드에서 한 컴포넌트라
  (`CountdownFields` + 렌더러 `CountdownRow` + 패널 `CountdownEditor`) **딜 배너와 Hero KV가 공유한다** —
  배너는 (80,182), 히어로는 콘텐츠 레일 (420,294)(Figma `6236:143805`). 딜 배너에서 켜면 카피 리듬이
  66/134로 올라가고(`BANNER_COPY_COUNTDOWN`) CTA는 숨는다(디짓 자리와 겹침); 400 프로모션 배너는
  카운트다운 없음. 구 `deal-time-sale` 드래프트는 복원에서 `deal-banner`+`showCountdown:true`로
  이관된다 — 필드명이 같아 그대로 머지된다.
- 🔴 **딜 카드는 3장 고정이고(개수 컨트롤 없음 — 3×464+2×24=1440 레일 정합), 아트는 업로드가 아니라
  deal-type 에셋 4종(Bundle/Time Sale/Gift/Hot Deal) 스왑이다**(2026-08-30). 🔴 **배치는 에셋별이다**(`DEAL_CARD_ART`) —
  Figma 구운 카드는 오브제를 ~187px 높이로 **정규화**해 그리는데 preview(1960×928) 속 원본 오브제는 640~491px로
  제각각이라, 단일 스케일이면 시계가 보드보다 1/3 커진다. 각 항목은 실측 오브제 bbox 기준 scale=187/h로
  중심을 (232,125)에 놓은 값. 아트 하단 에지(y 264~308)가 카드 검정 위에 걸리므로 스크림(`DEAL_CARD_SCRIM`)은
  가장 이른 에지(264) 전에 완전 검정이어야 심이 안 보인다.
  `DealCardItem.image`는 구 드래프트(구운 card-N.png)의 폴백으로만 남아 있다 — 에셋을 고르면 null로 지운다.
- 🔴 **상품 카드 폭은 342 고정이고 행은 좌측 정렬이다**(`1:1541`/`1:1745`). 3개일 때 오른쪽이 비는 게 원본이다 —
  레일을 꽉 채우려고 늘리지 말 것.
- 🔴 **Product list는 큐레이션 세트 3종(냉장고/세탁기/워시타워 × 4)을 스왑한다**(2026-08-30, `DEAL_PRODUCT_SETS`).
  Page Template 보드의 세 슬라이더 실측: 냉장고 `6080:51305`, 세탁기 `6080:51511`의 앞 4장(뒤 6장은 캐러셀
  오프스테이지), 워시타워 `6080:52452`(Laundry Bundles, WK 모델). **줄마다 4번째 카드가 자기 제품 중복인 건
  보드 그대로다** — 버그로 알고 지우지 말 것. 배지(9/6/24 interest-free)와 CTA(Buy now vs Get stock alert)는
  카드별 값이라 시드에 실려 있다. 오른쪽 바 옵션은 섹션 타이틀/탭/세트/개수(2·3·4)뿐이고, per-product 편집기는
  `DealProductItemsEditor`로 **파킹**돼 있다(다시 쓸 예정이라 지우지 말 것). 제품 이미지는
  `public/deal-page/product-washer-*.png`/`product-washtower-*.png`(Figma MCP 로컬 asset 서버에서 다운로드).
- **팔레트→캔버스 드롭은 포인터 Y 기준이다**(`handleDragMove`) — dnd-kit `over`는 위/아래를 구분 못 해서
  삽입 칸을 직접 계산하고 빨간 인디케이터 라인으로 보여준다. 팔레트 드래그 충돌 판정은 `pointerWithin`
  (closestCenter는 옆 모듈 중심이 이겨서 엉뚱한 칸에 꽂혔다).
- **`deal-site-header` / `deal-site-footer`는 lg.com 공홈 크롬**이다(Figma `1:1214`+`1:1267`, `1:3102`).
  LG 로고·검색/계정/장바구니 클러스터(`header-utility.png`)·하단 배지(`footer-badges.png`)는 **Figma export 이미지 그대로 박혀 있다** —
  아이콘 벡터를 손으로 그리지 않기 위해서고, 어차피 시장별로 바뀌지 않는 부분이다. 나머지 문구는 전부 편집 가능.
- **`deal-preview.html`**(레포 루트) — 9개 모듈을 1713px로 쌓아 그리는 검증 하네스. `fonts.css`를 import하고
  `--obs-font`/`--obs-font-text`/자간 변수를 직접 세팅한다(폴백 폰트로 재는 사고 방지 — 아래 "검증 방법" 참고).
  `npx playwright screenshot --channel chrome --full-page --viewport-size "1760,1000" --wait-for-timeout 4000 http://localhost:5174/deal-preview.html out.png`
  로컬 Chrome 채널을 쓰므로 playwright 브라우저 다운로드가 필요 없다. `vite build`는 `index.html`만 엔트리로 잡아서 배포물엔 안 들어간다.
- 편집 패널의 필드 atom은 `ModuleEditPanel.tsx`에서 import하지 않고 재선언했다(lazy 청크 분리 목적).
  `ShowToggle`(`bigPromoCommon.tsx`)과 `ImageCropModal`은 공용이라 그대로 쓴다.

#### 2026-09-02 — 업로드 아트 / 아트-온리 ZIP / 저장 플로우
- **UPLOAD IMAGE**(히어로·딜카드(카드별)·프로모션/딜 배너 피커 최하단, `UploadArtSection` in
  `DealModuleEditPanel.tsx`) — CBB의 업로드 그룹과 같은 3000² 정방형 검증(±1% 초과 alert). CBB와 달리
  **모듈별 dataURL로 상태에 저장**되어 드래프트에도 남는다. 센티널은 `kvAsset`/`asset`='custom-upload';
  히어로는 새 `customImage` 필드, 배너/카드는 레거시 `image` 필드를 재사용한다. 각 모듈의 폴백 배치
  골격으로 깔리고 Image Position/Scale로 보정한다.
- 🔴 **ZIP은 이미지 소재만 나간다**(`DealModuleRenderer`의 `artOnly`/`artIndex` prop) — deal-hero /
  deal-cards(**카드 수만큼 1장씩**) / deal-promo-banner / deal-banner만, 각자 아트 크롭 사이즈로
  (PC 1920×720 / 464×600 / 1600×400 / 1600×350; MO 360×480 / 310×400 / 360×480·420). 아트+제품
  플레이트+스크림만 담기고 카피·CTA·카운트다운·코너 라운딩은 캔버스 목업 몫이다. 나머지 모듈
  (header/tabs/product list/category nav/footer)은 export 대상이 아니다. 파일명은 `NN-모듈명[-카드번호]-…`.
- **Motion 히어로는 mp4도 함께 나간다** — CBB의 `renderMotionCutLive`(WebCodecs, `exportMotion.ts`)로
  히어로 크롭·배치(nudge/scale 반영)에 맞춰 실시간 컷(`…-motion-…mp4`). 실패는 alert로 보고하고
  이미지는 계속 나간다.
- 다운로드 버튼은 CBB처럼 **"N / M" 진행 카운터**(`exportProgress`, 모션 mp4는 +1로 센다).
- 🔴 **`fileSaver.ts`는 앵커 다운로드 단일 경로다**(전 빌더 공통) — `showSaveFilePicker`의 지연 write가
  실사용 Chrome에서 계속 실패해 0바이트 파일을 남겼고, 폴백이 겹치며 저장 다이얼로그가 2~3번 떴다.
  **픽커를 되살리지 말 것.** `acquireSaveTarget`은 API 호환용 래퍼로만 남아 있다.
- 프로모션 배너 제품 플레이트는 **모든 변형에서 토글**(`showSlots`, PD Centric 포함)이고, 배너류도
  Image Position(화살표)+Scale을 단다(`BannerNudgeField`). 캔버스 모듈 툴바는 휴지통만(복사 버튼·
  `duplicateModule` 삭제). MO 푸터는 보드 그대로 9행 내비+Libro 배지행+윤리핫라인행으로 재작성,
  푸터 locale 기본값은 `t('English')`.

#### 2026-09-03 — 라이브 캐러셀 / 라벨 정리 / 푸터 잠금
- **모듈 라벨은 Title Case 통일**: Deal cards → **Benefit Summary**, Deal tabs → **Tab Anchor**,
  나머지도 Site Header / Promotion Banner / Deal Banner / Product List / Category Nav / Site Footer.
  ZIP 파일명은 `label.toLowerCase()`라 함께 바뀐다(`…-benefit summary-1-…`).
- 🔴 **Benefit Summary는 캔버스에서 실제로 도는 캐러셀이다** — 기본 4장(Time Sale/Hot Deal/Bundle + Gift
  시드), 패널 `Number of cards` 3–4(`DEAL_CARD_MIN/MAX`, `dealCardSeed`). PC는 3장 노출·1피치(488)씩,
  MO는 1장·320피치씩 슬라이드하고 카운터("1 / 2")는 카드 수에서 계산한다(`slideCount` 필드는 레거시,
  드래프트 호환용으로만 남음). 링 화살표 아트는 회색 `carousel-prev.png`=disabled, 진한 `carousel-next.png`
  =active 두 장뿐이라 반대 방향은 180° 회전으로 만든다.
- 🔴 **캐러셀 위치 상태는 `SortableCanvasItem`(DealPageBuilder)이 소유한다** — OBS식 흰 원형 사이드
  화살표는 **모듈 프레임 밖**(캔버스 여백)에 떠야 하는데 템플릿은 전부 overflow:hidden이라, 캔버스
  아이템이 pos를 들고 `DealModuleRenderer`의 `carousel` prop(controlled)으로 내려보낸다. 템플릿 단독
  렌더는 내부 state 폴백. 사이드 화살표는 이동 가능한 방향만 표시(`CarouselSideArrow`), 익스포트에는
  절대 안 실린다(artOnly가 카드 단위 크롭이라 캐러셀 위치 무관 — 4장이면 ZIP도 4파일).
- **Site Footer 편집 잠금** — 패널은 영어 안내문 "Site footer uses the default preset." 한 줄만
  (`FooterLockedNote`). 기존 편집기는 `DealSiteFooterEditor`로 ⏸ 파킹(제품 편집기와 같은 관례).

### 2) Brand Shop Page Builder — 가변 사이즈
- `components/BrandShopBuilder.tsx`(Profile Settings / Store Page Modules 진입 라우터) → 콘텐츠 섹션 편집은 전부 `components/brandshop/StorePageModulesBuilder.tsx`(10개 모듈)로 통합됨.
  - 구 개별 섹션 라우팅(`BigPromotionEditor`/`BrandTrustEditor`/`MembershipEditor`/`MustHaveLGEditor` + 전용 템플릿들)은 미사용 확인 후 삭제됨(2026-07-15). `OtherPromotionsEditor`(Lifestyle/Theme)는 `ModuleEditPanel.tsx`의 banner 모듈에서 재사용 중이라 유지.
  - `bigPromoCommon.tsx` — 공용 폼/레이아웃 컴포넌트(`ShowToggle` 등), 여러 빌더에서 공유 중이라 유지
  - `templates/` — 위 섹션들의 실제 렌더러(총 ~15종, `toPng` export)
- **`components/brandshop/EDITOR_RULES.md`** — Head Copy 2줄 제한 규칙(600px / LGEI Headline 52px / weight 600 / line-height 1.24, 오프캔버스 ruler div로 `Math.round(height/(52*1.24))` 줄 수 측정). 헤드카피 에디터 작업 시 반드시 참고.

#### 2026-08-12 — AHQ(광고주용 원본)에서 4개 모듈 포트
원본 `76ca164..c190db1`의 KV / Product Cards / Vouchers / Banner를 가져왔다. **cherry-pick은 세 커밋 전부 충돌한다** —
원본이 이 함수들을 통째로 재작성했고, 그 블록을 그대로 받으면 이 fork의 브랜드 자간과 태국어 세로 여유가 같이 사라진다.
diff는 스펙으로만 쓰고 마크업은 손으로 옮겼다. 원본은 `ahq` 로컬 remote로 붙어 있다(읽기 전용, `git fetch ahq main`).

- **Product Cards 2/3/4/6** — `cols = count === 3 || 6 ? 3 : 2`. 2·4는 와이드 485×290, 3·6은 290 정사각.
  행이 콘텐츠 폭을 flex로 꽉 채워야 개수를 바꿔도 좌우가 안 출렁인다(고정 350은 10px 모자랐다).
  **크롭은 항상 와이드 프레임 하나**로 하고 정사각 가이드를 겹쳐 보여준다 — 한 번 잡은 프레이밍이 두 배치 모두를 커버하므로
  개수를 바꿔도 사진이 잘려나가지 않는다. 기본 사진 3장은 970×580(= `padToCropAspect` 캔버스)로 다시 뽑은 것이다
- **Vouchers Group 3** — 검은 카드 2~5개. `smallVouchers.length`가 곧 개수(별도 필드 없음).
  `"Off"`는 카드별이 아니라 **그룹 공유**. 세 그룹 중 마지막 하나는 끌 수 없다(`setGroupShown` 가드)
- **KV** — Info는 캔버스 상단 `absolute`, 이미지는 `top:400`의 1200×800 고정. 카피가 늘어도 사진이 안 움직인다.
  🔴 **마스크가 1440이라고 박스를 1440으로 넓히면 안 된다** — 사진의 `object-fit:cover`가 잘못된 폭을 기준으로 채워서 과확대된다.
  넘침은 `mask-size: 1440px 800px` / `mask-position: -121.834px 1.177px`로만 준다. 캠페인 로고는 폭 고정(289.193) + 세로 크롭
- **Banner = 캐러셀 그룹** — 캔버스 아이템 하나가 슬라이드 최대 6장, 페이지당 그룹 3개(`maxCount` 6→3).
  ZIP은 **슬라이드당 PNG 한 장**(`03-1-banner-…`). 구 드래프트(슬라이드가 형제 아이템 N개)는
  `storeModulesPayload.ts`가 **첫 아이템 자리에서 그룹 하나로 합친다**

##### 크롭 모달 공용 인프라 (Product Cards·KV 공유)
react-easy-crop은 crop 박스를 `min(미디어 렌더 크기, 캔버스)`로 잡는다. 원본 비율이 목표와 다르면(대부분 그렇다)
박스가 이미지 쪽으로 쪼그라들어 **가이드 오버레이·최종 프레임과 어긋난다**.
→ `padToCropAspect(dataUrl, aspect)`로 970×round(970/aspect)에 레터박스/필러박스 패딩해서 넘긴다.
`Fit`은 패딩 포함 폭이 아니라 **실제 사진 가장자리**가 프레임에 닿아야 하므로 `contentWidthRatio`로 한 번 더 나눈다(`fitWidthContentRatio`).

### 3) ID Banner Builder — Lazada 검색 배너
- `components/idbanner/IdBannerBuilder.tsx`(프로모션 여부 → Default/Promotion 분기) + `IdBannerDefaultEditor`, `IdBannerPromotionEditor`
- `idbanner/templates/`: Default PC 1200×300 / MO 702×320, Promotion PC 1200×300 / MO 702×320
- 용도: Lazada에서 "LG" 검색 시 노출되는 배너

### 4) Off-site Banner Builder — Meta / PMax 광고 소재
- `components/offsite/OffSiteBannerBuilder.tsx` — 3단계 위저드(URL 입력 → Edit → Size Variation & ZIP)
- 한 블록 = 한 KV = 한 배너, 두 사이즈(1200×1200 / 1200×650)로 동시 출력. 블록마다 배경·로고·카피·프라이스 태그·CTA를 따로 가진다
- `offsiteTypes.ts`에 상태 모델과 **사이즈별 레이아웃 테이블**(`OFFSITE_LAYOUT`)이 함께 있다 — 디자인 개정은 템플릿 수정이 아니라 테이블 편집
- 제품·포디움·오브젝트는 Figma 좌표에 고정하지 않고 사용자가 배치한다(`OffSitePlacementModal`). 드래그 전까지는 제품 개수에서 파생된 자동 배치
- 상단 shared 그룹(배경·잉크·CTA·**Light direction**·Price tag 컬러)은 세션의 모든 배너에 한 번에 적용된다

#### 제품 그림자 — Light direction (Photoshop의 Global Light)
그림자용 PNG(round/square)는 **삭제됨**. 제품 그림자는 이제 **누끼 자체를 바닥에 투영**해서 만든다 —
알파를 그대로 따라가므로 다리·틈·얇은 스탠드까지 저절로 맞는다. 조명은 **캠페인 단위 하나**(`OffSiteCampaign.light`)고,
제품이 가진 선택권은 show/hide 토글뿐이다(벽걸이용).

- 기하: 밑변에서 높이 `h`인 점은 `h / tan(altitude)`만큼 조명 반대편 바닥에 떨어진다. 그 벡터를 **가로 성분 → 기울기(`skewX`)**,
  **깊이 성분 → 세로 배율의 부호와 크기**로 나눈다. **부호가 앞뒤를 가른다** — 조명이 앞에 있으면 그림자가 제품 뒤로 넘어간다.
  단순 상하 반전으로는 이걸 표현할 수 없다
- **블러는 반드시 transform 바깥에** 둔다. 누끼를 블러한 뒤 세로로 누르면 세로 방향 부드러움이 `scaleY`로 나눠져서
  (짧은 그림자에선 1/5 이하) 가로 실루엣 경계가 **딱 꺾이는 선**으로 살아남는다. 한 값이 두 방향에서 정반대로 틀어진다
- 블러는 **제품 너비가 아니라 배너 너비** 기준이다. 부드러움은 조명의 속성이지 물체의 속성이 아니라서,
  제품별로 스케일하면 폭 넓은 TV가 옆의 세탁기보다 흐려져 서로 다른 공간처럼 읽힌다
- 길이 제한이 **두 겹**인 이유: 다이얼 테두리 = altitude 50°(핸들이 걸린다), 그 위에 `tanh` 포화로 30% 점근.
  하드 컷만 쓰면 어느 고도 아래가 전부 같은 그림자가 돼서 **다이얼 일부가 죽는다** — 실제로 시도했다가 되돌렸다
- `CAST_MIN`(최소 길이)을 키우면 **수평선 근처가 통째로 같은 값에 눌린다**. 0.06일 때 altitude 65°에서 ±30°가 죽었다.
  0.015로 낮춰 ±7°로 줄임
- 기본값 `DEFAULT_LIGHT = { angle: 340, altitude: 65, opacity: 20 }`

#### 누끼 엣지 −0.5px
자동 누끼 직후 `contractAlpha(dataUrl, 0.5)`로 알파 경계를 안쪽으로 당긴다. 흰 테두리의 정체는 알파가 애매한 게 아니라
**그 픽셀의 색 자체가 절반쯤 스튜디오 배경**이라서, 다듬는 게 아니라 버려야 한다.
1px 침식 = 상하좌우 최솟값이므로 0.5px는 그쪽으로 절반만 보간한다. **픽셀 격자가 그대로**라 원본과의 정렬이 유지되고,
브러시 에디터의 복원 브러시가 그 정렬에 의존한다.

## Server / API (NO `/api` directory)
- `server.ts` (`npm start`, tsx, Express, 기본 PORT 3000) + `vite-api-plugin.ts`(dev 서버용 동일 미들웨어). **이전의 Vercel serverless `api/` 디렉토리는 더 이상 없음.**
- `/api/proxy-image` (GET) — 도메인 화이트리스트(LG.com, Lazada, Shopee, GSC CDN 등) 이미지 프록시, `Cache-Control: max-age=86400`
- `/api/crawl-page` (POST) — cheerio HTML 크롤러. gallery 셀렉터/og:image/ld+json/img/data-*/picture/background-image/링크에서 이미지 추출, URL·context 기준 dedup, 최대 200장 + context(주변 heading/figcaption/alt) 반환
- `server.ts`는 `/dist` 정적 서빙 + SPA fallback(`index.html`)도 담당

## Scripts (package.json)
```bash
npm run dev          # vite dev --port 5174 (원본 레포와 로컬에서 동시 실행 가능하도록 포트 분리, vite-api-plugin이 /api/* 제공)
npm run build        # vite build → dist/
npm start            # tsx server.ts (프로덕션 Express)
npm run assets:build # tsx scripts/buildAssetLibrary.ts
npm run assets:content-template  # tsx scripts/buildContentTemplateAssets.ts (Content Template 소재 → WebP)
npm run translate:claude  # tsx scripts/translateClaude.ts  (예: … th) ← 이걸 쓴다
npm run translate         # tsx scripts/translate.ts (Google 키 필요, 이 레포엔 없음)
```
- `scripts/buildAssetLibrary.ts` — 외부 자산 레포(기본값 `../lg-retail-obs-assets-th`, `ASSETS_REPO_PATH`로 변경) 스캔 → `{category}/_thumbs/` 200×200 WebP 썸네일 생성(idempotent) → `public/asset-library/manifest.json` 작성. 썸네일은 data: URL로 인라인(그리드 1회 fetch), 풀사이즈는 jsDelivr CDN(`contentfactoryhsad-blip/lg-retail-obs-assets-th`, 원본 레포와 별개 — 반드시 public repo), SVG는 data:image/svg+xml 인라인. `components/AssetLibraryModal.tsx`가 이 manifest를 소비.
  - 스크립트 기본값(`ASSETS_REPO_PATH`/`ASSETS_REPO_SLUG`)은 아직 원본을 가리키므로, 이 레포에서 재실행할 땐 반드시 `ASSETS_REPO_PATH=../lg-retail-obs-assets-th ASSETS_REPO_SLUG=contentfactoryhsad-blip/lg-retail-obs-assets-th npm run assets:build`로 오버라이드할 것.
- `scripts/translate.ts` — `src/locales/en.json`(원본)을 Anthropic Claude(Haiku)로 번역해 `src/locales/{code}.json` 생성. 인자로 대상 언어 지정 가능.

## i18n
- `src/app/i18n/`(LanguageContext + languages). **EN + TH 두 개뿐.** 나머지 8개 시장 로케일은 상위 레포에서 딸려온 것이라 2026-08-10에 삭제했다 — 선택기에 한 번도 노출된 적이 없는데 번역 실행 때마다 비용만 들었다. 필요해지면 git 히스토리에서 복원.
- 번역 JSON은 `src/locales/{code}.json`. 컴포넌트는 `useT()` 훅 사용.
- **실행 스크립트는 `npm run translate:claude` (`scripts/translateClaude.ts`)다.** `scripts/translate.ts`는 Google Translate 키를 요구하는데 이 레포에는 없다(`.env.local`엔 `ANTHROPIC_API_KEY`만). 931키 기준 약 4분. 키는 `envUtils.ts`의 `getAnthropicApiKey()`로 읽으므로 env → `.env.local` 순으로 알아서 찾는다(앞에 키를 붙일 필요 없음).
- 🔴 **`t()`로 감싸는 것만으로는 번역되지 않는다.** 번역기는 `en.json`을 원본으로 읽으므로, **키가 `en.json`에 없으면 어느 언어로도 안 나간다.** 2026-08-10에 이 상태로 108키가 방치돼 있었다(off-site 패널 대부분, discount의 `UP TO`/`EXTRA` 포함). 문자열을 추가하면 `en.json`에도 넣을 것. 감사 방법:
  - `t('...')` 호출을 긁어 `en.json`에 없는 키 찾기
  - **`t(변수)` 패턴도 잊지 말 것** — 라벨을 상수로 두고 렌더 시 `t(opt.label)`로 번역하는 곳이 많다. 리터럴만 스캔하면 21개를 놓친다
  - `t()`를 아예 안 거치는 출력 카피도 확인(예전에 배너 기본 disclaimer가 그랬다)
- **`th.json`을 직접 고치지 말 것.** 재번역이 파일을 통째로 재생성한다. 기계가 구조적으로 틀리는 것과 **박스에 안 들어가는** 것은 `translateClaude.ts`의 `OVERRIDES` 맵에 넣는다(무엇이 어떻게 틀렸는지 주석 필수).
  - 이 앱의 **"copy"는 전부 광고 카피**인데 기계는 복사본(`สำเนา`)/복사하다(`คัดลอก`)로 읽는다 → `ข้อความ`
  - `Podium A` 옆에서 `Object A`만 글자를 태국 문자(`ก`)로 현지화하는 식의 짝 안 맞음도 감시할 것
  - `Off`는 **전원 끄기(`ปิด`)가 아니라 할인(`ลด`)**이다. 바우처 카드에 30px로 박히던 걸 2026-08-12에 잡았다
  - **한 아트에 나란히 놓이는 것들은 같은 단어를 써야 한다.** `Voucher`가 한 모듈 안에서 다섯 가지로
    돌아왔고 그 중 셋이 세로로 쌓여 있었다 → 전부 `บัตรลดราคา`로 통일

- 🔴 **번역이 태국어가 아닐 수 있다.** 2026-08-12에 아홉 개가 그랬다 —
  `วาউเชอร์`엔 **벵골 문자 U(U+0989)**, `วาउเชอร์`엔 **데바나가리 U(U+0909)**가 단어 한가운데 있었고,
  `Event`/`VIP Event`는 통째로 **일본어**(`イベント`)였다. 눈으로는 안 보인다 — 재번역 후 반드시 스캔할 것:
  ```
  값의 각 문자가 ASCII / U+0E00–0E7F(태국어) / 일반 문장부호(· × ™ → 등)에 없으면 보고
  ```
- **검증은 렌더로.** 문자열 길이만 보지 말고 실제 컴포넌트를 태국어로 그린 뒤
  `scrollWidth > clientWidth`인 클리핑 박스를 훑는다. 실제로 `พร้อมบัตรลดราคาแพลตฟอร์ม`가
  260px 라벨에 295px로 들어가 잘렸다(→ `พร้อม`을 뺐다. 티켓 사이 `+`가 그 뜻을 이미 갖고 있다).
  **검출기부터 검증할 것** — 일부러 깨진 값을 넣어 잡히는지 보고, 스캔 개수를 같이 찍는다

## Output Fonts (출력물 전용, 앱 UI는 항상 LGEI)

### ⚠️ 전 콘텐츠 일괄 원칙
폰트 관련 값(**weight / 크기 비율 / 자간**)은 **모든 빌더의 구석구석까지 빠짐없이** 동일하게 적용한다. 한 빌더만 고치고 끝내지 않는다.
실제 사례: 태국어 상단 잘림 수정이 off-site에만 들어가 있었는데, 같은 패턴이 **11개 파일 51곳**에 퍼져 있었다.

**유일한 예외는 off-site discount 부분**(Figma 4139:304). 여기는 디자이너가 치환표를 거치지 않고 브랜드별 페이스를 직접 지정하므로, 브랜드마다 weight·사이즈가 다른 게 의도된 것이다. 나머지 규칙에 맞추려 하지 말 것.

작업 후에는 값으로 훑어서 누락을 확인한다 — 예: head copy 대역(52–72px) fontSize를 전부 뽑아 weight가 600이 아닌 곳이 있는지 확인.

### 스택 구성 (`src/styles/fonts.css` + `src/app/fonts/brandFonts.ts`)
`--obs-font`(헤드) / `--obs-font-text`(본문) / `--obs-tracking`을 `useApplyBrandFont`가 root에 publish.
각 브랜드는 **라틴 + 태국어 페이스 한 쌍**이고, 태국어는 `unicode-range: U+0E00-0E7F`로 핀한다 —
폰트 선택이 **UI 언어가 아니라 글자 코드포인트 기준**이라 한 줄에 섞여 있어도 자동으로 갈린다(섞어짜기).

| | 라틴 | 태국어 |
|---|---|---|
| LG | LGEI Headline / Text | **LINE Seed Sans TH** (size-adjust 100%) |
| Shopee | ShopeeFont Rounded (95%) | 동일 패밀리 |
| Lazada | Euclid Circular A (93%) | DB Helvethaica X (**143%**) |

- **size-adjust를 바꾸면 metric override도 반드시 다시 나눈다**: `ascent = 95/sa`, `descent = 22/sa`, `line-gap = 17/sa`
- weight 치환표는 fonts.css 상단 주석 참고. **Shopee는 600→SemiBold / 700→Bold** (원래 Medium/SemiBold였는데 LG 대비 잉크량 −8.6%로 가벼워서 한 단계씩 올림)
- 자간은 **콘텐츠 언어별**(`trackingEm` / `trackingEmThai`). `letter-spacing`이 요소 단위라 한 줄 안에서 스크립트별로 못 나눈다 — Lazada는 영문 −1% / 태국어 +1%로 정반대라 언어로 가르는 게 유일한 방법

### 자간 현황 (2026-08-10)

| | 본문 `--obs-tracking` | head copy(52–74px) `--obs-tracking-head` |
|---|---|---|
| LG | 0 | 0 |
| Shopee | 0 | 0 |
| Lazada 영문 | −1% | **−2%** |
| Lazada 태국어 | +1% | +1% |

**보정이 남은 건 Lazada뿐이다.** Shopee는 −2%였는데, 그 값은 자간이 걸린 몇 군데에만 적용되던 시절에 정한 것이라
전면 적용 후엔 라운드 페이스가 답답해져서 0으로 되돌렸다. head copy만 한 단계 더 좁히는 이유는 Euclid가 여기서 제일
넓은 페이스이고 디스플레이 크기는 본문보다 타이트해야 하기 때문. **태국어는 제외** — DB Helvethaica는 반대로 +1%를
받고 있어서 같이 좁히면 그 보정이 상쇄된다.

### 🔴 자간은 텍스트 **전부**와 그 **ruler**에 붙어야 한다
2026-08-10 전수 조사에서 **아트 50곳 + ruler 40곳**이 `letter-spacing`을 아예 안 갖고 있었다.
즉 그 자리는 브랜드 자간을 한 번도 받은 적이 없었다(Brand Shop 모듈 전반, 썸네일 템플릿 다수, Product Card 슬로건).

**ruler 쪽이 더 위험하다.** ruler가 아트와 다른 자간으로 재면 줄 수를 잘못 세고, 카피가 일찍 거부되거나
**잘린 채 export된다.** 아트와 ruler는 반드시 같이 고칠 것.

LG는 자간이 0이고 `letter-spacing: 0em`은 `normal`과 같은 조판이라, 이 작업으로 LG 출력은 변하지 않는다 —
바뀌는 건 Shopee와 Lazada뿐이다.

### 태국어 세로 여유 (반드시 지킬 것)
태국어는 성조가 GPOS로 쌓여서 **베이스라인 위 107.4% / 아래 29.6%**까지 간다 (라틴은 85.7% / 19.4%).
**글리프 bbox로 재면 89%로 나와서 못 잡는다** — 반드시 실제 셰이핑(canvas `actualBoundingBox*`)으로 잴 것.
→ 클리핑되는 텍스트 박스는 전부 `paddingTop: '0.24em' / marginTop: '-0.24em' / paddingBottom: '0.2em' / marginBottom: '-0.2em'`.
세로쓰기 배지처럼 **부모가 자르는** 경우엔 padding을 부모에 줘야 한다(자식에 주면 안 먹는다).

### ✅ 해결됨 — 작은 크기 head/sub 구분 (2026-08-10)
**18–38px 구간의 LGEI 보정(Figma Semibold→400, Regular→300)은 LGEI 전용 사실인데 전 브랜드에 걸려 있었다.**
LGEI 스태틱 TTF가 Figma 가변폰트보다 무겁게 렌더된다는 게 근거인데, ShopeeFont나 Euclid엔 해당되지 않는다.

게다가 **LINE Seed(LG 태국어)와 ShopeeFont Rounded는 Light 페이스가 없어 100–400이 전부 Regular**다.
그래서 이 보정이 걸린 곳에서는 head(400)와 sub(300)이 **같은 페이스로 떨어져 굵기 차이가 통째로 사라졌다.**

→ `brandFonts.ts`의 **`smallCopyWeight(font, lang, role)`** 로 해결. **Figma 표기 그대로(600/400) 쓰되,
보정은 그것이 나온 자리에만 — LG의 라틴에만 — 적용한다:**

| | head | sub |
|---|---|---|
| LG 영문 | 400 | 300 |
| LG 태국어 | 600 | 400 |
| Shopee / Lazada (전 언어) | 600 | 400 |

**LG 태국어를 보정에서 뺀 건 의도적이다.** 이 카탈로그의 태국어 카피엔 라틴 제품명이 늘 섞여 있어서
(`ซื้อ LG OLED evo วันนี้`), 라틴만 보정하면 태국어는 Bold인데 모델명만 Regular로 남아 한 줄이 얼룩덜룩해진다.

`useApplyBrandFont`가 **`--obs-w-head-sm` / `--obs-w-sub-sm`** 으로 publish하므로 템플릿은
`fontWeight: 'var(--obs-w-head-sm, 400)'`로 읽는다(자간과 같은 경로 — export 경로 두 곳이 프로바이더 바깥에서 마운트된다).
**ruler도 같은 변수를 써야 한다.**

적용 현황: ID Banner Promotion(PC·MO·ruler). 다른 빌더는 2026-08-10 전수 조사에서 문제 쌍이 없음을 확인했다 —
head/sub 쌍이 전부 600 vs 400/300이라 다섯 페이스 모두에서 대비가 유지된다.

## 죽은 코드를 지울 때 — Tailwind가 셈에 들어간다

`vite build` 산출물은 **import 그래프만의 함수가 아니다.** Tailwind v4는 소스 파일을
import 여부와 무관하게 전부 훑어 클래스를 수집하므로, 번들에 실리지도 않는 파일을 지우면
**CSS 규칙이 사라지고 모든 청크 해시가 따라 바뀐다.** "안 쓰는 파일이니 산출물은 그대로겠지"는
틀렸다 — 2026-08-13에 실제로 그렇게 나왔다.

그래서 지우기 전에 확인할 것:
1. 진입점(`index.html` → `src/main.tsx`)부터 import를 타서 **닿지 않는 모듈**을 뽑는다.
   상대경로 해석만 하면 되지만 **동적 `import()`도 같이 볼 것**(App.tsx가 빌더를 전부 lazy로 문다)
2. 지운 뒤 CSS를 대조해 **사라진 셀렉터가 살아있는 소스에 토큰으로도 없는지** 확인한다.
   `className`만 훑으면 안 된다 — 클래스를 문자열로 들고 있다가 나중에 붙이는 자리가 있다
3. `` className={`...${...}`} ``가 **클래스 이름 조각을 보간**하는지 본다. 완성된 클래스 문자열을
   고르는 형태(`${on ? 'bg-red-500' : 'bg-gray-100'}`)면 Tailwind가 여전히 리터럴로 보므로 안전하다
4. 마지막은 **화면 픽셀 대조**. 비교기부터 검증할 것 — 밝기를 2%만 바꾼 이미지를 넣어
   차이가 잡히는지 보고 나서 "0 차이"를 믿는다

🔴 **`public/`은 다르다.** 통째로 `dist/`에 복사되므로 참조되지 않는 에셋이라도 지우면 배포물이
실제로 줄어든다. 산출물을 건드리면 안 되는 상황에서는 손대지 말 것. 지금 안 쓰이는 폰트가
585KB 있다(`LGEIHeadline-*.woff` 5종 — TTF 쪽을 쓴다, `ShopeeFontRounded-Medium.ttf` — weight를
한 단계씩 올린 뒤로 미사용).

### 검증 방법 (숫자만 믿지 말 것)
1. 헤드리스 크롬으로 **렌더해서 캡쳐를 눈으로 본다**. 계산만으로 "맞다"고 판단하지 않는다
2. 넘침 전수 조사는 실제 컴포넌트를 태국어로 렌더해 `scrollHeight > clientHeight`를 스캔한다
3. **검출기부터 검증한다** — 일부러 깨진 값을 넣어 잡히는지 확인. 스캔 개수를 같이 찍어야 "렌더가 안 된 것"과 "문제가 없는 것"을 구분할 수 있다

#### 🔴 하네스에 `fonts.css`를 반드시 import하고 `document.fonts.size`를 찍을 것
2026-08-13에 오탐 하나를 이걸로 만들었다. 레포 루트에 테스트 HTML을 두고 `/src/...`를 import하면
컴포넌트는 오지만 **`@font-face`는 하나도 선언되지 않는다**(`document.fonts.size === 0`).
그러면 브랜드 폰트가 조용히 시스템 폴백으로 그려지고, **라틴 텍스트 측정이 통째로 무의미해진다.**

- **`document.fonts.check('600 40px "LGEI Headline"')`는 선언조차 안 된 패밀리에도 `true`를 준다.**
  "이 폰트로 그릴 수 있나"가 아니라 "요청을 처리할 수 있나"를 답하므로 로드 확인에 쓸 수 없다
- 확실한 확인: 같은 문자열을 `"LGEI Headline"`과 `sans-serif`로 재서 **폭이 똑같으면 폴백**이다
- **태국어는 우연히 무사했다** — LINE Seed / ShopeeFont가 이 맥에 시스템 설치돼 있어 실물로 그려졌다.
  다른 기계에서는 그것도 폴백이 된다. 우연에 기대지 말고 CSS를 불러올 것
4. **전체 해상도로 본다.** 축소한 캡쳐는 진짜 클리핑을 숨긴다 — 글자가 중간 높이에서 잘리면
   남은 윗부분이 축소 과정에서 사라져 멀쩡해 보인다. 2026-08-13에 3건이 그렇게 안 보였다

## Key Utils / Services
- `utils/imageUrlLoader.ts` — `fetchAsDataUrl`(CORS 실패 시 프록시 fallback), `preloadImagesToDataUrls`(export 전 워밍업, 복원 함수 반환), `blobToDataUrl`
- `utils/fileSaver.ts` — `saveBlob` (File System Access API → `<a download>` fallback)
- `utils/contractAlpha.ts` — 누끼 알파 경계를 서브픽셀로 안쪽에 당긴다(흰 테두리 제거). 픽셀 격자는 그대로 둔다
- `services/imageScraperApi.ts` — `scrapeProductImages`(→ `/api/crawl-page`), `getProxiedImageUrl`
- (참고) 예전 `utils/excelParser.ts`, `utils/rowToState.ts`는 **삭제됨**

## Export 메커니즘
- 공통: `html-to-image`로 **워밍업 패스 2회**(폰트/리소스 캐시) 후 3번째에 `cacheBust: true`로 최종 export. export 직전 `preloadImagesToDataUrls`로 이미지 인라인.
- Product Card는 `toBlob` 1200×1200 / 파일명 `product-card-{templateType}-{size}-{YYMMDD}.png`. Brand Shop·ID Banner는 `toPng`, 사이즈는 에디터별 가변.

### Content Template Builder의 Download ZIP — 이미지와 영상이 방식이 다르다

**이미지(PNG) = 다운로드 시점에 실시간 렌더.** 카피(headline/subcopy/CTA/disclaimer), PD Slot 제품 누끼,
슬롯 컬러가 들어가 조합이 무한하므로 미리 만들 수 없다. 숨김 호스트(`.ctb-export-host`)에 캔버스와 같은
컴포넌트를 사이즈당 하나씩 `scale=1`로 마운트해 촬영한다(`exportSlots.ts`, `[data-export-box]`가 촬영 대상,
호스트 안에서만 `border-radius:0`). LG.com 6칸 ≈ 3초.

- 🔴 **bare 규칙**: LG.com의 `ST0001-pc-1920x720`·`ST0001-mo-720x960` 두 히어로는 **아트 + 아이콘 로우 + 디스클레이머**를
  담아 내보낸다(eyebrow/headline/subcopy/CTA/indicator 제외 — LG.com이 카피를 라이브로 얹지만, 디스클레이머는
  2026-09-03부터 구워 나간다). mp4도 동일: 오버레이가 전체 프레임 캡처(아이콘 로우+디스클레이머)로 합성된다.
  판정은 `lgcomSlots.ts`의 `bareOnExport(slotId)`. 나머지 4칸과 유료매체는 캔버스에 보이는 그대로.

**영상(mp4) = 다운로드 시점에 브라우저에서 실시간 컷.** `renderMotionCutLive`(`exportMotion.ts`)가
**WebCodecs**(mediabunny)로 하드웨어 디코드 → 캔버스 합성(아트 배치 + 아이콘 로우) → 하드웨어 H.264 인코드.
현재 `lgcomSlots.ts`의 배치값을 그대로 읽으므로 사이즈·배치가 바뀌어도 재생성할 것이 없다. 7초 마스터 기준
1920×720 ≈ 8.5초(초기화 포함) + 720×960 ≈ 1.3초, ZIP 전체 ≈ 12초. 모션 자산(현재 `ad-teasing`뿐)의
두 히어로 칸만 mp4, 나머지는 PNG. 새 사이즈를 영상으로 켜려면 `bareOnExport` 판정에 추가(짝수 픽셀이어야 함
— H.264 제약, 예: 125×125는 불가).

- 🔴 **사전 렌더 폴백은 만들었다가 걷어냈다** — 배치값을 스크립트에 손으로 복사해야 해서 낡은 영상이 조용히
  담기는 사고 경로였고, 대상 브라우저는 전부 WebCodecs를 지원한다. 컷 실패는 파일을 빼고 **alert로 알린다**;
  낡은 파일로 덮지 말 것.
- 🔴 **ffmpeg.wasm은 시도했다 폐기했다** — 단일스레드 소프트웨어 인코딩이라 한 편에 8분+. 실시간 컷이 필요하면
  WebCodecs(mediabunny)를 쓸 것; wasm은 다시 검토하지 말 것.

## Crawling 세부
- 추출: og:image, JSON-LD, gallery 셀렉터, 모든 `<img>`, data-large-d/m, data-srcset, `<picture>`, `<a href="*.jpg">`, background-image
- 필터: 프로모션 배너/GNB/buying-guide/트래킹 픽셀/SVG·GIF 제외, 페이지당 최대 200장
- CORS 위해 `/api/proxy-image?url=...` 프록시 필요

## Deployment
- 코드상 `vercel.json` 등 명시적 배포 설정 없음. 프로덕션은 `npm start`(Express)로 `dist/` 서빙하는 구조.
- Railway **별도 프로젝트**(원본 광고주용 프로젝트와 무관)로 이 레포(`lg-retail-obs-content-builder-th`, `main` 브랜치)를 연결해 배포. `nixpacks.toml`은 원본과 동일(`npm run build` → `npm start`), 필요한 런타임 env 없음(`PORT`는 Railway가 주입).
