export interface SaveFileType {
  description: string;
  accept: Record<string, string[]>;
}

const DEFAULT_TYPES: SaveFileType[] = [
  { description: 'PNG Image', accept: { 'image/png': ['.png'] } },
  { description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } },
];

export async function saveBlob(blob: Blob, fileName: string, types: SaveFileType[] = DEFAULT_TYPES): Promise<void> {
  if (typeof (window as any).showSaveFilePicker === 'function') {
    try {
      const fh = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types,
      });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
      return;
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.warn('showSaveFilePicker failed, falling back:', e);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // With Chrome's "ask where to save each file" on, the fetch of this URL can
  // start only after the user picks a location — revoking at 2s made downloads
  // die with a network error whenever choosing took longer than that.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Ask for the save location NOW and write later.
 *
 * `showSaveFilePicker` needs transient user activation, which Chrome forgets a
 * few seconds after the click — so calling it after a long export throws, the
 * anchor fallback kicks in, and the browser asks for a location all over again.
 * Acquiring the handle at click time keeps it to one question, asked while the
 * activation is still live.
 *
 * Returns a writer, or null when the user cancelled the picker (the caller
 * should abort). Without picker support the writer falls back to `saveBlob`,
 * which asks once, at write time, through the browser's own download flow.
 */
export async function acquireSaveTarget(
  fileName: string,
  types: SaveFileType[] = DEFAULT_TYPES,
): Promise<((blob: Blob) => Promise<void>) | null> {
  if (typeof (window as any).showSaveFilePicker === 'function') {
    try {
      const fh = await (window as any).showSaveFilePicker({ suggestedName: fileName, types });
      return async (blob: Blob) => {
        const w = await fh.createWritable();
        await w.write(blob);
        await w.close();
      };
    } catch (e: any) {
      if (e?.name === 'AbortError') return null;
      console.warn('showSaveFilePicker failed, will fall back to a plain download:', e);
    }
  }
  return async (blob: Blob) => saveBlob(blob, fileName, types);
}
