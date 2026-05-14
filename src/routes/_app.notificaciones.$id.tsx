import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Check, Ban } from "lucide-react";
import { toast } from "sonner";
import { generateNotificacionPDF } from "@/lib/pdf";

export const Route = createFileRoute("/_app/notificaciones/$id")({ component: Detalle });

function Detalle() {
  const { id } = Route.useParams();
  const [n, setN] = useState<any>(null);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("notificaciones").select("*, contribuyente:contribuyentes(nombre_completo,ci)").eq("id", id).maybeSingle();
    setN(data);
  })(); }, [id]);

  if (!n) return <p>Cargando…</p>;

  const conceptos = [
    n.padron_municipal && "Padrón municipal",
    n.impuestos_patente && "Impuestos de patente",
    n.bienes_inmuebles && "Bienes inmuebles",
    n.vehiculos && "Vehículos",
  ].filter(Boolean) as string[];

  const pdf = () => generateNotificacionPDF({
    codigo: n.codigo, numero_correlativo: n.numero_correlativo,
    fecha: n.created_at.slice(0, 10), nombre_notificado: n.nombre_notificado,
    ci: n.contribuyente.ci, direccion: n.direccion, fecha_limite: n.fecha_limite,
    tipo: n.tipo, conceptos, estado: n.estado,
  });

  const cambiarEstado = async (estado: any) => {
    const { error } = await supabase.from("notificaciones").update({ estado }).eq("id", id);
    if (error) toast.error(error.message); else { setN({ ...n, estado }); toast.success(`Estado: ${estado}`); }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <p className="text-xs text-muted-foreground font-mono">N° {n.codigo}-{n.numero_correlativo}</p>
          <h1 className="font-display text-2xl font-bold">{n.tipo.toUpperCase()}</h1>
        </div>
        <Badge variant={n.estado === "cumplido" ? "default" : n.estado === "anulado" ? "destructive" : "secondary"}>{n.estado}</Badge>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={pdf} className="bg-gradient-primary"><FileDown className="h-4 w-4 mr-1" />PDF</Button>
        {n.estado === "pendiente" && <>
          <Button variant="outline" onClick={() => cambiarEstado("cumplido")}><Check className="h-4 w-4 mr-1" />Cumplido</Button>
          <Button variant="destructive" onClick={() => cambiarEstado("anulado")}><Ban className="h-4 w-4 mr-1" />Anular</Button>
        </>}
      </div>
      <Card className="p-5 space-y-2 text-sm">
        <div><span className="text-muted-foreground">Notificado:</span> <strong>{n.nombre_notificado}</strong></div>
        <div><span className="text-muted-foreground">C.I.:</span> {n.contribuyente.ci}</div>
        <div><span className="text-muted-foreground">Dirección:</span> {n.direccion}</div>
        <div><span className="text-muted-foreground">Fecha límite:</span> {n.fecha_limite}</div>
        <div><span className="text-muted-foreground">Conceptos:</span> {conceptos.join(", ") || "—"}</div>
      </Card>
    </div>
  );
}
