import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import type {
  ContribuyenteCatalogRow,
  FormularioAmbienteRow,
  FormularioNuevoState,
} from "@/lib/sirat-forms";
import {
  ambientesRowsForDb,
  calcAmbientesTotal,
  emptyAmbienteRow,
  formularioRegistroToUpdate,
  formularioRowToState,
  formularioVerificacionToUpdate,
  validateFormularioRegistro,
  validateFormularioVerificacion,
} from "@/lib/sirat-forms";
import {
  ambienteRecordsToUiRows,
  fetchFormularioAmbientes,
  replaceFormularioAmbientes,
} from "@/lib/formulario-ambientes";
import { FORMULARIO_VERIFICACION_NOMBRE } from "@/lib/sirat-brand";
import {
  formatFileSize,
  formularioFotoUploadWarning,
  prepareFormularioFotoFile,
  uploadFormularioFotos,
} from "@/lib/formulario-fotos";
import { useContribuyentesCatalog } from "@/hooks/useContribuyentesCatalog";
import { FormularioRegistroEtapaFields } from "@/components/forms/FormularioRegistroEtapaFields";
import {
  FormularioVerificacionEtapaFields,
  type VerificacionPhotoLocal,
} from "@/components/forms/FormularioVerificacionEtapaFields";

type FormEstado = Database["public"]["Enums"]["formulario_estado"];
type ExistingPhoto = { id: string; storage_path: string; previewUrl: string };

function revokeLocalPhotos(items: VerificacionPhotoLocal[]) {
  for (const p of items) URL.revokeObjectURL(p.previewUrl);
}

export type FormularioGestionFormProps = {
  formularioId: string;
  initialTab?: "registro" | "verificacion";
  onSuccess: () => void;
  onCancel?: () => void;
  onPedirAltaContribuyente?: () => void;
  catalogRefreshKey?: number;
  contribuyenteRecienRegistrado?: ContribuyenteCatalogRow | null;
  onContribuyentePreseleccionado?: () => void;
};

