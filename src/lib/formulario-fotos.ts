import type { SupabaseClient } from "@supabase/supabase-js";

/** Tamaño máximo por foto de verificación (500 KB). */
export const FORMULARIO_FOTO_MAX_BYTES = 500 * 1024;
export const FORMULARIO_FOTO_MAX_LABEL = "500 KB";

const FORMULARIO_FOTOS_BUCKET = "formulario-fotos";

export type FormularioFotoUploadSummary = {
  attempted: number;
  uploaded: number;
  failed: number;
};

/** Mensaje para avisar al usuario cuando fallan subidas tras guardar el formulario. */
export function formularioFotoUploadWarning(summary: FormularioFotoUploadSummary): string | null {
  if (summary.failed === 0 || summary.attempted === 0) return null;
  if (summary.uploaded === 0) {
    return `No se pudieron subir ${summary.failed} foto(s). Los datos de la verificación se guardaron sin fotografías.`;
  }
  return `Se guardó la verificación, pero ${summary.failed} de ${summary.attempted} foto(s) no se subieron.`;
}

const MAX_EDGE_PX = 1920;
/** Lado máximo al redimensionar cuando hace falta comprimir (px). */
const MIN_EDGE_PX = 640;
/** Calidad JPEG mínima al comprimir (25 %). */
const MIN_JPEG_QUALITY = 0.25;
const JPEG_QUALITY_STEP = 0.07;

function jpegQualitiesToTry(): number[] {
  const out: number[] = [];
  for (let q = 0.92; q > MIN_JPEG_QUALITY; q -= JPEG_QUALITY_STEP) out.push(q);
  out.push(MIN_JPEG_QUALITY);
  return out;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < FORMULARIO_FOTO_MAX_BYTES) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function assertImageFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se permiten archivos de imagen.");
  }
}

async function loadImageSource(
  file: File,
): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup?: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return {
        source: bmp,
        width: bmp.width,
        height: bmp.height,
        cleanup: () => bmp.close(),
      };
    } catch {
      /* continuar con Image */
    }
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo leer la imagen"));
      el.src = objectUrl;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (e) {
    URL.revokeObjectURL(objectUrl);
    throw e;
  }
}

function fitInside(w: number, h: number, maxEdge: number): { w: number; h: number } {
  const max = Math.max(w, h);
  if (max <= maxEdge) return { w, h };
  const r = maxEdge / max;
  return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen"))),
      "image/jpeg",
      quality,
    );
  });
}

function toJpegFile(blob: Blob, originalName: string): File {
  const base = originalName.replace(/\.[^.]+$/i, "") || "foto";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

/**
 * Devuelve un archivo listo para subir. Si supera el tope, lo comprime automáticamente.
 */
export async function prepareFormularioFotoFile(
  file: File,
): Promise<{ file: File; compressed: boolean }> {
  assertImageFile(file);
  if (file.size <= FORMULARIO_FOTO_MAX_BYTES) {
    return { file, compressed: false };
  }

  const originalSize = file.size;
  const { source, width, height, cleanup } = await loadImageSource(file);

  try {
    let bestUnder: Blob | null = null;
    let bestUnderSize = Infinity;

    for (let edge = MAX_EDGE_PX; edge >= MIN_EDGE_PX; edge = Math.round(edge * 0.82)) {
      const { w, h } = fitInside(width, height, edge);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo procesar la imagen");
      ctx.drawImage(source, 0, 0, w, h);

      for (const q of jpegQualitiesToTry()) {
        const blob = await canvasToJpegBlob(canvas, q);
        if (blob.size <= FORMULARIO_FOTO_MAX_BYTES && blob.size < bestUnderSize) {
          bestUnder = blob;
          bestUnderSize = blob.size;
        }
      }
      if (bestUnder) break;
    }

    if (!bestUnder) {
      throw new Error(
        `No se pudo comprimir la foto por debajo de ${FORMULARIO_FOTO_MAX_LABEL} (original: ${formatFileSize(originalSize)}). Use otra imagen.`,
      );
    }

    return { file: toJpegFile(bestUnder, file.name), compressed: true };
  } finally {
    cleanup?.();
  }
}

/** Validación rápida antes de subir (re-comprime si hiciera falta). */
export async function ensureFormularioFotoFile(file: File): Promise<File> {
  const { file: ready } = await prepareFormularioFotoFile(file);
  return ready;
}

/**
 * Sube fotos a Storage y registra filas en formulario_fotos.
 * No lanza: los fallos se devuelven en el resumen para no bloquear el guardado del formulario.
 */
export async function uploadFormularioFotos(
  supabase: SupabaseClient,
  formularioId: string,
  files: File[],
): Promise<FormularioFotoUploadSummary> {
  const summary: FormularioFotoUploadSummary = {
    attempted: files.length,
    uploaded: 0,
    failed: 0,
  };

  for (const raw of files) {
    try {
      const { file } = await prepareFormularioFotoFile(raw);
      const path = `${formularioId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(FORMULARIO_FOTOS_BUCKET).upload(path, file);
      if (upErr) {
        summary.failed += 1;
        continue;
      }
      const { error: dbErr } = await supabase
        .from("formulario_fotos")
        .insert({ formulario_id: formularioId, storage_path: path });
      if (dbErr) {
        await supabase.storage.from(FORMULARIO_FOTOS_BUCKET).remove([path]);
        summary.failed += 1;
        continue;
      }
      summary.uploaded += 1;
    } catch {
      summary.failed += 1;
    }
  }

  return summary;
}
