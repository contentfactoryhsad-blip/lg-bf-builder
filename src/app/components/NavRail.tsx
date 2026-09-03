import React, { useState } from 'react';
import { BookOpen, Home, Image, Search, Megaphone, History, LayoutTemplate, Tag } from 'lucide-react';
import { useT } from '../i18n/LanguageContext';
import { isDraftStoreAvailable } from '../utils/draftStore';
import type { DraftRecord } from '../utils/draftStore';
import { SavedWorkModal } from './SavedWorkModal';

// 'thumbnail' | 'id-banner' | 'off-site' are inherited from the source builder and
// stay in the union so those screens keep compiling — they are not on the rail yet.
export type NavRailKey = 'home' | 'content-template' | 'shop-in-shop' | 'deal-page' | 'thumbnail' | 'id-banner' | 'off-site';

/**
 * TUTORIAL destination — still being written (2026-09-04). The rail
 * row and the Home-screen pill both render disabled while this is empty; fill
 * it in when the guide goes up.
 */
export const TUTORIAL_URL = '';

interface Props {
  /** Currently active builder — highlighted in the rail. */
  active: NavRailKey;
  onNavigate: (target: NavRailKey) => void;
  /** Open a locally saved draft picked from the Saved Work modal. */
  onOpenDraft: (rec: DraftRecord) => void;
}

const ITEMS: { key: NavRailKey; label: string; Icon: typeof Home }[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'content-template', label: 'Content Banner Builder', Icon: LayoutTemplate },
  { key: 'deal-page', label: 'Promotion Page Builder', Icon: Tag },
  // "shop-in-shop" ("ex") is reference-only now - reachable in code, not in the UI.
];

/**
 * Collapsed icon rail (64px) that expands into a labeled flyout on hover.
 * Shown on Home + each builder's top-level selector screen (not inside the
 * actual canvas editors). Footer holds "Saved Work" (opens a modal list —
 * these no longer show inline on Home).
 */
export function NavRail({ active, onNavigate, onOpenDraft }: Props) {
  const t = useT();
  const [showSavedWork, setShowSavedWork] = useState(false);
  const draftsAvailable = isDraftStoreAvailable();

  const rowClass = (isActive: boolean) =>
    // w-full: <button>/<a> are form-ish flex children that don't stretch to
    // fill the parent's cross axis on their own (unlike plain divs), so the
    // hover/active background would otherwise stop short of the right edge.
    `flex items-center gap-3 w-full h-11 px-[22px] shrink-0 whitespace-nowrap transition-colors ${
      isActive ? 'text-[#FD312E] bg-[#FD312E]/8' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
    }`;

  return (
    <div className="relative shrink-0 w-16 group/rail">
      <div className="absolute inset-y-0 left-0 w-16 group-hover/rail:w-max group-hover/rail:min-w-60 bg-white border-r border-gray-200 group-hover/rail:shadow-xl transition-all duration-200 ease-out overflow-hidden z-40 flex flex-col py-3">
        {ITEMS.map(({ key, label, Icon }) => {
          const isActive = key === active;
          return (
            <button key={key} onClick={() => onNavigate(key)} className={rowClass(isActive)}>
              <Icon size={18} className="shrink-0" strokeWidth={1.75} />
              <span className="text-sm font-medium opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150">
                {t(label)}
              </span>
            </button>
          );
        })}

        {/* TUTORIAL — sits with the builders so it reads as a destination, not
            a setting. Opens in a new tab once TUTORIAL_URL is filled in. */}
        <a
          href={TUTORIAL_URL || undefined}
          target="_blank"
          rel="noopener noreferrer"
          title={TUTORIAL_URL ? undefined : t('Link coming soon')}
          className={rowClass(false)}
        >
          <BookOpen size={18} className="shrink-0" strokeWidth={1.75} />
          <span className="text-sm font-medium opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150">
            {t('Tutorial')}
          </span>
        </a>

        {/* Footer: Saved Work — pinned to the bottom */}
        <div className="mt-auto pt-2 border-t border-gray-100">
          {draftsAvailable && (
            <button onClick={() => setShowSavedWork(true)} className={rowClass(false)}>
              <History size={18} className="shrink-0" strokeWidth={1.75} />
              <span className="text-sm font-medium opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150">
                {t('Saved Work')}
              </span>
            </button>
          )}
        </div>
      </div>

      {showSavedWork && (
        <SavedWorkModal onOpenDraft={onOpenDraft} onClose={() => setShowSavedWork(false)} />
      )}
    </div>
  );
}
