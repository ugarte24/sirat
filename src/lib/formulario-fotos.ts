/** Tamaño máximo por foto de verificación (1 MB). */
export const FORMULARIO_FOTO_MAX_BYTES = 1 * 1024 * 1024;

const MAX_EDGE_PX = 1920;
const MIN_EDGE_PX = 720;
const MIN_JPEG_QUALITY = 0.32;

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
 * Devuelve un archivo listo para subir. Si supera 1 MB, lo comprime automáticamente.
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

      for (let q = 0.92; q >= MIN_JPEG_QUALITY; q -= 0.07) {
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
        `No se pudo comprimir la foto por debajo de 1 MB (original: ${formatFileSize(originalSize)}). Use otra imagen.`,
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
