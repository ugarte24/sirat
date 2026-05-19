import { getFormularioPublicaFn } from "@/functions/get-formulario-publica";
import type { FormularioQrPayload } from "@/lib/formulario-qr";

export type VerificacionFormularioResult =
  | { ok: true; payload: FormularioQrPayload }
  | { ok: false };

export async function loadVerificacionFormulario(id: string): Promise<VerificacionFormularioResult> {
  try {
    const result = await getFormularioPublicaFn({ data: { id } });
    if (result.ok && result.payload) {
      return { ok: true, payload: result.payload };
    }
  } catch (e) {
    console.warn("[verificacion-formulario] lectura en servidor falló:", e);
  }
  return { ok: false };
}
