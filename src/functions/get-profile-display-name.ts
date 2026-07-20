import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const inputSchema = z.object({
  accessToken: z.string().min(20),
  userId: z.string().uuid(),
});

/**
 * Devuelve `full_name` de un perfil para usuarios autenticados (operador o admin).
 * Evita el RLS de profiles (solo self/admin) al generar el PDF del formulario.
 */
export const getProfileDisplayNameFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { serverSupabasePublishableKey, serverSupabaseUrl } = await import(
      "@/integrations/supabase/server-env"
    );
    const url = serverSupabaseUrl();
    const anon = serverSupabasePublishableKey();
    if (!url || !anon) {
      return { fullName: null as string | null };
    }

    const userClient = createClient<Database>(url, anon, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(data.accessToken);
    if (userErr || !userData.user) {
      return { fullName: null as string | null };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", data.userId)
      .maybeSingle();

    return { fullName: perfil?.full_name?.trim() || null };
  });
