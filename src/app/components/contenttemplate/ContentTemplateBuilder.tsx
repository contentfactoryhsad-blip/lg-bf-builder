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
import { artFor, bareOnExport, lgcomSlotsFor, productSlotCount, type IconRowStyle, type LgcomSlot } from './lgcomSlots';
import { IconRowInline } from './icons/IconRowInline';
import { DYNAMIC_PAID_SLOTS, PD_PLATE_FILL, isPdSlotAsset } from './paidBoards';
import { buildZip, captureBox, dateTag, type ZipEntry } from './exportSlots';
import { acquireSaveTarget } from '../../utils/fileSaver';
import { renderMotionCutLive } from './exportMotion';
import { EMPTY_COPY, SlotCopyEditor, type SlotCopy } from './SlotCopyEditor';
import { ProductSlotsEditor, emptyProductSlots, type ProductSlots } from './ProductSlotsEditor';
import { CUSTOM_ASSET_ID, hasCustomArt, setCustomArt,
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
  /**
   * Icon row settings, ported from promotion-banner-variation: None / Solid /
   * Line, a colour, how many groups, and which benefit each group shows —
   * solid and line keep separate picks, matching the source app.
   */
  const [iconKind, setIconKind] = useState<'none' | 'solid' | 'line'>('none');
  const [iconColor, setIconColor] = useState<'black' | 'white'>('white');
  const [iconCount, setIconCount] = useState<1 | 2 | 3>(3);
  const [solidIconIds, setSolidIconIds] = useState<string[]>(['free-delivery', 'free-disposal', 'free-installation']);
  const [lineIconIds, setLineIconIds] = useState<string[]>(['free-delivery', 'free-disposal', 'free-installation']);
  /** Caption overrides per slot — operators localise the labels. null = registry text. */
  const [solidIconLabels, setSolidIconLabels] = useState<(string | null)[]>([null, null, null]);
  const [lineIconLabels, setLineIconLabels] = useState<(string | null)[]>([null, null, null]);
  const showIconRow = iconKind !== 'none';
  const iconStyle = `${iconKind === 'none' ? 'solid' : iconKind}-${iconColor}` as IconRowStyle;
  const iconIds = (iconKind === 'line' ? lineIconIds : solidIconIds).slice(0, iconCount);
  const iconLabels = (iconKind === 'line' ? lineIconLabels : solidIconLabels).slice(0, iconCount);
  /** Products keyed by asset — switching key visual keeps each one's fills. */
  const [products, setProducts] = useState<Record<string, ProductSlots>>({});
  /** Plate fill on the paid boards; starts on the Figma value. */
  const [plateColor, setPlateColor] = useState(PD_PLATE_FILL);
  /**
   * The operator's uploaded 3000×3000, as an object URL. Mirrored into the
   * asset registry (`setCustomArt`) so every URL helper resolves it; kept in
   * state as well so uploads re-render and the old URL can be revoked.
   */
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);

  function handleUploadFile(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // the Main skeleton places a square — anything else would render distorted
      if (Math.abs(img.width - img.height) > img.width * 0.01) {
        URL.revokeObjectURL(url);
        window.alert(t('Please upload a square image (3000×3000).'));
        return;
      }
      if (uploadUrl) URL.revokeObjectURL(uploadUrl);
      setCustomArt(url);
      setUploadUrl(url);
      setSelectedId(CUSTOM_ASSET_ID);
    };
    img.onerror = () => { URL.revokeObjectURL(url); window.alert(t('That file could not be read as an image.')); };
    img.src = url;
  }

  /** The one size mounted in the hidden export host, and how far along we are. */
  const [renderSlot, setRenderSlot] = useState<LgcomSlot | PaidSlot | null>(null);
  /**
   * When set, the export host renders just this slot's icon row on a
   * transparent ground — rasterised and composited over the motion cut, now
   * that the row is drawn live instead of shipped as a baked PNG.
   */
  const [renderIconRowSlot, setRenderIconRowSlot] = useState<LgcomSlot | null>(null);
  /** A Dynamic paid size whose copy layers render art-less for the mp4 overlay. */
  const [renderPaidOverlaySlot, setRenderPaidOverlaySlot] = useState<PaidSlot | null>(null);
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
      channelKey === 'lgcom'
        ? lgcomSlotsFor(asset.id)
        : asset.id === 'ad-teasing'
          ? (DYNAMIC_PAID_SLOTS[channelKey] ?? [])
          : (PAID_ASSETS.has(asset.id) ? paidSlotsFor(channelKey) : []);
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
        // video goes out wherever the asset has a motion cut and the frame is
        // bare: LG.com's two hero placements, and every Dynamic paid size
        const dynamicPaid = channelKey !== 'lgcom' && asset.id === 'ad-teasing';
        const asMotion = !!asset.motion && (dynamicPaid || ('id' in slot && bareOnExport(slot.id)));
        if (asMotion) {
          const lg = dynamicPaid ? null : (slot as LgcomSlot);
          const iconOn = !!lg && showIconRow && iconRowAvailable && !!lg.iconRow;
          // cut live from the current placement — a failure is reported, never
          // papered over with a stale file
          try {
            const art = dynamicPaid ? (slot as PaidSlot).art : artFor(asset.id, lg!.id);
            const src = motionUrl(asset);
            if (!art || !src) throw new Error('no art placement or motion source');
            // the icon row is drawn live now, so the overlay for the video is
            // rasterised from the same component the canvas uses
            // whatever rides over the video gets rasterised from the same
            // components the canvas uses: the icon row on LG.com heroes, the
            // full copy/logo/CTA layer set on Dynamic paid sizes
            let overlayUrl: string | null = null;
            let overlayBox: { x: number; y: number; w: number; h: number } | null = null;
            if (dynamicPaid) {
              setRenderPaidOverlaySlot(slot as PaidSlot);
              await new Promise(r => setTimeout(r, 220));
              const host = exportHost.current;
              const ovBlob = host ? await captureBox(host, slot.w, slot.h) : null;
              setRenderPaidOverlaySlot(null);
              if (ovBlob) { overlayUrl = URL.createObjectURL(ovBlob); overlayBox = { x: 0, y: 0, w: slot.w, h: slot.h }; }
            } else if (iconOn && lg) {
              setRenderIconRowSlot(lg);
              await new Promise(r => setTimeout(r, 220));
              const host = exportHost.current;
              const iconBlob = host ? await captureBox(host, lg!.iconRow!.w, lg!.iconRow!.h) : null;
              setRenderIconRowSlot(null);
              if (iconBlob) { overlayUrl = URL.createObjectURL(iconBlob); overlayBox = { ...lg.iconRow! }; }
            }
            try {
              const blob = await renderMotionCutLive(src, {
                w: slot.w,
                h: slot.h,
                art: { x: art.x, y: art.y, size: art.size },
                iconRow: overlayUrl && overlayBox ? { url: overlayUrl, ...overlayBox } : undefined,
              });
              entries.push({ name: `${asset.id}-${channelKey}-${slot.w}x${slot.h}.mp4`, blob });
            } finally {
              if (overlayUrl) URL.revokeObjectURL(overlayUrl);
            }
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
        title={t('Content Banner Builder')}
        onBack={onBack}
        onHome={() => onRailNavigate('home')}
        center={<StepIndicator active={!asset ? 0 : showBanners || (outputKind === 'size' && sizeKey) ? 2 : 1} />}
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
              {exporting ? `${exportedCount} / ${channelKey === 'lgcom' ? lgcomSlotsFor(asset?.id ?? '').length : asset?.id === 'ad-teasing' ? (DYNAMIC_PAID_SLOTS[channelKey ?? ''] ?? []).length : paidSlotsFor(channelKey ?? '').length}` : t('Download ZIP')}
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

            {/* UPLOAD IMAGE — the operator's own square, laid out with the Main skeleton */}
            <section className="flex flex-col gap-1">
              <p className="text-[12px] font-medium text-gray-400 tracking-wide px-1">
                {t('UPLOAD IMAGE')}
              </p>
              <p className="text-[11px] text-gray-400 px-1 -mt-0.5 mb-0.5">
                {t('Please upload your finished image.')}
              </p>
              <input
                ref={uploadInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadFile(f);
                  e.target.value = '';
                }}
              />
              {uploadUrl ? (
                <div className="flex flex-col gap-1" style={{ width: 140 }}>
                  <button
                    type="button"
                    onClick={() => pick(getAsset(CUSTOM_ASSET_ID)!)}
                    className={`block rounded overflow-hidden bg-[#111] transition-shadow ${
                      selectedId === CUSTOM_ASSET_ID
                        ? 'ring-2 ring-[#FD312E]'
                        : 'ring-1 ring-transparent hover:ring-gray-300'
                    }`}
                    style={{ width: 140, height: TILE_H }}
                  >
                    <img src={uploadUrl} alt={t('Uploaded image')} className="w-full h-full object-cover" draggable={false} />
                  </button>
                  <button
                    type="button"
                    onClick={() => uploadInput.current?.click()}
                    className="self-start px-1 text-[11px] text-gray-400 hover:text-gray-700"
                  >
                    {t('Replace')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => uploadInput.current?.click()}
                  className="flex flex-col items-center justify-center gap-1 rounded border border-dashed border-gray-300 text-gray-400 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
                  style={{ width: 140, height: TILE_H }}
                >
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path d="M7 9V1M4 4l3-3 3 3M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] leading-none">3000×3000</span>
                </button>
              )}
            </section>
          </div>

        </aside>

        <DragHandle onMouseDown={e => left.start(e, 'left')} onDoubleClick={left.reset} />

        {/* Center — preview while studying the asset, banner sizes once a channel is on */}
        <main className="flex-1 overflow-y-auto p-6" style={{ background: '#CDC8C1' }}>
          {!asset ? (
            <div className="h-full flex items-center justify-center px-12">
              {/* Gone the moment an asset is picked — this is the !asset branch */}
              <div className="text-center">
                <p className="font-lgei font-bold text-[15px] text-gray-700 mb-1">{t('Canvas')}</p>
                <p className="text-sm" style={{ color: '#8A8078' }}>
                  {t('Pick an asset on the left to preview it.')}
                </p>
                <p className="text-sm" style={{ color: '#8A8078' }}>
                  {t('You can preview the image being edited.')}
                </p>
              </div>
            </div>
          ) : asset.blank ? (
            <div className="flex-1 flex items-center justify-center px-12">
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
                <OutputPicker
                  outputKind={outputKind}
                  channelKey={channelKey}
                  onChannel={setChannelKey}
                  sizeKey={sizeKey}
                  onSize={setSizeKey}
                />
              </div>
            </div>
          ) : showBanners ? (
            <>
              <OutputPicker
                outputKind={outputKind}
                channelKey={channelKey}
                onChannel={setChannelKey}
                sizeKey={sizeKey}
                onSize={setSizeKey}
              />
              <ChannelSlots
                channelKey={channelKey!}
                channelLabel={channel ? channel.label : ''}
                asset={asset}
                copy={copy}
                products={assetProducts}
                plateColor={plateColor}
                showIconRow={showIconRow && iconRowAvailable}
                iconStyle={iconStyle}
                iconIds={iconIds}
                iconLabels={iconLabels}
              />
            </>
          ) : (
            <>
              <PreviewBox asset={asset} />
              <OutputPicker
                outputKind={outputKind}
                channelKey={channelKey}
                onChannel={setChannelKey}
                sizeKey={sizeKey}
                onSize={setSizeKey}
              />
            </>
          )}
        </main>

        <DragHandle onMouseDown={e => right.start(e, 'right')} onDoubleClick={right.reset} />

        {/* Right — the source frame while studying it, the copy once banners are up */}
        <aside className="shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col" style={{ width: right.w }}>
          {!asset ? (
            /* Gone the moment an asset is picked — same treatment as the canvas */
            <div className="flex-1 flex items-center justify-center px-12">
              <div className="text-center">
                <p className="font-lgei font-bold text-[15px] text-gray-700 mb-1">{t('Edit')}</p>
                <p className="text-sm text-gray-400">
                  {t('You can modify the elements included in the banner.')}
                </p>
              </div>
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
                iconKind={iconKind}
                onIconKind={setIconKind}
                iconColor={iconColor}
                onIconColor={setIconColor}
                iconCount={iconCount}
                onIconCount={setIconCount}
                iconIds={iconKind === 'line' ? lineIconIds : solidIconIds}
                onIconId={(i, id) => {
                  const set = iconKind === 'line' ? setLineIconIds : setSolidIconIds;
                  set(prev => { const next = prev.slice(); next[i] = id; return next; });
                  // a new icon starts from its own registry caption
                  const setL = iconKind === 'line' ? setLineIconLabels : setSolidIconLabels;
                  setL(prev => { const next = prev.slice(); next[i] = null; return next; });
                }}
                iconLabels={iconKind === 'line' ? lineIconLabels : solidIconLabels}
                onIconLabel={(i, label) => {
                  const setL = iconKind === 'line' ? setLineIconLabels : setSolidIconLabels;
                  setL(prev => { const next = prev.slice(); next[i] = label; return next; });
                }}
                iconStyle={iconStyle}
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
      {renderPaidOverlaySlot && asset && (
        <div
          ref={exportHost}
          className="ctb-export-host"
          style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }}
          aria-hidden
        >
          <style>{'.ctb-export-host [data-export-box]{border-radius:0 !important;background:transparent !important}'}</style>
          <PaidSlotPreview slot={renderPaidOverlaySlot} asset={asset} scale={1} copy={copy} hideArt />
        </div>
      )}
      {!renderPaidOverlaySlot && renderIconRowSlot && (
        <div
          ref={exportHost}
          className="ctb-export-host"
          style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }}
          aria-hidden
        >
          <div
            data-export-box
            style={{
              position: 'relative',
              width: renderIconRowSlot.iconRow!.w,
              height: renderIconRowSlot.iconRow!.h,
              background: 'transparent',
            }}
          >
            <IconRowInline
              box={{ ...renderIconRowSlot.iconRow!, x: 0, y: 0 }}
              style={iconStyle}
              iconIds={iconIds}
              labels={iconLabels}
            />
          </div>
        </div>
      )}
      {!renderPaidOverlaySlot && !renderIconRowSlot && renderSlot && asset && (
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
              iconIds={iconIds}
              iconLabels={iconLabels}
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
  if (assetId === CUSTOM_ASSET_ID) return 'UPLOAD IMAGE';
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
/**
 * The three-step flow marker in the header — pick an asset, pick a channel,
 * edit. Purely reflective: it follows the selection state rather than driving
 * it, and the active step wears the dashed red ring from the Figma reference.
 * Widths flex so it survives narrow windows: the connectors give way first,
 * and below ~lg the labels drop to keep the numbers.
 */
function StepIndicator({ active }: { active: number }) {
  const t = useT();
  const STEPS = ['Select Visual Type', 'Select Channel', 'Edit'];
  return (
    <div className="flex items-center min-w-0">
      {STEPS.map((label, i) => {
        const isActive = i === active;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div className="h-px bg-gray-300 w-[clamp(10px,4vw,110px)] mx-2 xl:mx-4 shrink" />}
            <div className="flex items-center gap-2.5 shrink-0">
              <span
                className={`flex items-center justify-center rounded-full text-[15px] font-medium border ${
                  isActive
                    ? 'border-[#FD312E] border-dashed text-[#FD312E]'
                    : 'border-gray-300 text-gray-400'
                }`}
                style={{ width: 34, height: 34, borderWidth: 1.6 }}
              >
                {i + 1}
              </span>
              <span
                className={`hidden xl:block text-[15px] whitespace-nowrap ${
                  isActive ? 'text-[#FD312E] font-medium' : 'text-gray-400'
                }`}
              >
                {t(label)}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Channel / Size chips, shown on the canvas under whatever the asset renders —
 * they moved out of the palette footer (2026-09-01) so the choice sits with the
 * image it applies to. Same pill styling the palette used.
 */
function OutputPicker({
  outputKind,
  channelKey,
  onChannel,
  sizeKey,
  onSize,
}: {
  outputKind: 'channel' | 'size';
  channelKey: string | null;
  onChannel: (next: string | null) => void;
  sizeKey: string | null;
  onSize: (next: string | null) => void;
}) {
  const t = useT();
  const pill = (active: boolean) =>
    `px-[15px] py-2 rounded-full border text-xs font-medium transition-colors ${
      active
        ? 'border-[#FD312E] bg-[#FD312E]/8 text-[#FD312E]'
        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
    }`;
  return (
    <div className="mx-auto w-full mt-4 flex flex-col items-center gap-2" style={{ maxWidth: PREVIEW_W }}>
      <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: '#8A8078' }}>
        {t(outputKind === 'size' ? 'Size' : 'Channel')}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {outputKind === 'size'
          ? SHORTS_SIZES.map(sz => (
              <button key={sz.key} type="button" onClick={() => onSize(sizeKey === sz.key ? null : sz.key)} className={pill(sizeKey === sz.key)}>
                {sz.label}
              </button>
            ))
          : CHANNELS.map(c => (
              <button key={c.key} type="button" onClick={() => onChannel(channelKey === c.key ? null : c.key)} className={pill(channelKey === c.key)}>
                {c.label}
              </button>
            ))}
      </div>
    </div>
  );
}

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
  // Teasing is the Main artwork with a motion cut, and the uploaded square is
  // placed with the Main skeleton outright — both ship the same paid set
  'kv-main', 'kv-main-character', 'ad-teasing', CUSTOM_ASSET_ID,
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
  iconIds,
  iconLabels,
}: {
  channelKey: string;
  channelLabel: string;
  asset: ContentAsset | undefined;
  copy: SlotCopy;
  products?: ProductSlots;
  plateColor: string;
  showIconRow: boolean;
  iconStyle: IconRowStyle;
  iconIds: string[];
  iconLabels: (string | null)[];
}) {
  const t = useT();
  const slots = channelKey === 'lgcom' && asset ? lgcomSlotsFor(asset.id) : [];
  // The paid boards exist only for the two Key Visual _Main artworks; every
  // other asset would need its own board before it could be laid out here.
  const dynamicPaid = channelKey !== 'lgcom' && asset?.id === 'ad-teasing';
  const paid = dynamicPaid
    ? DYNAMIC_PAID_SLOTS[channelKey] ?? []
    : channelKey === 'lgcom' || !asset || !PAID_ASSETS.has(asset.id)
      ? []
      : paidSlotsFor(channelKey);
  const paidMotion = dynamicPaid && asset ? motionUrl(asset) : null;
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
              motionSrc={paidMotion}
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
              iconIds={iconIds}
              iconLabels={iconLabels}
            />
          ))}
        </div>
      )}
    </div>
  );
}
