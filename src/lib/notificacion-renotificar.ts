import { supabase } from "@/integrations/supabase/client";
import { appendObservacionSeguimiento } from "@/lib/sirat-forms";

export type NotificacionHistorialRow = {
  numero: number;
  fecha_limite: string;
  created_at: string;
  observacion: string | null;
};

export function notificacionNumeroLabel(veces: number): string {
  if (veces <= 1) return "1.ª notificación";
  return `${veces}.ª notificación`;
}

export async function registrarRenotificacion(opts: {
  notificacionId: string;
  nuevaFechaLimite: string;
  observacion?: string;
  userId?: string | null;
}): Promise<void> {
  const { notificacionId, nuevaFechaLimite, observacion, userId } = opts;
  const fecha = nuevaFechaLimite.trim();
  if (!fecha) throw new Error("Indique la fecha límite");

  const { data: row, error: fetchErr } = await supabase
    .from("notificaciones")
    .select("estado, veces_notificado, observacion_seguimiento")
    .eq("id", notificacionId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Notificación no encontrada");
  if (row.estado !== "pendiente") {
    throw new Error("Solo puede renotificar una notificación en estado pendiente");
  }

  const veces = row.veces_notificado ?? 1;
  const siguiente = veces + 1;

  const { error: histErr } = await supabase.from("notificacion_historial").insert({
    notificacion_id: notificacionId,
    numero: siguiente,
    fecha_limite: fecha,
    observacion: observacion?.trim() || null,
    created_by: userId ?? null,
  });

  if (histErr) throw new Error(histErr.message);

  let observacion_seguimiento = row.observacion_seguimiento;
  if (observacion?.trim()) {
    observacion_seguimiento = appendObservacionSeguimiento(
      observacion_seguimiento,
      "RENOTIFICADO",
      observacion,
    );
  }

  const { error: updErr } = await supabase
    .from("notificaciones")
    .update({
      fecha_limite: fecha,
      veces_notificado: siguiente,
      observacion_seguimiento,
    })
    .eq("id", notificacionId)
    .eq("estado", "pendiente");

  if (updErr) throw new Error(updErr.message);
}
