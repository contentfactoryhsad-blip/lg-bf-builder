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
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
