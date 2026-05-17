import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContribuyenteCombobox } from "@/components/ContribuyenteCombobox";
import { toast } from "sonner";
import { ClipboardPaste } from "lucide-react";
import type { ContribuyenteCatalogRow, FormularioNuevoState } from "@/lib/sirat-forms";
import { isLikelyBoliviaBounds } from "@/lib/parse-map-location";
import { resolveMapLocationFromText } from "@/lib/resolve-map-location-client";

const MapPicker = lazy(() => import("@/components/MapPicker").then((m) => ({ default: m.MapPicker })));

function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="h-[300px] rounded-lg border bg-muted/30 text-sm text-muted-foreground flex items-center justify-center">
        Preparando mapa…
      </div>
    );
  }
  return <>{children}</>;
}

export type FormularioRegistroEtapaFieldsProps = {
  f: FormularioNuevoState;
  setF: React.Dispatch<React.SetStateAction<FormularioNuevoState>>;
  contribs: ContribuyenteCatalogRow[];
  catalogLoaded: boolean;
  onPedirAltaContribuyente?: () => void;
  onLocateError?: (msg: string) => void;
  idPrefix?: string;
};

export function FormularioRegistroEtapaFields({
  f,
  setF,
  contribs,
  catalogLoaded,
  onPedirAltaContribuyente,
  onLocateError,
  idPrefix = "reg",
}: FormularioRegistroEtapaFieldsProps) {
  const [ubicacionPegada, setUbicacionPegada] = useState("");
  const [resolviendoUbicacion, setResolviendoUbicacion] = useState(false);

  const aplicarUbicacionPegada = () => {
    void (async () => {
      setResolviendoUbicacion(true);
      try {
        const result = await resolveMapLocationFromText(ubicacionPegada);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        setF({ ...f, latitud: result.lat, longitud: result.lng });
        if (!isLikelyBoliviaBounds(result.lat, result.lng)) {
          toast.warning("Las coordenadas quedan fuera de Bolivia; verifique que sean correctas.");
        } else {
          toast.success(`Ubicación aplicada: ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`);
        }
      } catch (e) {
        console.error(e);
        toast.error("Error al resolver la ubicación. Intente de nuevo.");
      } finally {
        setResolviendoUbicacion(false);
      }
    })();
  };

  return (
    <>
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
          {onPedirAltaContribuyente ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0 h-auto mt-1"
              onClick={onPedirAltaContribuyente}
            >
              + Registrar nuevo contribuyente
            </Button>
          ) : null}
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

      <Card className="p-5 space-y-3 border-0 shadow-none sm:border sm:shadow-sm">
        <Label>Ubicación geográfica *</Label>
        <p className="text-xs text-muted-foreground">
          Marque en el mapa, use «Mi ubicación» o pegue el enlace de ubicación (también maps.app.goo.gl).
        </p>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-ubicacion-pegada`} className="text-xs font-normal text-muted-foreground">
            Pegar enlace de ubicación
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${idPrefix}-ubicacion-pegada`}
              value={ubicacionPegada}
              onChange={(e) => setUbicacionPegada(e.target.value)}
              placeholder="https://maps.app.goo.gl/... o coordenadas"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  aplicarUbicacionPegada();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              disabled={resolviendoUbicacion}
              onClick={aplicarUbicacionPegada}
            >
              <ClipboardPaste className="h-4 w-4 mr-1.5" />
              {resolviendoUbicacion ? "Resolviendo…" : "Usar ubicación"}
            </Button>
          </div>
        </div>
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
              onLocateError={onLocateError}
            />
          </Suspense>
        </ClientOnly>
        {f.latitud != null && f.longitud != null && (
          <p className="text-xs text-muted-foreground">
            Lat: {f.latitud.toFixed(6)} • Lng: {f.longitud.toFixed(6)}
          </p>
        )}
      </Card>
    </>
  );
}
