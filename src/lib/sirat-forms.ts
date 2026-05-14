import type { Database } from "@/integrations/supabase/types";

type Db = Database["public"]["Tables"];
type ContribRow = Db["contribuyentes"]["Row"];
type FormRow = Db["formularios"]["Row"];
type NotifRow = Db["notificaciones"]["Row"];

/** Fila para selects (contribuyente) */
export type ContribuyenteCatalogRow = Pick<ContribRow, "id" | "ci" | "nombre_completo">;

/** Fila para select de tipo de actividad */
export type TipoActividadCatalogRow = Pick<Db["tipos_actividad"]["Row"], "id" | "nombre">;

export type ZonaTipo = Database["public"]["Enums"]["zona_tipo"];
export type NotificacionTipo = Database["public"]["Enums"]["notificacion_tipo"];

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
  tipo_actividad_id: string;
  direccion: string;
  celular: string;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  procedente: boolean;
  padron_bebidas: boolean;
  observacion: string;
}

export function emptyFormularioNuevo(): FormularioNuevoState {
  return {
    contribuyente_id: "",
    razon_social: "",
    nit: "",
    zona: "A",
    superficie: "",
    tipo_actividad_id: "",
    direccion: "",
    celular: "",
    referencia: "",
    latitud: null,
    longitud: null,
    procedente: true,
    padron_bebidas: false,
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
  | "tipo_actividad_id"
  | "direccion"
  | "celular"
  | "referencia"
  | "latitud"
  | "longitud"
  | "procedente"
  | "padron_bebidas"
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
    tipo_actividad_id: f.tipo_actividad_id,
    direccion: f.direccion.trim(),
    celular: f.celular.trim(),
    referencia: f.referencia.trim(),
    latitud: f.latitud,
    longitud: f.longitud,
    procedente: f.procedente,
    padron_bebidas: f.padron_bebidas,
    observacion: f.observacion.trim() || null,
    created_by: createdBy ?? null,
  };
}

/** Estado del formulario “nueva notificación” */
export interface NotificacionNuevaState {
  contribuyente_id: string;
  nombre_notificado: string;
  direccion: string;
  fecha_limite: string;
  tipo: NotificacionTipo;
  padron_municipal: boolean;
  impuestos_patente: boolean;
  bienes_inmuebles: boolean;
  vehiculos: boolean;
}

export function defaultNotificacionNueva(): NotificacionNuevaState {
  return {
    contribuyente_id: "",
    nombre_notificado: "",
    direccion: "",
    fecha_limite: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    tipo: "aviso",
    padron_municipal: false,
    impuestos_patente: false,
    bienes_inmuebles: false,
    vehiculos: false,
  };
}

/** Payload hacia `notificaciones.insert` */
export type NotificacionInsertPayload = Pick<
  Db["notificaciones"]["Insert"],
  | "contribuyente_id"
  | "nombre_notificado"
  | "direccion"
  | "fecha_limite"
  | "tipo"
  | "padron_municipal"
  | "impuestos_patente"
  | "bienes_inmuebles"
  | "vehiculos"
  | "numero_correlativo"
  | "created_by"
>;

export function notificacionStateToInsert(
  n: NotificacionNuevaState,
  createdBy: string | null | undefined,
): NotificacionInsertPayload {
  return {
    contribuyente_id: n.contribuyente_id,
    nombre_notificado: n.nombre_notificado.trim(),
    direccion: n.direccion.trim(),
    fecha_limite: n.fecha_limite,
    tipo: n.tipo,
    padron_municipal: n.padron_municipal,
    impuestos_patente: n.impuestos_patente,
    bienes_inmuebles: n.bienes_inmuebles,
    vehiculos: n.vehiculos,
    numero_correlativo: 0,
    created_by: createdBy ?? null,
  };
}

/** Tipado útil al leer la fila creada */
export type FormularioCreadoRow = Pick<FormRow, "id" | "numero">;
export type NotificacionCreadaRow = Pick<NotifRow, "id" | "codigo">;
