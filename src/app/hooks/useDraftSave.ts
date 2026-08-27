/**
 * useDraftSave — MANUAL local draft saving (IndexedDB).
 * Nothing is written until the user presses the editor's "Save for Later"
 * button; only explicitly saved work appears in the home Recent Work list.
 *
 * - One draftId per editing session (or the resumed draft's id), so repeated
 *   saves update the same entry.
 * - `dirty` becomes true whenever the state changes from what it was when the
 *   session started (fresh OR resumed) — drive an "Unsaved changes" hint,
 *   a disabled Save button, or an unsaved-changes leave-guard with it.
 *
 * Serialize contract: `serialize(state)` MUST return a JSON-safe plain value
 * (no Set/Map/functions/DOM). Convert Sets to arrays so drafts stay portable.
 * Multi-tab: last-write-wins (new sessions get fresh ids).
 */

import { useCallback, useRef, useState } from 'react';
import { putDraft, listDrafts, isDraftStoreAvailable, type DraftRecord } from '../utils/draftStore';
import { getDraftKind, type BuilderKey } from '../drafts/draftKinds';
import { useLanguage } from '../i18n/LanguageContext';

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useDraftSave<S>(args: {
  builder: BuilderKey;
  section?: string;
  /** Resume: reuse an existing draft id. Otherwise a new id per session. */
  initialDraftId?: string;
  state: S;
  title: string;
  serialize?: (s: S) => unknown;
}): {
  draftId: string;
  status: DraftSaveStatus;
  lastSavedAt: number | null;
  /** True when the state changed after the last successful save. */
  dirty: boolean;
  available: boolean;
  /** Persist now. `opts.title` overrides the configured title (e.g. a
   *  user-entered version name from the save modal). */
  save: (opts?: { title?: string }) => Promise<void>;
  /** True if another saved draft of this builder already uses `name` (excluding
   *  this session's own draft) — surface an overwrite confirmation before saving. */
  checkNameTaken: (name: string) => Promise<boolean>;
} {
  const { builder, section, initialDraftId, state, title, serialize } = args;
  const { lang } = useLanguage();

  const draftIdRef = useRef<string>(initialDraftId ?? crypto.randomUUID());
  const createdAtRef = useRef<number>(Date.now());
  // Reference of the state when this session started (mount value, whether
  // fresh or resumed) — `dirty` compares against this, not just "since last save".
  const savedStateRef = useRef<S>(state);
  // Title of the last successful save (resumed drafts start with their saved
  // name). Drives version semantics: saving under the SAME name overwrites,
  // saving under a NEW name creates a separate entry.
  const lastSavedTitleRef = useRef<string | null>(initialDraftId != null ? title : null);

  const [status, setStatus] = useState<DraftSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const latestRef = useRef({ state, title, lang, section, serialize });
  latestRef.current = { state, title, lang, section, serialize };

  const available = isDraftStoreAvailable();

  const save = useCallback(async (opts?: { title?: string }): Promise<void> => {
    if (!available) return;
    const kind = getDraftKind(builder);
    if (!kind) return;
    const { state: s, title: tl, lang: lg, section: sec, serialize: ser } = latestRef.current;
    const finalTitle = opts?.title?.trim() || tl;
    setStatus('saving');
    try {
      // Name-keyed versioning: a save under an EXISTING name (this builder)
      // overwrites that entry; a save under a new name becomes a new entry
      // (the previously saved version stays untouched).
      let id = draftIdRef.current;
      let createdAt = createdAtRef.current;
      try {
        const metas = await listDrafts();
        const existing = metas.find((m) => m.builder === builder && m.title === finalTitle);
        if (existing) {
          id = existing.id;
          createdAt = existing.createdAt;
        } else if (lastSavedTitleRef.current !== null && lastSavedTitleRef.current !== finalTitle) {
          id = crypto.randomUUID();
          createdAt = Date.now();
        }
      } catch {
        // listing failed — fall back to the session id
      }
      const rec: DraftRecord = {
        id,
        builder,
        section: sec,
        title: finalTitle,
        lang: lg,
        createdAt,
        updatedAt: Date.now(),
        schemaVersion: kind.schemaVersion,
        payload: ser ? ser(s) : (s as unknown),
      };
      await putDraft(rec);
      draftIdRef.current = id;
      createdAtRef.current = createdAt;
      lastSavedTitleRef.current = finalTitle;
      savedStateRef.current = s;
      setStatus('saved');
      setLastSavedAt(rec.updatedAt);
    } catch (e) {
      console.warn('Draft save failed:', e);
      setStatus('error');
    }
  }, [available, builder]);

  const checkNameTaken = useCallback(async (name: string): Promise<boolean> => {
    if (!available) return false;
    const trimmed = name.trim();
    try {
      const metas = await listDrafts();
      return metas.some((m) => m.builder === builder && m.title === trimmed && m.id !== draftIdRef.current);
    } catch {
      return false;
    }
  }, [available, builder]);

  const dirty = state !== savedStateRef.current;

  return { draftId: draftIdRef.current, status, lastSavedAt, dirty, available, save, checkNameTaken };
}
