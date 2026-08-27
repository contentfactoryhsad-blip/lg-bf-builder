import React, { createContext, useContext, useState, useCallback } from 'react';
import { DEFAULT_LANGUAGE, LanguageCode } from './languages';

// Eagerly bundle all locale JSONs. The translation script writes to
// /src/locales/<code>.json at build time, so runtime has zero API
// dependency — translations ship inside the app.
const localeModules = import.meta.glob('/src/locales/*.json', { eager: true });

type TranslationMap = Record<string, string>;
const TRANSLATIONS: Record<string, TranslationMap> = {};
for (const path in localeModules) {
  const match = path.match(/\/([a-zA-Z-]+)\.json$/);
  if (!match) continue;
  const mod = localeModules[path] as { default?: TranslationMap };
  TRANSLATIONS[match[1]] = mod.default ?? (mod as unknown as TranslationMap);
}

export type TFunction = (key: string) => string;

interface LanguageContextValue {
  lang: LanguageCode;
  /** Change the active language. No-op if `locked` is true. */
  setLang: (next: LanguageCode) => void;
  /** Lookup translated text; falls back to the English key. */
  t: TFunction;
  /** When true, `setLang` is ignored — guarantees language stays frozen
   *  once the user leaves Home (per product requirement). */
  locked: boolean;
  /** Freeze the language for the remainder of this session. */
  lock: () => void;
  /** Unlock, used when the user navigates back to Home. */
  unlock: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Build a standalone `t` for `lang` — useful outside React (e.g. factories
 *  that seed initial state based on the user's current language). */
export function makeT(lang: LanguageCode): TFunction {
  if (lang === DEFAULT_LANGUAGE) return (key) => key;
  const map = TRANSLATIONS[lang];
  return (key) => map?.[key] ?? key;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [locked, setLocked] = useState(false);

  const setLang = useCallback((next: LanguageCode) => {
    if (locked) return;
    setLangState(next);
  }, [locked]);

  const t = useCallback<TFunction>((key) => {
    if (lang === DEFAULT_LANGUAGE) return key;
    return TRANSLATIONS[lang]?.[key] ?? key;
  }, [lang]);

  const lock = useCallback(() => setLocked(true), []);
  const unlock = useCallback(() => setLocked(false), []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, locked, lock, unlock }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be called inside <LanguageProvider>');
  return ctx;
}

/** Convenience hook: `const t = useT();` */
export function useT(): TFunction {
  return useLanguage().t;
}
