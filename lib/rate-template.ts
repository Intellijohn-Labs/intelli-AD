"use client";

import { permutations, RATE_COLUMNS, type RateRow } from "./rates";
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

  ws.columns = RATE_COLUMNS.map((key) => ({ header: key, key, width: key === "newspaper_name" ? 22 : key === "ad_type" ? 20 : 18 }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };

  for (const p of permutations(paper)) {
    const cur = current.get(`${p.edition}|${p.category}|${p.ad_type}`);
    const row = ws.addRow({
      newspaper_name: paper.name, edition: p.edition, category: p.category, ad_type: p.ad_type,
      base_rate: cur?.base_rate || null, extra_line_rate: cur?.extra_line_rate || null, sq_cm_rate: cur?.sq_cm_rate || null, color_surcharge_percent: cur?.color_surcharge_percent || null,
    });
    // Metadata columns stay locked (the default); only the four rate cells are unlocked and number-validated.
    for (let c = 5; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.protection = { locked: false };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } };
      cell.numFmt = "0.00";
      cell.dataValidation = { type: "decimal", operator: c === 8 ? "between" : "greaterThanOrEqual", formulae: c === 8 ? [0, 500] : [0], allowBlank: true, showErrorMessage: true, errorTitle: "Invalid rate", error: c === 8 ? "Enter a percentage from 0 to 500." : "Enter a number, 0 or more." };
    }
  }
  await ws.protect(SHEET_PASSWORD, { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, autoFilter: true });

  const help = wb.addWorksheet("help");
  help.addRows([
    ["IntelliAd rate template for " + paper.name],
    ["Fill the yellow cells only. Headings, newspaper, edition, category and ad_type are locked; do not rename or reorder columns."],
    ["Leave all four rate cells empty for combinations you don't want to publish. Rows with any rate must follow:"],
    ["classified-text: base_rate (price for the minimum lines) is required; extra_line_rate is the price per extra line."],
    ["classified-display / commercial-display: sq_cm_rate is required; color_surcharge_percent is the extra % for colour."],
    ["'all' in edition or category means every edition / category; the most specific row wins."],
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
  a.download = `intelliad-rates-${paper.id}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
