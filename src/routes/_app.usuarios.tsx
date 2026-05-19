import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { MoreVertical, Pencil, Plus, Search } from "lucide-react";
import { adminCreateUserFn } from "@/functions/admin-create-user";
import { adminUpdateUserFn } from "@/functions/admin-update-user";
import { adminResetPasswordEmailFn } from "@/functions/admin-reset-password-email";
import type { Database } from "@/integrations/supabase/types";
import {
  DataListCard,
  DataListTable,
  DataListTableWrap,
  DataListTbody,
  DataListTd,
  DataListTheadRow,
  DataListTh,
  ilikePattern,
  LIST_PAGE_SIZE,
  ORDER_CREATED_DESC,
  pillMuted,
  pillSuccess,
  pillWarning,
  TablePaginationFooter,
} from "@/components/data-list";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDateEsBo } from "@/lib/date";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"] & { role: string };

export const Route = createFileRoute("/_app/usuarios")({ component: Usuarios });

function UsuarioEstadoPill({ u, compact }: { u: ProfileRow; compact?: boolean }) {
  if (!u.activo) {
    return <span className={pillMuted(compact ? "px-2.5" : undefined)}>Inactivo</span>;
  }
  if (u.bloqueado) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-destructive/15 px-3 py-0.5 text-xs font-medium text-destructive",
          compact && "px-2.5",
        )}
      >
        Bloqueado
      </span>
    );
  }
  return <span className={pillSuccess(compact ? "px-2.5" : undefined)}>Activo</span>;
}

function UsuarioRolPill({ role, compact }: { role: string; compact?: boolean }) {
  if (role === "admin") {
    return <span className={pillWarning(compact ? "px-2.5" : undefined)}>Administrador</span>;
  }
  return <span className={pillMuted(compact ? "px-2.5" : undefined)}>Operador</span>;
}

