import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ContribuyenteCombobox } from "@/components/ContribuyenteCombobox";
import { toast } from "sonner";
import { Camera, Images, X } from "lucide-react";
import type {
  ContribuyenteCatalogRow,
  FormularioAmbienteRow,
  FormularioNuevoState,
} from "@/lib/sirat-forms";
import {
  ambientesRowsForDb,
  calcAmbientesTotal,
  emptyAmbienteRow,
  formularioRowToState,
  formularioStateToUpdate,
  validateFormularioAmbientes,
} from "@/lib/sirat-forms";
import {
  ambienteRecordsToUiRows,
  fetchFormularioAmbientes,
  replaceFormularioAmbientes,
} from "@/lib/formulario-ambientes";
import { FormularioAmbientesTable } from "@/components/forms/FormularioAmbientesTable";
import { FORMULARIO_VERIFICACION_NOMBRE } from "@/lib/sirat-brand";
import {
  FORMULARIO_FOTO_MAX_LABEL,
  formatFileSize,
  formularioFotoUploadWarning,
  prepareFormularioFotoFile,
  uploadFormularioFotos,
} from "@/lib/formulario-fotos";

const MapPicker = lazy(() => import("@/components/MapPicker").then((m) => ({ default: m.MapPicker })));

type LocalPhoto = { file: File; previewUrl: string };
type ExistingPhoto = { id: string; storage_path: string; previewUrl: string };

function revokeLocalPhotos(items: LocalPhoto[]) {
  for (const p of items) URL.revokeObjectURL(p.previewUrl);
}

export type FormularioEditarFormProps = {
  formularioId: string;
  onSuccess: () => void;
  onCancel?: () => void;
};

function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <div
        className="h-[300px] rounded-lg border bg-muted/30 text-sm text-muted-foreground flex items-center justify-center"
        aria-busy="true"
      >
        Preparando mapa…
      </div>
    );
  }
  return <>{children}</>;
}

