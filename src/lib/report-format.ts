import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { formatDateEsBo, toIsoDateLocal } from "@/lib/date";
import { downloadExcelWorkbook, downloadJsPdf } from "@/lib/download-file";
import { SIRAT_REPORT_COLORS, SIRAT_TAGLINE } from "@/lib/sirat-brand";
import type { ReportColumn, ReporteFila } from "@/lib/report-export";

const C = SIRAT_REPORT_COLORS;
const G = C.green;

/** Barra verde SIRAT + línea de acento. Devuelve la Y inicial del bloque de título. */
export function drawSiratPdfTopBar(
  doc: jsPDF,
  opts: { usuario?: string; fechaReporte?: string } = {},
): number {
  const w = doc.internal.pageSize.getWidth();
  const headerH = 20;
  const fecha =
    opts.fechaReporte ?? formatDateEsBo(toIsoDateLocal(new Date()));

  doc.setFillColor(G.r, G.g, G.b);
  doc.rect(0, 0, w, headerH, "F");
  doc.setTextColor(255, 255, 255);

  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("SIRAT", 10, 10);

  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text(`FECHA: ${fecha}`, w - 10, 10, { align: "right" });

  if (opts.usuario?.trim()) {
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(`USUARIO: ${opts.usuario.trim().toUpperCase()}`, w - 10, 16, {
      align: "right",
    });
  }

  doc.setFillColor(G.r, G.g, G.b);
  doc.rect(0, headerH, w, 1.2, "F");

  return headerH + 1.2;
}

/** Estilos de tabla alineados con los reportes PDF/Excel. */
export const SIRAT_PDF_TABLE_STYLES = {
  theme: "plain" as const,
  styles: {
    fontSize: 9,
    cellPadding: 2,
    textColor: [C.text.r, C.text.g, C.text.b] as [number, number, number],
    lineColor: [220, 224, 232] as [number, number, number],
    lineWidth: 0.1,
  },
  headStyles: {
    fillColor: [G.r, G.g, G.b] as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: "bold" as const,
    halign: "center" as const,
  },
  alternateRowStyles: {
    fillColor: [C.zebra.r, C.zebra.g, C.zebra.b] as [number, number, number],
  },
  bodyStyles: { fillColor: [255, 255, 255] as [number, number, number] },
  margin: { left: 10, right: 10 },
};

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
export async function generateStyledReportPDF(
  meta: ReportFormatMeta,
  cols: ReportColumn[],
  rows: ReporteFila[],
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = drawSiratPdfTopBar(doc, { usuario: meta.usuario }) + 10;
  doc.setTextColor(G.r, G.g, G.b);
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
    ...SIRAT_PDF_TABLE_STYLES,
    styles: { ...SIRAT_PDF_TABLE_STYLES.styles, fontSize: 7 },
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
  const fechaReporte = formatDateEsBo(toIsoDateLocal(new Date()));
  const emptyRow = (): XLSX.CellObject[] =>
    Array.from({ length: nCols }, () => cellStyle(C.white.hex));

  const headerBlock: XLSX.CellObject[][] = [
    [
      textCell("SIRAT", C.primary.hex, { bold: true, color: C.white.hex, size: 14 }),
      ...Array.from({ length: nCols - 2 }, () => cellStyle(C.primary.hex)),
      textCell(`FECHA: ${fechaReporte}`, C.primary.hex, {
        bold: true,
        color: C.white.hex,
        size: 9,
        align: "right",
      }),
    ],
    [
      ...Array.from({ length: nCols - 1 }, () => cellStyle(C.primary.hex)),
      textCell(`USUARIO: ${meta.usuario.toUpperCase()}`, C.primary.hex, {
        color: C.white.hex,
        size: 9,
        align: "right",
      }),
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

export async function downloadStyledReportPDF(
  meta: ReportFormatMeta,
  cols: ReportColumn[],
  rows: ReporteFila[],
  filename: string,
): Promise<void> {
  const doc = await generateStyledReportPDF(meta, cols, rows);
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
