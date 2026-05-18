import type jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  loadEscudoRiberaltaDataUrl,
  loadSiratLogoDataUrl,
  SIRAT_LOGO_ASPECT,
} from "@/lib/pdf-assets";
import { drawSiratPdfTopBar } from "@/lib/report-format";
import {
  FORMULARIO_PDF_FIRMA_ENCARGADO_RUAT,
  GAM_RIBERALTA_NOMBRE,
  JEFATURA_RECAUDACIONES,
  SIRAT_REPORT_COLORS,
} from "@/lib/sirat-brand";

const C = SIRAT_REPORT_COLORS;
const MARGIN = 12;
const LABEL_FILL: [number, number, number] = [232, 236, 245];
const SI_COLOR: [number, number, number] = [22, 163, 74];
const NO_COLOR: [number, number, number] = [220, 38, 38];

const TABLE_BASE = {
  theme: "plain" as const,
  styles: {
    fontSize: 8.5,
    cellPadding: 2.5,
    textColor: [C.text.r, C.text.g, C.text.b] as [number, number, number],
    lineColor: [218, 222, 230] as [number, number, number],
    lineWidth: 0.15,
  },
  margin: { left: MARGIN, right: MARGIN },
};

function styleSiNoCell(data: {
  section: string;
  column: { index: number };
  cell: { raw: unknown; styles: Record<string, unknown> };
}) {
  if (data.section !== "body" || data.column.index % 2 !== 1) return;
  const v = String(data.cell.raw ?? "");
  if (v !== "SÍ" && v !== "NO") return;
  data.cell.styles.fontStyle = "bold";
  data.cell.styles.textColor = v === "SÍ" ? SI_COLOR : NO_COLOR;
}

function drawSectionTitle(doc: jsPDF, y: number, title: string): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(C.primary.r, C.primary.g, C.primary.b);
  doc.circle(MARGIN + 2, y + 1.5, 1.6, "F");
  doc.setTextColor(C.text.r, C.text.g, C.text.b);
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text(title, MARGIN + 7, y + 2.5);
  const lineY = y + 5;
  doc.setDrawColor(C.gold.r, C.gold.g, C.gold.b);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, lineY, w - MARGIN, lineY);
  return lineY + 4;
}

