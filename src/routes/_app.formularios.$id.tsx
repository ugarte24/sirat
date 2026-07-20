import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Ban, FileDown, MoreHorizontal, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { MapDirectionsLink } from "@/components/MapDirectionsLink";
import { MapPicker } from "@/components/MapPicker";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { PhotoLightboxDialog } from "@/components/PhotoLightboxDialog";
import { downloadFormularioFoto } from "@/lib/formulario-fotos";
import { openPdfBlob } from "@/lib/download-file";
import { prefersPdfInAppPreview } from "@/lib/pdf-present";
import {
  buildFormularioFotosPdfBlob,
  buildFormularioPdfBlob,
  formularioBajaPdfFilename,
} from "@/lib/pdf";
import { useAuth } from "@/lib/auth";
import { FORMULARIO_VERIFICACION_NOMBRE, FORMULARIO_VERIFICACION_SECCION } from "@/lib/sirat-brand";
import { formatDateEsBo } from "@/lib/date";
import { formListSearchFromStorage } from "@/lib/formulario-list-search";
import {
  appendObservacionCambioEstado,
  formularioVerificacionSinCompletar,
  type FormularioEstadoAccion,
} from "@/lib/sirat-forms";
import { ObservacionRequeridaDialog } from "@/components/ObservacionRequeridaDialog";
import { FormularioBajaDialog } from "@/components/FormularioBajaDialog";
import { ejecutarFormularioBaja, fetchFormularioBajaPdfBlob } from "@/lib/formulario-baja";
import {
  ambienteRecordsToPdfRows,
  fetchFormularioAmbientes,
  type FormularioAmbienteRecord,
} from "@/lib/formulario-ambientes";
import { FormularioAmbientesDetalle } from "@/components/FormularioAmbientesDetalle";
import { FormularioVisitasHistorial } from "@/components/FormularioVisitasHistorial";
import { fetchFormularioVisitas, type FormularioVisitaRow } from "@/lib/formulario-visita-verificacion";
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
  const { profile } = useAuth();
  const [f, setF] = useState<any>(null);
  const [photos, setPhotos] = useState<{ url: string; storagePath: string; blob?: Blob }[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [fotosPdfBusy, setFotosPdfBusy] = useState(false);
  const [estadoDialog, setEstadoDialog] = useState<FormularioEstadoAccion | null>(null);
  const [bajaDialogOpen, setBajaDialogOpen] = useState(false);
  const [pdfBajaBusy, setPdfBajaBusy] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{
    blob: Blob;
    filename: string;
    title: string;
  } | null>(null);
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState<number | null>(null);
  const mapCaptureRef = useRef<HTMLDivElement>(null);
  const [ambientes, setAmbientes] = useState<FormularioAmbienteRecord[]>([]);
  const [visitas, setVisitas] = useState<FormularioVisitaRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPhotosLoading(true);
      setPhotos([]);
      setAmbientes([]);
      setVisitas([]);
      const { data } = await supabase
        .from("formularios")
        .select("*, contribuyente:contribuyentes(nombre_completo,ci), tipo_tramite:tipos_tramite(nombre)")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      setF(data);

      try {
        const amb = await fetchFormularioAmbientes(supabase, id);
        if (!cancelled) setAmbientes(amb);
      } catch {
        /* tabla puede no existir aún en entornos sin migrar */
      }

      try {
        const visitaRows = await fetchFormularioVisitas(supabase, id);
        if (!cancelled) setVisitas(visitaRows);
      } catch {
        /* tabla puede no existir aún en entornos sin migrar */
      }

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
          <Link to="/formularios" search={formListSearchFromStorage()}>
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

  const presentPdf = (blob: Blob, filename: string, title: string) => {
    if (prefersPdfInAppPreview()) {
      setPdfPreview({ blob, filename, title });
    } else {
      openPdfBlob(blob, filename);
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
      const { blob, filename } = await buildFormularioFotosPdfBlob({
        razon_social: f.razon_social,
        photos: await resolvePhotosForPdf(),
        usuario: profile?.full_name ?? profile?.email ?? undefined,
      });
      presentPdf(blob, filename, "PDF de fotos");
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "No se pudo generar el PDF de fotos. Compruebe la conexión.",
      );
    } finally {
      setFotosPdfBusy(false);
    }
  };

  const aplicarAnulacion = async (observacionNueva: string) => {
    const observacion = appendObservacionCambioEstado(f.observacion, "anulado", observacionNueva);
    const { error } = await supabase
      .from("formularios")
      .update({ estado: "anulado", observacion })
      .eq("id", id);
    if (error) throw new Error(error.message);
    setF({ ...f, estado: "anulado", observacion });
    toast.success("Actividad anulada");
  };

  const aplicarBaja = async (observacionNueva: string, fotoFiles: File[]) => {
    const usuario = profile?.full_name ?? profile?.email ?? undefined;
    const result = await ejecutarFormularioBaja(supabase, {
      formularioId: id,
      observacionNueva,
      fotoFiles,
      observacionActual: f.observacion,
      mapCaptureElement: mapCaptureRef.current,
      usuario,
      pdfBase: {
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
      },
    });
    setF({
      ...f,
      estado: "baja",
      observacion: result.observacion,
      baja_at: result.baja_at,
      baja_pdf_path: result.baja_pdf_path,
    });
    if (result.fotosSubidas > 0) {
      toast.success(`Actividad dada de baja. ${result.fotosSubidas} foto(s) registradas.`);
    } else {
      toast.success("Actividad dada de baja. PDF de baja guardado.");
    }
  };

  const pdfVerificacion = async () => {
    if (photosLoading) {
      toast.info("Espere a que terminen de cargar las fotos.");
      return;
    }
    setPdfBusy(true);
    try {
      let inspectorNombre: string | null = null;
      if (f.verificado_por) {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", f.verificado_por)
          .maybeSingle();
        inspectorNombre = perfil?.full_name?.trim() || null;
      }
      const { blob, filename, fotosIncluidas, fotosSolicitadas } = await buildFormularioPdfBlob({
        id: f.id,
        fecha: f.fecha,
        razon_social: f.razon_social,
        contribuyente_nombre: f.contribuyente.nombre_completo,
        contribuyente_ci: f.contribuyente.ci,
        tipo_tramite_nombre: f.tipo_tramite?.nombre,
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
        estado: f.estado === "baja" ? "activo" : f.estado,
        photos: await resolvePhotosForPdf(),
        usuario: profile?.full_name ?? profile?.email ?? undefined,
        inspector_nombre: inspectorNombre,
        ambientes: ambienteRecordsToPdfRows(ambientes),
      });
      presentPdf(
        blob,
        filename,
        f.estado === "baja" ? "PDF registro" : "Vista previa del PDF",
      );
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

  const pdfBaja = async () => {
    if (!f.baja_pdf_path) {
      toast.error("No hay PDF de baja guardado para esta actividad.");
      return;
    }
    setPdfBajaBusy(true);
    try {
      const { blob, filename } = await fetchFormularioBajaPdfBlob(
        supabase,
        f.baja_pdf_path,
        formularioBajaPdfFilename(f.razon_social),
      );
      presentPdf(blob, filename, "PDF de baja");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el PDF de baja.");
    } finally {
      setPdfBajaBusy(false);
    }
  };

  const puedePdfVerificacion =
    (f.estado === "activo" || f.estado === "baja") && f.superficie != null;

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground" asChild>
        <Link to="/formularios" search={formListSearchFromStorage()}>
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

      <div className="flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 [&_button]:shrink-0 [&_a]:shrink-0">
        {puedePdfVerificacion && (
          <Button
            type="button"
            size="sm"
            disabled={pdfBusy || photosLoading}
            onClick={() => void pdfVerificacion()}
            className="bg-gradient-primary shrink-0"
          >
            <FileDown className="h-4 w-4 shrink-0" />
            <span className="ml-1 whitespace-nowrap">
              {f.estado === "baja" ? "PDF registro" : "PDF"}
            </span>
          </Button>
        )}
        {f.estado === "baja" && f.baja_pdf_path && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pdfBajaBusy}
            onClick={() => void pdfBaja()}
            className="shrink-0"
          >
            <FileDown className="h-4 w-4 shrink-0" />
            <span className="ml-1 whitespace-nowrap">PDF baja</span>
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
        {f.estado === "activo" && (
          <div className="ml-auto shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" type="button" className="gap-1.5">
                  <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Más acciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => setBajaDialogOpen(true)}>
                  Dar de baja
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setEstadoDialog("anulado")}
                >
                  <Ban className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                  Anular
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <FormularioBajaDialog
        open={bajaDialogOpen}
        onOpenChange={setBajaDialogOpen}
        onConfirm={aplicarBaja}
      />
      <PdfPreviewDialog
        open={pdfPreview != null}
        onOpenChange={(open) => {
          if (!open) setPdfPreview(null);
        }}
        blob={pdfPreview?.blob ?? null}
        filename={pdfPreview?.filename ?? "documento.pdf"}
        title={pdfPreview?.title}
      />
      <ObservacionRequeridaDialog
        open={estadoDialog === "anulado"}
        onOpenChange={(open) => !open && setEstadoDialog(null)}
        title="Anular actividad"
        description="Registre el motivo de la anulación. La observación se guardará junto con el cambio de estado."
        confirmLabel="Guardar anulación"
        confirmVariant="destructive"
        onConfirm={aplicarAnulacion}
      />

      <DetailTemplate>
        <DetailSection title="Registro" showSeparator={false}>
          <DetailGrid>
            <DetailField label="Fecha" value={formatDateEsBo(f.fecha)} />
            {f.estado === "baja" && f.baja_at ? (
              <DetailField label="Fecha de baja" value={formatDateEsBo(f.baja_at.slice(0, 10))} />
            ) : null}
            <DetailField label="Contribuyente" value={f.contribuyente.nombre_completo} />
            <DetailField label="C.I." value={f.contribuyente.ci} />
            <DetailField label="Tipo de trámite" value={f.tipo_tramite?.nombre ?? "—"} />
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
        {ambientes.length > 0 ? (
          <DetailSection title="Medición de ambientes">
            <FormularioAmbientesDetalle rows={ambientes} />
          </DetailSection>
        ) : null}
        <DetailSection title="Ubicación">
          <DetailGrid>
            <DetailField label="Dirección" value={f.direccion} />
            <DetailField label="Referencia" value={f.referencia || "—"} />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Verificación">
          <DetailGrid>
            <DetailField
              label="Procedente"
              value={
                <DetailBoolean
                  value={formularioVerificacionSinCompletar(f) ? null : f.procedente}
                />
              }
            />
            <DetailField
              label="Padrón"
              value={
                <DetailBoolean value={formularioVerificacionSinCompletar(f) ? null : f.padron} />
              }
            />
            <DetailField
              label="Bebidas alcohólicas"
              value={
                <DetailBoolean
                  value={formularioVerificacionSinCompletar(f) ? null : f.bebidas_alcoholicas}
                />
              }
            />
            {f.observacion ? (
              <DetailField label="Observación" value={f.observacion} />
            ) : null}
          </DetailGrid>
        </DetailSection>
        {visitas.length > 0 ? (
          <DetailSection title="Visitas sin verificar">
            <FormularioVisitasHistorial visitas={visitas} compact />
          </DetailSection>
        ) : null}
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
                <button
                  key={i}
                  type="button"
                  className="group relative overflow-hidden rounded-md border bg-muted/30 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setPhotoLightboxIndex(i)}
                  aria-label={`Ver foto ${i + 1} ampliada`}
                >
                  <img
                    src={p.url}
                    className="h-40 w-full object-cover transition-opacity group-hover:opacity-90"
                    alt={`Foto ${i + 1}`}
                  />
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      <PhotoLightboxDialog
        open={photoLightboxIndex != null && photos.length > 0}
        onOpenChange={(open) => {
          if (!open) setPhotoLightboxIndex(null);
        }}
        urls={photos.map((p) => p.url)}
        index={photoLightboxIndex ?? 0}
        onIndexChange={setPhotoLightboxIndex}
        title="Foto"
      />

      {f.latitud && (
        <Card className="p-3 space-y-2">
          <div ref={mapCaptureRef}>
            <MapPicker
              lat={f.latitud}
              lng={f.longitud}
              mapZoom={f.mapa_zoom}
              readOnly
              staticPreview
            />
          </div>
          <MapDirectionsLink lat={f.latitud} lng={f.longitud} />
        </Card>
      )}
    </div>
  );
}
