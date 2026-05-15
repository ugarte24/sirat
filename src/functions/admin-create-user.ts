import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
const inputSchema = z.object({
  accessToken: z.string().min(20),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).max(200),
  role: z.enum(["operador", "admin"]),
});

export const adminCreateUserFn = createServerFn({ method: "POST" })
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
      throw new Error("Solo un administrador puede registrar usuarios nuevos.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName.trim() },
    });

    if (createErr) {
      throw new Error(createErr.message);
    }

    const newId = created.user?.id;
    if (!newId) {
      throw new Error("No se obtuvo el id del usuario creado.");
    }

    if (data.role === "admin") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newId, role: "admin" });
      if (insErr) {
        throw new Error(`Usuario creado pero no se pudo asignar rol admin: ${insErr.message}`);
      }
    }

    return { ok: true as const, userId: newId };
  });
