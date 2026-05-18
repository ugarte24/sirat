import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { contribuyenteToUpdatePayload } from "@/lib/sirat-forms";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FORMULARIO_VERIFICACION_SECCION } from "@/lib/sirat-brand";

export const Route = createFileRoute("/_app/contribuyentes/$id")({ component: Detalle });

function Detalle() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [c, setC] = useState<{
    ci: string;
    nombre_completo: string;
    telefono: string | null;
  } | null>(null);
  const [forms, setForms] = useState<{ id: string; razon_social: string; estado: string }[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("contribuyentes").select("ci,nombre_completo,telefono").eq("id", id).maybeSingle();
      setC(data);
      const [{ data: f }, { count }] = await Promise.all([
        supabase.from("formularios").select("id,razon_social,estado").eq("contribuyente_id", id),
        supabase.from("notificaciones").select("id", { count: "exact", head: true }).eq("contribuyente_id", id),
      ]);
      setForms(f ?? []);
      setNotifCount(count ?? 0);
    })();
  }, [id]);

  const puedeDarDeBaja = forms.length === 0 && notifCount === 0;

  const save = async () => {
    if (!c) return;
    const { error } = await supabase
      .from("contribuyentes")
      .update(contribuyenteToUpdatePayload(c))
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Actualizado");
  };

  const darDeBaja = async () => {
    if (!puedeDarDeBaja) {
      return toast.error("No se puede dar de baja: tiene formularios o notificaciones asociadas.");
    }
    if (!confirm("¿Dar de baja este contribuyente? Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("contribuyentes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Contribuyente dado de baja");
      nav({ to: "/contribuyentes" });
    }
  };

  if (!c) return <p>Cargando…</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="font-display text-2xl font-bold">{c.nombre_completo}</h1>
      <Card className="p-5 space-y-4">
        <div>
          <Label>C.I.</Label>
          <Input value={c.ci} onChange={(e) => setC({ ...c, ci: e.target.value })} />
        </div>
        <div>
          <Label>Nombre</Label>
          <Input value={c.nombre_completo} onChange={(e) => setC({ ...c, nombre_completo: e.target.value })} />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input value={c.telefono ?? ""} onChange={(e) => setC({ ...c, telefono: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => void save()} className="flex-1 bg-gradient-primary">
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="sm:w-auto"
            disabled={!puedeDarDeBaja}
            title={
              puedeDarDeBaja
                ? undefined
                : `Solo se puede dar de baja si no hay ${FORMULARIO_VERIFICACION_SECCION.toLowerCase()} ni notificaciones`
            }
            onClick={() => void darDeBaja()}
          >
            Dar de baja
          </Button>
        </div>
      </Card>
      <Card className="p-5 space-y-3">
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
