import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { MapDirectionsLink } from "@/components/MapDirectionsLink";
import { Camera, Images, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import type { FormularioAmbienteRow, FormularioNuevoState } from "@/lib/sirat-forms";
import { FormularioAmbientesTable } from "@/components/forms/FormularioAmbientesTable";
import { FORMULARIO_FOTO_MAX_LABEL, FORMULARIO_FOTOS_MAX_COUNT } from "@/lib/formulario-fotos";
import {
  formularioStateToMapMarker,
} from "@/lib/mapa-actividades";

const MapPicker = lazy(() => import("@/components/MapPicker").then((m) => ({ default: m.MapPicker })));

type FormularioEstado = Database["public"]["Enums"]["formulario_estado"];

function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="h-[220px] rounded-lg border bg-muted/30 text-sm text-muted-foreground flex items-center justify-center">
        Preparando mapa…
      </div>
    );
  }
  return <>{children}</>;
}

export type VerificacionPhotoExisting = { id: string; storage_path: string; previewUrl: string };
export type VerificacionPhotoLocal = { file: File; previewUrl: string };

export type FormularioVerificacionEtapaFieldsProps = {
  f: FormularioNuevoState;
  setF: React.Dispatch<React.SetStateAction<FormularioNuevoState>>;
  idPrefix?: string;
  estadoFormulario?: FormularioEstado;
  contribuyenteNombre?: string | null;
  existingPhotos?: VerificacionPhotoExisting[];
  removedPhotoIds?: string[];
  onRemoveExisting?: (id: string) => void;
  localPhotos?: VerificacionPhotoLocal[];
  onRemoveLocal?: (index: number) => void;
  onAddPhotos?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  photoBusy?: boolean;
  maxPhotos?: number;
  ambientes: FormularioAmbienteRow[];
  onAmbientesChange: (rows: FormularioAmbienteRow[]) => void;
  ambientesDisabled?: boolean;
};

