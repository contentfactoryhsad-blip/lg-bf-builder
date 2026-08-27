import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { X, Check, ZoomIn, ZoomOut, Maximize2, Eye, EyeOff } from 'lucide-react';
import { useT, TFunction } from '../i18n/LanguageContext';
import { detectProductCropHint } from '../utils/nukkeeDetector';

// ─── Canvas crop helper ────────────────────────────────────────────────────────

async function getCroppedImg(imageSrc: string, pixelCrop: Area, bgFill?: string): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
  });

  const rawW = Math.abs(pixelCrop.width);
  const rawH = Math.abs(pixelCrop.height);

  const MAX_DIM = 2600;
  const scale = Math.min(1, MAX_DIM / Math.max(rawW, rawH));
  const outW = Math.round(rawW * scale);
  const outH = Math.round(rawH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;

  // Fill background with bgFill color, or leave transparent
  if (bgFill) {
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, outW, outH);
  } else {
    ctx.clearRect(0, 0, outW, outH);
  }

  const dstX = -pixelCrop.x * scale;
  const dstY = -pixelCrop.y * scale;
  const dstW = image.naturalWidth * scale;
  const dstH = image.naturalHeight * scale;

  ctx.drawImage(image, dstX, dstY, dstW, dstH);

  return canvas.toDataURL('image/png');
}

// ─── Edge-color sampler ─────────────────────────────────────────────────────────
// When a feature image doesn't fill the crop frame (zoomed out), the padding is
// filled with the image's own left/right edge colour so it blends seamlessly
// instead of showing white bars. Returns a CSS colour string.
async function sampleEdgeFillColor(src: string): Promise<string | null> {
  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = src;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
    });
    const S = 40;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, S, S);
    const data = ctx.getImageData(0, 0, S, S).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = 0; y < S; y++) {
      for (const x of [0, S - 1]) {          // leftmost + rightmost columns
        const i = (y * S + x) * 4;
        if (data[i + 3] < 10) continue;       // skip transparent
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
    }
    if (!n) return null;
    return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
  } catch {
    return null;
  }
}

// ─── Aspect ratio label ────────────────────────────────────────────────────────

function formatAspect(aspect: number | undefined, t: TFunction): string {
  if (!aspect) return t('Free');
  if (Math.abs(aspect - 1) < 0.01) return '1 : 1';
  if (Math.abs(aspect - 710 / 740) < 0.02) return `710 : 740  (${t('Product Image')})`;
  return `${aspect.toFixed(2)} : 1`;
}

// ─── Checkerboard SVG background (indicates transparency) ─────────────────────

/** The modal's width, and therefore the crop canvas's. */
const CANVAS_W = 660;

const CHECKERBOARD_BG = `
  repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 24px 24px
`.trim();

// ─── Component ────────────────────────────────────────────────────────────────

export interface CropState {
  crop: { x: number; y: number };
  zoom: number;
  /** The aspect ratio the crop frame had when this state was saved. Lets a later
   *  "Edit Crop" detect that the destination box's shape has since changed (e.g. a
   *  content-dependent slot, or a bug fix to the aspect) and recompute a fresh
   *  cover-fit instead of restoring a zoom/crop that no longer matches the frame. */
  aspect?: number;
}

