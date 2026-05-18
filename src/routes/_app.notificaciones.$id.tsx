import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificacionEditarForm } from "@/components/forms/NotificacionEditarForm";
import { ArrowLeft, FileDown, Check, Ban, Pencil } from "lucide-react";
import { toast } from "sonner";
import { generateNotificacionPDF } from "@/lib/pdf";
import { notificacionConceptosMarcados } from "@/lib/sirat-forms";
import { formatDateEsBo } from "@/lib/date";

export const Route = createFileRoute("/_app/notificaciones/$id")({ component: Detalle });

function Detalle() {
  const { id } = Route.useParams();
  const [n, setN] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("notificaciones")
      .select("*, contribuyente:contribuyentes(nombre_completo,ci)")
      .eq("id", id)
      .maybeSingle();
    setN(data);
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!n) {
    return (
      <div className="space-y-4 max-w-xl">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground" asChild>
          <Link to="/notificaciones">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Volver a notificaciones
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  const conceptos = notificacionConceptosMarcados(n);

  const pdf = async () => {
    await generateNotificacionPDF({
    fecha: n.created_at.slice(0, 10),
    contribuyente_nombre: n.contribuyente.nombre_completo,
    contribuyente_ci: n.contribuyente.ci,
    nombre_actividad: n.nombre_actividad,
    numero_identificacion: n.numero_identificacion,
    direccion: n.direccion,
    fecha_limite: n.fecha_limite,
    conceptos,
    gestiones_adeudadas: n.gestiones_adeudadas,
    });
  };

  const cambiarEstado = async (estado: any) => {
    const { error } = await supabase.from("notificaciones").update({ estado }).eq("id", id);
    if (error) toast.error(error.message); else { setN({ ...n, estado }); toast.success(`Estado: ${estado}`); }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground" asChild>
        <Link to="/notificaciones">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Volver a notificaciones
        </Link>
      </Button>

      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">Notificación</h1>
        </div>
        <Badge variant={n.estado === "cumplido" ? "default" : n.estado === "anulado" ? "destructive" : "secondary"}>{n.estado}</Badge>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={pdf} className="bg-gradient-primary"><FileDown className="h-4 w-4 mr-1" />PDF</Button>
        {n.estado === "pendiente" && (
          <Button variant="outline" type="button" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )}
        {n.estado === "pendiente" && <>
          <Button variant="outline" onClick={() => cambiarEstado("cumplido")}><Check className="h-4 w-4 mr-1" />Cumplido</Button>
          <Button variant="destructive" onClick={() => cambiarEstado("anulado")}><Ban className="h-4 w-4 mr-1" />Anular</Button>
        </>}
      </div>
      <Card className="p-5 space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Nombre de la actividad:</span>{" "}
          <strong>{n.nombre_actividad?.trim() || "—"}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">N.º licencia / placa / inmueble (opcional):</span>{" "}
          <strong>{n.numero_identificacion?.trim() || "—"}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">Contribuyente:</span>{" "}
          <strong>{n.contribuyente.nombre_completo}</strong>
        </div>
        <div><span className="text-muted-foreground">C.I.:</span> {n.contribuyente.ci}</div>
        <div><span className="text-muted-foreground">Dirección:</span> {n.direccion}</div>
        <div><span className="text-muted-foreground">Fecha límite:</span> {formatDateEsBo(n.fecha_limite)}</div>
        <div><span className="text-muted-foreground">Conceptos:</span> {conceptos.join(", ") || "—"}</div>
        <div>
          <span className="text-muted-foreground">Observaciones o gestiones adeudadas:</span>{" "}
          {n.gestiones_adeudadas?.trim() ? (
            <span className="whitespace-pre-wrap">{n.gestiones_adeudadas.trim()}</span>
          ) : (
            "—"
          )}
        </div>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar notificación</DialogTitle>
            <DialogDescription>Modifique los datos de la notificación pendiente.</DialogDescription>
          </DialogHeader>
          <NotificacionEditarForm
            key={id}
            notificacionId={id}
            onSuccess={() => {
              setEditOpen(false);
              void reload();
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
