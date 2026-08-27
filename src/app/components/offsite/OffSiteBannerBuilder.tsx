/**
 * Off-site Banner Builder — Meta / PMax ad creative.
 *
 * A 3-step wizard, mirroring the Thumbnail Builder's shape:
 *   1. Upload URLs        — one card per KV block, up to five products each;
 *                           Next fetches every filled slot and cuts out its
 *                           background
 *   2. Edit               — build every KV at 1200×1200 only, so one canvas
 *                           shape is being judged at a time
 *   3. Size Variation     — the wide cut of each KV, sharing the same assets
 *                           and differing only in where they sit; fixes here
 *                           apply to that size alone. Then ZIP.
 *
 * One block = one KV = one banner, delivered at both sizes. Each block owns its
 * own backdrop, logos, copy, price tags and disclaimer — two KVs share nothing
 * but the output font. Meta and PMax take the same two specs, so there is no
 * media split; output is blocks × sizes.
 *
 * Placement never happens on the block grid: clicking a block opens the layout
 * editor, the way the Store Page Modules banner does it.
 * See docs/superpowers/specs/2026-07-31-off-site-banner-builder-design.md.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { AppHeader } from '../AppHeader';
import { NavRail, type NavRailKey } from '../NavRail';
import { WizardBreadcrumb } from '../thumbnail/WizardBreadcrumb';
import { ImageGalleryModal } from '../ImageGalleryModal';
import { ImageCropModal, type CropState } from '../ImageCropModal';
import { BrushMaskEditor } from '../BrushMaskEditor';
import { useT } from '../../i18n/LanguageContext';
import type { DraftRecord } from '../../utils/draftStore';
import { useDraftSave } from '../../hooks/useDraftSave';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { useUndoableState } from '../../hooks/useUndoableState';
import { SaveForLaterButton, SaveDraftModal } from '../SaveForLaterButton';
import { UnsavedChangesModal } from '../UnsavedChangesModal';
import { restoreOffSite, type OffSitePayloadV1 } from '../../drafts/offsitePayload';
import { useApplyBrandFont } from '../../fonts/useApplyBrandFont';
import { BrandFontSelector } from '../../fonts/BrandFontSelector';
import { ensureBrandFontLoaded, fontFileTag, type BrandFontId } from '../../fonts/brandFonts';
import { scrapeProductImages, getProxiedImageUrl, type ScrapedImage } from '../../services/imageScraperApi';
import { structuralVerdict, lgImageKind, largestRendition } from '../../utils/lgImageFilter';
import { fetchAsDataUrl } from '../../utils/imageUrlLoader';
import { contractAlpha } from '../../utils/contractAlpha';
import { trimToOpaqueBounds } from '../../utils/trimOpaque';

import { OFFSITE_SIZES, isHorizontal, type OffSiteSize } from './offsiteSizes';
import {
  MAX_ITEMS_PER_BLOCK, MAX_OBJECTS_PER_BLOCK, MAX_OFFSITE_BLOCKS, MAX_PODIUMS_PER_BLOCK,
  DEFAULT_BG_COLOR, OFFSITE_LAYOUT, bannerBgColor, blockName, filledBlocks, makeOffSiteBlock,
  makeOffSiteProp,
  type BlockPlacement, type OffSiteBlock, type OffSiteCampaign, type OffSiteItem,
  type PlacedBox, type PricePlacement,
} from './offsiteTypes';
import { capLongestEdge, edgeColor, imageAspect, toBackdropSquare } from './offsiteImage';
import {
  BACKDROP_CROP_BOX, BACKDROP_GUIDE_OVERLAY, BACKDROP_SOURCE_SIZE, BACKDROP_UPLOAD_MAX,
} from './offsiteBackdropGuide';
import { OffSiteBannerTemplate } from './templates/OffSiteBannerTemplate';
import { OffSiteBlockPanel } from './OffSiteBlockPanel';
import { ColorPickerField } from './ColorPickerField';
import { FieldLabel, PanelSection } from '../brandshop/bigPromoCommon';

import { OffSiteUrlStep, slotKey, type SlotRef } from './OffSiteUrlStep';
import { OffSitePlacementModal } from './OffSitePlacementModal';

interface Props {
  railActive: NavRailKey;
  onRailNavigate: (target: NavRailKey) => void;
  onOpenDraft: (rec: DraftRecord) => void;
  /** Resume a saved draft: reuse its id and seed state from its payload. */
  initialDraft?: { id: string; title: string; payload: OffSitePayloadV1 };
}

/** How far the automatic cutout's edge is pulled in, in pixels. Half a pixel:
 *  enough to drop the mixed background/product rim, small enough that a thin
 *  stand or a cable does not thin out with it. */
const CUTOUT_CONTRACT = 0.5;

type Phase = 'urls' | 'edit' | 'variation';

export const OFFSITE_WIZARD_STEPS = ['1. Upload URLs', '2. Edit', '3. Size Variation & Download'];

const PHASES: Phase[] = ['urls', 'edit', 'variation'];
/** The size a KV is designed at. The rest are variations of it. */
const PRIMARY_SIZE = OFFSITE_SIZES[0];
/** Block previews. Both sizes render at the same scale so the wide banner reads
 *  as proportionally shorter, matching their real pixel ratio. */
const BLOCK_PREVIEW_W = 300;
/** The selection frame around a preview: `border-2` plus `p-3`, per side. Grid
 *  tracks have to allow for it, or the frame is laid out at the track width and
 *  the banner inside overflows it — the border stops lining up with the art. */
const BLOCK_FRAME_INSET = 2 + 12;
const BLOCK_CARD_W = BLOCK_PREVIEW_W + BLOCK_FRAME_INSET * 2;
/** Tailwind `gap-10`. Abreast previews need real air between them — at a
 *  tighter gap the neighbouring KV reads as part of the one being judged. */
const BLOCK_GRID_GAP = 40;
/** Ceiling on the Edit grid. `auto-fit` fills to whatever the window allows, so
 *  this only caps it: four across needs ~1880px of window (rail 64 + panel 320
 *  + page padding 64 alongside the tracks), and it falls back to three, two or
 *  one below that. */
const BLOCK_GRID_MAX_COLS = 4;

/**
 * Undo / redo, as one outlined pill in the panel's own vocabulary — the same
 * shape as "Reset layout" below it.
 *
 * Both halves carry a word, and split the width evenly. Two bare arrows sitting
 * at the top of a panel read as "previous / next", and this canvas holds
 * several banners side by side, so that is a reading the user can actually act
 * on by mistake.
 *
 * Both halves stay in place when there is nothing to step to — disabled rather
 * than hidden, so the control does not move under the cursor mid-sequence.
 */
