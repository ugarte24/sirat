import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, Bell, Users, AlertCircle, Loader2, Plus } from "lucide-react";
import { FORMULARIO_VERIFICACION_TITULO_NUEVO } from "@/lib/sirat-brand";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !session) nav({ to: "/login" }); }, [session, loading, nav]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!session) return null;
  return <AppShell><Dashboard /></AppShell>;
}

function Dashboard() {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState({ contrib: 0, formActivos: 0, formBaja: 0, notifPend: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, fa, fb, np] = await Promise.all([
        supabase.from("contribuyentes").select("*", { count: "exact", head: true }),
        supabase.from("formularios").select("*", { count: "exact", head: true }).eq("estado", "activo"),
        supabase.from("formularios").select("*", { count: "exact", head: true }).eq("estado", "baja"),
        supabase.from("notificaciones").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
      ]);
      setStats({ contrib: c.count ?? 0, formActivos: fa.count ?? 0, formBaja: fb.count ?? 0, notifPend: np.count ?? 0 });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Contribuyentes", value: stats.contrib, icon: Users, to: "/contribuyentes", color: "text-primary" },
    { label: "Verificaciones activas", value: stats.formActivos, icon: ClipboardList, to: "/formularios", color: "text-success" },
    { label: "Verificaciones en baja", value: stats.formBaja, icon: AlertCircle, to: "/formularios", color: "text-warning" },
    { label: "Notif. pendientes", value: stats.notifPend, icon: Bell, to: "/notificaciones", color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Bienvenido,</p>
        <h1 className="font-display text-3xl font-bold">{profile?.full_name}</h1>
        <p className="text-sm text-muted-foreground">Panel {role === "admin" ? "Administrador" : "Operador"}</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to as any}>
            <Card className="p-4 hover:shadow-elegant transition-shadow cursor-pointer h-full">
              <c.icon className={`h-5 w-5 ${c.color} mb-2`} />
              <div className="text-2xl font-bold font-display">{loading ? "—" : c.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link to="/formularios" search={{ nuevo: 1 }}>
          <Card className="p-5 bg-gradient-primary text-primary-foreground hover:shadow-elegant transition-shadow cursor-pointer">
            <Plus className="h-6 w-6 mb-2" />
            <div className="font-display text-lg font-semibold leading-snug">{FORMULARIO_VERIFICACION_TITULO_NUEVO}</div>
            <p className="text-xs opacity-90 mt-1">Registrar datos en campo</p>
          </Card>
        </Link>
        <Link to="/notificaciones" search={{ nueva: 1 }}>
          <Card className="p-5 bg-gradient-gold text-gold-foreground hover:shadow-gold transition-shadow cursor-pointer">
            <Bell className="h-6 w-6 mb-2" />
            <div className="font-display text-xl font-semibold">Nueva notificación</div>
            <p className="text-xs opacity-90 mt-1">Emitir aviso, advertencia o multa</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
