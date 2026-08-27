/**
 * Off-site Banner — placement overlay.
 *
 * Sits on top of a scaled banner preview and lets the user drag and resize each
 * product cutout, its podium and the price tags. Same interaction
 * model as the Store Page Modules banner (drag body, corner handle to resize,
 * magenta smart guides on alignment) minus rotation, which none of these layers
 * need. Used only inside the layout editor, never on the block grid.
 *
 * Only positions live here — a price tag's text is edited in the panel. Nothing
 * is outlined except the current selection, so the canvas keeps reading as the
 * finished banner. The overlay is a sibling of the clipped preview so handles
 * stay visible past the banner edge.
 */

import React, { useState } from 'react';
import { useT } from '../../i18n/LanguageContext';
import {
  OFFSITE_LAYOUT, clampLayerBox, maxLayerWidth, priceWidthRange, resolveLayers,
  type OffSiteBlock, type OffSiteLayer, type PlacedBox, type PricePlacement,
} from './offsiteTypes';

const ACCENT: Record<string, string> = {
  podium: '#22C55E', product: '#FD312E', object: '#F59E0B', price: '#3B82F6',
};
const SNAP_PX = 6;
const MIN_SIZE = 24;

interface Props {
  sizeId: string;
  block: OffSiteBlock;
  /** Preview px per banner px — handles are drawn scale-inverse so they keep a
   *  constant on-screen size. */
  previewScale: number;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  /** `slot` indexes into block.items; podium/object indexes are into the KV's
   *  own prop lists. */
  onMoveProduct: (slot: number, box: PlacedBox) => void;
  onMovePodium: (index: number, box: PlacedBox) => void;
  onMoveObject: (index: number, box: PlacedBox) => void;
  onMovePrice: (index: number, place: PricePlacement) => void;
}