function HistoryControls({
  undoLabel, redoLabel, canUndo, canRedo, onUndo, onRedo,
}: {
  undoLabel: string;
  redoLabel: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const half = 'flex items-center justify-center gap-1.5 py-2 text-sm transition-colors'
    + ' text-gray-500 enabled:hover:text-[#FD312E] disabled:cursor-not-allowed disabled:text-gray-300';
  return (
    <div className="flex overflow-hidden rounded-xl border border-gray-200">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title={`${undoLabel}  ⌘Z`}
        className={`${half} flex-1 border-r border-gray-200`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M9 14L4 9l5-5M4 9h9a7 7 0 010 14h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {undoLabel}
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title={`${redoLabel}  ⇧⌘Z`}
        className={`${half} flex-1`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M15 14l5-5-5-5M20 9h-9a7 7 0 000 14h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {redoLabel}
      </button>
    </div>
  );
}

async function waitForImages(el: HTMLElement) {
  await Promise.all(
    Array.from(el.querySelectorAll('img')).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        }),
    ),
  );
}

/** Two warm-up passes prime the font/image caches; the third is the real one. */
async function renderToPng(el: HTMLElement): Promise<string> {
  await waitForImages(el);
  await toPng(el, { pixelRatio: 1 });
  await toPng(el, { pixelRatio: 1 });
  return toPng(el, { pixelRatio: 1, cacheBust: true });
}

/**
 * Best product shot on a crawled page — the same structural classifier the
 * Thumbnail bulk flow uses, so both builders auto-pick identically.
 *
 * Then upgraded to the largest rendition of whatever it landed on. The
 * classifier reads size suffixes as a signal (a bare 3-digit one marks a hero
 * cutout), so it will happily settle on a 350px thumbnail while the same shot
 * sits in the list at 2010px. That is not a preference — it is the resolution
 * the cutout gets made at, and 350px is not enough outline to cut cleanly.
 */
function autoPickCutout(images: ScrapedImage[]): string | null {
  const all = images.map((im) => im.url);
  const structural = images.find((im) => structuralVerdict(im.url, true, false) === 'show');
  const pick = structural?.url
    ?? images.find((im) => lgImageKind(im.url) !== 'banner')?.url
    ?? images[0]?.url
    ?? null;
  return pick === null ? null : largestRendition(pick, all);
}

