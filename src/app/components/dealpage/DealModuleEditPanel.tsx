/**
 * Deal Page edit panels — the www.lg.com counterpart to
 * brandshop/modules/ModuleEditPanel.tsx.
 *
 * The field atoms are re-declared here rather than imported: the Shop in Shop
 * panel file keeps them private and is 3.5k lines of marketplace-specific
 * editors, so importing from it would drag that whole chunk into this
 * builder's lazy bundle. `ShowToggle` and `ImageCropModal` are already shared
 * components, so those are reused directly.
 */

import React, { useRef, useState } from 'react';
import { useT } from '../../i18n/LanguageContext';
import { ShowToggle } from '../brandshop/bigPromoCommon';
import { ImageCropModal } from '../ImageCropModal';
import { assetsInGroup, getAsset, thumbUrl, visibleRows } from '../contenttemplate/contentTemplateAssets';
import { productSlotCount } from '../contenttemplate/lgcomSlots';
import { ProductSlotsEditor, emptyProductSlots } from '../contenttemplate/ProductSlotsEditor';
import { HERO_MOTION_ID, HERO_NUDGE_LIMIT, HERO_SCALE_MAX, HERO_SCALE_MIN, HERO_SCALE_STEP } from './dealHeroArt';
import { PROMO_KV_ROWS, PROMO_SLOT, promoArtHasSlots, DEAL_KV_TILES } from './dealBannerArt';
import {
  type DealEditState,
  type DealSiteHeaderState,
  type DealSiteFooterState,
  type DealFooterColumn,
  type DealHeroState,
  type DealCardsState,
  type DealCardItem,
  type DealTabNavState,
  type DealPromoBannerState,
  type CountdownFields,
  type DealBannerSize,
  type DealProductListState,
  type DealProductItem,
  type DealCategoryNavState,
  type DealCategoryNavItem,
  dealProductItemFor,
  dealProductSetItems,
  DEAL_PRODUCT_SETS,
  type DealProductSetKey,
  dealFooterColumnDefaults,
  DEAL_FOOTER_COLUMN_MIN,
  DEAL_FOOTER_COLUMN_MAX,
  DEAL_PRODUCT_MIN,
  DEAL_PRODUCT_MAX,
} from './dealEditStates';

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">{children}</p>;
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

const INPUT_CLASS =
  'w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#FD312E] bg-white';

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <FieldLabel>{label}</FieldLabel>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={INPUT_CLASS} />
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 2,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`${INPUT_CLASS} resize-none`}
      />
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

