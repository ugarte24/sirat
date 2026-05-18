export type MapCoordinates = { lat: number; lng: number };

function validCoords(lat: number, lng: number): MapCoordinates | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Enlaces cortos de Google Maps (WhatsApp suele enviar solo estos). */
export function isShortMapLink(text: string): boolean {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(text.trim());
}

const MAP_RESOLVE_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "google.com",
  "maps.google.com",
  "www.google.com",
]);

export function isAllowedMapResolveUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (MAP_RESOLVE_HOSTS.has(host)) return true;
    return host.endsWith(".google.com") || host.endsWith(".goo.gl");
  } catch {
    return false;
  }
}

/** Extrae la primera URL de mapa del texto pegado (mensaje de WhatsApp). */
export function extractMapUrlFromText(text: string): string | null {
  const t = text.trim();
  const http = t.match(/https?:\/\/[^\s<>"']+/i);
  if (http) {
    return http[0].replace(/[.,;:!?)]+$/, "");
  }
  if (/^(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/\S+/i.test(t)) {
    return `https://${t.split(/\s/)[0]}`;
  }
  return null;
}

/** Aproximado para Bolivia (aviso opcional, no bloquea). */
export function isLikelyBoliviaBounds(lat: number, lng: number): boolean {
  return lat >= -23 && lat <= -9 && lng >= -70 && lng <= -57;
}

const COORD_NUM = String.raw`-?\d+(?:\.\d+)?`;
/** Par lat,lng; Google a veces usa «,+» antes de la longitud (p. ej. /search/-11.00,+-66.06). */
const COORD_PAIR = new RegExp(
  `(${COORD_NUM})\\s*,\\s*\\+?\\s*(${COORD_NUM})`,
  "i",
);

function matchCoordPair(decoded: string, re: RegExp): MapCoordinates | null {
  const m = decoded.match(re);
  if (!m) return null;
  return validCoords(Number(m[1]), Number(m[2]));
}

/**
 * Extrae lat/lng de enlaces de Google Maps, geo: o texto con coordenadas (p. ej. WhatsApp).
 */
export function parseMapLocationInput(raw: string): MapCoordinates | null {
  const text = raw.trim();
  if (!text) return null;
  if (isShortMapLink(text) && !text.includes("?")) return null;

  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    decoded = text;
  }

  const patterns: RegExp[] = [
    new RegExp(`[?&](?:q|query)=${COORD_PAIR.source}`, "i"),
    new RegExp(`@\\s*${COORD_PAIR.source}`),
    new RegExp(`[?&](?:ll|center)=${COORD_PAIR.source}`, "i"),
    new RegExp(`/search/${COORD_PAIR.source}`, "i"),
    new RegExp(`geo:${COORD_PAIR.source}`, "i"),
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
    /!8m2!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
    new RegExp(`/${COORD_PAIR.source}(?:[,\\?\\/]|$)`),
  ];

  for (const re of patterns) {
    const c = matchCoordPair(decoded, re);
    if (c) return c;
  }

  const pair = decoded.match(
    new RegExp(`(${COORD_NUM})\\s*[,;\\s+]+\\s*\\+?\\s*(${COORD_NUM})`),
  );
  if (pair) {
    return validCoords(Number(pair[1]), Number(pair[2]));
  }

  return null;
}
