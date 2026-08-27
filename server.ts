import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// gzip every compressible response (JS/CSS/JSON/HTML). Railway serves the raw
// Express build with no CDN in front, so without this the ~625 KB main bundle
// ships uncompressed; gzip cuts it to ~1/3. Image/font binaries are skipped by
// compression's own content-type filter.
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// ─── /api/proxy-image ────────────────────────────────────────────────────────

const ALLOWED_DOMAINS = [
  'lg.com', 'lge.co.kr', 'lgthailand.com', 'lg.co.th',
  'lazada.co.th', 'lazada.sg', 'lazada.com.my', 'lazada.com.ph', 'lazada.vn', 'lazada.co.id',
  'shopee.co.th', 'shopee.sg', 'shopee.com.my', 'shopee.com.ph', 'shopee.vn', 'shopee.co.id',
  'lzd-img-global.slatic.net', 'img.lazcdn.com',
  'cf.shopee.co.th', 'cf.shopee.sg', 'down-th.img.susercontent.com',
  'gscs-cdn-images.lge.com', 'media-cdn.bnn.in.th',
];

function isDomainAllowed(hostname: string): boolean {
  return ALLOWED_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
}

app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url as string | undefined;
  if (!imageUrl) return res.status(400).json({ error: 'Missing url parameter' });

  let parsed: URL;
  try { parsed = new URL(imageUrl); }
  catch { return res.status(400).json({ error: 'Invalid URL' }); }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Only HTTP(S) URLs allowed' });
  }
  if (!isDomainAllowed(parsed.hostname)) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream fetch failed' });
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch image' });
  }
});

// ─── /api/crawl-page ─────────────────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  'sprite', 'pixel', '1x1', 'tracking', 'analytic', 'spacer',
  // NOTE: deliberately NOT blocking 'promotion' — LG CDN stores legit product
  // gallery images under year-scoped paths like `/2025-promotions/...` and a
  // raw substring block wipes out the real product hero. Banner filtering is
  // handled by the size patterns + 'banner' / 'home-page' / 'gnb' entries
  // below, which is enough for homepage/category promo carousels.
  'gnb', 'banner', 'buying-guide',
  '290x90', '620x316', '580x180', '644x328', '373x190',
  'home-page', 'microsite',
  // LG spec drawings (not lifestyle / product visuals)
  '/images/spec/', '-dimension',
];

function isUsableImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (BLOCKED_PATTERNS.some((p) => lower.includes(p))) return false;
  if (/\.(svg|gif)(\?|$)/.test(lower)) return false;
  return true;
}

// Some LG products embed the spec/dimension drawing as a numbered slide INSIDE
// the same product gallery carousel as the real cutout photos (URL pattern is
// indistinguishable from a legit shot — e.g. ".../gallery-08-2010.jpg"), so the
// '/images/spec/' + '-dimension' URL patterns above miss it entirely. LG does
// label these slides distinctly via alt/data-alt text (seen: "Dimension image"),
// even though the shared per-carousel context/heading extraction doesn't catch
// it — check the alt text directly wherever it's available (gallery items).
const SPEC_DRAWING_ALT = /\b(dimension|installation)\b.*\bimage\b|\bspec(ification)?\s*(drawing|diagram)\b/i;
function isSpecDrawingAlt(alt: string | undefined): boolean {
  return !!alt && SPEC_DRAWING_ALT.test(alt);
}

// Extract "best" signal from a URL: higher pixel area preferred, 1:1 tie-break.
function parseUrlDimensions(url: string): { w: number; h: number } | null {
  const m = url.match(/[_\-](\d{2,5})x(\d{2,5})/);
  if (m) return { w: +m[1], h: +m[2] };
  const w = url.match(/[?&]w=(\d{2,5})/);
  if (w) return { w: +w[1], h: 0 };
  return null;
}

function imageQualityScore(url: string): number {
  const d = parseUrlDimensions(url);
  const desktopBonus = /-d(\.|_|-)/i.test(url) ? 100_000 : 0;
  if (!d) return desktopBonus; // e.g. LG feature images with no size in URL
  const area = d.w * (d.h || d.w);
  const ratioPenalty = d.h ? Math.abs(d.w / d.h - 1) * 500_000 : 0;
  return area - ratioPenalty + desktopBonus;
}

