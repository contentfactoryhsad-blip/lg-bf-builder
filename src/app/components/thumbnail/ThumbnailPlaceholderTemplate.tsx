import React from 'react';
import type { ThumbnailTemplateProps } from './thumbnailRegistry';

/**
 * Placeholder render for a not-yet-built thumbnail slot.
 *
 * Every slot in the registry points here for now. As the real layout for a
 * slot is specified, swap that slot's `Template` in `thumbnailRegistry.ts` for
 * its own component — this file stays as the fallback for the remaining slots.
 *
 * Renders at the slot's native size (default 1200×1200) so the selector,
 * editor preview, and html-to-image export all share one source of truth.
 */
export function ThumbnailPlaceholderTemplate({ slot, orientation }: ThumbnailTemplateProps) {
  const { w, h } = slot.size;

  return (
    <div
      style={{ width: w, height: h }}
      className="relative flex flex-col items-center justify-center bg-[#F0ECE4] text-center select-none"
    >
      {/* Dashed frame to read clearly as an empty slot */}
      <div className="absolute inset-12 border-2 border-dashed border-[#C9C2B6] rounded-[24px]" />

      <span className="text-[#A50034] text-[40px] font-lgei font-bold uppercase tracking-[0.08em]">
        {slot.category === 'product-card' ? 'Product Card' : 'Feature Card'}
      </span>

      <span className="mt-4 text-gray-900 text-[88px] font-lgei font-bold leading-none">
        {slot.nameKey}
      </span>

      {slot.hasOrientation && (
        <span className="mt-8 inline-flex items-center gap-3 text-gray-500 text-[34px]">
          <span className="px-5 py-2 rounded-full bg-white border border-gray-300">
            {orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
          </span>
        </span>
      )}

      <span className="mt-10 text-gray-400 text-[30px] tracking-[0.3em] uppercase">
        Layout TBD
      </span>
    </div>
  );
}
