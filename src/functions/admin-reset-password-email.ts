import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
const inputSchema = z.object({
  accessToken: z.string().min(20),
  targetEmail: z.string().trim().email(),
  redirectTo: z.string().url(),
});

/**
 * Solo administradores. Envía al correo del usuario el enlace de recuperación de Supabase Auth
 * (flujo estándar; la “contraseña temporal” efectiva es establecer una nueva vía ese enlace).
 */
export const adminResetPasswordEmailFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anon) {
      throw new Error("Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY en el servidor.");
    }

    const userClient = createClient<Database>(url, anon, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(data.accessToken);
    if (userErr || !userData.user) {
      throw new Error("Sesión inválida o expirada. Vuelve a iniciar sesión.");
    }

    const { data: isAdmin, error: roleErr } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr || !isAdmin) {
      throw new Error("Solo un administrador puede solicitar el restablecimiento de contraseña.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.targetEmail.trim(), {
      redirectTo: data.redirectTo,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true as const };
  });