function resolveUrl(href: string, base: string): string | null {
  if (!href || href.startsWith('data:')) return null;
  try { return new URL(href, base).href; } catch { return null; }
}

interface ScrapedImage { url: string; context: string; body?: string; fromGallery?: boolean; }

function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function looksLikeFilename(s: string): boolean {
  return !s.includes(' ') && (s.length > 30 || /[-_]{2,}|\.(jpg|png|webp)|_[dm]$/i.test(s));
}

function isGoodHeading(s: string): boolean {
  return !!s && s.length > 0 && s.length <= 80 && !looksLikeFilename(s);
}

function headingInside($: any, sib: any, reverse = false): string {
  const tn = (sib.prop('tagName') as string || '').toUpperCase();
  if (/^H[1-6]$/.test(tn)) {
    const txt = cleanText(sib.text());
    if (isGoodHeading(txt)) return txt;
  }
  const headings = sib.find('h1, h2, h3, h4, h5, h6');
  const range = reverse
    ? Array.from({ length: headings.length }, (_, i) => headings.length - 1 - i)
    : Array.from({ length: headings.length }, (_, i) => i);
  for (const i of range) {
    const txt = cleanText($(headings[i]).text());
    if (isGoodHeading(txt)) return txt;
  }
  return '';
}

function findNearbyHeading($: any, node: any): string {
  const MAX_HOPS = 3;
  let current = node;
  for (let d = 0; d < 10 && current.length; d++) {
    let prevHeading = ''; let prevHops = Infinity;
    let sib = current.prev();
    for (let h = 1; sib.length && h <= MAX_HOPS; h++, sib = sib.prev()) {
      const t = headingInside($, sib, true);
      if (t) { prevHeading = t; prevHops = h; break; }
    }
    let nextHeading = ''; let nextHops = Infinity;
    sib = current.next();
    for (let h = 1; sib.length && h <= MAX_HOPS; h++, sib = sib.next()) {
      const t = headingInside($, sib, false);
      if (t) { nextHeading = t; nextHops = h; break; }
    }
    if (prevHeading || nextHeading) {
      return prevHops <= nextHops ? (prevHeading || nextHeading) : (nextHeading || prevHeading);
    }
    const parent = current.parent();
    const ptn = (parent.prop('tagName') as string || '').toUpperCase();
    if (!parent.length || ptn === 'BODY' || ptn === 'HTML') break;
    current = parent;
  }
  return '';
}

function extractContext($: any, el: any): string {
  const tag = $(el);
  const figParent = tag.closest('figure');
  if (figParent.length) {
    const cap = cleanText(figParent.find('figcaption').first().text());
    if (cap) return cap.slice(0, 80);
  }
  const nearby = findNearbyHeading($, tag);
  if (nearby) return nearby;
  const container = tag.closest('[class*="feature"], [class*="benefit"], [class*="highlight"], [class*="section"], section, article, figure');
  if (container.length) {
    const heading = cleanText(container.find('h1, h2, h3, h4, h5, h6').first().text());
    if (heading && !looksLikeFilename(heading)) return heading.slice(0, 80);
  }
  const alt = cleanText(tag.attr('alt') || '');
  if (alt && !looksLikeFilename(alt)) {
    const firstSentence = alt.match(/^[^.!?]+/)?.[0].trim();
    if (firstSentence && firstSentence.length > 0 && firstSentence.length <= 80) return firstSentence;
    return alt.slice(0, 80);
  }
  const aria = cleanText(tag.attr('aria-label') || tag.attr('title') || '');
  if (aria && !looksLikeFilename(aria)) return aria.slice(0, 80);
  return '';
}

