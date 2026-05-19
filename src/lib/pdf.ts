import jsPDF from "jspdf";
import QRCode from "qrcode";
import { formatDateEsBo } from "@/lib/date";
import { applySiratPdfPageNumbers, downloadBlob, downloadJsPdf } from "@/lib/download-file";
import {
  drawFormularioDatosSection,
  drawFormularioFotosPageStart,
  drawFormularioInfoSection,
  drawFormularioPdfHeader,
  drawFormularioUbicacionSection,
  drawInstitucionalPdfHeader,
  drawPdfTablaSection,
  finalizeFormularioPdfFirstPage,
} from "@/lib/pdf-formulario-layout";
import { supabase } from "@/integrations/supabase/client";
import {
  blobToFormularioPdfImage,
  downloadFormularioFoto,
  type FormularioFotoPdfAsset,
} from "@/lib/formulario-fotos";
import { captureFormularioMapForPdf } from "@/lib/pdf-map-snapshot";
import {
  NOTIFICACION_GESTIONES_ADEUDADAS_LABEL,
  NOTIFICACION_TRIBUTARIA_PDF_TITULO,
} from "@/lib/sirat-brand";
import {
  buildFormularioVerificacionUrl,
  type FormularioQrPayload,
} from "@/lib/formulario-qr";
import {
  FORMULARIO_CAMPO_SIN_VERIFICAR,
  formularioVerificacionSinCompletar,
} from "@/lib/sirat-forms";
import {
  buildNotificacionVerificacionUrl,
  type NotificacionQrPayload,
} from "@/lib/notificacion-qr";

/** Nombre de archivo PDF: solo razón social (caracteres no válidos en Windows eliminados). */
function formularioPdfFilename(razonSocial: string, extraSuffix?: string): string {
  const base = razonSocial
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return extraSuffix ? `${extraSuffix}.pdf` : "formulario.pdf";
  return extraSuffix ? `${base} - ${extraSuffix}.pdf` : `${base}.pdf`;
}
const PDF_LABEL_CELL = { fontStyle: "bold" as const, fillColor: [232, 236, 245] as [number, number, number] };

interface FormularioData {
  id: string;
  fecha: string;
  razon_social: string;
  contribuyente_nombre: string;
  contribuyente_ci: string;
  nit?: string | null;
  zona: string;
  superficie: number | null;
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
  /** Fotos para la hoja 2 (preferir storagePath para descarga fiable). */
  photos?: FormularioPdfPhoto[];
  /** @deprecated Usar photos */
  imageUrls?: string[];
  /** @deprecated Usar photos */
  imageBlobs?: (Blob | undefined)[];
  /** Nombre del usuario que genera el PDF (barra superior). */
  usuario?: string;
  /** Contenedor del MapPicker visible (captura idéntica a la vista de registro). */
  mapCaptureElement?: HTMLElement | null;
}

export type FormularioPdfPhoto = {
  url?: string;
  storagePath?: string;
  blob?: Blob;
};

type PdfImageAsset = FormularioFotoPdfAsset;

function normalizeFormularioPhotos(d: {
  photos?: FormularioPdfPhoto[];
  imageUrls?: string[];
  imageBlobs?: (Blob | undefined)[];
}): FormularioPdfPhoto[] {
  if (d.photos?.length) return d.photos;
  return (d.imageUrls ?? [])
    .map((url, i) => ({ url, blob: d.imageBlobs?.[i] }))
    .filter((p) => Boolean(p.url || p.storagePath || p.blob));
}

