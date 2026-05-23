import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { FormularioAmbienteRow } from "@/lib/sirat-forms";
import type { FormularioAmbientePdfRow } from "@/lib/pdf-formulario-layout";

export type FormularioAmbienteRecord = Database["public"]["Tables"]["formulario_ambientes"]["Row"];

export async function fetchFormularioAmbientes(
  supabase: SupabaseClient,
  formularioId: string,
): Promise<FormularioAmbienteRecord[]> {
  const { data, error } = await supabase
    .from("formulario_ambientes")
    .select("*")
    .eq("formulario_id", formularioId)
    .order("orden", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function replaceFormularioAmbientes(
  supabase: SupabaseClient,
  formularioId: string,
  rows: Array<{ ambiente: string; largo: number; ancho: number }>,
): Promise<void> {
  const { error: delErr } = await supabase
    .from("formulario_ambientes")
    .delete()
    .eq("formulario_id", formularioId);
  if (delErr) throw new Error(delErr.message);

  if (!rows.length) return;

  const { error: insErr } = await supabase.from("formulario_ambientes").insert(
    rows.map((row, i) => ({
      formulario_id: formularioId,
      orden: i + 1,
      ambiente: row.ambiente,
      largo: row.largo,
      ancho: row.ancho,
    })),
  );
  if (insErr) throw new Error(insErr.message);
}

export function ambienteRecordsToUiRows(records: FormularioAmbienteRecord[]): FormularioAmbienteRow[] {
  return records.map((r) => ({
    id: r.id,
    ambiente: r.ambiente,
    largo: String(r.largo),
    ancho: String(r.ancho),
  }));
}

export function ambienteRecordsToPdfRows(records: FormularioAmbienteRecord[]): FormularioAmbientePdfRow[] {
  return records.map((r) => ({
    orden: r.orden,
    ambiente: r.ambiente,
    largo: Number(r.largo),
    ancho: Number(r.ancho),
    superficieM2: Math.round(Number(r.largo) * Number(r.ancho) * 100) / 100,
  }));
}
