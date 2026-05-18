import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DetailField,
  DetailGrid,
  DetailSection,
  DetailTemplate,
} from "@/components/DetailTemplate";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificacionEditarForm } from "@/components/forms/NotificacionEditarForm";
import { ArrowLeft, FileDown, Check, Ban, Pencil, QrCode } from "lucide-react";
import { NotificacionQrDialog } from "@/components/NotificacionQrDialog";
import { buildNotificacionQrPayload } from "@/lib/notificacion-qr";
import { toast } from "sonner";
import { generateNotificacionPDF } from "@/lib/pdf";
import { useAuth } from "@/lib/auth";
import { notificacionConceptosMarcados } from "@/lib/sirat-forms";
import { formatDateEsBo } from "@/lib/date";
import { NOTIFICACION_GESTIONES_ADEUDADAS_LABEL } from "@/lib/sirat-brand";

export const Route = createFileRoute("/_app/notificaciones/$id")({ component: Detalle });

function Detalle() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const [n, setN] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

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

  const conceptos = useMemo(() => (n ? notificacionConceptosMarcados(n) : []), [n]);

  const qrPayload = useMemo(
    () =>
      n
        ? buildNotificacionQrPayload({
            id,
            created_at: n.created_at,
            fecha_limite: n.fecha_limite,
            contribuyente_nombre: n.contribuyente.nombre_completo,
            contribuyente_ci: n.contribuyente.ci,
            nombre_actividad: n.nombre_actividad,
            numero_identificacion: n.numero_identificacion,
            direccion: n.direccion,
            conceptos,
            gestiones_adeudadas: n.gestiones_adeudadas,
          })
        : null,
    [id, n, conceptos],
  );

  if (!n) {
    return (
      <div className="space-y-4 max-w-2xl">
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
      usuario: profile?.full_name ?? profile?.email ?? undefined,
    });
  };

  const cambiarEstado = async (estado: any) => {
    const { error } = await supabase.from("notificaciones").update({ estado }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setN({ ...n, estado });
      toast.success(`Estado: ${estado}`);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground" asChild>
        <Link to="/notificaciones">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Volver a notificaciones
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Notificación</h1>
        <Badge
          variant={
            n.estado === "cumplido" ? "default" : n.estado === "anulado" ? "destructive" : "secondary"
          }
        >
          {n.estado}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void pdf()} className="bg-gradient-primary">
          <FileDown className="h-4 w-4 mr-1" />
          PDF
        </Button>
        <Button variant="outline" type="button" onClick={() => setQrOpen(true)}>
          <QrCode className="h-4 w-4 mr-1" />
          QR
        </Button>
        {n.estado === "pendiente" && (
          <Button variant="outline" type="button" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )}
        {n.estado === "pendiente" && (
          <>
            <Button variant="outline" onClick={() => void cambiarEstado("cumplido")}>
              <Check className="h-4 w-4 mr-1" />
              Cumplido
            </Button>
            <Button variant="destructive" onClick={() => void cambiarEstado("anulado")}>
              <Ban className="h-4 w-4 mr-1" />
              Anular
            </Button>
          </>
        )}
      </div>

      <DetailTemplate>
        <DetailSection title="Datos de la notificación" showSeparator={false}>
          <DetailGrid>
            <DetailField label="Fecha emisión" value={formatDateEsBo(n.created_at.slice(0, 10))} />
            <DetailField label="Fecha límite" value={formatDateEsBo(n.fecha_limite)} />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Actividad económica">
          <DetailGrid>
            <DetailField label="Nombre de la actividad" value={n.nombre_actividad?.trim() || "—"} />
            <DetailField
              label="Licencia / placa / inmueble"
              value={n.numero_identificacion?.trim() || "—"}
            />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Contribuyente">
          <DetailGrid>
            <DetailField label="Nombre" value={n.contribuyente.nombre_completo} />
            <DetailField label="C.I." value={n.contribuyente.ci} />
            <DetailField label="Dirección" value={n.direccion} />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Conceptos y gestiones">
          <DetailGrid>
            <DetailField label="Conceptos" value={conceptos.join(", ") || "—"} />
            <DetailField
              label={NOTIFICACION_GESTIONES_ADEUDADAS_LABEL}
              className="[&_dt]:w-full sm:[&_dt]:w-52 sm:[&_dt]:leading-snug"
              value={
                n.gestiones_adeudadas?.trim() ? (
                  <span className="whitespace-pre-wrap font-medium">{n.gestiones_adeudadas.trim()}</span>
                ) : (
                  "—"
                )
              }
            />
          </DetailGrid>
        </DetailSection>
      </DetailTemplate>

      {qrPayload && (
        <NotificacionQrDialog open={qrOpen} onOpenChange={setQrOpen} payload={qrPayload} />
      )}

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