export function OffSiteBannerBuilder({ railActive, onRailNavigate, onOpenDraft, initialDraft }: Props) {
  const t = useT();
  // Computed once per mount; App remounts this component by draft id.
  const restored = useMemo(
    () => (initialDraft ? restoreOffSite(initialDraft.payload, t) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [fontId, setFontId] = useState<BrandFontId>(() => restored?.fontId ?? 'lg');
  useApplyBrandFont(fontId);

  const [phase, setPhase] = useState<Phase>(() => (restored ? 'edit' : 'urls'));
  // Undoable: every edit on step 2 goes through setBlocks, so one history over
  // this covers copy, colour, artwork, props, price tags and layout alike.
  const [blocks, setBlocks, history] = useUndoableState<OffSiteBlock[]>(
    () => restored?.blocks ?? [makeOffSiteBlock(t)],
  );
  // The key listener is bound per phase, so it reads the controls through a ref
  // rather than closing over the pair it happened to see when it was bound.
  const historyRef = useRef(history);
  historyRef.current = history;

  /** ⌘Z / ⌘⇧Z, except while typing — a textarea has its own undo, and taking
   *  the key from it would undo the whole banner instead of the sentence. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      if (phase === 'urls') return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      if (e.shiftKey) historyRef.current.redo();
      else historyRef.current.undo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  // Local draft ("Save for Later")
  const draftState = useMemo(() => ({ blocks, fontId }), [blocks, fontId]);
  const defaultDraftName = initialDraft?.title ?? 'Off-site Banner';
  const draft = useDraftSave({
    builder: 'off-site',
    initialDraftId: initialDraft?.id,
    state: draftState,
    title: defaultDraftName,
  });
  const {
    guard,
    showModal: showUnsavedModal,
    showNameModal: showUnsavedNameModal,
    handleSave: handleUnsavedSave,
    handleNameConfirm: handleUnsavedNameConfirm,
    handleNameCancel: handleUnsavedNameCancel,
    handleDiscard: handleUnsavedDiscard,
  } = useUnsavedGuard(draft, defaultDraftName);

  /** Only filled blocks become banners; the rest are step-1 scaffolding.
   *  Indices are into `blocks` so the layout editor patches the right row. */
  const shown = useMemo(
    () => filledBlocks(blocks).map((b) => ({ b, idx: blocks.indexOf(b) })),
    [blocks],
  );

  /** Block selected on step 2 — the panel edits this block's chrome. */
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  /** Which (block, size) layout editor is open. */
  const [layout, setLayout] = useState<{ idx: number; sizeId: string } | null>(null);
  /** An uploaded scene waiting to be framed against the safe area, and who it
   *  is for — the whole session (step 1) or one KV (the edit panel). */
  const [bgFit, setBgFit] = useState<{ src: string; target: 'all' | number } | null>(null);
  /** Price tag focused in the panel. Purely a panel highlight. */
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

  // LG.com crawl → image picker. Scrapes are cached per item so re-picking
  // does not re-crawl.
  const [gallerySlot, setGallerySlot] = useState<SlotRef | null>(null);
  const [scrapes, setScrapes] = useState<Record<string, ScrapedImage[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [downloading, setDownloading] = useState(false);
  /** Step-1 → step-2 prep run: crawl + cut out every filled slot. */
  const [prep, setPrep] = useState<{ done: number; total: number } | null>(null);
  /** Slots running background removal from the layout editor. */
  const [bgBusy, setBgBusy] = useState<Set<string>>(new Set());
  /** A panel import is crawling. */
  const [importing, setImporting] = useState(false);
  /** Open cutout touch-up: the image as supplied plus the auto-removed result. */
  const [brush, setBrush] = useState<{ ref: SlotRef; original: string; processed: string } | null>(null);

  // Full-size offscreen nodes, one per (block, size) — the export source.
  const stageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const stageKey = (blockId: string, sizeId: string) => `${blockId}|${sizeId}`;
  // Cache one callback per key: a fresh arrow each render would make React
  // detach and re-attach every stage node on every keystroke.
  const stageSetters = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const setStageRef = useCallback((key: string) => {
    let fn = stageSetters.current.get(key);
    if (!fn) {
      fn = (el: HTMLDivElement | null) => {
        if (el) stageRefs.current.set(key, el);
        else stageRefs.current.delete(key);
      };
      stageSetters.current.set(key, fn);
    }
    return fn;
  }, []);

  useEffect(() => {
    if (phase !== 'edit' || selectedIdx !== null) return;
    setSelectedIdx(shown[0]?.idx ?? 0);
  }, [phase, selectedIdx, shown]);

  function patchCampaign(idx: number, patch: Partial<OffSiteCampaign>) {
    setBlocks((list) =>
      list.map((b, i) => (i === idx ? { ...b, campaign: { ...b.campaign, ...patch } } : b)),
    );
  }

  function patchBlock(idx: number, patch: Partial<OffSiteBlock>) {
    setBlocks((list) => list.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }

  function patchItem(ref: SlotRef, patch: Partial<OffSiteItem>) {
    setBlocks((list) =>
      list.map((b, i) =>
        i === ref.block
          ? { ...b, items: b.items.map((it, s) => (s === ref.slot ? { ...it, ...patch } : it)) }
          : b,
      ),
    );
  }

  /** Patch one size's placement entry, leaving the other size untouched. */
  function patchPlacement(idx: number, sizeId: string, patch: (p: BlockPlacement) => BlockPlacement) {
    setBlocks((list) =>
      list.map((b, i) =>
        i === idx
          ? { ...b, placements: { ...b.placements, [sizeId]: patch(b.placements[sizeId]) } }
          : b,
      ),
    );
  }

  const setSlotBox = (
    idx: number, sizeId: string, key: 'products' | 'podiums' | 'objects', slot: number, box: PlacedBox,
  ) =>
    patchPlacement(idx, sizeId, (p) => ({
      ...p,
      [key]: p[key].map((b, s) => (s === slot ? box : b)),
    }));

  function movePrice(idx: number, sizeId: string, index: number, place: PricePlacement) {
    setBlocks((list) =>
      list.map((b, i) =>
        i === idx
          ? {
              ...b,
              campaign: {
                ...b.campaign,
                pricePlacements: {
                  ...b.campaign.pricePlacements,
                  [sizeId]: (b.campaign.pricePlacements[sizeId] ?? []).map((p, n) =>
                    n === index ? place : p,
                  ),
                },
              },
            }
          : b,
      ),
    );
  }

  /* ── Background: one upload, framed per size ─────────────────────── */

  /**
   * Canvas colors read off the scene itself, one per delivery size.
   *
   * Which edge to read is not a guess: each size's blind records the side its
   * fade starts from, and that side is where the scene meets flat color. The
   * square takes its top, the wide its left — the same photo is often a
   * different tone on each, which is exactly why one shared color could not
   * serve both. `backgroundColor` keeps the primary size's value so anything
   * still reading the flat field agrees with what the square shows.
   */
  async function sampledBgColors(source: string): Promise<Partial<OffSiteCampaign>> {
    const entries = await Promise.all(
      OFFSITE_SIZES.map(async (s) => {
        const layout = OFFSITE_LAYOUT[s.id];
        return [s.id, layout ? await edgeColor(source, layout.blind.fade.from) : null] as const;
      }),
    );
    const bySize: Record<string, string> = {};
    for (const [id, hex] of entries) if (hex) bySize[id] = hex;
    if (Object.keys(bySize).length === 0) return {};
    return {
      backgroundColorBySize: bySize,
      ...(bySize[PRIMARY_SIZE.id] ? { backgroundColor: bySize[PRIMARY_SIZE.id] } : null),
    };
  }

  /**
   * Both canvas colours, back to the scene's own.
   *
   * "Original" here is not the app's default but the colour sampled off the
   * backdrop when it was chosen — that is what the blind fades the scene's edge
   * into, so it is the value the size was built around. Only a session with no
   * backdrop at all falls back to DEFAULT_BG_COLOR.
   */
  async function resetBgColors() {
    const source = blocks[0]?.campaign.backgroundOriginal;
    for (const size of OFFSITE_SIZES) {
      const layout = OFFSITE_LAYOUT[size.id];
      const hex = source && layout ? await edgeColor(source, layout.blind.fade.from) : null;
      applyBgColor(size.id, hex ?? DEFAULT_BG_COLOR);
    }
  }

  /**
   * The shared backdrop: one square scene serves both sizes, each placing it at
   * its own scale and offset behind its blind, so there is nothing to pre-cut
   * and nothing to re-frame per size.
   *
   * Picking a scene also sets the canvas color from it, the same way framing an
   * upload does — the color is what the blind fades the scene's top edge into,
   * so it belongs to the scene rather than to whatever was chosen before it.
   */
  /** One size's canvas color, across the session. Shared like the rest of the
   *  campaign chrome — the sizes differ from each other, not the banners. */
  function applyBgColor(sizeId: string, hex: string) {
    setBlocks((list) =>
      list.map((b) => ({
        ...b,
        campaign: {
          ...b.campaign,
          backgroundColorBySize: { ...b.campaign.backgroundColorBySize, [sizeId]: hex },
          // Keep the flat field in step with the size it was named after.
          ...(sizeId === PRIMARY_SIZE.id ? { backgroundColor: hex } : null),
        },
      })),
    );
  }

  async function applyBackgroundToAll(source: string) {
    applySharedCampaign({
      backgroundSource: source,
      backgroundOriginal: source,
      backgroundCrop: undefined,
      ...(await sampledBgColors(source)),
    });
  }

  /**
   * Campaign fields the whole session agrees on — backdrop, logos, background
   * and copy colour. Written to every block at once: a set of banners that
   * disagreed on its ink or its lockup would not read as one campaign.
   */
  function applySharedCampaign(patch: Partial<OffSiteCampaign>) {
    setBlocks((list) => list.map((b) => ({ ...b, campaign: { ...b.campaign, ...patch } })));
  }

  /** Open the framing editor on an upload, capped first — the raw file becomes
   *  the campaign's crop source and would otherwise ride along in every draft. */
  async function openBackdropFit(src: string, target: 'all' | number) {
    setBgFit({ src: await capLongestEdge(src, BACKDROP_UPLOAD_MAX), target });
  }

  /**
   * An uploaded scene, framed. Normalised to the guide's square first so the
   * layout table's windows land where they were measured, and so a draft does
   * not carry a 2600² PNG per KV.
   */
  async function handleBackdropFit(cropped: string, crop: CropState) {
    const fit = bgFit;
    setBgFit(null);
    if (!fit) return;
    const backgroundOriginal = await toBackdropSquare(cropped, BACKDROP_SOURCE_SIZE);
    // The source and the framing survive; only the framed result is replaced.
    const patch: Partial<OffSiteCampaign> = {
      backgroundSource: fit.src,
      backgroundOriginal,
      backgroundCrop: crop,
      ...(await sampledBgColors(backgroundOriginal)),
    };
    if (fit.target === 'all') applySharedCampaign(patch);
    else patchCampaign(fit.target, patch);
  }

  /* ── Artwork ─────────────────────────────────────────────────────── */

  /**
   * Put a cutout in a slot and drop the stored boxes it invalidates.
   *
   * Adding or removing a product changes the KV's product count, so the whole
   * auto row has to re-flow; swapping one product's art only invalidates that
   * slot, and re-flowing the rest would throw away placement the user had
   * already settled.
   */
  /** `untrimmed` is what the brush editor will be handed if this cutout is
   *  reopened; pass it whenever one exists, or the edit cannot be resumed. */
  async function setCutout(ref: SlotRef, dataUrl: string | null, untrimmed?: string | null) {
    const aspect = dataUrl ? await imageAspect(dataUrl) : 1;
    setBlocks((list) =>
      list.map((b, i) => {
        if (i !== ref.block) return b;
        const countChanged = (b.items[ref.slot]?.image === null) !== (dataUrl === null);
        const items = b.items.map((it, s) =>
          s === ref.slot
            ? {
                ...it,
                image: dataUrl,
                aspect,
                editedCutout: untrimmed !== undefined ? untrimmed : dataUrl === null ? null : it.editedCutout,
              }
            : it,
        );
        const placements = { ...b.placements };
        for (const s of OFFSITE_SIZES) {
          const cur = placements[s.id];
          placements[s.id] = countChanged
            ? {
                ...cur,
                products: Array(MAX_ITEMS_PER_BLOCK).fill(null),
                podiums: Array(MAX_ITEMS_PER_BLOCK).fill(null),
                order: undefined,
              }
            : {
                ...cur,
                products: cur.products.map((box, sl) => (sl === ref.slot ? null : box)),
              };
        }
        return { ...b, items, placements };
      }),
    );
  }

  /**
   * Empty a product slot. The URL and name go with the cutout so the slot reads
   * as free on step 1 and can be refilled; the auto row re-flows because the
   * KV's product count changed.
   */
  function clearProduct(idx: number, slot: number) {
    setBlocks((list) =>
      list.map((b, i) => {
        if (i !== idx) return b;
        const items = b.items.map((it, s) =>
          s === slot
            ? { ...it, sourceUrl: '', name: '', image: null, sourceImage: null, editedCutout: null, aspect: 1 }
            : it,
        );
        const placements = { ...b.placements };
        for (const sz of OFFSITE_SIZES) {
          placements[sz.id] = {
            ...placements[sz.id],
            products: Array(MAX_ITEMS_PER_BLOCK).fill(null),
            order: undefined,
          };
        }
        return { ...b, items, placements };
      }),
    );
  }

  /**
   * Upload drops into the block's first slot with no image, and goes through
   * background removal exactly as a fetched shot does — an uploaded product
   * arrives on its own studio backdrop just as often as a crawled one.
   *
   * The file name becomes the item's name, which is what makes the slot read as
   * taken on step 1 (it has no URL to show) and what names the export.
   */
  function uploadIntoBlock(idx: number, dataUrl: string, fileName: string) {
    const slot = blocks[idx]?.items.findIndex((i) => !i.image);
    if (slot === undefined || slot < 0) return;
    const ref = { block: idx, slot };
    patchItem(ref, { name: fileName.replace(/\.[^.]+$/, '') });
    void supplyCutout(ref, dataUrl);
  }

  /**
   * Add products from the Edit step, filling the block's free slots in order.
   * A single file goes through the touch-up editor the way a swap does; a batch
   * skips it, because one modal per file would stall the drop.
   */
  /**
   * Import a product mid-edit: crawl an LG.com page into this KV's next free
   * slot, exactly as step 1 does, and cut its background out.
   *
   * The placement is left alone on purpose: `setCutout` sees the product count
   * change and re-flows the auto row itself, so one added here lands exactly
   * where one added at step 1 would.
   */
  async function importProduct(idx: number, url: string) {
    const block = blocks[idx];
    if (!block) return;
    const slot = block.items.findIndex((it) => !it.image);
    if (slot < 0) return;
    const ref = { block: idx, slot };
    patchItem(ref, { sourceUrl: url });
    setImporting(true);
    try {
      await fetchOne(ref, true, url);
    } finally {
      setImporting(false);
    }
  }

  async function addProducts(idx: number, dataUrls: string[]) {
    const block = blocks[idx];
    if (!block) return;
    const free = block.items.map((it, s) => (it.image ? -1 : s)).filter((s) => s >= 0);
    const take = dataUrls.slice(0, free.length);
    if (take.length === 0) return;
    if (take.length === 1) {
      await supplyCutout({ block: idx, slot: free[0] }, take[0]);
      return;
    }
    const raw = await Promise.all(take.map(cutOut));
    const cut = await Promise.all(raw.map(trimToOpaqueBounds));
    const aspects = await Promise.all(cut.map(imageAspect));
    setBlocks((list) =>
      list.map((b, i) => {
        if (i !== idx) return b;
        const items = [...b.items];
        take.forEach((src, n) => {
          items[free[n]] = {
            ...items[free[n]],
            image: cut[n], sourceImage: src, editedCutout: raw[n], aspect: aspects[n],
          };
        });
        // The product count changed, so the whole auto row has to re-flow.
        const placements = { ...b.placements };
        for (const s of OFFSITE_SIZES) {
          placements[s.id] = {
            ...placements[s.id],
            products: Array(MAX_ITEMS_PER_BLOCK).fill(null),
            order: undefined,
          };
        }
        return { ...b, items, placements };
      }),
    );
  }

  /** A new KV seeds from the last one's chrome — same campaign, different
   *  products — but is a deep copy, so editing one never touches the other. */
  function addBlock() {
    setBlocks((list) =>
      list.length >= MAX_OFFSITE_BLOCKS
        ? list
        : [...list, makeOffSiteBlock(t, list[list.length - 1]?.campaign)],
    );
  }

  function removeBlock(idx: number) {
    setBlocks((list) => list.filter((_, i) => i !== idx));
    setSelectedIdx(null);
    setLayout(null);
  }

  /** Reset one size back to the auto row; the other size keeps its boxes. */
  function resetLayout(idx: number, sizeId: string) {
    patchPlacement(idx, sizeId, () => ({
      products: Array(MAX_ITEMS_PER_BLOCK).fill(null),
      podiums: Array(MAX_PODIUMS_PER_BLOCK).fill(null),
      objects: Array(MAX_OBJECTS_PER_BLOCK).fill(null),
    }));
  }

  function reorder(idx: number, sizeId: string, order: string[]) {
    patchPlacement(idx, sizeId, (p) => ({ ...p, order }));
  }

  /** Add one or several props at once. Measuring up front and appending in a
   *  single update keeps a multi-file drop from racing itself over the cap. */
  async function addProps(idx: number, kind: 'podiums' | 'objects', srcs: string[]) {
    const max = kind === 'podiums' ? MAX_PODIUMS_PER_BLOCK : MAX_OBJECTS_PER_BLOCK;
    const room = max - (blocks[idx]?.[kind].length ?? 0);
    const take = srcs.slice(0, Math.max(0, room));
    if (take.length === 0) return;
    const measured = await Promise.all(
      take.map(async (src) => makeOffSiteProp(src, await imageAspect(src))),
    );
    setBlocks((list) =>
      list.map((b, i) =>
        i === idx ? { ...b, [kind]: [...b[kind], ...measured].slice(0, max) } : b,
      ),
    );
  }

  /** Removing a prop shifts the ones after it down, so their stored boxes have
   *  to shift with them or every prop would jump to its neighbour's place. */
  function removeProp(idx: number, kind: 'podiums' | 'objects', at: number) {
    setBlocks((list) =>
      list.map((b, i) => {
        if (i !== idx) return b;
        const placements = { ...b.placements };
        for (const s of OFFSITE_SIZES) {
          const cur = placements[s.id];
          const boxes = cur[kind].filter((_, n) => n !== at);
          boxes.push(null);
          const prefix = kind === 'podiums' ? 'podium' : 'object';
          placements[s.id] = {
            ...cur,
            [kind]: boxes,
            order: cur.order?.filter((k) => k !== `${prefix}:${at}`),
          };
        }
        return { ...b, [kind]: b[kind].filter((_, n) => n !== at), placements };
      }),
    );
  }

  function flipProp(idx: number, kind: 'podiums' | 'objects', at: number, flipX: boolean) {
    setBlocks((list) =>
      list.map((b, i) =>
        i === idx
          ? { ...b, [kind]: b[kind].map((p, n) => (n === at ? { ...p, flipX } : p)) }
          : b,
      ),
    );
  }

  function toggleLock(idx: number, sizeId: string, key: string) {
    patchPlacement(idx, sizeId, (p) => {
      const cur = p.locked ?? [];
      return { ...p, locked: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });
  }

  /* ── LG.com fetch ────────────────────────────────────────────────── */

  /** Crawl one slot and auto-pick its cutout. Failures land on the row rather
   *  than throwing, so a bulk run finishes the remaining slots. */
  async function fetchOne(ref: SlotRef, cutBackground = false, urlOverride?: string) {
    const item = blocks[ref.block]?.items[ref.slot];
    // `urlOverride` is for an import started in the same tick the URL was set:
    // `blocks` here is still the render's copy and would not have it yet.
    const sourceUrl = urlOverride ?? item?.sourceUrl;
    if (!item || !sourceUrl) return;
    setErrors((e) => ({ ...e, [item.id]: '' }));
    try {
      const result = await scrapeProductImages(sourceUrl);
      if (result.error || result.images.length === 0) {
        setErrors((e) => ({ ...e, [item.id]: result.error || t('No images found on that page.') }));
        return;
      }
      setScrapes((s) => ({ ...s, [item.id]: result.images }));
      const name = item.name || result.productName || result.modelName || '';
      if (name !== item.name) patchItem(ref, { name });
      const pick = autoPickCutout(result.images);
      if (!pick) return;
      const dataUrl = await fetchAsDataUrl(getProxiedImageUrl(pick));
      if (!dataUrl) {
        setErrors((e) => ({ ...e, [item.id]: t('Could not load that image.') }));
        return;
      }
      patchItem(ref, { sourceImage: dataUrl });
      if (cutBackground) {
        // Keep the untrimmed cut: it is what "Edit background removal" resumes
        // from, and re-cutting the trimmed one would have little left to find.
        const cut = await cutOut(dataUrl);
        await setCutout(ref, await trimToOpaqueBounds(cut), cut);
      } else {
        await setCutout(ref, dataUrl, null);
      }
    } catch (err) {
      console.error('Off-site fetch failed:', err);
      setErrors((e) => ({ ...e, [item.id]: t('Could not load that image.') }));
    }
  }

  /** Flood-fill the near-white studio background out of a fetched shot, then
   *  pull the edge in by CUTOUT_CONTRACT to drop the pale rim the removal
   *  leaves behind. Loaded on demand so its canvas code stays out of the
   *  initial bundle. Does NOT trim — the brush editor needs the cutout to line
   *  up pixel-for-pixel with the original so its restore brush can sample it,
   *  and contracting moves no pixels. */
  async function cutOut(dataUrl: string): Promise<string> {
    const { removeBackgroundAI } = await import('../brandshop/modules/aiBgRemoval');
    return contractAlpha(await removeBackgroundAI(dataUrl), CUTOUT_CONTRACT);
  }

  /**
   * "Edit background removal": reopen the brush on the cutout as it currently
   * stands, so a second visit continues the first rather than discarding it.
   * Only a slot that has never been through the editor gets a fresh automatic
   * pass. Both arms measure against `sourceImage`, the shot as supplied, which
   * is what the restore brush samples from.
   */
  async function removeBgAt(ref: SlotRef) {
    const item = blocks[ref.block]?.items[ref.slot];
    const source = item?.sourceImage ?? item?.image;
    if (!source) return;
    await withBgBusy(ref, async () => {
      setBrush({
        ref,
        original: source,
        processed: item?.editedCutout ?? (await cutOut(source)),
      });
    });
  }

  async function withBgBusy(ref: SlotRef, run: () => Promise<void>) {
    const key = slotKey(ref);
    setBgBusy((s) => new Set(s).add(key));
    try {
      await run();
    } finally {
      setBgBusy((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  }

  /**
   * New artwork supplied from the panel: cut the background out, then open the
   * touch-up editor on the result. The step-1 bulk run deliberately does NOT go
   * through here — a modal per product would stall the batch.
   */
  async function supplyCutout(ref: SlotRef, dataUrl: string) {
    patchItem(ref, { sourceImage: dataUrl });
    await withBgBusy(ref, async () => {
      const processed = await cutOut(dataUrl);
      setBrush({ ref, original: dataUrl, processed });
    });
  }

  /**
   * Step 1 → step 2. Crawls every filled slot that has no cutout yet, picks the
   * product shot and removes its background, then advances.
   *
   * Sequential on purpose: every page goes through the same crawl proxy, and
   * firing a dozen at once is what trips its rate limiting.
   */
  async function prepareAndAdvance() {
    const todo: SlotRef[] = [];
    blocks.forEach((b, bi) =>
      b.items.forEach((it, si) => {
        if (it.sourceUrl && !it.image) todo.push({ block: bi, slot: si });
      }),
    );
    if (todo.length === 0) {
      setPhase('edit');
      return;
    }
    setPrep({ done: 0, total: todo.length });
    try {
      for (let i = 0; i < todo.length; i++) {
        await fetchOne(todo[i], true);
        setPrep({ done: i + 1, total: todo.length });
      }
    } finally {
      setPrep(null);
    }
    // The crawl wrote through the same setter the editing does, so it left a
    // history behind it. Nothing on step 1 is an edit to step back through.
    history.clear();
    setPhase('edit');
  }

  async function handleGallerySelect(source: ScrapedImage) {
    const ref = gallerySlot;
    setGallerySlot(null);
    if (!ref) return;
    const item = blocks[ref.block]?.items[ref.slot];
    // `source.url` is already the largest rendition — ImageGalleryModal upgrades
    // it on the way out, so every picker gets the full-size original.
    const dataUrl = await fetchAsDataUrl(getProxiedImageUrl(source.url));
    if (!dataUrl) {
      if (item) setErrors((e) => ({ ...e, [item.id]: t('Could not load that image.') }));
      return;
    }
    await supplyCutout(ref, dataUrl);
  }

  /* ── Export ──────────────────────────────────────────────────────── */

  async function handleDownloadAll() {
    setDownloading(true);
    try {
      await ensureBrandFontLoaded(fontId);
      const zip = new JSZip();
      const d = new Date();
      const date6 = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const tag = fontFileTag(fontId);
      for (let i = 0; i < shown.length; i++) {
        const block = shown[i].b;
        const name = blockName(block, i);
        for (const size of OFFSITE_SIZES) {
          const el = stageRefs.current.get(stageKey(block.id, size.id));
          if (!el) continue;
          const png = await renderToPng(el);
          zip.file(`off-site-${name}-${size.id}-${tag}${date6}.png`, png.split(',')[1], { base64: true });
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `LG-off-site-banner-${date6}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setDownloading(false);
    }
  }

  /** Step 1 has nothing to do until a slot is filled, so Next stays off — the
   *  same gate the other builders put on their first step. */
  const canAdvance =
    phase !== 'urls' ||
    blocks.some((b) => b.items.some((i) => i.image !== null || i.sourceUrl.trim() !== ''));

  const next = useMemo(() => {
    if (phase === 'urls') return { to: 'edit' as Phase, label: 'Next: Edit' };
    if (phase === 'edit') return { to: 'variation' as Phase, label: 'Next: Size Variation' };
    return null;
  }, [phase]);

  // The font selector is hidden on step 1 — that step is URL fetching, where no
  // output type is on screen to judge the change against.
  const showFontSelector = phase !== 'urls';

  /** One size of one block. The preview turns into a hotspot that opens that
   *  size's layout editor — matching how the Store Page Modules banner reveals
   *  its "Click to edit" target. */
  function renderPreview(block: OffSiteBlock, idx: number, size: OffSiteSize, editable: boolean) {
    const scale = BLOCK_PREVIEW_W / size.w;
    return (
      <div key={size.id} className="flex flex-col gap-2">
        <div
          className="relative shadow-xl overflow-hidden bg-white"
          style={{ width: BLOCK_PREVIEW_W, height: size.h * scale, flexShrink: 0 }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <OffSiteBannerTemplate sizeId={size.id} block={block} fontId={fontId} />
          </div>
          {editable && (
            <div
              onClick={(e) => { e.stopPropagation(); setLayout({ idx, sizeId: size.id }); }}
              className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity"
              style={{ background: 'rgba(0,0,0,0.45)' }}
            >
              <span className="rounded-full px-3 py-1.5 text-xs font-medium text-white" style={{ background: 'rgba(0,0,0,0.35)' }}>
                {t('Click to edit layout')}
              </span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-400">
          {size.w} × {size.h} · {isHorizontal(size) ? t('wide') : t('square')}
        </p>
      </div>
    );
  }

  /**
   * One KV. On Edit that is the primary size alone — the KV is designed once,
   * at one shape — and clicking the card selects it so the panel edits its
   * chrome. On Size Variation every size is shown and each opens its own layout
   * editor, because a fix there belongs to that size only.
   */
  function renderBlock(block: OffSiteBlock, idx: number, ordinal: number) {
    const count = block.items.filter((i) => i.image).length;
    const designing = phase === 'edit';
    const selected = designing && selectedIdx === idx;
    const sizes = designing ? [PRIMARY_SIZE] : OFFSITE_SIZES;
    return (
      <div key={block.id} className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-gray-400">
          {t('Banner')} {ordinal + 1}
          {block.title ? ` — ${block.title}` : ''}
          <span className="ml-2 normal-case tracking-normal text-gray-300">
            {count} {t('products')}
          </span>
        </p>
        <div
          className={`flex flex-wrap items-start gap-5 rounded-2xl border-2 p-3 transition-colors ${
            designing
              ? selected
                ? 'cursor-pointer border-[#FD312E] bg-white/70'
                : 'cursor-pointer border-transparent bg-white/50 hover:border-gray-300'
              // Size Variation shows one KV's sizes side by side; the card is
              // what says which sizes belong together once there are ten of them.
              : 'border-gray-200 bg-white/50'
          }`}
          onClick={designing ? () => setSelectedIdx(idx) : undefined}
        >
          {sizes.map((size) => renderPreview(block, idx, size, designing ? selected : true))}
        </div>
      </div>
    );
  }

  const selectedBlock = selectedIdx !== null ? blocks[selectedIdx] : null;
  const bgFitBlock = bgFit ? (bgFit.target === 'all' ? blocks[0] : blocks[bgFit.target]) : null;
  const layoutBlock = layout ? blocks[layout.idx] : null;
  /** 1-based label for a block, counting only the ones that will export. */
  const ordinalOf = (idx: number) => {
    const n = shown.findIndex((s) => s.idx === idx);
    return (n >= 0 ? n : idx) + 1;
  };
  const galleryItem = gallerySlot ? blocks[gallerySlot.block]?.items[gallerySlot.slot] : null;

  return (
    // The canvas rides the page scroll so a tall stack of KVs reads as one
    // document; the header, the step bar and the edit panel stick, so the
    // controls stay put while it moves.
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col">
      <div className="sticky top-0 z-30">
      <AppHeader
        title={t('Off-site Banner Builder')}
        onBack={() => guard(() => onRailNavigate('home'))}
        right={
          <div className="flex items-center gap-3">
            {showFontSelector && <BrandFontSelector value={fontId} onChange={setFontId} />}
            <SaveForLaterButton draft={draft} defaultName={defaultDraftName} disabled={!draft.dirty} />
            {next ? (
              <button
                onClick={() => (phase === 'urls' ? void prepareAndAdvance() : setPhase(next.to))}
                disabled={prep !== null || !canAdvance}
                className="flex items-center gap-2 bg-[#FD312E] hover:bg-[#E22825] text-white text-sm font-medium px-5 py-2 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <span style={{ lineHeight: '20px' }}>
                  {prep
                    ? t('Importing… {done}/{total}')
                        .replace('{done}', String(prep.done))
                        .replace('{total}', String(prep.total))
                    : t(next.label)}
                </span>
              </button>
            ) : (
              <button
                onClick={handleDownloadAll}
                disabled={downloading}
                className="flex items-center gap-2 bg-[#FD312E] hover:bg-[#E22825] text-white text-sm font-medium px-5 py-2 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 15l-4-4h3V4h2v7h3l-4 4zM4 18h16v2H4v-2z" fill="currentColor" />
                </svg>
                <span style={{ lineHeight: '20px' }}>
                  {downloading ? t('Preparing…') : t('Download ZIP')}
                </span>
              </button>
            )}
          </div>
        }
      />
      </div>

      <div className="flex-1 flex">
        <NavRail
          active={railActive}
          onNavigate={(key) => guard(() => onRailNavigate(key))}
          onOpenDraft={onOpenDraft}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          <div className="sticky top-16 z-20">
            <WizardBreadcrumb
              steps={OFFSITE_WIZARD_STEPS}
              activeStep={PHASES.indexOf(phase) + 1}
              onStepClick={(n) => setPhase(PHASES[n - 1])}
            />
          </div>

          <div className="flex-1">
            {phase === 'urls' ? (
              <OffSiteUrlStep
                blocks={blocks}
                onChangeItem={patchItem}
                onAddBlock={addBlock}
                onUpload={uploadIntoBlock}
                onRemoveProduct={clearProduct}
                errors={errors}
              />
            ) : (
              <div className="p-8 flex flex-col gap-10">
                {shown.length === 0 ? (
                  // Nothing filled in yet: still show the campaign so its copy
                  // and backdrop can be judged, but make clear it exports nothing.
                  <div className="flex flex-col gap-3">
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                      {t('Preview only — add a product on step 1 for this to export.')}
                    </p>
                    {renderBlock(blocks[0], 0, 0)}
                  </div>
                ) : phase === 'edit' ? (
                  // One shape per KV on Edit, so they tile. The preview stays
                  // at a size where the copy is still legible; how many fit per
                  // row follows from the window.
                  <div
                    className="grid gap-10"
                    style={{
                      gridTemplateColumns: `repeat(auto-fit, ${BLOCK_CARD_W}px)`,
                      maxWidth:
                        BLOCK_CARD_W * BLOCK_GRID_MAX_COLS +
                        BLOCK_GRID_GAP * (BLOCK_GRID_MAX_COLS - 1),
                    }}
                  >
                    {shown.map(({ b, idx }, n) => renderBlock(b, idx, n))}
                  </div>
                ) : (
                  shown.map(({ b, idx }, n) => renderBlock(b, idx, n))
                )}
                {phase === 'variation' && shown.length > 0 && (
                  <p className="text-xs text-gray-400">
                    {t('Total')}: {shown.length * OFFSITE_SIZES.length} {t('files')}
                  </p>
                )}
              </div>
            )}
          </div>
        </main>

        {phase === 'edit' && (
          <aside className="w-80 shrink-0 bg-white border-l border-gray-200 p-5 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Above the panel rather than in the app header: what it steps back
                through is the editing done here, and at the top of the header it
                sat among actions that leave the step entirely. */}
            <div className="mb-5">
              <HistoryControls
                undoLabel={t('Undo')}
                redoLabel={t('Redo')}
                canUndo={history.canUndo}
                canRedo={history.canRedo}
                onUndo={history.undo}
                onRedo={history.redo}
              />
            </div>
            {selectedBlock && selectedIdx !== null ? (
              <OffSiteBlockPanel
                  block={selectedBlock}
                  ordinal={ordinalOf(selectedIdx)}
                  onChangeBlock={(patch) => patchBlock(selectedIdx, patch)}
                  onChangeCampaign={(patch) => patchCampaign(selectedIdx, patch)}
                  onChangeItem={(slot, patch) => patchItem({ block: selectedIdx, slot }, patch)}
                  onChangeShared={applySharedCampaign}
                  bgColor={bannerBgColor(selectedBlock.campaign, PRIMARY_SIZE.id)}
                  onChangeBgColor={(hex) => applyBgColor(PRIMARY_SIZE.id, hex)}
                  onPickBackground={(src) => void applyBackgroundToAll(src)}
                  onUploadBackground={(src) => void openBackdropFit(src, 'all')}
                  onEditBackgroundCrop={() => {
                    const src = selectedBlock.campaign.backgroundSource;
                    if (src) setBgFit({ src, target: 'all' });
                  }}
                  onAddProps={(kind, srcs) => void addProps(selectedIdx, kind, srcs)}
                  onAddProducts={(srcs) => void addProducts(selectedIdx, srcs)}
                  onImportProduct={(url) => void importProduct(selectedIdx, url)}
                  importingProduct={importing}
                  onRemoveProduct={(slot) => clearProduct(selectedIdx, slot)}
                  onRemoveProp={(kind, at) => removeProp(selectedIdx, kind, at)}
                  onFlipProp={(kind, at, v) => flipProp(selectedIdx, kind, at, v)}
                  onPickImage={(slot) => setGallerySlot({ block: selectedIdx, slot })}
                  hasImages={(slot) => (scrapes[selectedBlock.items[slot]?.id ?? '']?.length ?? 0) > 0}
                  onRemoveBg={(slot) => void removeBgAt({ block: selectedIdx, slot })}
                  busySlots={
                    new Set(
                      [...bgBusy]
                        .filter((k) => k.startsWith(`${selectedIdx}:`))
                        .map((k) => Number(k.split(':')[1])),
                    )
                  }
                  selectedPriceIndex={selectedPrice}
                  onSelectPrice={setSelectedPrice}
                />
            ) : (
              <p className="text-sm text-gray-400">{t('Click a banner on the canvas to edit it.')}</p>
            )}
          </aside>
        )}

        {/* Size Variation keeps the same panel, holding what belongs to a size
            rather than to a banner. The two sizes fade the scene in from
            different sides, so each meets it at a different tone and carries
            its own canvas color — and this is the step that shows both at once
            to compare. */}
        {phase === 'variation' && (
          <aside className="w-80 shrink-0 bg-white border-l border-gray-200 p-5 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex flex-col gap-6">
              {OFFSITE_SIZES.map((s) => (
                <PanelSection key={s.id} title={`${s.w} × ${s.h}`}>
                  <FieldLabel>{t('Background color')}</FieldLabel>
                  <ColorPickerField
                    value={bannerBgColor(blocks[0].campaign, s.id)}
                    onChange={(hex) => applyBgColor(s.id, hex)}
                  />
                </PanelSection>
              ))}

              {/* One button for both sizes. Each size samples its own edge of the
                  same scene, so they are never reset apart in practice — two
                  links would have been two ways to do one thing. */}
              <button
                type="button"
                onClick={() => void resetBgColors()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 transition-colors hover:border-[#FD312E] hover:text-[#FD312E]"
              >
                <RotateCcw size={14} />
                {t('Reset background color')}
              </button>
            </div>
          </aside>
        )}
      </div>

      {gallerySlot && (
        <ImageGalleryModal
          images={scrapes[galleryItem?.id ?? ''] ?? []}
          isLoading={false}
          error={null}
          onSelect={handleGallerySelect}
          onCancel={() => setGallerySlot(null)}
          whiteBackgroundOnly
        />
      )}

      {layoutBlock && layout && (
        <OffSitePlacementModal
          block={layoutBlock}
          index={ordinalOf(layout.idx) - 1}
          sizeId={layout.sizeId}
          fontId={fontId}
          onMoveProduct={(slot, box) => setSlotBox(layout.idx, layout.sizeId, 'products', slot, box)}
          onMovePodium={(slot, box) => setSlotBox(layout.idx, layout.sizeId, 'podiums', slot, box)}
          onMoveObject={(at, box) => setSlotBox(layout.idx, layout.sizeId, 'objects', at, box)}
          onMovePrice={(i, place) => movePrice(layout.idx, layout.sizeId, i, place)}
          onReorder={(order) => reorder(layout.idx, layout.sizeId, order)}
          onToggleLock={(key) => toggleLock(layout.idx, layout.sizeId, key)}
          onResetLayout={() => resetLayout(layout.idx, layout.sizeId)}
          onClose={() => setLayout(null)}
        />
      )}

      {/* Cutout touch-up. Cancel keeps the automatic result — the brush is for
          fixing it, not for choosing whether to cut out at all. */}
      {brush && (
        <BrushMaskEditor
          originalUrl={brush.original}
          processedUrl={brush.processed}
          onDone={(result) => {
            // Trim after the brush, not before: the editor needs the processed
            // image to match the original's frame.
            void trimToOpaqueBounds(result).then((tight) => setCutout(brush.ref, tight, result));
            setBrush(null);
          }}
          onCancel={() => {
            void trimToOpaqueBounds(brush.processed).then((tight) => setCutout(brush.ref, tight, brush.processed));
            setBrush(null);
          }}
        />
      )}

      {/* Framing an uploaded scene. The guide overlay is the designer's, drawn
          on the crop frame: keep the subject inside the safe square and both
          delivery sizes will show it. */}
      {bgFit && (
        <ImageCropModal
          imageSrc={bgFit.src}
          aspectRatio={1}
          title={t('Place the background')}
          bgFill={
            bgFitBlock?.campaign.backgroundColor ?? DEFAULT_BG_COLOR
          }
          cropFrameOverlay={BACKDROP_GUIDE_OVERLAY}
          overlayToggleLabel={t('Guide')}
          canvasHeight={BACKDROP_CROP_BOX}
          // A fixed box rather than an aspect: it keeps the frame — and the
          // guide pinned to it — the same size whatever shape the upload is,
          // and makes react-easy-crop zoom a small or portrait image up to
          // cover it instead of shrinking the frame to fit the image.
          cropSize={{ width: BACKDROP_CROP_BOX, height: BACKDROP_CROP_BOX }}
          // A scene has to reach every edge of the square: the two sizes read
          // different parts of it, and a margin here becomes a bar in a banner.
          lockToCover
          onConfirm={(cropped, crop) => void handleBackdropFit(cropped, crop)}
          {...(bgFitBlock?.campaign.backgroundCrop
            ? {
                initialCrop: bgFitBlock.campaign.backgroundCrop.crop,
                initialZoom: bgFitBlock.campaign.backgroundCrop.zoom,
                initialAspect: bgFitBlock.campaign.backgroundCrop.aspect,
              }
            : {})}
          onCancel={() => setBgFit(null)}
        />
      )}

      {showUnsavedModal && (
        <UnsavedChangesModal onSave={handleUnsavedSave} onDiscard={handleUnsavedDiscard} />
      )}
      {showUnsavedNameModal && (
        <SaveDraftModal
          defaultName={defaultDraftName}
          checkNameTaken={draft.checkNameTaken}
          onSave={handleUnsavedNameConfirm}
          onCancel={handleUnsavedNameCancel}
        />
      )}

      {/* Hidden full-size render area — the PNG export source */}
      <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        {shown.map(({ b }) =>
          OFFSITE_SIZES.map((s) => (
            <div key={stageKey(b.id, s.id)} ref={setStageRef(stageKey(b.id, s.id))} style={{ width: s.w, height: s.h }}>
              <OffSiteBannerTemplate sizeId={s.id} block={b} fontId={fontId} />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
