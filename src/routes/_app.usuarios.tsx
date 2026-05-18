import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Pencil, UserPlus } from "lucide-react";
import { adminCreateUserFn } from "@/functions/admin-create-user";
import { adminUpdateUserFn } from "@/functions/admin-update-user";
import { adminResetPasswordEmailFn } from "@/functions/admin-reset-password-email";
import type { Database } from "@/integrations/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"] & { role: string };

export const Route = createFileRoute("/_app/usuarios")({ component: Usuarios });

function Usuarios() {
  const { role, user } = useAuth();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<"operador" | "admin">("operador");
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [efullName, setEfullName] = useState("");
  const [eemail, setEemail] = useState("");
  const [eci, setEci] = useState("");
  const [eactivo, setEactivo] = useState(true);
  const [ebloqueado, setEbloqueado] = useState(false);
  const [erole, setErole] = useState<"operador" | "admin">("operador");
  const [eintentos, setEintentos] = useState(0);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setListLoading(true);
    try {
      const { data: profiles, error: pe } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: roles, error: re } = await supabase.from("user_roles").select("*");
      if (pe) throw pe;
      if (re) throw re;
      const merged = (profiles ?? []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role ?? "operador",
      }));
      setUsers(merged);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo cargar la lista";
      toast.error(msg);
    } finally {
      setListLoading(false);
    }
  };

  const openEdit = (u: ProfileRow) => {
    setEditUserId(u.id);
    setEfullName(u.full_name);
    setEemail(u.email);
    setEci(u.ci ?? "");
    setEactivo(u.activo);
    setEbloqueado(u.bloqueado);
    setErole(u.role === "admin" ? "admin" : "operador");
    setEintentos(u.intentos_fallidos ?? 0);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditUserId(null);
  };

  const adminCount = users.filter((u) => u.role === "admin").length;
  const soleAdminLock =
    !!user &&
    editUserId === user.id &&
    adminCount === 1 &&
    erole === "operador";

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId || soleAdminLock) return;
    setSavingEdit(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) {
        toast.error("No hay sesión activa. Vuelve a iniciar sesión.");
        return;
      }
      await adminUpdateUserFn({
        data: {
          accessToken,
          userId: editUserId,
          fullName: efullName.trim(),
          email: eemail.trim(),
          ci: eci.trim() || undefined,
          activo: eactivo,
          bloqueado: ebloqueado,
          role: erole,
          intentosFallidos: eintentos,
        },
      });
      toast.success("Usuario actualizado.");
      closeEdit();
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo guardar";
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  if (role !== "admin") return <p className="text-center py-8">Solo administradores.</p>;

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) {
        toast.error("No hay sesión activa. Vuelve a iniciar sesión.");
        return;
      }
      await adminCreateUserFn({
        data: {
          accessToken,
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role: newRole,
        },
      });
      toast.success("Usuario registrado correctamente.");
      setFullName("");
      setEmail("");
      setPassword("");
      setNewRole("operador");
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo crear el usuario";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const resetPassword = async (resetEmail: string) => {
    const { data: sess } = await supabase.auth.getSession();
    const accessToken = sess.session?.access_token;
    if (!accessToken) {
      toast.error("No hay sesión activa.");
      return;
    }
    try {
      await adminResetPasswordEmailFn({
        data: {
          accessToken,
          targetEmail: resetEmail.trim(),
          redirectTo: window.location.origin,
        },
      });
      toast.success("Se envió al correo el enlace para establecer una nueva contraseña.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar el correo");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Usuarios</h1>

      <Card className="p-4 border-primary/20">
        <div className="flex gap-2 items-start mb-4">
          <UserPlus className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <div>
            <h2 className="font-semibold text-foreground">Registrar nuevo usuario</h2>
          </div>
        </div>
        <form onSubmit={crearUsuario} className="space-y-3 max-w-md">
          <div>
            <Label htmlFor="nu-nombre">Nombre completo</Label>
            <Input
              id="nu-nombre"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="nu-email">Correo electrónico</Label>
            <Input
              id="nu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="nu-pass">Contraseña inicial</Label>
            <Input
              id="nu-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label>Rol</Label>
            <Select value={newRole} onValueChange={(v: "operador" | "admin") => setNewRole(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={creating} className="w-full sm:w-auto">
            {creating ? "Registrando…" : "Registrar usuario"}
          </Button>
        </form>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Usuarios del sistema</h2>
        {!listLoading && (
          <span className="text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? "usuario" : "usuarios"}
          </span>
        )}
      </div>

      <Card className="overflow-hidden border-primary/15">
        {listLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            No hay usuarios en la lista. Registra el primero con el formulario de arriba.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead className="hidden sm:table-cell">CI</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-center">Activo</TableHead>
                <TableHead className="text-center hidden md:table-cell">Bloqueado</TableHead>
                <TableHead className="text-center w-14">Intentos</TableHead>
                <TableHead className="text-right w-[1%]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium max-w-[140px] truncate">{u.full_name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[180px] truncate text-xs sm:text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {u.ci ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {u.activo ? (
                      <span className="text-emerald-600 text-xs font-medium">Sí</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    {u.bloqueado ? (
                      <span className="text-destructive text-xs font-medium">Sí</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono">
                    {u.intentos_fallidos ?? 0}
                    {(u.intentos_fallidos ?? 0) >= 5 && (
                      <span className="block text-[10px] text-destructive">bloqueo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5 sm:mr-1" aria-hidden />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => void resetPassword(u.email)}
                      >
                        Reset
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={editOpen} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={guardarEdicion}>
            <DialogHeader>
              <DialogTitle>Editar usuario</DialogTitle>
              <DialogDescription>
                Cambios en correo, nombre y rol se sincronizan con la cuenta de acceso.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="ed-nombre">Nombre completo</Label>
                <Input
                  id="ed-nombre"
                  value={efullName}
                  onChange={(e) => setEfullName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-email">Correo electrónico</Label>
                <Input
                  id="ed-email"
                  type="email"
                  value={eemail}
                  onChange={(e) => setEemail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-ci">CI (opcional)</Label>
                <Input id="ed-ci" value={eci} onChange={(e) => setEci(e.target.value)} maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-int">Intentos fallidos de login (0 reinicia el contador)</Label>
                <Input
                  id="ed-int"
                  type="number"
                  min={0}
                  max={999}
                  value={eintentos}
                  onChange={(e) => setEintentos(Number.parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={erole} onValueChange={(v: "operador" | "admin") => setErole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                {soleAdminLock && (
                  <p className="text-xs text-destructive">
                    Eres el único administrador: no puedes cambiarte a operador.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="ed-activo">Cuenta activa</Label>
                  <p className="text-xs text-muted-foreground">Puede iniciar sesión si no está bloqueado.</p>
                </div>
                <Switch id="ed-activo" checked={eactivo} onCheckedChange={setEactivo} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="ed-bloq">Bloqueado</Label>
                  <p className="text-xs text-muted-foreground">Marca intentos de acceso no deseados.</p>
                </div>
                <Switch id="ed-bloq" checked={ebloqueado} onCheckedChange={setEbloqueado} />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeEdit}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit || soleAdminLock}>
                {savingEdit ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
