/**
 * Copy editor for the banner slots.
 *
 * One copy set drives every size in the chosen channel — the Figma layouts share
 * the same roles, and each size renders whichever of them it carries (ST0044 has
 * only a headline and CTA, for instance). Empty fields fall back to the Figma
 * placeholder so a slot never renders blank while you are still filling it in.
 */
import { useT } from '../../i18n/LanguageContext';
import { useRef } from 'react';
import type { IconRowStyle } from './lgcomSlots';
import { ICON_LIST, splitLabel } from './icons/IconRegistry';
import { IconCombobox } from './icons/IconCombobox';

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
  maxLength?: number;
}[] = [
  { key: 'eyebrow', label: 'Eyebrow', hint: 'Optional' },
  { key: 'headline', label: 'Headline', hint: 'Required', multiline: true, rows: 2 },
  { key: 'subcopy', label: 'Subcopy', hint: 'Optional', multiline: true, rows: 2 },
  // The pill hugs its label, so length is the one thing that must be bounded.
  { key: 'cta', label: 'CTA button', maxLength: 15 },
  // sizes under 1000px are locked to the short version — see longDisclaimer
  { key: 'disclaimer', label: 'Disclaimer', hint: '1920×720 Max 400 · Others Max 180 or *T&C\u2019s apply', maxLength: 400 },
];

/**
 * Custom icon captions may not render wider than ~11 average Latin characters
 * per line, or the row's groups start colliding. The check measures the widest
 * wrapped line (explicit newline, else the split-at-first-space rule the
 * renderer uses) in the row's own face — so the cap is about rendered width,
 * not character count, and CJK captions hit it sooner than Latin ones,
 * correctly (about 7 KO characters). "Zero-interest", the registry's widest
 * line, still fits under it.
 */
const LABEL_CAP = 'nnnnnnnnnnn'; // 11 × the average-width Latin glyph
const LABEL_FONT = '600 24px "LG EI Text", sans-serif';
let measureCtx: CanvasRenderingContext2D | null = null;
function widestLinePx(text: string): number {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
    if (!measureCtx) return 0;
  }
  measureCtx.font = LABEL_FONT;
  // an explicit newline is the operator's own break; otherwise the renderer
  // splits at the first space, so measure the same way
  const lines = text.includes('\n') ? text.split('\n') : splitLabel(text.trim());
  return Math.max(...lines.map(l => (l ? measureCtx!.measureText(l).width : 0)));
}
const fitsLabelCap = (text: string) => widestLinePx(text) <= widestLinePx(LABEL_CAP) + 0.5;

