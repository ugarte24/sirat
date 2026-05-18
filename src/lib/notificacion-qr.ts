export const NOTIFICACION_QR_VERSION = 1 as const;

/** Datos embebidos en el QR (misma información que el PDF, sin firmas). */
export type NotificacionQrPayload = {
  t: "notificacion";
  v: typeof NOTIFICACION_QR_VERSION;
  id: string;
  fecha_emision: string;
  fecha_limite: string;
  contribuyente_nombre: string;
  contribuyente_ci: string;
  nombre_actividad: string;
  numero_identificacion: string;
  direccion: string;
  conceptos: string[];
  gestiones_adeudadas: string;
};

export function buildNotificacionQrPayload(input: {
  id: string;
  created_at: string;
  fecha_limite: string;
  contribuyente_nombre: string;
  contribuyente_ci: string;
  nombre_actividad: string | null;
  numero_identificacion: string | null;
  direccion: string;
  conceptos: string[];
  gestiones_adeudadas: string | null;
}): NotificacionQrPayload {
  return {
    t: "notificacion",
    v: NOTIFICACION_QR_VERSION,
    id: input.id,
    fecha_emision: input.created_at.slice(0, 10),
    fecha_limite: input.fecha_limite,
    contribuyente_nombre: input.contribuyente_nombre,
    contribuyente_ci: input.contribuyente_ci,
    nombre_actividad: input.nombre_actividad?.trim() || "—",
    numero_identificacion: input.numero_identificacion?.trim() || "—",
    direccion: input.direccion,
    conceptos: input.conceptos,
    gestiones_adeudadas: input.gestiones_adeudadas?.trim() || "—",
  };
}

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(encoded: string): string {
  const pad = encoded.length % 4 === 0 ? "" : "=".repeat(4 - (encoded.length % 4));
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeNotificacionQrPayload(payload: NotificacionQrPayload): string {
  return base64UrlEncode(JSON.stringify(payload));
}

export function decodeNotificacionQrPayload(encoded: string): NotificacionQrPayload | null {
  try {
    const data = JSON.parse(base64UrlDecode(encoded)) as NotificacionQrPayload;
    if (data?.t !== "notificacion" || data?.v !== NOTIFICACION_QR_VERSION) return null;
    if (!data.id || !data.contribuyente_ci) return null;
    return data;
  } catch {
    return null;
  }
}

/** Origen público para enlaces del QR (producción: definir VITE_PUBLIC_APP_URL). */
export function notificacionQrPublicOrigin(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://sirat.vercel.app";
}

/** URL pública de verificación (QR en pantalla o en el PDF). */
export function buildNotificacionVerificacionUrl(id: string): string {
  return `${notificacionQrPublicOrigin()}/verificacion/${id}`;
}

/**
 * URL corta para el QR (solo id). Así la cámara lo lee bien; los datos se cargan del servidor al abrir.
 * El parámetro ?d= queda solo como respaldo en enlaces largos, no en el QR.
 */
export function buildNotificacionQrUrl(payload: NotificacionQrPayload): string {
  return buildNotificacionVerificacionUrl(payload.id);
}

/** Enlace con datos embebidos (respaldo si el servidor no responde); no usar en QR. */
export function buildNotificacionQrUrlWithEmbeddedData(payload: NotificacionQrPayload): string {
  const encoded = encodeURIComponent(encodeNotificacionQrPayload(payload));
  return `${notificacionQrPublicOrigin()}/verificacion/${payload.id}?d=${encoded}`;
}
