import React, { useEffect, useState, Suspense, lazy } from 'react';
import { ContentBuilderHome } from './components/ContentBuilderHome';
import type { NavRailKey } from './components/NavRail';
import {
  ThumbnailType,
  Orientation,
} from './components/thumbnail/thumbnailRegistry';
import { makeInitialThumbnailStates, ThumbnailAllStates } from './components/thumbnail/thumbnailTypes';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { getDraftKind } from './drafts/draftKinds';
import type { DraftRecord } from './utils/draftStore';
import type { StoreModulesPayloadV1 } from './drafts/storeModulesPayload';
import type { DealPagePayloadV1 } from './drafts/dealPagePayload';
import type { IdBannerDefaultPayloadV1, IdBannerPromotionPayloadV1 } from './drafts/idBannerPayload';
import type { OffSitePayloadV1 } from './drafts/offsitePayload';
import {
  restoreThumbnailSingle,
  type ThumbnailSinglePayloadV1,
  type ThumbnailBulkPayloadV1,
} from './drafts/thumbnailPayload';

// Lazy-loaded: each builder pulls its own heavy deps (html-to-image, jszip,
// @dnd-kit, per-template renderers) — split into separate chunks so opening
// one builder doesn't download the other two's code on first paint.
const ThumbnailSelector = lazy(() =>
  import('./components/thumbnail/ThumbnailSelector').then((m) => ({ default: m.ThumbnailSelector })),
);
const ThumbnailBulkGenerator = lazy(() =>
  import('./components/thumbnail/ThumbnailBulkGenerator').then((m) => ({ default: m.ThumbnailBulkGenerator })),
);
const ThumbnailEditor = lazy(() =>
  import('./components/thumbnail/ThumbnailEditor').then((m) => ({ default: m.ThumbnailEditor })),
);
const BrandShopBuilder = lazy(() =>
  import('./components/BrandShopBuilder').then((m) => ({ default: m.BrandShopBuilder })),
);
const DealPageBuilder = lazy(() =>
  import('./components/dealpage/DealPageBuilder').then((m) => ({ default: m.DealPageBuilder })),
);
const IdBannerBuilder = lazy(() =>
  import('./components/idbanner/IdBannerBuilder').then((m) => ({ default: m.IdBannerBuilder })),
);
const OffSiteBannerBuilder = lazy(() =>
  import('./components/offsite/OffSiteBannerBuilder').then((m) => ({ default: m.OffSiteBannerBuilder })),
);
const ContentTemplateBuilder = lazy(() =>
  import('./components/contenttemplate/ContentTemplateBuilder').then((m) => ({ default: m.ContentTemplateBuilder })),
);

// 'thumbnail-single' survives only for legacy feature-text drafts — the live
// flow goes home → thumbnail-select (Product Card templates) → thumbnail-bulk,
// where the feature cards are now a wizard step instead of a separate builder.
type AppStep = 'home' | 'content-template' | 'brand-shop' | 'deal-page' | 'thumbnail-select' | 'thumbnail-bulk' | 'thumbnail-single' | 'id-banner' | 'off-site';

/** A draft ready to open: payload already migrated to the current schema. */
interface ResumeDraft {
  id: string;
  builder: DraftRecord['builder'];
  title: string;
  payload: unknown;
}