export function SlotCopyEditor({
  channelLabel,
  copy,
  onChange,
  onReset,
  iconKind,
  onIconKind,
  iconColor,
  onIconColor,
  iconCount,
  onIconCount,
  iconIds,
  onIconId,
  iconLabels,
  onIconLabel,
  iconStyle,
  showDisclaimer,
  onShowDisclaimer,
  showIndicator,
  onShowIndicator,
  showIndicatorToggle,
  showIconRowToggle,
}: {
  channelLabel: string;
  copy: SlotCopy;
  onChange: (next: SlotCopy) => void;
  onReset: () => void;
  /** ICONS controls, ported from promotion-banner-variation's editor panel. */
  iconKind: 'none' | 'solid' | 'line';
  onIconKind: (next: 'none' | 'solid' | 'line') => void;
  iconColor: 'black' | 'white';
  onIconColor: (next: 'black' | 'white') => void;
  iconCount: 1 | 2 | 3;
  onIconCount: (next: 1 | 2 | 3) => void;
  /** The full pick list for the active kind (not yet cut to the count). */
  iconIds: string[];
  onIconId: (index: number, id: string) => void;
  /** Caption overrides per slot — typed in the operator's own language. */
  iconLabels: (string | null)[];
  onIconLabel: (index: number, label: string | null) => void;
  /** The resolved `kind-color` key the previews and comboboxes render with. */
  iconStyle: IconRowStyle;
  /** Checkbox before the Disclaimer field — off drops it from every size. */
  showDisclaimer: boolean;
  onShowDisclaimer: (next: boolean) => void;
  /** Checkbox for the hero-size carousel indicator; shown on LG.com only. */
  showIndicator: boolean;
  onShowIndicator: (next: boolean) => void;
  showIndicatorToggle: boolean;
  /**
   * LG.com only. The icon row exists on the two hero sizes of that channel and
   * nowhere else, so the paid channels get the copy fields alone. Every other
   * element is fixed — the panel writes copy, it does not compose the layout.
   */
  showIconRowToggle: boolean;
}) {
  const t = useT();
  const touched = Object.values(copy).some(v => v.trim() !== '');
  /** What the Icons checkbox re-enables — the kind in use before it went off. */
  const lastIconKind = useRef<'solid' | 'line'>(iconKind === 'line' ? 'line' : 'solid');
  if (iconKind !== 'none') lastIconKind.current = iconKind;

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
          {/* the disclaimer's hint is long — it sits under the label, not beside it */}
          <span className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium text-gray-700">
              {f.key === 'disclaimer' && (
                <input
                  type="checkbox"
                  checked={showDisclaimer}
                  onChange={e => onShowDisclaimer(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#FD312E]"
                />
              )}
              {t(f.label)}
            </span>
            {f.hint && f.key !== 'disclaimer' && (
              <span className="text-[10px] text-gray-400">{t(f.hint)}</span>
            )}
          </span>
          {f.hint && f.key === 'disclaimer' && (
            <span className="text-[10px] text-gray-400 -mt-1">{t(f.hint)}</span>
          )}
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
              maxLength={f.maxLength}
              disabled={f.key === 'disclaimer' && !showDisclaimer}
              className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FD312E] placeholder:text-gray-300 disabled:opacity-40"
            />
          )}
        </div>
      ))}

      {showIndicatorToggle && (
        <div className="flex items-baseline gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={showIndicator}
              onChange={e => onShowIndicator(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#FD312E]"
            />
            {t('Indicator')}
          </label>
          <span className="text-[10px] text-gray-400">{t('1920×720 · 720×960')}</span>
        </div>
      )}

      {showIconRowToggle && (
      <div className="border-t border-gray-100 pt-4 flex flex-col gap-2.5">
        <div className="flex items-baseline gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={iconKind !== 'none'}
              onChange={e => onIconKind(e.target.checked ? lastIconKind.current : 'none')}
              className="w-3.5 h-3.5 accent-[#FD312E]"
            />
            {t('Icons')}
          </label>
          <span className="text-[10px] text-gray-400">{t('1920×720 · 720×960')}</span>
        </div>

        {iconKind !== 'none' && (
          <div className="flex gap-2">
            {([['solid', 'Solid Icon'], ['line', 'Line Icon']] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => onIconKind(k)}
                className={`flex-1 h-9 rounded-lg border-2 text-xs font-medium transition-colors ${
                  iconKind === k
                    ? 'border-[#FD312E] bg-[#FD312E]/5 text-gray-900'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t(label)}
              </button>
            ))}
          </div>
        )}

        {iconKind !== 'none' && (
          <>
            {/* Black / White */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {(['black', 'white'] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onIconColor(c)}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-colors ${
                    iconColor === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-gray-300"
                    style={{ background: c === 'black' ? '#141414' : '#FFFFFF' }}
                  />
                  {t(c === 'black' ? 'Black' : 'White')}
                </button>
              ))}
            </div>

            {/* Count */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 shrink-0">{t('Number of icons')}</span>
              <div className="flex gap-1.5 ml-auto">
                {([1, 2, 3] as const).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onIconCount(n)}
                    className={`w-9 h-8 rounded-lg border-2 text-xs font-medium transition-colors ${
                      iconCount === n
                        ? 'border-[#FD312E] bg-[#FD312E]/5 text-gray-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* One combobox per group, with an editable caption beneath —
                operators localise the label without touching the icon */}
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: iconCount }).map((_, i) => {
                const fallback = ICON_LIST.find(x => x.id === iconIds[i])?.label ?? '';
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <IconCombobox
                      value={iconIds[i] ?? ''}
                      onSelect={id => onIconId(i, id)}
                      icons={ICON_LIST}
                      iconStyle={iconStyle}
                    />
                    <textarea
                      rows={2}
                      value={iconLabels[i] ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        if (v.split('\n').length > 2) return; // the row draws two lines, no more
                        if (v !== '' && !fitsLabelCap(v)) return; // wider than the cap — keep what fits
                        onIconLabel(i, v === '' ? null : v);
                      }}
                      placeholder={fallback}
                      aria-label={t('Icon label')}
                      className="w-full text-xs leading-snug text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#FD312E] placeholder:text-gray-300 resize-none"
                    />
                  </div>
                );
              })}
            </div>
          </>
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
