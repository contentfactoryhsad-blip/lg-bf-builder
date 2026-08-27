import React from 'react';
import { X, Loader2, ImageOff } from 'lucide-react';
import { useT } from '../i18n/LanguageContext';

export interface AssetItem {
  id: string;
  name: string;
  full: string;
  thumb: string;
  w: number;
  h: number;
}

interface AssetCategory {
  id: string;
  label: string;
  items: AssetItem[];
}

interface AssetManifest {
  version: string;
  generatedAt: string;
  categories: AssetCategory[];
}

const MANIFEST_URL = '/asset-library/manifest.json';

/** Manifest URLs are absolute jsDelivr URLs as of the CDN migration. Older
 *  manifests may have relative paths — fall back to the public/ mount. */
function resolveAssetUrl(p: string): string {
  if (/^(https?:|data:)/i.test(p)) return p;
  return '/asset-library/' + p.replace(/^\/+/, '');
}

let manifestPromise: Promise<AssetManifest | null> | null = null;
function loadManifest(): Promise<AssetManifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return manifestPromise;
}

let thumbsPrefetched = false;
/** Warm the manifest + first-category thumbnail cache so opening the modal
 *  feels instant. Safe to call repeatedly — work is gated by module-level
 *  flags. Call from editor mount, well before the user clicks the picker. */
export function prefetchAssetLibrary(): void {
  loadManifest().then((m) => {
    if (!m || thumbsPrefetched) return;
    thumbsPrefetched = true;
    // Thumbs are inlined as data URLs in the manifest itself (build script),
    // so no per-thumb network fetch is needed — just having the manifest
    // loaded is enough for the modal grid to paint. Older manifests with
    // CDN thumb URLs still benefit from a background warm-up.
    for (const cat of m.categories) {
      for (const item of cat.items) {
        if (item.thumb.startsWith('data:')) continue;
        const url = /^https?:\/\//i.test(item.thumb) ? item.thumb : '/asset-library/' + item.thumb.replace(/^\/+/, '');
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
      }
    }
  });
}

/** Promise cache of full-resolution PNGs already converted to data URLs.
 *  Hover starts the fetch+base64 work; the click handler awaits the same
 *  promise so the slot gets populated instantly when the bytes are ready. */
const fullDataUrlCache = new Map<string, Promise<string | null>>();
export function prefetchFullAssetDataUrl(url: string): Promise<string | null> {
  let p = fullDataUrlCache.get(url);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    })();
    fullDataUrlCache.set(url, p);
  }
  return p;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (item: AssetItem) => void;
}

export function AssetLibraryModal({ open, onClose, onSelect }: Props) {
  const t = useT();
  const [manifest, setManifest] = React.useState<AssetManifest | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedId(null);
    loadManifest().then((m) => {
      setManifest(m);
      setLoading(false);
      if (m && m.categories.length > 0) {
        setActiveCategoryId((prev) => prev ?? m.categories[0].id);
      }
    });
  }, [open]);

  if (!open) return null;

  const activeCategory = manifest?.categories.find((c) => c.id === activeCategoryId) ?? null;
  const selectedItem = activeCategory?.items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-[820px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('Pick from library')}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Category tabs — outer holds the border so the scrollable inner
            doesn't implicitly clip the pills' rounded corners. */}
        {manifest && manifest.categories.length > 0 && (
          <div className="border-b border-gray-100">
            <div className="flex items-center gap-1.5 px-6 py-3 overflow-x-auto">
            {manifest.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategoryId(cat.id); setSelectedId(null); }}
                className="px-4 py-2 text-xs leading-none rounded-full whitespace-nowrap transition-colors flex-shrink-0"
                style={{
                  background: activeCategoryId === cat.id ? '#FD312E' : '#f3f4f6',
                  color: activeCategoryId === cat.id ? 'white' : '#4b5563',
                  fontWeight: activeCategoryId === cat.id ? 600 : 400,
                }}
              >
                {cat.label}
                <span className="ml-1.5 opacity-70">{cat.items.length}</span>
              </button>
            ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 size={32} className="animate-spin mb-3" />
              <p className="text-sm">{t('Loading library…')}</p>
            </div>
          )}

          {!loading && (!manifest || manifest.categories.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ImageOff size={32} className="mb-3" />
              <p className="text-sm">{t('Library is empty.')}</p>
              <p className="text-xs mt-1 text-center max-w-md">
                {t('Add graphics under public/asset-library/{category}/ then run npm run assets:build.')}
              </p>
            </div>
          )}

          {!loading && activeCategory && activeCategory.items.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {activeCategory.items.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    onDoubleClick={() => onSelect(item)}
                    onMouseEnter={() => prefetchFullAssetDataUrl(resolveAssetUrl(item.full))}
                    onFocus={() => prefetchFullAssetDataUrl(resolveAssetUrl(item.full))}
                    title={item.name}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-gray-50 hover:shadow-md ${
                      isSelected ? 'border-[#FD312E] shadow-md' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={resolveAssetUrl(item.thumb)}
                      alt={item.name}
                      className="w-full h-full object-contain p-2"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                      <p className="text-[10px] text-white text-left leading-tight line-clamp-1">
                        {item.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {t('Cancel')}
          </button>
          <button
            disabled={!selectedItem}
            onClick={() => { if (selectedItem) onSelect(selectedItem); }}
            className="px-4 py-2 text-sm font-medium text-white bg-[#FD312E] rounded-lg hover:bg-[#E22825] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {t('Use')}
          </button>
        </div>
      </div>
    </div>
  );
}
