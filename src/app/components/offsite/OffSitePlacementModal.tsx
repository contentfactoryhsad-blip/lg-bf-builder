/**
 * Off-site Banner — layout editor.
 *
 * Opened from one of a selected KV's two size previews, the same way the Store
 * Page Modules banner opens its image layout editor. It does one job: where the
 * artwork sits. Position, size and stacking order — nothing else. Swapping a
 * cutout or a podium happens in the page's edit panel, so no picker ever has to
 * open on top of this one. The layer list reorders by drag, and each row has a
 * padlock that pins its layer so a neighbour underneath stays reachable.
 *
 * One size at a time: the square and the wide carry independent boxes, so
 * editing them together only invites dragging the wrong canvas.
 */

import React from 'react';
import { GripVertical, RotateCcw } from 'lucide-react';
import { useT } from '../../i18n/LanguageContext';
import type { BrandFontId } from '../../fonts/brandFonts';
import { OFFSITE_SIZES } from './offsiteSizes';
import {
  OFFSITE_LAYOUT, resolveLayers,
  type OffSiteBlock, type PlacedBox, type PricePlacement,
} from './offsiteTypes';
import { OffSiteBannerTemplate } from './templates/OffSiteBannerTemplate';
import { OffSitePlacementOverlay } from './OffSitePlacementOverlay';

/** Single canvas, so it can be big enough to place small artwork precisely. */
const CANVAS_MAX_W = 560;
const CANVAS_MAX_H = 560;

const ACCENT: Record<string, string> = {
  podium: '#22C55E', product: '#FD312E', object: '#F59E0B', price: '#3B82F6',
};

interface Props {
  block: OffSiteBlock;
  index: number;
  /** Which delivery size this editor is for. */
  sizeId: string;
  /** Active brand font, for the discount row's per-face sizes. */
  fontId: BrandFontId;
  onMoveProduct: (slot: number, box: PlacedBox) => void;
  onMovePodium: (slot: number, box: PlacedBox) => void;
  onMoveObject: (index: number, box: PlacedBox) => void;
  onMovePrice: (index: number, place: PricePlacement) => void;
  /** Persist a new bottom-first stacking order for this size. */
  onReorder: (keys: string[]) => void;
  /** Pin or release one layer on this size. */
  onToggleLock: (key: string) => void;
  onResetLayout: () => void;
  onClose: () => void;
}

