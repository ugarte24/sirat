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
const G = C.green;
const MARGIN = 12;
const LABEL_FILL: [number, number, number] = [232, 236, 245];
const SI_COLOR: [number, number, number] = [G.r, G.g, G.b];
const NO_COLOR: [number, number, number] = [220, 38, 38];
const TOP_BAR_CONTENT_Y = 26;
const BOTTOM_MARGIN = 15;

const TABLE_BASE = {
  theme: "plain" as const,
  styles: {
    fontSize: 8.5,
    cellPadding: 2.5,
    textColor: [C.text.r, C.text.g, C.text.b] as [number, number, number],
    lineColor: [218, 222, 230] as [number, number, number],
    lineWidth: 0.15,
  },
  margin: { left: MARGIN, right: MARGIN, top: TOP_BAR_CONTENT_Y },
};

function ensureSpace(doc: jsPDF, currentY: number, neededMm: number, usuario?: string): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (currentY + neededMm > pageH - BOTTOM_MARGIN) {
    doc.addPage();
    return drawSiratPdfTopBar(doc, { usuario }) + 4;
  }
  return currentY;
}

function makeAutoTablePageHook(doc: jsPDF, usuario?: string) {
  return (data: { pageNumber: number }) => {
    if (data.pageNumber <= 1) return;
    drawSiratPdfTopBar(doc, { usuario });
  };
}

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

function drawSectionTitle(doc: jsPDF, y: number, title: string, compact = false): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(G.r, G.g, G.b);
  doc.circle(MARGIN + 2, y + 1.5, 1.6, "F");
  doc.setTextColor(C.text.r, C.text.g, C.text.b);
  doc.setFont("helvetica", "bold").setFontSize(compact ? 9 : 10);
  doc.text(title, MARGIN + 7, y + 2.5);
  const lineY = y + (compact ? 4 : 5);
  doc.setDrawColor(G.r, G.g, G.b);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, lineY, w - MARGIN, lineY);
  return lineY + (compact ? 2 : 4);
}

const DATOS_TABLE_COLUMNS = {
  0: { fontStyle: "bold" as const, fillColor: LABEL_FILL, cellWidth: 38 },
  1: { fillColor: [255, 255, 255] as [number, number, number] },
  2: { fontStyle: "bold" as const, fillColor: LABEL_FILL, cellWidth: 38 },
  3: { fillColor: [255, 255, 255] as [number, number, number] },
};

