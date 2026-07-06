import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type FormularioVisitaResultado =
  Database["public"]["Enums"]["formulario_visita_resultado"];

export type FormularioVisitaRow = {
  id: string;
  formulario_id: string;
  fecha_visita: string;
  resultado: FormularioVisitaResultado;
  observacion: string | null;
  created_by: string | null;
  created_at: string;
  operador?: { full_name: string | null } | null;
};

export const FORMULARIO_VISITA_RESULTADO_OPCIONES: {
  value: FormularioVisitaResultado;
  label: string;
}[] = [
  { value: "cerrada", label: "Local cerrado" },
  { value: "sin_titular", label: "Sin titular / no atendió" },
  { value: "acceso_denegado", label: "Acceso denegado" },
  { value: "direccion_no_coincide", label: "Dirección no coincide" },
  { value: "horario_fuera", label: "Fuera de horario" },
  { value: "otro", label: "Otro motivo" },
];

export function formularioVisitaResultadoLabel(resultado: FormularioVisitaResultado): string {
  return FORMULARIO_VISITA_RESULTADO_OPCIONES.find((o) => o.value === resultado)?.label ?? resultado;
}

export async function fetchFormularioVisitas(
  supabase: SupabaseClient,
  formularioId: string,
): Promise<FormularioVisitaRow[]> {
  const { data, error } = await supabase
    .from("formulario_visita_verificacion")
    .select("*, operador:profiles(full_name)")
    .eq("formulario_id", formularioId)
    .order("fecha_visita", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as FormularioVisitaRow[];
}

export function validateFormularioVisitaInput(opts: {
  resultado: FormularioVisitaResultado | "";
  fechaVisita: string;
  observacion: string;
}): string | null {
  if (!opts.fechaVisita.trim()) return "Indique la fecha de la visita";
  if (!opts.resultado) return "Seleccione el motivo de la visita";
  if (opts.resultado === "otro" && !opts.observacion.trim()) {
    return "Describa el motivo cuando selecciona «Otro»";
  }
  return null;
}

export async function registrarFormularioVisita(opts: {
  supabase: SupabaseClient;
  formularioId: string;
  fechaVisita: string;
  resultado: FormularioVisitaResultado;
  observacion?: string;
  userId?: string | null;
}): Promise<FormularioVisitaRow> {
  const { supabase, formularioId, fechaVisita, resultado, observacion, userId } = opts;

  const validation = validateFormularioVisitaInput({
    resultado,
    fechaVisita,
    observacion: observacion ?? "",
  });
  if (validation) throw new Error(validation);

  const { data: form, error: formErr } = await supabase
    .from("formularios")
    .select("estado")
    .eq("id", formularioId)
    .maybeSingle();

  if (formErr) throw new Error(formErr.message);
  if (!form) throw new Error("Formulario no encontrado");
  if (form.estado !== "pendiente_verificacion") {
    throw new Error("Solo puede registrar visitas en formularios pendientes de verificación");
  }

  const { data: row, error: insErr } = await supabase
    .from("formulario_visita_verificacion")
    .insert({
      formulario_id: formularioId,
      fecha_visita: fechaVisita.trim(),
      resultado,
      observacion: observacion?.trim() || null,
      created_by: userId ?? null,
    })
    .select("*, operador:profiles(full_name)")
    .single();

  if (insErr) throw new Error(insErr.message);

  return row as FormularioVisitaRow;
}
