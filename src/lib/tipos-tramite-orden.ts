import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;

export async function fetchNextTipoTramiteOrden(supabase: Db): Promise<number> {
  const { data, error } = await supabase
    .from("tipos_tramite")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.orden ?? 0) + 1;
}

export async function moveTipoTramiteOrden(
  supabase: Db,
  id: string,
  direction: "up" | "down",
): Promise<"moved" | "edge"> {
  const { data: current, error: curErr } = await supabase
    .from("tipos_tramite")
    .select("id, orden")
    .eq("id", id)
    .maybeSingle();
  if (curErr) throw new Error(curErr.message);
  if (!current) throw new Error("Tipo de trámite no encontrado");

  const neighborRes =
    direction === "up"
      ? await supabase
          .from("tipos_tramite")
          .select("id, orden")
          .lt("orden", current.orden)
          .order("orden", { ascending: false })
          .limit(1)
      : await supabase
          .from("tipos_tramite")
          .select("id, orden")
          .gt("orden", current.orden)
          .order("orden", { ascending: true })
          .limit(1);

  if (neighborRes.error) throw new Error(neighborRes.error.message);
  const neighbor = neighborRes.data?.[0];
  if (!neighbor) return "edge";

  // Intercambio secuencial: el UNIQUE(orden) falla si se actualizan ambas filas a la vez.
  const tempOrden = -current.orden;
  const { error: e1 } = await supabase
    .from("tipos_tramite")
    .update({ orden: tempOrden })
    .eq("id", current.id);
  if (e1) throw new Error(e1.message);

  const { error: e2 } = await supabase
    .from("tipos_tramite")
    .update({ orden: current.orden })
    .eq("id", neighbor.id);
  if (e2) throw new Error(e2.message);

  const { error: e3 } = await supabase
    .from("tipos_tramite")
    .update({ orden: neighbor.orden })
    .eq("id", current.id);
  if (e3) throw new Error(e3.message);

  return "moved";
}
