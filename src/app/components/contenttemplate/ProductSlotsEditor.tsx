/**
 * Product slots for the PD Slot key visuals.
 *
 * Those artworks ship with empty plates baked in; this fills them. Each plate is
 * its own product — a separate URL, not crops of one page — and runs the same
 * flow as the Sales Banner Builder's PRODUCT rows:
 *
 *   import from URL → pick in the gallery → remove background → brush touch-up → crop
 *
 * A local file can be dropped in instead of a URL, joining the flow at the
 * background-removal step. The crop source is kept so "Edit Crop" can reopen it.
 */
import React, { useRef, useState } from 'react';
import { Crop, ImageIcon, Loader2, X } from 'lucide-react';
import { ImageGalleryModal } from '../ImageGalleryModal';
import { ImageCropModal, type CropState } from '../ImageCropModal';
import { BrushMaskEditor } from '../BrushMaskEditor';
import { scrapeProductImages, getProxiedImageUrl, type ScrapedImage } from '../../services/imageScraperApi';
import { removeBackgroundAI } from '../../utils/salesBgRemoval';
import { useT } from '../../i18n/LanguageContext';
import { PD_PLATE_FILL } from './paidBoards';
import { ColorPickerField } from '../offsite/ColorPickerField';

/** What one plate holds. `image` is the finished cut-out. */
export interface ProductSlot {
  url: string;
  image: string | null;
}

export type ProductSlots = ProductSlot[];

export const emptyProductSlots = (n: number): ProductSlots =>
  Array.from({ length: n }, () => ({ url: '', image: null }));

/** The plates are square, so the cropper is too. */
const PRODUCT_ASPECT = 1;

