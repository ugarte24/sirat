import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateEsBo } from "@/lib/date";
import { FORMULARIO_VERIFICACION_PDF_TITULO } from "@/lib/sirat-brand";

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
}

export function generateFormularioPDF(d: FormularioData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  // Header
  doc.setFillColor(45, 55, 120);
  doc.rect(0, 0, w, 28, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text("SIRAT", 14, 14);
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text("Sistema Integrado de Registro y Administración Tributaria", 14, 21);

  doc.setTextColor(0);
  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text(FORMULARIO_VERIFICACION_PDF_TITULO, w / 2, 38, { align: "center" });

  autoTable(doc, {
    startY: 44,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [45, 55, 120] },
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
  const sigW = (w - 28) / 3;
  ["Inspector Tributario", "Contribuyente", "Asesor Legal"].forEach((label, i) => {
    const x = 14 + i * sigW;
    doc.line(x + 5, finalY + 18, x + sigW - 5, finalY + 18);
    doc.setFontSize(8).text(label, x + sigW / 2, finalY + 24, { align: "center" });
  });

  const slug = d.razon_social.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "formulario";
  doc.save(`verificacion-${slug}.pdf`);
}

interface NotificacionData {
  fecha: string;
  nombre_actividad: string | null;
  numero_identificacion: string | null;
  ci: string;
  direccion: string;
  fecha_limite: string;
  conceptos: string[];
  estado: string;
  gestiones_adeudadas: string | null;
}

export function generateNotificacionPDF(d: NotificacionData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(45, 55, 120);
  doc.rect(0, 0, w, 28, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text("SIRAT", 14, 14);
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text("Notificación tributaria", 14, 21);

  doc.setTextColor(0);
  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text("NOTIFICACIÓN TRIBUTARIA", w / 2, 40, { align: "center" });

  autoTable(doc, {
    startY: 46,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [45, 55, 120] },
    body: [
      ["Fecha emisión", formatDateEsBo(d.fecha), "Estado", d.estado.toUpperCase()],
      ["Nombre de la actividad", d.nombre_actividad?.trim() || "—", "Licencia / placa / inmueble", d.numero_identificacion?.trim() || "—"],
      ["C.I. contribuyente", d.ci, "Dirección", d.direccion],
      ["Fecha límite", formatDateEsBo(d.fecha_limite), "", ""],
      ["Gestiones que adeuda", d.gestiones_adeudadas?.trim() || "—", "", ""],
      ["Conceptos", d.conceptos.join(", ") || "—", "", ""],
    ],
  });

  const y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(10).setFont("helvetica", "normal");
  const text =
    "Por la presente se le notifica formalmente para que cumpla con sus obligaciones tributarias " +
    "antes de la fecha límite indicada. El incumplimiento dará lugar a las sanciones previstas por ley.";
  const lines = doc.splitTextToSize(text, w - 28);
  doc.text(lines, 14, y);

  const finalY = y + lines.length * 5 + 25;
  const sigW = (w - 28) / 2;
  ["Inspector Tributario", "Notificado / Contribuyente"].forEach((label, i) => {
    const x = 14 + i * sigW;
    doc.line(x + 10, finalY + 18, x + sigW - 10, finalY + 18);
    doc.setFontSize(9).text(label, x + sigW / 2, finalY + 24, { align: "center" });
  });

  const slug = (d.nombre_actividad?.trim() || d.ci)
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "notificacion";
  doc.save(`notificacion-${slug}.pdf`);
}

export interface FormularioFotosPdfOpts {
  razon_social?: string;
  /** URLs firmadas o públicas de las imágenes */
  imageUrls: string[];
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

/** PDF solo con las fotos del formulario (A4, listo para imprimir). */
export async function generateFormularioFotosPDF(opts: FormularioFotosPdfOpts): Promise<void> {
  const urls = opts.imageUrls.filter(Boolean);
  if (!urls.length) throw new Error("Sin fotos");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const headerH = opts.razon_social ? 26 : 18;
  const maxW = pageW - 2 * margin;

  const drawHeader = () => {
    doc.setFillColor(45, 55, 120);
    doc.rect(0, 0, pageW, headerH, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("SIRAT — Fotos de la verificación", margin, 9);
    if (opts.razon_social) {
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(opts.razon_social, pageW - 2 * margin);
      doc.text(lines, margin, 15);
    }
    doc.setTextColor(0);
  };

  drawHeader();
  let y = headerH + 4;
  const captionGap = 6;

  for (let i = 0; i < urls.length; i++) {
    const { dataUrl, w: iw, h: ih } = await imageUrlToJpegDataUrl(urls[i]);
    const aspect = iw / ih;

    let room = pageH - margin - y - captionGap;
    if (room < 22) {
      doc.addPage();
      drawHeader();
      y = headerH + 4;
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

  const slug = (opts.razon_social ?? "formulario")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "formulario";
  doc.save(`verificacion-${slug}-fotos.pdf`);
}
