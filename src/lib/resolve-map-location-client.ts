import { resolveMapLocationFn } from "@/functions/resolve-map-location";
import { parseMapLocationInput } from "@/lib/parse-map-location";

export type ResolveMapLocationResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; message: string };

/** Coordenadas desde texto, enlace largo o enlace corto (vía servidor). */
export async function resolveMapLocationFromText(text: string): Promise<ResolveMapLocationResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, message: "Pegue un enlace de Google Maps o las coordenadas." };
  }

  const direct = parseMapLocationInput(trimmed);
  if (direct) return { ok: true, lat: direct.lat, lng: direct.lng };

  const result = await resolveMapLocationFn({ data: { text: trimmed } });
  if (result.ok) return { ok: true, lat: result.lat, lng: result.lng };

  if (result.code === "fetch_failed") {
    return {
      ok: false,
      message: "No se pudo abrir el enlace. Compruebe la conexión o pegue las coordenadas (lat, lng).",
    };
  }
  if (result.code === "no_coords") {
    return {
      ok: false,
      message: "El enlace no devolvió coordenadas. Pruebe copiar el enlace desde el navegador o pegar lat, lng.",
    };
  }
  return {
    ok: false,
    message: "No se reconoció la ubicación. Pegue el enlace (maps.app.goo.gl) o coordenadas.",
  };
}