interface Props {
  imageSrc: string;
  aspectRatio?: number;
  title: string;
  minZoom?: number;
  /** Upper bound of the zoom slider/Cropper (default 3 = 300%). */
  maxZoom?: number;
  /** Increment used by the +/- buttons and the slider's `step` (default 0.05 = 5%). */
  zoomStep?: number;
  /**
   * If provided, remaining area (when image is smaller than crop frame) is
   * filled with this color instead of being transparent.
   */
  bgFill?: string;
  /** Initial crop position (px offset). Lets Edit Crop restore previous state. */
  initialCrop?: { x: number; y: number };
  /** Initial zoom level. Lets Edit Crop restore previous state. */
  initialZoom?: number;
  /** The aspect the initialCrop/initialZoom were fitted against. If the current
   *  `aspectRatio` has since changed beyond a small tolerance, the restored state is
   *  treated as stale and a fresh cover-fit is computed instead. Omit this (or leave
   *  the saved CropState without `aspect`) to always trust the restored state as-is. */
  initialAspect?: number;
  /**
   * When true and image came from the white-bg gallery (nukkee), auto-detects the
   * product bounding box on canvas and sets the initial crop/zoom to frame the product.
   */
  autoCropProduct?: boolean;
  /**
   * For a caller that positions this same image with its OWN box-relative
   * placement system (e.g. CSS-pixel imageX/Y/width/height, unrelated to this
   * modal's internal 660×420 crop canvas) — lets "Edit Crop" restore the EXACT
   * currently-displayed framing. Returns scale-invariant values (so the caller
   * never needs to know this modal's internal canvas size): `bcx`/`bcy` = the
   * normalized (0–1) position within the image that's centered in the current
   * view, `zoom` = the react-easy-crop zoom value (also scale-invariant —
   * derived the same way regardless of frame size, see the math in
   * `detectProductCropHint`). Takes precedence over initialCrop/initialZoom.
   */
  computeInitialFraming?: (naturalWidth: number, naturalHeight: number) => { bcx: number; bcy: number; zoom: number } | null;
  /**
   * Fixed crop-frame size (px, in the modal's 660×420 canvas space). When set,
   * the red crop box is ALWAYS this size regardless of the image's aspect ratio
   * (react-easy-crop otherwise shrinks the box for non-square images), and the
   * image is auto-zoomed to cover it. Use for a consistent crop UI across images.
   */
  cropSize?: { width: number; height: number };
  /**
   * Floor the zoom at "cover", so the image's shorter side always fills the
   * crop box and no margin can ever open along an edge.
   *
   * This is also the fix for a framing mismatch, not just a nicety. Below
   * cover, react-easy-crop shows one thing and reports another: its position
   * limit is `abs(media·zoom/2 − box/2)`, so a media narrower than the box may
   * be dragged off-centre on screen, while `computeCroppedArea` clamps the
   * requested area back inside the image and returns x/y of 0. The applied
   * crop then sits somewhere the modal never showed. Only meaningful with
   * `cropSize` — an aspect-derived box is fitted to the media and cannot
   * exceed it.
   */
  lockToCover?: boolean;
  /**
   * Optional image URL drawn on top of the crop frame (aligned to it exactly),
   * to preview a non-rectangular clip. E.g. a shape "hole" overlay that dims the
   * parts of the crop that will be masked away, so the user sees what stays
   * visible. Assumes the overlay's aspect matches `aspectRatio`. Ignored when
   * `cropSize` is set (crop box size is then caller-driven, not aspect-derived). */
  cropFrameOverlay?: string;
  /**
   * When set, the footer gets a switch that hides `cropFrameOverlay`, labelled
   * with this string. A guide that cannot be turned off is in the way exactly
   * when it matters — while judging what is underneath it.
   */
  overlayToggleLabel?: string;
  /**
   * Height of the crop canvas (default 420). The crop frame is fitted inside
   * it, so for a square aspect this is also the frame's edge — raise it when
   * the frame carries a guide the user has to judge artwork against.
   */
  canvasHeight?: number;
  /**
   * When true, a saved CropState with no recorded `aspect` (i.e. from before this
   * field tracked it) is treated as stale on reopen and a fresh cover-fit is
   * computed instead of trusting the old zoom/crop. Use for fields whose real
   * destination aspect can legitimately change (content-dependent slots, or a
   * one-time self-heal after fixing a wrong aspect) — leave false (default) for
   * fields with a stable aspect, where an old saved state should always be trusted.
   */
  treatUnknownAspectAsStale?: boolean;
  /**
   * When true, if the image doesn't fill the crop frame the padding is filled with
   * the image's own sampled left/right edge colour (instead of the flat `bgFill`),
   * so a partially-covered feature image blends seamlessly rather than showing white
   * bars. Falls back to `bgFill` until the colour is sampled / if sampling fails.
   */
  autoEdgeFill?: boolean;
  /**
   * Border colour of the crop frame itself (default LG red). Change it when
   * `cropFrameOverlay` draws its own red marking inside the frame — two red
   * boxes a few pixels apart read as a rendering fault rather than as an outer
   * frame with an inner guide.
   */
  cropAreaBorderColor?: string;
  /**
   * Make "Fit" zoom the image until its width meets the frame's, rather than
   * resetting to natural size. Opt-in, so every other caller keeps the plain
   * reset.
   */
  fitFrameWidth?: boolean;
  /**
   * The fraction of the media's own width that is real content, when the
   * source was padded to reach the target aspect (see `padToCropAspect`);
   * 1 means no horizontal padding. "Fit" divides by it so the CONTENT's edge
   * reaches the frame — otherwise a portrait photo padded for a wide frame
   * "fits" at a zoom that still shows its own empty margins inside the frame.
   */
  fitWidthContentRatio?: number;
  /** Returns cropped dataURL plus the crop state so caller can persist it. */
  onConfirm: (croppedDataUrl: string, cropState: CropState) => void;
  onCancel: () => void;
}

