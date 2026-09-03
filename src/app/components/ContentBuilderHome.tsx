import React from 'react';
import { useT } from '../i18n/LanguageContext';
import { BookOpen } from 'lucide-react';
import { NavRail, TUTORIAL_URL, type NavRailKey } from './NavRail';
import { AppHeader } from './AppHeader';
import type { DraftRecord } from '../utils/draftStore';

const PREVIEW_SIZE = 196;

interface Props {
  onSelectContentTemplate: () => void;
  onSelectPromotionPage: () => void;
  onSelectDealPage: () => void;
  /** Open a locally saved draft (recent-work list click or project-file import). */
  onOpenDraft: (rec: DraftRecord) => void;
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
}

const CARD_CLASS =
  'group bg-white border border-gray-200 rounded-2xl p-5 w-full h-full text-left flex flex-col hover:border-[#FD312E] hover:shadow-xl transition-all duration-200 cursor-pointer';

function Chevron() {
  return (
    <svg
      className="shrink-0 mt-0.5 text-gray-300 group-hover:text-[#FD312E] transition-colors"
      width="16" height="16" viewBox="0 0 16 16" fill="none"
    >
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ContentBuilderHome({ onSelectContentTemplate, onSelectPromotionPage, onSelectDealPage, onOpenDraft, railActive, onRailNavigate }: Props) {
  const t = useT();

  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col">
      <AppHeader title={t('LG Black Friday')} />

      {/* Content */}
      <div className="flex-1 flex min-h-0">
      <NavRail active={railActive} onNavigate={onRailNavigate} onOpenDraft={onOpenDraft} />
      <div className="flex-1 flex flex-col min-h-0">
      <div className="h-11 shrink-0" />
      <main className="flex-1 flex flex-col items-center px-8 pt-[41.67px] pb-10 gap-8" style={{ zoom: 1.2 }}>
        <div className="text-center flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <h1
              className="font-lgei font-bold text-[32px] text-gray-900"
              style={{ lineHeight: '40px' }}
            >
              {t('Select Content Type')}
            </h1>
            <p className="text-gray-500 text-sm" style={{ lineHeight: '20px' }}>
              {t('Choose the type of content you want to create.')}
            </p>
          </div>
        </div>

        {/* Tool cards */}
        <div className="flex flex-col items-center gap-4">
        <div className="flex gap-8 flex-wrap justify-center">
          {/* 1 · Content Template Builder — the campaign lock-up from
              `content template builder source/logo.png` (derived copy in
              public/content-template/home-card.png). The art has its own black
              plate, so the box fills with it via object-cover. */}
          <div className="flex flex-col gap-2 w-72">
            <button onClick={onSelectContentTemplate} className={CARD_CLASS}>
              <div
                className="relative overflow-hidden rounded-md mb-4 flex items-center justify-center"
                style={{ height: PREVIEW_SIZE, background: '#000' }}
              >
                <img
                  src="/content-template/home-card.png"
                  alt={t('Content Banner Builder')}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-[#FD312E]/0 group-hover:bg-[#FD312E]/5 transition-all duration-200 rounded-md" />
              </div>

              <div className="flex items-start justify-between gap-2 px-1">
                <div>
                  <p
                    className="font-lgei font-bold text-[15px] text-gray-900 group-hover:text-[#FD312E] transition-colors"
                    style={{ lineHeight: '20px' }}
                  >
                    {t('Content Banner Builder')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5" style={{ lineHeight: '16px' }}>
                    {t('Create a Black Friday promotion banner using key visuals, assets, and videos.')}
                  </p>
                </div>
                <Chevron />
              </div>
            </button>
          </div>

          {/* 2 · Promotion Page Builder — the www.lg.com Deal Page flow, built on the
              same module architecture as the "ex" builder below. */}
          <div className="flex flex-col gap-2 w-72">
            <button onClick={onSelectDealPage} className={CARD_CLASS}>
              <div
                className="relative overflow-hidden rounded-md mb-4 flex items-center justify-center"
                style={{ height: PREVIEW_SIZE, background: '#F8F7F5' }}
              >
                <img
                  src="/deal-page/preview.png"
                  alt={t('Deal Page Preview')}
                  className="h-full w-auto"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-[#FD312E]/0 group-hover:bg-[#FD312E]/5 transition-all duration-200 rounded-md" />
              </div>

              <div className="flex items-start justify-between gap-2 px-1">
                <div>
                  <p
                    className="font-lgei font-bold text-[15px] text-gray-900 group-hover:text-[#FD312E] transition-colors"
                    style={{ lineHeight: '20px' }}
                  >
                    {t('Promotion Page Builder')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5" style={{ lineHeight: '16px' }}>
                    {t('Hero, deal cards, promotion banners and product grids for the www.lg.com page.')}
                  </p>
                </div>
                <Chevron />
              </div>
            </button>
          </div>

          {/* The old Shop in Shop flow ("ex") is no longer surfaced here - the code
              stays in the repo purely as reference (App.tsx 'select' step). */}
        </div>

        {/* TUTORIAL — pill under the cards, styled to match the sales banner
            builder's README & TUTORIAL link. Goes live when TUTORIAL_URL
            (NavRail.tsx) is filled in. */}
        <a
          href={TUTORIAL_URL || undefined}
          target="_blank"
          rel="noopener noreferrer"
          title={TUTORIAL_URL ? undefined : t('Link coming soon')}
          className="flex items-center gap-1.5 mt-8 h-9 px-4 rounded-full border border-gray-300 bg-transparent text-[13px] font-medium text-gray-700 transition-colors hover:bg-black/[0.04] hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD312E]/40 shrink-0"
        >
          <BookOpen size={14} strokeWidth={2} />
          {t('TUTORIAL')}
        </a>

        </div>
      </main>
      </div>
      </div>
    </div>
  );
}
