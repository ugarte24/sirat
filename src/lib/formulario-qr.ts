import { notificacionQrPublicOrigin } from "@/lib/notificacion-qr";

export const FORMULARIO_QR_VERSION = 1 as const;

/** Datos públicos del formulario (misma información principal que el PDF). */
export type FormularioQrPayload = {
  t: "formulario";
  v: typeof FORMULARIO_QR_VERSION;
  id: string;
  fecha: string;
  razon_social: string;
  contribuyente_nombre: string;
  contribuyente_ci: string;
  nit: string;
  zona: string;
  superficie: number | null;
  direccion: string;
  celular: string;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  mapa_zoom: number | null;
  procedente: boolean;
  padron: boolean;
  bebidas_alcoholicas: boolean;
  observacion: string;
  estado: string;
  ambientes: FormularioQrAmbiente[];
};

export type FormularioQrAmbiente = {
  orden: number;
  ambiente: string;
  largo: number;
  ancho: number;
};

export function buildFormularioQrPayload(input: {
  id: string;
  fecha: string;
  razon_social: string;
  contribuyente_nombre: string;
  contribuyente_ci: string;
  nit: string | null;
  zona: string;
  superficie: number | null;
  direccion: string;
  celular: string;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  mapa_zoom: number | null;
  procedente: boolean;
  padron: boolean;
  bebidas_alcoholicas: boolean;
  observacion: string | null;
  estado: string;
  ambientes?: FormularioQrAmbiente[];
}): FormularioQrPayload {
  return {
    t: "formulario",
    v: FORMULARIO_QR_VERSION,
    id: input.id,
    fecha: input.fecha,
    razon_social: input.razon_social,
    contribuyente_nombre: input.contribuyente_nombre,
    contribuyente_ci: input.contribuyente_ci,
    nit: input.nit?.trim() || "—",
    zona: input.zona,
    superficie: input.superficie,
    direccion: input.direccion,
    celular: input.celular,
    referencia: input.referencia,
    latitud: input.latitud,
    longitud: input.longitud,
    mapa_zoom: input.mapa_zoom,
    procedente: input.procedente,
    padron: input.padron,
    bebidas_alcoholicas: input.bebidas_alcoholicas,
    observacion: input.observacion?.trim() || "—",
    estado: input.estado,
    ambientes: input.ambientes ?? [],
  };
}

/** URL pública de verificación (QR en pantalla o en el PDF). */
export function buildFormularioVerificacionUrl(id: string): string {
  return `${notificacionQrPublicOrigin()}/verificacion-formulario/${id}`;
}
