/**
 * Benefit slots — the six boxes drawn on the AD Benefit component
 * (Figma board "External Banner Black Friday_AD Benefit", component
 * 6338:174533, `Asset` group: Box1–6, 145×138 on a 3×2 grid in 2000-space).
 *
 * Each box takes either a product image (same LG.com-URL pipeline as the PD
 * Slot plates: import → gallery → background removal → brush → crop) or an
 * extra asset picked from a list, icon-picker style. 🔴 The asset artwork has
 * not been delivered yet (2026-09-04) — `BENEFIT_ASSETS` is empty and the
 * picker renders disabled until entries land. This editor is the skeleton for
 * that feature; the canvas/export side follows once the assets arrive and the
 * AD Benefit board is ported into the builder.
 */
import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useT } from '../../i18n/LanguageContext';
import { ProductRow, type ProductSlot } from './ProductSlotsEditor';

/** One box: a product cut-out, or a picked asset — whichever was set last. */
export interface BenefitSlot extends ProductSlot {
  /** Key into BENEFIT_ASSETS; null = no asset picked. */
  assetId: string | null;
}

export type BenefitSlots = BenefitSlot[];

export const BENEFIT_SLOT_COUNT = 6;

export const emptyBenefitSlots = (): BenefitSlots =>
  Array.from({ length: BENEFIT_SLOT_COUNT }, () => ({ url: '', image: null, assetId: null }));

/**
 * The extra assets the boxes can hold, icon-registry style. Files live in
 * `content template builder source/object/` (1000² transparent PNGs) and are
 * copied verbatim to `public/content-template/object/`.
 */
export const BENEFIT_ASSETS: { id: string; label: string; src: string }[] = [
  { id: 'percentage', label: 'Percentage', src: '/content-template/object/ad-creative-object-percentage.png' },
  { id: 'sales-tag', label: 'Sales Tag', src: '/content-template/object/ad-creative-object-sales-tag.png' },
  { id: 'shopping-bag', label: 'Shopping Bag', src: '/content-template/object/ad-creative-object-shopping-bag.png' },
  { id: 'uptosale', label: 'Up to Sale', src: '/content-template/object/ad-creative-object-uptosale.png' },
  { id: 'cube', label: 'Cube', src: '/content-template/object/kv-object-cube.png' },
  { id: 'gift-box', label: 'Gift Box', src: '/content-template/object/kv-object-gift-box.png' },
  { id: 'stop-watch', label: 'Stop Watch', src: '/content-template/object/kv-object-stop-watch.png' },
];

export function BenefitSlotsEditor({
  slots,
  onChange,
}: {
  slots: BenefitSlots;
  onChange: (next: BenefitSlots) => void;
}) {
  const t = useT();
  const patch = (i: number, part: Partial<BenefitSlot>) => {
    const next = slots.slice();
    next[i] = { ...next[i], ...part };
    onChange(next);
  };

  return (
    <div className="p-5 pt-0 flex flex-col">
      <div className="mb-1">
        <p className="font-lgei font-bold text-[15px] text-gray-900 mb-0.5">{t('Benefit Slots')}</p>
        <p className="text-xs text-gray-400">
          {t('Fill the six boxes with product images or assets. Applies to every size.')}
        </p>
      </div>

      {Array.from({ length: BENEFIT_SLOT_COUNT }, (_, i) => (
        <div key={i}>
          <ProductRow
            index={i + 1}
            label={`${t('BOX')} ${i + 1}`}
            slot={slots[i] ?? { url: '', image: null }}
            onChange={part => patch(i, part)}
          />
          {/* Asset picker — icon-combobox style dropdown (thumb + name) */}
          <div className="flex items-center gap-2 pb-3 -mt-1">
            <span className="text-[11px] text-gray-400 shrink-0">{t('or asset')}</span>
            <BenefitAssetCombobox
              value={slots[i]?.assetId ?? null}
              onSelect={id => patch(i, { assetId: id })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Small dropdown modelled on IconCombobox: thumbnail + name per row, None on top. */
function BenefitAssetCombobox({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (id: string | null) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const selected = BENEFIT_ASSETS.find(a => a.id === value) ?? null;

  const Thumb = ({ src }: { src: string | null }) => (
    <div className="w-8 h-8 shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-gray-100">
      {src && <img src={src} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />}
    </div>
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex-1 min-w-0 flex items-center gap-2.5 bg-white border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-[#FD312E] rounded-lg hover:border-gray-400 transition-colors"
        >
          <Thumb src={selected?.src ?? null} />
          <span className={`flex-1 text-left truncate text-[12px] ${selected ? 'text-gray-700' : 'text-gray-400'}`}>
            {selected ? selected.label : t('None')}
          </span>
          <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          align="start"
          sideOffset={4}
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <div className="overflow-y-auto max-h-[280px]">
            <button
              type="button"
              onClick={() => { onSelect(null); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-gray-50 transition-colors text-left"
            >
              <Thumb src={null} />
              <span className="flex-1 truncate text-[12px] text-gray-500">{t('None')}</span>
              {value === null && <Check size={14} className="shrink-0 text-[#FD312E]" />}
            </button>
            {BENEFIT_ASSETS.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => { onSelect(a.id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-gray-50 transition-colors text-left"
              >
                <Thumb src={a.src} />
                <span className="flex-1 truncate text-[12px] text-gray-800">{a.label}</span>
                {value === a.id && <Check size={14} className="shrink-0 text-[#FD312E]" />}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
