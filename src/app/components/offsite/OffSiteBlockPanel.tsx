/**
 * Off-site Banner — the selected KV's edit panel (step 2).
 *
 * Everything a KV owns is edited here — artwork included. The layout editor
 * opens on top of the page, so a picker launched from inside it would land
 * underneath; clicking a banner therefore only moves, resizes and restacks.
 *
 * Two groups. The top one is the campaign's — background color, logos, copy
 * color — and writing to it fans out to every KV, because a set of banners has
 * to agree on those. Everything below it belongs to this KV alone:
 *   Products → Podiums → Objects → Copy → CTA → Disclaimer
 *   → Price tags
 *
 * The backdrop image is in the shared group too: it is set on step 1, but a
 * campaign often only settles on its scene once there is a KV to judge it
 * against.
 *
 * Podiums and objects are KV-level scene props, not per-product attachments:
 * one platform often carries two products, and plenty of scenes want none.
 * Both start empty and are added from the library.
 *
 * Podiums and objects are pick-from-library first, upload second — the design
 * team ships fixed sets of both (see offsiteLibrary.ts).
 */

import React, { useRef, useState } from 'react';
import { ChevronDown, Download, Eraser, FlipHorizontal, Images, Library, Link as LinkIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { useT } from '../../i18n/LanguageContext';
import {
  COPY_COLORS, CTA_VARIANTS, DISCOUNT_BADGES, LG_LOGOS, LG_RED, TEMPLATE_VERSIONS,
  makeDiscountRow,
  DEFAULT_LIGHT,
  MAX_ITEMS_PER_BLOCK, MAX_OBJECTS_PER_BLOCK, MAX_PODIUMS_PER_BLOCK, MAX_PRICE_TAGS,
  SHADOW_OPACITY_MAX, SHADOW_OPACITY_MIN, SHADOW_OPACITY_STEP,
  visibleItems,
  type DiscountRow, type DiscountSide,
  type OffSiteBlock, type OffSiteCampaign, type OffSiteItem, type OffSiteProp,
} from './offsiteTypes';
import {
  BACKDROP_PSD_GUIDE, BACKGROUND_LIBRARY, OBJECT_LIBRARY, PODIUM_LIBRARY, type LibraryAsset,
} from './offsiteLibrary';
import { ColorPickerField } from './ColorPickerField';
import { GlobalLightDial } from './GlobalLightDial';
import { acceptCopy, type CopyField } from './offsiteCopyFit';
import {
  FieldLabel, ImageUploadField, PanelSection, ShowToggle, TextAreaField, TextInputField,
} from '../brandshop/bigPromoCommon';

interface Props {
  block: OffSiteBlock;
  /** 1-based label for this banner, counting only the ones that will export. */
  ordinal: number;
  onChangeBlock: (patch: Partial<OffSiteBlock>) => void;
  onChangeCampaign: (patch: Partial<OffSiteCampaign>) => void;
  onChangeItem: (slot: number, patch: Partial<OffSiteItem>) => void;
  /** Campaign fields that belong to the session, not this KV — applied to
   *  every block at once. */
  onChangeShared: (patch: Partial<OffSiteCampaign>) => void;
  /** Library pick applies straight away; an upload is framed first. Both are
   *  session-wide, like the rest of the shared group. */
  onPickBackground: (src: string) => void;
  onUploadBackground: (dataUrl: string) => void;
  /** Reopen the framing editor on the scene already chosen. */
  onEditBackgroundCrop: () => void;
  /** The canvas color for the size this step designs at. Each size carries its
   *  own — see OffSiteCampaign.backgroundColorBySize — so the panel is handed
   *  the resolved one rather than reading the flat field. */
  bgColor: string;
  onChangeBgColor: (hex: string) => void;

  onAddProps: (kind: 'podiums' | 'objects', srcs: string[]) => void;
  /** Fill the block's free product slots from uploaded files. */
  onAddProducts: (dataUrls: string[]) => void;
  /** Crawl an LG.com page into this KV's next free slot. */
  onImportProduct: (url: string) => void;
  /** An import is in flight, so both routes are held. */
  importingProduct: boolean;
  onRemoveProduct: (slot: number) => void;
  onRemoveProp: (kind: 'podiums' | 'objects', index: number) => void;
  onFlipProp: (kind: 'podiums' | 'objects', index: number, flipX: boolean) => void;

  /** Swap the cutout for another image off the same crawled page. */
  onPickImage: (slot: number) => void;
  /** True when that slot has crawled images cached to pick from. */
  hasImages: (slot: number) => boolean;
  /** Re-run background removal on the current cutout. */
  onRemoveBg: (slot: number) => void;
  /** Slots currently running background removal. */
  busySlots: Set<number>;

  /** Which price tag the panel has focused. Purely a panel highlight. */
  selectedPriceIndex: number | null;
  onSelectPrice: (index: number | null) => void;
}

export function OffSiteBlockPanel({
  block, ordinal, onChangeBlock, onChangeCampaign, onChangeItem, onChangeShared,
  onPickBackground, onUploadBackground, onEditBackgroundCrop, bgColor, onChangeBgColor,
  onAddProps, onAddProducts, onImportProduct, importingProduct, onRemoveProduct,
  onRemoveProp, onFlipProp,
  onPickImage, hasImages, onRemoveBg, busySlots,
  selectedPriceIndex, onSelectPrice,
}: Props) {
  const t = useT();
  const { campaign } = block;
  const shown = visibleItems(block);
  // Both fall back for drafts written before the discount version existed.
  const version = campaign.templateVersion ?? 'subCopy';
  const discount = campaign.discount ?? makeDiscountRow(t);
  // Drafts written before the lamp existed carry no light of their own.
  const light = campaign.light ?? DEFAULT_LIGHT;
  /** Fields whose last keystroke was refused, so the reason can be shown. */
  const [full, setFull] = useState<Partial<Record<CopyField, boolean>>>({});
  const [sharedOpen, setSharedOpen] = useState(true);

  /** Copy is bounded at the keyboard: an edit that would overflow the banner is
   *  simply not applied, rather than being clipped with an ellipsis later. */
  function setCopy(field: CopyField, prev: string, next: string, apply: (v: string) => void) {
    if (!acceptCopy(field, next, prev)) {
      setFull((f) => ({ ...f, [field]: true }));
      return;
    }
    setFull((f) => (f[field] ? { ...f, [field]: false } : f));
    apply(next);
  }

  function patchTag(index: number, patch: Partial<OffSiteCampaign['priceTags'][number]>) {
    onChangeCampaign({
      priceTags: campaign.priceTags.map((tg, i) => (i === index ? { ...tg, ...patch } : tg)),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Shared across every KV ─────────────────────────────── */}
      {/* Foldable: it is nine sections deep and, once a campaign has settled its
          colours, it is scrolled past on every visit to reach the banner's own
          controls. Open by default — these are the decisions taken first. */}
      <div className="flex flex-col gap-5 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <button
          type="button"
          onClick={() => setSharedOpen((v) => !v)}
          className="flex w-full items-start gap-2 text-left"
          aria-expanded={sharedOpen}
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
              {t('Shared across all banners')}
            </p>
            {sharedOpen && (
              <p className="mt-0.5 text-[11px] text-gray-400">
                {t('Changing any of these updates every banner in this session.')}
              </p>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`mt-0.5 shrink-0 text-gray-400 transition-transform ${sharedOpen ? '' : '-rotate-90'}`}
          />
        </button>
        {sharedOpen && (
        <>

        <PanelSection title={t('Version')}>
          <div className="flex gap-1.5">
            {TEMPLATE_VERSIONS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onChangeShared({ templateVersion: v.id })}
                className="flex-1 rounded-md border-2 py-1.5 text-[11px] transition-colors"
                style={{
                  borderColor: version === v.id ? '#FD312E' : '#e5e7eb',
                  color: version === v.id ? '#FD312E' : '#4b5563',
                }}
              >
                {t(v.label)}
              </button>
            ))}
          </div>
        </PanelSection>

        <PanelSection title={t('Background image')}>
          <LibraryOrUpload
            value={campaign.backgroundOriginal}
            options={BACKGROUND_LIBRARY.map((a) => ({ id: a.id, label: a.label, thumb: a.thumb ?? a.src }))}
            onPick={(id) => {
              const asset = BACKGROUND_LIBRARY.find((a) => a.id === id);
              if (asset) onPickBackground(asset.src);
            }}
            onUpload={onUploadBackground}
            onEditPreview={onEditBackgroundCrop}
            editHint={t('Edit crop')}
          />
          {/* Served straight out of public/ — no fetch, no blob, just a link
              the browser downloads. */}
          <a
            href={BACKDROP_PSD_GUIDE}
            download
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-500 underline underline-offset-2 hover:text-[#FD312E] transition-colors"
          >
            <Download size={11} />
            {t('Download PSD guide')}
          </a>
        </PanelSection>

        <PanelSection title={t('Background color')}>
          <ColorPickerField value={bgColor} onChange={onChangeBgColor} />
        </PanelSection>

        <PanelSection
          title={t('Logos')}
          showToggle={{ checked: campaign.showLogos, onChange: (showLogos) => onChangeShared({ showLogos }) }}
        >
          {/* In the order they sit on the banner: campaign lockup, then the
              LG mark. */}
          {campaign.showLogos && (
            <>
              <div className="mb-3">
                <ImageUploadField
                  label={t('Campaign logo')}
                  hint={t('Sits left of the LG logo. Rendered at a fixed height.')}
                  value={campaign.campaignLogoUrl}
                  onChange={(campaignLogoUrl) => onChangeShared({ campaignLogoUrl })}
                />
              </div>
              <FieldLabel>{t('LG logo')}</FieldLabel>
              <div className="flex gap-1.5">
                {LG_LOGOS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeShared({ lgLogoVariant: opt.id })}
                    className="flex-1 rounded-md border-2 py-1.5 text-[11px] transition-colors"
                    style={{
                      borderColor: campaign.lgLogoVariant === opt.id ? '#FD312E' : '#e5e7eb',
                      color: campaign.lgLogoVariant === opt.id ? '#FD312E' : '#4b5563',
                    }}
                  >
                    {t(opt.label)}
                  </button>
                ))}
              </div>
            </>
          )}
        </PanelSection>

        {/* Head copy, and the sub copy under it on the sub copy version. Two
            options, like the disclaimer: running copy has to hold up wherever
            the scene fades in behind it. */}
        <PanelSection title={version === 'discount' ? t('Head copy color') : t('Copy color')}>
          <InkChoice
            value={campaign.copyColor}
            onChange={(copyColor) => onChangeShared({ copyColor })}
          />
        </PanelSection>

        <PanelSection title={t('Disclaimer color')}>
          <InkChoice
            value={campaign.disclaimerColor ?? campaign.copyColor}
            onChange={(disclaimerColor) => onChangeShared({ disclaimerColor })}
          />
        </PanelSection>

        {/* The one free colour on the banner: the discount figures are display
            type on a flat canvas the user also picks, so they can carry the
            campaign's own colour. */}
        {version === 'discount' && (
          <PanelSection title={t('Discount color')}>
            <ColorPickerField
              value={campaign.discountColor ?? campaign.copyColor}
              onChange={(discountColor) => onChangeShared({ discountColor })}
            />
          </PanelSection>
        )}

        <PanelSection title={t('Price tag color')}>
          <ColorPickerField
            value={campaign.priceColor ?? LG_RED}
            onChange={(priceColor) => onChangeShared({ priceColor })}
          />
        </PanelSection>

        {/* The discount version draws no button, so its color has nothing to
            act on — the whole control goes away rather than sitting inert. */}
        {version !== 'discount' && (
        <PanelSection title={t('CTA color')}>
          <div className="flex gap-2">
            {CTA_VARIANTS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeShared({ ctaVariant: opt.id })}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border-2 py-1.5 text-[11px] transition-colors"
                style={{
                  borderColor: campaign.ctaVariant === opt.id ? '#FD312E' : '#e5e7eb',
                  color: campaign.ctaVariant === opt.id ? '#FD312E' : '#4b5563',
                }}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/15"
                  style={{ background: opt.bg }}
                />
                {t(opt.label)}
              </button>
            ))}
          </div>
        </PanelSection>
        )}

        <PanelSection title={t('Light direction')}>
          <p className="mb-2.5 text-xs text-gray-400">
            {t('One light for every banner in the session. Every product casts its shadow from it.')}
          </p>
          <GlobalLightDial
            light={light}
            onChange={(next) => onChangeShared({ light: next })}
          />
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <FieldLabel>{t('Shadow opacity')}</FieldLabel>
              <span className="-mt-1 text-[11px] text-gray-400 tabular-nums">{light.opacity}%</span>
            </div>
            {/* `step` is the snap: the slider can only land on tens. */}
            <input
              type="range"
              min={SHADOW_OPACITY_MIN}
              max={SHADOW_OPACITY_MAX}
              step={SHADOW_OPACITY_STEP}
              value={light.opacity}
              onChange={(e) => onChangeShared({ light: { ...light, opacity: Number(e.target.value) } })}
              className="w-full accent-[#FD312E]"
            />
          </div>
        </PanelSection>
        </>
        )}
      </div>

      {/* ── This banner only ───────────────────────────────────── */}
      <div className="-mb-2">
        <p className="font-lgei font-bold text-[15px] text-gray-900">
          {t('Banner')} {ordinal}
          {block.title ? ` — ${block.title}` : ''}
        </p>
        <p className="text-xs text-gray-400">{t('Everything below applies to this banner only.')}</p>
      </div>

      {/* ── Products ───────────────────────────────────────────── */}
      {shown.length === 0 ? (
        <PanelSection title={t('Products')}>
          <p className="mb-2 text-sm text-gray-400">
            {t('No products in this banner yet — import one from LG.com, or upload a cutout.')}
          </p>
          <AddProducts
            free={MAX_ITEMS_PER_BLOCK}
            onAdd={onAddProducts}
            onImport={onImportProduct}
            busy={importingProduct}
          />
        </PanelSection>
      ) : (
        // Boxed from the heading down, rather than through PanelSection: with
        // several products in a row, a title sitting outside the frame reads as
        // belonging to the gap between two products rather than to either.
        shown.map(({ item, slot }, ordinal) => (
          <div key={item.id} className="rounded-lg border border-gray-200 p-2.5">
            <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                {t('Product')} {ordinal + 1}
              </h4>
              {/* A KV without a product is not a banner, so the last one stays. */}
              {shown.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveProduct(slot)}
                  className="shrink-0 text-gray-300 transition-colors hover:text-[#FD312E]"
                  aria-label={t('Remove')}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {item.name && (
                <p className="truncate text-[11px] text-gray-400">{item.name}</p>
              )}
              <ProductImageControls
                item={item}
                busy={busySlots.has(slot)}
                canPick={hasImages(slot)}
                onPick={() => onPickImage(slot)}
                onRemoveBg={() => onRemoveBg(slot)}
              />
              <ShadowControls
                item={item}
                onChange={(patch) => onChangeItem(slot, patch)}
              />
            </div>
          </div>
        ))
      )}
      {shown.length > 0 && shown.length < MAX_ITEMS_PER_BLOCK && (
        <AddProducts
          free={MAX_ITEMS_PER_BLOCK - shown.length}
          onAdd={onAddProducts}
          onImport={onImportProduct}
          busy={importingProduct}
        />
      )}

      {/* ── Podiums ────────────────────────────────────────────── */}
      <PropSection
        title={t('Podiums')}
        hint={t('Platforms for the scene. Position them in the layout editor.')}
        itemLabel={t('Podium')}
        props={block.podiums}
        max={MAX_PODIUMS_PER_BLOCK}
        library={PODIUM_LIBRARY}
        onAdd={(srcs) => onAddProps('podiums', srcs)}
        onRemove={(i) => onRemoveProp('podiums', i)}
        onFlip={(i, v) => onFlipProp('podiums', i, v)}
      />

      {/* ── Objects ────────────────────────────────────────────── */}
      <PropSection
        title={t('Objects')}
        hint={t('Decorative props for the scene. Position them in the layout editor.')}
        itemLabel={t('Object')}
        props={block.objects}
        max={MAX_OBJECTS_PER_BLOCK}
        library={OBJECT_LIBRARY}
        onAdd={(srcs) => onAddProps('objects', srcs)}
        onRemove={(i) => onRemoveProp('objects', i)}
        onFlip={(i, v) => onFlipProp('objects', i, v)}
      />

      {/* ── Copy ───────────────────────────────────────────────── */}
      <PanelSection title={t('Copy')}>
        <div className="flex flex-col gap-3">
          <div>
            <FieldLabel>{t('Head copy')}</FieldLabel>
            <TextAreaField
              value={campaign.headCopy}
              onChange={(v) =>
                setCopy('headCopy', campaign.headCopy, v, (headCopy) => onChangeCampaign({ headCopy }))
              }
              rows={3}
            />
            <FullNote show={full.headCopy} />
          </div>
          {version === 'discount' ? (
            <DiscountFields
              row={discount}
              onChange={(patch) => onChangeCampaign({ discount: { ...discount, ...patch } })}
            />
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel>{t('Sub copy')}</FieldLabel>
                <ShowToggle
                  checked={campaign.showSubCopy}
                  onChange={(v) => onChangeCampaign({ showSubCopy: v })}
                />
              </div>
              <TextAreaField
                value={campaign.subCopy}
                onChange={(v) =>
                  setCopy('subCopy', campaign.subCopy, v, (subCopy) => onChangeCampaign({ subCopy }))
                }
                rows={2}
              />
              <FullNote show={full.subCopy} />
            </div>
          )}
        </div>
      </PanelSection>

      {/* ── CTA — sub copy version only ────────────────────────── */}
      {version !== 'discount' && (
        <PanelSection
          title={t('CTA')}
          showToggle={{ checked: campaign.showCta, onChange: (v) => onChangeCampaign({ showCta: v }) }}
        >
          <TextInputField
            value={campaign.ctaLabel}
            onChange={(v) =>
              setCopy('ctaLabel', campaign.ctaLabel, v, (ctaLabel) => onChangeCampaign({ ctaLabel }))
            }
            placeholder={t('Shop now')}
          />
          <FullNote show={full.ctaLabel} />
        </PanelSection>
      )}

      {/* ── Disclaimer ─────────────────────────────────────────── */}
      <PanelSection
        title={t('Disclaimer')}
        showToggle={{
          checked: campaign.showDisclaimer,
          onChange: (v) => onChangeCampaign({ showDisclaimer: v }),
        }}
      >
        <TextAreaField
          value={campaign.disclaimer}
          onChange={(v) =>
            setCopy('disclaimer', campaign.disclaimer, v, (disclaimer) => onChangeCampaign({ disclaimer }))
          }
          rows={2}
          placeholder="*T&Cs apply"
        />
        <FullNote show={full.disclaimer} />
      </PanelSection>

      {/* ── Price tags ─────────────────────────────────────────── */}
      <PanelSection title={t('Price tags')}>
        <p className="-mt-1 mb-3 text-[11px] text-gray-400">
          {t('Enter the prices here, then position the tag in the layout editor.')}
        </p>
        <div className="flex flex-col gap-2">
          {campaign.priceTags.slice(0, MAX_PRICE_TAGS).map((tag, i) => {
            const selected = selectedPriceIndex === i;
            return (
              <div
                key={i}
                className="rounded-lg border p-2.5 transition-colors"
                style={{ borderColor: selected ? '#3B82F6' : '#e5e7eb' }}
                onPointerDown={() => tag.enabled && onSelectPrice(i)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
                    {t('Tag')} {i + 1}
                  </span>
                  <ShowToggle
                    checked={tag.enabled}
                    onChange={(v) => {
                      patchTag(i, { enabled: v });
                      onSelectPrice(v ? i : null);
                    }}
                  />
                </div>
                {tag.enabled && (
                  <div className="mt-3 flex flex-col gap-2">
                    {/* Labelled because the card renders these in this order but
                        styles them differently — struck-through above, red below
                        — and two bare price fields are interchangeable. */}
                    <div>
                      <FieldLabel>{t('Original price')}</FieldLabel>
                      <TextInputField
                        value={tag.originalPrice}
                        onChange={(v) => patchTag(i, { originalPrice: v })}
                        placeholder="$729.00"
                      />
                    </div>
                    <div>
                      <FieldLabel>{t('Sale price')}</FieldLabel>
                      <TextInputField
                        value={tag.salePrice}
                        onChange={(v) => patchTag(i, { salePrice: v })}
                        placeholder="$624.68"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PanelSection>
    </div>
  );
}

/**
 * Black or white, nothing between.
 *
 * Every run of reading copy on the banner uses this. The scene fades in behind
 * the copy column rather than stopping at a hard edge, so any mid tone is
 * legible over one end of that ramp and not the other. Only the discount
 * figures — display type, and large enough to carry it — get a free colour.
 */
function InkChoice({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const t = useT();
  return (
    <div className="flex gap-2">
      {COPY_COLORS.map((hex) => {
        const on = value.toUpperCase() === hex;
        return (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border-2 py-1.5 text-[11px] transition-colors"
            style={{ borderColor: on ? '#FD312E' : '#e5e7eb', color: on ? '#FD312E' : '#4b5563' }}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/15"
              style={{ background: hex }}
            />
            {hex === '#FFFFFF' ? t('White') : t('Black')}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Discount row                                */
/* ─────────────────────────────────────────── */

/** One figure of the discount row. The mark is a radio, not a set of toggles:
 *  Figma's `pick one` holds three alternatives and shows at most one. */
function DiscountSideFields({ side, onChange }: {
  side: DiscountSide;
  onChange: (patch: Partial<DiscountSide>) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <div>
        <FieldLabel>{t('Mark')}</FieldLabel>
        <div className="flex gap-1.5">
          {DISCOUNT_BADGES.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onChange({ badge: b.id })}
              className="flex-1 rounded-md border-2 py-1.5 text-[11px] transition-colors"
              style={{
                borderColor: side.badge === b.id ? '#FD312E' : '#e5e7eb',
                color: side.badge === b.id ? '#FD312E' : '#4b5563',
              }}
            >
              {b.id === 'text' || b.id === 'none' ? t(b.label) : b.label}
            </button>
          ))}
        </div>
      </div>
      {side.badge === 'text' && (
        <div>
          <FieldLabel>{t('Mark text')}</FieldLabel>
          <TextInputField
            value={side.badgeText}
            onChange={(v) => onChange({ badgeText: v })}
            placeholder="UP TO"
          />
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex-1">
          <FieldLabel>{t('Number')}</FieldLabel>
          <TextInputField value={side.value} onChange={(v) => onChange({ value: v })} placeholder="55" />
        </div>
        <div className="w-20 shrink-0">
          <FieldLabel>{t('Unit')}</FieldLabel>
          <TextInputField value={side.unit} onChange={(v) => onChange({ unit: v })} placeholder="%" />
        </div>
      </div>
    </div>
  );
}

/** The whole row: one figure, optionally a second joined by a plus. */
function DiscountFields({ row, onChange }: {
  row: DiscountRow;
  onChange: (patch: Partial<DiscountRow>) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-2.5">
      <div className="border-b border-gray-200 pb-2">
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
          {t('Discount')}
        </p>
      </div>
      {/* The left figure is the row — there is no discount without it, so it
          carries no toggle. The right one is what the plus is for. */}
      <div>
        <div className="mb-2 border-b border-gray-200 pb-1.5">
          <FieldLabel>{t('Left')}</FieldLabel>
        </div>
        <DiscountSideFields
          side={row.left}
          onChange={(patch) => onChange({ left: { ...row.left, ...patch } })}
        />
      </div>
      <div>
        <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
          <FieldLabel>{t('Right')}</FieldLabel>
          <ShowToggle checked={row.showRight} onChange={(v) => onChange({ showRight: v })} />
        </div>
        {row.showRight && (
          <div className="mt-2">
            <DiscountSideFields
              side={row.right}
              onChange={(patch) => onChange({ right: { ...row.right, ...patch } })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/**
 * Add a product to a KV mid-edit — one that was not known at step 1.
 *
 * Both routes step 1 offers are here, because either can be the missing one:
 * an LG.com page to crawl, or a cutout for a product that has no page.
 * Importing takes a URL, so it opens a field rather than firing on click.
 */
function AddProducts({ free, onAdd, onImport, busy }: {
  free: number;
  onAdd: (dataUrls: string[]) => void;
  onImport: (url: string) => void;
  busy: boolean;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);

  function submit() {
    const trimmed = url.trim();
    if (!trimmed) return;
    onImport(trimmed);
    setUrl('');
    setImporting(false);
  }

  const action = 'flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-[12px] text-gray-500 hover:border-[#FD312E] hover:text-[#FD312E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-gray-400">
        {t('Add product ({free} left)').replace('{free}', String(free))}
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onAdd(await Promise.all(files.map(readAsDataUrl)));
        }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setImporting((v) => !v)}
          disabled={busy}
          className={action}
          style={importing ? { borderColor: '#FD312E', color: '#FD312E' } : undefined}
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <LinkIcon size={13} />}
          {t('Import')}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className={action}
        >
          <Upload size={13} />
          {t('Upload')}
        </button>
      </div>
      {importing && (
        <div className="flex gap-1.5">
          <input
            type="url"
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') setImporting(false);
            }}
            placeholder={t('LG.com product page URL')}
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-[11px] focus:border-[#FD312E] focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!url.trim()}
            className="shrink-0 rounded-md bg-[#FD312E] px-3 text-[11px] text-white disabled:opacity-40 transition-opacity"
          >
            {t('Import')}
          </button>
        </div>
      )}
    </div>
  );
}

function FullNote({ show }: { show?: boolean }) {
  const t = useT();
  if (!show) return null;
  return (
    <p className="mt-1 text-[11px] text-[#FD312E]">
      {t('This is as long as the copy can be at these sizes.')}
    </p>
  );
}

/** A KV's list of one kind of scene prop, plus the two ways to add another.
 *  Props are appended rather than swapped, so there is no current value to
 *  show — only the list, a visibility toggle per row, and a way to grow it. */
function PropSection({
  title, hint, itemLabel, props, max, library, onAdd, onRemove, onFlip,
}: {
  title: string;
  hint: string;
  itemLabel: string;
  props: OffSiteProp[];
  max: number;
  library: LibraryAsset[];
  onAdd: (srcs: string[]) => void;
  onRemove: (index: number) => void;
  onFlip: (index: number, flipX: boolean) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) onAdd(await Promise.all(files.map(readAsDataUrl)));
  }

  return (
    <PanelSection title={title}>
      <p className="-mt-1 mb-3 text-[11px] text-gray-400">{hint}</p>
      {props.length > 0 && (
        <div className="mb-2 flex flex-col gap-1.5">
          {props.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2">
              <div
                className="w-10 h-10 shrink-0 rounded bg-gray-50 bg-center bg-contain bg-no-repeat"
                style={{ backgroundImage: `url(${p.src})` }}
              />
              <span className="shrink-0 text-[11px] text-gray-500">
                {itemLabel} {i + 1}
              </span>
              {/* Labelled and outlined, in the same pill language as the panel's
                  other choices — a bare icon beside the bin read as a second
                  destructive action. It carries its own state because the
                  thumbnail is far too small to tell a mirrored shape from its
                  original. */}
              <button
                type="button"
                onClick={() => onFlip(i, !p.flipX)}
                className="flex shrink-0 items-center gap-1 rounded-md border-2 px-2 py-1 text-[11px] transition-colors"
                style={{
                  borderColor: p.flipX ? '#FD312E' : '#e5e7eb',
                  color: p.flipX ? '#FD312E' : '#4b5563',
                }}
                aria-pressed={!!p.flipX}
              >
                <FlipHorizontal size={13} />
                {t('Flip')}
              </button>
              <div className="flex-1" />
              {/* Set apart by space alone: deleting a prop is not a neighbour of
                  mirroring it, and a rule between them read as an edge of the
                  pill rather than as a separator. */}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:text-[#FD312E]"
                aria-label={t('Remove')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {props.length < max ? (
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              disabled={library.length === 0}
              className="flex-1 flex items-center justify-center gap-1 rounded-md border py-1.5 text-[11px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: open ? '#FD312E' : '#e5e7eb', color: open ? '#FD312E' : '#4b5563' }}
            >
              <Library size={11} />
              {t('Pick from library')}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1 rounded-md border border-gray-200 py-1.5 text-[11px] text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
            >
              <Upload size={11} />
              {t('Upload')}
            </button>
          </div>
          {open && (
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-200 p-2">
              {library.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  title={a.label}
                  onClick={() => { onAdd([a.src]); setOpen(false); }}
                  className="aspect-square rounded-md border border-gray-200 bg-gray-50 bg-center bg-contain bg-no-repeat hover:border-[#FD312E] transition-colors"
                  style={{ backgroundImage: `url(${a.src})` }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-gray-400">
          {t('All {max} slots used.').replace('{max}', String(max))}
        </p>
      )}
    </PanelSection>
  );
}

/* ─────────────────────────────────────────── */
/* Library-or-upload field                     */
/* ─────────────────────────────────────────── */

interface PickOption {
  id: string;
  label: string;
  thumb: string;
}

/** Current asset plus two ways to change it. The library grid expands inline
 *  rather than in a dialog, so it can be used from inside a modal too. */
function LibraryOrUpload({
  value, options, onPick, onUpload, uploadHint, onEditPreview, editHint,
}: {
  value: string | null;
  options: PickOption[];
  onPick: (id: string) => void;
  onUpload: (dataUrl: string) => void;
  uploadHint?: string;
  /** When given, the preview becomes the way back into the crop editor. */
  onEditPreview?: () => void;
  editHint?: string;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpload(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        {onEditPreview ? (
          <button
            type="button"
            onClick={onEditPreview}
            disabled={!value}
            title={editHint}
            className="group relative w-16 h-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 bg-center bg-contain bg-no-repeat hover:border-[#FD312E] disabled:cursor-not-allowed transition-colors"
            style={value ? { backgroundImage: `url(${value})` } : undefined}
          >
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {editHint}
            </span>
          </button>
        ) : (
          <div
            className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 bg-gray-50 bg-center bg-contain bg-no-repeat"
            style={value ? { backgroundImage: `url(${value})` } : undefined}
          />
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            disabled={options.length === 0}
            className="flex items-center justify-center gap-1 rounded-md border py-1.5 text-[11px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: open ? '#FD312E' : '#e5e7eb',
              color: open ? '#FD312E' : '#4b5563',
            }}
          >
            <Library size={11} />
            {t('Pick from library')}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-1 rounded-md border border-gray-200 py-1.5 text-[11px] text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
          >
            <Upload size={11} />
            {t('Upload')}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-200 p-2">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              title={o.label}
              onClick={() => { onPick(o.id); setOpen(false); }}
              className="aspect-square rounded-md border border-gray-200 bg-gray-50 bg-center bg-contain bg-no-repeat hover:border-[#FD312E] transition-colors"
              style={{ backgroundImage: `url(${o.thumb})` }}
            />
          ))}
        </div>
      )}

      {uploadHint && <p className="text-[11px] text-gray-400">{uploadHint}</p>}
    </div>
  );
}

/** Cutout thumbnail plus the three ways to change it: pick another image off
 *  the crawled page, upload one, or redo the background. A newly supplied image
 *  is cut out automatically; the third button reopens the touch-up editor on the
 *  original shot so a bad automatic pass can be fixed by hand. */
/**
 * Whether this product is lit at all — the whole of a product's say in its own
 * shadow. Direction, length and strength belong to the banner's Global Light,
 * because one room has one lamp; what is genuinely per-product is only whether
 * there is a floor under it, which a wall-mounted unit has not.
 */
function ShadowControls({
  item, onChange,
}: {
  item: OffSiteItem;
  onChange: (patch: Partial<OffSiteItem>) => void;
}) {
  const t = useT();
  return (
    // Neither framed nor ruled off: it is inside the product's own box, and one
    // toggle does not need a divider to be told apart from the row above it.
    <div className="flex items-center justify-between">
      <FieldLabel>{t('Shadow')}</FieldLabel>
      <div className="-mt-1">
        <ShowToggle
          checked={item.showShadow ?? true}
          onChange={(v) => onChange({ showShadow: v })}
        />
      </div>
    </div>
  );
}

/** A filled slot's controls. There is no upload here: replacing this product's
 *  shot with an unrelated file is not what the button reads as, and "Add
 *  product" below covers supplying one. */
function ProductImageControls({
  item, busy, canPick, onPick, onRemoveBg,
}: {
  item: OffSiteItem;
  busy: boolean;
  canPick: boolean;
  onPick: () => void;
  onRemoveBg: () => void;
}) {
  const t = useT();

  return (
    <div className="flex gap-3">
      <div className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
        {busy ? (
          <Loader2 size={15} className="animate-spin text-gray-400" />
        ) : item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-contain" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onPick}
          disabled={!canPick || busy}
          title={canPick ? t('Pick another image from this page') : t('Imported images only')}
          className="flex items-center justify-center gap-1 rounded-md border border-gray-200 py-1.5 text-[11px] text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Images size={11} />
          {t('Change')}
        </button>
        <button
          type="button"
          onClick={onRemoveBg}
          disabled={!item.image || busy}
          className="flex items-center justify-center gap-1 rounded-md border border-gray-200 py-1.5 text-[11px] text-gray-600 hover:border-[#FD312E] hover:text-[#FD312E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Eraser size={11} />
          {t('Edit background removal')}
        </button>
      </div>
    </div>
  );
}
