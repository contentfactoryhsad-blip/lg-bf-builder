import React, { useState } from 'react';
import { useT, TFunction } from '../../i18n/LanguageContext';
import { IdBannerDefaultEditor } from './IdBannerDefaultEditor';
import { IdBannerPromotionEditor } from './IdBannerPromotionEditor';
import { IdBannerDefaultMOTemplate, ID_BANNER_DEFAULT_MO_W, ID_BANNER_DEFAULT_MO_H } from './templates/IdBannerDefaultMO';
import { ID_BANNER_PROMOTION_MO_W, ID_BANNER_PROMOTION_MO_H } from './templates/IdBannerPromotionMO';
import { NavRail, type NavRailKey } from '../NavRail';
import { AppHeader } from '../AppHeader';
import type { DraftRecord } from '../../utils/draftStore';
import type { IdBannerDefaultPayloadV1, IdBannerPromotionPayloadV1 } from '../../drafts/idBannerPayload';

type Step = 'question' | 'default' | 'promotion';

interface Props {
  /** Deep-open a specific editor (used when resuming a saved draft). */
  initialStep?: Extract<Step, 'default' | 'promotion'>;
  initialDraft?: { id: string; title: string; payload: IdBannerDefaultPayloadV1 | IdBannerPromotionPayloadV1 };
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}

// Card preview — same box as every other selector card in the app
// (ContentBuilderHome, SisTypeSelector): w-72 card, 196px-tall preview box,
// #F8F7F5 background, content object-fit:contain-scaled + centered.
/** Still for the promotion card — 702 × 320, the MO banner's own size, so it
 *  drops into the same scale the live templates use. */
const PROMOTION_PREVIEW = '/id-banner/select-promotion.png';

const PREVIEW_SIZE = 196;
const PREVIEW_CONTENT_W = 288 - 40; // w-72 card minus p-5 (20px) sides

