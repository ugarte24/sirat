import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

export async function auditoriaInsert(
  admin: SupabaseClient<Database>,
  row: {
    user_id: string | null;
    accion: string;
    entidad: string;
    entidad_id?: string | null;
    detalle?: Json | null;
  },
): Promise<void> {
  const { error } = await admin.from("auditoria").insert({
    user_id: row.user_id,
    accion: row.accion,
    entidad: row.entidad,
    entidad_id: row.entidad_id ?? null,
    detalle: row.detalle ?? null,
  });
  if (error) console.error("[auditoria]", error.message);
}