function extractBodyContext($: any, el: any): string {
  const tag = $(el);

  // 1. LG.com: bodycopy div within same c-hero-banner
  const lgBanner = tag.closest('[class*="c-hero-banner"]');
  if (lgBanner.length) {
    const bc = cleanText(lgBanner.find('[class*="bodycopy"], [class*="body-copy"]').first().text());
    if (bc && bc.length > 20) return bc.slice(0, 300);
    const nextSection = lgBanner.parent().next('[class*="c-wrapper"], [class*="c-section"], section');
    if (nextSection.length) {
      const body = cleanText(nextSection.find('[class*="bodycopy"], [class*="cmp-text"] p').first().text());
      if (body && body.length > 20 && body.length <= 500) return body.slice(0, 300);
    }
  }

  // 2. Generic: paragraph in same feature/section container
  const container = tag.closest('[class*="feature"], [class*="benefit"], [class*="highlight"], [class*="kv"], section, article, figure, li');
  if (container.length) {
    const p = container.find('p').not('.sr-only').first();
    const text = cleanText(p.text());
    if (text && text.length > 20 && text.length <= 500) return text.slice(0, 300);
  }

  // 3. Descriptive alt text (≥80 chars) as fallback body copy
  const alt = cleanText(tag.attr('alt') || '');
  if (alt && alt.length >= 80 && !looksLikeFilename(alt)) {
    return alt.slice(0, 300);
  }

  return '';
}

