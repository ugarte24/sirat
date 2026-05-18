import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateEsBo } from "@/lib/date";
import { downloadJsPdf } from "@/lib/download-file";
import {
  drawFormularioDatosSection,
  drawFormularioInfoSection,
  drawFormularioPdfFooter,
  drawFormularioPdfHeader,
  drawFormularioPdfSignatures,
  drawFormularioUbicacionSection,
} from "@/lib/pdf-formulario-layout";
import { captureFormularioMapForPdf } from "@/lib/pdf-map-snapshot";
import { drawSiratPdfTopBar, SIRAT_PDF_TABLE_STYLES } from "@/lib/report-format";
import {
  NOTIFICACION_TRIBUTARIA_PDF_TITULO,
  SIRAT_REPORT_COLORS,
  SIRAT_TAGLINE,
} from "@/lib/sirat-brand";

const C = SIRAT_REPORT_COLORS;
const PDF_PRIMARY = C.primary;
const LABEL_CELL_FILL: [number, number, number] = [C.zebra.r, C.zebra.g, C.zebra.b];
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
  mapa_zoom?: number | null;
  procedente: boolean;
  padron: boolean;
  bebidas_alcoholicas: boolean;
  observacion?: string | null;
  estado: string;
  /** URLs firmadas de fotos de verificación (se añaden en página(s) siguientes). */
  imageUrls?: string[];
  /** Nombre del usuario que genera el PDF (barra superior). */
  usuario?: string;
  /** Contenedor del MapPicker visible (captura idéntica a la vista de registro). */
  mapCaptureElement?: HTMLElement | null;
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

function drawFormularioFotosSectionHeader(
  doc: jsPDF,
  w: number,
  opts?: { razonSocial?: string; usuario?: string },
): number {
  let y = drawSiratPdfTopBar(doc, { usuario: opts?.usuario }) + 10;
  doc.setTextColor(C.gold.r, C.gold.g, C.gold.b);
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("FOTOS DE LA VERIFICACIÓN", w / 2, y, { align: "center" });
  y += 7;
  if (opts?.razonSocial?.trim()) {
    doc.setTextColor(C.text.r, C.text.g, C.text.b);
    doc.setFont("helvetica", "bold").setFontSize(9);
    const lines = doc.splitTextToSize(opts.razonSocial.trim().toUpperCase(), w - 24);
    doc.text(lines, w / 2, y, { align: "center" });
    y += lines.length * 4 + 2;
  }
  return y + 2;
}

function fitImageInBox(iw: number, ih: number, boxW: number, boxH: number) {
  const aspect = iw / ih;
  let w = boxW;
  let h = w / aspect;
  if (h > boxH) {
    h = boxH;
    w = h * aspect;
  }
  return { w, h };
}

/** Añade una sola hoja con todas las fotos escaladas para caber juntas. */
async function appendFormularioFotosPages(
  doc: jsPDF,
  opts: { imageUrls: string[]; razon_social?: string; usuario?: string; startWithNewPage?: boolean },
): Promise<void> {
  const urls = opts.imageUrls.filter(Boolean);
  if (!urls.length) return;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxW = pageW - 2 * margin;
  const gap = 5;

  if (opts.startWithNewPage !== false) doc.addPage();
  const startY = drawFormularioFotosSectionHeader(doc, pageW, {
    razonSocial: opts.razon_social,
    usuario: opts.usuario,
  });

  const images = await Promise.all(urls.map((url) => imageUrlToJpegDataUrl(url)));
  const n = images.length;
  const cols = n <= 1 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  const availableH = pageH - margin - startY;
  const cellW = (maxW - (cols - 1) * gap) / cols;
  const cellH = (availableH - (rows - 1) * gap) / rows;

  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const { w: dispW, h: dispH } = fitImageInBox(img.w, img.h, cellW, cellH);
    const cellX = margin + col * (cellW + gap);
    const cellY = startY + row * (cellH + gap);
    const x = cellX + (cellW - dispW) / 2;
    const y = cellY + (cellH - dispH) / 2;

    doc.addImage(img.dataUrl, "JPEG", x, y, dispW, dispH);
  });
}

export async function generateFormularioPDF(d: FormularioData): Promise<void> {
  const doc = new jsPDF();
  let y = await drawFormularioPdfHeader(doc, d.usuario);

  y = drawFormularioDatosSection(doc, y, [
    ["Fecha", formatDateEsBo(d.fecha), "Superficie (m²)", String(d.superficie)],
    ["Contribuyente", d.contribuyente_nombre, "Celular", d.celular],
    ["C.I.", d.contribuyente_ci, "Dirección", d.direccion],
    ["Razón social", d.razon_social, "Referencia", d.referencia],
    ["NIT", d.nit ?? "—", "Zona", d.zona],
  ]);

  y = drawFormularioInfoSection(
    doc,
    y,
    d.procedente ? "SÍ" : "NO",
    d.padron ? "SÍ" : "NO",
    d.bebidas_alcoholicas ? "SÍ" : "NO",
    d.observacion?.trim() || "—",
  );

  const la = d.latitud != null ? Number(d.latitud) : NaN;
  const ln = d.longitud != null ? Number(d.longitud) : NaN;
  if (Number.isFinite(la) && Number.isFinite(ln)) {
    try {
      const mapDataUrl = await captureFormularioMapForPdf(
        la,
        ln,
        d.mapa_zoom ?? 17,
        d.mapCaptureElement,
      );
      y = drawFormularioUbicacionSection(doc, y, mapDataUrl);
    } catch (e) {
      console.warn("Mapa no incluido en PDF:", e);
    }
  }

  y = drawFormularioPdfSignatures(doc, y);
  drawFormularioPdfFooter(doc, y);

  const urls = d.imageUrls?.filter(Boolean) ?? [];
  if (urls.length) {
    await appendFormularioFotosPages(doc, {
      imageUrls: urls,
      razon_social: d.razon_social,
      usuario: d.usuario,
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