export function FormularioVerificacionEtapaFields({
  f,
  setF,
  idPrefix = "ver",
  estadoFormulario = "pendiente_verificacion",
  contribuyenteNombre = null,
  existingPhotos = [],
  removedPhotoIds = [],
  onRemoveExisting,
  localPhotos = [],
  onRemoveLocal,
  onAddPhotos,
  photoBusy = false,
  maxPhotos = FORMULARIO_FOTOS_MAX_COUNT,
  ambientes,
  onAmbientesChange,
  ambientesDisabled = false,
}: FormularioVerificacionEtapaFieldsProps) {
  const marker = useMemo(
    () =>
      formularioStateToMapMarker(
        {
          latitud: f.latitud,
          longitud: f.longitud,
          razon_social: f.razon_social,
          direccion: f.direccion,
          referencia: f.referencia,
          mapa_zoom: f.mapa_zoom,
        },
        estadoFormulario,
        { contribuyenteNombre },
      ),
    [
      f.latitud,
      f.longitud,
      f.razon_social,
      f.direccion,
      f.referencia,
      f.mapa_zoom,
      estadoFormulario,
      contribuyenteNombre,
    ],
  );
  const visibleExisting = existingPhotos.filter((p) => !removedPhotoIds.includes(p.id));
  const totalPhotos = visibleExisting.length + localPhotos.length;
  const canAdd = totalPhotos < maxPhotos && onAddPhotos;

  return (
    <>
      <Card className="p-3 sm:p-4 space-y-3 border-0 shadow-none sm:border sm:shadow-sm">
        <Label>Ubicación registrada</Label>
        {marker ? (
          <>
            <p className="text-xs text-muted-foreground">
              Pulse el pin para ver el nombre de la actividad y el enlace «Cómo llegar».
            </p>
            <ClientOnly>
              <Suspense
                fallback={
                  <div className="h-[180px] sm:h-[220px] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                    Cargando mapa…
                  </div>
                }
              >
                <MapPicker
                  readOnly
                  markers={[marker]}
                  height="clamp(180px, 35vw, 220px)"
                  openPopupOnLoad
                />
              </Suspense>
            </ClientOnly>
            <p className="text-xs text-muted-foreground">
              Lat: {marker.lat.toFixed(6)} • Lng: {marker.lng.toFixed(6)}
            </p>
            <MapDirectionsLink lat={marker.lat} lng={marker.lng} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin ubicación en el registro. Marque la ubicación en la pestaña Registro para verla aquí.
          </p>
        )}
      </Card>

      <Card className="p-3 sm:p-5 space-y-4 border-0 shadow-none sm:border sm:shadow-sm">
        <FormularioAmbientesTable
          rows={ambientes}
          onChange={onAmbientesChange}
          disabled={ambientesDisabled}
        />
        <fieldset className="space-y-2.5 min-w-0">
          <legend className="text-sm font-medium text-foreground">Procedencia *</legend>
          <p className="text-xs text-muted-foreground">Debe seleccionar una de las dos opciones.</p>
          <RadioGroup
            value={
              f.procedente === null
                ? undefined
                : f.procedente
                  ? "procedente"
                  : "no_procedente"
            }
            onValueChange={(v) => setF({ ...f, procedente: v === "procedente" })}
            className="flex flex-col gap-2.5"
          >
            <label className="flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors">
              <RadioGroupItem value="procedente" id={`${idPrefix}-proc-si`} />
              <span className="text-sm font-normal leading-none">Procedente</span>
            </label>
            <label className="flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors">
              <RadioGroupItem value="no_procedente" id={`${idPrefix}-proc-no`} />
              <span className="text-sm font-normal leading-none">No procedente</span>
            </label>
          </RadioGroup>
        </fieldset>

        <fieldset className="space-y-2.5 min-w-0">
          <legend className="text-sm font-medium text-foreground">Padrón y bebidas *</legend>
          <p className="text-xs text-muted-foreground">Debe marcar al menos una de las dos opciones.</p>
          <label className="flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors">
            <Checkbox
              id={`${idPrefix}-padron`}
              checked={f.padron}
              onCheckedChange={(v) => setF({ ...f, padron: !!v })}
            />
            <span className="text-sm font-normal leading-none">Padrón</span>
          </label>
          <label className="flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors">
            <Checkbox
              id={`${idPrefix}-bebidas`}
              checked={f.bebidas_alcoholicas}
              onCheckedChange={(v) => setF({ ...f, bebidas_alcoholicas: !!v })}
            />
            <span className="text-sm font-normal leading-none">Bebidas alcohólicas</span>
          </label>
        </fieldset>

        <div>
          <Label>Observación</Label>
          <Textarea
            value={f.observacion}
            onChange={(e) => setF({ ...f, observacion: e.target.value })}
            className="min-h-[80px]"
          />
        </div>
      </Card>

      {onAddPhotos ? (
        <Card className="p-3 sm:p-5 space-y-3 border-0 shadow-none sm:border sm:shadow-sm">
          <div>
            <Label>Fotografías (máximo {maxPhotos})</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Máximo {maxPhotos} fotos; si superan {FORMULARIO_FOTO_MAX_LABEL} se comprimen automáticamente.
              {photoBusy ? " Comprimiendo…" : ""}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2 sm:flex-wrap">
            {visibleExisting.map((p) => (
              <div key={p.id} className="relative aspect-square sm:h-24 sm:w-24 rounded-lg overflow-hidden border">
                <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                {onRemoveExisting ? (
                  <button
                    type="button"
                    onClick={() => onRemoveExisting(p.id)}
                    className="absolute top-1 right-1 h-6 w-6 sm:h-5 sm:w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </button>
                ) : null}
              </div>
            ))}
            {localPhotos.map((p, i) => (
              <div key={`${p.previewUrl}-${i}`} className="relative aspect-square sm:h-24 sm:w-24 rounded-lg overflow-hidden border">
                <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                {onRemoveLocal ? (
                  <button
                    type="button"
                    onClick={() => onRemoveLocal(i)}
                    className="absolute top-1 right-1 h-6 w-6 sm:h-5 sm:w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </button>
                ) : null}
              </div>
            ))}
            {canAdd ? (
              <>
                <label className="aspect-square sm:h-24 sm:w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted active:bg-muted/80 shrink-0">
                  <Camera className="h-6 w-6 sm:h-5 sm:w-5" aria-hidden />
                  <span className="text-[11px] sm:text-[10px] mt-1 text-center px-0.5 leading-tight">Cámara</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onAddPhotos}
                  />
                </label>
                <label className="aspect-square sm:h-24 sm:w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted active:bg-muted/80 shrink-0">
                  <Images className="h-6 w-6 sm:h-5 sm:w-5" aria-hidden />
                  <span className="text-[11px] sm:text-[10px] mt-1 text-center px-0.5 leading-tight">Galería</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onAddPhotos} />
                </label>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}
    </>
  );
}
