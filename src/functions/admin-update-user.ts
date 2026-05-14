import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { auditoriaInsert } from "@/lib/server-audit";

const inputSchema = z.object({
  accessToken: z.string().min(20),
  userId: z.string().uuid(),
  fullName: z.string().min(2).max(200),
  email: z.string().email(),
  ci: z.string().max(50).optional(),
  activo: z.boolean(),
  bloqueado: z.boolean(),
  role: z.enum(["operador", "admin"]),
  intentosFallidos: z.number().int().min(0).max(999).optional(),
});

export const adminUpdateUserFn = createServerFn({ method: "POST" })
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

    const adminId = userData.user.id;

    const { data: isAdmin, error: roleErr } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr || !isAdmin) {
      throw new Error("Solo un administrador puede editar usuarios.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.userId === adminId && data.role === "operador") {
      const { data: adminRows } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const otros = (adminRows ?? []).filter((r) => r.user_id !== adminId);
      if (otros.length === 0) {
        throw new Error("No puedes quitarte el rol de administrador si eres el único admin.");
      }
    }

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.email.trim(),
      email_confirm: true,
      user_metadata: { full_name: data.fullName.trim() },
    });

    if (authErr) {
      throw new Error(authErr.message);
    }

    const ciVal = data.ci?.trim() || null;

    const profilePatch: Database["public"]["Tables"]["profiles"]["Update"] = {
      full_name: data.fullName.trim(),
      email: data.email.trim(),
      ci: ciVal,
      activo: data.activo,
      bloqueado: data.bloqueado,
    };
    if (data.intentosFallidos !== undefined) {
      profilePatch.intentos_fallidos = data.intentosFallidos;
    }

    const { error: profErr } = await supabaseAdmin.from("profiles").update(profilePatch).eq("id", data.userId);

    if (profErr) {
      throw new Error(profErr.message);
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error: insRoleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });

    if (insRoleErr) {
      throw new Error(`Datos guardados pero error al asignar rol: ${insRoleErr.message}`);
    }

    await auditoriaInsert(supabaseAdmin, {
      user_id: adminId,
      accion: "admin_editar_usuario",
      entidad: "profiles",
      entidad_id: data.userId,
      detalle: { email: data.email.trim(), role: data.role },
    });

    return { ok: true as const };
  });