function extractImages(html: string, pageUrl: string): ScrapedImage[] {
  const $ = cheerio.load(html);
  const images: ScrapedImage[] = [];
  const seen = new Map<string, number>();
  // LG gallery slider images — extracted early with high-res URLs, bypass context dedup
  const priorityImages: ScrapedImage[] = [];

  const add = (url: string | null, context: string = '') => {
    if (!url) return;
    if (!isUsableImage(url)) return;
    if (seen.has(url)) {
      const idx = seen.get(url)!;
      if (!images[idx].context && context) images[idx].context = context;
      return;
    }
    seen.set(url, images.length);
    images.push({ url, context });
  };

  // LG gallery slider (a.c-gallery__item) — high-res versions via data-large-d/m.
  // JCR rendition suffix is stripped to get the clean .jpg URL.
  // These bypass context dedup because all carousel slides share the same product heading.
  $('a[class*="c-gallery"][data-large-d], a[class*="c-gallery"][data-large-m]').each((_: any, el: any) => {
    const tag = $(el);
    if (isSpecDrawingAlt(tag.attr('data-alt'))) return;
    const context = extractContext($, el);
    for (const attr of ['data-large-d', 'data-large-m'] as const) {
      const val = tag.attr(attr);
      if (!val) continue;
      const cleanVal = val.replace(/\/jcr:content\/renditions\/[^\/?]+/i, '');
      const url = resolveUrl(cleanVal, pageUrl);
      if (url && isUsableImage(url)) {
        priorityImages.push({ url, context });
        add(url, context);
      }
      break;
    }
  });

  // Gallery selectors run FIRST so the on-page product carousel hero (typically
  // the opened/active product shot) wins the images[0] pin. Falling back to
  // og:image after this catches pages without a structured gallery, but on
  // LG PDPs og:image is often a square social-share crop (e.g. closed-laptop
  // promo card) that doesn't match the user-visible product thumbnail.
  const gallerySelectors = [
    'div.gallery-preview-panel img', 'div.item-gallery img', 'div[class*="gallery"] img',
    'div.product-briefing img', 'div[class*="product-image"] img',
    'div.product-image img', 'div.visual-area img',
    'div[class*="slider"] img', 'div[class*="carousel"] img', 'div[class*="swiper"] img',
  ];
  for (const sel of gallerySelectors) {
    $(sel).each((_, el) => {
      const tag = $(el);
      if (isSpecDrawingAlt(tag.attr('alt')) || isSpecDrawingAlt(tag.attr('data-alt'))) return;
      const context = extractContext($, el);
      for (const attr of ['src', 'data-src', 'data-original', 'data-lazy-src', 'srcset']) {
        const val = tag.attr(attr);
        if (!val) continue;
        if (attr === 'srcset') {
          val.split(',').map((s) => s.trim().split(/\s+/)[0]).forEach((p) => add(resolveUrl(p, pageUrl), context));
        } else {
          add(resolveUrl(val, pageUrl), context);
        }
      }
    });
  }

  $('meta[property="og:image"]').each((_, el) => {
    add(resolveUrl($(el).attr('content') || '', pageUrl));
  });

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '');
      const extractFromObj = (obj: any) => {
        if (!obj) return;
        if (typeof obj.image === 'string') add(resolveUrl(obj.image, pageUrl));
        if (Array.isArray(obj.image)) obj.image.forEach((img: any) => {
          if (typeof img === 'string') add(resolveUrl(img, pageUrl));
          if (typeof img?.url === 'string') add(resolveUrl(img.url, pageUrl));
        });
        if (typeof obj.image?.url === 'string') add(resolveUrl(obj.image.url, pageUrl));
      };
      if (Array.isArray(data)) data.forEach(extractFromObj);
      else extractFromObj(data);
    } catch { /* ignore */ }
  });

  $('img').each((_, el) => {
    const tag = $(el);
    const context = extractContext($, el);
    for (const attr of ['src', 'data-src', 'data-original', 'data-lazy-src', 'data-zoom-image', 'data-big']) {
      const val = tag.attr(attr);
      if (val) add(resolveUrl(val, pageUrl), context);
    }
  });

  const imageDataAttrs = [
    'data-large-d', 'data-large-m', 'data-desktop-src', 'data-mobile-src',
    'data-srcset', 'data-bg', 'data-background-image', 'data-image',
    'data-lazy', 'data-delayed-url',
  ];
  $('*').each((_, el) => {
    const tag = $(el);
    let context: string | null = null;
    for (const attr of imageDataAttrs) {
      const val = tag.attr(attr);
      if (!val) continue;
      if (context === null) context = extractContext($, el);
      if (attr.includes('srcset')) {
        val.split(',').map((s) => s.trim().split(/\s+/)[0]).forEach((p) => add(resolveUrl(p, pageUrl), context!));
      } else {
        add(resolveUrl(val, pageUrl), context);
      }
    }
  });

  $('picture source, source[type^="image"]').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const context = extractContext($, el);
      srcset.split(',').map((s) => s.trim().split(/\s+/)[0]).forEach((p) => add(resolveUrl(p, pageUrl), context));
    }
  });

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(href)) {
      add(resolveUrl(href, pageUrl), extractContext($, el));
    }
  });

  $('[style*="background-image"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/url\(["']?(.*?)["']?\)/);
    if (match?.[1]) add(resolveUrl(match[1], pageUrl), extractContext($, el));
  });

  // Body text extraction pass — adds body copy to images already in `seen`
  const bodyOf = new Map<string, string>();
  const addBodyFor = (url: string | null, el: any) => {
    if (!url || !isUsableImage(url)) return;
    if (bodyOf.has(url)) return;
    const body = extractBodyContext($, el);
    if (body) bodyOf.set(url, body);
  };
  $('[class*="c-hero-banner"] img').each((_: any, el: any) => {
    const tag = $(el);
    for (const attr of ['src', 'data-src', 'data-original']) {
      const val = tag.attr(attr);
      if (val) { addBodyFor(resolveUrl(val, pageUrl), el); break; }
    }
  });
  $('img').each((_: any, el: any) => {
    const tag = $(el);
    for (const attr of ['src', 'data-src']) {
      const val = tag.attr(attr);
      if (val) { addBodyFor(resolveUrl(val, pageUrl), el); break; }
    }
  });
  for (const img of images) {
    if (!img.body) img.body = bodyOf.get(img.url) || undefined;
  }

  const baseKey = (u: string): string => {
    try {
      const parsed = new URL(u);
      let key = parsed.origin + parsed.pathname;
      key = key
        .replace(/-[mdt](-\d+)?(\.(jpg|jpeg|png|webp))/i, '$2')
        .replace(/_\d+x\d+/g, '')
        .replace(/\/jcr:content\/renditions\/[^\/?]+/i, '')
        .toLowerCase();
      return key;
    } catch { return u.toLowerCase(); }
  };

  const contextByBase = new Map<string, string>();
  const bodyByBase = new Map<string, string>();
  for (const img of images) {
    const k = baseKey(img.url);
    if (img.context && !contextByBase.has(k)) contextByBase.set(k, img.context);
    if (img.body && !bodyByBase.has(k)) bodyByBase.set(k, img.body);
  }
  for (const img of images) {
    if (!img.context) {
      const inherited = contextByBase.get(baseKey(img.url));
      if (inherited) img.context = inherited;
    }
    if (!img.body) {
      const inherited = bodyByBase.get(baseKey(img.url));
      if (inherited) img.body = inherited;
    }
  }

  // Pin the first-crawled image at index 0 — it's the product carousel hero
  // shot and the most useful default for the product-image slot. Dedup runs
  // only on images[1..], then removes anything matching the pinned image.
  if (images.length === 0) return [];
  const pinned = images[0];
  const pinnedKey = baseKey(pinned.url);
  const pinnedCtx = pinned.context.trim().toLowerCase();
  const rest = images.slice(1);

  // 1st pass — dedup by URL baseKey.
  const keyWinner = new Map<string, ScrapedImage>();
  const keyOrder: string[] = [];
  for (const img of rest) {
    const k = baseKey(img.url);
    if (k === pinnedKey) continue;
    const existing = keyWinner.get(k);
    if (!existing) {
      keyWinner.set(k, img);
      keyOrder.push(k);
    } else if (imageQualityScore(img.url) > imageQualityScore(existing.url)) {
      keyWinner.set(k, { ...existing, url: img.url });
    }
  }
  const afterUrlDedup = keyOrder.map((k) => keyWinner.get(k)!);

  // 2nd pass — dedup by non-empty context; keep closest-to-1:1 per group.
  const ctxWinner = new Map<string, ScrapedImage>();
  for (const img of afterUrlDedup) {
    const ctx = img.context.trim().toLowerCase();
    if (!ctx || ctx === pinnedCtx) continue;
    const existing = ctxWinner.get(ctx);
    if (!existing || imageQualityScore(img.url) > imageQualityScore(existing.url)) {
      ctxWinner.set(ctx, img);
    }
  }
  const ctxSeen = new Set<string>();
  const restDedup: ScrapedImage[] = [];
  for (const img of afterUrlDedup) {
    const ctx = img.context.trim().toLowerCase();
    if (!ctx) { restDedup.push(img); continue; }
    if (ctx === pinnedCtx) continue;
    if (ctxSeen.has(ctx)) continue;
    ctxSeen.add(ctx);
    restDedup.push(ctxWinner.get(ctx)!);
  }

  // Merge priority gallery images (bypass context dedup) before regular results.
  // Filter out any priority image that duplicates the pinned image by baseKey.
  const finalSeen = new Set<string>([pinnedKey]);
  const priorityMerged: ScrapedImage[] = [];
  for (const img of priorityImages) {
    const k = baseKey(img.url);
    if (!finalSeen.has(k)) { finalSeen.add(k); priorityMerged.push(img); }
  }
  const restFiltered = restDedup.filter((img) => !finalSeen.has(baseKey(img.url)));

  // Tag every image that came from the on-page gallery carousel (c-gallery) —
  // the Gallery Feature flow restricts its strip to exactly these. Matched by
  // baseKey so the pinned copy of a carousel slide keeps the tag too.
  const galleryKeys = new Set(priorityImages.map((img) => baseKey(img.url)));
  return [pinned, ...priorityMerged, ...restFiltered]
    .slice(0, 200)
    .map((img) => (galleryKeys.has(baseKey(img.url)) ? { ...img, fromGallery: true } : img));
}

