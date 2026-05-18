import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateEsBo } from "@/lib/date";
import { downloadJsPdf } from "@/lib/download-file";
import {
  FORMULARIO_PDF_FIRMA_ENCARGADO_RUAT,
  FORMULARIO_VERIFICACION_PDF_TITULO,
  GAM_RIBERALTA_NOMBRE,
  JEFATURA_RECAUDACIONES,
  NOTIFICACION_TRIBUTARIA_PDF_TITULO,
  SIRAT_REPORT_COLORS,
  SIRAT_TAGLINE,
} from "@/lib/sirat-brand";

const PDF_PRIMARY = SIRAT_REPORT_COLORS.primary;
const PDF_TABLE_THEME = {
  theme: "grid" as const,
  styles: { fontSize: 9, cellPadding: 2 },
  headStyles: { fillColor: [PDF_PRIMARY.r, PDF_PRIMARY.g, PDF_PRIMARY.b] as [number, number, number] },
};

function drawSiratPdfBanner(doc: jsPDF, w: number) {
  doc.setFillColor(PDF_PRIMARY.r, PDF_PRIMARY.g, PDF_PRIMARY.b);
  doc.rect(0, 0, w, 28, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text("SIRAT", 14, 14);
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text(SIRAT_TAGLINE, 14, 21);
}

/** Encabezado del PDF del formulario de actividades económicas (altura en mm). */
function drawFormularioPdfBanner(doc: jsPDF, w: number): number {
  const bannerH = 40;
  doc.setFillColor(PDF_PRIMARY.r, PDF_PRIMARY.g, PDF_PRIMARY.b);
  doc.rect(0, 0, w, bannerH, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text(GAM_RIBERALTA_NOMBRE, w / 2, 11, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(JEFATURA_RECAUDACIONES, w / 2, 17, { align: "center" });
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("SIRAT", 14, 28);
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(SIRAT_TAGLINE, 14, 34);
  return bannerH;
}

function drawSiratPdfSignatures(
  doc: jsPDF,
  w: number,
  finalY: number,
  labels = ["Inspector Tributario", "Contribuyente", "Asesor Legal"],
) {
  const sigW = (w - 28) / labels.length;
  labels.forEach((label, i) => {
    const x = 14 + i * sigW;
    doc.line(x + 5, finalY + 18, x + sigW - 5, finalY + 18);
    doc.setFontSize(8).text(label, x + sigW / 2, finalY + 24, { align: "center" });
  });
}

interface FormularioData {
  fecha: string;
  razon_social: string;
  contribuyente_nombre: string;
  contribuyente_ci: string;
  nit?: string | null;
  zona: string;
  superficie: number;
  direccion: string;
  celular: string;
  referencia: string;
  latitud?: number | null;
  longitud?: number | null;
  procedente: boolean;
  padron: boolean;
  bebidas_alcoholicas: boolean;
  observacion?: string | null;
  estado: string;
  /** URLs firmadas de fotos de verificación (se añaden en página(s) siguientes). */
  imageUrls?: string[];
}

async function imageUrlToJpegDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number }> {
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`Descarga de imagen: ${res.status}`);
  const blob = await res.blob();
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      return { dataUrl: canvas.toDataURL("image/jpeg", 0.9), w: canvas.width, h: canvas.height };
    } catch {
      /* continuar con Image + object URL */
    }
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo decodificar la imagen"));
      el.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible");
    ctx.drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.9), w: canvas.width, h: canvas.height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawFormularioFotosSectionHeader(doc: jsPDF, w: number, razonSocial?: string): number {
  const bannerH = drawFormularioPdfBanner(doc, w);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("FOTOS DE LA VERIFICACIÓN", w / 2, bannerH + 8, { align: "center" });
  if (razonSocial?.trim()) {
    doc.setFont("helvetica", "normal").setFontSize(9);
    const lines = doc.splitTextToSize(razonSocial.trim(), w - 28);
    doc.text(lines, w / 2, bannerH + 14, { align: "center" });
    return bannerH + 14 + lines.length * 4;
  }
  return bannerH + 12;
}

/** Añade página(s) con fotos al documento (nueva hoja si `startWithNewPage`). */
async function appendFormularioFotosPages(
  doc: jsPDF,
  opts: { imageUrls: string[]; razon_social?: string; startWithNewPage?: boolean },
): Promise<void> {
  const urls = opts.imageUrls.filter(Boolean);
  if (!urls.length) return;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxW = pageW - 2 * margin;
  const captionGap = 6;

  if (opts.startWithNewPage !== false) doc.addPage();
  let y = drawFormularioFotosSectionHeader(doc, pageW, opts.razon_social);

  for (let i = 0; i < urls.length; i++) {
    const { dataUrl, w: iw, h: ih } = await imageUrlToJpegDataUrl(urls[i]);
    const aspect = iw / ih;

    let room = pageH - margin - y - captionGap;
    if (room < 22) {
      doc.addPage();
      y = drawFormularioFotosSectionHeader(doc, pageW, opts.razon_social);
      room = pageH - margin - y - captionGap;
    }

    let dispW = maxW;
    let dispH = dispW / aspect;
    if (dispH > room) {
      dispH = room;
      dispW = dispH * aspect;
    }

    doc.addImage(dataUrl, "JPEG", margin, y, dispW, dispH);
    doc.setFontSize(7).setTextColor(90);
    doc.text(`Foto ${i + 1} de ${urls.length}`, margin, y + dispH + 5);
    doc.setTextColor(0);
    y += dispH + captionGap + 4;
  }
}

