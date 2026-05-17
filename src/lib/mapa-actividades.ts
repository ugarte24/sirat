import type { Database } from "@/integrations/supabase/types";
import type { MapMarkerVariant, MapPickerMarker } from "@/components/MapPicker";
import type { FormularioNuevoState } from "@/lib/sirat-forms";

type FormularioEstado = Database["public"]["Enums"]["formulario_estado"];

export type FormularioMapaRow = {
  id: string;
  latitud: number | null;
  longitud: number | null;
  razon_social: string;
  direccion: string;
  referencia: string;
  estado: FormularioEstado;
  mapa_zoom: number | null;
  contribuyente: { nombre_completo: string } | null;
};

function escHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function estadoEtiquetaMapa(estado: FormularioEstado): string {
  if (estado === "activo") return "Verificada";
  if (estado === "pendiente_verificacion") return "Pendiente de verificación";
  if (estado === "baja") return "Baja";
  return "Anulada";
}

export function googleMapsDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function formularioStateToMapMarker(
  f: Pick<
    FormularioNuevoState,
    "latitud" | "longitud" | "razon_social" | "direccion" | "referencia" | "mapa_zoom"
  >,
  estado: FormularioEstado,
  opts?: { contribuyenteNombre?: string | null },
): MapPickerMarker | null {
  if (
    f.latitud == null ||
    f.longitud == null ||
    !Number.isFinite(f.latitud) ||
    !Number.isFinite(f.longitud)
  ) {
    return null;
  }
  const la = Number(f.latitud);
  const ln = Number(f.longitud);
  const gmaps = googleMapsDirectionsUrl(la, ln);
  const variant: MapMarkerVariant =
    estado === "pendiente_verificacion" ? "pendiente" : "verificado";

  const lines = [
    f.razon_social ? `<strong>${escHtml(String(f.razon_social))}</strong>` : "",
    opts?.contribuyenteNombre ? `Contribuyente: ${escHtml(opts.contribuyenteNombre)}` : "",
    f.direccion ? `Dirección: ${escHtml(f.direccion)}` : "",
    f.referencia ? `Referencia: ${escHtml(f.referencia)}` : "",
    `<p class="sirat-map-popup__link"><a href="${gmaps}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps — cómo llegar</a></p>`,
  ].filter(Boolean);

  return {
    lat: la,
    lng: ln,
    variant,
    mapZoom: f.mapa_zoom,
    popup: `<div class="sirat-map-popup">${lines.join("<br/>")}</div>`,
  };
}

export function formularioRowToMapMarker(f: FormularioMapaRow): MapPickerMarker {
  const la = Number(f.latitud);
  const ln = Number(f.longitud);
  const gmaps = googleMapsDirectionsUrl(la, ln);
  const variant: MapMarkerVariant =
    f.estado === "pendiente_verificacion" ? "pendiente" : "verificado";

  const lines = [
    f.razon_social ? `<strong>${escHtml(String(f.razon_social))}</strong>` : "",
    `<span class="sirat-map-popup__estado">${escHtml(estadoEtiquetaMapa(f.estado))}</span>`,
    f.contribuyente?.nombre_completo
      ? `Contribuyente: ${escHtml(f.contribuyente.nombre_completo)}`
      : "",
    f.direccion ? `Dirección: ${escHtml(f.direccion)}` : "",
    f.referencia ? `Referencia: ${escHtml(f.referencia)}` : "",
    `<p class="sirat-map-popup__link"><a href="${gmaps}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps — cómo llegar</a></p>`,
  ].filter(Boolean);

  return {
    lat: la,
    lng: ln,
    variant,
    mapZoom: f.mapa_zoom,
    popup: `<div class="sirat-map-popup">${lines.join("<br/>")}</div>`,
  };
}
