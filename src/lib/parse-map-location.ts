export type MapCoordinates = { lat: number; lng: number };

function validCoords(lat: number, lng: number): MapCoordinates | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Enlaces cortos de Google Maps no exponen coordenadas en el texto pegado. */
export function isShortMapLink(text: string): boolean {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(text.trim());
}

/** Aproximado para Bolivia (aviso opcional, no bloquea). */
export function isLikelyBoliviaBounds(lat: number, lng: number): boolean {
  return lat >= -23 && lat <= -9 && lng >= -70 && lng <= -57;
}

/**
 * Extrae lat/lng de enlaces de Google Maps, geo: o texto con coordenadas (p. ej. WhatsApp).
 */
export function parseMapLocationInput(raw: string): MapCoordinates | null {
  const text = raw.trim();
  if (!text || isShortMapLink(text)) return null;

  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    decoded = text;
  }

  const patterns: RegExp[] = [
    /[?&](?:q|query)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:ll|center)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /geo:(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
  ];

  for (const re of patterns) {
    const m = decoded.match(re);
    if (m) {
      const c = validCoords(Number(m[1]), Number(m[2]));
      if (c) return c;
    }
  }

  const pair = decoded.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]+\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (pair) {
    return validCoords(Number(pair[1]), Number(pair[2]));
  }

  return null;
}
