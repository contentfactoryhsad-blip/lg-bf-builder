import React from 'react';
import { useT } from '../i18n/LanguageContext';

interface Props {
  onSave: () => void;
  onDiscard: () => void;
}

/** Confirms leaving an editor with unsaved work — Yes saves then leaves, No leaves without saving. */
export function UnsavedChangesModal({ onSave, onDiscard }: Props) {
  const t = useT();
  // One sentence per line: break after ". " (Latin scripts) and "。" (CJK).
  // Thai has no full stops — its locale value carries an explicit \n instead.
  const message = t('You have unsaved changes. Do you want to save before leaving?')
    .replace(/\. /g, '.\n')
    .replace(/。(?!$)/g, '。\n');
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6 text-center">
        <p className="font-lgei font-bold text-[17px] text-gray-900 mb-1" style={{ lineHeight: '24px' }}>
          {t('Unsaved changes')}
        </p>
        <p className="text-sm text-gray-500 mb-5" style={{ lineHeight: '20px', whiteSpace: 'pre-line' }}>
          {message}
        </p>
        <div className="flex justify-center gap-2">
          <button
            onClick={onDiscard}
            className="px-4 py-2 rounded-full text-sm text-gray-600 border border-gray-300 hover:border-gray-400 transition-colors"
          >
            {t('No')}
          </button>
          <button
            onClick={onSave}
            className="px-5 py-2 rounded-full text-sm font-medium bg-[#FD312E] text-white hover:bg-[#E22825] transition-colors"
          >
            {t('Yes')}
          </button>
        </div>
      </div>
    </div>
  );
}
