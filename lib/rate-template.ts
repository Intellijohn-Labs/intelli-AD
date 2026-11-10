"use client";

import { editionEnabled, LOCKED_COLUMNS, permutations, RATE_COLUMNS, TEMPLATE_HEADERS, type RateRow } from "./rates";
import type { Newspaper } from "./types";

/** Advisory only: sheet protection can be removed in Excel, so the upload parser re-checks headers and every row. */
const SHEET_PASSWORD = "intelliad-rate-template";

/**
 * Protected per-newspaper template: every valid edition × category × ad_type row is pre-filled (current rates included).
 * Header row and the metadata columns are locked; only the four rate columns can be edited.
 */
export async function buildProtectedTemplate(paper: Newspaper, existing: RateRow[]): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("rates", { views: [{ state: "frozen", ySplit: 1 }] });
  const current = new Map(existing.filter((r) => r.newspaper_name === paper.name).map((r) => [`${r.edition}|${r.category}|${r.ad_type}`, r]));

  ws.columns = RATE_COLUMNS.map((key, i) => ({ header: TEMPLATE_HEADERS[i], key, width: key === "newspaper_name" ? 22 : key === "ad_type" ? 20 : key === "category" ? 18 : 16 }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };

  const num = (v: number | null | undefined) => (v ? v : null);
  // "all" plus every edition currently offered for booking, for each ad type
  for (const p of permutations(paper).filter((x) => x.edition === "all" || editionEnabled(paper.name, x.edition))) {
    const cur = current.get(`${p.edition}|${p.category}|${p.ad_type}`);
    const row = ws.addRow({
      newspaper_name: paper.name, edition: p.edition, category: p.category, ad_type: p.ad_type,
      min_lines: cur?.min_lines ?? null, min_sq_cm: cur?.min_sq_cm ?? null, cutoff_days: cur?.cutoff_days ?? null, cutoff_time: cur?.cutoff_time ?? null,
      gst_included: cur ? (cur.gst_included ? "TRUE" : "FALSE") : null,
      base_rate: num(cur?.base_rate), extra_line_rate: num(cur?.extra_line_rate), sq_cm_rate: num(cur?.sq_cm_rate), color_surcharge_percent: num(cur?.color_surcharge_percent),
      bold_heading_rate: num(cur?.bold_heading_rate), tick_rate: num(cur?.tick_rate), border_rate: num(cur?.border_rate),
    });
    // Identity columns (1-4) stay locked (the default); every other cell is unlocked, tinted and validated.
    for (let c = LOCKED_COLUMNS + 1; c <= RATE_COLUMNS.length; c++) {
      const cell = row.getCell(c);
      const key = RATE_COLUMNS[c - 1];
      cell.protection = { locked: false };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } };
      if (key === "cutoff_time") { cell.numFmt = "@"; cell.dataValidation = { type: "textLength", operator: "lessThanOrEqual", formulae: [8], allowBlank: true, showErrorMessage: true, errorTitle: "Invalid time", error: 'Use a time like 16:00 or 4:00 PM.' }; }
      else if (key === "gst_included") cell.dataValidation = { type: "list", allowBlank: true, formulae: ['"TRUE,FALSE"'], showErrorMessage: true, errorTitle: "Invalid value", error: "Choose TRUE or FALSE." };
      else if (key === "min_lines" || key === "cutoff_days") { cell.dataValidation = { type: "whole", operator: "between", formulae: key === "min_lines" ? [1, 50] : [0, 30], allowBlank: true, showErrorMessage: true, errorTitle: "Invalid number", error: key === "min_lines" ? "Whole number from 1 to 50." : "Whole number from 0 to 30." }; }
      else {
        cell.numFmt = "0.00";
        cell.dataValidation = { type: "decimal", operator: key === "color_surcharge_percent" ? "between" : "greaterThanOrEqual", formulae: key === "color_surcharge_percent" ? [0, 500] : [0], allowBlank: true, showErrorMessage: true, errorTitle: "Invalid number", error: key === "color_surcharge_percent" ? "Enter a percentage from 0 to 500." : "Enter a number, 0 or more." };
      }
    }
  }
  await ws.protect(SHEET_PASSWORD, { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, autoFilter: true });

  const help = wb.addWorksheet("help");
  help.addRows([
    ["IntelliAd rate template for " + paper.name],
    ["Fill the yellow cells only. Headings, newspaper, edition, category and ad_type are locked; do not rename or reorder columns."],
    ["Leave every yellow cell of a row empty for combinations you don't want to publish."],
    ["classified-text rows: base_rate (price for the minimum lines) is required; extra_line_rate is the price per extra line; min_lines is the minimum billable lines."],
    ["classified-display / commercial-display rows: sq_cm_rate is required; min_sq_cm is the minimum billable area; color_surcharge_percent is the extra % for colour."],
    ["cutoff_days + cutoff_time (set together, e.g. 1 and 16:00): booking closes that many days before the print date at that time."],
    ["bold_heading_rate / tick_rate / border_rate (optional, classified-text): flat extra charge for a bold first line, a tick mark and a border box. Blank or 0 = free."],
    ["gst_included: TRUE if the rates you entered already include GST (cards then say incl. GST); FALSE (default) means excl. GST."],
    ["Blank min_lines / min_sq_cm / cutoff cells use the publication's standard values. 'all' in edition or category means every edition / category; the most specific row wins."],
  ]);
  help.getColumn(1).width = 120;
  await help.protect(SHEET_PASSWORD, {});

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export async function downloadProtectedTemplate(paper: Newspaper, existing: RateRow[]) {
  const buf = await buildProtectedTemplate(paper, existing);
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `IntelliAd_${paper.name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}_Rate_Template.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
