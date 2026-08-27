/**
 * Off-site Banner — step 1.
 *
 * One card per KV block, five URL slots each. Deliberately just a list of
 * fields — nothing is crawled and no artwork is shown, because pressing Next
 * fetches every filled slot and cuts its background out in one pass. Cutouts
 * are reviewed and swapped on step 2, where there is a banner to judge them
 * against.
 *
 * Products with no LG.com page are uploaded straight into the block from the
 * button at its foot, which fills the next free slot.
 *
 * Nothing campaign-wide lives here. The backdrop, the logos and the colours are
 * all in step 2's shared panel, where there is a banner to judge them against.
 */

import React, { useRef, useState } from 'react';
import { ChevronDown, ImageIcon, Plus, Trash2, Upload } from 'lucide-react';
import { useT } from '../../i18n/LanguageContext';
import { MAX_ITEMS_PER_BLOCK, MAX_OFFSITE_BLOCKS, type OffSiteBlock, type OffSiteItem } from './offsiteTypes';

/** Address of one product slot. */
export interface SlotRef {
  block: number;
  slot: number;
}

export const slotKey = (ref: SlotRef) => `${ref.block}:${ref.slot}`;

interface Props {
  blocks: OffSiteBlock[];
  onChangeItem: (ref: SlotRef, patch: Partial<OffSiteItem>) => void;
  onAddBlock: () => void;
  /** Drop an uploaded image into the block's first free slot. The file name
   *  labels the slot, which is what tells it apart from an empty one. */
  onUpload: (block: number, dataUrl: string, fileName: string) => void;
  /** Free a slot an upload is holding. */
  onRemoveProduct: (block: number, slot: number) => void;
  /** Keyed by item id. */
  errors: Record<string, string>;
}

export function OffSiteUrlStep({
  blocks, onChangeItem, onAddBlock, onUpload, onRemoveProduct, errors,
}: Props) {
  const t = useT();

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-3.5">
      <div className="-mb-2">
        <h2 className="font-lgei font-bold text-[20px] text-gray-900 mb-1" style={{ lineHeight: '28px' }}>
          {t('Enter Product URLs')}
        </h2>
        <p className="text-sm text-gray-500" style={{ lineHeight: '20px' }}>
        {t('One block is one banner. Each block holds up to {max} products — paste an LG.com page per slot, or upload images directly.')
            .replace('{max}', String(MAX_ITEMS_PER_BLOCK))}
        </p>
      </div>

      {blocks.map((block, b) => (
        <BlockCard
          key={block.id}
          block={block}
          index={b}
          onChangeItem={onChangeItem}
          onUpload={(dataUrl, fileName) => onUpload(b, dataUrl, fileName)}
          onRemoveProduct={(slot) => onRemoveProduct(b, slot)}
          errors={errors}
        />
      ))}

      <button
        type="button"
        onClick={onAddBlock}
        disabled={blocks.length >= MAX_OFFSITE_BLOCKS}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-[#FD312E] hover:text-[#FD312E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={14} />
        {t('Add banner block')}
      </button>
    </div>
  );
}

function BlockCard({
  block, index, onChangeItem, onUpload, onRemoveProduct, errors,
}: {
  block: OffSiteBlock;
  index: number;
  onChangeItem: (ref: SlotRef, patch: Partial<OffSiteItem>) => void;
  onUpload: (dataUrl: string, fileName: string) => void;
  onRemoveProduct: (slot: number) => void;
  errors: Record<string, string>;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const full = block.items.every((i) => i.image);
  // Open by default: a card that hides its own fields on arrival reads as
  // broken. Collapsing is for getting a finished banner out of the way once a
  // session has enough of them to scroll.
  const [open, setOpen] = useState(true);
  const filled = block.items.filter((i) => i.sourceUrl.trim() || i.image).length;

  // One file at a time: each upload goes through the background-removal editor,
  // and a batch would stack a modal per file.
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpload(reader.result as string, file.name);
    reader.readAsDataURL(file);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-3 ${open ? 'border-b border-gray-100' : ''}`}>
        <span className="w-6 h-6 shrink-0 rounded-md bg-[#FD312E] text-white text-[11px] font-semibold flex items-center justify-center">
          {index + 1}
        </span>
        <p className="min-w-0 text-sm font-medium text-gray-900">
          {t('Banner')} {index + 1}
        </p>
        {/* Collapsed, the count is the only thing left saying what is inside. */}
        {!open && (
          <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">
            {filled}/{block.items.length}
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-gray-400 hover:text-[#FD312E] transition-colors"
          aria-expanded={open}
          aria-label={open ? t('Collapse') : t('Expand')}
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? '' : '-rotate-90'}`}
          />
        </button>
      </div>

      {open && (
      <div className="p-3 flex flex-col gap-2">
        {block.items.map((item, slot) => {
          const ref = { block: index, slot };
          // A slot filled by upload has no page to crawl, so it stops being a
          // URL field: the file name stands in for the address it never had.
          const uploaded = item.image !== null && item.sourceUrl === '';
          return (
            <div key={item.id} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-center text-[11px] text-gray-400">{slot + 1}</span>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                {uploaded ? (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <ImageIcon size={13} className="shrink-0 text-gray-400" />
                    <span className="flex-1 min-w-0 truncate text-sm text-gray-600">
                      {item.name || t('Uploaded image')}
                    </span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={item.sourceUrl}
                    onChange={(e) => onChangeItem(ref, { sourceUrl: e.target.value })}
                    placeholder="https://www.lg.com/th/..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FD312E]"
                  />
                )}
                {errors[item.id] && <p className="px-1 text-[11px] text-[#FD312E]">{errors[item.id]}</p>}
              </div>

              {/* Clearing the last slot would leave a banner with no product, so
                  the last one standing keeps its content and only ever resets. */}
              <button
                type="button"
                onClick={() => onRemoveProduct(slot)}
                disabled={!item.sourceUrl.trim() && !item.image}
                className="shrink-0 self-start mt-[3px] w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                aria-label={t('Remove')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}

        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={full}
          className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-[12px] text-gray-500 hover:border-[#FD312E] hover:text-[#FD312E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Upload size={13} />
          {full
            ? t('All {max} slots filled').replace('{max}', String(MAX_ITEMS_PER_BLOCK))
            : t('Upload')}
        </button>
      </div>
      )}
    </div>
  );
}
