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
import type { FormularioNuevoState } from "@/lib/sirat-forms";
import { FORMULARIO_FOTO_MAX_LABEL } from "@/lib/formulario-fotos";
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
  maxPhotos = 2,
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
      <Card className="p-4 space-y-3 border-0 shadow-none sm:border sm:shadow-sm">
        <Label>Ubicación registrada</Label>
        {marker ? (
          <>
            <p className="text-xs text-muted-foreground">
              Pulse el pin para ver el nombre de la actividad y el enlace «Cómo llegar».
            </p>
            <ClientOnly>
              <Suspense
                fallback={
                  <div className="h-[220px] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                    Cargando mapa…
                  </div>
                }
              >
                <MapPicker
                  readOnly
                  markers={[marker]}
                  height="220px"
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

      <Card className="p-5 space-y-4 border-0 shadow-none sm:border sm:shadow-sm">
        <div>
          <Label>Superficie (m²) *</Label>
          <Input
            type="number"
            step="0.01"
            value={f.superficie}
            onChange={(e) => setF({ ...f, superficie: e.target.value })}
            required
          />
        </div>
        <fieldset className="space-y-2 min-w-0">
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
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="procedente" id={`${idPrefix}-proc-si`} />
              <Label htmlFor={`${idPrefix}-proc-si`} className="cursor-pointer font-normal leading-none">
                Procedente
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no_procedente" id={`${idPrefix}-proc-no`} />
              <Label htmlFor={`${idPrefix}-proc-no`} className="cursor-pointer font-normal leading-none">
                No procedente
              </Label>
            </div>
          </RadioGroup>
        </fieldset>

        <fieldset className="space-y-2 min-w-0">
          <legend className="text-sm font-medium text-foreground">Padrón y bebidas *</legend>
          <p className="text-xs text-muted-foreground">Debe marcar al menos una de las dos opciones.</p>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${idPrefix}-padron`}
              checked={f.padron}
              onCheckedChange={(v) => setF({ ...f, padron: !!v })}
            />
            <Label htmlFor={`${idPrefix}-padron`} className="cursor-pointer font-normal leading-none">
              Padrón
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${idPrefix}-bebidas`}
              checked={f.bebidas_alcoholicas}
              onCheckedChange={(v) => setF({ ...f, bebidas_alcoholicas: !!v })}
            />
            <Label htmlFor={`${idPrefix}-bebidas`} className="cursor-pointer font-normal leading-none">
              Bebidas alcohólicas
            </Label>
          </div>
        </fieldset>

        <div>
          <Label>Observación</Label>
          <Textarea value={f.observacion} onChange={(e) => setF({ ...f, observacion: e.target.value })} />
        </div>
      </Card>

      {onAddPhotos ? (
        <Card className="p-5 space-y-3 border-0 shadow-none sm:border sm:shadow-sm">
          <div>
            <Label>Fotografías (máximo {maxPhotos})</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Máximo {maxPhotos} fotos; si superan {FORMULARIO_FOTO_MAX_LABEL} se comprimen automáticamente.
              {photoBusy ? " Comprimiendo…" : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {visibleExisting.map((p) => (
              <div key={p.id} className="relative h-24 w-24 rounded-lg overflow-hidden border">
                <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                {onRemoveExisting ? (
                  <button
                    type="button"
                    onClick={() => onRemoveExisting(p.id)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ))}
            {localPhotos.map((p, i) => (
              <div key={`${p.previewUrl}-${i}`} className="relative h-24 w-24 rounded-lg overflow-hidden border">
                <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                {onRemoveLocal ? (
                  <button
                    type="button"
                    onClick={() => onRemoveLocal(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ))}
            {canAdd ? (
              <div className="flex gap-2 flex-wrap">
                <label className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted shrink-0">
                  <Camera className="h-5 w-5" aria-hidden />
                  <span className="text-[10px] mt-1 text-center px-0.5 leading-tight">Cámara</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onAddPhotos}
                  />
                </label>
                <label className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted shrink-0">
                  <Images className="h-5 w-5" aria-hidden />
                  <span className="text-[10px] mt-1 text-center px-0.5 leading-tight">Galería</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onAddPhotos} />
                </label>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </>
  );
}
