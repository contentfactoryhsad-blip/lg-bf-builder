// Supported display languages. `code` matches the filename of the JSON in
// /src/locales (e.g. 'th' → th.json). `native` is shown in the language
// selector so users can find their own language regardless of UI language.
//
// Scope: this fork serves the Thailand entity only, so the selector offers
// Thai plus English as the working language, and /src/locales holds those two
// alone. The other Shopee/Lazada market locales were carried over from the
// upstream repo and have been removed — they were never offered here, and a
// translation run that keeps regenerating them costs time and money for files
// nothing reads. Restore them from git history if this fork ever widens.
export interface LanguageDef {
  code: string;
  name: string;
  native: string;
}

export const LANGUAGES: LanguageDef[] = [
  { code: 'en',    name: 'English',                native: 'English' },
  { code: 'th',    name: 'Thai',                   native: 'ไทย' },
];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
