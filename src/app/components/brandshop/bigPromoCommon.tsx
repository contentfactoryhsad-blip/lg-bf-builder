/**
 * Big Promotion Section — shared panel UI primitives
 */
import { useT } from '../../i18n/LanguageContext';
import React, { useRef, useState } from 'react';
import { ImageCropModal, CropState } from '../ImageCropModal';

/* ─────────────────────────────────────────── */
/* Show/Hide toggle (replaces checkboxes)      */
/* ─────────────────────────────────────────── */

export function ShowToggle({
  checked,
  onChange,
  disabled = false,
  tone = 'accent',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  /**
   * `group` paints the switch black instead of LG red. Use it for a toggle
   * that shows or hides a whole group of fields, so it reads as the parent of
   * the red ones nested under it rather than as one more of them.
   */
  tone?: 'accent' | 'group';
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: checked ? (tone === 'group' ? '#262626' : '#FD312E') : '#d1d5db',
      }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        style={{
          transform: checked ? 'translateX(18px)' : 'translateX(2px)',
        }}
      />
    </button>
  );
}

/* ─────────────────────────────────────────── */
/* Section header with optional right toggle   */
/* ─────────────────────────────────────────── */

export function PanelSection({
  title,
  showToggle,
  children,
}: {
  title: string;
  /** 우상단 토글. 제공되면 Show/Hide UI 표시 */
  showToggle?: { checked: boolean; onChange: (v: boolean) => void };
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
        <h4 className="text-xs uppercase tracking-widest text-gray-400 font-semibold">{title}</h4>
        {showToggle && (
          <ShowToggle checked={showToggle.checked} onChange={showToggle.onChange} />
        )}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Image upload field with crop support        */
/* ─────────────────────────────────────────── */

export function ImageUploadField({
  value,
  onChange,
  /** original (uncropped) source, needed for re-editing crop */
  originalSource,
  label,
  hint,
  previewBg = '#f3f4f6',
  /** If set, show crop modal on upload and allow Edit Crop */
  cropAspectRatio,
  cropTitle = 'Crop image',
  /** If set, fill transparent areas in crop output */
  cropBgFill,
}: {
  value: string | null;
  /** When crop mode is on, `original` is the uncropped source. */
  onChange: (dataUrl: string | null, original?: string | null) => void;
  originalSource?: string | null;
  label?: string;
  hint?: string;
  previewBg?: string;
  cropAspectRatio?: number;
  cropTitle?: string;
  cropBgFill?: string;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  // Persist the last crop state so "Edit Crop" re-opens the modal with
  // the current crop position/zoom pre-selected. Reset on new file upload.
  const [cropState, setCropState] = useState<CropState | null>(null);
  // Distinguishes "upload new file" from "edit existing crop" when modal opens.
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const cropEnabled = cropAspectRatio !== undefined || originalSource !== undefined;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (cropEnabled) {
        setIsEditingExisting(false);
        setCropState(null); // fresh file → clear previous crop state
        setPendingSrc(dataUrl);
      } else {
        onChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleEditCrop() {
    const src = originalSource ?? value;
    if (!src) return;
    setIsEditingExisting(true);
    setPendingSrc(src);
  }

  function handleCropConfirm(cropped: string, next: CropState) {
    // Pass both cropped and original in a single call — avoids stale-state
    // overwrite when parent updates state from two separate callbacks.
    onChange(cropped, pendingSrc);
    setCropState(next);
    setPendingSrc(null);
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-[11px] text-gray-500" style={{ lineHeight: '16px' }}>{label}</p>}
      <div
        className="flex items-center gap-3 p-2 rounded-lg border border-gray-200"
        style={{ background: previewBg }}
      >
        {value ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={cropEnabled && originalSource ? handleEditCrop : undefined}
              className="group relative shrink-0 rounded-md overflow-hidden"
              style={{
                height: 36,
                background: '#fff',
                padding: 2,
                cursor: cropEnabled && originalSource ? 'pointer' : 'default',
              }}
              title={cropEnabled && originalSource ? 'Edit crop' : undefined}
            >
              <img
                src={value}
                alt="uploaded"
                style={{ height: '100%', width: 'auto', maxWidth: 120, objectFit: 'contain', display: 'block' }}
              />
              {cropEnabled && originalSource && (
                <span
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M16.862 3.487a2.25 2.25 0 013.182 3.182L7.5 19.212 3 20.25l1.038-4.5L16.862 3.487z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
            <span className="text-xs text-gray-500 truncate">{t('Uploaded')}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2 text-xs text-gray-400">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v10M3 7l5-5 5 5M2 14h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{hint ?? 'Upload image'}</span>
          </div>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-700 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
          >
            Upload
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
      </div>

      {/* Crop modal — restore previous crop/zoom when re-editing existing image */}
      {pendingSrc && (
        <ImageCropModal
          imageSrc={pendingSrc}
          aspectRatio={cropAspectRatio}
          title={t(cropTitle)}
          bgFill={cropBgFill}
          initialCrop={isEditingExisting ? cropState?.crop : undefined}
          initialZoom={isEditingExisting ? cropState?.zoom : undefined}
          onConfirm={handleCropConfirm}
          onCancel={() => setPendingSrc(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Small text input / textarea primitives      */
/* ─────────────────────────────────────────── */

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1" style={{ lineHeight: '14px' }}>
      {children}
    </p>
  );
}

export function TextInputField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E]"
    />
  );
}

export function TextAreaField({
  value,
  onChange,
  rows = 2,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E] resize-none"
    />
  );
}

/* ─────────────────────────────────────────── */
/* Segmented control (plain text pills)         */
/* ─────────────────────────────────────────── */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
          style={{
            background: value === opt.value ? '#fff' : 'transparent',
            color: value === opt.value ? '#111827' : '#6b7280',
            boxShadow: value === opt.value ? '0 1px 2px rgba(0,0,0,0.08)' : undefined,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Color radio (pill with color dot + label)   */
/* ─────────────────────────────────────────── */

export interface ColorRadioOption<T extends string> {
  value: T;
  label: string;
  /** Dot fill color (for the indicator circle). Use '#FFFFFF' to show empty/ring style. */
  color: string;
}

export function ColorRadio<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ColorRadioOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex gap-1.5">
      {options.map((opt) => {
        const selected = value === opt.value;
        const isWhite = opt.color === '#FFFFFF' || opt.color.toLowerCase() === '#fff';
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="inline-flex items-center gap-1.5 rounded-md border bg-white transition-colors"
            style={{
              padding: '2px 8px',
              borderColor: selected ? '#FD312E' : '#e5e7eb',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                display: 'inline-block',
                background: isWhite ? '#FFFFFF' : opt.color,
                border: isWhite ? '1px solid #d1d5db' : 'none',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: selected ? '#FD312E' : '#4b5563',
                fontWeight: selected ? 600 : 400,
                lineHeight: '16px',
              }}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
