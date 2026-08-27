import { useCallback, useRef, useState } from 'react';

/**
 * State with an undo stack.
 *
 * A drop-in for `useState` — the setter keeps the same shape, so call sites do
 * not change. What it adds is a record of the values that came before.
 *
 * **Snapshots, not patches.** Every entry is the whole previous value. That is
 * only affordable because the state it holds is updated immutably: a new array
 * whose unchanged members are the same objects as before. So a snapshot of a
 * session carrying megabytes of base64 cutouts costs an array of references and
 * whatever the one edit allocated — the images are shared, never copied.
 *
 * **Consecutive changes merge.** Dragging a layer commits on every
 * `pointermove`, and typing commits on every keystroke; one entry per event
 * would make undo useless. Anything landing within `coalesceMs` of the previous
 * change extends it instead of starting a new one, so one drag and one typed
 * word each undo in a single step. A pause mid-drag splits it, which is a
 * reasonable place for a boundary anyway.
 */
export interface UndoControls {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Forget the history without touching the value — for a fresh document. */
  clear: () => void;
}

export function useUndoableState<T>(
  initial: T | (() => T),
  { limit = 50, coalesceMs = 400 }: { limit?: number; coalesceMs?: number } = {},
): [T, (updater: T | ((prev: T) => T)) => void, UndoControls] {
  const [value, setValueState] = useState<T>(initial);

  // The setter reads through this rather than through the state updater, so a
  // caller that fires twice in one tick sees the first one's result — and so
  // the updater is never run twice for one change, which would push a
  // phantom entry under StrictMode's double invocation.
  const current = useRef<T>(value);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const lastAt = useRef(0);
  // Only to re-render the buttons; the stacks themselves live in refs.
  const [, bumpDepth] = useState(0);

  const commit = useCallback((next: T) => {
    current.current = next;
    setValueState(next);
    bumpDepth((n) => n + 1);
  }, []);

  const setValue = useCallback((updater: T | ((prev: T) => T)) => {
    const prev = current.current;
    const next = typeof updater === 'function'
      ? (updater as (p: T) => T)(prev)
      : updater;
    if (Object.is(next, prev)) return;

    const now = Date.now();
    if (now - lastAt.current >= coalesceMs) {
      past.current.push(prev);
      if (past.current.length > limit) past.current.shift();
    }
    lastAt.current = now;
    // A new edit is a new branch: whatever was undone is no longer reachable.
    future.current = [];
    commit(next);
  }, [coalesceMs, limit, commit]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(current.current);
    // Never merge the next edit into the entry we just stepped back onto.
    lastAt.current = 0;
    commit(prev);
  }, [commit]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(current.current);
    lastAt.current = 0;
    commit(next);
  }, [commit]);

  const clear = useCallback(() => {
    past.current = [];
    future.current = [];
    lastAt.current = 0;
    bumpDepth((n) => n + 1);
  }, []);

  return [value, setValue, {
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    clear,
  }];
}
