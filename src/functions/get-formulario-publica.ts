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
          contribuyente:contribuyentes(nombre_completo, ci),
          tipo_tramite:tipos_tramite(nombre)
        `,
        )
        .eq("id", data.id)
        .maybeSingle();

      if (error || !row) {
        if (error) console.error("[getFormularioPublicaFn]", error.message);
        return { ok: false as const };
      }

      const { data: ambientes } = await supabaseAdmin
        .from("formulario_ambientes")
        .select("orden, ambiente, largo, ancho")
        .eq("formulario_id", data.id)
        .order("orden", { ascending: true });

      const contribRaw = row.contribuyente;
      const contrib = (Array.isArray(contribRaw) ? contribRaw[0] : contribRaw) as
        | { nombre_completo: string; ci: string }
        | null
        | undefined;

      const tipoRaw = row.tipo_tramite;
      const tipo = (Array.isArray(tipoRaw) ? tipoRaw[0] : tipoRaw) as
        | { nombre: string }
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
          tipo_tramite_nombre: tipo?.nombre,
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
          ambientes:
            ambientes?.map((a) => ({
              orden: a.orden,
              ambiente: a.ambiente,
              largo: Number(a.largo),
              ancho: Number(a.ancho),
            })) ?? [],
        }),
      };
    } catch (e) {
      console.error("[getFormularioPublicaFn]", e);
      return { ok: false as const };
    }
  });
