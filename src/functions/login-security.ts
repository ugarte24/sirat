import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { auditoriaInsert } from "@/lib/server-audit";

const emailSchema = z.object({
  email: z.string().trim().email(),
});

const outcomeSchema = z.object({
  email: z.string().trim().email(),
  success: z.boolean(),
});

const MAX_INTENTOS = 5;

/** Sin service role el servidor no puede leer perfiles ignorando RLS: el login sigue funcionando sin contador/auditoría. */
function hasSupabaseServiceEnv(): boolean {
  return !!(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** Comprueba perfil antes de intentar auth (cuenta activa, bloqueo admin, intentos fallidos). */
export const checkLoginAllowedFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailSchema.parse(data))
  .handler(async ({ data }) => {
    if (!hasSupabaseServiceEnv()) {
      return { allowed: true as const, skipped: true as const };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const normalized = data.email.trim().toLowerCase();

      const { data: prof, error } = await supabaseAdmin
        .from("profiles")
        .select("id, activo, bloqueado, intentos_fallidos")
        .ilike("email", normalized)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[checkLoginAllowedFn]", error.message);
        return { allowed: true as const, skipped: true as const };
      }

      if (!prof) {
        return { allowed: true as const };
      }
      if (!prof.activo) {
        return { allowed: false as const, code: "inactive" as const };
      }
      if (prof.bloqueado) {
        return { allowed: false as const, code: "blocked" as const };
      }
      if ((prof.intentos_fallidos ?? 0) >= MAX_INTENTOS) {
        return { allowed: false as const, code: "too_many_attempts" as const };
      }
      return { allowed: true as const };
    } catch (e) {
      console.error("[checkLoginAllowedFn]", e);
      return { allowed: true as const, skipped: true as const };
    }
  });

/** Tras intento de login: contador de fallos, auditoría y reinicio en éxito. */
export const recordLoginOutcomeFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => outcomeSchema.parse(data))
  .handler(async ({ data }) => {
    if (!hasSupabaseServiceEnv()) {
      return { ok: true as const, skipped: true as const };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const normalized = data.email.trim().toLowerCase();

      const { data: prof, error } = await supabaseAdmin
        .from("profiles")
        .select("id, intentos_fallidos")
        .ilike("email", normalized)
        .limit(1)
        .maybeSingle();

      if (error || !prof) {
        return { ok: true as const };
      }

      if (data.success) {
        await supabaseAdmin.from("profiles").update({ intentos_fallidos: 0 }).eq("id", prof.id);
        await auditoriaInsert(supabaseAdmin, {
          user_id: prof.id,
          accion: "login_exitoso",
          entidad: "auth",
          entidad_id: prof.id,
          detalle: { email: data.email.trim() },
        });
        return { ok: true as const };
      }

      const next = (prof.intentos_fallidos ?? 0) + 1;
      await supabaseAdmin.from("profiles").update({ intentos_fallidos: next }).eq("id", prof.id);

      await auditoriaInsert(supabaseAdmin, {
        user_id: prof.id,
        accion: "login_fallido",
        entidad: "auth",
        entidad_id: prof.id,
        detalle: { email: data.email.trim(), intentos_fallidos: next },
      });

      return { ok: true as const, intentosFallidos: next };
    } catch (e) {
      console.error("[recordLoginOutcomeFn]", e);
      return { ok: true as const, skipped: true as const };
    }
  });