function AppInner() {
  const { lock, unlock, setLang, t } = useLanguage();
  const [step, setStep] = useState<AppStep>('home');
  const [selectedThumbnail, setSelectedThumbnail] = useState<ThumbnailType>('default');
  const [singleStates, setSingleStates] = useState<ThumbnailAllStates>(() => makeInitialThumbnailStates(t));
  const [singleOrientation, setSingleOrientation] = useState<Orientation>('horizontal');
  const [resumeDraft, setResumeDraft] = useState<ResumeDraft | null>(null);

  // Open a saved draft (from the home Recent Work list or a project-file
  // import): restore its language while still unlocked, migrate the payload,
  // then deep-open the owning builder. Adding a builder = one more case here.
  const handleOpenDraft = (rec: DraftRecord) => {
    const kind = getDraftKind(rec.builder);
    if (!kind) return;
    const migrated = kind.migrate(rec.payload, rec.schemaVersion);
    if (migrated == null) {
      alert(t('This saved work was made with a newer version of the app and cannot be opened.'));
      return;
    }
    setLang(rec.lang); // still on home => unlocked; step effect locks after nav
    setResumeDraft({ id: rec.id, builder: rec.builder, title: rec.title, payload: migrated });
    if (rec.builder === 'sis-store-modules') {
      setStep('brand-shop');
    } else if (rec.builder === 'deal-page') {
      setStep('deal-page');
    } else if (rec.builder === 'thumbnail-single') {
      const restored = restoreThumbnailSingle(migrated as ThumbnailSinglePayloadV1, t);
      setSelectedThumbnail(restored.slotId);
      setSingleStates(restored.allStates);
      setSingleOrientation(restored.orientation);
      setStep('thumbnail-single');
    } else if (rec.builder === 'thumbnail-bulk') {
      setSelectedThumbnail((migrated as ThumbnailBulkPayloadV1).slotId ?? 'default');
      setStep('thumbnail-bulk');
    } else if (rec.builder === 'id-banner-default' || rec.builder === 'id-banner-promotion') {
      setStep('id-banner');
    } else if (rec.builder === 'off-site') {
      setStep('off-site');
    }
  };

  useEffect(() => {
    if (step === 'home' || step === 'thumbnail-select') unlock();
    else lock();
  }, [step, lock, unlock]);

  // NavRail is only shown on Home/selector screens (not inside builder editors) —
  // each target jumps to that builder's entry point, same as its home card.
  function handleRailNavigate(target: NavRailKey) {
    if (target === 'home') { setStep('home'); return; }
    if (target === 'content-template') { setResumeDraft(null); setStep('content-template'); return; }
    if (target === 'thumbnail') { setResumeDraft(null); setStep('thumbnail-select'); return; }
    if (target === 'shop-in-shop') { setResumeDraft(null); setStep('brand-shop'); return; }
    if (target === 'deal-page') { setResumeDraft(null); setStep('deal-page'); return; }
    if (target === 'id-banner') { setStep('id-banner'); return; }
    if (target === 'off-site') { setResumeDraft(null); setStep('off-site'); return; }
  }

  if (step === 'home') {
    return (
      <ContentBuilderHome
        onSelectContentTemplate={() => { setResumeDraft(null); setStep('content-template'); }}
        onSelectPromotionPage={() => { setResumeDraft(null); setStep('brand-shop'); }}
        onSelectDealPage={() => { setResumeDraft(null); setStep('deal-page'); }}
        onOpenDraft={handleOpenDraft}
        railActive="home"
        onRailNavigate={handleRailNavigate}
      />
    );
  }

  if (step === 'content-template') {
    return (
      <ContentTemplateBuilder
        onBack={() => setStep('home')}
        railActive="content-template"
        onRailNavigate={handleRailNavigate}
        onOpenDraft={handleOpenDraft}
      />
    );
  }

  if (step === 'thumbnail-select') {
    return (
      <ThumbnailSelector
        category="product-card"
        onSelect={(type) => {
          setResumeDraft(null); // fresh session — never reuse a resumed draft id
          setSelectedThumbnail(type);
          setStep('thumbnail-bulk');
        }}
        railActive="thumbnail"
        onRailNavigate={handleRailNavigate}
        onOpenDraft={handleOpenDraft}
      />
    );
  }

  if (step === 'thumbnail-single') {
    const tsDraft = resumeDraft?.builder === 'thumbnail-single' ? resumeDraft : null;
    return (
      <ThumbnailEditor
        key={tsDraft?.id ?? 'fresh'}
        slotId={selectedThumbnail}
        orientation={singleOrientation}
        onOrientationChange={setSingleOrientation}
        onBack={() => { setResumeDraft(null); setStep('thumbnail-select'); }}
        allStates={singleStates}
        onAllStatesChange={setSingleStates}
        draftSave={{ initialDraftId: tsDraft?.id, initialTitle: tsDraft?.title }}
        railActive="thumbnail"
        onRailNavigate={handleRailNavigate}
        onOpenDraft={handleOpenDraft}
      />
    );
  }

  if (step === 'thumbnail-bulk') {
    const tbDraft = resumeDraft?.builder === 'thumbnail-bulk' ? resumeDraft : null;
    return (
      <ThumbnailBulkGenerator
        key={tbDraft?.id ?? 'fresh'}
        slotId={selectedThumbnail}
        onBack={() => { setResumeDraft(null); setStep('thumbnail-select'); }}
        initialDraft={tbDraft ? { id: tbDraft.id, title: tbDraft.title, payload: tbDraft.payload as ThumbnailBulkPayloadV1 } : undefined}
        railActive="thumbnail"
        onRailNavigate={handleRailNavigate}
        onOpenDraft={handleOpenDraft}
      />
    );
  }

  if (step === 'brand-shop') {
    const smDraft = resumeDraft?.builder === 'sis-store-modules' ? resumeDraft : null;
    return (
      <BrandShopBuilder
        key={smDraft?.id ?? 'fresh'}
        initialStep={smDraft ? 'store-page-modules' : undefined}
        initialDraft={smDraft ? { id: smDraft.id, title: smDraft.title, payload: smDraft.payload as StoreModulesPayloadV1 } : undefined}
        railActive="shop-in-shop"
        onRailNavigate={handleRailNavigate}
        onOpenDraft={handleOpenDraft}
      />
    );
  }

  if (step === 'deal-page') {
    const dpDraft = resumeDraft?.builder === 'deal-page' ? resumeDraft : null;
    return (
      <DealPageBuilder
        key={dpDraft?.id ?? 'fresh'}
        onBack={() => setStep('home')}
        initialDraft={dpDraft ? { id: dpDraft.id, title: dpDraft.title, payload: dpDraft.payload as DealPagePayloadV1 } : undefined}
        railActive="deal-page"
        onRailNavigate={handleRailNavigate}
        onOpenDraft={handleOpenDraft}
      />
    );
  }

  if (step === 'id-banner') {
    const ibDraft =
      resumeDraft?.builder === 'id-banner-default' || resumeDraft?.builder === 'id-banner-promotion'
        ? resumeDraft
        : null;
    return (
      <IdBannerBuilder
        key={ibDraft?.id ?? 'fresh'}
        initialStep={ibDraft ? (ibDraft.builder === 'id-banner-default' ? 'default' : 'promotion') : undefined}
        initialDraft={ibDraft ? { id: ibDraft.id, title: ibDraft.title, payload: ibDraft.payload as IdBannerDefaultPayloadV1 | IdBannerPromotionPayloadV1 } : undefined}
        railActive="id-banner"
        onRailNavigate={handleRailNavigate}
        onOpenDraft={handleOpenDraft}
      />
    );
  }

  if (step === 'off-site') {
    const osDraft = resumeDraft?.builder === 'off-site' ? resumeDraft : null;
    return (
      <OffSiteBannerBuilder
        key={osDraft?.id ?? 'fresh'}
        initialDraft={osDraft ? { id: osDraft.id, title: osDraft.title, payload: osDraft.payload as OffSitePayloadV1 } : undefined}
        railActive="off-site"
        onRailNavigate={handleRailNavigate}
        onOpenDraft={handleOpenDraft}
      />
    );
  }

  return null;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#f8f7f5] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#FD312E] border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <Suspense fallback={<LoadingScreen />}>
        <AppInner />
      </Suspense>
    </LanguageProvider>
  );
}
