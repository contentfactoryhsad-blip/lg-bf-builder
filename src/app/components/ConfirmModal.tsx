import React from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Generic centered confirm dialog — same visual format as UnsavedChangesModal
 *  and SaveForLaterButton's overwrite confirmation. Use instead of window.confirm(). */
export function ConfirmModal({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6 text-center">
        <p className="font-lgei font-bold text-[17px] text-gray-900 mb-1" style={{ lineHeight: '24px' }}>
          {title}
        </p>
        <p className="text-sm text-gray-500 mb-5" style={{ lineHeight: '20px' }}>
          {message}
        </p>
        <div className="flex justify-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm text-gray-600 border border-gray-300 hover:border-gray-400 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-full text-sm font-medium bg-[#FD312E] text-white hover:bg-[#E22825] transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
