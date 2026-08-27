/**
 * Off-site Banner — backdrop upload guide (Figma `guide`, 4113:487).
 *
 * A backdrop is ONE square scene, placed rather than cropped: each delivery
 * size draws it at its own scale and offset and then shows it through a blind
 * (see OffSiteLayout.backdrop / .blind). So an uploaded scene has to be framed
 * once, blind to both windows — which is what this guide is for.
 *
 * The safe rect is the designer's, transcribed rather than derived: the 1300²
 * guide frame (4104:183) insets it by 290 on the sides, 480 from the top and
 * 100 from the bottom. That is tighter than the geometric overlap of the two blinds, because
 * a blind fades rather than cuts — a subject technically inside the wide window
 * can still be halfway into its ramp. Re-read this when the guide moves.
 */

/** Edge of the square an upload is normalised to. Matches the guide PSD and
 *  the scale the layout table places the source at. */
export const BACKDROP_SOURCE_SIZE = 1300;

/** Edge of the crop frame in the framing modal. Fixed, so the guide drawn on
 *  it is the same size for a square library scene and a portrait upload. */
export const BACKDROP_CROP_BOX = 560;

/** Longest edge an uploaded scene is capped to before it is framed. */
export const BACKDROP_UPLOAD_MAX = 2400;

const GUIDE = { size: 1300, top: 480, bottom: 100, side: 290 };

/** Part of the source every delivery size shows, as fractions of the square. */
export const BACKDROP_SAFE_RECT = {
  x: GUIDE.side / GUIDE.size,
  y: GUIDE.top / GUIDE.size,
  w: (GUIDE.size - GUIDE.side * 2) / GUIDE.size,
  h: (GUIDE.size - GUIDE.top - GUIDE.bottom) / GUIDE.size,
};

const pct = (v: number) => +(v * 100).toFixed(4);
const safe = {
  x: pct(BACKDROP_SAFE_RECT.x),
  y: pct(BACKDROP_SAFE_RECT.y),
  w: pct(BACKDROP_SAFE_RECT.w),
  h: pct(BACKDROP_SAFE_RECT.h),
};

// Figma sets the label at 80px on the 1300 frame; in a 100-unit viewBox that
// is 6.15, so it keeps its proportion whatever size the crop frame renders at.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
  <rect x="${safe.x}" y="${safe.y}" width="${safe.w}" height="${safe.h}"
        fill="rgba(255,132,132,0.4)" />
  <text x="${safe.x + safe.w / 2}" y="${safe.y + safe.h / 2}" fill="#ffffff" font-size="6.15"
        font-family="sans-serif" font-weight="600" letter-spacing="0.13"
        text-anchor="middle" dominant-baseline="middle">Safe Area</text>
</svg>`.trim();

/** Overlay for ImageCropModal's `cropFrameOverlay`, at aspect 1. */
export const BACKDROP_GUIDE_OVERLAY =
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
