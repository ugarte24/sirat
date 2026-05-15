import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { formatDateEsBo, formatReportDateTimeEsBo } from "@/lib/date";
import { downloadExcelWorkbook, downloadJsPdf } from "@/lib/download-file";
import { SIRAT_REPORT_COLORS, SIRAT_TAGLINE } from "@/lib/sirat-brand";
import type { ReportColumn, ReporteFila } from "@/lib/report-export";

const C = SIRAT_REPORT_COLORS;

export interface ReportFormatMeta {
  titulo: string;
  subtitulo: string;
  usuario: string;
  desde?: string;
  hasta?: string;
}

function rangoTexto(desde?: string, hasta?: string): string {
  const d = desde ? formatDateEsBo(desde) : "—";
  const h = hasta ? formatDateEsBo(hasta) : "—";
  if (!desde && !hasta) return "PERÍODO: SIN FILTRO DE FECHAS";
  return `DESDE: ${d}   HASTA: ${h}`;
}

/** PDF con encabezado institucional, línea dorada, título y tabla con franjas. */
export function generateStyledReportPDF(
  meta: ReportFormatMeta,
  cols: ReportColumn[],
  rows: ReporteFila[],
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const headerH = 20;
  const fechaReporte = formatReportDateTimeEsBo();

  // Barra superior
  doc.setFillColor(C.primary.r, C.primary.g, C.primary.b);
  doc.rect(0, 0, w, headerH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("SIRAT", 10, 9);
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(`USUARIO CONECTADO: ${meta.usuario.toUpperCase()}`, 10, 15);
  doc.setFont("helvetica", "bold").setFontSize(8);
  const fechaLabel = `FECHA REPORTE: ${fechaReporte}`;
  doc.text(fechaLabel, w - 10, 12, { align: "right" });

  // Línea dorada
  doc.setFillColor(C.gold.r, C.gold.g, C.gold.b);
  doc.rect(0, headerH, w, 1.2, "F");

  // Bloque de título
  let y = headerH + 10;
  doc.setTextColor(C.gold.r, C.gold.g, C.gold.b);
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text(meta.titulo.toUpperCase(), w / 2, y, { align: "center" });
  y += 7;
  doc.setTextColor(C.text.r, C.text.g, C.text.b);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`SIRAT — ${SIRAT_TAGLINE}`, w / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(meta.subtitulo.toUpperCase(), w / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(rangoTexto(meta.desde, meta.hasta), w / 2, y, { align: "center" });

  autoTable(doc, {
    startY: y + 6,
    head: [cols.map((c) => c.header)],
    body: rows.map((row) => cols.map((c) => row[c.key] ?? "")),
    theme: "plain",
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [C.text.r, C.text.g, C.text.b],
      lineColor: [220, 224, 232],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [C.primary.r, C.primary.g, C.primary.b],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: { fillColor: [C.zebra.r, C.zebra.g, C.zebra.b] },
    bodyStyles: { fillColor: [255, 255, 255] },
    margin: { left: 10, right: 10 },
  });

  return doc;
}

function cellStyle(
  bg: string,
  opts: { bold?: boolean; color?: string; size?: number; align?: "left" | "center" | "right" } = {},
): XLSX.CellObject {
  return {
    v: "",
    t: "s",
    s: {
      fill: { fgColor: { rgb: bg } },
      font: {
        bold: opts.bold,
        color: opts.color ? { rgb: opts.color } : undefined,
        sz: opts.size ?? 10,
      },
      alignment: { horizontal: opts.align ?? "left", vertical: "center", wrapText: true },
    },
  };
}

function textCell(
  value: string,
  bg: string,
  opts: { bold?: boolean; color?: string; size?: number; align?: "left" | "center" | "right" } = {},
): XLSX.CellObject {
  const c = cellStyle(bg, opts);
  c.v = value;
  return c;
}

/** Excel con el mismo layout: encabezado, título, rango y tabla con colores SIRAT. */
export function buildStyledReportExcel(
  meta: ReportFormatMeta,
  cols: ReportColumn[],
  rows: ReporteFila[],
  sheetName: string,
): XLSX.WorkBook {
  const nCols = cols.length;
  const fechaReporte = formatReportDateTimeEsBo();
  const emptyRow = (): XLSX.CellObject[] =>
    Array.from({ length: nCols }, () => cellStyle(C.white.hex));

  const headerBlock: XLSX.CellObject[][] = [
    [
      textCell("SIRAT", C.primary.hex, { bold: true, color: C.white.hex, size: 14 }),
      ...Array.from({ length: nCols - 2 }, () => cellStyle(C.primary.hex)),
      textCell(`FECHA REPORTE: ${fechaReporte}`, C.primary.hex, {
        bold: true,
        color: C.white.hex,
        size: 9,
        align: "right",
      }),
    ],
    [
      textCell(`USUARIO CONECTADO: ${meta.usuario.toUpperCase()}`, C.primary.hex, {
        color: C.white.hex,
        size: 9,
      }),
      ...Array.from({ length: nCols - 1 }, () => cellStyle(C.primary.hex)),
    ],
    Array.from({ length: nCols }, () =>
      cellStyle(C.gold.hex, { size: 2 }),
    ),
    emptyRow(),
    [
      textCell(meta.titulo.toUpperCase(), C.white.hex, {
        bold: true,
        color: C.gold.hex,
        size: 16,
        align: "center",
      }),
      ...Array.from({ length: nCols - 1 }, () => cellStyle(C.white.hex)),
    ],
    [
      textCell(`SIRAT — ${SIRAT_TAGLINE}`, C.white.hex, { size: 10, align: "center" }),
      ...Array.from({ length: nCols - 1 }, () => cellStyle(C.white.hex)),
    ],
    [
      textCell(meta.subtitulo.toUpperCase(), C.white.hex, { bold: true, size: 10, align: "center" }),
      ...Array.from({ length: nCols - 1 }, () => cellStyle(C.white.hex)),
    ],
    [
      textCell(rangoTexto(meta.desde, meta.hasta), C.white.hex, { size: 9, align: "center" }),
      ...Array.from({ length: nCols - 1 }, () => cellStyle(C.white.hex)),
    ],
    emptyRow(),
    cols.map((c) =>
      textCell(c.header, C.primary.hex, { bold: true, color: C.white.hex, align: "center" }),
    ),
  ];

  const dataRows: XLSX.CellObject[][] = rows.map((row, i) =>
    cols.map((c) =>
      textCell(row[c.key] ?? "", i % 2 === 0 ? C.white.hex : C.zebra.hex, { size: 9 }),
    ),
  );

  const aoa = [...headerBlock, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, nCols - 2) } },
    { s: { r: 0, c: nCols - 1 }, e: { r: 0, c: nCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: nCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: nCols - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: nCols - 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: nCols - 1 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: nCols - 1 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: nCols - 1 } },
  ];

  ws["!cols"] = cols.map((c) => ({
    wch: Math.max(c.header.length, 14),
  }));

  ws["!rows"] = [
    { hpt: 22 },
    { hpt: 16 },
    { hpt: 4 },
    { hpt: 8 },
    { hpt: 24 },
    { hpt: 16 },
    { hpt: 16 },
    { hpt: 14 },
    { hpt: 8 },
    { hpt: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return wb;
}

export function downloadStyledReportPDF(
  meta: ReportFormatMeta,
  cols: ReportColumn[],
  rows: ReporteFila[],
  filename: string,
): void {
  const doc = generateStyledReportPDF(meta, cols, rows);
  downloadJsPdf(doc, filename);
}

export function downloadStyledReportExcel(
  meta: ReportFormatMeta,
  cols: ReportColumn[],
  rows: ReporteFila[],
  sheetName: string,
  filename: string,
): void {
  const wb = buildStyledReportExcel(meta, cols, rows, sheetName);
  downloadExcelWorkbook(wb as XLSX.WorkBook, filename);
}