export function ImageCropModal({
  imageSrc,
  aspectRatio,
  title,
  minZoom = 1,
  maxZoom = 3,
  zoomStep = 0.05,
  bgFill,
  initialCrop,
  initialZoom,
  initialAspect,
  treatUnknownAspectAsStale = false,
  autoCropProduct = false,
  computeInitialFraming,
  cropSize,
  lockToCover = false,
  cropFrameOverlay,
  overlayToggleLabel,
  canvasHeight = 420,
  autoEdgeFill = false,
  cropAreaBorderColor = '#FD312E',
  fitFrameWidth = false,
  fitWidthContentRatio = 1,
  onConfirm,
  onCancel,
}: Props) {
  const t = useT();
  const allowScaleDown = minZoom < 1;

  const [crop, setCrop] = useState(initialCrop ?? { x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialZoom ?? 1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);
  const [edgeFill, setEdgeFill] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  /** Zoom at which the media exactly covers the crop box — see lockToCover.
   *  0 when not locked, so an opted-out caller's own minZoom stands. */
  const [coverZoom, setCoverZoom] = useState(0);
  /** Kept for `fitFrameWidth`, which has to size the frame long after load. */
  const [mediaNaturalSize, setMediaNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const effMinZoom = Math.max(minZoom, coverZoom);
  // A long panorama can need a cover well past the caller's ceiling, and
  // react-easy-crop's clamp resolves min > max in favour of max — which would
  // put the zoom back below cover. Raise the ceiling only when the floor has
  // actually overtaken it; otherwise a deliberate ceiling stays where it is.
  const effMaxZoom = effMinZoom > maxZoom ? effMinZoom * 2 : maxZoom;

  // Sample the image's edge colour once for autoEdgeFill; used to pad instead of white.
  React.useEffect(() => {
    if (!autoEdgeFill) return;
    let cancelled = false;
    sampleEdgeFillColor(imageSrc).then((c) => { if (!cancelled) setEdgeFill(c); });
    return () => { cancelled = true; };
  }, [autoEdgeFill, imageSrc]);

  const effectiveBgFill = autoEdgeFill ? (edgeFill ?? bgFill) : bgFill;

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // onMediaLoaded: for nukkee gallery images, detect product bbox and auto-center/zoom.
  // Fallback: auto-cover (zoom to fill the crop frame) when initialZoom is not set.
  const onMediaLoaded = useCallback(
    async (mediaSize: { naturalWidth: number; naturalHeight: number; width?: number; height?: number }) => {
      // react-easy-crop reports the media's laid-out size (contained in the
      // canvas) alongside the natural one, which is the frame every zoom below
      // is measured against.
      setMediaNaturalSize({ w: mediaSize.naturalWidth, h: mediaSize.naturalHeight });
      const cover = lockToCover && cropSize && mediaSize.width && mediaSize.height
        ? Math.max(cropSize.width / mediaSize.width, cropSize.height / mediaSize.height)
        : 0;
      setCoverZoom(cover);
      // Same bounds effMinZoom/effMaxZoom derive, read locally because the
      // coverZoom state above has not landed yet.
      const floor = Math.max(minZoom, cover);
      const ceil = floor > maxZoom ? floor * 2 : maxZoom;
      if (computeInitialFraming) {
        const f = computeInitialFraming(mediaSize.naturalWidth, mediaSize.naturalHeight);
        if (f) {
          // Same frame-fitting math as detectProductCropHint, just fed
          // externally-supplied (scale-invariant) bcx/bcy/zoom instead of a
          // detected bounding box.
          const containerW = CANVAS_W, containerH = canvasHeight;
          const contAspect = containerW / containerH;
          const cropAspect = aspectRatio ?? 1;
          const cropFrameW = cropAspect >= contAspect ? containerW : containerH * cropAspect;
          const cropFrameH = cropAspect >= contAspect ? containerW / cropAspect : containerH;
          const coverScale = Math.max(cropFrameW / mediaSize.naturalWidth, cropFrameH / mediaSize.naturalHeight);
          const fitW = mediaSize.naturalWidth * coverScale;
          const fitH = mediaSize.naturalHeight * coverScale;
          setCrop({ x: -(f.bcx - 0.5) * fitW * f.zoom, y: -(f.bcy - 0.5) * fitH * f.zoom });
          setZoom(Math.max(floor, f.zoom));
          return;
        }
      }
      if (autoCropProduct) {
        const hint = await detectProductCropHint(
          imageSrc,
          mediaSize.naturalWidth,
          mediaSize.naturalHeight,
          CANVAS_W, canvasHeight,
          aspectRatio ?? 1,
          cropSize,
        );
        if (hint) { setCrop(hint.crop); setZoom(Math.max(floor, hint.zoom)); return; }
        // Detection failed — fall through to auto-cover below
      }
      if (initialZoom !== undefined) {
        // Restoring previous state — unless the box shape it was fitted to has since
        // changed (or, for opted-in fields, we don't even know what it was fitted to),
        // in which case the old zoom/crop no longer matches this frame — fall through
        // and recompute a fresh cover-fit instead of trusting stale values.
        const stale = aspectRatio !== undefined && (
          initialAspect !== undefined
            ? Math.abs(initialAspect - aspectRatio) > 0.02
            : treatUnknownAspectAsStale
        );
        // A framing saved before the current bounds existed can sit outside
        // them; pull it back in rather than discard the framing, and let
        // restrictPosition pull the offset back inside.
        if (!stale) { setZoom((z) => Math.min(ceil, Math.max(floor, z))); return; }
      }
      // Fixed crop box: zoom the image so it covers the box (fills it), so every
      // image fills the same-size red frame the same way.
      if (cropSize) {
        const containerW = CANVAS_W, containerH = canvasHeight;
        const fitScale = Math.min(containerW / mediaSize.naturalWidth, containerH / mediaSize.naturalHeight);
        const fittedW = mediaSize.naturalWidth * fitScale;
        const fittedH = mediaSize.naturalHeight * fitScale;
        const z = Math.max(cropSize.width / fittedW, cropSize.height / fittedH);
        setZoom(Math.min(ceil, Math.max(floor, z)));
        setCrop({ x: 0, y: 0 });
        return;
      }
      if (!aspectRatio) return;
      // Cover the frame's actual pixel size inside the canvas, not merely the
      // aspect mismatch. Comparing aspects alone misses a source whose aspect
      // already matches but whose natural size is smaller than the canvas —
      // react-easy-crop then lays it out contain-fitted at zoom 1 and sizes the
      // crop area to those small pixels rather than to the frame, which slides
      // it out from under any overlay guide (guides assume the full frame).
      const containerW = CANVAS_W, containerH = canvasHeight, contAspect = containerW / containerH;
      const cropFrameW = aspectRatio >= contAspect ? containerW : containerH * aspectRatio;
      const cropFrameH = aspectRatio >= contAspect ? containerW / aspectRatio : containerH;
      const fitScale = Math.min(containerW / mediaSize.naturalWidth, containerH / mediaSize.naturalHeight);
      const coverZ = Math.max(
        cropFrameW / (mediaSize.naturalWidth * fitScale),
        cropFrameH / (mediaSize.naturalHeight * fitScale),
      );
      setZoom(Math.min(ceil, Math.max(floor, coverZ)));
    },
    [aspectRatio, initialZoom, initialAspect, treatUnknownAspectAsStale, autoCropProduct, imageSrc, computeInitialFraming, cropSize, lockToCover, minZoom, maxZoom, canvasHeight],
  );

  const handleFit = () => {
    if (fitFrameWidth && aspectRatio && mediaNaturalSize) {
      const containerW = CANVAS_W, containerH = canvasHeight, contAspect = containerW / containerH;
      const frameW = cropSize ? cropSize.width : (aspectRatio >= contAspect ? containerW : containerH * aspectRatio);
      const fitScale = Math.min(containerW / mediaNaturalSize.w, containerH / mediaNaturalSize.h);
      const zoomToFrame = (frameW / (mediaNaturalSize.w * fitScale)) / fitWidthContentRatio;
      setZoom(Math.min(effMaxZoom, Math.max(effMinZoom, zoomToFrame)));
      setCrop({ x: 0, y: 0 });
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setApplying(true);
    try {
      const result = await getCroppedImg(imageSrc, croppedAreaPixels, effectiveBgFill);
      onConfirm(result, { crop, zoom, aspect: aspectRatio });
    } catch (e) {
      console.error('Crop failed:', e);
    } finally {
      setApplying(false);
    }
  };

  // Canvas background: show fill color when set (edge-fill when autoEdgeFill), checkerboard
  // when transparent mode, dark otherwise — so the live preview matches the exported padding.
  const canvasBg = effectiveBgFill
    ? effectiveBgFill
    : allowScaleDown
    ? CHECKERBOARD_BG
    : '#1a1a1a';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.78)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: CANVAS_W, maxHeight: '92vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-800">{t('Crop Image')}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Crop canvas ── */}
        <div
          className="relative shrink-0"
          style={{ height: canvasHeight, background: canvasBg }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={effMinZoom}
            maxZoom={effMaxZoom}
            aspect={aspectRatio}
            {...(cropSize ? { cropSize } : {})}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            onMediaLoaded={onMediaLoaded}
            showGrid
            zoomWithScroll={false}
            restrictPosition={!allowScaleDown}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: {
                border: `2px solid ${cropAreaBorderColor}`,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.50)',
              },
            }}
          />
          {cropFrameOverlay && showOverlay && (cropSize || aspectRatio) && (() => {
            // Align the overlay to react-easy-crop's crop frame. With `cropSize`
            // the frame is exactly that; otherwise it is the aspect fitted into
            // the canvas — but only while the media covers the canvas, which is
            // why a guide belongs with a fixed `cropSize` rather than an aspect.
            const cw = CANVAS_W, ch = canvasHeight, contAspect = cw / ch;
            const ar = aspectRatio ?? 1;
            const boxW = cropSize ? cropSize.width : ar >= contAspect ? cw : ch * ar;
            const boxH = cropSize ? cropSize.height : ar >= contAspect ? cw / ar : ch;
            return (
              <img
                src={cropFrameOverlay}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: (cw - boxW) / 2,
                  top: (ch - boxH) / 2,
                  width: boxW,
                  height: boxH,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            );
          })()}
        </div>

        {/* ── Zoom slider ── */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0 bg-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoom((z) => Math.max(effMinZoom, +(z - zoomStep).toFixed(2)))}
              className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
              title={t('Zoom out')}
            >
              <ZoomOut size={15} />
            </button>

            <input
              type="range"
              min={effMinZoom}
              max={effMaxZoom}
              step={zoomStep}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#FD312E]"
            />

            <button
              onClick={() => setZoom((z) => Math.min(effMaxZoom, +(z + zoomStep).toFixed(2)))}
              className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
              title={t('Zoom in')}
            >
              <ZoomIn size={15} />
            </button>

            <span className="text-xs text-gray-500 w-11 text-right shrink-0 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            {cropFrameOverlay && overlayToggleLabel && (
              <button
                onClick={() => setShowOverlay((v) => !v)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-colors"
                style={{
                  borderColor: showOverlay ? '#FD312E' : '#e5e7eb',
                  color: showOverlay ? '#FD312E' : '#6b7280',
                }}
              >
                {showOverlay ? <Eye size={13} /> : <EyeOff size={13} />}
                {overlayToggleLabel}
              </button>
            )}
            {allowScaleDown && (
              <button
                onClick={handleFit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm text-gray-600 border border-gray-200 hover:border-[#FD312E] hover:text-[#FD312E] transition-colors"
              >
                <Maximize2 size={13} />
                {t('Fit')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-full text-sm text-gray-600 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm bg-[#FD312E] text-white hover:bg-[#E22825] disabled:opacity-60 transition-colors"
            >
              <Check size={14} />
              {applying ? t('Applying…') : t('Apply Crop')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}