import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/usuarios")({ component: Usuarios });

function Usuarios() {
  const { role } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const merged = (profiles ?? []).map(p => ({ ...p, role: roles?.find(r => r.user_id === p.id)?.role ?? "operador" }));
    setUsers(merged);
  };

  if (role !== "admin") return <p className="text-center py-8">Solo administradores.</p>;

  const cambiarRol = async (userId: string, nuevoRol: "admin" | "operador") => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: nuevoRol });
    if (error) toast.error(error.message); else { toast.success("Rol actualizado"); load(); }
  };
  const toggleActivo = async (u: any) => {
    const { error } = await supabase.from("profiles").update({ activo: !u.activo }).eq("id", u.id);
    if (error) toast.error(error.message); else { toast.success("Actualizado"); load(); }
  };
  const reset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) toast.error(error.message); else toast.success("Enlace enviado al correo");
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Usuarios</h1>
      <p className="text-sm text-muted-foreground">Las nuevas cuentas se crean desde la pantalla de registro. Aquí puedes gestionar roles y estado.</p>
      <div className="space-y-2">
        {users.map(u => (
          <Card key={u.id} className="p-4">
            <div className="flex justify-between items-start gap-2 flex-wrap">
              <div>
                <div className="font-medium">{u.full_name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
                <div className="flex gap-1 mt-1"><Badge>{u.role}</Badge>{!u.activo && <Badge variant="destructive">inactivo</Badge>}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => cambiarRol(u.id, u.role === "admin" ? "operador" : "admin")}>Cambiar a {u.role === "admin" ? "operador" : "admin"}</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActivo(u)}>{u.activo ? "Desactivar" : "Activar"}</Button>
                <Button size="sm" variant="outline" onClick={() => reset(u.email)}>Reset contraseña</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
