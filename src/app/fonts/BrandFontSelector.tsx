import React, { useState, useRef, useEffect } from 'react';
import { Type, Check, ChevronDown } from 'lucide-react';
import { BRAND_FONTS, BrandFontId, getBrandFont } from './brandFonts';

interface Props {
  value: BrandFontId;
  onChange: (id: BrandFontId) => void;
}

/**
 * Output-font picker for the editor header. Each row renders in its own font
 * with a `Aa 12,345 ฿` sample, so the active font — and Lazada's separate
 * numeral face — are visible without opening anything.
 *
 * Unlike the language picker this never locks: swapping fonts is
 * non-destructive, so changing it mid-edit is expected.
 */
export function BrandFontSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const active = getBrandFont(value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={active.detail}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
        style={{ lineHeight: '20px' }}
      >
        <Type size={14} />
        <span style={{ fontFamily: active.render, fontWeight: 600 }}>{active.label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5">
          {BRAND_FONTS.map((f) => {
            const selected = f.id === value;
            return (
              <button
                key={f.id}
                onClick={() => {
                  onChange(f.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                  selected ? 'bg-[#FD312E]/8 text-[#FD312E]' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="flex-1 min-w-0">
                  {/* Rendered in its own font at weight 600 — the @font-face
                      weight table maps that to each family's LG-semibold
                      equivalent, so the three labels read equally bold. */}
                  <span className="block text-sm" style={{ fontFamily: f.render, fontWeight: 600 }}>
                    {f.label}
                  </span>
                  <span className="block mt-0.5 text-[11px] text-gray-400 truncate">{f.detail}</span>
                </span>
                {selected && <Check size={14} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
