import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { MapDirectionsLink } from "@/components/MapDirectionsLink";
import { LocateFixed } from "lucide-react";

// fix default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type MapMarkerVariant = "verificado" | "pendiente";

export type MapPickerMarker = {
  lat: number;
  lng: number;
  popup?: string;
  /** Color del pin en mapas de actividades (por defecto verificado/azul). */
  variant?: MapMarkerVariant;
  /** Zoom guardado de la actividad (solo útil con un marcador). */
  mapZoom?: number | null;
};

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  height?: string;
  markers?: MapPickerMarker[];
  /** Si falla la geolocalización (permiso denegado, timeout, etc.) */
  onLocateError?: (message: string) => void;
  /** Incrementar tras pegar enlace/coords para centrar el mapa con zoom de calle (sin afectar clics en el mapa). */
  centerToCoordsToken?: number;
  /** Zoom guardado (p. ej. desde BD); si null, vista por defecto. */
  mapZoom?: number | null;
  onZoomChange?: (zoom: number) => void;
  /** Abre el popup del único marcador al cargar (vista de una actividad). */
  openPopupOnLoad?: boolean;
  /**
   * Mapa fijo en detalle: sin arrastre ni zoom; en móvil el gesto desplaza la página.
   * Usar solo en vistas de solo lectura (p. ej. detalle de formulario).
   */
  staticPreview?: boolean;
  /** Muestra enlace «Cómo llegar en Google Maps» debajo del mapa (vistas de solo lectura). */
  directionsLink?: boolean;
}

/** Zoom por defecto al abrir el mapa editable sin valor guardado. */
const DEFAULT_MAP_ZOOM = 13;

const MARKER_ICON_CACHE: Partial<Record<MapMarkerVariant, L.DivIcon>> = {};

const PIN_COLORS: Record<MapMarkerVariant, string> = {
  verificado: "#2563eb",
  pendiente: "#ea580c",
};

