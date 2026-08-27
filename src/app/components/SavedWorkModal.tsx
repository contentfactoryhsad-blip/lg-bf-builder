/**
 * "Saved Work" modal — opened from the NavRail footer. Lists locally saved
 * drafts (the user pressed "Save for Later" in an editor). Everything lives
 * in this browser's IndexedDB; there is no server persistence. Replaces the
 * old inline "Recent Work" section that used to live on the Home page body.
 */

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '../i18n/LanguageContext';
import {
  listDrafts,
  getDraft,
  deleteDraft,
  deleteAllDrafts,
  MAX_DRAFTS,
  type DraftMeta,
  type DraftRecord,
} from '../utils/draftStore';
import { getDraftKind } from '../drafts/draftKinds';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  onOpenDraft: (rec: DraftRecord) => void;
  onClose: () => void;
}

function formatRelativeTime(ts: number, t: (k: string) => string): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('Just now');
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function SavedWorkModal({ onOpenDraft, onClose }: Props) {
  const t = useT();
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DraftMeta | null>(null);
  const [pendingDeleteAll, setPendingDeleteAll] = useState(false);

  const refresh = () => {
    listDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]));
  };

  useEffect(refresh, []);

  const handleOpen = async (meta: DraftMeta) => {
    setBusyId(meta.id);
    try {
      const rec = await getDraft(meta.id);
      if (!rec || rec.payload == null) {
        alert(t('Could not load this saved work.'));
        refresh();
        return;
      }
      onClose();
      onOpenDraft(rec);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (e: React.MouseEvent, meta: DraftMeta) => {
    e.stopPropagation();
    setPendingDelete(meta);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteDraft(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  };

  const handleDeleteAll = () => setPendingDeleteAll(true);

  const confirmDeleteAll = async () => {
    setPendingDeleteAll(false);
    await deleteAllDrafts();
    refresh();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-lgei font-bold text-[17px] text-gray-900" style={{ lineHeight: '24px' }}>
              {t('Saved Work')} ({String(drafts.length).padStart(2, '0')}/{MAX_DRAFTS})
            </h2>
            <p className="text-xs text-gray-400 mt-0.5" style={{ lineHeight: '16px' }}>
              {t('Saved in this browser')} · {t('Over {n} saved, oldest deleted first.').replace('{n}', String(MAX_DRAFTS))}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-sm">{t('No saved work yet.')}</p>
              <p className="text-xs mt-1">{t('Use Save for Later inside a builder to see it here.')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {drafts.map((meta) => {
                const kind = getDraftKind(meta.builder);
                return (
                  <button
                    key={meta.id}
                    onClick={() => handleOpen(meta)}
                    disabled={busyId === meta.id}
                    className="group w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3 text-left hover:border-[#FD312E] hover:shadow-md transition-all disabled:opacity-60"
                  >
                    <div
                      className="w-11 h-11 rounded-md overflow-hidden shrink-0 flex items-center justify-center"
                      style={{ background: '#F8F7F5' }}
                    >
                      {kind?.previewImg ? (
                        <img src={kind.previewImg} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#CBC8C2" strokeWidth="1.5" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* User-entered version name — render raw, never translate */}
                      <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[#FD312E] transition-colors" style={{ lineHeight: '18px' }}>
                        {meta.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5" style={{ lineHeight: '16px' }}>
                        {t(kind?.title ?? meta.builder)} · {formatRelativeTime(meta.updatedAt, t)}
                      </p>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleDelete(e, meta)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(e as unknown as React.MouseEvent, meta); }}
                      className="p-2 rounded-lg text-gray-300 hover:text-[#FD312E] hover:bg-gray-50 transition-colors shrink-0"
                      title={t('Delete')}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L12 4M6.5 7v4M9.5 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <svg className="shrink-0 text-gray-300 group-hover:text-[#FD312E] transition-colors" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {drafts.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 shrink-0 flex justify-start">
            <button
              onClick={handleDeleteAll}
              className="text-xs text-gray-400 hover:text-[#FD312E] transition-colors"
            >
              {t('Delete All')}
            </button>
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmModal
          title={t('Delete')}
          message={t('Delete this saved work?')}
          confirmLabel={t('Delete')}
          cancelLabel={t('Cancel')}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {pendingDeleteAll && (
        <ConfirmModal
          title={t('Delete All')}
          message={t('Delete all saved work? This cannot be undone.')}
          confirmLabel={t('Delete All')}
          cancelLabel={t('Cancel')}
          onConfirm={confirmDeleteAll}
          onCancel={() => setPendingDeleteAll(false)}
        />
      )}
    </div>
  );
}