// ─── Product name extractor ──────────────────────────────────────────────────

function extractProductName(html: string): string {
  const $ = cheerio.load(html);

  // 1. JSON-LD Product.name
  let fromJsonLd = '';
  $('script[type="application/ld+json"]').each((_: any, el: any) => {
    if (fromJsonLd) return;
    try {
      const raw = JSON.parse($(el).html() || '{}');
      const nodes: any[] = Array.isArray(raw) ? raw : [raw, ...(raw['@graph'] || [])];
      for (const node of nodes) {
        if (node['@type'] === 'Product' && typeof node.name === 'string' && node.name.trim()) {
          fromJsonLd = node.name.trim(); break;
        }
      }
    } catch { /* ignore */ }
  });
  if (fromJsonLd) return fromJsonLd;

  // 2. og:title — strip common suffixes like " | LG", " - LG Electronics" etc.
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || '';
  if (ogTitle) {
    return ogTitle.replace(/\s*[\|\-–—]\s*(LG.*|Official.*|Online.*|Shop.*)$/i, '').trim();
  }

  // 3. First h1 on the page
  const h1 = $('h1').first().text().trim();
  if (h1) return h1.replace(/\s*[\|\-–—]\s*(LG.*|Official.*|Online.*|Shop.*)$/i, '').trim();

  return '';
}

