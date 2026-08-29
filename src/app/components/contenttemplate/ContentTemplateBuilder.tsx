/**
 * Content Template Builder — the LG Black Friday content-template flow.
 *
 * Same four-column shell as the Promotion Page builder (header / nav rail /
 * palette / canvas / edit panel), but the palette holds *asset sources* rather
 * than page modules: pick a Key Visual, a Deal Type and an Ad Creative above the
 * divider, pick an output Channel below it, and the canvas previews the picked
 * art — followed by that channel's banner slots, composed the way the Figma
 * board composes them. Only LG.com has slots so far.
 *
 * Layout numbers mirror the Figma mock (`fUup3vSq71f6eUIRpmzz8s`, page
 * "Content Template Builder", frame 26:2): rail 80 / palette 320 / edit 384,
 * 66px thumbnails on an 8px gutter.
 */
import React, { useEffect, useRef, useState } from 'react';

/**
 * Draggable sidebar width, persisted per key. Browser windows differ wildly and
 * the canvas is what suffers, so both bars can be dragged narrower (or wider)
 * from their inner edge; double-click the handle to reset.
 */
function useDragWidth(key: string, initial: number, min: number, max: number) {
  const [w, setW] = useState(() => {
    try {
      const v = Number(localStorage.getItem(key));
      if (v >= min && v <= max) return v;
    } catch { /* storage unavailable */ }
    return initial;
  });
  useEffect(() => {
    try { localStorage.setItem(key, String(w)); } catch { /* ignore */ }
  }, [key, w]);
  // side: which way dragging right should move the width
  const start = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = w;
    const move = (ev: MouseEvent) => {
      const d = ev.clientX - x0;
      setW(Math.min(max, Math.max(min, side === 'left' ? w0 + d : w0 - d)));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  return { w, start, reset: () => setW(initial) };
}

/** The drag handle strip between a sidebar and the canvas. */
function DragHandle({ onMouseDown, onDoubleClick }: {
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      title="Drag to resize · double-click to reset"
      className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-[#FD312E]/40 active:bg-[#FD312E]/60 transition-colors"
    />
  );
}

/** Width of an element, tracked live — drives the banner scale. */
function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(es => setW(es[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}
import { useT } from '../../i18n/LanguageContext';
import { NavRail, type NavRailKey } from '../NavRail';
import { AppHeader } from '../AppHeader';
import type { DraftRecord } from '../../utils/draftStore';
import { LgcomSlotPreview } from './LgcomSlotPreview';
import { PaidSlotPreview } from './PaidSlotPreview';
import { paidSlotsFor, type PaidSlot } from './paidSlots';
import { DEFAULT_ICON_ROW, LGCOM_SLOTS, artFor, bareOnExport, iconRowStyle, overlayUrl, productSlotCount, type IconRowStyle, type LgcomSlot } from './lgcomSlots';
import { PD_PLATE_FILL, isPdSlotAsset } from './paidBoards';
import { buildZip, captureBox, dateTag, type ZipEntry } from './exportSlots';
import { acquireSaveTarget } from '../../utils/fileSaver';
import { renderMotionCutLive } from './exportMotion';
import { EMPTY_COPY, SlotCopyEditor, type SlotCopy } from './SlotCopyEditor';
import { ProductSlotsEditor, emptyProductSlots, type ProductSlots } from './ProductSlotsEditor';
import {
  ASSET_ROWS,
  SHORTS_SIZES,
  TILE_H,
  outputKindOf,
  visibleRows,
  CHANNELS,
  type ContentAsset,
  getAsset,
  motionUrl,
  previewUrl,
  sourceUrl,
  thumbUrl,
} from './contentTemplateAssets';

interface Props {
  onBack: () => void;
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
}

export function ContentTemplateBuilder({ onBack, railActive, onRailNavigate, onOpenDraft }: Props) {
  const t = useT();
  /** Exactly one asset is in play at a time, across all three groups. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** null until a channel is picked — that is what switches the screen from
   *  "study the asset" to "lay out the banners". */
  const [channelKey, setChannelKey] = useState<string | null>(null);
  /** Shorts go out at a fixed size instead of to a channel. */
  const [sizeKey, setSizeKey] = useState<string | null>(null);

  const [copy, setCopy] = useState<SlotCopy>(EMPTY_COPY);
  /** The icon row is the only element that can be switched off — see DEFAULT_ICON_ROW. */
  const [showIconRow, setShowIconRow] = useState(DEFAULT_ICON_ROW);
  const [iconStyle, setIconStyle] = useState<IconRowStyle>('solid-white');
  /** Products keyed by asset — switching key visual keeps each one's fills. */
  const [products, setProducts] = useState<Record<string, ProductSlots>>({});
  /** Plate fill on the paid boards; starts on the Figma value. */
  const [plateColor, setPlateColor] = useState(PD_PLATE_FILL);
  /** The one size mounted in the hidden export host, and how far along we are. */
  const [renderSlot, setRenderSlot] = useState<LgcomSlot | PaidSlot | null>(null);
  const [exportedCount, setExportedCount] = useState<number | null>(null);
  const exportHost = useRef<HTMLDivElement>(null);

  const asset = getAsset(selectedId);
  const channel = channelKey ? CHANNELS.find(c => c.key === channelKey) : undefined;
  const outputKind = outputKindOf(asset);
  const shortsSize = sizeKey ? SHORTS_SIZES.find(s => s.key === sizeKey) : undefined;

  // Nothing renders until an asset is chosen — the canvas opens empty rather
  // than implying a default pick the operator never made.
  const showBanners = !!asset && outputKind === 'channel' && !!channelKey;
  const plateCount = asset ? productSlotCount(asset.id) : 0;
  /** PD Slot key visuals are the only ones with product plates, and the plates
   *  take the room the benefit icons would need — so those assets ship without
   *  an icon row and the control never appears for them. */
  const iconRowAvailable = plateCount === 0;
  const assetProducts = asset ? products[asset.id] ?? emptyProductSlots(plateCount) : undefined;
  const hasSlots = showBanners && channelKey === 'lgcom';
  /** Only the paid boards draw their plates, so only they take a colour. */
  const plateColorEditable =
    showBanners && !!asset && (channelKey !== 'lgcom' ? isPdSlotAsset(asset.id) : plateCount > 0);

  const left = useDragWidth('ctb.leftW', 320, 256, 520);
  const right = useDragWidth('ctb.rightW', 384, 300, 640);

  const pick = (next: ContentAsset) => {
    setSelectedId(prev => (prev === next.id ? null : next.id));
    // the two pickers are different lists; a pick from one must not survive
    // into the other, or the canvas would show an output nobody chose
    if (outputKindOf(next) !== outputKind) {
      setChannelKey(null);
      setSizeKey(null);
    }
  };

  /**
   * One ZIP for the chosen key visual on the chosen channel. Sizes render one at
   * a time through the hidden host so each gets a full layout pass at its true
   * pixel size; a canvas-scaled screenshot would ship blurry text.
   */
  async function handleDownload() {
    if (!asset || !channelKey || exportedCount !== null) return;
    const list: (LgcomSlot | PaidSlot)[] =
      channelKey === 'lgcom' ? LGCOM_SLOTS : (PAID_ASSETS.has(asset.id) ? paidSlotsFor(channelKey) : []);
    if (list.length === 0) return;

    // ask for the save location first, while the click still counts as a user
    // gesture — asking after the export made the picker fail and the browser
    // ask a second time through its own download prompt
    const save = await acquireSaveTarget(`LG-BF-${asset.id}-${channelKey}-${dateTag()}.zip`);
    if (!save) return; // cancelled

    setExportedCount(0);
    const entries: ZipEntry[] = [];
    const failed: string[] = [];
    try {
      await document.fonts.ready;
      for (let i = 0; i < list.length; i++) {
        const slot = list[i];
        setRenderSlot(slot);
        // let React paint the freshly mounted size before photographing it
        await new Promise(r => setTimeout(r, 220));
        // the two bare hero placements ship as video when the asset has one
        const asMotion = 'id' in slot && bareOnExport(slot.id) && !!asset.motion;
        if (asMotion) {
          const lg = slot as LgcomSlot;
          const iconOn = showIconRow && iconRowAvailable && !!lg.iconRow;
          // cut live from the current placement — a failure is reported, never
          // papered over with a stale file
          try {
            const art = artFor(asset.id, lg.id);
            const src = motionUrl(asset);
            if (!art || !src) throw new Error('no art placement or motion source');
            const blob = await renderMotionCutLive(src, {
              w: slot.w,
              h: slot.h,
              art: { x: art.x, y: art.y, size: art.size },
              iconRow: iconOn
                ? { url: overlayUrl(iconRowStyle(iconStyle).file), ...lg.iconRow! }
                : undefined,
            });
            entries.push({ name: `${asset.id}-${channelKey}-${slot.w}x${slot.h}.mp4`, blob });
          } catch (err) {
            console.error('[ContentTemplate] motion cut failed', err);
            failed.push(`${slot.w}×${slot.h} (mp4)`);
          }
        } else {
          const host = exportHost.current;
          if (host) {
            const blob = await captureBox(host, slot.w, slot.h);
            if (blob) entries.push({ name: `${asset.id}-${channelKey}-${slot.w}x${slot.h}.png`, blob });
          }
        }
        setExportedCount(i + 1);
      }
      if (entries.length) await save(await buildZip(entries));
      if (failed.length) {
        window.alert(`${t('Some files could not be rendered and were left out of the ZIP:')}\n${failed.join('\n')}`);
      }
    } catch (err) {
      console.error('[ContentTemplate] export failed', err);
    } finally {
      setRenderSlot(null);
      setExportedCount(null);
    }
  }

  const exporting = exportedCount !== null;

  return (
    <div className="flex flex-col h-screen bg-[#f8f7f5]">
      <AppHeader
        title={t('Content Template Builder')}
        onBack={onBack}
        onHome={() => onRailNavigate('home')}
        right={
          <>
            {/* Save for Later is parked, not removed — flip SHOW_SAVE_FOR_LATER
                when the draft flow for this builder lands. */}
            {SHOW_SAVE_FOR_LATER && (
              <button
                type="button"
                disabled
                className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-full border border-gray-300 text-gray-600 disabled:opacity-40 disabled:pointer-events-none"
              >
                {t('Save for Later')}
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={!asset || !showBanners || exporting}
              className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-full border transition-colors border-[#FD312E] text-[#FD312E] hover:bg-[#FD312E] hover:text-white disabled:opacity-40 disabled:pointer-events-none"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1v8M4 6l3 3 3-3M2 11h10"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {exporting ? `${exportedCount} / ${channelKey === 'lgcom' ? LGCOM_SLOTS.length : paidSlotsFor(channelKey ?? '').length}` : t('Download ZIP')}
            </button>
          </>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <NavRail active={railActive} onNavigate={onRailNavigate} onOpenDraft={onOpenDraft} />

        {/* Left — asset sources above the rule, output channel below it */}
        <aside
          className="shrink-0 bg-white border-r border-gray-200 overflow-y-auto overflow-x-hidden flex flex-col"
          style={{ width: left.w }}
        >
          <div className="p-4 flex flex-col gap-5">
            {visibleRows().map(row => (
              <section key={row.key} className="flex flex-col gap-2">
                {/* No `uppercase`: Figma writes these mixed-case ("KEY VISUAL_Main"),
                    and only DEAL TYPE / AD CREATIVE are capitalised in the copy itself. */}
                <p className="text-[12px] font-medium text-gray-400 tracking-wide px-1">
                  {t(row.label)}
                </p>
                {/*
                  Figma widths drive the grid: each tile keeps its designed
                  column so a 2-up row of 140s and a 4-up row of 66s can sit in
                  the same 288px rail without either stretching to fill it.
                */}
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: row.tiles.map(tl => `${tl.w}px`).join(' ') }}
                >
                  {row.tiles.map((tl, i) => {
                    const a = getAsset(tl.id);
                    if (!a) return null;
                    return (
                      <AssetCell
                        key={a.id}
                        asset={a}
                        width={tl.w}
                        height={row.tileH ?? TILE_H}
                        showCaption={i >= (row.captionFromIndex ?? 0)}
                        selected={selectedId === a.id}
                        onPick={() => pick(a)}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="h-px bg-gray-200 shrink-0" />

          <div className="p-4 pt-6 flex flex-col gap-2.5">
            <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide px-1">
              {t(outputKind === 'size' ? 'Size' : 'Channel')}
            </p>
            {outputKind === 'size' ? (
              <div className="flex flex-wrap gap-2">
                {SHORTS_SIZES.map(sz => (
                  <button
                    key={sz.key}
                    type="button"
                    onClick={() => setSizeKey(prev => (prev === sz.key ? null : sz.key))}
                    className={`px-[15px] py-2 rounded-full border text-xs font-medium transition-colors ${
                      sizeKey === sz.key
                        ? 'border-[#FD312E] bg-[#FD312E]/8 text-[#FD312E]'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            ) : (
              (['owned', 'paid'] as const).map(kind => (
                <div key={kind} className="flex flex-wrap gap-2">
                  {CHANNELS.filter(c => c.kind === kind).map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setChannelKey(prev => (prev === c.key ? null : c.key))}
                      className={`px-[15px] py-2 rounded-full border text-xs font-medium transition-colors ${
                        channelKey === c.key
                          ? 'border-[#FD312E] bg-[#FD312E]/8 text-[#FD312E]'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        <DragHandle onMouseDown={e => left.start(e, 'left')} onDoubleClick={left.reset} />

        {/* Center — preview while studying the asset, banner sizes once a channel is on */}
        <main className="flex-1 overflow-y-auto p-6" style={{ background: '#CDC8C1' }}>
          {!asset ? (
            <div className="h-full flex items-center justify-center px-12">
              <p className="text-sm text-center" style={{ color: '#8A8078' }}>
                {t('Pick an asset on the left to preview it.')}
              </p>
            </div>
          ) : asset.blank ? (
            <div className="h-full flex items-center justify-center px-12">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="rounded-lg bg-black"
                  style={{
                    width: shortsSize ? Math.round(220 * shortsSize.width / shortsSize.height) : 160,
                    height: 220,
                  }}
                />
                <p className="text-sm text-center" style={{ color: '#8A8078' }}>
                  {shortsSize
                    ? `${shortsSize.label} — ${t('artwork not delivered yet')}`
                    : t('Pick a size below to see the output.')}
                </p>
              </div>
            </div>
          ) : showBanners ? (
            <ChannelSlots
              channelKey={channelKey!}
              channelLabel={channel ? channel.label : ''}
              asset={asset}
              copy={copy}
              products={assetProducts}
              plateColor={plateColor}
              showIconRow={showIconRow && iconRowAvailable}
              iconStyle={iconStyle}
            />
          ) : (
            <PreviewBox asset={asset} />
          )}
        </main>

        <DragHandle onMouseDown={e => right.start(e, 'right')} onDoubleClick={right.reset} />

        {/* Right — the source frame while studying it, the copy once banners are up */}
        <aside className="shrink-0 bg-white border-l border-gray-200 overflow-y-auto" style={{ width: right.w }}>
          {!asset ? (
            <div className="h-full flex items-center justify-center px-12">
              <p className="text-sm text-gray-400 text-center">{t('Nothing selected yet.')}</p>
            </div>
          ) : asset.blank ? (
            <div className="h-full flex items-center justify-center px-12">
              <p className="text-sm text-gray-400 text-center">
                {t('Nothing to edit until the artwork lands.')}
              </p>
            </div>
          ) : showBanners ? (
            <>
              <SlotCopyEditor
                channelLabel={channel ? channel.label : ''}
                copy={copy}
                onChange={setCopy}
                onReset={() => setCopy(EMPTY_COPY)}
                showIconRow={showIconRow}
                onShowIconRowChange={setShowIconRow}
                iconStyle={iconStyle}
                onIconStyleChange={setIconStyle}
                showIconRowToggle={channelKey === 'lgcom' && iconRowAvailable}
              />
              {plateCount > 0 && assetProducts && (
                <ProductSlotsEditor
                  count={plateCount}
                  slots={assetProducts}
                  onChange={next => setProducts(prev => ({ ...prev, [asset.id]: next }))}
                  color={plateColor}
                  onColorChange={plateColorEditable ? setPlateColor : undefined}
                />
              )}
            </>
          ) : (
            <div className="p-5">
              <p className="font-lgei font-bold text-[15px] text-gray-900 mb-0.5">
                {t(asset.label)}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {t(groupLabel(asset.id))} · 3000 × 3000
              </p>
              {/* The whole delivered frame, square and uncropped — this panel is
                  about the source you are working from, not the framed output. */}
              <div className="rounded-lg overflow-hidden bg-[#111] aspect-square">
                <img
                  src={sourceUrl(asset)}
                  alt={asset.label}
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Off-screen render host — one size at a time, at true pixel size. The
          preview boxes are rounded on canvas; a delivered file is not. */}
      {renderSlot && asset && (
        <div
          ref={exportHost}
          className="ctb-export-host"
          style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }}
          aria-hidden
        >
          <style>{'.ctb-export-host [data-export-box]{border-radius:0 !important}'}</style>
          {'id' in renderSlot ? (
            <LgcomSlotPreview
              slot={renderSlot}
              asset={asset}
              scale={1}
              copy={copy}
              products={assetProducts}
              plateColor={plateColor}
              showIconRow={showIconRow && iconRowAvailable}
              iconStyle={iconStyle}
              bare={bareOnExport(renderSlot.id)}
            />
          ) : (
            <PaidSlotPreview
              slot={renderSlot}
              asset={asset}
              scale={1}
              copy={copy}
              products={assetProducts}
              plateColor={plateColor}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** The heading of the row this asset sits in — used in the preview captions. */
function groupLabel(assetId: string): string {
  return ASSET_ROWS.find(r => r.tiles.some(t => t.id === assetId))?.label ?? assetId;
}

/**
 * Palette cell: the tile art with its caption beneath, selection as a ring.
 *
 * The tile is `width × TILE_H`, not square — the thumbnail file is already cut
 * to that shape by the asset pipeline, so `object-cover` here has nothing left
 * to trim.
 */
function AssetCell({
  asset,
  width,
  height,
  showCaption,
  selected,
  onPick,
}: {
  asset: ContentAsset;
  width: number;
  height: number;
  showCaption: boolean;
  selected: boolean;
  onPick: () => void;
}) {
  const t = useT();
  return (
    <button type="button" onClick={onPick} className="flex flex-col gap-1 text-left group/cell">
      <span
        style={{ width, height }}
        className={`block rounded overflow-hidden bg-[#111] transition-shadow ${
          selected ? 'ring-2 ring-[#FD312E]' : 'ring-1 ring-transparent group-hover/cell:ring-gray-300'
        }`}
      >
        {!asset.blank && (
          <img
            src={thumbUrl(asset)}
            alt={asset.label}
            loading="lazy"
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}
      </span>
      {showCaption && (
        <span
          className={`text-[10px] leading-[12px] min-h-[24px] text-center transition-colors ${
            selected ? 'text-[#FD312E] font-medium' : 'text-gray-600'
          }`}
        >
          {t(asset.label)}
        </span>
      )}
    </button>
  );
}

/**
 * Canvas preview box. `PREVIEW_*` must track the pipeline: the stills are cut to
 * this ratio at PREVIEW_ZOOM of the source height (see buildContentTemplateAssets).
 */
const PREVIEW_W = 980;
const PREVIEW_H = 464;
const PREVIEW_ZOOM = 2.5;

/**
 * The mp4 ships uncropped and square, so CSS has to reproduce what the stills
 * got baked with. `object-cover` on a square source already fills the box width
 * and shows PREVIEW_H/PREVIEW_W of its height; this closes the gap to 1/zoom.
 */
const MOTION_SCALE = ((PREVIEW_H / PREVIEW_W) * PREVIEW_ZOOM).toFixed(3);

/** The canvas preview — mirrors the box drawn in the Figma mock. */
function PreviewBox({ asset }: { asset: ContentAsset | undefined }) {
  const t = useT();
  const motion = asset ? motionUrl(asset) : null;
  return (
    <div
      className="mx-auto w-full rounded-xl overflow-hidden bg-white shadow-sm"
      style={{ maxWidth: PREVIEW_W }}
    >
      <div
        className="bg-[#111] flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: `${PREVIEW_W} / ${PREVIEW_H}` }}
      >
        {!asset ? (
          <p className="text-sm text-gray-500">{t('Pick an asset on the left to preview it.')}</p>
        ) : motion ? (
          <video
            key={motion}
            src={motion}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover origin-center"
            style={{ transform: `scale(${MOTION_SCALE})` }}
          />
        ) : (
          <img
            src={previewUrl(asset)}
            alt={asset.label}
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}
      </div>
      {asset && (
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-800">{t(asset.label)}</p>
          <p className="text-xs text-gray-400">
            {t(groupLabel(asset.id))}{motion ? ' · Motion' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The chosen channel's output slots. LG.com is transcribed from the Figma board;
 * the paid channels have no compositions yet and say so rather than guessing.
 */
/** Assets with a paid-media board in Figma. */
/**
 * Which key visuals have paid boards behind them. The two Key Visual _Main
 * artworks share the `PAID_SLOTS` layout; the rest override it per size from
 * `paidBoards.ts` — the PD Slot pair with plates, PD Centric without.
 */
/** Parked header button — hidden for now, likely to return with the draft flow. */
const SHOW_SAVE_FOR_LATER = false;

const PAID_ASSETS = new Set([
  // Teasing is the Main artwork with a motion cut, so it ships the same paid set
  'kv-main', 'kv-main-character', 'ad-teasing',
  'kv-product-slot', 'kv-product-slot-character',
  'kv-product-centric-1', 'kv-product-centric-2',
  'deal-type-bundle', 'deal-type-time-sale', 'deal-type-gift', 'deal-type-hot-deal',
  'ad-joy-ryder', 'ad-benefit',
]);

function ChannelSlots({
  channelKey,
  channelLabel,
  asset,
  copy,
  products,
  plateColor,
  showIconRow,
  iconStyle,
}: {
  channelKey: string;
  channelLabel: string;
  asset: ContentAsset | undefined;
  copy: SlotCopy;
  products?: ProductSlots;
  plateColor: string;
  showIconRow: boolean;
  iconStyle: IconRowStyle;
}) {
  const t = useT();
  const slots = channelKey === 'lgcom' ? LGCOM_SLOTS : [];
  // The paid boards exist only for the two Key Visual _Main artworks; every
  // other asset would need its own board before it could be laid out here.
  const paid = channelKey === 'lgcom' || !asset || !PAID_ASSETS.has(asset.id)
    ? []
    : paidSlotsFor(channelKey);
  // The banners scale to the width the canvas really has — fixed 980 made them
  // needlessly small on wide windows and cramped on narrow ones.
  const { ref: measureRef, w: availW } = useMeasuredWidth<HTMLDivElement>();
  const fitW = availW || PREVIEW_W;
  const paidWidest = paid.reduce((m, s) => Math.max(m, s.w), 0);
  const paidScale = paidWidest ? Math.min(1, fitW / paidWidest) : 1;
  // one scale for the whole set, keyed off the widest slot, so the sizes stay
  // in proportion to one another rather than each filling the column
  const widest = slots.reduce((m, s) => Math.max(m, s.w), 0);
  const slotScale = widest ? Math.min(1, fitW / widest) : 1;

  return (
    <div ref={measureRef} className="mx-auto w-full mt-8" style={{ maxWidth: 1920 }}>
      <p className="font-lgei font-bold text-[17px] text-gray-800 mb-4">{channelLabel}</p>

      {paid.length > 0 ? (
        <div className="flex flex-col gap-7 pb-10">
          {paid.map(slot => (
            <PaidSlotPreview
              key={slot.key}
              slot={slot}
              asset={asset!}
              scale={paidScale}
              copy={copy}
              products={products}
              plateColor={plateColor}
            />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-500/50 px-5 py-8 text-center">
          <p className="text-sm text-gray-700">
            {asset && !PAID_ASSETS.has(asset.id)
              ? t('This channel is only laid out for the Key Visual_Main artworks so far.')
              : t('Banner sizes for this channel have not been built yet.')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-7 pb-10">
          {slots.map(slot => (
            <LgcomSlotPreview
              key={slot.id}
              slot={slot}
              asset={asset}
              scale={slotScale}
              copy={copy}
              products={products}
              plateColor={plateColor}
              showIconRow={showIconRow}
              iconStyle={iconStyle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
