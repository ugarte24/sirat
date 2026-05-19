import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  ClipboardCheck,
  ClipboardList,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  UserCog,
  Users,
} from "lucide-react";
import { FORMULARIO_VERIFICACION_TITULO_NUEVO } from "@/lib/sirat-brand";
import { formatDateEsBo } from "@/lib/date";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: Home });

type DashboardStats = {
  formPendientes: number;
  notifPend: number;
  formActivos: number;
  contrib: number;
  formBaja: number;
  usersAtencion: number;
};

type PendienteForm = {
  id: string;
  fecha: string;
  razon_social: string;
  contribuyente: { nombre_completo: string } | null;
};

type PendienteNotif = {
  id: string;
  created_at: string;
  nombre_actividad: string | null;
  fecha_limite: string;
  contribuyente: { nombre_completo: string } | null;
};

function Home() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !session) nav({ to: "/login" });
  }, [session, loading, nav]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return null;
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    formPendientes: 0,
    notifPend: 0,
    formActivos: 0,
    contrib: 0,
    formBaja: 0,
    usersAtencion: 0,
  });
  const [pendientesForm, setPendientesForm] = useState<PendienteForm[]>([]);
  const [pendientesNotif, setPendientesNotif] = useState<PendienteNotif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const [formPend, notifPend, formActivos, contrib, formBaja, listForm, listNotif] = await Promise.all([
      supabase
        .from("formularios")
        .select("*", { count: "exact", head: true })
        .eq("estado", "pendiente_verificacion"),
      supabase.from("notificaciones").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
      supabase.from("formularios").select("*", { count: "exact", head: true }).eq("estado", "activo"),
      supabase.from("contribuyentes").select("*", { count: "exact", head: true }),
      supabase.from("formularios").select("*", { count: "exact", head: true }).eq("estado", "baja"),
      supabase
        .from("formularios")
        .select("id, fecha, razon_social, contribuyente:contribuyentes(nombre_completo)")
        .eq("estado", "pendiente_verificacion")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("notificaciones")
        .select(
          "id, created_at, nombre_actividad, fecha_limite, contribuyente:contribuyentes(nombre_completo)",
        )
        .eq("estado", "pendiente")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    let usersAtencion = 0;
    if (role === "admin") {
      const [bloq, inact] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("bloqueado", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("activo", false),
      ]);
      const adminErr = bloq.error ?? inact.error;
      if (adminErr) {
        toast.error(adminErr.message);
        setLoading(false);
        return;
      }
      usersAtencion = (bloq.count ?? 0) + (inact.count ?? 0);
    }

    const err =
      formPend.error ??
      notifPend.error ??
      formActivos.error ??
      contrib.error ??
      formBaja.error ??
      listForm.error ??
      listNotif.error;

    if (err) {
      toast.error(err.message);
      setLoading(false);
      return;
    }

    setStats({
      formPendientes: formPend.count ?? 0,
      notifPend: notifPend.count ?? 0,
      formActivos: formActivos.count ?? 0,
      contrib: contrib.count ?? 0,
      formBaja: formBaja.count ?? 0,
      usersAtencion,
    });
    setPendientesForm((listForm.data ?? []) as PendienteForm[]);
    setPendientesNotif((listNotif.data ?? []) as PendienteNotif[]);
    setLoading(false);
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpiCards = [
    {
      label: "Pendientes de verificación",
      value: stats.formPendientes,
      icon: ClipboardCheck,
      color: "text-amber-600 dark:text-amber-400",
      to: "/formularios" as const,
      search: { filtro: "pendientes" as const },
      highlight: stats.formPendientes > 0,
    },
    {
      label: "Notificaciones pendientes",
      value: stats.notifPend,
      icon: Bell,
      color: "text-destructive",
      to: "/notificaciones" as const,
      search: { estado: "pendiente" as const },
      highlight: stats.notifPend > 0,
    },
    {
      label: "Actividades verificadas",
      value: stats.formActivos,
      icon: ClipboardList,
      color: "text-success",
      to: "/formularios" as const,
      search: { filtro: "activos" as const },
    },
    {
      label: "Contribuyentes",
      value: stats.contrib,
      icon: Users,
      color: "text-primary",
      to: "/contribuyentes" as const,
    },
    {
      label: "En mapa (pendientes)",
      value: stats.formPendientes,
      icon: MapPin,
      color: "text-primary",
      to: "/mapa" as const,
      search: { filtro: "pendientes" as const },
    },
    {
      label: "Actividades de baja",
      value: stats.formBaja,
      icon: ClipboardList,
      color: "text-muted-foreground",
      to: "/formularios" as const,
      search: { filtro: "baja" as const },
    },
  ];

  const hayPendientes = stats.formPendientes > 0 || stats.notifPend > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Bienvenido,</p>
          <h1 className="font-display text-3xl font-bold">{profile?.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            Panel {role === "admin" ? "Administrador" : "Operador"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </header>

      {!loading && !hayPendientes && (
        <Card className="border-success/30 bg-success/5 px-4 py-3 text-sm text-foreground">
          No hay verificaciones ni notificaciones pendientes. Buen trabajo.
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpiCards.map((c) => (
          <Link key={c.label} to={c.to} search={"search" in c ? c.search : undefined}>
            <Card
              className={`p-4 hover:shadow-elegant transition-shadow cursor-pointer h-full ${
                c.highlight ? "ring-1 ring-amber-500/40" : ""
              }`}
            >
              <c.icon className={`h-5 w-5 ${c.color} mb-2`} />
              <div className="text-2xl font-bold font-display tabular-nums">
                {loading ? "—" : c.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1 leading-snug">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      {role === "admin" && stats.usersAtencion > 0 && (
        <Link to="/usuarios">
          <Card className="flex items-center gap-3 p-4 hover:shadow-elegant transition-shadow cursor-pointer border-destructive/20">
            <UserCog className="h-5 w-5 text-destructive shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Usuarios que requieren atención</p>
              <p className="text-sm text-muted-foreground">
                {stats.usersAtencion} cuenta(s) bloqueada(s) o inactiva(s)
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Card>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Tu trabajo pendiente</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Verificaciones por completar</h3>
              <Link
                to="/formularios"
                search={{ filtro: "pendientes" }}
                className="text-xs text-primary hover:underline"
              >
                Ver todas
              </Link>
            </div>
            {loading && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">Cargando…</p>
            )}
            {!loading && pendientesForm.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                Sin pendientes de verificación
              </p>
            )}
            {!loading && pendientesForm.length > 0 && (
              <ul className="divide-y divide-border/60">
                {pendientesForm.map((f) => (
                  <li key={f.id}>
                    <Link
                      to="/formularios/$id"
                      params={{ id: f.id }}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-snug truncate">{f.razon_social}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {f.contribuyente?.nombre_completo ?? "—"} · {formatDateEsBo(f.fecha)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Notificaciones pendientes</h3>
              <Link
                to="/notificaciones"
                search={{ estado: "pendiente" }}
                className="text-xs text-primary hover:underline"
              >
                Ver todas
              </Link>
            </div>
            {loading && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">Cargando…</p>
            )}
            {!loading && pendientesNotif.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                Sin notificaciones pendientes
              </p>
            )}
            {!loading && pendientesNotif.length > 0 && (
              <ul className="divide-y divide-border/60">
                {pendientesNotif.map((n) => (
                  <li key={n.id}>
                    <Link
                      to="/notificaciones/$id"
                      params={{ id: n.id }}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-snug truncate">
                          {n.nombre_actividad?.trim() || n.contribuyente?.nombre_completo || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Límite {formatDateEsBo(n.fecha_limite)} ·{" "}
                          {formatDateEsBo(n.created_at.slice(0, 10))}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Accesos rápidos</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to="/formularios" search={{ nuevo: 1 }}>
            <Card className="p-5 bg-gradient-primary text-primary-foreground hover:shadow-elegant transition-shadow cursor-pointer h-full">
              <Plus className="h-6 w-6 mb-2" />
              <div className="font-display text-lg font-semibold leading-snug">
                {FORMULARIO_VERIFICACION_TITULO_NUEVO}
              </div>
              <p className="text-xs opacity-90 mt-1">Registrar datos en campo</p>
            </Card>
          </Link>
          <Link to="/notificaciones" search={{ nueva: 1 }}>
            <Card className="p-5 bg-gradient-gold text-gold-foreground hover:shadow-gold transition-shadow cursor-pointer h-full">
              <Bell className="h-6 w-6 mb-2" />
              <div className="font-display text-xl font-semibold">Nueva notificación</div>
              <p className="text-xs opacity-90 mt-1">Emitir aviso tributario</p>
            </Card>
          </Link>
          <Link to="/contribuyentes" search={{ nuevo: 1 }}>
            <Card className="p-5 hover:shadow-elegant transition-shadow cursor-pointer h-full border-primary/20">
              <Users className="h-6 w-6 mb-2 text-primary" />
              <div className="font-display text-lg font-semibold leading-snug">Nuevo contribuyente</div>
              <p className="text-xs text-muted-foreground mt-1">Alta en el padrón municipal</p>
            </Card>
          </Link>
          <Link to="/reportes">
            <Card className="p-5 hover:shadow-elegant transition-shadow cursor-pointer h-full">
              <ClipboardList className="h-6 w-6 mb-2 text-muted-foreground" />
              <div className="font-display text-lg font-semibold leading-snug">Reportes</div>
              <p className="text-xs text-muted-foreground mt-1">Exportar Excel o PDF</p>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
