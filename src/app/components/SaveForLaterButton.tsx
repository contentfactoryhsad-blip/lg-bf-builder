/**
 * SaveForLaterButton — the shared "save to Home" control for editor headers:
 * status text (Unsaved changes / Saving… / Saved / Save failed) + outlined
 * pill button with hover hint + the version-name modal.
 *
 * Wire it next to the editor's primary action:
 *   const draft = useDraftSave({ builder, initialDraftId, state, title, serialize });
 *   <SaveForLaterButton draft={draft} defaultName={initialTitle} disabled={isEmpty} />
 */

import React, { useState } from 'react';
import { useT } from '../i18n/LanguageContext';
import type { DraftSaveStatus } from '../hooks/useDraftSave';

interface DraftHandle {
  status: DraftSaveStatus;
  dirty: boolean;
  available: boolean;
  save: (opts?: { title?: string }) => Promise<void>;
  checkNameTaken: (name: string) => Promise<boolean>;
}

interface Props {
  draft: DraftHandle;
  /** Initial version name shown in the save modal. */
  defaultName: string;
  disabled?: boolean;
}

export function SaveForLaterButton({ draft, defaultName, disabled }: Props) {
  const t = useT();
  const [name, setName] = useState(defaultName);
  const [showModal, setShowModal] = useState(false);

  if (!draft.available) return null;

  const handleConfirm = async (finalName: string) => {
    setName(finalName);
    setShowModal(false);
    await draft.save({ title: finalName });
  };

  return (
    <>
      {/* Save status */}
      {(draft.status !== 'idle' || draft.dirty) && (
        <span className={`text-xs ${draft.status === 'error' ? 'text-[#FD312E]' : 'text-gray-400'}`} style={{ lineHeight: '16px' }}>
          {draft.status === 'saving' && t('Saving…')}
          {draft.status === 'error' && t('Save failed')}
          {draft.status !== 'saving' && draft.status !== 'error' && (draft.dirty ? t('Unsaved changes') : draft.status === 'saved' ? t('Saved') : '')}
        </span>
      )}
      <div className="relative group/save">
        <button
          onClick={() => setShowModal(true)}
          disabled={disabled || draft.status === 'saving'}
          className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-full border border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M12.5 13.5h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h7l3 3v7a1 1 0 0 1-1 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M5 2.5V6h5V2.5M5 13.5V9.5h6v4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
          {t('Save for Later')}
        </button>
        {/* Hover hint */}
        <div className="absolute right-0 top-full mt-2 z-50 hidden group-hover/save:block pointer-events-none">
          <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg" style={{ lineHeight: '16px' }}>
            {t('Saves to Saved Work so you can continue working on it later.')}
          </div>
        </div>
      </div>

      {showModal && (
        <SaveDraftModal
          defaultName={name}
          checkNameTaken={draft.checkNameTaken}
          onSave={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ─── Version-name modal ───────────────────────────────────────────────────────
export function SaveDraftModal({
  defaultName,
  checkNameTaken,
  onSave,
  onCancel,
}: {
  defaultName: string;
  checkNameTaken: (name: string) => Promise<boolean>;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(defaultName);
  const [checking, setChecking] = useState(false);
  // Set once the entered name collides with another saved draft — swaps the
  // modal body to an overwrite confirmation instead of the name input.
  const [conflictName, setConflictName] = useState<string | null>(null);

  const submit = async () => {
    const finalName = name.trim() || defaultName;
    setChecking(true);
    const taken = await checkNameTaken(finalName);
    setChecking(false);
    if (taken) setConflictName(finalName);
    else onSave(finalName);
  };

  if (conflictName !== null) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.5)' }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6 text-center">
          <p className="font-lgei font-bold text-[17px] text-gray-900 mb-1" style={{ lineHeight: '24px' }}>
            {t('Overwrite existing save?')}
          </p>
          <p className="text-sm text-gray-500 mb-5" style={{ lineHeight: '20px' }}>
            {t('"{name}" is already used by another saved version. Overwriting will replace its contents.').replace('{name}', conflictName)}
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setConflictName(null)}
              className="px-4 py-2 rounded-full text-sm text-gray-600 border border-gray-300 hover:border-gray-400 transition-colors"
            >
              {t('Choose a different name')}
            </button>
            <button
              onClick={() => onSave(conflictName)}
              className="px-5 py-2 rounded-full text-sm font-medium bg-[#FD312E] text-white hover:bg-[#E22825] transition-colors"
            >
              {t('Overwrite')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6">
        <p className="font-lgei font-bold text-[17px] text-gray-900 mb-1" style={{ lineHeight: '24px' }}>
          {t('Save for Later')}
        </p>
        <p className="text-xs text-gray-400 mb-4" style={{ lineHeight: '16px' }}>
          {t('Saved versions appear in Saved Work.')}
        </p>
        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          {t('Version name')}
        </label>
        <input
          type="text"
          value={name}
          autoFocus
          onFocus={e => e.target.select()}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
          maxLength={60}
          className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FD312E] mb-5"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm text-gray-600 border border-gray-300 hover:border-gray-400 transition-colors"
          >
            {t('Cancel')}
          </button>
          <button
            onClick={submit}
            disabled={checking}
            className="px-5 py-2 rounded-full text-sm font-medium bg-[#FD312E] text-white hover:bg-[#E22825] transition-colors disabled:opacity-60"
          >
            {t('Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
