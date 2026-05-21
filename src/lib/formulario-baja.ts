import type { SupabaseClient } from "@supabase/supabase-js";
import { toIsoDateLocal } from "@/lib/date";
import { downloadBlob } from "@/lib/download-file";
import {
  FORMULARIO_BAJA_FOTOS_BUCKET,
  FORMULARIO_BAJA_PDF_BUCKET,
  prepareFormularioBajaFotoFile,
} from "@/lib/formulario-baja-fotos";
import { buildFormularioBajaPdfBlob, type FormularioBajaPdfData } from "@/lib/pdf";
import { appendObservacionCambioEstado, type FormularioEstadoAccion } from "@/lib/sirat-forms";

export { FORMULARIO_BAJA_FOTOS_BUCKET, FORMULARIO_BAJA_PDF_BUCKET } from "@/lib/formulario-baja-fotos";

export type EjecutarFormularioBajaInput = {
  formularioId: string;
  observacionNueva: string;
  fotoFiles: File[];
  mapCaptureElement?: HTMLElement | null;
  usuario?: string;
  /** Datos del formulario activo (sin estado baja aún). */
  pdfBase: Omit<FormularioBajaPdfData, "fecha_baja" | "observacion_baja" | "photos" | "usuario" | "mapCaptureElement">;
  observacionActual?: string | null;
};

export type EjecutarFormularioBajaResult = {
  observacion: string;
  baja_at: string;
  baja_pdf_path: string;
  fotosSubidas: number;
};

function bajaPdfStoragePath(formularioId: string): string {
  return `${formularioId}/baja.pdf`;
}

export async function downloadFormularioBajaPdf(
  supabase: SupabaseClient,
  storagePath: string,
  filename: string,
): Promise<void> {
  const { data, error } = await supabase.storage.from(FORMULARIO_BAJA_PDF_BUCKET).download(storagePath);
  if (error || !data) throw new Error(error?.message ?? "No se pudo descargar el PDF de baja.");
  downloadBlob(data, filename);
}

export async function uploadFormularioBajaFotos(
  supabase: SupabaseClient,
  formularioId: string,
  files: File[],
): Promise<{ uploaded: number; failed: number; paths: string[] }> {
  const paths: string[] = [];
  let uploaded = 0;
  let failed = 0;

  for (const raw of files) {
    try {
      const { file } = await prepareFormularioBajaFotoFile(raw);
      const path = `${formularioId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(FORMULARIO_BAJA_FOTOS_BUCKET).upload(path, file);
      if (upErr) {
        failed += 1;
        continue;
      }
      const { error: dbErr } = await supabase
        .from("formulario_baja_fotos")
        .insert({ formulario_id: formularioId, storage_path: path });
      if (dbErr) {
        await supabase.storage.from(FORMULARIO_BAJA_FOTOS_BUCKET).remove([path]);
        failed += 1;
        continue;
      }
      paths.push(path);
      uploaded += 1;
    } catch {
      failed += 1;
    }
  }

  return { uploaded, failed, paths };
}

/**
 * Registra baja: fotos opcionales, PDF almacenado (sin descarga automática), estado y observación.
 */
export async function ejecutarFormularioBaja(
  supabase: SupabaseClient,
  input: EjecutarFormularioBajaInput,
): Promise<EjecutarFormularioBajaResult> {
  const accion: FormularioEstadoAccion = "baja";
  const observacionLinea = appendObservacionCambioEstado(null, accion, input.observacionNueva);
  const observacion = appendObservacionCambioEstado(
    input.observacionActual,
    accion,
    input.observacionNueva,
  );
  const fechaBaja = toIsoDateLocal(new Date());
  const bajaAt = new Date().toISOString();

  const preparedFiles: File[] = [];
  for (const raw of input.fotoFiles) {
    const { file } = await prepareFormularioBajaFotoFile(raw);
    preparedFiles.push(file);
  }

  const { uploaded, failed, paths } = await uploadFormularioBajaFotos(
    supabase,
    input.formularioId,
    preparedFiles,
  );
  if (input.fotoFiles.length > 0 && uploaded === 0) {
    throw new Error("No se pudieron subir las fotos de baja. Intente de nuevo.");
  }
  if (failed > 0 && uploaded > 0) {
    /* continuar con las que sí subieron */
  }

  const { blob: pdfBlob } = await buildFormularioBajaPdfBlob({
    ...input.pdfBase,
    fecha_baja: fechaBaja,
    observacion_baja: observacionLinea,
    photos: preparedFiles.map((file) => ({ blob: file })),
    usuario: input.usuario,
    mapCaptureElement: input.mapCaptureElement,
  });

  const pdfPath = bajaPdfStoragePath(input.formularioId);
  const { error: pdfUpErr } = await supabase.storage
    .from(FORMULARIO_BAJA_PDF_BUCKET)
    .upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });
  if (pdfUpErr) throw new Error(pdfUpErr.message);

  const { error: updErr } = await supabase
    .from("formularios")
    .update({
      estado: "baja",
      observacion,
      baja_at: bajaAt,
      baja_pdf_path: pdfPath,
    })
    .eq("id", input.formularioId);
  if (updErr) throw new Error(updErr.message);

  return {
    observacion,
    baja_at: bajaAt,
    baja_pdf_path: pdfPath,
    fotosSubidas: paths.length,
  };
}
