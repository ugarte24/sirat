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
  /** URLs firmadas de fotos de verificación (se añaden en página(s) siguientes). */
  imageUrls?: string[];
  /** Blobs descargados vía Supabase (evita CORS al rasterizar). Mismo orden que imageUrls. */
  imageBlobs?: (Blob | undefined)[];
  /** Nombre del usuario que genera el PDF (barra superior). */
  usuario?: string;
  /** Contenedor del MapPicker visible (captura idéntica a la vista de registro). */
  mapCaptureElement?: HTMLElement | null;
}

type PdfImageAsset = { dataUrl: string; w: number; h: number; format: "JPEG" | "PNG" };

async function rasterizeImageElement(img: HTMLImageElement): Promise<PdfImageAsset> {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return { dataUrl, w: canvas.width, h: canvas.height, format: "JPEG" };
}

async function loadPhotoFromBlob(blob: Blob): Promise<PdfImageAsset> {
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
      return {
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        w: canvas.width,
        h: canvas.height,
        format: "JPEG",
      };
    } catch {
      /* object URL + Image */
    }
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = objectUrl;
    });
    return rasterizeImageElement(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadPhotoForPdf(url: string, blob?: Blob): Promise<PdfImageAsset> {
  if (blob) return loadPhotoFromBlob(blob);
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
        return {
          dataUrl: canvas.toDataURL("image/jpeg", 0.92),
          w: canvas.width,
          h: canvas.height,
          format: "JPEG",
        };
      } catch {
        /* Image + object URL */
      }
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("decode"));
        el.src = objectUrl;
      });
      return await rasterizeImageElement(img);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo cargar la foto"));
      el.src = url;
    });
    return rasterizeImageElement(img);
  }
}

async function imageUrlToJpegDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number }> {
  const asset = await loadPhotoForPdf(url);
  return { dataUrl: asset.dataUrl, w: asset.w, h: asset.h };
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

/** Añade una hoja con todas las fotos (debe llamarse con la página 2 ya activa si aplica). */
async function appendFormularioFotosPages(
  doc: jsPDF,
  opts: {
    imageUrls: string[];
    imageBlobs?: (Blob | undefined)[];
    usuario?: string;
    startWithNewPage?: boolean;
  },
): Promise<number> {
  const urls = opts.imageUrls.filter(Boolean);
  if (!urls.length) return 0;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const maxW = pageW - 2 * margin;
  const gap = 5;

  if (opts.startWithNewPage !== false) doc.addPage();
  const startY = drawFormularioFotosPageStart(doc, opts.usuario);

  const images: PdfImageAsset[] = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      images.push(await loadPhotoForPdf(urls[i], opts.imageBlobs?.[i]));
    } catch (e) {
      console.warn("Foto omitida en PDF:", urls[i], e);
    }
  }
  if (!images.length) {
    throw new Error("No se pudieron cargar las fotos para el PDF");
  }

  const n = images.length;
  const cols = n <= 1 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  const availableH = Math.max(40, pageH - margin - startY);
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
    doc.addImage(img.dataUrl, img.format, x, y, dispW, dispH);
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

  const urls = d.imageUrls?.filter(Boolean) ?? [];
  let fotosIncluidas = 0;
  if (urls.length) {
    try {
      fotosIncluidas = await appendFormularioFotosPages(doc, {
        imageUrls: urls,
        imageBlobs: d.imageBlobs,
        usuario: d.usuario,
        startWithNewPage: true,
      });
    } catch (e) {
      console.warn("Fotos no incluidas en PDF:", e);
    }
  }

  downloadJsPdf(doc, formularioPdfFilename(d.razon_social));
  return { fotosIncluidas, fotosSolicitadas: urls.length };
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
  /** URLs firmadas o públicas de las imágenes */
  imageUrls: string[];
  imageBlobs?: (Blob | undefined)[];
}

/** PDF solo con las fotos del formulario (A4, listo para imprimir). */
export async function generateFormularioFotosPDF(opts: FormularioFotosPdfOpts): Promise<void> {
  const urls = opts.imageUrls.filter(Boolean);
  if (!urls.length) throw new Error("Sin fotos");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await appendFormularioFotosPages(doc, {
    imageUrls: urls,
    imageBlobs: opts.imageBlobs,
    usuario: opts.usuario,
    startWithNewPage: false,
  });

  downloadJsPdf(doc, formularioPdfFilename(opts.razon_social ?? "formulario", "fotos"));
}