async function resolvePhotoForPdf(photo: FormularioPdfPhoto): Promise<PdfImageAsset> {
  const attempts: Array<() => Promise<PdfImageAsset>> = [];

  if (photo.storagePath?.trim()) {
    const path = photo.storagePath.trim();
    attempts.push(async () => {
      const blob = await downloadFormularioFoto(supabase, path);
      if (!blob?.size) throw new Error("Descarga vacía");
      return blobToFormularioPdfImage(blob);
    });
  }

  if (photo.blob?.size) {
    const blob = photo.blob;
    attempts.push(() => blobToFormularioPdfImage(blob));
  }

  if (photo.url?.trim()) {
    const url = photo.url.trim();
    attempts.push(async () => {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return blobToFormularioPdfImage(await res.blob());
    });
  }

  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("No se pudo cargar la foto");
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

/** Fotos apaisadas (ancho ≥ alto): una debajo de otra; verticales: hasta 2 por fila. */
function fotosPdfLayout(images: Pick<PdfImageAsset, "w" | "h">[]): { cols: number; rows: number } {
  const n = images.length;
  if (n <= 1) return { cols: 1, rows: n };
  const apaisadas = images.every((img) => img.w >= img.h);
  if (apaisadas) return { cols: 1, rows: n };
  return { cols: 2, rows: Math.ceil(n / 2) };
}

/** Añade una hoja con todas las fotos (debe llamarse con la página 2 ya activa si aplica). */
async function appendFormularioFotosPages(
  doc: jsPDF,
  opts: {
    photos: FormularioPdfPhoto[];
    usuario?: string;
    startWithNewPage?: boolean;
  },
): Promise<number> {
  const sources = opts.photos.filter((p) => p.url || p.storagePath || p.blob);
  if (!sources.length) return 0;

  const images: PdfImageAsset[] = [];
  for (const photo of sources) {
    try {
      images.push(await resolvePhotoForPdf(photo));
    } catch (e) {
      console.warn("Foto omitida en PDF:", photo.storagePath ?? photo.url, e);
    }
  }
  if (!images.length) {
    throw new Error("No se pudieron cargar las fotos para el PDF");
  }

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const maxW = pageW - 2 * margin;
  const gap = 5;

  if (opts.startWithNewPage !== false) doc.addPage();
  const startY = drawFormularioFotosPageStart(doc, opts.usuario);

  const { cols, rows } = fotosPdfLayout(images);
  const availableH = Math.max(40, pageH - margin - startY - 12);
  const cellW = (maxW - (cols - 1) * gap) / cols;
  const cellH = Math.max(30, (availableH - (rows - 1) * gap) / rows);

  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const { w: dispW, h: dispH } = fitImageInBox(img.w, img.h, cellW, cellH);
    if (dispW < 1 || dispH < 1) return;
    const cellX = margin + col * (cellW + gap);
    const cellY = startY + row * (cellH + gap);
    const x = cellX + (cellW - dispW) / 2;
    const y = cellY + (cellH - dispH) / 2;
    doc.addImage(img.dataUrl, "JPEG", x, y, dispW, dispH);
  });

  return images.length;
}

export function formularioQrPayloadToPdfData(p: FormularioQrPayload): FormularioData {
  return {
    id: p.id,
    fecha: p.fecha,
    razon_social: p.razon_social,
    contribuyente_nombre: p.contribuyente_nombre,
    contribuyente_ci: p.contribuyente_ci,
    nit: p.nit === "—" ? null : p.nit,
    zona: p.zona,
    superficie: p.superficie,
    direccion: p.direccion,
    celular: p.celular,
    referencia: p.referencia,
    latitud: p.latitud,
    longitud: p.longitud,
    mapa_zoom: p.mapa_zoom,
    procedente: p.procedente,
    padron: p.padron,
    bebidas_alcoholicas: p.bebidas_alcoholicas,
    observacion: p.observacion === "—" ? null : p.observacion,
    estado: p.estado,
  };
}

