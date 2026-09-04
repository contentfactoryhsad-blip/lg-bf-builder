/**
 * Slot Color — the pared-down picker for the product plates (2026-09-04).
 *
 * The off-site `ColorPickerField` offers the full space (hue slider, hex box,
 * eyedropper); the plates deliberately do not. Their palette is white / grey /
 * black / red, so this field keeps only the saturation/value area with the hue
 * pinned to LG red — dragging it covers exactly that white→red→black range —
 * plus an opacity slider.
 *
 * Opacity rides the value as an 8-digit hex (#RRGGBBAA); at 100% the plain
 * 6-digit form is emitted so the default compare (`PD_PLATE_FILL`) still holds.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useT } from '../../i18n/LanguageContext';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The pinned hue — LG red (#FD312E ≈ 1.2°, close enough to 0 to pin there). */
const HUE = 1.2;

function splitAlpha(value: string): { base: string; alpha: number } {
  const v = value.trim();
  if (/^#[0-9a-f]{8}$/i.test(v)) {
    return { base: v.slice(0, 7).toUpperCase(), alpha: parseInt(v.slice(7, 9), 16) / 255 };
  }
  return { base: v.toUpperCase(), alpha: 1 };
}

function joinAlpha(base: string, alpha: number): string {
  if (alpha >= 1) return base.toUpperCase();
  const a = Math.round(clamp01(alpha) * 255).toString(16).padStart(2, '0');
  return `${base.toUpperCase()}${a.toUpperCase()}`;
}

function hexToSv(base: string): { s: number; v: number } {
  const r = parseInt(base.slice(1, 3), 16) / 255;
  const g = parseInt(base.slice(3, 5), 16) / 255;
  const b = parseInt(base.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return { s: max === 0 ? 0 : (max - min) / max, v: max };
}

function svToHex(s: number, v: number): string {
  const h = HUE;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = [c, x, 0];
  const byte = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`.toUpperCase();
}

/** Pointer drag across an element as 0-1 coordinates, capture included. */
function useDragArea(onMove: (px: number, py: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const apply = useCallback(
    (e: React.PointerEvent) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      onMove(clamp01((e.clientX - box.left) / box.width), clamp01((e.clientY - box.top) / box.height));
    },
    [onMove],
  );
  return {
    ref,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as Element).setPointerCapture(e.pointerId);
        apply(e);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (e.buttons !== 1) return;
        e.preventDefault();
        apply(e);
      },
    },
  };
}

export function SlotColorField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const { base, alpha } = splitAlpha(value);
  const { s, v } = hexToSv(base);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const sv = useDragArea((px, py) => {
    onChange(joinAlpha(svToHex(px, 1 - py), alpha));
  });

  return (
    <div ref={wrap} className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border p-1.5 text-left transition-colors"
        style={{ borderColor: open ? '#FD312E' : '#e5e7eb' }}
      >
        <span
          className="w-8 h-8 shrink-0 rounded-md border border-black/10"
          style={{ background: value }}
        />
        <span className="text-sm text-gray-700 tabular-nums">{base}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-2">
          {/* White→red across, black down — the whole allowed range. */}
          <div
            ref={sv.ref}
            {...sv.handlers}
            className="relative h-[132px] w-full cursor-crosshair rounded-md touch-none"
            style={{
              background:
                `linear-gradient(to top, #000, rgba(0,0,0,0)),` +
                `linear-gradient(to right, #fff, rgba(255,255,255,0)),` +
                `hsl(${HUE} 100% 50%)`,
            }}
          >
            <span
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{
                left: `${s * 100}%`,
                top: `${(1 - v) * 100}%`,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
              }}
            />
          </div>

          {/* Opacity — rides the color as #RRGGBBAA. */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 shrink-0 w-12">{t('Opacity')}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(alpha * 100)}
              onChange={(e) => onChange(joinAlpha(base, Number(e.target.value) / 100))}
              className="flex-1 accent-[#FD312E]"
            />
            <span className="text-[11px] text-gray-600 tabular-nums w-8 text-right">
              {Math.round(alpha * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
