/**
 * draftStore — promise-based IndexedDB wrapper for local work drafts.
 * No server, no dependency. See src/app/drafts/draftKinds.ts for the builder
 * registry that gives each draft its kind/version.
 *
 * Two object stores (deliberate):
 *   - `meta`     — lightweight records (everything except payload) so the
 *                  home screen can list drafts without reading multi-MB
 *                  base64 payloads.
 *   - `payloads` — the heavy design payloads, keyed by the same id.
 * Both are written/deleted in a single transaction to stay consistent.
 *
 * Payloads are stored via IndexedDB's structured clone (no JSON.stringify on
 * the autosave path), but MUST stay JSON-safe (plain objects/arrays/strings/
 * numbers/booleans/null — Sets/Maps converted by the caller) so the same
 * payload round-trips through project-file export/import unchanged.
 *
 * Concurrency: multiple tabs are last-write-wins. New sessions allocate new
 * ids, so conflicts only occur when the same draft is resumed twice at once —
 * accepted for v1.
 */

import type { LanguageCode } from '../i18n/languages';
import type { BuilderKey } from '../drafts/draftKinds';

export interface DraftMeta {
  id: string;
  builder: BuilderKey;
  /** Reserved for sub-routing (e.g. a specific SIS section). */
  section?: string;
  title: string;
  lang: LanguageCode;
  createdAt: number;
  updatedAt: number;
  /** Small preview dataURL — reserved for v2, unused in v1 (list shows the
   *  registry's static previewImg instead). */
  thumbnail?: string;
  /** Builder payload schema version (see DraftKindDef.schemaVersion). */
  schemaVersion: number;
}

export interface DraftRecord extends DraftMeta {
  payload: unknown;
}

export const MAX_DRAFTS = 20;

const DB_NAME = 'lg-retail-obs-drafts';
const DB_VERSION = 1;
const META = 'meta';
const PAYLOADS = 'payloads';

let dbPromise: Promise<IDBDatabase> | null = null;

function hasIdb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  if (!hasIdb()) return Promise.reject(new Error('IndexedDB unavailable'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) {
        const meta = db.createObjectStore(META, { keyPath: 'id' });
        meta.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(PAYLOADS)) {
        db.createObjectStore(PAYLOADS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null; // allow retry on next call
      reject(req.error ?? new Error('IndexedDB open failed'));
    };
  });
  return dbPromise;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB tx aborted'));
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB tx failed'));
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

/** Feature-detect. When false, all other calls reject — callers should hide
 *  the feature (the app itself must keep working without persistence). */
export function isDraftStoreAvailable(): boolean {
  return hasIdb();
}

/** All draft metas, newest first. Never touches the payloads store. */
export async function listDrafts(): Promise<DraftMeta[]> {
  const db = await openDb();
  const tx = db.transaction(META, 'readonly');
  const metas = await reqResult(tx.objectStore(META).getAll() as IDBRequest<DraftMeta[]>);
  return metas.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDraft(id: string): Promise<DraftRecord | undefined> {
  const db = await openDb();
  const tx = db.transaction([META, PAYLOADS], 'readonly');
  const [meta, payloadRec] = await Promise.all([
    reqResult(tx.objectStore(META).get(id) as IDBRequest<DraftMeta | undefined>),
    reqResult(tx.objectStore(PAYLOADS).get(id) as IDBRequest<{ id: string; payload: unknown } | undefined>),
  ]);
  if (!meta) return undefined;
  return { ...meta, payload: payloadRec?.payload };
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([META, PAYLOADS], 'readwrite');
  tx.objectStore(META).delete(id);
  tx.objectStore(PAYLOADS).delete(id);
  await txDone(tx);
}

/** Clears every saved draft (both stores) in one transaction. */
export async function deleteAllDrafts(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([META, PAYLOADS], 'readwrite');
  tx.objectStore(META).clear();
  tx.objectStore(PAYLOADS).clear();
  await txDone(tx);
}

async function writeDraft(rec: DraftRecord): Promise<void> {
  const db = await openDb();
  const { payload, ...meta } = rec;
  const tx = db.transaction([META, PAYLOADS], 'readwrite');
  tx.objectStore(META).put(meta);
  tx.objectStore(PAYLOADS).put({ id: rec.id, payload });
  await txDone(tx);
}

/** Oldest drafts by updatedAt, excluding `keepId` (never evict the draft
 *  currently being written). */
async function evictOldest(keepId: string, count = 1): Promise<number> {
  const metas = await listDrafts();
  const victims = metas.filter((m) => m.id !== keepId).slice(-count);
  for (const v of victims) await deleteDraft(v.id);
  return victims.length;
}

/**
 * Upsert a draft. Enforces MAX_DRAFTS (evicts oldest when inserting a new id)
 * and retries QuotaExceededError up to 3 times by evicting the oldest draft.
 */
export async function putDraft(rec: DraftRecord): Promise<void> {
  // Cap total drafts: when this id is new and the store is full, drop oldest.
  try {
    const metas = await listDrafts();
    const isNew = !metas.some((m) => m.id === rec.id);
    if (isNew && metas.length >= MAX_DRAFTS) {
      await evictOldest(rec.id, metas.length - MAX_DRAFTS + 1);
    }
  } catch {
    // listing failed — proceed with the write attempt anyway
  }

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await writeDraft(rec);
      return;
    } catch (e) {
      const isQuota = e instanceof DOMException && e.name === 'QuotaExceededError';
      if (!isQuota || attempt >= 3) throw e;
      attempt += 1;
      const evicted = await evictOldest(rec.id, 1);
      if (evicted === 0) throw e; // nothing left to evict
    }
  }
}