function BannerPreviewCard({
  title,
  description,
  onClick,
  bannerW,
  bannerH,
  children,
}: {
  title: string;
  description: string;
  onClick: () => void;
  bannerW: number;
  bannerH: number;
  children: React.ReactNode;
}) {
  const scale = Math.min(PREVIEW_CONTENT_W / bannerW, PREVIEW_SIZE / bannerH);
  return (
    <div className="flex flex-col gap-2 w-72">
      <button
        onClick={onClick}
        className="group bg-white border border-gray-200 rounded-2xl p-5 w-full h-full text-left flex flex-col hover:border-[#FD312E] hover:shadow-xl transition-all duration-200 cursor-pointer"
      >
        <div
          className="relative overflow-hidden rounded-md mb-4 flex items-center justify-center"
          style={{ height: PREVIEW_SIZE, background: '#F8F7F5' }}
        >
          <div
            style={{
              width: bannerW,
              height: bannerH,
              transform: `scale(${scale})`,
              pointerEvents: 'none',
              // The box is laid out at full banner size and scaled visually, so
              // it is far wider than the flex line it sits on. A live template
              // survived that because its own root is unshrinkable and sets the
              // min-content width; an <img> has no such floor and the box was
              // squeezed to the card, squashing the banner. Pin it.
              flexShrink: 0,
            }}
          >
            {children}
          </div>
          <div className="absolute inset-0 bg-[#FD312E]/0 group-hover:bg-[#FD312E]/8 transition-all duration-200 rounded-md" />
        </div>
        <div className="flex items-start justify-between gap-2 px-1">
          <div>
            <p className="font-lgei font-bold text-[15px] text-gray-900 group-hover:text-[#FD312E] transition-colors" style={{ lineHeight: '20px' }}>
              {title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5" style={{ lineHeight: '16px' }}>
              {description}
            </p>
          </div>
          <svg
            className="shrink-0 mt-0.5 text-gray-300 group-hover:text-[#FD312E] transition-colors"
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
    </div>
  );
}

function IdBannerTypeSelector({
  onSelect,
  t,
  railActive,
  onRailNavigate,
  onOpenDraft,
}: {
  onSelect: (v: 'default' | 'promotion') => void;
  t: TFunction;
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}) {
  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col">
      <AppHeader title={t('ID Banner Builder')} onBack={() => onRailNavigate('home')} />

      <div className="flex-1 flex min-h-0">
      <NavRail active={railActive} onNavigate={onRailNavigate} onOpenDraft={onOpenDraft} />
      <div className="flex-1 flex flex-col min-h-0">
      <div className="h-11 shrink-0" />
      <main className="flex-1 flex flex-col items-center px-8 pt-[41.67px] pb-10 gap-8" style={{ zoom: 1.2 }}>
        <div className="text-center flex flex-col items-center gap-3">
          <span className="inline-flex items-center gap-1.5 bg-[#FD312E] text-white text-xs font-medium px-3 py-1 rounded-full" style={{ lineHeight: '18px' }}>
            {t('for Lazada')}
          </span>
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-lgei font-bold text-[32px] text-gray-900" style={{ lineHeight: '40px' }}>
              {t('Which banner would you like to create?')}
            </h1>
            <p className="text-gray-500 text-sm" style={{ lineHeight: '20px' }}>
              {t('Choose the banner type you\'d like to create.')}
            </p>
          </div>
        </div>

        <div className="flex gap-8 flex-wrap justify-center">
          <BannerPreviewCard
            title={t('Default ver.')}
            description={t('Standard search banner featuring the LG lineup and the "Life\'s Good." slogan.')}
            onClick={() => onSelect('default')}
            bannerW={ID_BANNER_DEFAULT_MO_W}
            bannerH={ID_BANNER_DEFAULT_MO_H}
          >
            <IdBannerDefaultMOTemplate />
          </BannerPreviewCard>
          <BannerPreviewCard
            title={t('Promotion ver.')}
            description={t('Themed banner highlighting an ongoing sale with a headline and KV image.')}
            onClick={() => onSelect('promotion')}
            bannerW={ID_BANNER_PROMOTION_MO_W}
            bannerH={ID_BANNER_PROMOTION_MO_H}
          >
            {/* A supplied still rather than the live template: the promotion
                banner's own copy is Lorem placeholder either way, so rendering it
                bought nothing, and the still is what the design team signs off. */}
            <img
              src={PROMOTION_PREVIEW}
              alt=""
              style={{ width: ID_BANNER_PROMOTION_MO_W, height: ID_BANNER_PROMOTION_MO_H, display: 'block' }}
              draggable={false}
            />
          </BannerPreviewCard>
        </div>
      </main>
      </div>
      </div>
    </div>
  );
}

export function IdBannerBuilder({ initialStep, initialDraft, railActive, onRailNavigate, onOpenDraft }: Props) {
  const t = useT();
  const [step, setStep] = useState<Step>(initialStep ?? 'question');

  const backToQuestion = () => setStep('question');

  if (step === 'default') {
    return (
      <IdBannerDefaultEditor
        onBack={backToQuestion}
        initialDraft={initialStep === 'default' ? (initialDraft as { id: string; title: string; payload: IdBannerDefaultPayloadV1 }) : undefined}
        railActive={railActive}
        onRailNavigate={onRailNavigate}
        onOpenDraft={onOpenDraft}
      />
    );
  }
  if (step === 'promotion') {
    return (
      <IdBannerPromotionEditor
        onBack={backToQuestion}
        initialDraft={initialStep === 'promotion' ? (initialDraft as { id: string; title: string; payload: IdBannerPromotionPayloadV1 }) : undefined}
        railActive={railActive}
        onRailNavigate={onRailNavigate}
        onOpenDraft={onOpenDraft}
      />
    );
  }

  return (
    <IdBannerTypeSelector
      onSelect={setStep}
      t={t}
      railActive={railActive}
      onRailNavigate={onRailNavigate}
      onOpenDraft={onOpenDraft}
    />
  );
}
