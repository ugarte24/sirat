import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, FileDown, Check, Ban, Pencil, QrCode, BellRing, MoreHorizontal, RotateCcw } from "lucide-react";
import { RenotificarDialog } from "@/components/RenotificarDialog";
import {
  notificacionNumeroLabel,
  registrarRenotificacion,
  type NotificacionHistorialRow,
} from "@/lib/notificacion-renotificar";
import { NotificacionQrDialog } from "@/components/NotificacionQrDialog";
import { MapPicker } from "@/components/MapPicker";
import { buildNotificacionQrPayload } from "@/lib/notificacion-qr";
import { toast } from "sonner";
import { generateNotificacionPDF } from "@/lib/pdf";
import { useAuth } from "@/lib/auth";
import { notificacionConceptosMarcados } from "@/lib/sirat-forms";
import { formatDateEsBo } from "@/lib/date";
import { NOTIFICACION_GESTIONES_ADEUDADAS_LABEL } from "@/lib/sirat-brand";
import { appendObservacionSeguimiento } from "@/lib/sirat-forms";
import { ObservacionRequeridaDialog } from "@/components/ObservacionRequeridaDialog";

export const Route = createFileRoute("/_app/notificaciones/$id")({ component: Detalle });

function notifEstadoBadgeLabel(estado: string): string {
  if (estado === "cumplido") return "Cumplido";
  if (estado === "anulado") return "Anulado";
  return "Pendiente";
}

function notifEstadoBadgeVariant(
  estado: string,
): "default" | "destructive" | "outline" | "secondary" {
  if (estado === "cumplido") return "default";
  if (estado === "anulado") return "destructive";
  return "outline";
}

