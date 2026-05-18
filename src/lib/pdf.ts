import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateEsBo } from "@/lib/date";
import { downloadJsPdf } from "@/lib/download-file";
import {
  drawFormularioDatosSection,
  drawFormularioFotosPageStart,
  drawFormularioInfoSection,
  drawFormularioPdfFooter,
  drawFormularioPdfHeader,
  drawFormularioPdfSignatures,
  drawFormularioUbicacionSection,
} from "@/lib/pdf-formulario-layout";
import { supabase } from "@/integrations/supabase/client";
import {
  blobToFormularioPdfImage,
  downloadFormularioFoto,
  type FormularioFotoPdfAsset,
} from "@/lib/formulario-fotos";
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
const PDF_TABLE_THEME = {
  theme: "grid" as const,
  styles: { fontSize: 9, cellPadding: 2 },
  headStyles: { fillColor: [PDF_PRIMARY.r, PDF_PRIMARY.g, PDF_PRIMARY.b] as [number, number, number] },
};


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

export async function generateFormularioPDF(
  d: FormularioData,
): Promise<{ fotosIncluidas: number; fotosSolicitadas: number }> {
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
  drawFormularioPdfFooter(doc, y, 1);

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

  downloadJsPdf(doc, formularioPdfFilename(d.razon_social));
  return { fotosIncluidas, fotosSolicitadas: photoSources.length };
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

export async function generateNotificacionPDF(d: NotificacionData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = drawSiratPdfTopBar(doc) + 8;

  doc.setTextColor(C.text.r, C.text.g, C.text.b);
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text(SIRAT_TAGLINE, w / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text(NOTIFICACION_TRIBUTARIA_PDF_TITULO, w / 2, y + 4, { align: "center" });

  autoTable(doc, {
    startY: y + 10,
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
