import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ban, FileDown, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { MapPicker } from "@/components/MapPicker";
import { downloadFormularioFoto } from "@/lib/formulario-fotos";
import { generateFormularioPDF, generateFormularioFotosPDF } from "@/lib/pdf";
import { useAuth } from "@/lib/auth";
import { FORMULARIO_VERIFICACION_NOMBRE, FORMULARIO_VERIFICACION_SECCION } from "@/lib/sirat-brand";
import { formatDateEsBo } from "@/lib/date";
import { appendObservacionCambioEstado, type FormularioEstadoAccion } from "@/lib/sirat-forms";
import { ObservacionRequeridaDialog } from "@/components/ObservacionRequeridaDialog";
import {
  DetailBoolean,
  DetailField,
  DetailGrid,
  DetailSection,
  DetailTemplate,
} from "@/components/DetailTemplate";

export const Route = createFileRoute("/_app/formularios/$id")({ component: Detalle });

function Detalle() {
  const { id } = Route.useParams();
  const { role, profile } = useAuth();
  const [f, setF] = useState<any>(null);
  const [photos, setPhotos] = useState<{ url: string; storagePath: string; blob?: Blob }[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [fotosPdfBusy, setFotosPdfBusy] = useState(false);
  const [estadoDialog, setEstadoDialog] = useState<FormularioEstadoAccion | null>(null);
  const mapCaptureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPhotosLoading(true);
      setPhotos([]);
      const { data } = await supabase
        .from("formularios")
        .select("*, contribuyente:contribuyentes(nombre_completo,ci)")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      setF(data);

      const { data: fotos } = await supabase
        .from("formulario_fotos")
        .select("storage_path")
        .eq("formulario_id", id);
      if (cancelled) return;

      if (!fotos?.length) {
        setPhotos([]);
        setPhotosLoading(false);
        return;
      }

      const urls = await Promise.all(
        fotos.map(async (p) => {
          const [{ data: signed }, blob] = await Promise.all([
            supabase.storage.from("formulario-fotos").createSignedUrl(p.storage_path, 3600),
            downloadFormularioFoto(supabase, p.storage_path),
          ]);
          return {
            url: signed?.signedUrl ?? "",
            storagePath: p.storage_path,
            blob: blob ?? undefined,
          };
        }),
      );
      if (cancelled) return;
      setPhotos(urls);
      setPhotosLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!f) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground" asChild>
          <Link to="/formularios">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Volver a {FORMULARIO_VERIFICACION_SECCION.toLowerCase()}
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  const resolvePhotosForPdf = async () =>
    Promise.all(
      photos.map(async (p) => ({
        url: p.url,
        storagePath: p.storagePath,
        blob: (await downloadFormularioFoto(supabase, p.storagePath)) ?? p.blob,
      })),
    );

  const pdf = async () => {
    if (photosLoading) {
      toast.info("Espere a que terminen de cargar las fotos.");
      return;
    }
    setPdfBusy(true);
    try {
      const { fotosIncluidas, fotosSolicitadas } = await generateFormularioPDF({
        id: f.id,
        fecha: f.fecha,
        razon_social: f.razon_social,
        contribuyente_nombre: f.contribuyente.nombre_completo,
        contribuyente_ci: f.contribuyente.ci,
        nit: f.nit,
        zona: f.zona,
        superficie: f.superficie,
        direccion: f.direccion,
        celular: f.celular,
        referencia: f.referencia,
        latitud: f.latitud,
        longitud: f.longitud,
        mapa_zoom: f.mapa_zoom,
        mapCaptureElement: mapCaptureRef.current,
        procedente: f.procedente,
        padron: f.padron,
        bebidas_alcoholicas: f.bebidas_alcoholicas,
        observacion: f.observacion,
        estado: f.estado,
        photos: await resolvePhotosForPdf(),
        usuario: profile?.full_name ?? profile?.email ?? undefined,
      });
      if (fotosSolicitadas > 0 && fotosIncluidas < fotosSolicitadas) {
        toast.warning(
          `PDF generado, pero solo se incluyeron ${fotosIncluidas} de ${fotosSolicitadas} foto(s).`,
        );
      }
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "No se pudo generar el PDF. Compruebe la conexión.",
      );
    } finally {
      setPdfBusy(false);
    }
  };

  const pdfFotos = async () => {
    if (photosLoading) {
      toast.info("Espere a que terminen de cargar las fotos.");
      return;
    }
    const urls = photos.map((p) => p.url).filter(Boolean);
    if (!urls.length) {
      toast.error("No hay fotos para exportar.");
      return;
    }
    setFotosPdfBusy(true);
    try {
      await generateFormularioFotosPDF({
        razon_social: f.razon_social,
        photos: await resolvePhotosForPdf(),
        usuario: profile?.full_name ?? profile?.email ?? undefined,
      });
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "No se pudo generar el PDF de fotos. Compruebe la conexión.",
      );
    } finally {
      setFotosPdfBusy(false);
    }
  };

  const aplicarCambioEstado = async (accion: FormularioEstadoAccion, observacionNueva: string) => {
    const observacion = appendObservacionCambioEstado(f.observacion, accion, observacionNueva);
    const { error } = await supabase
      .from("formularios")
      .update({ estado: accion, observacion })
      .eq("id", id);
    if (error) throw new Error(error.message);
    setF({ ...f, estado: accion, observacion });
    toast.success(accion === "baja" ? "Actividad dada de baja" : "Actividad anulada");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground" asChild>
        <Link to="/formularios">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Volver a {FORMULARIO_VERIFICACION_SECCION.toLowerCase()}
        </Link>
      </Button>

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">{f.razon_social}</h1>
        </div>
        <Badge
          variant={
            f.estado === "activo"
              ? "default"
              : f.estado === "pendiente_verificacion"
                ? "outline"
                : f.estado === "baja"
                  ? "secondary"
                  : "destructive"
          }
        >
          {f.estado === "pendiente_verificacion" ? "Pendiente verificación" : f.estado}
        </Badge>
      </div>

      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 [&_button]:shrink-0 [&_a]:shrink-0">
        {f.estado === "activo" && f.superficie != null && (
          <Button
            type="button"
            size="sm"
            disabled={pdfBusy || photosLoading}
            onClick={() => void pdf()}
            className="bg-gradient-primary"
          >
            <FileDown className="h-4 w-4 shrink-0" />
            <span className="ml-1">PDF</span>
          </Button>
        )}
        {f.estado === "pendiente_verificacion" && (
          <Button variant="default" size="sm" className="bg-gradient-primary shrink-0" asChild>
            <Link to="/formularios" search={{ verificar: id }}>
              <Pencil className="h-4 w-4 shrink-0" />
              <span className="ml-1 whitespace-nowrap">Verificar</span>
            </Link>
          </Button>
        )}
        {(f.estado === "activo" || f.estado === "pendiente_verificacion") && (
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link to="/formularios" search={{ editar: id }}>
              <Pencil className="h-4 w-4 shrink-0" />
              <span className="ml-1">Editar</span>
            </Link>
          </Button>
        )}
        {role === "admin" && f.estado === "activo" && (
          <>
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="shrink-0 whitespace-nowrap"
              onClick={() => setEstadoDialog("baja")}
            >
              Dar de baja
            </Button>
            <Button
              variant="destructive"
              size="sm"
              type="button"
              className="shrink-0 whitespace-nowrap"
              onClick={() => setEstadoDialog("anulado")}
            >
              <Ban className="h-4 w-4 shrink-0" />
              <span className="ml-1">Anular</span>
            </Button>
          </>
        )}
      </div>

      <ObservacionRequeridaDialog
        open={estadoDialog === "baja"}
        onOpenChange={(open) => !open && setEstadoDialog(null)}
        title="Dar de baja"
        description="Registre el motivo. La observación se guardará junto con el cambio de estado."
        confirmLabel="Guardar baja"
        confirmVariant="outline"
        onConfirm={(obs) => aplicarCambioEstado("baja", obs)}
      />
      <ObservacionRequeridaDialog
        open={estadoDialog === "anulado"}
        onOpenChange={(open) => !open && setEstadoDialog(null)}
        title="Anular actividad"
        description="Registre el motivo de la anulación. La observación se guardará junto con el cambio de estado."
        confirmLabel="Guardar anulación"
        confirmVariant="destructive"
        onConfirm={(obs) => aplicarCambioEstado("anulado", obs)}
      />

      <DetailTemplate>
        <DetailSection title="Registro" showSeparator={false}>
          <DetailGrid>
            <DetailField label="Fecha" value={formatDateEsBo(f.fecha)} />
            <DetailField label="Contribuyente" value={f.contribuyente.nombre_completo} />
            <DetailField label="C.I." value={f.contribuyente.ci} />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Actividad económica">
          <DetailGrid>
            <DetailField label="Razón social" value={f.razon_social} />
            <DetailField label="Zona" value={f.zona} />
            <DetailField
              label="Superficie"
              value={
                f.superficie != null ? (
                  `${f.superficie} m²`
                ) : (
                  <span className="font-normal italic text-muted-foreground">
                    Pendiente de verificación
                  </span>
                )
              }
            />
            <DetailField label="NIT" value={f.nit?.trim() || "—"} />
            <DetailField label="Celular" value={f.celular || "—"} />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Ubicación">
          <DetailGrid>
            <DetailField label="Dirección" value={f.direccion} />
            <DetailField label="Referencia" value={f.referencia || "—"} />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Verificación">
          <DetailGrid>
            <DetailField label="Procedente" value={<DetailBoolean value={f.procedente} />} />
            <DetailField label="Padrón" value={<DetailBoolean value={f.padron} />} />
            <DetailField
              label="Bebidas alcohólicas"
              value={<DetailBoolean value={f.bebidas_alcoholicas} />}
            />
            {f.observacion ? (
              <DetailField label="Observación" value={f.observacion} />
            ) : null}
          </DetailGrid>
        </DetailSection>
      </DetailTemplate>

      {(photosLoading || photos.length > 0) && (
        <Card className="p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Fotos de la verificación</p>
            {!photosLoading && photos.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={fotosPdfBusy}
                onClick={() => void pdfFotos()}
              >
                <Printer className="h-4 w-4 mr-1.5" />
                {fotosPdfBusy ? "Generando…" : "PDF para imprimir"}
              </Button>
            )}
          </div>
          {photosLoading ? (
            <p className="text-sm text-muted-foreground">Cargando fotos…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p.url}
                  className="rounded-md object-cover h-40 w-full"
                  alt={`Foto ${i + 1}`}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {f.latitud && (
        <Card className="p-3">
          <div ref={mapCaptureRef}>
            <MapPicker lat={f.latitud} lng={f.longitud} mapZoom={f.mapa_zoom} readOnly staticPreview />
          </div>
        </Card>
      )}
    </div>
  );
}
