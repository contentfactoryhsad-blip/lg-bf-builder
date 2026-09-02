export interface SaveFileType {
  description: string;
  accept: Record<string, string[]>;
}

/**
 * Save through the browser's own download flow — an anchor click on an object
 * URL. This asks for a location at most ONCE (only when Chrome's "ask where to
 * save each file" is on) and never leaves partial files behind.
 *
 * The File System Access API (`showSaveFilePicker`) is deliberately NOT used
 * any more: its deferred `createWritable` write failed on the machines this
 * app targets, leaving the picked file at 0 bytes, and every fallback layer
 * stacked another save prompt on top (users saw two, then three dialogs for
 * one download). The plain download flow is the one path that has always
 * produced a complete file.
 */
export async function saveBlob(blob: Blob, fileName: string, _types?: SaveFileType[]): Promise<void> {
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
 * Kept for API compatibility with callers that acquire the target at click
 * time and write after a long export. With the picker gone there is nothing
 * to acquire early — the returned writer simply hands the blob to `saveBlob`,
 * so the browser asks (at most once) when the file is actually ready.
 */
export async function acquireSaveTarget(
  fileName: string,
  types?: SaveFileType[],
): Promise<((blob: Blob) => Promise<void>) | null> {
  return async (blob: Blob) => saveBlob(blob, fileName, types);
}