/** Padlock, matching the Store Page Modules banner editor's affordance. */
function LockToggle({ locked, onChange }: { locked: boolean; onChange: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="shrink-0 p-0.5 rounded transition-colors"
      style={{ background: locked ? '#FFF1F4' : 'transparent', color: locked ? '#FD312E' : '#9ca3af' }}
      title={locked ? t('Unlock') : t('Lock position')}
    >
      {locked ? (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <rect x="3.5" y="7" width="9" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.5 7V4.5a2.5 2.5 0 015 0V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <rect x="3.5" y="7" width="9" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.5 7V4.5a2.5 2.5 0 014.6-1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export function OffSitePlacementModal({
  block, index, sizeId, fontId, onMoveProduct, onMovePodium, onMoveObject, onMovePrice,
  onReorder, onToggleLock, onResetLayout, onClose,
}: Props) {
  const t = useT();
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  /** Row being dragged, and the row it would land on. */
  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const [overKey, setOverKey] = React.useState<string | null>(null);
  const size = OFFSITE_SIZES.find((s) => s.id === sizeId);
  const layout = OFFSITE_LAYOUT[sizeId];
  if (!size || !layout) return null;

  // Fit the frame in the canvas box; the square is height-bound, the wide
  // width-bound, and both end up as large as the modal allows.
  const scale = Math.min(CANVAS_MAX_W / size.w, CANVAS_MAX_H / size.h);

  const layers = resolveLayers(layout, block, sizeId);
  // Listed top-first, the way a layers palette reads.
  const stack = [...layers].reverse();
  const locked = new Set(block.placements[sizeId]?.locked ?? []);

  /** Drop `from` where `to` currently sits, in list order, then translate the
   *  whole list back to paint order (bottom first). */
  function moveTo(from: string, to: string) {
    if (from === to) return;
    const list = stack.map((l) => l.key);
    const i = list.indexOf(from);
    const j = list.indexOf(to);
    if (i < 0 || j < 0) return;
    list.splice(j, 0, ...list.splice(i, 1));
    onReorder([...list].reverse());
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1000px] max-h-[92vh] flex flex-col overflow-hidden">
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <p className="font-lgei font-bold text-[15px] text-gray-900 truncate">
              {t('Banner')} {index + 1}
              <span className="ml-2 text-[11px] font-normal text-gray-400">{sizeId}</span>
            </p>
            <p className="text-xs text-gray-400">
              {t('Drag to move, corner handle to resize. Artwork is kept clear of the copy automatically.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 bg-[#FD312E] hover:bg-[#E22825] text-white text-sm font-medium px-6 py-2 rounded-full transition-colors"
          >
            {t('Done')}
          </button>
        </header>

        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 overflow-auto p-6 bg-[#f8f7f5] flex justify-center">
            <div className="flex flex-col gap-2">
              <div style={{ position: 'relative', width: size.w * scale, height: size.h * scale }}>
                <div className="shadow-lg overflow-hidden bg-white" style={{ width: '100%', height: '100%' }}>
                  <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                    <OffSiteBannerTemplate sizeId={size.id} block={block} fontId={fontId} />
                  </div>
                </div>
                {/* Overlay is a sibling of the clipped preview so handles stay
                    visible past the banner edge. */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: size.w,
                    height: size.h,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <OffSitePlacementOverlay
                    sizeId={size.id}
                    block={block}
                    previewScale={scale}
                    selectedKey={selectedKey}
                    onSelect={setSelectedKey}
                    onMoveProduct={onMoveProduct}
                    onMovePodium={onMovePodium}
                    onMoveObject={onMoveObject}
                    onMovePrice={onMovePrice}
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                {size.w} × {size.h}
              </p>
            </div>
          </div>

          <aside className="w-72 shrink-0 border-l border-gray-200 overflow-y-auto p-5 flex flex-col gap-4">
            <div>
              <h4 className="text-xs uppercase tracking-widest text-gray-400 font-semibold border-b border-gray-200 pb-2 mb-3">
                {t('Layers')}
              </h4>
              {stack.length === 0 ? (
                <p className="text-[11px] text-gray-400">{t('Nothing placed on this size yet.')}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {stack.map((l) => {
                    const selected = selectedKey === l.key;
                    const isLocked = locked.has(l.key);
                    return (
                      <li
                        key={l.key}
                        draggable
                        onDragStart={(e) => {
                          setDragKey(l.key);
                          e.dataTransfer.effectAllowed = 'move';
                          // Firefox needs a payload before a drag will start.
                          e.dataTransfer.setData('text/plain', l.key);
                        }}
                        onDragEnd={() => { setDragKey(null); setOverKey(null); }}
                        onDragOver={(e) => { e.preventDefault(); setOverKey(l.key); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragKey) moveTo(dragKey, l.key);
                          setDragKey(null);
                          setOverKey(null);
                        }}
                        onClick={() => setSelectedKey(l.key)}
                        className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors"
                        style={{
                          borderColor:
                            overKey === l.key && dragKey && dragKey !== l.key
                              ? '#FD312E'
                              : selected
                                ? ACCENT[l.kind]
                                : '#e5e7eb',
                          opacity: dragKey === l.key ? 0.4 : 1,
                        }}
                      >
                        <GripVertical size={12} className="shrink-0 text-gray-300 cursor-grab" />
                        <span
                          className="w-2.5 h-2.5 shrink-0 rounded-sm"
                          style={{ background: ACCENT[l.kind] }}
                        />
                        <span
                          className="flex-1 min-w-0 truncate text-[12px]"
                          style={{ color: isLocked ? '#9ca3af' : '#374151' }}
                        >
                          {t(l.label)}
                        </span>
                        <LockToggle
                          locked={locked.has(l.key)}
                          onChange={() => onToggleLock(l.key)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-2 text-[11px] text-gray-400">
                {t('Drag a row to restack — top of the list is front-most. The padlock pins a layer so clicks pass through to what is under it.')}
              </p>
            </div>

            <button
              type="button"
              onClick={onResetLayout}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
            >
              <RotateCcw size={14} />
              {t('Reset layout')}
            </button>
          </aside>
        </div>

      </div>
    </div>
  );
}
