/**
 * The four LG logos the Edit panel offers for the media sizes — the same set,
 * order and labels as the Sales Banner Builder's Logo picker. Picking one swaps
 * the logo on every paid size; no pick keeps the template default (white on the
 * black ground, black on a light custom upload).
 *
 * `lg-logo-og*.svg` are the Sales Banner Builder's files; White / Black are the
 * off-site ones the paid sizes already draw.
 */
export interface LogoVariant {
  id: string;
  label: string;
  src: string;
  /** Thumbnail ground in the panel — whichever side the logo reads on. */
  thumbBg: string;
}

export const LOGO_VARIANTS: LogoVariant[] = [
  { id: 'white', label: 'LG White', src: '/off-site/lg-logo-white.svg', thumbBg: '#1a1a1a' },
  { id: 'black', label: 'LG Black', src: '/off-site/lg-logo-black.svg', thumbBg: '#eeebe6' },
  { id: 'og', label: 'LG OG', src: '/off-site/lg-logo-og.svg', thumbBg: '#eeebe6' },
  { id: 'ogwhite', label: 'LG OG_White', src: '/off-site/lg-logo-ogwhite.svg', thumbBg: '#1a1a1a' },
];

export const logoVariantSrc = (id: string | null | undefined) =>
  LOGO_VARIANTS.find(v => v.id === id)?.src ?? null;