export function FormularioEditarForm({ formularioId, onSuccess, onCancel }: FormularioEditarFormProps) {
  const [contribs, setContribs] = useState<ContribuyenteCatalogRow[]>([]);
  const [f, setF] = useState<FormularioNuevoState | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<LocalPhoto[]>([]);
  const newPhotosRef = useRef<LocalPhoto[]>([]);
  newPhotosRef.current = newPhotos;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [ambientes, setAmbientes] = useState<FormularioAmbienteRow[]>([emptyAmbienteRow()]);

  useEffect(() => {
    return () => revokeLocalPhotos(newPhotosRef.current);
  }, []);

  useEffect(() => {
    setLoading(true);
    setF(null);
    setExistingPhotos([]);
    setRemovedPhotoIds([]);
    revokeLocalPhotos(newPhotosRef.current);
    setNewPhotos([]);
    setAmbientes([emptyAmbienteRow()]);

    void (async () => {
      try {
        const [formRes, cr] = await Promise.all([
          supabase.from("formularios").select("*").eq("id", formularioId).maybeSingle(),
          supabase.from("contribuyentes").select("id,ci,nombre_completo").order("nombre_completo"),
        ]);
        if (cr.error) toast.error(`Contribuyentes: ${cr.error.message}`);
        setContribs(cr.data ?? []);
        setCatalogLoaded(true);

        if (formRes.error) {
          toast.error(formRes.error.message);
          return;
        }
        if (!formRes.data) {
          toast.error("Formulario no encontrado");
          return;
        }
        if (formRes.data.estado !== "activo") {
          toast.error(`Solo se pueden editar registros activos del ${FORMULARIO_VERIFICACION_NOMBRE.toLowerCase()}`);
          onCancel?.();
          return;
        }

        setF(formularioRowToState(formRes.data));

        const ambRecords = await fetchFormularioAmbientes(supabase, formularioId);
        if (ambRecords.length) {
          setAmbientes(ambienteRecordsToUiRows(ambRecords));
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
  const totalPhotos = visibleExisting.length + newPhotos.length;

  const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const slotsLeft = 2 - visibleExisting.length;
    void (async () => {
      setPhotoBusy(true);
      const pending: LocalPhoto[] = [];
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f) return;
    if (!f.contribuyente_id) return toast.error("Selecciona un contribuyente");
    const ambErr = validateFormularioAmbientes(ambientes);
    if (ambErr) return toast.error(ambErr);
    if (!f.padron && !f.bebidas_alcoholicas) {
      return toast.error("Marque al menos una opción: Padrón o Bebidas alcohólicas.");
    }
    if (
      f.latitud == null ||
      f.longitud == null ||
      !Number.isFinite(f.latitud) ||
      !Number.isFinite(f.longitud)
    ) {
      return toast.error("Marque la ubicación en el mapa o use «Mi ubicación».");
    }

    setBusy(true);
    try {
      const total = calcAmbientesTotal(ambientes);
      const fConTotal = { ...f, superficie: String(total) };
      const { error } = await supabase
        .from("formularios")
        .update(formularioStateToUpdate(fConTotal))
        .eq("id", formularioId);
      if (error) throw new Error(error.message);

      await replaceFormularioAmbientes(supabase, formularioId, ambientesRowsForDb(ambientes));
    } catch (e) {
      setBusy(false);
      return toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }

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

    revokeLocalPhotos(newPhotos);
    setNewPhotos([]);
    setBusy(false);
    toast.success(`${FORMULARIO_VERIFICACION_NOMBRE} actualizado`);
    const photoWarn = formularioFotoUploadWarning(photoSummary);
    if (photoWarn) toast.warning(photoWarn);
    onSuccess();
  };

  if (loading || !f) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Cargando formulario…</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="p-5 space-y-4 border-0 shadow-none sm:border sm:shadow-sm">
        <div>
          <Label>Contribuyente *</Label>
          <ContribuyenteCombobox
            contribs={contribs}
            value={f.contribuyente_id}
            onValueChange={(v) => setF({ ...f, contribuyente_id: v })}
            disabled={!catalogLoaded}
            placeholder={catalogLoaded ? "Seleccionar contribuyente" : "Cargando…"}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Razón social *</Label>
            <Input
              value={f.razon_social}
              onChange={(e) => setF({ ...f, razon_social: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>NIT (opcional)</Label>
            <Input value={f.nit} onChange={(e) => setF({ ...f, nit: e.target.value })} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Zona *</Label>
            <Select value={f.zona} onValueChange={(v) => setF({ ...f, zona: v as FormularioNuevoState["zona"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["A", "B", "C", "D", "E"].map((z) => (
                  <SelectItem key={z} value={z}>
                    Zona {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Celular *</Label>
            <Input value={f.celular} onChange={(e) => setF({ ...f, celular: e.target.value })} required />
          </div>
        </div>
        <div>
          <Label>Dirección (barrio y avenida) *</Label>
          <Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} required />
        </div>
        <div>
          <Label>Referencia *</Label>
          <Input value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} required />
        </div>
      </Card>

      <Card className="p-5 border-0 shadow-none sm:border sm:shadow-sm">
        <FormularioAmbientesTable
          rows={ambientes}
          onChange={(rows) => {
            setAmbientes(rows);
            const total = calcAmbientesTotal(rows);
            setF((prev) => (prev ? { ...prev, superficie: total > 0 ? String(total) : "" } : prev));
          }}
          disabled={busy}
        />
      </Card>

      <Card className="p-5 space-y-3 border-0 shadow-none sm:border sm:shadow-sm">
        <Label>Ubicación geográfica *</Label>
        <ClientOnly>
          <Suspense
            fallback={
              <div className="h-[300px] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                Cargando mapa…
              </div>
            }
          >
            <MapPicker
              lat={f.latitud}
              lng={f.longitud}
              onChange={(la, ln) => setF({ ...f, latitud: la, longitud: ln })}
              onLocateError={(msg) => toast.error(msg)}
            />
          </Suspense>
        </ClientOnly>
        {f.latitud != null && f.longitud != null && (
          <p className="text-xs text-muted-foreground">
            Lat: {f.latitud.toFixed(6)} • Lng: {f.longitud.toFixed(6)}
          </p>
        )}
      </Card>

      <Card className="p-5 space-y-4 border-0 shadow-none sm:border sm:shadow-sm">
        <fieldset className="space-y-2 min-w-0">
          <legend className="text-sm font-medium text-foreground">Procedencia</legend>
          <RadioGroup
            value={f.procedente ? "procedente" : "no_procedente"}
            onValueChange={(v) => setF({ ...f, procedente: v === "procedente" })}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="procedente" id="edit-form-proc-si" />
              <Label htmlFor="edit-form-proc-si" className="cursor-pointer font-normal leading-none">
                Procedente
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no_procedente" id="edit-form-proc-no" />
              <Label htmlFor="edit-form-proc-no" className="cursor-pointer font-normal leading-none">
                No procedente
              </Label>
            </div>
          </RadioGroup>
        </fieldset>

        <fieldset className="space-y-2 min-w-0">
          <legend className="text-sm font-medium text-foreground">Padrón y bebidas *</legend>
          <div className="flex items-center gap-2">
            <Checkbox id="edit-form-padron" checked={f.padron} onCheckedChange={(v) => setF({ ...f, padron: !!v })} />
            <Label htmlFor="edit-form-padron" className="cursor-pointer font-normal leading-none">
              Padrón
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-form-bebidas"
              checked={f.bebidas_alcoholicas}
              onCheckedChange={(v) => setF({ ...f, bebidas_alcoholicas: !!v })}
            />
            <Label htmlFor="edit-form-bebidas" className="cursor-pointer font-normal leading-none">
              Bebidas alcohólicas
            </Label>
          </div>
        </fieldset>

        <div>
          <Label>Observación</Label>
          <Textarea value={f.observacion} onChange={(e) => setF({ ...f, observacion: e.target.value })} />
        </div>
      </Card>

      <Card className="p-5 space-y-3 border-0 shadow-none sm:border sm:shadow-sm">
        <Label>Fotografías (máximo 2)</Label>
        <p className="text-xs text-muted-foreground">
          Máximo 2 fotos; si superan {FORMULARIO_FOTO_MAX_LABEL} se comprimen automáticamente.
          {photoBusy ? " Comprimiendo…" : ""}
        </p>
        <div className="flex gap-2 flex-wrap">
          {visibleExisting.map((p) => (
            <div key={p.id} className="relative h-24 w-24 rounded-lg overflow-hidden border">
              <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setRemovedPhotoIds((ids) => [...ids, p.id])}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {newPhotos.map((p, i) => (
            <div key={`${p.previewUrl}-${i}`} className="relative h-24 w-24 rounded-lg overflow-hidden border">
              <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(p.previewUrl);
                  setNewPhotos((ph) => ph.filter((_, idx) => idx !== i));
                }}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {totalPhotos < 2 && (
            <div className="flex gap-2 flex-wrap">
              <label className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted shrink-0">
                <Camera className="h-5 w-5" aria-hidden />
                <span className="text-[10px] mt-1">Cámara</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={addPhoto} />
              </label>
              <label className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted shrink-0">
                <Images className="h-5 w-5" aria-hidden />
                <span className="text-[10px] mt-1">Galería</span>
                <input type="file" accept="image/*" className="hidden" onChange={addPhoto} />
              </label>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={busy} className="flex-1 h-11 bg-gradient-primary">
          {busy ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