export async function buildFormularioPdfDoc(d: FormularioData): Promise<{
  doc: jsPDF;
  fotosIncluidas: number;
  fotosSolicitadas: number;
}> {
  const doc = new jsPDF();
  const qrDataUrl = await QRCode.toDataURL(buildFormularioVerificacionUrl(d.id), {
    width: 256,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  let y = await drawFormularioPdfHeader(doc, d.usuario, qrDataUrl);

  const sinVerificar = formularioVerificacionSinCompletar({
    estado: d.estado,
    superficie: d.superficie,
  });
  const siNoPdf = (v: boolean) => (sinVerificar ? FORMULARIO_CAMPO_SIN_VERIFICAR : v ? "SÍ" : "NO");

  y = drawFormularioDatosSection(doc, y, [
    [
      "Fecha",
      formatDateEsBo(d.fecha),
      "Superficie (m²)",
      sinVerificar || d.superficie == null ? FORMULARIO_CAMPO_SIN_VERIFICAR : String(d.superficie),
    ],
    ["Contribuyente", d.contribuyente_nombre, "Celular", d.celular],
    ["C.I.", d.contribuyente_ci, "Dirección", d.direccion],
    ["Razón social", d.razon_social, "Referencia", d.referencia],
    ["NIT", d.nit ?? "—", "Zona", d.zona],
  ]);

  y = drawFormularioInfoSection(
    doc,
    y,
    siNoPdf(d.procedente),
    siNoPdf(d.padron),
    siNoPdf(d.bebidas_alcoholicas),
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

  finalizeFormularioPdfFirstPage(doc, y);

  const photoSources = normalizeFormularioPhotos(d);
  let fotosIncluidas = 0;
  if (photoSources.length) {
    try {
      fotosIncluidas = await appendFormularioFotosPages(doc, {
        photos: photoSources,
        usuario: d.usuario,
        startWithNewPage: true,
      });
    } catch (e) {
      console.warn("Fotos no incluidas en PDF:", e);
    }
  }

  return { doc, fotosIncluidas, fotosSolicitadas: photoSources.length };
}

export async function buildFormularioPdfBlob(
  d: FormularioData,
): Promise<{ blob: Blob; filename: string }> {
  const { doc } = await buildFormularioPdfDoc(d);
  applySiratPdfPageNumbers(doc);
  return {
    blob: doc.output("blob") as Blob,
    filename: formularioPdfFilename(d.razon_social),
  };
}

export async function generateFormularioPDF(
  d: FormularioData,
): Promise<{ fotosIncluidas: number; fotosSolicitadas: number }> {
  const { doc, fotosIncluidas, fotosSolicitadas } = await buildFormularioPdfDoc(d);
  applySiratPdfPageNumbers(doc);
  downloadJsPdf(doc, formularioPdfFilename(d.razon_social));
  return { fotosIncluidas, fotosSolicitadas };
}

export interface NotificacionPdfData {
  id: string;
  fecha: string;
  contribuyente_nombre: string;
  contribuyente_ci: string;
  nombre_actividad: string | null;
  numero_identificacion: string | null;
  direccion: string;
  fecha_limite: string;
  conceptos: string[];
  gestiones_adeudadas: string | null;
  usuario?: string;
}

export function notificacionQrPayloadToPdfData(payload: NotificacionQrPayload): NotificacionPdfData {
  return {
    id: payload.id,
    fecha: payload.fecha_emision,
    contribuyente_nombre: payload.contribuyente_nombre,
    contribuyente_ci: payload.contribuyente_ci,
    nombre_actividad: payload.nombre_actividad,
    numero_identificacion: payload.numero_identificacion,
    direccion: payload.direccion,
    fecha_limite: payload.fecha_limite,
    conceptos: payload.conceptos,
    gestiones_adeudadas:
      payload.gestiones_adeudadas === "—" ? null : payload.gestiones_adeudadas,
  };
}

export function notificacionPdfFilename(nombreActividad: string | null | undefined, ci: string): string {
  const base = (nombreActividad?.trim() || ci)
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "notificacion.pdf";
  return `${base}.pdf`;
}

export async function buildNotificacionPdfDoc(d: NotificacionPdfData): Promise<jsPDF> {
  const doc = new jsPDF();
  const qrDataUrl = await QRCode.toDataURL(buildNotificacionVerificacionUrl(d.id), {
    width: 256,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  let y = await drawInstitucionalPdfHeader(doc, {
    usuario: d.usuario,
    titleLines: [NOTIFICACION_TRIBUTARIA_PDF_TITULO],
    titleFontSize: 17,
    titleMarginTop: 12,
    qrDataUrl,
    qrSizeMm: 22,
  });

  y += 10;

  y = drawPdfTablaSection(doc, y, "DATOS DE LA NOTIFICACIÓN", [
    ["Fecha emisión", formatDateEsBo(d.fecha), "Contribuyente", d.contribuyente_nombre],
    [
      { content: "Nombre de la actividad", styles: PDF_LABEL_CELL },
      { content: d.nombre_actividad?.trim() || "—", colSpan: 3 },
    ],
    [
      { content: "Dirección", styles: PDF_LABEL_CELL },
      { content: d.direccion, colSpan: 3 },
    ],
    [
      { content: "Conceptos", styles: PDF_LABEL_CELL },
      { content: d.conceptos.join(", ") || "—", colSpan: 3 },
    ],
    [
      { content: NOTIFICACION_GESTIONES_ADEUDADAS_LABEL, styles: PDF_LABEL_CELL },
      { content: d.gestiones_adeudadas?.trim() || "—", colSpan: 3 },
    ],
    [
      { content: "Fecha límite", styles: PDF_LABEL_CELL },
      { content: formatDateEsBo(d.fecha_limite), colSpan: 3 },
    ],
    [
      { content: "C.I.", styles: PDF_LABEL_CELL },
      { content: d.contribuyente_ci, colSpan: 3 },
    ],
    [
      { content: "Licencia / placa / inmueble", styles: PDF_LABEL_CELL },
      { content: d.numero_identificacion?.trim() || "—", colSpan: 3 },
    ],
  ]);

  return doc;
}

export async function buildNotificacionPdfBlob(
  d: NotificacionPdfData,
): Promise<{ blob: Blob; filename: string }> {
  const doc = await buildNotificacionPdfDoc(d);
  applySiratPdfPageNumbers(doc);
  const filename = notificacionPdfFilename(d.nombre_actividad, d.contribuyente_ci);
  return { blob: doc.output("blob") as Blob, filename };
}

export async function generateNotificacionPDF(d: NotificacionPdfData): Promise<void> {
  const { blob, filename } = await buildNotificacionPdfBlob(d);
  downloadBlob(blob, filename, "pdf");
}

export interface FormularioFotosPdfOpts {
  razon_social?: string;
  usuario?: string;
  photos?: FormularioPdfPhoto[];
  /** @deprecated Usar photos */
  imageUrls?: string[];
  imageBlobs?: (Blob | undefined)[];
}

/** PDF solo con las fotos del formulario (A4, listo para imprimir). */
export async function generateFormularioFotosPDF(opts: FormularioFotosPdfOpts): Promise<void> {
  const photos = normalizeFormularioPhotos(opts);
  if (!photos.length) throw new Error("Sin fotos");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await appendFormularioFotosPages(doc, {
    photos,
    usuario: opts.usuario,
    startWithNewPage: false,
  });

  downloadJsPdf(doc, formularioPdfFilename(opts.razon_social ?? "formulario", "fotos"));
}
