import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { LANGUAGES, LanguageCode } from './languages';
import { useLanguage } from './LanguageContext';

/**
 * Home-only language picker. Dropdown lists all supported languages by their
 * native name. When the user leaves Home, the selector unmounts and the
 * context locks the language (see App.tsx), so downstream pages render in
 * whatever was selected without drift.
 */
export function LanguageSelector() {
  const { lang, setLang, locked } = useLanguage();
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

  const active = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !locked && setOpen((v) => !v)}
        disabled={locked}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ lineHeight: '20px' }}
      >
        <Globe size={14} />
        <span>{active.native}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-56 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl py-1"
        >
          {LANGUAGES.map((l) => {
            const selected = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code as LanguageCode);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  selected ? 'bg-[#FD312E]/8 text-[#FD312E]' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="flex-1 truncate">
                  <span className="font-medium">{l.native}</span>
                  <span className="ml-2 text-xs text-gray-400">{l.name}</span>
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
