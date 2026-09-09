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
  MAX_DRAFTS,
  type DraftMeta,
  type DraftRecord,
} from '../utils/draftStore';
import { getDraftKind } from '../drafts/draftKinds';
import { ConfirmModal } from './ConfirmModal';

/**
 * Where the modal was opened from. On Home the two builders show as tabs;
 * inside a builder only that builder's saves are listed (no tabs). The
 * count in the header's top-right is the LISTED builder's `NN/50`.
 */
export type SavedWorkContext = 'home' | 'content-banner' | 'deal-page';

interface Props {
  onOpenDraft: (rec: DraftRecord) => void;
  onClose: () => void;
  context?: SavedWorkContext;
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

export function SavedWorkModal({ onOpenDraft, onClose, context = 'home' }: Props) {
  const t = useT();
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const [tab, setTab] = useState<'content-banner' | 'deal-page'>('content-banner');
  const filter = context === 'home' ? tab : context;
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

  /** Scoped to the listed builder — the other tab's saves stay. */
  const confirmDeleteAll = async () => {
    setPendingDeleteAll(false);
    for (const m of drafts.filter((x) => x.builder === filter)) await deleteDraft(m.id);
    refresh();
  };

  const shown = drafts.filter((m) => m.builder === filter);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — the count top-right is the listed builder's NN/50 */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-lgei font-bold text-[17px] text-gray-900" style={{ lineHeight: '24px' }}>
              {t('Saved Work')}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5" style={{ lineHeight: '16px' }}>
              {t('Saved in this browser')} · {t('Up to {n} per builder — oldest deleted first.').replace('{n}', String(MAX_DRAFTS))}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-medium text-gray-500 tabular-nums" style={{ lineHeight: '24px' }}>
              {String(shown.length).padStart(2, '0')}/{MAX_DRAFTS}
            </span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Builder tabs — Home only; inside a builder the filter is fixed */}
        {context === 'home' && (
          <div className="flex items-center gap-1 px-6 border-b border-gray-100 shrink-0">
            {([
              ['content-banner', 'Content Banner Builder'],
              ['deal-page', 'Promotion Page Builder'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-3 h-10 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                  tab === key ? 'border-[#FD312E] text-[#FD312E]' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {t(label)}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {shown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-sm">{t('No saved work yet.')}</p>
              <p className="text-xs mt-1">{t('Use Save for Later inside a builder to see it here.')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {shown.map((meta) => {
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

        {shown.length > 0 && (
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