/** A field whose whole row can be switched off — label left, toggle right. */
function ToggleField({
  label,
  shown,
  onShownChange,
  children,
}: {
  label: string;
  shown: boolean;
  onShownChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center mb-1.5">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <div className="ml-auto">
          <ShowToggle checked={shown} onChange={onShownChange} />
        </div>
      </div>
      {shown && children}
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
  aspectRatio,
  objectFit = 'cover',
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  aspectRatio?: number;
  objectFit?: 'cover' | 'contain';
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="mb-3">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        {value ? (
          <div className="relative w-12 h-12 rounded border border-gray-200 overflow-hidden shrink-0 bg-gray-50 group">
            <img
              src={value}
              alt=""
              className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
              style={{ maxWidth: 'none' }}
            />
            <button
              onClick={() => setCropSrc(value)}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="text-white text-[9px] font-medium leading-tight text-center">
                {t('Edit')}
                <br />
                {t('Crop')}
              </span>
            </button>
          </div>
        ) : (
          <div className="w-12 h-12 rounded border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0 bg-gray-50">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 text-xs text-[#FD312E] border border-[#FD312E]/30 rounded-md py-1.5 hover:bg-[#FD312E]/5 transition-colors"
        >
          {value ? t('Replace') : t('Upload')}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={aspectRatio}
          title={label}
          onConfirm={cropped => {
            onChange(cropped);
            setCropSrc(null);
          }}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}

function CountSelector({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mb-3">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-1">
        {Array.from({ length: max - min + 1 }, (_, k) => min + k).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${
              value === n ? 'bg-[#FD312E] border-[#FD312E] text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The countdown unit editor (value + label per row) — shared by the hero and
 * the deal banner, whose states both carry `CountdownFields`. Mount it inside
 * a ToggleField bound to `showCountdown`.
 */
function CountdownEditor<T extends CountdownFields>({ data, onChange }: { data: T; onChange: (p: Partial<CountdownFields>) => void }) {
  const t = useT();
  const units = [
    { v: 'days', l: 'dayLabel', label: t('Day') },
    { v: 'hours', l: 'hourLabel', label: t('Hour') },
    { v: 'minutes', l: 'minuteLabel', label: t('Minute') },
    { v: 'seconds', l: 'secondLabel', label: t('Second') },
  ] as Array<{ v: keyof CountdownFields; l: keyof CountdownFields; label: string }>;
  return (
    <>
      {units.map(u => (
        <div key={u.v} className="flex gap-1.5 mb-1.5 last:mb-0 items-center">
          <span className="text-[10px] text-gray-400 w-12 shrink-0">{u.label}</span>
          <input
            type="text"
            value={data[u.v] as string}
            onChange={e => onChange({ [u.v]: e.target.value } as Partial<CountdownFields>)}
            className={`${INPUT_CLASS} w-16 shrink-0 text-center`}
          />
          <input
            type="text"
            value={data[u.l] as string}
            onChange={e => onChange({ [u.l]: e.target.value } as Partial<CountdownFields>)}
            className={INPUT_CLASS}
          />
        </div>
      ))}
    </>
  );
}

/**
 * Grow/shrink a list of editable items, restoring the curated defaults by
 * position on the way back up — same behaviour as the Shop in Shop panels'
 * count controls.
 */
function resizeList<T>(list: T[], count: number, defaultAt: (i: number) => T): T[] {
  if (count === list.length) return list;
  if (count < list.length) return list.slice(0, count);
  const next = [...list];
  for (let i = list.length; i < count; i++) next.push(defaultAt(i));
  return next;
}

// ── 1. Hero ───────────────────────────────────────────────────────────────────

/**
 * Key-visual picker — the same tile rows the Content Template Builder puts in
 * its left rail, reusing that registry so a new key visual shows up in both
 * builders the moment it is added there.
 *
 * The rail here is 280 wide against Figma's 288, so the tiles take equal
 * fractions of the row rather than their Figma pixel widths, and hold the
 * 140:64 letterbox with an aspect ratio instead.
 */
function KeyVisualField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  const t = useT();
  const rows = visibleRows().filter(r => r.key.startsWith('kv-'));
  const motionSelected = value === HERO_MOTION_ID;
  const mainAsset = getAsset('kv-main');
  return (
    <div className="mb-4">
      <FieldLabel>{t('Key visual')}</FieldLabel>
      <div className="flex flex-col gap-3">
        {rows.map(row => (
          <div key={row.key} className="flex flex-col gap-1.5">
            <p className="text-[11px] text-gray-400">{t(row.label)}</p>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${row.tiles.length}, minmax(0, 1fr))` }}
            >
              {row.tiles.map((tl, i) => {
                const a = getAsset(tl.id);
                if (!a) return null;
                const selected = value === a.id;
                // The registry's captionFromIndex: the first tile IS the row
                // title, so only the variants after it get a caption.
                const captioned = i >= (row.captionFromIndex ?? 0);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onChange(a.id)}
                    className="flex flex-col gap-1 text-left group/kv"
                  >
                    <span
                      style={{ aspectRatio: '140 / 64' }}
                      className={`block w-full rounded overflow-hidden bg-[#111] transition-shadow ${
                        selected ? 'ring-2 ring-[#FD312E]' : 'ring-1 ring-transparent group-hover/kv:ring-gray-300'
                      }`}
                    >
                      {!a.blank && (
                        <img src={thumbUrl(a)} alt={a.label} loading="lazy" className="w-full h-full object-cover" draggable={false} />
                      )}
                    </span>
                    {captioned && (
                      <span
                        className={`text-[10px] leading-[12px] text-center transition-colors ${
                          selected ? 'text-[#FD312E] font-medium' : 'text-gray-500'
                        }`}
                      >
                        {t(a.label)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* KEY VISUAL_Motion — kv-main's animated master, framed exactly like
            Main. One tile of its own under the three artwork rows. */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-gray-400">{t('KEY VISUAL_Motion')}</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <button type="button" onClick={() => onChange(HERO_MOTION_ID)} className="flex flex-col gap-1 text-left group/kv">
              <span
                style={{ aspectRatio: '140 / 64' }}
                className={`relative block w-full rounded overflow-hidden bg-[#111] transition-shadow ${
                  motionSelected ? 'ring-2 ring-[#FD312E]' : 'ring-1 ring-transparent group-hover/kv:ring-gray-300'
                }`}
              >
                {mainAsset && (
                  <img src={thumbUrl(mainAsset)} alt="" loading="lazy" className="w-full h-full object-cover" draggable={false} />
                )}
                {/* Play badge — this tile is the video, not another artwork. */}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/55">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 0.8v6.4L7 4z" fill="#fff" />
                    </svg>
                  </span>
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Fine positioning for the key visual.
 *
 * The board already frames each key visual for the hero, so this is a nudge on
 * top of that — enough to slide the lockup clear of a long headline, not enough
 * to re-compose the banner. Reset puts it back on the board's own placement.
 */
function NudgeField({
  x,
  y,
  scale,
  onChange,
}: {
  x: number;
  y: number;
  scale: number;
  onChange: (next: { x: number; y: number; scale: number }) => void;
}) {
  const t = useT();
  const clamp = (v: number) => Math.max(-HERO_NUDGE_LIMIT, Math.min(HERO_NUDGE_LIMIT, Math.round(v) || 0));
  const clampScale = (v: number) =>
    Math.round(Math.max(HERO_SCALE_MIN, Math.min(HERO_SCALE_MAX, v || 1)) * 100) / 100;
  const step = (dx: number, dy: number) => onChange({ x: clamp(x + dx), y: clamp(y + dy), scale });

  const Arrow = ({ dx, dy, label }: { dx: number; dy: number; label: string }) => (
    <button
      type="button"
      onClick={() => step(dx, dy)}
      className="h-7 rounded-md border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800 transition-colors"
      aria-label={label}
    >
      {label}
    </button>
  );

  return (
    <div className="mb-4">
      <div className="flex items-center mb-1">
        <FieldLabel>{t('Position')}</FieldLabel>
        <button
          type="button"
          onClick={() => onChange({ x: 0, y: 0, scale: 1 })}
          disabled={x === 0 && y === 0 && scale === 1}
          className="ml-auto -mt-1 text-[10px] font-medium text-gray-400 hover:text-[#FD312E] disabled:text-gray-300 disabled:cursor-default transition-colors"
        >
          {t('Reset')}
        </button>
      </div>
      <div className="flex items-center gap-2">
        {/* 20px per click — a visible step at hero scale without overshooting. */}
        <div className="grid grid-cols-3 gap-1 w-[92px] shrink-0">
          <span />
          <Arrow dx={0} dy={-20} label="↑" />
          <span />
          <Arrow dx={-20} dy={0} label="←" />
          <span />
          <Arrow dx={20} dy={0} label="→" />
          <span />
          <Arrow dx={0} dy={20} label="↓" />
          <span />
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 w-2">X</span>
            <input
              type="number"
              value={x}
              onChange={e => onChange({ x: clamp(Number(e.target.value)), y, scale })}
              className={`${INPUT_CLASS} tabular-nums`}
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 w-2">Y</span>
            <input
              type="number"
              value={y}
              onChange={e => onChange({ x, y: clamp(Number(e.target.value)), scale })}
              className={`${INPUT_CLASS} tabular-nums`}
            />
          </label>
        </div>
      </div>

      {/* Scale — a slider so the framing can be felt, with the multiplier shown
          because a designer handing the file on will want the number. */}
      <div className="flex items-center gap-2 mt-2.5">
        <span className="text-[10px] text-gray-400 w-[38px] shrink-0">{t('Scale')}</span>
        <input
          type="range"
          min={HERO_SCALE_MIN}
          max={HERO_SCALE_MAX}
          step={HERO_SCALE_STEP}
          value={scale}
          onChange={e => onChange({ x, y, scale: clampScale(Number(e.target.value)) })}
          className="flex-1 accent-[#FD312E]"
        />
        <span className="text-[10px] text-gray-500 tabular-nums w-[38px] text-right shrink-0">
          {scale.toFixed(2)}×
        </span>
      </div>
    </div>
  );
}

function DealHeroPanel({ data, onUpdate }: { data: DealHeroState; onUpdate: (d: DealHeroState) => void }) {
  const t = useT();
  const set = (p: Partial<DealHeroState>) => onUpdate({ ...data, ...p });
  // Only the PD Slot key visuals carry plates; everything else reports 0.
  const plateCount = data.kvAsset ? productSlotCount(data.kvAsset) : 0;
  return (
    <div>
      <KeyVisualField value={data.kvAsset} onChange={id => set({ kvAsset: id })} />
      <NudgeField
        x={data.kvNudgeX}
        y={data.kvNudgeY}
        scale={data.kvScale ?? 1}
        onChange={n => set({ kvNudgeX: n.x, kvNudgeY: n.y, kvScale: n.scale })}
      />
      <SectionDivider>{t('Copy')}</SectionDivider>
      <ToggleField label={t('Eyebrow')} shown={data.showEyebrow} onShownChange={v => set({ showEyebrow: v })}>
        <input type="text" value={data.eyebrow} onChange={e => set({ eyebrow: e.target.value })} className={INPUT_CLASS} />
      </ToggleField>
      <TextAreaField
        label={t('Headline')}
        value={data.headline}
        onChange={v => set({ headline: v })}
        rows={2}
        hint={t('Line break splits the headline.')}
      />
      <ToggleField label={t('Sub copy')} shown={data.showSubCopy} onShownChange={v => set({ showSubCopy: v })}>
        <textarea
          value={data.subCopy}
          onChange={e => set({ subCopy: e.target.value })}
          rows={2}
          className={`${INPUT_CLASS} resize-none`}
        />
      </ToggleField>

      {/* The countdown the board hangs under the hero copy (6236:143805). */}
      <SectionDivider>{t('Countdown')}</SectionDivider>
      <ToggleField label={t('Time countdown')} shown={data.showCountdown} onShownChange={v => set({ showCountdown: v })}>
        <CountdownEditor data={data} onChange={p => set(p)} />
      </ToggleField>

      {/* The PD Slot key visuals ship with empty plates baked into the art;
          this is the same product flow the Content Template Builder runs, so a
          product cut out there behaves identically here. `-mx-5` cancels the
          panel's own padding, since the editor brings its own. */}
      {plateCount > 0 && (
        <div className="-mx-5 mt-2 pt-4 border-t border-gray-100">
          <ProductSlotsEditor
            count={plateCount}
            slots={data.products.length === plateCount ? data.products : emptyProductSlots(plateCount)}
            onChange={next => set({ products: next })}
          />
        </div>
      )}
    </div>
  );
}

// ── 2. Deal cards ─────────────────────────────────────────────────────────────

/**
 * Card-art picker — the four deal-type campaign artworks from the Content
 * Template registry, in the same 4-across tile row that builder's rail uses.
 * Cards swap between these; there is no upload here, so a new deal artwork
 * added to the registry appears in every card's picker automatically.
 */
function DealArtField({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (id: string) => void;
}) {
  const t = useT();
  const assets = assetsInGroup('deal-type');
  return (
    <div className="mb-3">
      <FieldLabel>{t('Card image')}</FieldLabel>
      <div className="grid grid-cols-4 gap-2">
        {assets.map(a => {
          const selected = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              className="flex flex-col gap-1 text-left group/da"
            >
              <span
                style={{ aspectRatio: '1 / 1' }}
                className={`block w-full rounded overflow-hidden bg-[#111] transition-shadow ${
                  selected ? 'ring-2 ring-[#FD312E]' : 'ring-1 ring-transparent group-hover/da:ring-gray-300'
                }`}
              >
                <img src={thumbUrl(a)} alt={a.label} loading="lazy" className="w-full h-full object-cover" draggable={false} />
              </span>
              <span
                className={`text-[10px] leading-[12px] text-center transition-colors ${
                  selected ? 'text-[#FD312E] font-medium' : 'text-gray-500'
                }`}
              >
                {t(a.label)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DealCardsPanel({ data, onUpdate }: { data: DealCardsState; onUpdate: (d: DealCardsState) => void }) {
  const t = useT();
  const set = (p: Partial<DealCardsState>) => onUpdate({ ...data, ...p });
  const updateCard = (idx: number, card: DealCardItem) => {
    const cards = [...data.cards];
    cards[idx] = card;
    set({ cards });
  };

  return (
    <div>
      <ToggleField label={t('Section title')} shown={data.showSectionTitle} onShownChange={v => set({ showSectionTitle: v })}>
        <input type="text" value={data.sectionTitle} onChange={e => set({ sectionTitle: e.target.value })} className={INPUT_CLASS} />
      </ToggleField>
      <div className="flex items-center mb-3">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Card button')}</p>
        <div className="ml-auto">
          <ShowToggle checked={data.showCta} onChange={v => set({ showCta: v })} tone="group" />
        </div>
      </div>
      <ToggleField label={t('Carousel controls')} shown={data.showCarousel} onShownChange={v => set({ showCarousel: v })}>
        <input
          type="text"
          value={data.slideCount}
          onChange={e => set({ slideCount: e.target.value })}
          className={INPUT_CLASS}
        />
        <p className="text-[10px] text-gray-400 mt-0.5">{t('Total slides — shown as "1 / n".')}</p>
      </ToggleField>
      <SectionDivider>{t('Cards')}</SectionDivider>
      {data.cards.map((card, i) => (
        <div key={i} className="pt-1 pb-3 border-b border-gray-100 last:border-0">
          <p className="text-[11px] font-semibold text-gray-500 mb-2">
            {t('Card')} {i + 1}
          </p>
          {/* Picking an artwork clears any legacy uploaded/baked image so the
              old render can't linger underneath the new selection. */}
          <DealArtField value={card.asset} onChange={id => updateCard(i, { ...card, asset: id, image: null })} />
          <TextField label={t('Title')} value={card.title} onChange={v => updateCard(i, { ...card, title: v })} />
          {data.showCta && (
            <TextField label={t('Button text')} value={card.ctaText} onChange={v => updateCard(i, { ...card, ctaText: v })} />
          )}
        </div>
      ))}
    </div>
  );
}


// ── 3. Deal tab nav ───────────────────────────────────────────────────────────

function DealTabNavPanel({ data, onUpdate }: { data: DealTabNavState; onUpdate: (d: DealTabNavState) => void }) {
  const t = useT();
  const set = (p: Partial<DealTabNavState>) => onUpdate({ ...data, ...p });
  const labels = data.tabs.split('\n').map(x => x.trim()).filter(Boolean);
  return (
    <div>
      <TextAreaField
        label={t('Tabs')}
        value={data.tabs}
        onChange={v => set({ tabs: v })}
        rows={5}
        hint={t('One tab per line.')}
      />
      <div className="mb-3">
        <FieldLabel>{t('Active tab')}</FieldLabel>
        <div className="flex flex-col gap-1">
          {labels.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => set({ activeIndex: i })}
              className={`h-8 rounded-md border text-xs font-medium px-3 text-left transition-colors ${
                data.activeIndex === i
                  ? 'bg-[#FD312E] border-[#FD312E] text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 4. Promotion banner ───────────────────────────────────────────────────────

/**
 * Shared by the 400-tall promotion banner and the 350-tall deal banner — the
 * module type owns the height now, so the old "Banner height" picker is gone
 * and `size` only feeds the crop aspect. The "Art right / Art left" layout
 * picker was retired too (2026-08-30): banners run right-art only, as the
 * board draws them. `DealBannerLayout` stays on the state for old drafts, but
 * restore normalises it back to 'Art right'.
 */
function DealPromoBannerPanel({
  data,
  size,
  onUpdate,
}: {
  data: DealPromoBannerState;
  size: DealBannerSize;
  onUpdate: (d: DealPromoBannerState) => void;
}) {
  const t = useT();
  const set = (p: Partial<DealPromoBannerState>) => onUpdate({ ...data, ...p });
  return (
    <div>
      {size === 'Large' ? (
        // The 400 promotion banner picks its art like the hero does — the four
        // Promotion Banner_* variants off the board, not an upload. Same row
        // structure as the hero picker: the first tile of each row IS the row
        // title, so only the variants after it get a caption.
        <div className="mb-4">
          <FieldLabel>{t('Key visual')}</FieldLabel>
          <div className="flex flex-col gap-3">
            {PROMO_KV_ROWS.map(row => (
              <div key={row.label} className="flex flex-col gap-1.5">
                <p className="text-[11px] text-gray-400">{t(row.label)}</p>
                <div className="grid grid-cols-2 gap-2">
                  {row.tiles.map((tl, i) => {
                    const a = getAsset(tl.id);
                    if (!a) return null;
                    const selected = data.kvAsset === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => set({ kvAsset: a.id })}
                        className="flex flex-col gap-1 text-left group/pkv"
                      >
                        <span
                          style={{ aspectRatio: '140 / 64' }}
                          className={`block w-full rounded overflow-hidden bg-[#111] transition-shadow ${
                            selected ? 'ring-2 ring-[#FD312E]' : 'ring-1 ring-transparent group-hover/pkv:ring-gray-300'
                          }`}
                        >
                          <img src={thumbUrl(a)} alt={a.label} loading="lazy" className="w-full h-full object-cover" draggable={false} />
                        </span>
                        {i >= row.captionFromIndex && (
                          <span
                            className={`text-[10px] leading-[12px] text-center transition-colors ${
                              selected ? 'text-[#FD312E] font-medium' : 'text-gray-500'
                            }`}
                          >
                            {t(a.label)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // The deal banner picks between the four Deal Banner_* types — the
        // same four campaign artworks the deal cards use, as tiles.
        <div className="mb-3">
          <FieldLabel>{t('Key visual')}</FieldLabel>
          <div className="grid grid-cols-4 gap-2">
            {DEAL_KV_TILES.map(tl => {
              const a = getAsset(tl.id);
              if (!a) return null;
              const selected = data.kvAsset === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => set({ kvAsset: a.id })}
                  className="flex flex-col gap-1 text-left group/dkv"
                >
                  <span
                    style={{ aspectRatio: '1 / 1' }}
                    className={`block w-full rounded overflow-hidden bg-[#111] transition-shadow ${
                      selected ? 'ring-2 ring-[#FD312E]' : 'ring-1 ring-transparent group-hover/dkv:ring-gray-300'
                    }`}
                  >
                    <img src={thumbUrl(a)} alt={a.label} loading="lazy" className="w-full h-full object-cover" draggable={false} />
                  </span>
                  <span
                    className={`text-[10px] leading-[12px] text-center transition-colors ${
                      selected ? 'text-[#FD312E] font-medium' : 'text-gray-500'
                    }`}
                  >
                    {t(a.label)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <TextAreaField label={t('Headline')} value={data.headline} onChange={v => set({ headline: v })} rows={2} />
      <ToggleField label={t('Sub copy')} shown={data.showSubCopy} onShownChange={v => set({ showSubCopy: v })}>
        <textarea value={data.subCopy} onChange={e => set({ subCopy: e.target.value })} rows={2} className={`${INPUT_CLASS} resize-none`} />
      </ToggleField>
      {/* Legal links are a promotion-banner thing — the 350 deal banner never
          draws them, so it doesn't offer them either. */}
      {size === 'Large' && (
        <ToggleField label={t('Legal links')} shown={data.showLinks} onShownChange={v => set({ showLinks: v })}>
          <input type="text" value={data.linkPrimary} onChange={e => set({ linkPrimary: e.target.value })} className={`${INPUT_CLASS} mb-1.5`} />
          <input type="text" value={data.linkSecondary} onChange={e => set({ linkSecondary: e.target.value })} className={INPUT_CLASS} />
        </ToggleField>
      )}
      <ToggleField label={t('Button')} shown={data.showCta} onShownChange={v => set({ showCta: v })}>
        <input type="text" value={data.ctaText} onChange={e => set({ ctaText: e.target.value })} className={INPUT_CLASS} />
      </ToggleField>

      {/* The old standalone Time Sale module lives on as this toggle — deal
          banner only, since the 400 promotion banner never counts down. */}
      {size === 'Standard' && (
        <ToggleField label={t('Time countdown')} shown={data.showCountdown} onShownChange={v => set({ showCountdown: v })}>
          <CountdownEditor data={data} onChange={p => set(p)} />
        </ToggleField>
      )}

      {/* The PD Slot variants' four product plates — the same crawl + cutout
          flow as the hero's PD Slot products. `-mx-5` cancels the panel's own
          padding, since the editor brings its own. */}
      {size === 'Large' && promoArtHasSlots(data.kvAsset) && (
        <div className="-mx-5 mt-2 pt-4 border-t border-gray-100">
          <ProductSlotsEditor
            count={PROMO_SLOT.count}
            slots={data.products.length === PROMO_SLOT.count ? data.products : emptyProductSlots(PROMO_SLOT.count)}
            onChange={next => set({ products: next })}
          />
        </div>
      )}
    </div>
  );
}

// ── 5. Product list ───────────────────────────────────────────────────────────

function DealProductListPanel({ data, onUpdate }: { data: DealProductListState; onUpdate: (d: DealProductListState) => void }) {
  const t = useT();
  const set = (p: Partial<DealProductListState>) => onUpdate({ ...data, ...p });
  // Drafts from before the curated sets carry no productSet — treat them as
  // the refrigerator row (that is what their products actually were).
  const activeSet: DealProductSetKey = data.productSet ?? 'refrigerator';

  return (
    <div>
      <ToggleField label={t('Section title')} shown={data.showSectionTitle} onShownChange={v => set({ showSectionTitle: v })}>
        <input type="text" value={data.sectionTitle} onChange={e => set({ sectionTitle: e.target.value })} className={INPUT_CLASS} />
      </ToggleField>
      <ToggleField label={t('Tabs')} shown={data.showTabs} onShownChange={v => set({ showTabs: v })}>
        <textarea value={data.tabs} onChange={e => set({ tabs: e.target.value })} rows={3} className={`${INPUT_CLASS} resize-none`} />
        <p className="text-[10px] text-gray-400 mt-0.5">{t('One tab per line — the first one renders as active.')}</p>
      </ToggleField>

      {/* Curated product rows off the Page Template board — picking one swaps
          the whole grid. Per-product editing is parked (see below), so the set
          and the count are the only knobs the grid needs. */}
      <div className="mb-3">
        <FieldLabel>{t('Product set')}</FieldLabel>
        <div className="flex gap-1">
          {(Object.keys(DEAL_PRODUCT_SETS) as DealProductSetKey[]).map(key => {
            const selected = activeSet === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set({ productSet: key, products: dealProductSetItems(t, key, data.products.length) })}
                className={`flex-1 h-8 rounded-md border text-xs font-medium transition-colors ${
                  selected ? 'bg-[#FD312E] border-[#FD312E] text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {t(DEAL_PRODUCT_SETS[key].label)}
              </button>
            );
          })}
        </div>
      </div>

      <CountSelector
        label={t('Number of products')}
        min={DEAL_PRODUCT_MIN}
        max={DEAL_PRODUCT_MAX}
        value={data.products.length}
        onChange={n => set({ products: resizeList(data.products, n, i => dealProductItemFor(t, activeSet, i)) })}
      />
    </div>
  );
}

/**
 * ⏸ PARKED — per-product editors (image / badge / name / SKU / rating /
 * prices / CTAs). The grid now swaps between the board's curated rows, so
 * none of this renders; it is kept because per-product editing is expected
 * to return. Re-mount it inside DealProductListPanel under a
 * `<SectionDivider>{t('Products')}</SectionDivider>` when it does.
 */
export function DealProductItemsEditor({ data, onUpdate }: { data: DealProductListState; onUpdate: (d: DealProductListState) => void }) {
  const t = useT();
  const set = (p: Partial<DealProductListState>) => onUpdate({ ...data, ...p });
  const updateProduct = (idx: number, p: DealProductItem) => {
    const products = [...data.products];
    products[idx] = p;
    set({ products });
  };

  return (
    <div>
      {data.products.map((p, i) => (
        <div key={i} className="pt-1 pb-3 border-b border-gray-100 last:border-0">
          <p className="text-[11px] font-semibold text-gray-500 mb-2">
            {t('Product')} {i + 1}
          </p>
          <ImageField label={t('Product image')} value={p.image} onChange={v => updateProduct(i, { ...p, image: v })} objectFit="contain" />
          <ToggleField label={t('Badge')} shown={p.showBadge} onShownChange={v => updateProduct(i, { ...p, showBadge: v })}>
            <input type="text" value={p.badge} onChange={e => updateProduct(i, { ...p, badge: e.target.value })} className={INPUT_CLASS} />
          </ToggleField>
          <TextAreaField label={t('Product name')} value={p.name} onChange={v => updateProduct(i, { ...p, name: v })} rows={2} hint={t('2 lines max on the card.')} />
          <TextField label={t('Model code')} value={p.sku} onChange={v => updateProduct(i, { ...p, sku: v })} />
          <ToggleField label={t('Rating')} shown={p.showRating} onShownChange={v => updateProduct(i, { ...p, showRating: v })}>
            <div className="flex gap-1.5">
              <input type="text" value={p.rating} onChange={e => updateProduct(i, { ...p, rating: e.target.value })} className={`${INPUT_CLASS} w-16 shrink-0 text-center`} />
              <input type="text" value={p.reviewCount} onChange={e => updateProduct(i, { ...p, reviewCount: e.target.value })} className={INPUT_CLASS} />
            </div>
          </ToggleField>
          <TextField label={t('Sale price')} value={p.salePrice} onChange={v => updateProduct(i, { ...p, salePrice: v })} />
          <ToggleField label={t('Discount %')} shown={p.showDiscountPercent} onShownChange={v => updateProduct(i, { ...p, showDiscountPercent: v })}>
            <input type="text" value={p.discountPercent} onChange={e => updateProduct(i, { ...p, discountPercent: e.target.value })} className={INPUT_CLASS} />
          </ToggleField>
          <ToggleField label={t('Original price')} shown={p.showOriginalPrice} onShownChange={v => updateProduct(i, { ...p, showOriginalPrice: v })}>
            <input type="text" value={p.originalPrice} onChange={e => updateProduct(i, { ...p, originalPrice: e.target.value })} className={INPUT_CLASS} />
          </ToggleField>
          <ToggleField label={t('Shipping note')} shown={p.showShippingNote} onShownChange={v => updateProduct(i, { ...p, showShippingNote: v })}>
            <input type="text" value={p.shippingNote} onChange={e => updateProduct(i, { ...p, shippingNote: e.target.value })} className={INPUT_CLASS} />
          </ToggleField>
          <TextField label={t('Secondary button')} value={p.secondaryCta} onChange={v => updateProduct(i, { ...p, secondaryCta: v })} />
          <TextField label={t('Primary button')} value={p.primaryCta} onChange={v => updateProduct(i, { ...p, primaryCta: v })} />
        </div>
      ))}
    </div>
  );
}

// ── 6. Category nav ───────────────────────────────────────────────────────────

function DealCategoryNavPanel({ data, onUpdate }: { data: DealCategoryNavState; onUpdate: (d: DealCategoryNavState) => void }) {
  const t = useT();
  const set = (p: Partial<DealCategoryNavState>) => onUpdate({ ...data, ...p });
  const updateItem = (idx: number, item: DealCategoryNavItem) => {
    const items = [...data.items];
    items[idx] = item;
    set({ items });
  };

  return (
    <div>
      <ToggleField label={t('Results bar')} shown={data.showResultsBar} onShownChange={v => set({ showResultsBar: v })}>
        <input type="text" value={data.resultsText} onChange={e => set({ resultsText: e.target.value })} className={`${INPUT_CLASS} mb-1.5`} />
        <input type="text" value={data.sortLabel} onChange={e => set({ sortLabel: e.target.value })} className={INPUT_CLASS} />
      </ToggleField>
      <ToggleField label={t('Empty state')} shown={data.showEmptyText} onShownChange={v => set({ showEmptyText: v })}>
        <input type="text" value={data.emptyText} onChange={e => set({ emptyText: e.target.value })} className={INPUT_CLASS} />
      </ToggleField>

      {/* The category row is fixed to the shipped seven — no count control,
          and the icons are site chrome, so each row is just its label. */}
      <SectionDivider>{t('Categories')}</SectionDivider>
      {data.items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-gray-400 w-4 shrink-0 text-right">{i + 1}</span>
          <input
            type="text"
            value={item.name}
            onChange={e => updateItem(i, { ...item, name: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
      ))}
    </div>
  );
}


// ── 0. Site header ────────────────────────────────────────────────────────────

function DealSiteHeaderPanel({ data, onUpdate }: { data: DealSiteHeaderState; onUpdate: (d: DealSiteHeaderState) => void }) {
  const t = useT();
  const set = (p: Partial<DealSiteHeaderState>) => onUpdate({ ...data, ...p });
  return (
    <div>
      <p className="text-[11px] text-gray-400 leading-snug mb-3">
        {t('The LG logo and the account / cart icons are fixed site chrome.')}
      </p>
      <TextAreaField
        label={t('Global nav')}
        value={data.navItems}
        onChange={v => set({ navItems: v })}
        rows={8}
        hint={t('One nav item per line.')}
      />
      <TextField label={t('Search placeholder')} value={data.searchLabel} onChange={v => set({ searchLabel: v })} />
      <ToggleField label={t('Breadcrumb')} shown={data.showBreadcrumb} onShownChange={v => set({ showBreadcrumb: v })}>
        <textarea value={data.breadcrumb} onChange={e => set({ breadcrumb: e.target.value })} rows={3} className={`${INPUT_CLASS} resize-none`} />
        <p className="text-[10px] text-gray-400 mt-0.5">{t('One crumb per line.')}</p>
      </ToggleField>
    </div>
  );
}

// ── 9. Site footer ────────────────────────────────────────────────────────────

function DealSiteFooterPanel({ data, onUpdate }: { data: DealSiteFooterState; onUpdate: (d: DealSiteFooterState) => void }) {
  const t = useT();
  const set = (p: Partial<DealSiteFooterState>) => onUpdate({ ...data, ...p });
  const updateColumn = (idx: number, col: DealFooterColumn) => {
    const columns = [...data.columns];
    columns[idx] = col;
    set({ columns });
  };

  return (
    <div>
      <ToggleField label={t('Disclaimers')} shown={data.showDisclaimers} onShownChange={v => set({ showDisclaimers: v })}>
        <textarea value={data.disclaimers} onChange={e => set({ disclaimers: e.target.value })} rows={5} className={`${INPUT_CLASS} resize-none`} />
        <p className="text-[10px] text-gray-400 mt-0.5">{t('One paragraph per line — the footer shows the first two.')}</p>
      </ToggleField>
      <TextField label={t('"More" label')} value={data.moreLabel} onChange={v => set({ moreLabel: v })} />
      <CountSelector
        label={t('Number of link columns')}
        min={DEAL_FOOTER_COLUMN_MIN}
        max={DEAL_FOOTER_COLUMN_MAX}
        value={data.columns.length}
        onChange={n => set({ columns: resizeList(data.columns, n, i => dealFooterColumnDefaults(t)[i] ?? { title: t('New column'), links: '' }) })}
      />
      <TextField label={t('Locale')} value={data.localeLabel} onChange={v => set({ localeLabel: v })} />
      <div className="flex items-center mb-3">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Social links')}</p>
        <div className="ml-auto">
          <ShowToggle checked={data.showSocial} onChange={v => set({ showSocial: v })} tone="group" />
        </div>
      </div>
      <div className="flex items-center mb-3">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t('Footer badges')}</p>
        <div className="ml-auto">
          <ShowToggle checked={data.showBadges} onChange={v => set({ showBadges: v })} tone="group" />
        </div>
      </div>
      <SectionDivider>{t('Legal bar')}</SectionDivider>
      <TextAreaField
        label={t('Legal links')}
        value={data.legalLinks}
        onChange={v => set({ legalLinks: v })}
        rows={6}
        hint={t('One link per line — rendered pipe-separated.')}
      />
      <TextAreaField label={t('Copyright')} value={data.copyright} onChange={v => set({ copyright: v })} rows={2} />
      <TextAreaField label={t('Official site notice')} value={data.officialNotice} onChange={v => set({ officialNotice: v })} rows={2} />
      <SectionDivider>{t('Link columns')}</SectionDivider>
      {data.columns.map((col, i) => (
        <div key={i} className="pt-1 pb-3 border-b border-gray-100 last:border-0">
          <p className="text-[11px] font-semibold text-gray-500 mb-2">
            {t('Column')} {i + 1}
          </p>
          <TextField label={t('Title')} value={col.title} onChange={v => updateColumn(i, { ...col, title: v })} />
          <TextAreaField
            label={t('Links')}
            value={col.links}
            onChange={v => updateColumn(i, { ...col, links: v })}
            rows={5}
            hint={t('One link per line.')}
          />
        </div>
      ))}
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export function DealModuleEditPanel({
  editState,
  onUpdate,
}: {
  editState: DealEditState;
  onUpdate: (s: DealEditState) => void;
}) {
  switch (editState.type) {
    case 'deal-site-header':
      return <DealSiteHeaderPanel data={editState.data} onUpdate={d => onUpdate({ type: 'deal-site-header', data: d })} />;
    case 'deal-site-footer':
      return <DealSiteFooterPanel data={editState.data} onUpdate={d => onUpdate({ type: 'deal-site-footer', data: d })} />;
    case 'deal-hero':
      return <DealHeroPanel data={editState.data} onUpdate={d => onUpdate({ type: 'deal-hero', data: d })} />;
    case 'deal-cards':
      return <DealCardsPanel data={editState.data} onUpdate={d => onUpdate({ type: 'deal-cards', data: d })} />;
    case 'deal-tab-nav':
      return <DealTabNavPanel data={editState.data} onUpdate={d => onUpdate({ type: 'deal-tab-nav', data: d })} />;
    case 'deal-promo-banner':
      return <DealPromoBannerPanel data={editState.data} size="Large" onUpdate={d => onUpdate({ type: 'deal-promo-banner', data: d })} />;
    case 'deal-banner':
      return <DealPromoBannerPanel data={editState.data} size="Standard" onUpdate={d => onUpdate({ type: 'deal-banner', data: d })} />;
    case 'deal-product-list':
      return <DealProductListPanel data={editState.data} onUpdate={d => onUpdate({ type: 'deal-product-list', data: d })} />;
    case 'deal-category-nav':
      return <DealCategoryNavPanel data={editState.data} onUpdate={d => onUpdate({ type: 'deal-category-nav', data: d })} />;
  }
}
