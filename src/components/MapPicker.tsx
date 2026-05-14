import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
}

function safeInvalidate(map: L.Map) {
  try {
    map.invalidateSize({ animate: false });
  } catch {
    /* contenedor oculto (p. ej. diálogo cerrándose) o mapa ya destruido */
  }
}

export function MapPicker({ lat, lng, onChange, readOnly, height = "300px", markers }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || mapRef.current) return;

    const initialLat = lat ?? -17.7833;
    const initialLng = lng ?? -63.1821;

    const attachMap = (map: L.Map) => {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      if (lat != null && lng != null) {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }
      if (markers?.length) {
        markers.forEach((m) => {
          const mk = L.marker([m.lat, m.lng]).addTo(map);
          if (m.popup) mk.bindPopup(m.popup);
        });
      }

      if (!readOnly) {
        map.on("click", (e) => {
          try {
            const { lat: la, lng: ln } = e.latlng;
            if (markerRef.current) markerRef.current.setLatLng([la, ln]);
            else markerRef.current = L.marker([la, ln]).addTo(map);
            onChange?.(la, ln);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init una vez; lat/lng iniciales en el primer render
  }, []);

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

  return <div ref={ref} style={{ height }} className="rounded-lg overflow-hidden border" />;
}
