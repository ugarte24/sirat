import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildNotificacionQrPayload } from "@/lib/notificacion-qr";
import { notificacionConceptosMarcados } from "@/lib/sirat-forms";

const idSchema = z.object({
  id: z.string().uuid(),
});

/** Lectura pública de una notificación para el QR (solo campos del PDF). */
export const getNotificacionPublicaFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("notificaciones")
        .select(
          `
          id,
          created_at,
          fecha_limite,
          nombre_actividad,
          numero_identificacion,
          direccion,
          gestiones_adeudadas,
          padron_municipal,
          permiso_bebidas_alcoholicas,
          impuestos_patente,
          bienes_inmuebles,
          vehiculos,
          contribuyente:contribuyentes(nombre_completo, ci)
        `,
        )
        .eq("id", data.id)
        .maybeSingle();

      if (error || !row?.contribuyente) {
        if (error) console.error("[getNotificacionPublicaFn]", error.message);
        return { ok: false as const };
      }

      const contrib = row.contribuyente as { nombre_completo: string; ci: string };
      const conceptos = notificacionConceptosMarcados(row);

      return {
        ok: true as const,
        payload: buildNotificacionQrPayload({
          id: row.id,
          created_at: row.created_at,
          fecha_limite: row.fecha_limite,
          contribuyente_nombre: contrib.nombre_completo,
          contribuyente_ci: contrib.ci,
          nombre_actividad: row.nombre_actividad,
          numero_identificacion: row.numero_identificacion,
          direccion: row.direccion,
          conceptos,
          gestiones_adeudadas: row.gestiones_adeudadas,
        }),
      };
    } catch (e) {
      console.error("[getNotificacionPublicaFn]", e);
      return { ok: false as const };
    }
  });
