import { useLayoutEffect } from 'react';
import {
  BrandFontId,
  DEFAULT_BRAND_FONT,
  brandHeadTrackingEm,
  brandTrackingEm,
  getBrandFont,
  smallCopyWeight,
  setActiveMeasureStack,
  setActiveHeadTrackingEm,
  setActiveTrackingEm,
} from './brandFonts';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Applies one builder's output font.
 *
 * Publishes the stack as `--obs-font` / `--obs-font-text` on the root element
 * and mirrors it into the canvas-measurement module state. Deliberately a
 * side effect rather than a provider component: two render paths sit outside
 * any wrapper we could place — Brand Shop's export mounts a second React root
 * (`createRoot`), and ThumbnailBulkGenerator returns a different root element
 * per phase. Chrome is unaffected either way, since nothing in it reads these.
 *
 * Per-builder independence holds because each builder owns its own state and
 * App renders one builder at a time; the cleanup restores the LG default.
 */
export function useApplyBrandFont(fontId: BrandFontId): void {
  // Tracking is language-dependent (see `trackingEmThai`), so this re-runs on a
  // language switch as well as a font switch.
  const { lang } = useLanguage();
  useLayoutEffect(() => {
    const font = getBrandFont(fontId);
    const tracking = brandTrackingEm(font, lang);
    const headTracking = brandHeadTrackingEm(font, lang);
    const el = document.documentElement;
    el.style.setProperty('--obs-font', font.render);
    el.style.setProperty('--obs-font-text', font.renderText);
    el.style.setProperty('--obs-tracking', `${tracking}em`);
    el.style.setProperty('--obs-tracking-head', `${headTracking}em`);
    // Small-band head/sub weights — see smallCopyWeight. Published rather than
    // threaded through every template for the same reason tracking is: the two
    // export paths mount outside any provider we could wrap them in.
    el.style.setProperty('--obs-w-head-sm', String(smallCopyWeight(font, lang, 'head')));
    el.style.setProperty('--obs-w-sub-sm', String(smallCopyWeight(font, lang, 'sub')));
    setActiveMeasureStack(font.measure);
    setActiveTrackingEm(tracking);
    setActiveHeadTrackingEm(headTracking);
    return () => {
      el.style.removeProperty('--obs-font');
      el.style.removeProperty('--obs-font-text');
      el.style.removeProperty('--obs-tracking');
      el.style.removeProperty('--obs-tracking-head');
      el.style.removeProperty('--obs-w-head-sm');
      el.style.removeProperty('--obs-w-sub-sm');
      setActiveMeasureStack(getBrandFont(DEFAULT_BRAND_FONT).measure);
      setActiveTrackingEm(getBrandFont(DEFAULT_BRAND_FONT).trackingEm);
      setActiveHeadTrackingEm(getBrandFont(DEFAULT_BRAND_FONT).trackingEm);
    };
  }, [fontId, lang]);
}
