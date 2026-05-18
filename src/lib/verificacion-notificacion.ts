import { getNotificacionPublicaFn } from "@/functions/get-notificacion-publica";
import {
  decodeNotificacionQrPayload,
  type NotificacionQrPayload,
} from "@/lib/notificacion-qr";

export type VerificacionNotificacionSearch = {
  d?: string;
};

export type VerificacionNotificacionResult =
  | { ok: true; payload: NotificacionQrPayload }
  | { ok: false };

export function parseVerificacionSearch(search: Record<string, unknown>): VerificacionNotificacionSearch {
  return { d: typeof search.d === "string" ? search.d : undefined };
}

function payloadFromSearch(id: string, d?: string): NotificacionQrPayload | null {
  if (!d) return null;
  const decoded = decodeNotificacionQrPayload(d);
  if (!decoded || decoded.id !== id) return null;
  return decoded;
}

export async function loadVerificacionNotificacion(
  id: string,
  d?: string,
): Promise<VerificacionNotificacionResult> {
  const fromQr = payloadFromSearch(id, d);

  try {
    const result = await getNotificacionPublicaFn({ data: { id } });
    if (result.ok && result.payload) {
      return { ok: true, payload: result.payload };
    }
  } catch (e) {
    console.warn("[verificacion] lectura en servidor falló, se usa respaldo del QR:", e);
  }

  if (fromQr) return { ok: true, payload: fromQr };
  return { ok: false };
}