export function FormularioGestionForm({
  formularioId,
  initialTab = "registro",
  onSuccess,
  onCancel,
  onPedirAltaContribuyente,
  catalogRefreshKey = 0,
  contribuyenteRecienRegistrado = null,
  onContribuyentePreseleccionado,
}: FormularioGestionFormProps) {
  const { contribs, catalogLoaded, mergeContrib } = useContribuyentesCatalog(catalogRefreshKey);
  const [tab, setTab] = useState(initialTab);
  const [f, setF] = useState<FormularioNuevoState | null>(null);
  const [estado, setEstado] = useState<FormEstado | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyRegistro, setBusyRegistro] = useState(false);
  const [busyVerificacion, setBusyVerificacion] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<VerificacionPhotoLocal[]>([]);
  const newPhotosRef = useRef<VerificacionPhotoLocal[]>([]);
  newPhotosRef.current = newPhotos;
  const [photoBusy, setPhotoBusy] = useState(false);
  const [ambientes, setAmbientes] = useState<FormularioAmbienteRow[]>([emptyAmbienteRow()]);

  useEffect(() => setTab(initialTab), [initialTab, formularioId]);

  useEffect(() => {
    if (!contribuyenteRecienRegistrado) return;
    setF((prev) => (prev ? { ...prev, contribuyente_id: contribuyenteRecienRegistrado.id } : prev));
    mergeContrib(contribuyenteRecienRegistrado);
    onContribuyentePreseleccionado?.();
  }, [contribuyenteRecienRegistrado, mergeContrib, onContribuyentePreseleccionado]);

  useEffect(() => {
    return () => revokeLocalPhotos(newPhotosRef.current);
  }, []);

  useEffect(() => {
    setLoading(true);
    setF(null);
    setEstado(null);
    setExistingPhotos([]);
    setRemovedPhotoIds([]);
    revokeLocalPhotos(newPhotosRef.current);
    setNewPhotos([]);
    setAmbientes([emptyAmbienteRow()]);

    void (async () => {
      try {
        const { data: row, error } = await supabase
          .from("formularios")
          .select("*")
          .eq("id", formularioId)
          .maybeSingle();
        if (error) {
          toast.error(error.message);
          return;
        }
        if (!row) {
          toast.error("Formulario no encontrado");
          onCancel?.();
          return;
        }
        if (row.estado === "baja" || row.estado === "anulado") {
          toast.error("No se puede editar un registro dado de baja o anulado");
          onCancel?.();
          return;
        }

        setF(formularioRowToState(row));
        setEstado(row.estado);

        const ambRecords = await fetchFormularioAmbientes(supabase, formularioId);
        if (ambRecords.length) {
          setAmbientes(ambienteRecordsToUiRows(ambRecords));
        } else {
          setAmbientes([emptyAmbienteRow()]);
        }

        const { data: fotos } = await supabase
          .from("formulario_fotos")
          .select("id, storage_path")
          .eq("formulario_id", formularioId);
        if (fotos?.length) {
          const withUrls = await Promise.all(
            fotos.map(async (p) => {
              const { data: signed } = await supabase.storage
                .from("formulario-fotos")
                .createSignedUrl(p.storage_path, 3600);
              return {
                id: p.id,
                storage_path: p.storage_path,
                previewUrl: signed?.signedUrl ?? "",
              };
            }),
          );
          setExistingPhotos(withUrls);
        }
      } catch (e) {
        console.error(e);
        toast.error("No se pudo cargar el formulario");
      } finally {
        setLoading(false);
      }
    })();
  }, [formularioId, onCancel]);

  const visibleExisting = existingPhotos.filter((p) => !removedPhotoIds.includes(p.id));

  const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const slotsLeft = 2 - visibleExisting.length;
    void (async () => {
      setPhotoBusy(true);
      const pending: VerificacionPhotoLocal[] = [];
      try {
        for (const raw of files) {
          if (slotsLeft - pending.length <= 0) break;
          try {
            const { file, compressed } = await prepareFormularioFotoFile(raw);
            if (compressed) {
              toast.message(`Foto comprimida a ${formatFileSize(file.size)} (era ${formatFileSize(raw.size)}).`);
            }
            pending.push({ file, previewUrl: URL.createObjectURL(file) });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "No se pudo procesar la foto.");
          }
        }
        if (pending.length) {
          setNewPhotos((prev) => {
            const next = [...prev];
            for (const p of pending) {
              if (visibleExisting.length + next.length >= 2) {
                URL.revokeObjectURL(p.previewUrl);
                continue;
              }
              next.push(p);
            }
            return next;
          });
        }
      } finally {
        setPhotoBusy(false);
      }
    })();
  };

  const syncPhotos = async () => {
    for (const photoId of removedPhotoIds) {
      const row = existingPhotos.find((p) => p.id === photoId);
      if (row) {
        await supabase.storage.from("formulario-fotos").remove([row.storage_path]);
        await supabase.from("formulario_fotos").delete().eq("id", photoId);
      }
    }
    const photoSummary = await uploadFormularioFotos(
      supabase,
      formularioId,
      newPhotos.map((p) => p.file),
    );
    const photoWarn = formularioFotoUploadWarning(photoSummary);
    if (photoWarn) toast.warning(photoWarn);
    revokeLocalPhotos(newPhotos);
    setNewPhotos([]);
    setRemovedPhotoIds([]);
  };

  const saveRegistro = async () => {
    if (!f) return;
    const err = validateFormularioRegistro(f);
    if (err) return toast.error(err);

    setBusyRegistro(true);
    const { error } = await supabase
      .from("formularios")
      .update(formularioRegistroToUpdate(f))
      .eq("id", formularioId);
    setBusyRegistro(false);
    if (error) return toast.error(error.message);
    toast.success("Datos de registro actualizados");
  };

  const handleAmbientesChange = (rows: FormularioAmbienteRow[]) => {
    setAmbientes(rows);
    const total = calcAmbientesTotal(rows);
    setF((prev) => (prev ? { ...prev, superficie: total > 0 ? String(total) : "" } : prev));
  };

  const saveVerificacion = async (completar: boolean) => {
    if (!f || !estado) return;
    const err = validateFormularioVerificacion(f, ambientes);
    if (err) return toast.error(err);

    const pendiente = estado === "pendiente_verificacion";
    if (completar && !pendiente) {
      completar = false;
    }

    setBusyVerificacion(true);
    try {
      const total = calcAmbientesTotal(ambientes);
      const fConTotal = { ...f, superficie: String(total) };
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("formularios")
        .update(
          formularioVerificacionToUpdate(fConTotal, {
            completar: completar && pendiente,
            userId: u.user?.id,
          }),
        )
        .eq("id", formularioId);
      if (error) throw new Error(error.message);

      await replaceFormularioAmbientes(supabase, formularioId, ambientesRowsForDb(ambientes));
      await syncPhotos();
    } catch (e) {
      setBusyVerificacion(false);
      return toast.error(e instanceof Error ? e.message : "No se pudo guardar la verificación");
    }

    if (completar && pendiente) {
      setEstado("activo");
      toast.success("Verificación completada");
    } else {
      toast.success(
        pendiente
          ? "Datos de verificación guardados (sigue pendiente hasta completar)"
          : `${FORMULARIO_VERIFICACION_NOMBRE} actualizado`,
      );
    }
    setBusyVerificacion(false);
    onSuccess();
  };

  if (loading || !f || !estado) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Cargando formulario…</p>;
  }

  const pendiente = estado === "pendiente_verificacion";

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "registro" | "verificacion")} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="registro">1. Registro</TabsTrigger>
        <TabsTrigger value="verificacion">2. Verificación</TabsTrigger>
      </TabsList>

      <TabsContent value="registro" className="space-y-4 mt-0">
        <FormularioRegistroEtapaFields
          f={f}
          setF={setF}
          contribs={contribs}
          catalogLoaded={catalogLoaded}
          onPedirAltaContribuyente={onPedirAltaContribuyente}
          onLocateError={(msg) => toast.error(msg)}
          idPrefix={`gest-${formularioId}`}
        />
        <div className="flex gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={busyRegistro}>
              Cancelar
            </Button>
          ) : null}
          <Button
            type="button"
            className="flex-1 h-11 bg-gradient-primary"
            disabled={busyRegistro}
            onClick={() => void saveRegistro()}
          >
            {busyRegistro ? "Guardando…" : "Guardar registro"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="verificacion" className="space-y-4 mt-0">
        <FormularioVerificacionEtapaFields
          f={f}
          setF={setF}
          estadoFormulario={estado}
          contribuyenteNombre={
            contribs.find((c) => c.id === f.contribuyente_id)?.nombre_completo ?? null
          }
          idPrefix={`gest-ver-${formularioId}`}
          ambientes={ambientes}
          onAmbientesChange={handleAmbientesChange}
          existingPhotos={existingPhotos}
          removedPhotoIds={removedPhotoIds}
          onRemoveExisting={(id) => setRemovedPhotoIds((ids) => [...ids, id])}
          localPhotos={newPhotos}
          onRemoveLocal={(i) => {
            setNewPhotos((ph) => {
              const target = ph[i];
              if (target) URL.revokeObjectURL(target.previewUrl);
              return ph.filter((_, idx) => idx !== i);
            });
          }}
          onAddPhotos={addPhoto}
          photoBusy={photoBusy}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          {onCancel ? (
            <Button type="button" variant="outline" className="h-12 sm:h-11" onClick={onCancel} disabled={busyVerificacion}>
              Cancelar
            </Button>
          ) : null}
          {pendiente ? (
            <Button
              type="button"
              className="flex-1 h-12 sm:h-11 bg-gradient-primary text-base sm:text-sm"
              disabled={busyVerificacion}
              onClick={() => void saveVerificacion(true)}
            >
              {busyVerificacion ? "Guardando…" : "Completar verificación"}
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 h-12 sm:h-11 bg-gradient-primary text-base sm:text-sm"
              disabled={busyVerificacion}
              onClick={() => void saveVerificacion(false)}
            >
              {busyVerificacion ? "Guardando…" : "Guardar verificación"}
            </Button>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
