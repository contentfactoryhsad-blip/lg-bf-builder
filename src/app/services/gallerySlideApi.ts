import type { SlideRegion, ZoneLine } from '../components/thumbnail/GallerySlideTemplate';

export interface SlideImage {
  imgW: number;
  imgH: number;
  /** Dominant colour around a block, from actual pixels. Null if unreadable. */
  sampleBg(bbox: { x: number; y: number; w: number; h: number }): string | null;
  /**
   * ONE pixel pass over the slide's copy zone (the union of the model's coarse
   * boxes): detects every text line there, clusters consecutive similar lines
   * into REGIONS, and eyedrops each region's background/ink colours. Replaces
   * the old per-block window refine, whose overlapping windows swallowed
   * neighbouring lines (or failed outright) on stacked headlines. Empty when
   * the canvas is unreadable or no text-like lines exist.
   */
  analyzeSlideRegions(bboxes: Array<{ x: number; y: number; w: number; h: number }>): SlideRegion[];
  /**
   * True when the slide looks like a plain PRODUCT CUTOUT shot (white-bordered
   * canvas with an empty top band): per spec, no text pass runs on these at
   * all. Marketing slides with a white panel still carry text rows in the top
   * band, so they are NOT flagged.
   */
  isProductShot(): boolean;
  /**
   * Detects the classic WHITE FEATURE CARD layout — pure-white background
   * with the head/sub copy in the top area and the artwork below. This is
   * the sole layout the re-typeset pipeline handles; every other slide
   * (beige/colour panels, gradients, lifestyle photos, text-over-image)
   * passes through untouched, without even a vision call (`ok: false`).
   * `bottom` is the row where the white copy band ends and the artwork
   * starts (image-height fraction) — the floor the re-typeset head/sub may
   * flow (wrap) down to before the render has to shrink them.
   */
  whiteCopyZone(): { ok: boolean; bottom: number };
  /**
   * True when the image is wider than tall AND the strips outside the centred
   * 1:1 crop window (what the card would clip) hold real non-white content —
   * i.e. force-fitting it would visibly lose part of the design. False for
   * square/portrait images (nothing is clipped) or a wide image whose side
   * margins are just blank background.
   */
  hasCroppedContent(): boolean;
}

// Analysis canvas resolution (longest side). Big enough that a small body line
// on a 4K slide still spans ≥4 rows AND that tight paragraph leading (~4px on
// a 2010×1334 slide) keeps ≥2 blank rows between lines — at 900 the two sub
// lines of the UK C6 cards merged into one through the 1-row-hole bridge.
const SCAN_MAX = 1200;
// A pixel is "ink" when its summed RGB distance from the panel colour exceeds this.
const INK_DIST = 120;
// Within-window row classification by ink fraction. The window hugs the text,
// so real text rows carry much more ink than in a full-width scan. MIN is kept
// low so the sparse ascender/descender edge rows still count — trimming them
// under-measures the ink height (≈20% too-small fonts in probing).
const ROW_TEXT_MIN = 0.01;
// The zone's x-band is already restricted to the copy area, so a text row may
// legitimately fill almost the whole band — only fully-solid rows are "photo".
const ROW_TEXT_MAX = 0.98;

/**
 * Load a slide image for sizing, colour sampling AND per-block text measurement.
 * Loaded via the proxy with `crossOrigin` so its pixels are readable; a distinct
 * query param avoids reusing a non-CORS cached copy from plain <img> tags.
 */