export function ProductSlotsEditor({
  count,
  slots,
  onChange,
  color,
  onColorChange,
}: {
  count: number;
  slots: ProductSlots;
  onChange: (next: ProductSlots) => void;
  /**
   * Plate fill. Only the paid boards draw their plates — on LG.com they are
   * baked into the artwork — so the swatches appear only when a setter is
   * passed, and the control is absent everywhere it would do nothing.
   */
  color?: string;
  onColorChange?: (next: string) => void;
}) {
  const t = useT();
  return (
    <div className="p-5 pt-0 flex flex-col">
      <div className="mb-1">
        <p className="font-lgei font-bold text-[15px] text-gray-900 mb-0.5">{t('Products')}</p>
        <p className="text-xs text-gray-400">{t('One product per plate. Applies to every size.')}</p>
      </div>

      {onColorChange && (
        <PlateColorField color={color ?? PD_PLATE_FILL} onChange={onColorChange} />
      )}

      {Array.from({ length: count }, (_, i) => (
        <ProductRow
          key={i}
          index={i + 1}
          slot={slots[i] ?? { url: '', image: null }}
          onChange={part => {
            const next = slots.slice();
            next[i] = { ...next[i], ...part };
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

/**
 * Plate fill. The swatch opens the same picker the Off-site builder uses — a
 * saturation/value field, a hue slider, an eyedropper and a hex box — so the
 * plate can be matched to anything in the key visual rather than to a short
 * list of presets. Reset puts back the value the Figma boards ship with.
 */
function PlateColorField({ color, onChange }: { color: string; onChange: (next: string) => void }) {
  const t = useT();
  return (
    <div className="mt-3 mb-1">
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-xs font-medium text-gray-700">{t('Slot Color')}</p>
        {color.toLowerCase() !== PD_PLATE_FILL.toLowerCase() && (
          <button
            type="button"
            onClick={() => onChange(PD_PLATE_FILL)}
            className="text-[11px] text-gray-400 hover:text-gray-700"
          >
            {t('Reset')}
          </button>
        )}
      </div>
      <ColorPickerField value={color} onChange={onChange} />
    </div>
  );
}

function ProductRow({
  index,
  slot,
  onChange,
}: {
  index: number;
  slot: ProductSlot;
  onChange: (part: Partial<ProductSlot>) => void;
}) {
  const t = useT();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ScrapedImage[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // kept so Edit Crop can reopen the same source with the same framing
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropState, setCropState] = useState<CropState | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // brush step: original as the restore source, cut-out as the working state
  const [brushOrig, setBrushOrig] = useState<string | null>(null);
  const [brushProcessed, setBrushProcessed] = useState<string | null>(null);

  const handleImport = async () => {
    const trimmed = slot.url.trim();
    if (!trimmed) return;
    setGalleryOpen(true);
    setLoading(true);
    setError(null);
    setImages([]);
    const res = await scrapeProductImages(trimmed);
    setLoading(false);
    if (res.error) setError(res.error);
    else setImages(res.images);
  };

  const openWithBgRemoval = async (src: string) => {
    setProcessing(true);
    const cut = await removeBackgroundAI(src);
    setProcessing(false);
    setBrushOrig(src);
    setBrushProcessed(cut);
  };

  const handleGallerySelect = (img: ScrapedImage) => {
    setGalleryOpen(false);
    void openWithBgRemoval(getProxiedImageUrl(img.url));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => void openWithBgRemoval(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = '';   // so the same file can be picked again
  };

  const handleBrushDone = (result: string) => {
    setBrushOrig(null);
    setBrushProcessed(null);
    setCropSrc(result);
    setCropState(null);
    setCropOpen(true);
  };

  const handleCropConfirm = (dataUrl: string, cs: CropState) => {
    onChange({ image: dataUrl });
    setCropState(cs);
    setCropOpen(false);
  };

  const handleRemove = () => {
    onChange({ image: null });
    setCropSrc(null);
    setCropState(null);
  };

  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <p className="text-[11px] font-medium text-gray-400 tracking-wide mb-2">
        {t('PLATE')} {index}
      </p>
      <div className="flex items-start gap-2.5">
        <div className="w-14 h-14 shrink-0 rounded-lg border border-gray-200 bg-gray-50 relative overflow-hidden group flex items-center justify-center text-gray-300">
          {slot.image ? (
            <>
              <img src={slot.image} alt={`Product ${index}`} className="w-full h-full object-contain" draggable={false} />
              {cropSrc && (
                <button
                  type="button"
                  onClick={() => setCropOpen(true)}
                  title={t('Edit Crop')}
                  className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Crop size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={handleRemove}
                title={t('Remove')}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X size={10} />
              </button>
            </>
          ) : (
            <ImageIcon size={18} />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={slot.url}
              onChange={e => onChange({ url: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleImport()}
              placeholder={t('LG.com product URL')}
              className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-gray-200 text-[12px] text-gray-800 outline-none focus:border-[#FD312E] focus:ring-1 focus:ring-[#FD312E]"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={!slot.url.trim() || loading}
              className="shrink-0 px-3 h-9 rounded-lg bg-[#FD312E] text-white text-xs font-medium hover:bg-[#E22825] transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : null}
              {t('Import')}
            </button>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-9 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:border-gray-300 transition-colors"
          >
            {t('Upload')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {images.length > 0 && !galleryOpen && (
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="text-[11px] text-[#FD312E] underline text-left"
            >
              {t('Change from imported images')}
            </button>
          )}
        </div>
      </div>

      {galleryOpen && (
        <ImageGalleryModal
          images={images}
          isLoading={loading}
          error={error}
          onSelect={handleGallerySelect}
          onCancel={() => setGalleryOpen(false)}
          rankForCutout
        />
      )}

      {brushOrig && brushProcessed && (
        <BrushMaskEditor
          originalUrl={brushOrig}
          processedUrl={brushProcessed}
          onDone={handleBrushDone}
          onCancel={() => { setBrushOrig(null); setBrushProcessed(null); }}
        />
      )}

      {cropOpen && cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={PRODUCT_ASPECT}
          minZoom={0.5}
          title={t('Crop product')}
          initialCrop={cropState?.crop}
          initialZoom={cropState?.zoom}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropOpen(false)}
        />
      )}

      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl px-6 py-5 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#FD312E] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-800">{t('Removing background…')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
