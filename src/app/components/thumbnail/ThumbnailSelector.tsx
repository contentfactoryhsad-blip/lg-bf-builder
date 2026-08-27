import React from 'react';
import { useT } from '../../i18n/LanguageContext';
import { NavRail, type NavRailKey } from '../NavRail';
import { AppHeader } from '../AppHeader';
import { WizardBreadcrumb, THUMBNAIL_WIZARD_STEPS } from './WizardBreadcrumb';
import type { DraftRecord } from '../../utils/draftStore';
import {
  slotsByCategory,
  ThumbnailCategory,
  ThumbnailSlot,
  ThumbnailType,
} from './thumbnailRegistry';

const TEMPLATE_PAGE_TITLE: Record<ThumbnailCategory, string> = {
  'product-card': 'Select a Product Card Template',
  'feature-card': 'Feature Card Templates',
};

const PREVIEW_SIZE = 200; // sized so 5 Product Card templates fit in one row
// The preview renders at zoom 1.1/1.2 (see SlotPreview), so its laid-out width
// is PREVIEW_SIZE × that factor. Every card is pinned to it so the captions —
// which vary in length — can't stretch individual cards and skew the gaps.
const CARD_WIDTH = Math.round(PREVIEW_SIZE * (1.1 / 1.2));

interface SlotPreviewProps {
  slot: ThumbnailSlot;
}

function SlotPreview({ slot }: SlotPreviewProps) {
  const scale = PREVIEW_SIZE / slot.size.w;
  const Template = slot.Template;
  return (
    <div
      className="relative overflow-hidden shadow-md border border-gray-100"
      // Outer page zoom is 1.2× — counter-zoom so the preview lands at 1.1×.
      style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE * (slot.size.h / slot.size.w), zoom: 1.1 / 1.2 }}
    >
      <div
        style={{
          width: slot.size.w,
          height: slot.size.h,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        <Template slot={slot} orientation="horizontal" />
      </div>
    </div>
  );
}

interface Props {
  category: ThumbnailCategory;
  onSelect: (type: ThumbnailType) => void;
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}

export function ThumbnailSelector({ category, onSelect, railActive, onRailNavigate, onOpenDraft }: Props) {
  const t = useT();
  const slots = slotsByCategory(category);

  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col">
      <AppHeader title={t('Thumbnail Builder')} onBack={() => onRailNavigate('home')} />

      {/* Content */}
      <div className="flex-1 flex min-h-0">
      <NavRail active={railActive} onNavigate={onRailNavigate} onOpenDraft={onOpenDraft} />
      <div className="flex-1 flex flex-col min-h-0">
      <WizardBreadcrumb steps={THUMBNAIL_WIZARD_STEPS} activeStep={1} onStepClick={() => {}} />
      <main className="flex-1 flex flex-col items-center px-8 pt-[41.67px] pb-10 gap-8" style={{ zoom: 1.2 }}>
        <div className="text-center flex flex-col items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 bg-[#FD312E] text-white text-xs font-medium px-3 py-1 rounded-full"
            style={{ lineHeight: '18px' }}
          >
            for Shopee &amp; Lazada
          </span>
          <div className="flex flex-col items-center gap-1">
            <h1
              className="font-lgei font-bold text-[32px] text-gray-900"
              style={{ lineHeight: '40px' }}
            >
              {t(TEMPLATE_PAGE_TITLE[category])}
            </h1>
            <p className="text-gray-500 text-sm" style={{ lineHeight: '20px' }}>
              {t('Pick a product card template, then build the feature cards that follow it.')}
            </p>
          </div>
        </div>

        <div className="flex gap-6 flex-wrap justify-center">
          {slots.map((slot) => (
            // Fixed card width: without it each card sizes to its own caption,
            // so the flex gaps between them read as uneven.
            <div key={slot.id} className="group flex flex-col items-center gap-3" style={{ width: CARD_WIDTH }}>
              <div className="relative">
                <SlotPreview slot={slot} />
                <div
                  className="absolute inset-0 bg-[#FD312E]/0 group-hover:bg-[#FD312E]/10 transition-all duration-200 cursor-pointer flex items-center justify-center"
                  onClick={() => onSelect(slot.id)}
                >
                  <span
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#FD312E] text-white text-sm px-5 py-2 rounded-full shadow-lg font-medium"
                    style={{ lineHeight: '20px' }}
                  >
                    {t('Select')}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <p className="font-lgei font-bold text-[15px] text-gray-900" style={{ lineHeight: '18px' }}>
                    {t(slot.nameKey)}
                  </p>
                  {slot.hasOrientation && (
                    <span className="text-[10px] text-[#FD312E] bg-[#FD312E]/10 px-1.5 py-0.5 rounded-full font-medium">
                      {t('H / V')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5" style={{ lineHeight: '16px' }}>
                  {t(slot.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
      </div>
      </div>
    </div>
  );
}
