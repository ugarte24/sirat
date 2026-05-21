import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FORMULARIO_FOTO_MAX_BYTES,
  FORMULARIO_FOTO_MAX_LABEL,
  prepareFormularioFotoFile,
} from "@/lib/formulario-fotos";

export const FORMULARIO_BAJA_FOTOS_BUCKET = "formulario-baja-fotos";
export const FORMULARIO_BAJA_PDF_BUCKET = "formulario-baja-pdf";
export const FORMULARIO_BAJA_FOTOS_MAX = 2;

export { FORMULARIO_FOTO_MAX_BYTES, FORMULARIO_FOTO_MAX_LABEL };

export async function prepareFormularioBajaFotoFile(file: File) {
  return prepareFormularioFotoFile(file);
}

export async function downloadFormularioBajaFoto(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(FORMULARIO_BAJA_FOTOS_BUCKET).download(storagePath);
  if (error || !data) return null;
  return data;
}