// ─── Model name extractor (LG.com pages) ────────────────────────────────────

function extractModelName(html: string, pageUrl: string): string {
  const $ = cheerio.load(html);

  // 1. JSON-LD Product sku / mpn / model
  let fromJsonLd = '';
  $('script[type="application/ld+json"]').each((_: any, el: any) => {
    if (fromJsonLd) return;
    try {
      const raw = JSON.parse($(el).html() || '{}');
      const nodes: any[] = Array.isArray(raw)
        ? raw
        : [raw, ...(raw['@graph'] || [])];
      for (const node of nodes) {
        if (node['@type'] === 'Product') {
          const v = node.sku || node.mpn || node.model;
          if (v && typeof v === 'string') {
            const c = v.trim().toUpperCase();
            if (/^[A-Z0-9\-]{4,25}$/.test(c)) { fromJsonLd = c; break; }
          }
        }
      }
    } catch { /* ignore parse errors */ }
  });
  if (fromJsonLd) return fromJsonLd;

  // 2. LG.com-specific DOM selectors
  for (const sel of [
    '.pdp-sub-title', '.model-name', '[class*="model-no"]',
    '[class*="model-num"]', '[data-model-name]', '[data-model-id]',
    '.sku', '[itemprop="sku"]', '[itemprop="mpn"]',
  ]) {
    const text = ($(sel).first().attr('content') || $(sel).first().text()).trim().toUpperCase();
    if (/^[A-Z0-9\-]{4,25}$/.test(text)) return text;
  }

  // 3. URL slug fallback — last path segment used as-is (covers model codes
  //    like EAY65068604 where stripping trailing digits would destroy the ID)
  try {
    const u = new URL(pageUrl);
    const slug = u.pathname.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';
    const raw = slug.toUpperCase();
    if (/^[A-Z0-9\-]{4,25}$/.test(raw)) return raw;
  } catch { /* ignore */ }

  return '';
}

app.post('/api/crawl-page', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url in request body' });
  }

  let parsed: URL;
  try { parsed = new URL(url); }
  catch { return res.status(400).json({ error: 'Invalid URL' }); }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Only HTTP(S) URLs allowed' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,th;q=0.8,ko;q=0.7',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch page: ${response.statusText}` });
    }
    const html = await response.text();
    const images = extractImages(html, url);
    const modelName = extractModelName(html, url);
    let productName = extractProductName(html);
    // Strip model number from product name only when it appears after some text (idx > 0).
    // If idx === 0 the model is at the start — stripping would erase everything.
    if (modelName && productName) {
      const idx = productName.toUpperCase().indexOf(modelName.toUpperCase());
      if (idx > 0) {
        const stripped = productName.slice(0, idx).replace(/[\s\-\|\/,]+$/, '').trim();
        if (stripped) productName = stripped;
      }
    }
    return res.status(200).json({ images, modelName, productName });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to crawl page' });
  }
});

// ─── Static + SPA fallback ───────────────────────────────────────────────────

const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir, {
  setHeaders: (res, filePath) => {
    if (filePath.includes('/fonts/') || filePath.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
