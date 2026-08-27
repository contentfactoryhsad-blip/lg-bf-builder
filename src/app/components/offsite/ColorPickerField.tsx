/**
 * Off-site Banner — background color control.
 *
 * A swatch that opens a picker: a saturation/value field to drag in, a hue
 * slider under it, then an eyedropper and a hex field. The eyedropper samples
 * anywhere on screen, which is the fastest way to match a color that is already
 * in the KV — a product's accent, the campaign lockup — rather than eyeballing
 * it in the field.
 *
 * Hue is kept in state rather than re-derived from the color on every render.
 * Black and pure grey carry no hue, so a round trip through the hex would
 * collapse the slider to red the moment the user drags value to zero, and the
 * field would lose the column it was being dragged along.
 *
 * The picker expands in place instead of floating: it lives in the edit panel,
 * which scrolls and clips, and an absolutely-positioned popover would be cut
 * off. Edits apply live — the banner beside it is the preview.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Pipette } from 'lucide-react';
import { useT } from '../../i18n/LanguageContext';

interface HSV {
  h: number;
  s: number;
  v: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function normalizeHex(input: string): string | null {
  const hex = input.trim().replace(/^#?/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return `#${hex.split('').map((c) => c + c).join('').toUpperCase()}`;
  }
  return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
}

function hexToHsv(hex: string): HSV {
  const full = normalizeHex(hex) ?? '#000000';
  const r = parseInt(full.slice(1, 3), 16) / 255;
  const g = parseInt(full.slice(3, 5), 16) / 255;
  const b = parseInt(full.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex({ h, s, v }: HSV): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const seg = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ][seg];
  const byte = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`.toUpperCase();
}

/** Track a pointer across an element as a 0-1 position, capture included so the
 *  drag survives leaving the box. */
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

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPickerField({ value, onChange }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [hue, setHue] = useState(() => hexToHsv(value).h);
  /** In-progress hex text. Committed only once it parses, so half-typed codes
   *  do not repaint the banner. */
  const [draft, setDraft] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const hsv = hexToHsv(value);
  // Achromatic colors carry no hue of their own, so the slider keeps the last
  // one the user chose.
  const activeHue = hsv.s === 0 || hsv.v === 0 ? hue : hsv.h;

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
    onChange(hsvToHex({ h: activeHue, s: px, v: 1 - py }));
    setDraft(null);
  });
  const hueBar = useDragArea((px) => {
    const h = px * 360;
    setHue(h);
    onChange(hsvToHex({ h, s: hsv.s === 0 ? 1 : hsv.s, v: hsv.v === 0 ? 1 : hsv.v }));
    setDraft(null);
  });

  function commitHex(next: string) {
    setDraft(next);
    const hex = normalizeHex(next);
    if (hex) {
      onChange(hex);
      setHue(hexToHsv(hex).h);
    }
  }

  async function pickFromScreen() {
    const Dropper = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!Dropper) return;
    try {
      const { sRGBHex } = await new Dropper().open();
      const hex = normalizeHex(sRGBHex);
      if (hex) {
        onChange(hex);
        setHue(hexToHsv(hex).h);
        setDraft(null);
      }
    } catch {
      // Cancelled with Escape — nothing to do.
    }
  }

  const hasDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  return (
    <div ref={wrap} className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border p-1.5 text-left transition-colors"
        style={{ borderColor: open ? '#FD312E' : '#e5e7eb' }}
      >
        <span
          className="w-8 h-8 shrink-0 rounded-md border border-black/10"
          style={{ background: value }}
        />
        <span className="text-sm text-gray-700 tabular-nums">{value.toUpperCase()}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-2">
          {/* Saturation across, value down — the Photoshop field. */}
          <div
            ref={sv.ref}
            {...sv.handlers}
            className="relative h-[132px] w-full cursor-crosshair rounded-md touch-none"
            style={{
              background:
                `linear-gradient(to top, #000, rgba(0,0,0,0)),` +
                `linear-gradient(to right, #fff, rgba(255,255,255,0)),` +
                `hsl(${activeHue} 100% 50%)`,
            }}
          >
            <span
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
              }}
            />
          </div>

          <div
            ref={hueBar.ref}
            {...hueBar.handlers}
            className="relative h-3 w-full cursor-ew-resize rounded-full touch-none"
            style={{
              background:
                'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
            }}
          >
            <span
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{
                left: `${(activeHue / 360) * 100}%`,
                background: `hsl(${activeHue} 100% 50%)`,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void pickFromScreen()}
              disabled={!hasDropper}
              title={hasDropper ? t('Pick a color from the screen') : t('Your browser has no eyedropper.')}
              aria-label={t('Pick a color from the screen')}
              className="shrink-0 rounded-md border border-gray-200 p-2 text-gray-500 hover:border-[#FD312E] hover:text-[#FD312E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Pipette size={14} />
            </button>
            <input
              type="text"
              value={draft ?? value.toUpperCase()}
              onChange={(e) => commitHex(e.target.value)}
              onBlur={() => setDraft(null)}
              placeholder="#E1DDD8"
              spellCheck={false}
              aria-label={t('Hex code')}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm uppercase tabular-nums focus:outline-none focus:border-[#FD312E]"
            />
          </div>

        </div>
      )}
    </div>
  );
}