export async function generateFormularioPDF(d: FormularioData): Promise<void> {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const headerH = drawFormularioPdfBanner(doc, w);

  doc.setTextColor(0);
  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text(FORMULARIO_VERIFICACION_PDF_TITULO, w / 2, headerH + 10, { align: "center" });

  autoTable(doc, {
    startY: headerH + 16,
    ...PDF_TABLE_THEME,
    body: [
      ["Fecha", formatDateEsBo(d.fecha), "Estado", d.estado.toUpperCase()],
      ["Contribuyente", d.contribuyente_nombre, "C.I.", d.contribuyente_ci],
      ["Razón social", d.razon_social, "NIT", d.nit ?? "—"],
      ["Zona", d.zona, "Superficie (m²)", String(d.superficie)],
      ["Celular", d.celular, "", ""],
      ["Dirección", d.direccion, "", ""],
      ["Referencia", d.referencia, "", ""],
      ["Coordenadas", d.latitud && d.longitud ? `${d.latitud}, ${d.longitud}` : "—", "", ""],
      ["Procedente", d.procedente ? "SÍ" : "NO", "Padrón", d.padron ? "SÍ" : "NO"],
      ["", "", "Bebidas alcohólicas", d.bebidas_alcoholicas ? "SÍ" : "NO"],
      ["Observación", d.observacion ?? "—", "", ""],
    ],
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  drawSiratPdfSignatures(doc, w, finalY, [
    FORMULARIO_PDF_FIRMA_ENCARGADO_RUAT,
    "Inspector Tributario",
    "Contribuyente",
  ]);

  const urls = d.imageUrls?.filter(Boolean) ?? [];
  if (urls.length) {
    await appendFormularioFotosPages(doc, {
      imageUrls: urls,
      razon_social: d.razon_social,
      startWithNewPage: true,
    });
  }

  const slug = d.razon_social.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "formulario";
  downloadJsPdf(doc, `verificacion-${slug}.pdf`);
}

interface NotificacionData {
  fecha: string;
  contribuyente_nombre: string;
  contribuyente_ci: string;
  nombre_actividad: string | null;
  numero_identificacion: string | null;
  direccion: string;
  fecha_limite: string;
  conceptos: string[];
  gestiones_adeudadas: string | null;
}

export function generateNotificacionPDF(d: NotificacionData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  drawSiratPdfBanner(doc, w);

  doc.setTextColor(0);
  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text(NOTIFICACION_TRIBUTARIA_PDF_TITULO, w / 2, 38, { align: "center" });

  autoTable(doc, {
    startY: 44,
    ...PDF_TABLE_THEME,
    body: [
      ["Fecha emisión", formatDateEsBo(d.fecha), "", ""],
      ["Contribuyente", d.contribuyente_nombre, "C.I.", d.contribuyente_ci],
      [
        "Nombre de la actividad",
        d.nombre_actividad?.trim() || "—",
        "Licencia / placa / inmueble",
        d.numero_identificacion?.trim() || "—",
      ],
      ["Dirección", d.direccion, "Fecha límite", formatDateEsBo(d.fecha_limite)],
      ["Conceptos", d.conceptos.join(", ") || "—", "", ""],
      ["Gestiones adeudadas", d.gestiones_adeudadas?.trim() || "—", "", ""],
    ],
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  drawSiratPdfSignatures(doc, w, finalY);

  const slug = (d.nombre_actividad?.trim() || d.contribuyente_ci)
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "notificacion";
  downloadJsPdf(doc, `notificacion-${slug}.pdf`);
}

export interface FormularioFotosPdfOpts {
  razon_social?: string;
  /** URLs firmadas o públicas de las imágenes */
  imageUrls: string[];
}

/** PDF solo con las fotos del formulario (A4, listo para imprimir). */
export async function generateFormularioFotosPDF(opts: FormularioFotosPdfOpts): Promise<void> {
  const urls = opts.imageUrls.filter(Boolean);
  if (!urls.length) throw new Error("Sin fotos");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await appendFormularioFotosPages(doc, {
    imageUrls: urls,
    razon_social: opts.razon_social,
    startWithNewPage: false,
  });

  const slug = (opts.razon_social ?? "formulario")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "formulario";
  downloadJsPdf(doc, `verificacion-${slug}-fotos.pdf`);
}