export function loadSlideImage(src: string): Promise<SlideImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      let ctx: CanvasRenderingContext2D | null = null;
      let cw = 0;
      let ch = 0;
      try {
        const s = Math.min(1, SCAN_MAX / Math.max(imgW, imgH, 1));
        cw = Math.max(1, Math.round(imgW * s));
        ch = Math.max(1, Math.round(imgH * s));
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx?.drawImage(img, 0, 0, cw, ch);
      } catch { ctx = null; }

      const sampleBg = (bbox: { x: number; y: number; w: number; h: number }): string | null => {
        if (!ctx) return null;
        try {
          const gx = Math.max(bbox.w * 0.5, 0.03);
          const gy = Math.max(bbox.h * 0.6, 0.03);
          const x0 = Math.max(0, Math.floor((bbox.x - gx) * cw));
          const y0 = Math.max(0, Math.floor((bbox.y - gy) * ch));
          const x1 = Math.min(cw, Math.ceil((bbox.x + bbox.w + gx) * cw));
          const y1 = Math.min(ch, Math.ceil((bbox.y + bbox.h + gy) * ch));
          const w = x1 - x0;
          const h = y1 - y0;
          if (w <= 0 || h <= 0) return null;
          const data = ctx.getImageData(x0, y0, w, h).data;
          const counts = new Map<number, number>();
          let bestKey = -1;
          let bestN = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 200) continue;
            const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
            const n = (counts.get(key) || 0) + 1;
            counts.set(key, n);
            if (n > bestN) { bestN = n; bestKey = key; }
          }
          if (bestKey < 0) return null;
          // The modal 4-bit bucket only IDENTIFIES the dominant colour region —
          // returning the bucket centre snaps to a 17-step grid (visibly off on
          // flat panels). Average the actual pixels of that bucket instead.
          let sr = 0, sg = 0, sb = 0, sn = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 200) continue;
            const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
            if (key !== bestKey) continue;
            sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; sn++;
          }
          if (sn === 0) return null;
          return '#' + [sr / sn, sg / sn, sb / sn]
            .map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
        } catch {
          return null;
        }
      };

      /** Modal-bucket MEAN colour of a pixel range predicate — the true average
       *  of the dominant colour, not a quantised bucket centre. `share` is the
       *  modal bucket's fraction of all pixels: glyph ink concentrates in one
       *  colour (high share), photography smears across hundreds (low). */
      const modalMean = (
        data: Uint8ClampedArray,
        each: (cb: (i: number) => void) => void,
      ): { c: [number, number, number]; share: number } | null => {
        const counts = new Map<number, number>();
        let bk = -1, bn = 0, total = 0;
        each((i) => {
          total++;
          const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
          const n = (counts.get(key) || 0) + 1;
          counts.set(key, n);
          if (n > bn) { bn = n; bk = key; }
        });
        if (bk < 0) return null;
        let sr = 0, sg = 0, sb = 0, sn = 0;
        each((i) => {
          const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
          if (key !== bk) return;
          sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; sn++;
        });
        if (sn === 0) return null;
        return { c: [Math.round(sr / sn), Math.round(sg / sn), Math.round(sb / sn)], share: bn / total };
      };
      const toHex = (c: [number, number, number]) =>
        '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

      const analyzeSlideRegions = (
        bboxes: Array<{ x: number; y: number; w: number; h: number }>,
      ): SlideRegion[] => {
        if (!ctx || bboxes.length === 0) return [];
        try {
          // 1. Copy zone: the model's coarse boxes are only a SEED. Probing
          // against live LG slides showed the model's x regularly starts
          // ~0.07 right of the true ink (leaving the first characters of
          // every line unmasked) and its y+h under-reports paragraphs (the
          // last line fell outside a +0.05 pad and leaked whole). So: the
          // band locates the text ROWS, each line's true x-extent is then
          // GROWN over the full image width, and the bottom pad is generous.
          const bx0 = Math.max(0, Math.floor((Math.min(...bboxes.map((b) => b.x)) - 0.04) * cw));
          const bx1 = Math.min(cw, Math.ceil((Math.max(...bboxes.map((b) => b.x + b.w)) + 0.04) * cw));
          const zy0 = Math.max(0, Math.floor((Math.min(...bboxes.map((b) => b.y)) - 0.04) * ch));
          const zy1 = Math.min(ch, Math.ceil(Math.min(0.62, Math.max(...bboxes.map((b) => b.y + b.h)) + 0.12) * ch));
          const BW = bx1 - bx0;
          const H = zy1 - zy0;
          if (BW < 8 || H < 6) return [];
          // Full-width rows: line x-extents must be able to grow past the band.
          const data = ctx.getImageData(0, zy0, cw, H).data;

          // 2. Ink classification against each ROW's own local background —
          // a single zone colour breaks on GRADIENT panels, where whole rows
          // drift away from the global mode and the text lines vanish. The
          // row background is the MODAL colour bucket's mean, NOT the median:
          // when a text line fills most of the band, glyph pixels outnumber
          // background at the median and the classification INVERTS (the
          // white margins read as "ink" — measured lines snapped to the band
          // edges and masks drifted). The mode stays on the background: panel
          // pixels concentrate in one bucket while anti-aliased glyphs smear
          // across many.
          const medR = new Uint8ClampedArray(H);
          const medG = new Uint8ClampedArray(H);
          const medB = new Uint8ClampedArray(H);
          {
            const counts = new Map<number, number>();
            for (let y = 0; y < H; y++) {
              counts.clear();
              let bk = -1, bn = 0;
              for (let x = 0; x < BW; x++) {
                const i = (y * cw + bx0 + x) * 4;
                const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
                const n = (counts.get(key) || 0) + 1;
                counts.set(key, n);
                if (n > bn) { bn = n; bk = key; }
              }
              let sr = 0, sg = 0, sb = 0, sn = 0;
              for (let x = 0; x < BW; x++) {
                const i = (y * cw + bx0 + x) * 4;
                const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
                if (key !== bk) continue;
                sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; sn++;
              }
              medR[y] = sn > 0 ? Math.round(sr / sn) : 255;
              medG[y] = sn > 0 ? Math.round(sg / sn) : 255;
              medB[y] = sn > 0 ? Math.round(sb / sn) : 255;
            }
          }
          const isInkMode = (x: number, y: number) => {
            const i = (y * cw + x) * 4;
            return Math.abs(data[i] - medR[y]) + Math.abs(data[i + 1] - medG[y]) + Math.abs(data[i + 2] - medB[y]) > INK_DIST;
          };

          // 3. ONE row projection over the band → every text line, no window
          // overlap, no per-block failures.
          const frac = new Float32Array(H);
          for (let y = 0; y < H; y++) {
            let c = 0;
            for (let x = bx0; x < bx1; x++) if (isInkMode(x, y)) c++;
            frac[y] = c / BW;
          }
          // Adaptive threshold: on glowy dark panels even BLANK rows carry a
          // few percent of "ink" (photo glow bleeding through) — a fixed 1%
          // floor merges all lines into one giant run there. The 25th
          // percentile of row fractions estimates that blank-row noise level.
          const sortedFrac = [...frac].sort((a, c) => a - c);
          const base = sortedFrac[Math.floor(sortedFrac.length * 0.25)];
          const thr = Math.max(ROW_TEXT_MIN, base + 0.015);
          const isText = (y: number) => y >= 0 && y < H && frac[y] >= thr && frac[y] <= ROW_TEXT_MAX;
          const minH = Math.max(3, Math.round(ch * 0.006));
          const runs: Array<{ s: number; e: number }> = [];
          let s = -1;
          for (let y = 0; y <= H; y++) {
            const t = y < H && isText(y);
            if (t && s < 0) s = y;
            else if (!t && s >= 0) {
              if (y < H && isText(y + 1)) continue; // bridge a 1-row hole
              if (y - s >= minH) runs.push({ s, e: y - 1 });
              s = -1;
            }
          }
          // Recover the faint ascender/descender FRINGE rows the main
          // threshold missed — they carry the g/p tails, and without them
          // the tight 2px mask clips descender tips. Extend each run while
          // adjacent rows still show a little ink (relaxed threshold),
          // capped at 35% of the run height, never into a neighbour run.
          {
            const occ = new Uint8Array(H);
            for (const r of runs) for (let y = r.s; y <= r.e; y++) occ[y] = 1;
            const thrLo = Math.max(0.004, thr * 0.3);
            for (const r of runs) {
              const ext = Math.max(2, Math.round((r.e - r.s + 1) * 0.15));
              for (let k = 0; k < ext && r.s - 1 >= 0 && !occ[r.s - 1] && frac[r.s - 1] >= thrLo; k++) {
                r.s--; occ[r.s] = 1;
              }
              for (let k = 0; k < ext && r.e + 1 < H && !occ[r.e + 1] && frac[r.e + 1] >= thrLo; k++) {
                r.e++; occ[r.e] = 1;
              }
            }
          }

          // 3b. Re-derive the background of every TEXT row from the clean
          // rows just outside its run. Inside a bold headline the glyph
          // pixels can outnumber the background in a row — then even the
          // modal bucket flips to the INK colour and the classification
          // inverts (the whole row reads as ink). A text line's true
          // background is, by definition, the colour right above/below it;
          // a pixel is ink only when it differs from BOTH (handles lines
          // sitting on a panel boundary).
          const inRun = new Uint8Array(H);
          for (const r of runs) for (let y = r.s; y <= r.e; y++) inRun[y] = 1;
          const aR = Uint8ClampedArray.from(medR), aG = Uint8ClampedArray.from(medG), aB = Uint8ClampedArray.from(medB);
          const bR = Uint8ClampedArray.from(medR), bG = Uint8ClampedArray.from(medG), bB = Uint8ClampedArray.from(medB);
          for (const r of runs) {
            let ya = r.s - 1;
            while (ya >= 0 && inRun[ya]) ya--;
            let yb = r.e + 1;
            while (yb < H && inRun[yb]) yb++;
            const hasA = ya >= 0, hasB = yb < H;
            for (let y = r.s; y <= r.e; y++) {
              if (hasA) { aR[y] = medR[ya]; aG[y] = medG[ya]; aB[y] = medB[ya]; }
              else if (hasB) { aR[y] = medR[yb]; aG[y] = medG[yb]; aB[y] = medB[yb]; }
              if (hasB) { bR[y] = medR[yb]; bG[y] = medG[yb]; bB[y] = medB[yb]; }
              else if (hasA) { bR[y] = medR[ya]; bG[y] = medG[ya]; bB[y] = medB[ya]; }
            }
          }
          const isInk = (x: number, y: number) => {
            const i = (y * cw + x) * 4;
            return Math.abs(data[i] - aR[y]) + Math.abs(data[i + 1] - aG[y]) + Math.abs(data[i + 2] - aB[y]) > INK_DIST
              && Math.abs(data[i] - bR[y]) + Math.abs(data[i + 1] - bG[y]) + Math.abs(data[i + 2] - bB[y]) > INK_DIST;
          };

          // 4. Per-line x-extents: detect inside the band, then GROW outward
          // over the full width — stopping only at a gap wider than ~1.2 line
          // heights (word spaces are far narrower; side imagery sits beyond a
          // clean gutter). This recovers the characters the model's x-window
          // cut off. Noise filters: too narrow / too tall for text.
          const lines: ZoneLine[] = [];
          for (const ln of runs) {
            if ((ln.e - ln.s + 1) / ch > 0.10) continue; // taller than any text line (max seen ≈0.05) → photo/panel band
            const colInk = (x: number) => {
              for (let y = ln.s; y <= ln.e; y++) if (isInk(x, y)) return true;
              return false;
            };
            const growGap = Math.max(6, Math.round((ln.e - ln.s + 1) * 1.2));
            // Seed = the DOMINANT contiguous ink segment inside the band
            // (segments split at gaps ≥ growGap; word spaces are far smaller).
            // A plain min/max over the band stretched "Design" to faint design
            // marks 300px right of the word — breaking both centring and the
            // measured width.
            let x0 = -1, x1 = -1;
            {
              let s0 = -1, sEnd = -1, sCount = 0, bestCount = 0, lastInk = -1;
              const commit = () => {
                if (s0 >= 0 && sCount > bestCount) { bestCount = sCount; x0 = s0; x1 = sEnd; }
              };
              for (let x = bx0; x < bx1; x++) {
                if (!colInk(x)) continue;
                if (lastInk >= 0 && x - lastInk >= growGap) { commit(); s0 = -1; }
                if (s0 < 0) { s0 = x; sCount = 0; }
                sEnd = x; sCount++; lastInk = x;
              }
              commit();
            }
            if (x0 < 0) continue;
            for (let x = x0 - 1, gap = 0; x >= 0 && gap < growGap; x--) {
              if (colInk(x)) { x0 = x; gap = 0; } else gap++;
            }
            for (let x = x1 + 1, gap = 0; x < cw && gap < growGap; x++) {
              if (colInk(x)) { x1 = x; gap = 0; } else gap++;
            }
            if (x1 - x0 < cw * 0.015) continue;
            // SOLIDITY: real text is discontinuous (letter/word gaps every few
            // characters); one unbroken ink run covering most of the extent is
            // a panel edge or photo slice — never a line of copy.
            {
              let runMax = 0, run = 0;
              for (let x = x0; x <= x1; x++) {
                if (colInk(x)) { run++; if (run > runMax) runMax = run; } else run = 0;
              }
              if (runMax > (x1 - x0 + 1) * 0.6 && x1 - x0 > cw * 0.1) continue;
            }
            lines.push({
              y: (zy0 + ln.s) / ch,
              h: (ln.e - ln.s + 1) / ch,
              x0: x0 / cw,
              x1: (x1 + 1) / cw,
            });
          }
          if (lines.length === 0) return [];

          // 5. Cluster consecutive similar lines into REGIONS: small vertical
          // gap + similar line height = same paragraph; a size jump (head vs
          // sub) or a big gap starts a new region.
          const clusters: ZoneLine[][] = [];
          for (const l of lines) {
            const cur = clusters[clusters.length - 1];
            if (cur) {
              const prev = cur[cur.length - 1];
              const gap = l.y - (prev.y + prev.h);
              const hRatio = Math.max(l.h, prev.h) / Math.max(1e-6, Math.min(l.h, prev.h));
              if (gap < Math.max(l.h, prev.h) * 1.0 && hRatio < 1.35) { cur.push(l); continue; }
            }
            clusters.push([l]);
          }

          // 6. Eyedrop per region: bg around the region's box, ink colour from
          // its own ink pixels. bg is the per-channel MEDIAN of the non-ink
          // pixels — the modal-bucket mean gets pulled toward anti-aliased
          // glyph edges (a pure-white panel came out a visibly-grey #f8f8f8).
          // inkRatio flags photo-like clusters so the renderer never stamps a
          // mask over photography.
          return clusters.map((cls) => {
            const ry0 = Math.max(0, Math.floor((Math.min(...cls.map((l) => l.y)) - 0.015) * ch) - zy0);
            const ry1 = Math.min(H, Math.ceil((Math.max(...cls.map((l) => l.y + l.h)) + 0.015) * ch) - zy0);
            const rx0 = Math.max(0, Math.floor((Math.min(...cls.map((l) => l.x0)) - 0.02) * cw));
            const rx1 = Math.min(cw, Math.ceil((Math.max(...cls.map((l) => l.x1)) + 0.02) * cw));
            let inkN = 0, totalN = 0;
            const rs: number[] = [], gs: number[] = [], bs: number[] = [];
            const inkIdx: number[] = [];
            for (let y = ry0; y < ry1; y++) {
              for (let x = rx0; x < rx1; x++) {
                const i = (y * cw + x) * 4;
                totalN++;
                if (isInk(x, y)) { inkN++; inkIdx.push(i); }
                else { rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]); }
              }
            }
            const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
            const my = Math.min(H - 1, Math.max(0, Math.round((ry0 + ry1) / 2)));
            const bg: [number, number, number] = rs.length > 0
              ? [med(rs), med(gs), med(bs)]
              : [medR[my], medG[my], medB[my]];
            const ink = modalMean(data, (cb) => { for (const i of inkIdx) cb(i); });
            return {
              lines: cls,
              bg: toHex(bg),
              text: ink ? toHex(ink.c) : undefined,
              inkRatio: totalN > 0 ? inkN / totalN : 1,
              inkPurity: ink ? ink.share : undefined,
            };
          });
        } catch {
          return []; // tainted canvas / read error
        }
      };

      const isProductShot = (): boolean => {
        if (!ctx) return false;
        try {
          const data = ctx.getImageData(0, 0, cw, ch).data;
          const whiteAt = (x: number, y: number) => {
            const i = (y * cw + x) * 4;
            return data[i + 3] < 30 || (data[i] >= 235 && data[i + 1] >= 235 && data[i + 2] >= 235);
          };
          // 1. Border must be near-uniform white (cutout canvas).
          let border = 0, white = 0;
          for (let x = 0; x < cw; x++) {
            if (whiteAt(x, 0)) white++;
            if (whiteAt(x, ch - 1)) white++;
            border += 2;
          }
          for (let y = 1; y < ch - 1; y++) {
            if (whiteAt(0, y)) white++;
            if (whiteAt(cw - 1, y)) white++;
            border += 2;
          }
          if (white / Math.max(1, border) < 0.95) return false;
          // 2. Top band must be EMPTY — a white marketing slide carries its
          // copy up there and must still be analyzed.
          const bandH = Math.floor(ch * 0.24);
          for (let y = 0; y < bandH; y++) {
            let ink = 0;
            for (let x = 0; x < cw; x++) if (!whiteAt(x, y)) ink++;
            const f = ink / cw;
            if (f >= 0.004) return false; // anything (text OR product) up top → analyze
          }
          return true;
        } catch {
          return false;
        }
      };

      const whiteCopyZone = (): { ok: boolean; bottom: number } => {
        if (!ctx) return { ok: false, bottom: 0 };
        try {
          const data = ctx.getImageData(0, 0, cw, ch).data;
          // Strict white (245+) so the beige/grey panel variants (#f6f3ec…)
          // fall through to pass-through instead of being half-processed.
          const whiteAt = (x: number, y: number) => {
            const i = (y * cw + x) * 4;
            return data[i + 3] < 30 || (data[i] >= 245 && data[i + 1] >= 245 && data[i + 2] >= 245);
          };
          const darkAt = (x: number, y: number) => {
            const i = (y * cw + x) * 4;
            return data[i + 3] >= 30 && data[i] + data[i + 1] + data[i + 2] < 480;
          };
          // The card reads top-down as: white margin → copy zone (dark glyphs
          // on white) → artwork. Walk the top 60% row by row; any clearly
          // non-white row BEFORE the copy zone ends means the top is not a
          // clean white copy area.
          const scanH = Math.floor(ch * 0.6);
          const rowStat = (y: number): { t: 'white' | 'text' | 'other'; df: number } => {
            let white = 0, dark = 0;
            for (let x = 0; x < cw; x++) {
              if (whiteAt(x, y)) white++;
              else if (darkAt(x, y)) dark++;
            }
            const wf = white / cw, df = dark / cw;
            // wf tightened slightly from 0.55: a lifestyle photo or colour panel
            // can have an occasional bright row that used to slip through as
            // "white"/"text". df stays at the original 0.35 — a bold 56-72px
            // headline's own ink density can exceed 25-30%, so tightening THAT
            // threshold too (as briefly tried, 0.75/0.25) misclassified real
            // headline rows as "other" and broke eligibility for legitimate
            // white copy cards entirely (they fell back to plain pass-through).
            if (wf < 0.60 || df > 0.35) return { t: 'other', df };
            return { t: df >= 0.004 ? 'text' : 'white', df };
          };
          let y = 0;
          while (y < scanH && rowStat(y).t === 'white') y++;
          if (y === 0 || y >= scanH) return { ok: false, bottom: 0 }; // no white top margin / nothing in the top 60%
          const zoneStart = y;
          let textRows = 0;
          // The zone ends at a RUN of ≥4 non-white rows: artwork/colour panels
          // span hundreds of rows, while a bold headline's x-height rows dip
          // past the 'other' thresholds for only 1–3 rows at a time. `runStart`
          // (the row the run began at) becomes the floor the re-typeset
          // head/sub may flow down to — the last row still safely white.
          let otherRun = 0;
          let runStart = -1;
          for (; y < scanH; y++) {
            const { t, df } = rowStat(y);
            if (t === 'other') {
              if (otherRun === 0) runStart = y;
              if (++otherRun >= 4) break;
            } else {
              otherRun = 0;
              runStart = -1;
            }
            if (t === 'text' || (t === 'other' && df >= 0.004)) textRows++;
          }
          const bottom = (otherRun >= 4 ? runStart : y) / ch;
          // Enough glyph rows for at least a headline, AND the copy must begin
          // right at the top (≤10% down). Genuine white feature cards put the
          // head copy immediately under a thin top margin — probing the live
          // LG.com TV lineup, every real card's zone starts at 0.044–0.052.
          // Product-shot false positives start their first non-white content
          // far lower: a TV side-profile silhouette (a thin dark bar the row
          // scan mistakes for stacked text lines) at ~0.24, and a dimensions
          // diagram's top callout at ~0.15. The old 0.35 ("top third") floor
          // let both through; 0.10 sits in the clean ~3× gap between the two
          // clusters, rejecting the product shots without dropping any card.
          const ok = textRows >= Math.max(6, Math.round(ch * 0.015)) && zoneStart < ch * 0.10;
          return { ok, bottom };
        } catch {
          return { ok: false, bottom: 0 };
        }
      };

      // The 1200×1200 card height-fills the image, centred, clipping the left/
      // right strips beyond the square window for anything wider than tall.
      // Whether that's safe depends on what's actually IN those strips: pure
      // background margin loses nothing, but real content there means the
      // user must choose the framing (Crop) instead of it being force-fit.
      const hasCroppedContent = (): boolean => {
        if (!ctx || cw <= ch) return false; // square/portrait: nothing is clipped
        try {
          const data = ctx.getImageData(0, 0, cw, ch).data;
          const marginX = Math.floor((cw - ch) / 2);
          const isWhiteAt = (x: number, y: number): boolean => {
            const i = (y * cw + x) * 4;
            return data[i + 3] < 30 || (data[i] >= 240 && data[i + 1] >= 240 && data[i + 2] >= 240);
          };
          let nonWhite = 0;
          let total = 0;
          const step = Math.max(1, Math.floor(ch / 200)); // row-sample for speed
          for (let y = 0; y < ch; y += step) {
            for (let x = 0; x < marginX; x++) { total++; if (!isWhiteAt(x, y)) nonWhite++; }
            for (let x = cw - marginX; x < cw; x++) { total++; if (!isWhiteAt(x, y)) nonWhite++; }
          }
          // >0.5% non-white in the clipped margins = real content sits there,
          // not just anti-aliasing/JPEG noise on an otherwise blank edge.
          return total > 0 && nonWhite / total > 0.005;
        } catch {
          return false;
        }
      };

      resolve({ imgW, imgH, sampleBg, analyzeSlideRegions, isProductShot, whiteCopyZone, hasCroppedContent });
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src + (src.includes('?') ? '&' : '?') + '_cors=1';
  });
}
