import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { LocateFixed } from "lucide-react";

// fix default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  height?: string;
  markers?: { lat: number; lng: number; popup?: string }[];
  /** Si falla la geolocalización (permiso denegado, timeout, etc.) */
  onLocateError?: (message: string) => void;
}

function safeInvalidate(map: L.Map) {
  try {
    map.invalidateSize({ animate: false });
  } catch {
    /* contenedor oculto (p. ej. diálogo cerrándose) o mapa ya destruido */
  }
}

export function MapPicker({ lat, lng, onChange, readOnly, height = "300px", markers, onLocateError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  /** Marcadores de solo lectura (`markers` prop), actualizables cuando llegan datos asíncronos */
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = ref.current;
    if (!el || mapRef.current) return;

    /** Centro por defecto: Riberalta (Beni) */
    const initialLat = lat ?? -10.996;
    const initialLng = lng ?? -66.062;

    const attachMap = (map: L.Map) => {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);

      if (lat != null && lng != null) {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      if (!readOnly) {
        map.on("click", (e) => {
          try {
            const { lat: la, lng: ln } = e.latlng;
            if (markerRef.current) markerRef.current.setLatLng([la, ln]);
            else markerRef.current = L.marker([la, ln]).addTo(map);
            onChangeRef.current?.(la, ln);
          } catch {
            /* clic con mapa en estado inconsistente */
          }
        });
      }

      requestAnimationFrame(() => safeInvalidate(map));
      window.setTimeout(() => safeInvalidate(map), 200);
      window.setTimeout(() => safeInvalidate(map), 500);
    };

    const tryCreate = (): boolean => {
      if (!el.isConnected || mapRef.current) return false;
      if (el.clientWidth <= 0 || el.clientHeight <= 0) return false;
      const map = L.map(el).setView([initialLat, initialLng], 13);
      attachMap(map);
      return true;
    };

    if (tryCreate()) {
      return () => {
        if (mapRef.current) {
          try {
            mapRef.current.remove();
          } catch {
            /* */
          }
          mapRef.current = null;
        }
        markerRef.current = null;
        markersLayerRef.current = null;
      };
    }

    const ro = new ResizeObserver(() => {
      if (tryCreate()) ro.disconnect();
    });
    ro.observe(el);

    const fallback = window.setTimeout(() => {
      tryCreate();
      ro.disconnect();
    }, 1200);

    return () => {
      clearTimeout(fallback);
      ro.disconnect();
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* */
        }
        mapRef.current = null;
      }
      markerRef.current = null;
      markersLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init una vez; lat/lng iniciales en el primer render
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!markers?.length) return;
    markers.forEach((m) => {
      const mk = L.marker([m.lat, m.lng]).addTo(layer);
      if (m.popup) mk.bindPopup(m.popup);
    });
    try {
      if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lng], Math.max(map.getZoom(), 15));
      } else {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
      }
      requestAnimationFrame(() => safeInvalidate(map));
    } catch {
      /* coordenadas inválidas */
    }
  }, [markers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const c = map.getContainer();
      if (!c?.isConnected) return;
    } catch {
      return;
    }
    try {
      if (lat != null && lng != null) {
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else markerRef.current = L.marker([lat, lng]).addTo(map);
        map.setView([lat, lng], map.getZoom());
      }
    } catch {
      /* */
    }
  }, [lat, lng]);

  const handleLocate = () => {
    if (readOnly) return;
    if (!navigator.geolocation) {
      onLocateError?.("Este dispositivo no permite obtener la ubicación.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        const map = mapRef.current;
        if (!map) return;
        const z = Math.max(map.getZoom(), 17);
        map.setView([la, ln], z);
        if (markerRef.current) markerRef.current.setLatLng([la, ln]);
        else markerRef.current = L.marker([la, ln]).addTo(map);
        onChangeRef.current?.(la, ln);
        requestAnimationFrame(() => safeInvalidate(map));
      },
      (err) => {
        if (err.code === 1) {
          onLocateError?.("Permiso de ubicación denegado. Actívelo en el navegador para usar «Mi ubicación».");
        } else if (err.code === 2) {
          onLocateError?.("No se pudo determinar la posición (sin señal).");
        } else if (err.code === 3) {
          onLocateError?.("Tiempo de espera agotado al obtener la ubicación.");
        } else {
          onLocateError?.("No se pudo obtener la ubicación.");
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  return (
    <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
      <div ref={ref} className="h-full w-full min-h-[200px]" />
      {!readOnly && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute top-2 right-2 z-[1000] shadow-md gap-1.5"
          onClick={handleLocate}
        >
          <LocateFixed className="h-4 w-4 shrink-0" aria-hidden />
          Mi ubicación
        </Button>
      )}
    </div>
  );
}
