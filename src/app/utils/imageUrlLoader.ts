export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

export async function preloadImagesToDataUrls(root: HTMLElement): Promise<() => void> {
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>('img[src]'));
  const restore = new Map<HTMLImageElement, string>();

  await Promise.allSettled(
    imgs.map(async (img) => {
      const src = img.src;
      if (!src || src.startsWith('data:')) return;
      try {
        const res = await fetch(src, { cache: 'force-cache' });
        if (!res.ok) return;
        const b = await res.blob();
        const dataUrl = await blobToDataUrl(b);
        restore.set(img, src);
        img.src = dataUrl;
      } catch {
        // leave as-is
      }
    }),
  );

  return () => restore.forEach((orig, img) => { img.src = orig; });
}

/**
 * Fetch an image URL and return it as a data URL.
 * Falls back to proxy if direct fetch fails (CORS).
 */
export async function fetchAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  const tryFetch = async (fetchUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await blobToDataUrl(blob);
    } catch {
      return null;
    }
  };

  // Try direct first
  let result = await tryFetch(url);
  if (result) return result;

  // Try via proxy
  result = await tryFetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
  return result;
}
