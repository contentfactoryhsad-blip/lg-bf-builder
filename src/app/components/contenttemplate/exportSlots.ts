/**
 * ZIP export for the Content Template Builder.
 *
 * Each size is rendered once, at its true pixel size, from the same components
 * the canvas uses — so what ships is what was reviewed. The caller mounts one
 * slot at a time into a hidden host and calls `capture` on it; this keeps the
 * render loop and the zipping in one place.
 *
 * `html-to-image` needs three passes: the first two warm its image and font
 * caches, and only the third is reliably complete. That is the same dance the
 * Thumbnail bulk generator does, for the same reason.
 */
import JSZip from 'jszip';
import { toPng } from 'html-to-image';
import { preloadImagesToDataUrls } from '../../utils/imageUrlLoader';

/** The element the exporter photographs — marked by both slot previews. */
export const EXPORT_BOX = '[data-export-box]';

export async function captureBox(host: HTMLElement, w: number, h: number): Promise<Blob | null> {
  const box = host.querySelector<HTMLElement>(EXPORT_BOX);
  if (!box) return null;
  let restore: (() => void) | null = null;
  try {
    restore = await preloadImagesToDataUrls(box);
    const opts = { width: w, height: h, pixelRatio: 1, skipFonts: false } as const;
    await toPng(box, opts);
    await toPng(box, opts);
    const dataUrl = await toPng(box, { ...opts, cacheBust: true });
    return await (await fetch(dataUrl)).blob();
  } catch (err) {
    console.error('[ContentTemplate] capture failed', err);
    return null;
  } finally {
    restore?.();
  }
}

export interface ZipEntry { name: string; blob: Blob }

export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const e of entries) zip.file(e.name, e.blob);
  return zip.generateAsync({ type: 'blob' });
}

/** `2026-08-29` → `260829`, matching the other builders' filenames. */
export function dateTag(d = new Date()) {
  return `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