function Detalle() {
  const { id } = Route.useParams();
  const { profile, role } = useAuth();
  const [n, setN] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [anularOpen, setAnularOpen] = useState(false);
  const [renotificarOpen, setRenotificarOpen] = useState(false);
  const [cumplidoOpen, setCumplidoOpen] = useState(false);
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [estadoBusy, setEstadoBusy] = useState(false);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("notificaciones")
      .select(
        "*, contribuyente:contribuyentes(nombre_completo,ci), historial:notificacion_historial(numero, fecha_limite, created_at, observacion)",
      )
      .eq("id", id)
      .order("numero", { referencedTable: "notificacion_historial", ascending: false })
      .maybeSingle();
    setN(data);
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const conceptos = useMemo(() => (n ? notificacionConceptosMarcados(n) : []), [n]);

  const contrib = n?.contribuyente as { nombre_completo: string; ci: string } | null | undefined;

  const qrPayload = useMemo(
    () =>
      n
        ? buildNotificacionQrPayload({
            id,
            created_at: n.created_at,
            fecha_limite: n.fecha_limite,
            contribuyente_nombre: contrib?.nombre_completo ?? "—",
            contribuyente_ci: contrib?.ci ?? "—",
            nombre_actividad: n.nombre_actividad,
            numero_identificacion: n.numero_identificacion,
            direccion: n.direccion,
            conceptos,
            gestiones_adeudadas: n.gestiones_adeudadas,
            veces_notificado: n.veces_notificado ?? 1,
          })
        : null,
    [id, n, conceptos, contrib],
  );

  const historial = (n?.historial ?? []) as NotificacionHistorialRow[];
  const veces = n?.veces_notificado ?? 1;
  const esAdmin = role === "admin";
  /** Operador y admin: cumplido/anular en pendiente. Solo admin: reabrir en cumplido. */
  const showMasAcciones = n?.estado === "pendiente" || (n?.estado === "cumplido" && esAdmin);

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
      id,
      fecha: n.created_at.slice(0, 10),
      contribuyente_nombre: contrib?.nombre_completo ?? "—",
      contribuyente_ci: contrib?.ci ?? "—",
      nombre_actividad: n.nombre_actividad,
      numero_identificacion: n.numero_identificacion,
      direccion: n.direccion,
      fecha_limite: n.fecha_limite,
      conceptos,
      gestiones_adeudadas: n.gestiones_adeudadas,
      veces_notificado: veces,
      usuario: profile?.full_name ?? profile?.email ?? undefined,
    });
  };

  const renotificar = async (nuevaFechaLimite: string, observacion: string) => {
    const { data: u } = await supabase.auth.getUser();
    await registrarRenotificacion({
      notificacionId: id,
      nuevaFechaLimite,
      observacion: observacion || undefined,
      userId: u.user?.id,
    });
    toast.success("Renotificación registrada");
    await reload();
  };

  const marcarCumplido = async () => {
    setEstadoBusy(true);
    try {
      const { error } = await supabase
        .from("notificaciones")
        .update({ estado: "cumplido" })
        .eq("id", id)
        .eq("estado", "pendiente");
      if (error) throw new Error(error.message);
      setN({ ...n, estado: "cumplido" });
      toast.success("Notificación marcada como cumplida");
      setCumplidoOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setEstadoBusy(false);
    }
  };

  const reabrirConObservacion = async (observacionNueva: string) => {
    const observacion_seguimiento = appendObservacionSeguimiento(
      n.observacion_seguimiento,
      "REABIERTO",
      observacionNueva,
    );
    const { error } = await supabase
      .from("notificaciones")
      .update({ estado: "pendiente", observacion_seguimiento })
      .eq("id", id)
      .eq("estado", "cumplido");
    if (error) throw new Error(error.message);
    setN({ ...n, estado: "pendiente", observacion_seguimiento });
    toast.success("Notificación reabierta como pendiente");
    await reload();
  };

  const anularConObservacion = async (observacionNueva: string) => {
    const observacion_seguimiento = appendObservacionSeguimiento(
      n.observacion_seguimiento,
      "ANULADO",
      observacionNueva,
    );
    const { error } = await supabase
      .from("notificaciones")
      .update({ estado: "anulado", observacion_seguimiento })
      .eq("id", id);
    if (error) throw new Error(error.message);
    setN({ ...n, estado: "anulado", observacion_seguimiento });
    toast.success("Notificación anulada");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground" asChild>
        <Link to="/notificaciones">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Volver a notificaciones
        </Link>
      </Button>

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {n.nombre_actividad?.trim() || contrib?.nombre_completo || "Notificación"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {notificacionNumeroLabel(veces)}
          </Badge>
          <Badge variant={notifEstadoBadgeVariant(n.estado)}>{notifEstadoBadgeLabel(n.estado)}</Badge>
        </div>
      </div>

      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 [&_button]:shrink-0">
        <Button
          type="button"
          size="sm"
          onClick={() => void pdf()}
          className="bg-gradient-primary shrink-0"
        >
          <FileDown className="h-4 w-4 shrink-0" />
          <span className="ml-1">PDF</span>
        </Button>
        <Button variant="outline" size="sm" type="button" className="shrink-0" onClick={() => setQrOpen(true)}>
          <QrCode className="h-4 w-4 shrink-0" />
          <span className="ml-1">QR</span>
        </Button>
        {n.estado === "pendiente" && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="shrink-0"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4 shrink-0" />
            <span className="ml-1">Editar</span>
          </Button>
        )}
        {n.estado === "pendiente" && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="shrink-0 whitespace-nowrap"
            onClick={() => setRenotificarOpen(true)}
          >
            <BellRing className="h-4 w-4 shrink-0" />
            <span className="ml-1">Volver a notificar</span>
          </Button>
        )}
        {showMasAcciones && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" type="button" className="shrink-0 gap-1.5">
                <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                <span>Más acciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {n.estado === "pendiente" && (
                <>
                  <DropdownMenuItem onSelect={() => setCumplidoOpen(true)}>
                    <Check className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                    Marcar cumplida
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setAnularOpen(true)}
                  >
                    <Ban className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                    Anular
                  </DropdownMenuItem>
                </>
              )}
              {n.estado === "cumplido" && esAdmin && (
                <DropdownMenuItem onSelect={() => setReabrirOpen(true)}>
                  <RotateCcw className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                  Reabrir (volver a pendiente)
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog open={cumplidoOpen} onOpenChange={setCumplidoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como cumplida?</AlertDialogTitle>
            <AlertDialogDescription>
              La notificación dejará de aparecer como pendiente. Podrá reabrirla después si fue un
              error (con observación en seguimiento).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={estadoBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={estadoBusy}
              onClick={(e) => {
                e.preventDefault();
                void marcarCumplido();
              }}
            >
              {estadoBusy ? "Guardando…" : "Sí, marcar cumplida"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ObservacionRequeridaDialog
        open={reabrirOpen}
        onOpenChange={setReabrirOpen}
        title="Reabrir notificación (solo administrador)"
        description="Registre el motivo. La notificación volverá a estado pendiente y la observación quedará en seguimiento. Esta acción no está disponible para operadores."
        confirmLabel="Reabrir"
        confirmVariant="outline"
        onConfirm={reabrirConObservacion}
      />

      <ObservacionRequeridaDialog
        open={anularOpen}
        onOpenChange={setAnularOpen}
        title="Anular notificación"
        description="Registre el motivo. La observación se guardará antes de anular la notificación."
        confirmLabel="Guardar anulación"
        confirmVariant="destructive"
        onConfirm={anularConObservacion}
      />

      <RenotificarDialog
        open={renotificarOpen}
        onOpenChange={setRenotificarOpen}
        fechaLimiteActual={n.fecha_limite}
        onConfirm={renotificar}
      />

      <DetailTemplate>
        <DetailSection title="Contribuyente" showSeparator={false}>
          <DetailGrid>
            <DetailField label="Fecha emisión" value={formatDateEsBo(n.created_at.slice(0, 10))} />
            <DetailField label="Contribuyente" value={contrib?.nombre_completo ?? "—"} />
            <DetailField label="C.I." value={contrib?.ci ?? "—"} />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Notificación tributaria">
          <DetailGrid>
            <DetailField label="Nombre de la actividad" value={n.nombre_actividad?.trim() || "—"} />
            <DetailField
              label="Licencia / placa / inmueble"
              value={n.numero_identificacion?.trim() || "—"}
            />
            <DetailField label="Dirección" value={n.direccion} />
            <DetailField label="Conceptos" value={conceptos.join(", ") || "—"} />
            <DetailField label="Fecha límite" value={formatDateEsBo(n.fecha_limite)} />
            <DetailField
              label={NOTIFICACION_GESTIONES_ADEUDADAS_LABEL}
              value={
                n.gestiones_adeudadas?.trim() ? (
                  <span className="whitespace-pre-wrap">{n.gestiones_adeudadas.trim()}</span>
                ) : (
                  "—"
                )
              }
            />
          </DetailGrid>
        </DetailSection>
        {n.observacion_seguimiento ? (
          <DetailSection title="Seguimiento">
            <DetailGrid>
              <DetailField
                label="Observación"
                value={
                  <span className="whitespace-pre-wrap font-medium">{n.observacion_seguimiento}</span>
                }
              />
            </DetailGrid>
          </DetailSection>
        ) : null}
        {historial.length > 0 ? (
          <DetailSection title="Historial de fechas límite">
            <div className="overflow-x-auto rounded-md border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">N.º</th>
                    <th className="px-3 py-2">Fecha límite</th>
                    <th className="px-3 py-2">Registrado</th>
                    <th className="px-3 py-2">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.numero} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 font-medium">{h.numero}</td>
                      <td className="px-3 py-2">{formatDateEsBo(h.fecha_limite)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDateEsBo(h.created_at.slice(0, 10))}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {h.observacion?.trim() || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailSection>
        ) : null}
      </DetailTemplate>

      {n.latitud != null && n.longitud != null && (
        <Card className="p-3">
          <MapPicker
            lat={n.latitud}
            lng={n.longitud}
            mapZoom={n.mapa_zoom}
            readOnly
            staticPreview
            directionsLink
          />
        </Card>
      )}

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