/** Pin tipo gota; viewBox con margen superior para que no se corte la punta redonda. */
export function mapMarkerPinSvg(variant: MapMarkerVariant, width = 32): string {
  const fill = PIN_COLORS[variant];
  const height = Math.round((width * 44) / 32);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="${width}" height="${height}" aria-hidden="true" style="display:block;overflow:visible">
  <path fill="${fill}" stroke="#ffffff" stroke-width="2.25" stroke-linejoin="round" style="filter:drop-shadow(0 1.5px 2px rgba(15,23,42,0.35))" d="M16 4C9.4 4 4 9.4 4 16c0 7.2 12 24 12 24s12-16.8 12-24c0-6.6-5.4-12-12-12z"/>
  <circle cx="16" cy="16" r="5" fill="#ffffff" fill-opacity="0.95"/>
</svg>`;
}

export function createSiratMapMarkerIcon(variant: MapMarkerVariant = "verificado"): L.DivIcon {
  return getMarkerIcon(variant);
}

function getMarkerIcon(variant: MapMarkerVariant): L.DivIcon {
  const cached = MARKER_ICON_CACHE[variant];
  if (cached) return cached;
  const icon = L.divIcon({
    className: "sirat-map-marker-wrap",
    html: mapMarkerPinSvg(variant, 32),
    iconSize: [32, 44],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });
  MARKER_ICON_CACHE[variant] = icon;
  return icon;
}
/** Zoom de calle (Mi ubicación, Usar ubicación y mapas de solo lectura). */
const UBICACION_MAP_ZOOM = 17;

function resolveMapZoom(mapZoom: number | null | undefined, readOnly?: boolean): number {
  if (mapZoom != null && Number.isFinite(mapZoom)) {
    if (readOnly && mapZoom < UBICACION_MAP_ZOOM) return UBICACION_MAP_ZOOM;
    return mapZoom;
  }
  return readOnly ? UBICACION_MAP_ZOOM : DEFAULT_MAP_ZOOM;
}

function safeInvalidate(map: L.Map) {
  try {
    map.invalidateSize({ animate: false });
  } catch {
    /* contenedor oculto (p. ej. diálogo cerrándose) o mapa ya destruido */
  }
}

function leafletMapOptions(staticPreview: boolean): L.MapOptions {
  if (!staticPreview) return {};
  return {
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    zoomControl: false,
  };
}

function lockMapInteraction(map: L.Map) {
  map.dragging.disable();
  map.touchZoom.disable();
  map.doubleClickZoom.disable();
  map.scrollWheelZoom.disable();
  map.boxZoom.disable();
  map.keyboard.disable();
  map.zoomControl?.remove();
}

export function MapPicker({
  lat,
  lng,
  onChange,
  readOnly,
  height = "300px",
  markers,
  onLocateError,
  centerToCoordsToken = 0,
  mapZoom,
  onZoomChange,
  openPopupOnLoad = false,
  staticPreview = false,
  directionsLink = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  /** Marcadores de solo lectura (`markers` prop), actualizables cuando llegan datos asíncronos */
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const prevCenterTokenRef = useRef(centerToCoordsToken);
  const appliedSavedZoomRef = useRef(false);
  const markersViewSigRef = useRef("");
  const markersPopupOpenedRef = useRef(false);

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
        map.on("zoomend", () => {
          onZoomChangeRef.current?.(map.getZoom());
        });
      }

      requestAnimationFrame(() => safeInvalidate(map));
      window.setTimeout(() => safeInvalidate(map), 200);
      window.setTimeout(() => safeInvalidate(map), 500);
    };

    const tryCreate = (): boolean => {
      if (!el.isConnected || mapRef.current) return false;
      if (el.clientWidth <= 0 || el.clientHeight <= 0) return false;
      const initialZoom = resolveMapZoom(mapZoom, readOnly);
      const map = L.map(el, leafletMapOptions(staticPreview)).setView([initialLat, initialLng], initialZoom);
      if (staticPreview) lockMapInteraction(map);
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

    if (!markers?.length) {
      layer.clearLayers();
      markersViewSigRef.current = "";
      markersPopupOpenedRef.current = false;
      return;
    }

    if (markers.length === 1) {
      const m = markers[0];
      const viewSig = `${m.lat},${m.lng},${m.mapZoom ?? ""}`;
      if (markersViewSigRef.current === viewSig && layer.getLayers().length === 1) {
        const existing = layer.getLayers()[0];
        if (existing instanceof L.Marker && m.popup) {
          existing.setPopupContent(m.popup);
        }
        return;
      }
      if (markersViewSigRef.current !== viewSig) {
        markersPopupOpenedRef.current = false;
      }
      markersViewSigRef.current = viewSig;
    } else {
      markersViewSigRef.current = "";
      markersPopupOpenedRef.current = false;
    }

    layer.clearLayers();
    markers.forEach((m, i) => {
      const mk = L.marker([m.lat, m.lng], {
        icon: getMarkerIcon(m.variant ?? "verificado"),
      }).addTo(layer);
      if (m.popup) mk.bindPopup(m.popup);
      if (openPopupOnLoad && markers.length === 1 && i === 0 && !markersPopupOpenedRef.current) {
        markersPopupOpenedRef.current = true;
        window.setTimeout(() => {
          try {
            mk.openPopup();
          } catch {
            /* */
          }
        }, 350);
      }
    });
    try {
      if (markers.length === 1) {
        const z = resolveMapZoom(markers[0].mapZoom, readOnly);
        map.setView([markers[0].lat, markers[0].lng], z);
      } else {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
      }
      requestAnimationFrame(() => safeInvalidate(map));
    } catch {
      /* coordenadas inválidas */
    }
  }, [markers, openPopupOnLoad, readOnly]);

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
      }
    } catch {
      /* */
    }
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedSavedZoomRef.current) return;
    if (lat == null || lng == null) return;
    try {
      const z = resolveMapZoom(mapZoom, readOnly);
      map.setView([lat, lng], z);
      appliedSavedZoomRef.current = true;
      requestAnimationFrame(() => safeInvalidate(map));
    } catch {
      /* */
    }
  }, [lat, lng, mapZoom, readOnly]);

  useEffect(() => {
    if (centerToCoordsToken === prevCenterTokenRef.current) return;
    prevCenterTokenRef.current = centerToCoordsToken;
    if (!centerToCoordsToken) return;
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return;
    try {
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      else markerRef.current = L.marker([lat, lng]).addTo(map);
      map.setView([lat, lng], UBICACION_MAP_ZOOM);
      onZoomChangeRef.current?.(UBICACION_MAP_ZOOM);
      requestAnimationFrame(() => safeInvalidate(map));
    } catch {
      /* */
    }
    // Solo al incrementar centerToCoordsToken (Usar ubicación), no en cada clic del mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerToCoordsToken]);

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
        const z = Math.max(map.getZoom(), UBICACION_MAP_ZOOM);
        map.setView([la, ln], z);
        if (markerRef.current) markerRef.current.setLatLng([la, ln]);
        else markerRef.current = L.marker([la, ln]).addTo(map);
        onChangeRef.current?.(la, ln);
        onZoomChangeRef.current?.(z);
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

  const mapBlock = (
    <div
      className={`relative rounded-lg overflow-hidden border${staticPreview ? " sirat-map-static-preview" : ""}`}
      style={{ height }}
    >
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

  if (!directionsLink) return mapBlock;

  return (
    <div className="space-y-2">
      {mapBlock}
      <MapDirectionsLink lat={lat} lng={lng} />
    </div>
  );
}
