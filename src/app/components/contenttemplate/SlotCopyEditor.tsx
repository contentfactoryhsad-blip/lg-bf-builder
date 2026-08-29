/**
 * Copy editor for the banner slots.
 *
 * One copy set drives every size in the chosen channel — the Figma layouts share
 * the same roles, and each size renders whichever of them it carries (ST0044 has
 * only a headline and CTA, for instance). Empty fields fall back to the Figma
 * placeholder so a slot never renders blank while you are still filling it in.
 */
import { useT } from '../../i18n/LanguageContext';
import { ICON_ROW_STYLES, type IconRowStyle } from './lgcomSlots';

export interface SlotCopy {
  eyebrow: string;
  headline: string;
  subcopy: string;
  cta: string;
  disclaimer: string;
}

export const EMPTY_COPY: SlotCopy = {
  eyebrow: '',
  headline: '',
  subcopy: '',
  cta: '',
  disclaimer: '',
};

/** Figma's own placeholder strings, shown until the field is filled. */
export const COPY_PLACEHOLDER: SlotCopy = {
  eyebrow: 'Lorem ipsumdolor sit amet',
  headline: 'Lorem ipsum dolor sit ametap consectetur',
  subcopy: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  cta: 'Shop now',
  disclaimer: '*T&C’s apply',
};

const FIELDS: {
  key: keyof SlotCopy;
  label: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
}[] = [
  { key: 'eyebrow', label: 'Eyebrow', hint: 'Optional' },
  { key: 'headline', label: 'Headline', hint: 'Required', multiline: true, rows: 2 },
  { key: 'subcopy', label: 'Subcopy', hint: 'Optional', multiline: true, rows: 2 },
  { key: 'cta', label: 'CTA button' },
  { key: 'disclaimer', label: 'Disclaimer', hint: 'Optional' },
];

export function SlotCopyEditor({
  channelLabel,
  copy,
  onChange,
  onReset,
  showIconRow,
  onShowIconRowChange,
  iconStyle,
  onIconStyleChange,
  showIconRowToggle,
}: {
  channelLabel: string;
  copy: SlotCopy;
  onChange: (next: SlotCopy) => void;
  onReset: () => void;
  showIconRow: boolean;
  onShowIconRowChange: (next: boolean) => void;
  iconStyle: IconRowStyle;
  onIconStyleChange: (next: IconRowStyle) => void;
  /**
   * LG.com only. The icon row exists on the two hero sizes of that channel and
   * nowhere else, so the paid channels get the copy fields alone. Every other
   * element is fixed — the panel writes copy, it does not compose the layout.
   */
  showIconRowToggle: boolean;
}) {
  const t = useT();
  const touched = Object.values(copy).some(v => v.trim() !== '');

  const field = (key: keyof SlotCopy, value: string) => onChange({ ...copy, [key]: value });

  return (
    <div className="p-5 flex flex-col gap-4">
      <div>
        <p className="font-lgei font-bold text-[15px] text-gray-900 mb-0.5">{t('Copy')}</p>
        <p className="text-xs text-gray-400">
          {t('Applies to every {channel} size.').replace('{channel}', channelLabel)}
        </p>
      </div>

      {FIELDS.map(f => (
        <div key={f.key} className="flex flex-col gap-1">
          <span className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">{t(f.label)}</span>
            {f.hint && <span className="text-[10px] text-gray-400">{t(f.hint)}</span>}
          </span>
          {f.multiline ? (
            <textarea
              value={copy[f.key]}
              onChange={e => field(f.key, e.target.value)}
              placeholder={COPY_PLACEHOLDER[f.key]}
              rows={f.rows ?? 2}
              className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded-lg px-3 py-2 resize-y focus:outline-none focus:border-[#FD312E] placeholder:text-gray-300"
            />
          ) : (
            <input
              type="text"
              value={copy[f.key]}
              onChange={e => field(f.key, e.target.value)}
              placeholder={COPY_PLACEHOLDER[f.key]}
              className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FD312E] placeholder:text-gray-300"
            />
          )}
        </div>
      ))}

      {showIconRowToggle && (
      <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showIconRow}
            onChange={e => onShowIconRowChange(e.target.checked)}
            className="w-4 h-4 accent-[#FD312E]"
          />
          <span className="text-xs font-medium text-gray-700">{t('Icon row')}</span>
          <span className="text-[10px] text-gray-400">{t('1920×720 · 720×960')}</span>
        </label>
        {showIconRow && (
          <div className="flex flex-wrap gap-1.5 pl-6">
            {ICON_ROW_STYLES.map(st => (
              <button
                key={st.key}
                type="button"
                onClick={() => onIconStyleChange(st.key)}
                className={`px-2.5 py-1 rounded-full border text-[11px] transition-colors ${
                  iconStyle === st.key
                    ? 'border-[#FD312E] bg-[#FD312E]/8 text-[#FD312E]'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {t(st.label)}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      <button
        type="button"
        onClick={onReset}
        disabled={!touched}
        className="self-start text-xs text-gray-500 hover:text-[#FD312E] transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        {t('Reset to placeholder')}
      </button>
    </div>
  );
}