export function OffSitePlacementOverlay({
  sizeId, block, previewScale,
  selectedKey, onSelect, onMoveProduct, onMovePodium, onMoveObject, onMovePrice,
}: Props) {
  const t = useT();
  const [guides, setGuides] = useState<{ vx: number | null; hy: number | null }>({ vx: null, hy: null });
  const layout = OFFSITE_LAYOUT[sizeId];
  if (!layout) return null;
  // Same array the template paints, so the topmost layer is also the one a
  // click lands on.
  const layers = resolveLayers(layout, block, sizeId);
  const locked = new Set(block.placements[sizeId]?.locked ?? []);

  function commit(layer: OffSiteLayer, raw: PlacedBox) {
    // Podiums and props may bleed off the sides; everything else stays inside
    // the artwork frame. Vertical bounds apply to all of them.
    const box = clampLayerBox(raw, layout, layer.kind);
    if (layer.kind === 'product') onMoveProduct(layer.slot!, box);
    else if (layer.kind === 'podium') onMovePodium(layer.index!, box);
    else if (layer.kind === 'object') onMoveObject(layer.index!, box);
    else onMovePrice(layer.index!, { x: box.x, y: box.y, w: box.w });
  }

  /** Alignment targets: the other layers' edges and centers, plus the banner's. */
  function guideTargets(current: OffSiteLayer) {
    const xs = [0, layout.w / 2, layout.w];
    const ys = [0, layout.h / 2, layout.h];
    for (const l of layers) {
      if (l.key === current.key) continue;
      xs.push(l.box.x, l.box.x + l.box.w / 2, l.box.x + l.box.w);
      ys.push(l.box.y, l.box.y + l.box.h / 2, l.box.y + l.box.h);
    }
    return { xs, ys };
  }

  function startDrag(e: React.PointerEvent, layer: OffSiteLayer) {
    const box = layer.box;
    e.preventDefault();
    e.stopPropagation();
    onSelect(layer.key);
    const startX = e.clientX;
    const startY = e.clientY;
    const { xs, ys } = guideTargets(layer);

    function onMove(ev: PointerEvent) {
      let nextX = box.x + (ev.clientX - startX) / previewScale;
      let nextY = box.y + (ev.clientY - startY) / previewScale;

      // Snap whichever of the frame's 3 axis points lands closest to a target.
      let snapVx: number | null = null;
      let snapHy: number | null = null;
      let bestDx = SNAP_PX;
      let deltaX = 0;
      for (const fx of [nextX, nextX + box.w / 2, nextX + box.w]) {
        for (const tx of xs) {
          const d = Math.abs(fx - tx);
          if (d < bestDx) { bestDx = d; snapVx = tx; deltaX = tx - fx; }
        }
      }
      nextX += deltaX;
      let bestDy = SNAP_PX;
      let deltaY = 0;
      for (const fy of [nextY, nextY + box.h / 2, nextY + box.h]) {
        for (const ty of ys) {
          const d = Math.abs(fy - ty);
          if (d < bestDy) { bestDy = d; snapHy = ty; deltaY = ty - fy; }
        }
      }
      nextY += deltaY;

      setGuides({ vx: snapVx, hy: snapHy });
      commit(layer, { ...box, x: nextX, y: nextY });
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setGuides({ vx: null, hy: null });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startResize(e: React.PointerEvent, layer: OffSiteLayer) {
    const box = layer.box;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const ratio = box.w / box.h;
    // Cap so a resize can never grow the box past its own clamp from the
    // current corner — otherwise the clamp would slide it sideways instead.
    const maxW = maxLayerWidth(box, layout, layer.kind);
    // A price card also has a floor, so it cannot be shrunk out of legibility.
    const minW = layer.kind === 'price' ? priceWidthRange(layout).min : MIN_SIZE;

    function onMove(ev: PointerEvent) {
      const dx = (ev.clientX - startX) / previewScale;
      const dy = (ev.clientY - startY) / previewScale;
      // Take whichever axis the pointer pushed further, so the drag feels
      // responsive on both edges while the aspect stays locked.
      const w = Math.min(
        Math.max(minW, Math.max(box.w + dx, (box.h + dy) * ratio)),
        Math.max(minW, maxW),
      );
      commit(layer, { ...box, w, h: w / ratio });
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  const handle = 12 / previewScale;

  return (
    <div
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      onPointerDown={() => onSelect(null)}
      title={t('Drag to move, corner handle to resize.')}
    >
      {guides.vx !== null && (
        <div
          style={{
            position: 'absolute', left: guides.vx, top: 0, width: 0, height: layout.h,
            borderLeft: `${2 / previewScale}px dashed #FF00C8`,
          }}
        />
      )}
      {guides.hy !== null && (
        <div
          style={{
            position: 'absolute', left: 0, top: guides.hy, width: layout.w, height: 0,
            borderTop: `${2 / previewScale}px dashed #FF00C8`,
          }}
        />
      )}

      {layers.map((layer) => {
        const { key, box } = layer;
        const selected = selectedKey === key;
        const isLocked = locked.has(key);
        const accent = ACCENT[layer.kind];
        return (
          <div
            key={key}
            style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h }}
          >
            <div
              onPointerDown={(e) => !isLocked && startDrag(e, layer)}
              style={{
                position: 'absolute',
                inset: 0,
                cursor: isLocked ? 'default' : 'move',
                // A locked layer must not swallow clicks meant for whatever sits
                // beneath it — that is half the point of locking.
                pointerEvents: isLocked ? 'none' : 'auto',
                // Only the selection is drawn. Everything else stays invisible
                // so the canvas reads as the finished banner, not a wireframe.
                outline: selected ? `${2 / previewScale}px solid ${accent}` : 'none',
              }}
            />
            {selected && !isLocked && (
              <div
                onPointerDown={(e) => startResize(e, layer)}
                style={{
                  position: 'absolute',
                  left: box.w - handle / 2,
                  top: box.h - handle / 2,
                  width: handle,
                  height: handle,
                  background: accent,
                  border: `${2 / previewScale}px solid white`,
                  borderRadius: handle / 4,
                  cursor: 'nwse-resize',
                  pointerEvents: 'auto',
                  boxShadow: `0 ${2 / previewScale}px ${4 / previewScale}px rgba(0,0,0,0.3)`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
