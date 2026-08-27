import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveBlob } from '../utils/fileSaver';
import { useT } from '../i18n/LanguageContext';
import { StorePageModulesBuilder } from './brandshop/StorePageModulesBuilder';
import { NavRail, type NavRailKey } from './NavRail';
import { AppHeader } from './AppHeader';
import type { StoreModulesPayloadV1 } from '../drafts/storeModulesPayload';
import type { DraftRecord } from '../utils/draftStore';

type BrandShopStep =
  | 'type-select'
  | 'profile-settings'
  | 'store-page-modules';

interface Props {
  /** Deep-open a specific screen (used when resuming a saved draft). */
  initialStep?: BrandShopStep;
  /** Draft to resume inside Store Page Modules. */
  initialDraft?: { id: string; title: string; payload: StoreModulesPayloadV1 };
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}

// Image dimensions (450×3832px from Figma frame 1578:24626)
const IMG_W = 450;
const IMG_H = 3832;

// Percentages of image height (= Figma frame height 10491.848px proportional)
const SECTION_REGIONS: Record<string, { top: number; h: number }> = {
  'brand-trust':       { top: 8.87,  h: 12.71 },
  'membership':        { top: 21.29, h: 6.33  },
  'big-promotion':     { top: 27.34, h: 51.81 },
  'other-promotions':  { top: 79.15, h: 7.23  },
  'must-have-lg':      { top: 86.10, h: 13.90 },
};

interface PreviewImageProps {
  hovered: BrandShopStep | null;
  onHover: (k: BrandShopStep | null) => void;
  onClick: (k: BrandShopStep) => void;
  sections: SectionDef[];
  height: number | null;
}

function SectionPreviewImage({ hovered, onHover, onClick, sections, height }: PreviewImageProps) {
  const t = useT();
  const activeRegion = hovered ? SECTION_REGIONS[hovered] : null;

  return (
    <div
      className="relative shadow-xl shrink-0 cursor-pointer"
      style={{ aspectRatio: `${IMG_W} / ${IMG_H}`, height: height ? `${height}px` : undefined }}
    >
      <img
        src="/brand-shop/section-preview.png"
        alt={t('Shop in Shop Page Preview')}
        className="block w-full h-full"
        draggable={false}
      />

      {/* Dark overlay above active section */}
      {activeRegion && (
        <div
          className="absolute left-0 right-0 top-0 pointer-events-none"
          style={{
            height: `${activeRegion.top}%`,
            background: 'rgba(0,0,0,0.55)',
          }}
        />
      )}

      {/* Dark overlay below active section */}
      {activeRegion && (
        <div
          className="absolute left-0 right-0 bottom-0 pointer-events-none"
          style={{
            top: `${activeRegion.top + activeRegion.h}%`,
            background: 'rgba(0,0,0,0.55)',
          }}
        />
      )}

      {/* Subtle dim on entire image when nothing hovered */}
      {!hovered && (
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      )}

      {/* White highlight border on active section */}
      {activeRegion && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: `${activeRegion.top}%`,
            height: `${activeRegion.h}%`,
            border: '2px solid rgba(255,255,255,0.85)',
          }}
        />
      )}

      {/* Clickable hit areas for each section */}
      {sections.map((s) => {
        const region = SECTION_REGIONS[s.key];
        if (!region) return null;
        return (
          <div
            key={s.key}
            className="absolute left-0 right-0"
            style={{ top: `${region.top}%`, height: `${region.h}%`, cursor: 'pointer' }}
            onMouseEnter={() => onHover(s.key)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(s.key)}
          />
        );
      })}
    </div>
  );
}

interface SectionDef {
  key: BrandShopStep;
  title: string;
  description: string;
  badges?: string[];
}