/** Encabezado institucional con escudo Riberalta y logo SIRAT (maqueta PDF). */
export async function drawInstitucionalPdfHeader(
  doc: jsPDF,
  opts: {
    usuario?: string;
    titleLines: string[];
    titleFontSize?: number;
    /** Espacio extra (mm) entre la línea verde y el título */
    titleMarginTop?: number;
    /** QR opcional bajo el logo; con varias líneas de título, el bloque queda centrado al QR */
    qrDataUrl?: string;
    qrSizeMm?: number;
    /** Espacio (mm) tras el bloque título/QR antes de la siguiente sección (por defecto 6). */
    trailingGap?: number;
  },
): Promise<number> {
  const w = doc.internal.pageSize.getWidth();
  const [logo, escudo] = await Promise.all([loadSiratLogoDataUrl(), loadEscudoRiberaltaDataUrl()]);
  let y = drawSiratPdfTopBar(doc, { usuario: opts.usuario }) + 5;

  const logoZoneH = 20;

  if (escudo) {
    const escudoH = logoZoneH;
    const escudoW = escudoH * (24 / 28);
    doc.addImage(escudo, "PNG", MARGIN, y, escudoW, escudoH);
  }

  let rightEdge = w - MARGIN;
  if (opts.qrDataUrl) {
    const qrH = Math.min(opts.qrSizeMm ?? 22, logoZoneH);
    rightEdge -= qrH;
    doc.addImage(opts.qrDataUrl, "PNG", rightEdge, y, qrH, qrH);
    rightEdge -= 2;
  }
  if (logo) {
    const siratLogoH = logoZoneH - 1;
    const logoW = siratLogoH * SIRAT_LOGO_ASPECT;
    doc.addImage(logo, "PNG", rightEdge - logoW, y + 1, logoW, siratLogoH);
  }

  doc.setTextColor(C.text.r, C.text.g, C.text.b);
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(GAM_RIBERALTA_NOMBRE, w / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(JEFATURA_RECAUDACIONES, w / 2, y + 13, { align: "center" });

  y += logoZoneH;
  doc.setDrawColor(G.r, G.g, G.b);
  doc.setLineWidth(0.4);
  doc.line(w / 2 - 42, y, w / 2 + 42, y);
  const titleAreaY = y + 4;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(G.r, G.g, G.b);

  const fullTitle = opts.titleLines.join(" ");
  const maxTitleW = w - 2 * MARGIN - 4;
  let titleSize = opts.titleFontSize ?? 11;
  doc.setFontSize(titleSize);
  while (titleSize > 7 && doc.getTextWidth(fullTitle) > maxTitleW) {
    titleSize -= 0.5;
    doc.setFontSize(titleSize);
  }

  doc.text(fullTitle, w / 2, titleAreaY + (opts.titleMarginTop ?? 0), { align: "center" });
  const contentBottom = titleAreaY + titleSize * 0.35;

  return contentBottom + (opts.trailingGap ?? 4);
}

export async function drawFormularioPdfHeader(
  doc: jsPDF,
  usuario?: string,
  qrDataUrl?: string,
): Promise<number> {
  return drawInstitucionalPdfHeader(doc, {
    usuario,
    titleLines: [
      "FORMULARIO DE REGISTRO Y VERIFICACIÓN",
      "DE ACTIVIDADES ECONÓMICAS",
    ],
    qrDataUrl,
    qrSizeMm: 22,
  });
}

type PdfTableRow = (string | { content: string; colSpan?: number; styles?: Record<string, unknown> })[];

export type PdfTablaSectionOpts = {
  /** Menos espacio entre título de sección y tabla, y entre filas. */
  compact?: boolean;
  /** Usuario para redibujar la barra SIRAT en páginas de continuación. */
  usuario?: string;
};

export function drawPdfTablaSection(
  doc: jsPDF,
  startY: number,
  sectionTitle: string,
  rows: PdfTableRow[],
  opts?: PdfTablaSectionOpts,
): number {
  const compact = opts?.compact ?? false;
  let y = ensureSpace(doc, startY, 30, opts?.usuario);
  y = drawSectionTitle(doc, y, sectionTitle, compact);
  autoTable(doc, {
    startY: y,
    ...TABLE_BASE,
    styles: {
      ...TABLE_BASE.styles,
      cellPadding: compact ? 1.8 : TABLE_BASE.styles.cellPadding,
      fontSize: compact ? 8 : TABLE_BASE.styles.fontSize,
    },
    columnStyles: DATOS_TABLE_COLUMNS,
    body: rows,
    didDrawPage: makeAutoTablePageHook(doc, opts?.usuario),
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + (compact ? 3 : 6);
}

export function drawFormularioDatosSection(
  doc: jsPDF,
  startY: number,
  rows: PdfTableRow[],
  usuario?: string,
): number {
  return drawPdfTablaSection(doc, startY, "DATOS GENERALES", rows, { usuario });
}

export type FormularioAmbientePdfRow = {
  orden: number;
  ambiente: string;
  largo: number;
  ancho: number;
  superficieM2: number;
};

export function drawFormularioInspeccionSuperficiesSection(
  doc: jsPDF,
  startY: number,
  rows: FormularioAmbientePdfRow[],
  totalLabel: string,
  usuario?: string,
): number {
  let y = ensureSpace(doc, startY, 30, usuario);
  y = drawSectionTitle(doc, y, "MEDICIÓN DE AMBIENTES");
  const body: PdfTableRow[] = rows.map((r) => [
    String(r.orden),
    r.ambiente,
    String(r.largo),
    String(r.ancho),
    `${r.superficieM2} m²`,
  ]);
  body.push([
    "",
    { content: "TOTAL", styles: { fontStyle: "bold", fillColor: LABEL_FILL } },
    "",
    "",
    { content: totalLabel, styles: { fontStyle: "bold" } },
  ]);

  autoTable(doc, {
    startY: y,
    ...TABLE_BASE,
    styles: { ...TABLE_BASE.styles, fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 52 },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
    },
    head: [["N°", "Ambiente", "Largo", "Ancho", "Superficie"]],
    body,
    didDrawPage: makeAutoTablePageHook(doc, usuario),
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

export function drawFormularioInfoSection(
  doc: jsPDF,
  startY: number,
  superficieSoloTotal: string | null,
  procedente: string,
  padron: string,
  bebidas: string,
  observacion: string,
  usuario?: string,
): number {
  let y = ensureSpace(doc, startY, 30, usuario);
  y = drawSectionTitle(doc, y, "INFORMACIÓN ADICIONAL");
  const body: PdfTableRow[] = [];
  if (superficieSoloTotal != null) {
    body.push([
      { content: "Superficie (m²)", styles: { fontStyle: "bold", fillColor: LABEL_FILL } },
      { content: superficieSoloTotal, colSpan: 3 },
    ]);
  }
  body.push(
    ["Procedente", procedente, "Padrón", padron],
    ["Bebidas alcohólicas", bebidas, "Observación", observacion],
  );
  autoTable(doc, {
    startY: y,
    ...TABLE_BASE,
    columnStyles: {
      0: { fontStyle: "bold", fillColor: LABEL_FILL, cellWidth: 42 },
      1: { fillColor: [255, 255, 255] },
      2: { fontStyle: "bold", fillColor: LABEL_FILL, cellWidth: 42 },
      3: { fillColor: [255, 255, 255] },
    },
    body,
    didParseCell: styleSiNoCell,
    didDrawPage: makeAutoTablePageHook(doc, usuario),
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

export function drawFormularioFotosPageStart(
  doc: jsPDF,
  usuario?: string,
  sectionTitle = "FOTOS DE LA VERIFICACIÓN",
): number {
  const y = drawSiratPdfTopBar(doc, { usuario }) + 4;
  return drawSectionTitle(doc, y, sectionTitle);
}

/** Sección única de observación de baja (solo línea nueva). */
export function drawFormularioBajaObservacionSection(
  doc: jsPDF,
  startY: number,
  observacionBaja: string,
  usuario?: string,
): number {
  return drawPdfTablaSection(doc, startY, "OBSERVACIÓN DE BAJA", [
    [
      { content: "Detalle", styles: { fontStyle: "bold", fillColor: LABEL_FILL } },
      { content: observacionBaja.trim() || "—", colSpan: 3 },
    ],
  ], { usuario });
}

export function drawFormularioUbicacionSection(
  doc: jsPDF,
  startY: number,
  mapDataUrl: string,
  usuario?: string,
): number {
  const w = doc.internal.pageSize.getWidth();
  const mapW = w - 2 * MARGIN;
  const mapH = 50;
  let y = ensureSpace(doc, startY, mapH + 12, usuario);
  y = drawSectionTitle(doc, y, "UBICACIÓN");
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

const SIGNATURES_HEIGHT = 24;

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
  return startY + SIGNATURES_HEIGHT;
}

export function ensureSpaceForSignatures(doc: jsPDF, currentY: number, usuario?: string): number {
  return ensureSpace(doc, currentY, SIGNATURES_HEIGHT + 8, usuario);
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

/** Firmas y pie de página 1 del formulario (evita referencias sueltas en pdf.ts). */
export function finalizeFormularioPdfFirstPage(doc: jsPDF, startY: number): void {
  const y = drawFormularioPdfSignatures(doc, startY);
  drawFormularioPdfFooter(doc, y, 1);
}

