import type { Database } from "@/integrations/supabase/types";

type Db = Database["public"]["Tables"];
type ContribRow = Db["contribuyentes"]["Row"];
type FormRow = Db["formularios"]["Row"];
type NotifRow = Db["notificaciones"]["Row"];

/** Fila para selects (contribuyente) */
export type ContribuyenteCatalogRow = Pick<ContribRow, "id" | "ci" | "nombre_completo">;

export type ZonaTipo = Database["public"]["Enums"]["zona_tipo"];

/** Campos del formulario HTML antes de insertar contribuyente */
export interface ContribuyenteNuevoForm {
  ci: string;
  nombre_completo: string;
  telefono: string;
}

/** Payload hacia `contribuyentes.insert` (sin id/fechas autogenerados) */
export type ContribuyenteInsertPayload = Pick<
  Db["contribuyentes"]["Insert"],
  "ci" | "nombre_completo" | "telefono" | "created_by"
>;

/** Estado local del wizard “nuevo formulario” (superficie en string hasta parsear) */
export interface FormularioNuevoState {
  contribuyente_id: string;
  razon_social: string;
  nit: string;
  zona: ZonaTipo;
  superficie: string;
  direccion: string;
  celular: string;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  procedente: boolean;
  padron: boolean;
  bebidas_alcoholicas: boolean;
  observacion: string;
}

export function emptyFormularioNuevo(): FormularioNuevoState {
  return {
    contribuyente_id: "",
    razon_social: "",
    nit: "",
    zona: "A",
    superficie: "",
    direccion: "",
    celular: "",
    referencia: "",
    latitud: null,
    longitud: null,
    procedente: true,
    padron: false,
    bebidas_alcoholicas: false,
    observacion: "",
  };
}

/** Lo que enviamos a Supabase al crear un formulario (lo demás lo rellena la BD) */
export type FormularioInsertPayload = Pick<
  Db["formularios"]["Insert"],
  | "contribuyente_id"
  | "razon_social"
  | "nit"
  | "zona"
  | "superficie"
  | "direccion"
  | "celular"
  | "referencia"
  | "latitud"
  | "longitud"
  | "procedente"
  | "padron"
  | "bebidas_alcoholicas"
  | "observacion"
  | "created_by"
>;

export function formularioStateToInsert(
  f: FormularioNuevoState,
  createdBy: string | null | undefined,
): FormularioInsertPayload {
  return {
    contribuyente_id: f.contribuyente_id,
    razon_social: f.razon_social.trim(),
    nit: f.nit.trim() || null,
    zona: f.zona,
    superficie: Number.parseFloat(f.superficie),
    direccion: f.direccion.trim(),
    celular: f.celular.trim(),
    referencia: f.referencia.trim(),
    latitud: f.latitud,
    longitud: f.longitud,
    procedente: f.procedente,
    padron: f.padron,
    bebidas_alcoholicas: f.bebidas_alcoholicas,
    observacion: f.observacion.trim() || null,
    created_by: createdBy ?? null,
  };
}

/** Payload hacia `formularios.update` */
export type FormularioUpdatePayload = Pick<
  Db["formularios"]["Update"],
  | "contribuyente_id"
  | "razon_social"
  | "nit"
  | "zona"
  | "superficie"
  | "direccion"
  | "celular"
  | "referencia"
  | "latitud"
  | "longitud"
  | "procedente"
  | "padron"
  | "bebidas_alcoholicas"
  | "observacion"
>;

export function formularioStateToUpdate(f: FormularioNuevoState): FormularioUpdatePayload {
  return {
    contribuyente_id: f.contribuyente_id,
    razon_social: f.razon_social.trim(),
    nit: f.nit.trim() || null,
    zona: f.zona,
    superficie: Number.parseFloat(f.superficie),
    direccion: f.direccion.trim(),
    celular: f.celular.trim(),
    referencia: f.referencia.trim(),
    latitud: f.latitud,
    longitud: f.longitud,
    procedente: f.procedente,
    padron: f.padron,
    bebidas_alcoholicas: f.bebidas_alcoholicas,
    observacion: f.observacion.trim() || null,
  };
}

