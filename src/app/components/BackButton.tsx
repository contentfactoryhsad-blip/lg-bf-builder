import React from 'react';
import { useT } from '../i18n/LanguageContext';

interface Props {
  onClick: () => void;
}

/**
 * Top-left Back pill for NavRail-having selector screens. Same visual style
 * as LanguageSelector's pill (Home header, top-right) for consistency.
 */
export function BackButton({ onClick }: Props) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
      style={{ lineHeight: '20px' }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{t('Back')}</span>
    </button>
  );
}
