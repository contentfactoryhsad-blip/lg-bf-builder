/**
 * Copy sheet — the ZIP's `Copy Sheet.xlsx`: every piece of editable copy
 * on the page, grouped per module, so the AEM authoring side gets the text
 * in one hand-off file next to the image crops.
 *
 * Block format (approved 2026-09-09):
 *
 *   [01-ST0001-Hero KV-1920x720]     ← bold header, ZIP-filename schema
 *   Eyebrow   | Black Friday Deals
 *   Headline  | Every Black Friday deal,⏎in one place
 *   …blank row…
 *
 * Only the modules that carry copy appear (hero / cards / banners — the same
 * four that export crops); fields whose toggle is OFF are left out. Buttons,
 * links and countdown labels count as copy.
 *
 * The workbook is assembled by hand (a .xlsx is just a ZIP of XML parts) so
 * no spreadsheet library enters the bundle — JSZip is already here for the
 * download itself.
 */

import JSZip from 'jszip';
import type { DealCanvasItem } from './DealPageBuilder';
import { getDealModuleDef } from './dealModuleRegistry';
import type { DealCardsState, DealHeroState, DealPromoBannerState } from './dealEditStates';

interface CopyBlock {
  header: string;
  fields: [string, string][];
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;');

/** Collect the copy blocks in canvas order — one block per copy-bearing module. */
export function collectCopyBlocks(items: DealCanvasItem[]): CopyBlock[] {
  const blocks: CopyBlock[] = [];
  let n = 0;

  for (const item of items) {
    const def = getDealModuleDef(item.type);
    const fields: [string, string][] = [];

    if (item.type === 'deal-hero') {
      const d = item.editState.data as DealHeroState;
      if (d.showEyebrow) fields.push(['Eyebrow', d.eyebrow]);
      fields.push(['Headline', d.headline]);
      if (d.showSubCopy) fields.push(['Sub copy', d.subCopy]);
      if (d.showCountdown) fields.push(['Countdown labels', [d.dayLabel, d.hourLabel, d.minuteLabel, d.secondLabel].join(' / ')]);
    } else if (item.type === 'deal-cards') {
      const d = item.editState.data as DealCardsState;
      if (d.showSectionTitle) fields.push(['Section title', d.sectionTitle]);
      if (d.showSectionSubtitle) fields.push(['Section subtitle', d.sectionSubtitle]);
      d.cards.forEach((c, i) => {
        fields.push([`Card ${i + 1} · Title`, c.title]);
        if (d.showCta) fields.push([`Card ${i + 1} · Button`, c.ctaText]);
      });
    } else if (item.type === 'deal-promo-banner' || item.type === 'deal-banner') {
      const d = item.editState.data as DealPromoBannerState;
      const countdown = d.showCountdown && item.type === 'deal-banner';
      fields.push(['Headline', d.headline]);
      if (d.showSubCopy) fields.push(['Sub copy', d.subCopy]);
      if (item.type === 'deal-promo-banner' && d.showLinks) {
        if (d.linkPrimary) fields.push(['Link 1', d.linkPrimary]);
        if (d.linkSecondary) fields.push(['Link 2', d.linkSecondary]);
      }
      if (d.showCta && !countdown) fields.push(['Button', d.ctaText]);
      if (countdown) fields.push(['Countdown labels', [d.dayLabel, d.hourLabel, d.minuteLabel, d.secondLabel].join(' / ')]);
    } else {
      continue; // no copy on this module
    }

    n += 1;
    const size = def.artSize ? `${def.artSize.w}x${def.artSize.h}` : '';
    blocks.push({
      header: `[${String(n).padStart(2, '0')}-${def.component ?? 'page'}-${def.label}${size ? `-${size}` : ''}]`,
      fields,
    });
  }
  return blocks;
}

/** Build the .xlsx bytes (a ZIP of OOXML parts) for the given canvas. */
export async function buildCopySheetXlsx(items: DealCanvasItem[]): Promise<Blob> {
  const blocks = collectCopyBlocks(items);

  const rows: string[] = [];
  let r = 1;
  const cell = (col: string, row: number, text: string, style: number) =>
    `<c r="${col}${row}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;

  for (const b of blocks) {
    rows.push(`<row r="${r}">${cell('A', r, b.header, 1)}</row>`);
    r += 1;
    for (const [f, v] of b.fields) {
      rows.push(`<row r="${r}">${cell('A', r, f, 2)}${cell('B', r, v, 0)}</row>`);
      r += 1;
    }
    r += 1; // blank spacer row between modules
  }

  const sheet =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="72" customWidth="1"/></cols>' +
    `<sheetData>${rows.join('')}</sheetData></worksheet>`;

  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="12"/><name val="Calibri"/></font>' +
    '<font><sz val="11"/><color rgb="FF888888"/><name val="Calibri"/></font></fonts>' +
    '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf/></cellStyleXfs>' +
    '<cellXfs count="3">' +
    '<xf fontId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>' +
    '<xf fontId="1"/>' +
    '<xf fontId="2" applyAlignment="1"><alignment vertical="top"/></xf>' +
    '</cellXfs></styleSheet>';

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Copy" sheetId="1" r:id="rId1"/></sheets></workbook>';

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>';

  const xlsx = new JSZip();
  xlsx.file('[Content_Types].xml', contentTypes);
  xlsx.file('_rels/.rels', rootRels);
  xlsx.file('xl/workbook.xml', workbook);
  xlsx.file('xl/_rels/workbook.xml.rels', workbookRels);
  xlsx.file('xl/styles.xml', styles);
  xlsx.file('xl/worksheets/sheet1.xml', sheet);
  return xlsx.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