export function formularioRowToState(row: FormRow): FormularioNuevoState {
  return {
    contribuyente_id: row.contribuyente_id,
    razon_social: row.razon_social,
    nit: row.nit ?? "",
    zona: row.zona,
    superficie: String(row.superficie),
    direccion: row.direccion,
    celular: row.celular,
    referencia: row.referencia,
    latitud: row.latitud,
    longitud: row.longitud,
    procedente: row.procedente,
    padron: row.padron,
    bebidas_alcoholicas: row.bebidas_alcoholicas,
    observacion: row.observacion ?? "",
  };
}

export const NOTIFICACION_CONCEPTO_OPTS = [
  { key: "padron_municipal" as const, label: "Padrón municipal" },
  { key: "permiso_bebidas_alcoholicas" as const, label: "Permiso de bebidas alcohólicas" },
  { key: "impuestos_patente" as const, label: "Impuestos de patente" },
  { key: "bienes_inmuebles" as const, label: "Impuesto a la propiedad de bienes inmuebles" },
  { key: "vehiculos" as const, label: "Impuesto a la propiedad de vehículo automotor" },
];

export type NotificacionConceptoKey = (typeof NOTIFICACION_CONCEPTO_OPTS)[number]["key"];

export function notificacionConceptosMarcados(
  n: Pick<NotificacionNuevaState, NotificacionConceptoKey>,
): string[] {
  return NOTIFICACION_CONCEPTO_OPTS.filter((o) => n[o.key]).map((o) => o.label);
}

/** Estado del formulario “nueva notificación” */
export interface NotificacionNuevaState {
  contribuyente_id: string;
  nombre_actividad: string;
  numero_identificacion: string;
  direccion: string;
  fecha_limite: string;
  padron_municipal: boolean;
  permiso_bebidas_alcoholicas: boolean;
  impuestos_patente: boolean;
  bienes_inmuebles: boolean;
  vehiculos: boolean;
  gestiones_adeudadas: string;
}

export function defaultNotificacionNueva(): NotificacionNuevaState {
  return {
    contribuyente_id: "",
    nombre_actividad: "",
    numero_identificacion: "",
    direccion: "",
    fecha_limite: "",
    padron_municipal: false,
    permiso_bebidas_alcoholicas: false,
    impuestos_patente: false,
    bienes_inmuebles: false,
    vehiculos: false,
    gestiones_adeudadas: "",
  };
}

/** Payload hacia `notificaciones.insert` */
export type NotificacionInsertPayload = Pick<
  Db["notificaciones"]["Insert"],
  | "contribuyente_id"
  | "nombre_actividad"
  | "numero_identificacion"
  | "direccion"
  | "fecha_limite"
  | "padron_municipal"
  | "permiso_bebidas_alcoholicas"
  | "impuestos_patente"
  | "bienes_inmuebles"
  | "vehiculos"
  | "gestiones_adeudadas"
  | "created_by"
>;

export function notificacionStateToInsert(
  n: NotificacionNuevaState,
  createdBy: string | null | undefined,
): NotificacionInsertPayload {
  return {
    contribuyente_id: n.contribuyente_id,
    nombre_actividad: n.nombre_actividad.trim() || null,
    numero_identificacion: n.numero_identificacion.trim() || null,
    direccion: n.direccion.trim(),
    fecha_limite: n.fecha_limite,
    padron_municipal: n.padron_municipal,
    permiso_bebidas_alcoholicas: n.permiso_bebidas_alcoholicas,
    impuestos_patente: n.impuestos_patente,
    bienes_inmuebles: n.bienes_inmuebles,
    vehiculos: n.vehiculos,
    gestiones_adeudadas: n.gestiones_adeudadas.trim() || null,
    created_by: createdBy ?? null,
  };
}

/** Tipado útil al leer la fila creada */
export type FormularioCreadoRow = Pick<FormRow, "id">;
export type NotificacionCreadaRow = Pick<NotifRow, "id">;
