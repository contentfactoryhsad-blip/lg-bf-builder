import { useState } from 'react';

interface DraftHandle {
  dirty: boolean;
  save: (opts?: { title?: string }) => Promise<void>;
}

/**
 * Wraps navigation actions (Back, NavRail) so leaving with unsaved draft work
 * prompts Yes/No instead of silently discarding. Use `guard(action)` in place
 * of calling the action directly.
 *
 * Choosing "Yes" doesn't save immediately — it swaps to a version-name step
 * (`showNameModal`) so the save behaves the same as an explicit Save for Later.
 * Render <UnsavedChangesModal> when `showModal` and <SaveDraftModal> when
 * `showNameModal`.
 */
export function useUnsavedGuard(draft: DraftHandle, defaultName: string) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);

  const guard = (action: () => void) => {
    if (draft.dirty) setPendingAction(() => action);
    else action();
  };

  const handleSave = () => {
    setShowNameModal(true);
  };

  const handleNameConfirm = async (name: string) => {
    setShowNameModal(false);
    await draft.save({ title: name });
    pendingAction?.();
    setPendingAction(null);
  };

  const handleNameCancel = () => {
    setShowNameModal(false);
  };

  const handleDiscard = () => {
    pendingAction?.();
    setPendingAction(null);
  };

  return {
    guard,
    showModal: pendingAction !== null && !showNameModal,
    showNameModal,
    defaultName,
    handleSave,
    handleNameConfirm,
    handleNameCancel,
    handleDiscard,
  };
}
