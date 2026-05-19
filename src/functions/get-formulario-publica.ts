import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildFormularioQrPayload } from "@/lib/formulario-qr";

const formularioIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const idSchema = z.object({
  id: formularioIdSchema,
});

/** Lectura pública de un formulario para el QR (solo campos del PDF). */
export const getFormularioPublicaFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("formularios")
        .select(
          `
          id,
          fecha,
          razon_social,
          nit,
          zona,
          superficie,
          direccion,
          celular,
          referencia,
          latitud,
          longitud,
          mapa_zoom,
          procedente,
          padron,
          bebidas_alcoholicas,
          observacion,
          estado,
          contribuyente:contribuyentes(nombre_completo, ci)
        `,
        )
        .eq("id", data.id)
        .maybeSingle();

      if (error || !row) {
        if (error) console.error("[getFormularioPublicaFn]", error.message);
        return { ok: false as const };
      }

      const contribRaw = row.contribuyente;
      const contrib = (Array.isArray(contribRaw) ? contribRaw[0] : contribRaw) as
        | { nombre_completo: string; ci: string }
        | null
        | undefined;

      return {
        ok: true as const,
        payload: buildFormularioQrPayload({
          id: row.id,
          fecha: row.fecha,
          razon_social: row.razon_social,
          contribuyente_nombre: contrib?.nombre_completo ?? "—",
          contribuyente_ci: contrib?.ci ?? "—",
          nit: row.nit,
          zona: row.zona,
          superficie: row.superficie,
          direccion: row.direccion,
          celular: row.celular,
          referencia: row.referencia,
          latitud: row.latitud,
          longitud: row.longitud,
          mapa_zoom: row.mapa_zoom,
          procedente: row.procedente,
          padron: row.padron,
          bebidas_alcoholicas: row.bebidas_alcoholicas,
          observacion: row.observacion,
          estado: row.estado,
        }),
      };
    } catch (e) {
      console.error("[getFormularioPublicaFn]", e);
      return { ok: false as const };
    }
  });
