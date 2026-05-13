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

export function MapPicker({ lat, lng, onChange, readOnly, height = "300px", markers }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const initialLat = lat ?? -17.7833; // Cochabamba default
    const initialLng = lng ?? -63.1821;
    const map = L.map(ref.current).setView([initialLat, initialLng], 13);
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
        const { lat: la, lng: ln } = e.latlng;
        if (markerRef.current) markerRef.current.setLatLng([la, ln]);
        else markerRef.current = L.marker([la, ln]).addTo(map);
        onChange?.(la, ln);
      });
    }

    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (lat != null && lng != null) {
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      else markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }
  }, [lat, lng]);

  return <div ref={ref} style={{ height }} className="rounded-lg overflow-hidden border" />;
}