/** Encabezado institucional con escudo Riberalta y logo SIRAT (maqueta PDF). */
export async function drawFormularioPdfHeader(doc: jsPDF, usuario?: string): Promise<number> {
  const w = doc.internal.pageSize.getWidth();
  const [logo, escudo] = await Promise.all([loadSiratLogoDataUrl(), loadEscudoRiberaltaDataUrl()]);
  let y = drawSiratPdfTopBar(doc, { usuario }) + 5;

  if (escudo) {
    const escudoW = 24;
    const escudoH = 28;
    doc.addImage(escudo, "PNG", MARGIN, y, escudoW, escudoH);
  }

  if (logo) {
    const logoH = 26;
    const logoW = logoH * SIRAT_LOGO_ASPECT;
    doc.addImage(logo, "PNG", w - MARGIN - logoW, y + 1, logoW, logoH);
  }

  doc.setTextColor(C.text.r, C.text.g, C.text.b);
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(GAM_RIBERALTA_NOMBRE, w / 2, y + 10, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(JEFATURA_RECAUDACIONES, w / 2, y + 15, { align: "center" });

  y += 20;
  doc.setDrawColor(C.gold.r, C.gold.g, C.gold.b);
  doc.setLineWidth(0.4);
  doc.line(w / 2 - 42, y, w / 2 + 42, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.primary.r, C.primary.g, C.primary.b);
  doc.setFontSize(11);
  doc.text("FORMULARIO DE REGISTRO Y VERIFICACIÓN", w / 2, y, { align: "center" });
  y += 5;
  doc.text("DE ACTIVIDADES ECONÓMICAS", w / 2, y + 1, { align: "center" });

  return y + 10;
}

export function drawFormularioDatosSection(
  doc: jsPDF,
  startY: number,
  rows: string[][],
): number {
  let y = drawSectionTitle(doc, startY, "DATOS GENERALES");
  autoTable(doc, {
    startY: y,
    ...TABLE_BASE,
    columnStyles: {
      0: { fontStyle: "bold", fillColor: LABEL_FILL, cellWidth: 38 },
      1: { fillColor: [255, 255, 255] },
      2: { fontStyle: "bold", fillColor: LABEL_FILL, cellWidth: 38 },
      3: { fillColor: [255, 255, 255] },
    },
    body: rows,
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

export function drawFormularioInfoSection(
  doc: jsPDF,
  startY: number,
  procedente: string,
  padron: string,
  bebidas: string,
  observacion: string,
): number {
  let y = drawSectionTitle(doc, startY, "INFORMACIÓN ADICIONAL");
  autoTable(doc, {
    startY: y,
    ...TABLE_BASE,
    columnStyles: {
      0: { fontStyle: "bold", fillColor: LABEL_FILL, cellWidth: 42 },
      1: { fillColor: [255, 255, 255] },
      2: { fontStyle: "bold", fillColor: LABEL_FILL, cellWidth: 42 },
      3: { fillColor: [255, 255, 255] },
    },
    body: [
      ["Procedente", procedente, "Padrón", padron],
      [
        { content: "Bebidas alcohólicas", styles: { fontStyle: "bold", fillColor: LABEL_FILL } },
        { content: bebidas, colSpan: 3 },
      ],
      [
        { content: "Observación", styles: { fontStyle: "bold", fillColor: LABEL_FILL } },
        { content: observacion, colSpan: 3 },
      ],
    ],
    didParseCell: styleSiNoCell,
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

export function drawFormularioFotosPageStart(doc: jsPDF, usuario?: string): number {
  const y = drawSiratPdfTopBar(doc, { usuario }) + 4;
  return drawSectionTitle(doc, y, "FOTOS DE LA VERIFICACIÓN");
}

export function drawFormularioUbicacionSection(
  doc: jsPDF,
  startY: number,
  mapDataUrl: string,
): number {
  const w = doc.internal.pageSize.getWidth();
  let y = drawSectionTitle(doc, startY, "UBICACIÓN");
  const mapW = w - 2 * MARGIN;
  const mapH = 50;
  const x = MARGIN;
  const yMap = y;

  doc.setDrawColor(200, 206, 218);
  doc.setLineWidth(0.3);
  if (typeof doc.roundedRect === "function") {
    doc.roundedRect(x, yMap, mapW, mapH, 2, 2, "S");
  } else {
    doc.rect(x, yMap, mapW, mapH, "S");
  }
  doc.addImage(mapDataUrl, "JPEG", x + 0.5, yMap + 0.5, mapW - 1, mapH - 1);

  return yMap + mapH + 6;
}

export function drawFormularioPdfSignatures(
  doc: jsPDF,
  startY: number,
  labels = [
    FORMULARIO_PDF_FIRMA_ENCARGADO_RUAT,
    "Inspector Tributario",
    "Contribuyente",
  ],
): number {
  const w = doc.internal.pageSize.getWidth();
  const sigW = (w - 2 * MARGIN) / labels.length;
  labels.forEach((label, i) => {
    const x = MARGIN + i * sigW;
    doc.setDrawColor(160, 165, 175);
    doc.setLineWidth(0.2);
    doc.line(x + 4, startY + 14, x + sigW - 4, startY + 14);
    doc.setTextColor(C.text.r, C.text.g, C.text.b);
    doc.setFont("helvetica", "normal").setFontSize(7.5);
    doc.text(label, x + sigW / 2, startY + 19, { align: "center" });
  });
  return startY + 24;
}

/** Pie de declaración jurada siempre al final de la página 1. */
export function drawFormularioPdfFooter(doc: jsPDF, startY: number, pageNumber = 1): void {
  const w = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const prevPage = doc.getCurrentPageInfo().pageNumber;
  doc.setPage(pageNumber);
  const y = Math.max(startY + 4, pageH - 16);

  doc.setFont("helvetica", "italic").setFontSize(7.5);
  doc.setTextColor(90, 95, 105);
  const texto =
    "La información registrada tiene carácter de declaración jurada y está sujeta a su verificación.";
  const lines = doc.splitTextToSize(texto, w - 2 * MARGIN - 10);
  doc.text(lines, w / 2, y, { align: "center" });
  doc.setPage(prevPage);
}
