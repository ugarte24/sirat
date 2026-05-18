import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ContribuyenteEditarForm } from "@/components/forms/ContribuyenteEditarForm";
import { FORMULARIO_VERIFICACION_SECCION } from "@/lib/sirat-brand";

export const Route = createFileRoute("/_app/contribuyentes/$id")({ component: Detalle });

function Detalle() {
  const { id } = Route.useParams();
  const [c, setC] = useState<{
    ci: string;
    nombre_completo: string;
    telefono: string | null;
  } | null>(null);
  const [forms, setForms] = useState<{ id: string; razon_social: string; estado: string }[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  const reload = async () => {
    const { data } = await supabase
      .from("contribuyentes")
      .select("ci,nombre_completo,telefono")
      .eq("id", id)
      .maybeSingle();
    setC(data);
    const [{ data: f }, { count }] = await Promise.all([
      supabase
        .from("formularios")
        .select("id,razon_social,estado")
        .eq("contribuyente_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("notificaciones").select("id", { count: "exact", head: true }).eq("contribuyente_id", id),
    ]);
    setForms(f ?? []);
    setNotifCount(count ?? 0);
  };

  useEffect(() => {
    void reload();
  }, [id]);

  if (!c) return <p>Cargando…</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="font-display text-2xl font-bold">{c.nombre_completo}</h1>
      <ContribuyenteEditarForm
        key={`${id}-${c.ci}-${c.nombre_completo}`}
        contribuyenteId={id}
        initial={{
          ci: c.ci,
          nombre_completo: c.nombre_completo,
          telefono: c.telefono ?? "",
        }}
        onSuccess={() => void reload()}
      />
      <Card className="p-5 space-y-3 border-0 shadow-none sm:border sm:shadow-sm">
        <h2 className="font-semibold">{FORMULARIO_VERIFICACION_SECCION} ({forms.length})</h2>
        {forms.length === 0 && <p className="text-sm text-muted-foreground">Ninguno</p>}
        <ul className="space-y-1">
          {forms.map((f) => (
            <li key={f.id} className="text-sm">
              {f.razon_social}{" "}
              <span className="text-muted-foreground">({f.estado})</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground border-t pt-3">
          Notificaciones vinculadas: <span className="font-medium text-foreground">{notifCount}</span>
        </p>
      </Card>
    </div>
  );
}