function UsuarioListaAcciones({
  u,
  onEdit,
  onReset,
  className,
}: {
  u: ProfileRow;
  onEdit: (u: ProfileRow) => void;
  onReset: (email: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-0.5", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={`Editar ${u.full_name}`}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(u);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Más acciones: ${u.full_name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit(u);
            }}
          >
            Editar usuario
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              void onReset(u.email);
            }}
          >
            Enviar enlace de contraseña
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Usuarios() {
  const { role, user } = useAuth();
  const [list, setList] = useState<ProfileRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [adminCount, setAdminCount] = useState(0);
  const [page, setPage] = useState(0);
  const [qInput, setQInput] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
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
    const t = setTimeout(() => setQDeb(qInput), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(0);
  }, [qDeb]);

  const load = useCallback(async () => {
    setLoading(true);
    const from = page * LIST_PAGE_SIZE;
    const to = from + LIST_PAGE_SIZE - 1;
    const pat = ilikePattern(qDeb);

    try {
      let qb = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", ORDER_CREATED_DESC);
      if (pat) {
        qb = qb.or(`full_name.ilike.${pat},email.ilike.${pat},ci.ilike.${pat}`);
      }
      const { data: profiles, error: pe, count } = await qb.range(from, to);
      if (pe) throw pe;

      const { data: roles, error: re } = await supabase.from("user_roles").select("user_id, role");
      if (re) throw re;

      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      setAdminCount((roles ?? []).filter((r) => r.role === "admin").length);
      setList(
        (profiles ?? []).map((p) => ({
          ...p,
          role: roleMap.get(p.id) ?? "operador",
        })),
      );
      setTotal(count);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo cargar la lista";
      toast.error(msg);
      setList([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }, [page, qDeb]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const resetCreateForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setNewRole("operador");
  };

  const soleAdminLock =
    !!user && editUserId === user.id && adminCount === 1 && erole === "operador";

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
      resetCreateForm();
      setCreateOpen(false);
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

  if (role !== "admin") {
    return <p className="py-8 text-center text-muted-foreground">Solo administradores.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Usuarios</h1>
        <Button
          type="button"
          size="sm"
          className="bg-gradient-primary"
          onClick={() => {
            resetCreateForm();
            setCreateKey((k) => k + 1);
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-[min(100%,28rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar nuevo usuario</DialogTitle>
            <DialogDescription>
              Cree la cuenta de acceso con correo, contraseña inicial y rol.
            </DialogDescription>
          </DialogHeader>
          <form key={createKey} onSubmit={crearUsuario} className="grid gap-3">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Registrando…" : "Registrar usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="max-h-[90vh] w-full max-w-[min(100%,28rem)] overflow-y-auto">
          <form onSubmit={guardarEdicion}>
            <DialogHeader>
              <DialogTitle>Editar usuario</DialogTitle>
              <DialogDescription>
                Los cambios en correo, nombre y rol se sincronizan con la cuenta de acceso.
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Buscar por nombre, correo o C.I."
          className="pl-9"
        />
      </div>

      <DataListCard>
        <div className="divide-y divide-border/60 md:hidden">
          {loading && (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
          )}
          {!loading && list.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin usuarios</p>
          )}
          {!loading &&
            list.map((u) => (
              <div
                key={u.id}
                role="button"
                tabIndex={0}
                className="w-full cursor-pointer px-4 py-3.5 text-left hover:bg-muted/40 active:bg-muted/60"
                onClick={() => openEdit(u)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEdit(u);
                  }
                }}
              >
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDateEsBo(u.created_at)}
                  </span>
                  <div className="justify-self-end">
                    <UsuarioEstadoPill u={u} compact />
                  </div>
                  <p className="col-span-2 mt-0.5 font-semibold leading-snug text-foreground">
                    {u.full_name}
                  </p>
                  <p className="min-w-0 text-xs leading-snug text-muted-foreground">{u.email}</p>
                  <div className="flex flex-col items-end gap-1 justify-self-end self-center">
                    <UsuarioRolPill role={u.role} compact />
                    <UsuarioListaAcciones u={u} onEdit={openEdit} onReset={resetPassword} />
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="hidden md:block">
          <DataListTableWrap>
            <DataListTable>
              <DataListTheadRow>
                <DataListTh>Fecha</DataListTh>
                <DataListTh>Usuario</DataListTh>
                <DataListTh>Rol</DataListTh>
                <DataListTh>Estado</DataListTh>
                <DataListTh align="center">Intentos</DataListTh>
                <DataListTh align="center">Acciones</DataListTh>
              </DataListTheadRow>
              <DataListTbody>
                {loading && (
                  <TableRow>
                    <DataListTd className="py-10 text-center text-muted-foreground" colSpan={6}>
                      Cargando…
                    </DataListTd>
                  </TableRow>
                )}
                {!loading && list.length === 0 && (
                  <TableRow>
                    <DataListTd className="py-10 text-center text-muted-foreground" colSpan={6}>
                      Sin usuarios
                    </DataListTd>
                  </TableRow>
                )}
                {!loading &&
                  list.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                      onClick={() => openEdit(u)}
                    >
                      <DataListTd className="whitespace-nowrap text-muted-foreground">
                        {formatDateEsBo(u.created_at)}
                      </DataListTd>
                      <DataListTd>
                        <div className="font-semibold text-foreground">{u.full_name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{u.email}</div>
                        {u.ci && (
                          <div className="mt-0.5 text-xs text-muted-foreground">C.I. {u.ci}</div>
                        )}
                      </DataListTd>
                      <DataListTd>
                        <UsuarioRolPill role={u.role} />
                      </DataListTd>
                      <DataListTd>
                        <UsuarioEstadoPill u={u} />
                      </DataListTd>
                      <DataListTd align="center" className="tabular-nums text-muted-foreground">
                        {u.intentos_fallidos ?? 0}
                        {(u.intentos_fallidos ?? 0) >= 5 && (
                          <span className="mt-0.5 block text-[10px] text-destructive">bloqueo</span>
                        )}
                      </DataListTd>
                      <DataListTd align="center">
                        <div onClick={(e) => e.stopPropagation()}>
                          <UsuarioListaAcciones
                            u={u}
                            onEdit={openEdit}
                            onReset={resetPassword}
                            className="justify-center"
                          />
                        </div>
                      </DataListTd>
                    </TableRow>
                  ))}
              </DataListTbody>
            </DataListTable>
          </DataListTableWrap>
        </div>
        <TablePaginationFooter
          page={page}
          pageSize={LIST_PAGE_SIZE}
          total={total}
          loading={loading}
          onPageChange={setPage}
        />
      </DataListCard>
    </div>
  );
}
