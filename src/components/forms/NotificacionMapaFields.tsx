import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const MapPicker = lazy(() => import("@/components/MapPicker").then((m) => ({ default: m.MapPicker })));

function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="h-[280px] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        Cargando mapa…
      </div>
    );
  }
  return children;
}

export type NotificacionMapaFieldsProps = {
  latitud: number | null;
  longitud: number | null;
  mapa_zoom: number | null;
  onChange: (patch: {
    latitud?: number | null;
    longitud?: number | null;
    mapa_zoom?: number | null;
  }) => void;
};

export function NotificacionMapaFields({ latitud, longitud, mapa_zoom, onChange }: NotificacionMapaFieldsProps) {
  return (
    <div className="space-y-2 min-w-0">
      <Label>Ubicación en mapa (opcional)</Label>
      <p className="text-xs text-muted-foreground">
        Toque el mapa o use «Mi ubicación» para marcar el punto de la notificación.
      </p>
      <ClientOnly>
        <Suspense
          fallback={
            <div className="h-[280px] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
              Cargando mapa…
            </div>
          }
        >
          <MapPicker
            lat={latitud}
            lng={longitud}
            mapZoom={mapa_zoom}
            onChange={(la, ln) => onChange({ latitud: la, longitud: ln })}
            onZoomChange={(z) => onChange({ mapa_zoom: z })}
            onLocateError={(msg) => toast.error(msg)}
          />
        </Suspense>
      </ClientOnly>
      {latitud != null && longitud != null && (
        <p className="text-xs text-muted-foreground">
          Lat: {latitud.toFixed(6)} • Lng: {longitud.toFixed(6)}
        </p>
      )}
    </div>
  );
}

