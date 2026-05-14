import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/contribuyentes/$id")({ component: Detalle });

function Detalle() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { role } = useAuth();
  const [c, setC] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("contribuyentes").select("*").eq("id", id).maybeSingle();
    setC(data);
    const { data: f } = await supabase.from("formularios").select("id,numero,razon_social,estado").eq("contribuyente_id", id);
    setForms(f ?? []);
  })(); }, [id]);

  const save = async () => {
    const { error } = await supabase.from("contribuyentes").update({
      ci: c.ci, nombre_completo: c.nombre_completo, telefono: c.telefono,
    }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Actualizado");
  };
  const del = async () => {
    if (forms.length) return toast.error("No se puede eliminar: tiene formularios asociados");
    if (!confirm("¿Eliminar contribuyente?")) return;
    const { error } = await supabase.from("contribuyentes").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Eliminado"); nav({ to: "/contribuyentes" }); }
  };

  if (!c) return <p>Cargando…</p>;
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="font-display text-2xl font-bold">{c.nombre_completo}</h1>
      <Card className="p-5 space-y-4">
        <div><Label>C.I.</Label><Input value={c.ci} onChange={(e) => setC({ ...c, ci: e.target.value })} /></div>
        <div><Label>Nombre</Label><Input value={c.nombre_completo} onChange={(e) => setC({ ...c, nombre_completo: e.target.value })} /></div>
        <div><Label>Teléfono</Label><Input value={c.telefono ?? ""} onChange={(e) => setC({ ...c, telefono: e.target.value })} /></div>
        <div className="flex gap-2">
          <Button onClick={save} className="flex-1 bg-gradient-primary">Guardar</Button>
          {role === "admin" && <Button onClick={del} variant="destructive" disabled={forms.length > 0}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Formularios asociados ({forms.length})</h2>
        {forms.length === 0 && <p className="text-sm text-muted-foreground">Ninguno</p>}
        <ul className="space-y-1">
          {forms.map(f => <li key={f.id} className="text-sm">N° {f.numero} — {f.razon_social} <span className="text-muted-foreground">({f.estado})</span></li>)}
        </ul>
      </Card>
    </div>
  );
}