interface SectionCardProps {
  index: number;
  title: string;
  description: string;
  badges?: string[];
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

function SectionCard({
  index, title, description, badges,
  isHovered, onMouseEnter, onMouseLeave, onClick,
}: SectionCardProps) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="group w-full bg-white border rounded-2xl px-5 py-4 text-left transition-all duration-150 flex items-center gap-4"
      style={{
        borderColor: isHovered ? '#FD312E' : '#e5e7eb',
        boxShadow: isHovered ? '0 4px 20px rgba(165,0,52,0.12)' : 'none',
      }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors duration-150"
        style={{ borderColor: isHovered ? '#FD312E' : '#e5e7eb' }}
      >
        <span
          className="font-lgei font-bold text-[13px] transition-colors duration-150"
          style={{ lineHeight: '18px', color: isHovered ? '#FD312E' : '#9ca3af' }}
        >
          {index}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className="font-lgei font-bold text-[14px] transition-colors duration-150"
            style={{ lineHeight: '20px', color: isHovered ? '#FD312E' : '#111827' }}
          >
            {title}
          </p>
          {badges?.map((badge) => (
            <span key={badge} className="text-[11px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5" style={{ lineHeight: '16px' }}>
              {badge}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-0.5" style={{ lineHeight: '16px' }}>
          {description}
        </p>
      </div>

      <svg
        className="shrink-0 transition-colors duration-150"
        width="16" height="16" viewBox="0 0 16 16" fill="none"
        style={{ color: isHovered ? '#FD312E' : '#d1d5db' }}
      >
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function SisTypeSelector({
  onSelect,
  railActive,
  onRailNavigate,
  onOpenDraft,
}: {
  onSelect: (v: 'profile-settings' | 'store-page-modules') => void;
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}) {
  const t = useT();

  const cards = [
    {
      key: 'profile-settings' as const,
      title: 'Profile Settings',
      description: 'Download profile and store header images for your LG Official Store.',
      preview: '/shop-in-shop/profile-preview.png',
      previewBg: '#f8f7f5',
      previewFit: 'contain' as const,
    },
    {
      key: 'store-page-modules' as const,
      title: 'Shop in Shop page Module',
      description: 'Banners, promotions, and all content sections for the Shop in Shop page.',
      preview: '/shop-in-shop/store-page-preview.png',
      previewBg: '#f8f7f5',
      previewFit: 'contain' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col">
      <AppHeader title={t('Shop in Shop page Builder')} onBack={() => onRailNavigate('home')} />

      <div className="flex-1 flex min-h-0">
      <NavRail active={railActive} onNavigate={onRailNavigate} onOpenDraft={onOpenDraft} />
      <div className="flex-1 flex flex-col min-h-0">
      <div className="h-11 shrink-0" />
      <main className="flex-1 flex flex-col items-center px-8 pt-[41.67px] pb-10 gap-8" style={{ zoom: 1.2 }}>
        <div className="text-center flex flex-col items-center gap-3">
          <span className="inline-flex items-center gap-1.5 bg-[#FD312E] text-white text-xs font-medium px-3 py-1 rounded-full" style={{ lineHeight: '18px' }}>
            {t('for Shopee & Lazada')}
          </span>
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-lgei font-bold text-[32px] text-gray-900" style={{ lineHeight: '40px' }}>
              {t('Which section would you like to update?')}
            </h1>
            <p className="text-gray-500 text-sm" style={{ lineHeight: '20px' }}>
              {t('Choose a section of the Shop in Shop page to update.')}
            </p>
          </div>
        </div>

        <div className="flex gap-8 flex-wrap justify-center">
          {cards.map((card) => (
            <div key={card.key} className="flex flex-col gap-2 w-72">
              <button
                onClick={() => onSelect(card.key)}
                className="group bg-white border border-gray-200 rounded-2xl p-5 w-full h-full text-left flex flex-col hover:border-[#FD312E] hover:shadow-xl transition-all duration-200 cursor-pointer"
              >
                <div
                  className="relative overflow-hidden rounded-md mb-4 flex items-center justify-center"
                  style={{ height: 196, background: card.previewBg }}
                >
                  <img
                    src={card.preview}
                    alt={card.title}
                    style={{ height: '100%', width: '100%', objectFit: card.previewFit }}
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-[#FD312E]/0 group-hover:bg-[#FD312E]/8 transition-all duration-200 rounded-md" />
                </div>
                <div className="flex items-start justify-between gap-2 px-1">
                  <div>
                    <p className="font-lgei font-bold text-[15px] text-gray-900 group-hover:text-[#FD312E] transition-colors" style={{ lineHeight: '20px' }}>
                      {t(card.title)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5" style={{ lineHeight: '16px' }}>
                      {t(card.description)}
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
          ))}
        </div>
      </main>
      </div>
      </div>
    </div>
  );
}

const PSI_ITEMS = [
  {
    key: 'profile-image',
    title: 'LAZ/SHP_Profile Image_PC/MO_600x600',
    file: '/shop-in-shop/psi-profile-image.png',
    fileName: 'LAZ-SHP-profile-image-PC-MO-600x600.png',
  },
  {
    key: 'laz-header-pc',
    title: 'LAZ-Store Header Image-PC-1200x128',
    file: '/shop-in-shop/psi-laz-header-pc.png',
    fileName: 'LAZ-store-header-PC-1200x128.png',
  },
  {
    key: 'laz-header-mo',
    title: 'LAZ-Store Header Image-MO-750x478',
    file: '/shop-in-shop/psi-laz-header-mo.png',
    fileName: 'LAZ-store-header-MO-750x478.png',
  },
  {
    key: 'shp-cover',
    title: 'SHP-Shop Cover Image-PC/MO-1200x518',
    file: '/shop-in-shop/psi-shp-cover.png',
    fileName: 'SHP-shop-cover-PC-MO-1200x518.png',
  },
] as const;

function ProfileSettingsEditor({
  onBack,
  railActive,
  onRailNavigate,
  onOpenDraft,
}: {
  onBack: () => void;
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}) {
  const t = useT();
  const allKeys = PSI_ITEMS.map((i) => i.key);
  const [selected, setSelected] = useState<Set<string>>(new Set(allKeys));
  const [hovered, setHovered] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleDownload = async () => {
    const items = PSI_ITEMS.filter((i) => selected.has(i.key));
    if (!items.length) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        items.map(async (item) => {
          const res = await fetch(item.file);
          if (!res.ok) throw new Error(`Failed to fetch ${item.file}`);
          zip.file(item.fileName, await res.blob());
        }),
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      saveBlob(blob, 'LG-profile-setting-images.zip');
    } catch (err) {
      console.error(err);
      alert(t('Download failed. Please try again.'));
    } finally {
      setDownloading(false);
    }
  };

  const hasSelected = selected.size > 0;

  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col">
      <AppHeader
        title={t('Profile Settings')}
        onBack={onBack}
        right={
          <button
            onClick={handleDownload}
            disabled={!hasSelected || downloading}
            className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-full border transition-colors"
            style={{
              background: hasSelected ? '#FD312E' : 'white',
              borderColor: hasSelected ? '#FD312E' : '#e5e7eb',
              color: hasSelected ? 'white' : '#d1d5db',
              cursor: hasSelected ? 'pointer' : 'not-allowed',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 15l-4-4h3V4h2v7h3l-4 4zM4 18h16v2H4v-2z" fill="currentColor"/>
            </svg>
            <span style={{ lineHeight: '20px' }}>{downloading ? 'Downloading...' : t('Download ZIP')}</span>
          </button>
        }
      />

      <div className="flex-1 flex min-h-0">
      <NavRail active={railActive} onNavigate={onRailNavigate} onOpenDraft={onOpenDraft} />
      {/* Body — same padding as BrandShopTemplateSelector */}
      <div className="flex-1 overflow-y-auto px-16 py-12">
        <p className="text-sm text-gray-500 mb-2" style={{ lineHeight: '20px' }}>
          {t('Choose profile setting images to download.')}
        </p>
        <div className="mb-10" />

        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {PSI_ITEMS.map((item) => {
            const isSelected = selected.has(item.key);
            const isHovered = hovered === item.key;
            return (
              <div
                key={item.key}
                className="relative rounded-xl overflow-hidden border-2 transition-all duration-150 bg-white"
                onMouseEnter={() => setHovered(item.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  borderColor: isSelected ? '#FD312E' : isHovered ? '#FD312E' : '#e5e7eb',
                  boxShadow: isSelected || isHovered
                    ? '0 4px 20px rgba(165,0,52,0.15)'
                    : '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                {/* Checkbox — top-left, same as BrandShopTemplateSelector */}
                <div className="absolute top-2.5 left-2.5 z-10" onClick={(e) => { e.stopPropagation(); toggle(item.key); }}>
                  <div
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      background: isSelected ? '#FD312E' : 'white',
                      borderColor: isSelected ? '#FD312E' : '#d1d5db',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }}
                  >
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>

                {/* Card body — clicking toggles selection */}
                <button className="w-full text-left block cursor-pointer" onClick={() => toggle(item.key)}>
                  {/* Preview area */}
                  <div
                    className="relative w-full flex items-center justify-center overflow-hidden"
                    style={{ background: '#CBC8C2', aspectRatio: '16/9', padding: 16 }}
                  >
                    <img
                      src={item.file}
                      alt={item.title}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      draggable={false}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  {/* Label */}
                  <div className="px-4 py-3">
                    <p className="font-lgei font-bold text-sm text-gray-800" style={{ lineHeight: '20px' }}>
                      {t(item.title)}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}

export function BrandShopBuilder({ initialStep, initialDraft, railActive, onRailNavigate, onOpenDraft }: Props) {
  // Profile Settings is no longer part of the flow — open the modules builder directly.
  const [step, setStep] = useState<BrandShopStep>(initialStep ?? 'store-page-modules');
  const backToTypeSelect = () => setStep('type-select');
  const backToHome = () => onRailNavigate('home');

  if (step === 'type-select')
    return (
      <SisTypeSelector
        onSelect={setStep}
        railActive={railActive}
        onRailNavigate={onRailNavigate}
        onOpenDraft={onOpenDraft}
      />
    );
  if (step === 'profile-settings') {
    return (
      <ProfileSettingsEditor
        onBack={backToTypeSelect}
        railActive={railActive}
        onRailNavigate={onRailNavigate}
        onOpenDraft={onOpenDraft}
      />
    );
  }
  if (step === 'store-page-modules') {
    return (
      <StorePageModulesBuilder
        onBack={backToHome}
        initialDraft={initialDraft}
        railActive={railActive}
        onRailNavigate={onRailNavigate}
        onOpenDraft={onOpenDraft}
      />
    );
  }

  return null;
}
