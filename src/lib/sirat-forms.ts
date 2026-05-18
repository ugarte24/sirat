import type { Database } from "@/integrations/supabase/types";

type Db = Database["public"]["Tables"];
type ContribRow = Db["contribuyentes"]["Row"];
type FormRow = Db["formularios"]["Row"];
type NotifRow = Db["notificaciones"]["Row"];

const UPPER_LOCALE = "es-BO";

function trimUpper(value: string): string {
  return value.trim().toLocaleUpperCase(UPPER_LOCALE);
}

function trimUpperOrNull(value: string): string | null {
  const t = value.trim();
  return t ? t.toLocaleUpperCase(UPPER_LOCALE) : null;
}

/** Textos de formulario normalizados para guardar en la BD (mayúsculas). */
function formularioTextFieldsForDb(f: FormularioNuevoState) {
  return {
    razon_social: trimUpper(f.razon_social),
    nit: trimUpperOrNull(f.nit),
    direccion: trimUpper(f.direccion),
    celular: f.celular.trim(),
    referencia: trimUpper(f.referencia),
    observacion: trimUpperOrNull(f.observacion),
  };
}

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
  /** Zoom Leaflet guardado con la ubicación (1–19) */
  mapa_zoom: number | null;
  /** null = sin elegir (etapa verificación); true/false tras selección */
  procedente: boolean | null;
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
    mapa_zoom: null,
    procedente: null,
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
  const text = formularioTextFieldsForDb(f);
  return {
    contribuyente_id: f.contribuyente_id,
    ...text,
    zona: f.zona,
    superficie: Number.parseFloat(f.superficie),
    latitud: f.latitud,
    longitud: f.longitud,
    procedente: f.procedente ?? true,
    padron: f.padron,
    bebidas_alcoholicas: f.bebidas_alcoholicas,
    created_by: createdBy ?? null,
  };
}

/** Campos de etapa 1 (registro) hacia formularios */
export type FormularioRegistroPayload = Pick<
  FormularioInsertPayload,
  | "contribuyente_id"
  | "razon_social"
  | "nit"
  | "zona"
  | "direccion"
  | "celular"
  | "referencia"
  | "latitud"
  | "longitud"
  | "mapa_zoom"
  | "created_by"
>;

export function formularioRegistroToInsert(
  f: FormularioNuevoState,
  createdBy: string | null | undefined,
): FormularioRegistroPayload & { estado: "pendiente_verificacion"; superficie: null } {
  const text = formularioTextFieldsForDb(f);
  return {
    contribuyente_id: f.contribuyente_id,
    razon_social: text.razon_social,
    nit: text.nit,
    zona: f.zona,
    direccion: text.direccion,
    celular: text.celular,
    referencia: text.referencia,
    latitud: f.latitud,
    longitud: f.longitud,
    mapa_zoom: f.mapa_zoom,
    created_by: createdBy ?? null,
    estado: "pendiente_verificacion",
    superficie: null,
  };
}

export type FormularioRegistroUpdatePayload = Pick<
  FormularioUpdatePayload,
  | "contribuyente_id"
  | "razon_social"
  | "nit"
  | "zona"
  | "direccion"
  | "celular"
  | "referencia"
  | "latitud"
  | "longitud"
  | "mapa_zoom"
>;

export function formularioRegistroToUpdate(f: FormularioNuevoState): FormularioRegistroUpdatePayload {
  const text = formularioTextFieldsForDb(f);
  return {
    contribuyente_id: f.contribuyente_id,
    razon_social: text.razon_social,
    nit: text.nit,
    zona: f.zona,
    direccion: text.direccion,
    celular: text.celular,
    referencia: text.referencia,
    latitud: f.latitud,
    longitud: f.longitud,
    mapa_zoom: f.mapa_zoom,
  };
}

export type FormularioVerificacionUpdatePayload = Pick<
  FormularioUpdatePayload,
  | "superficie"
  | "procedente"
  | "padron"
  | "bebidas_alcoholicas"
  | "observacion"
  | "estado"
  | "verificado_por"
  | "verificado_at"
>;

export function formularioVerificacionToUpdate(
  f: FormularioNuevoState,
  opts: { completar: boolean; userId: string | null | undefined },
): FormularioVerificacionUpdatePayload {
  const base: FormularioVerificacionUpdatePayload = {
    superficie: Number.parseFloat(f.superficie),
    procedente: f.procedente as boolean,
    padron: f.padron,
    bebidas_alcoholicas: f.bebidas_alcoholicas,
    observacion: formularioTextFieldsForDb(f).observacion,
  };
  if (opts.completar) {
    return {
      ...base,
      estado: "activo",
      verificado_por: opts.userId ?? null,
      verificado_at: new Date().toISOString(),
    };
  }
  return base;
}

export function validateFormularioRegistro(f: FormularioNuevoState): string | null {
  if (!f.contribuyente_id) return "Selecciona un contribuyente";
  if (!f.razon_social.trim()) return "Indica la razón social";
  if (!f.celular.trim()) return "Indica el celular";
  if (!f.direccion.trim()) return "Indica la dirección";
  if (!f.referencia.trim()) return "Indica la referencia";
  if (
    f.latitud == null ||
    f.longitud == null ||
    !Number.isFinite(f.latitud) ||
    !Number.isFinite(f.longitud)
  ) {
    return "Marque la ubicación en el mapa o use «Mi ubicación»";
  }
  return null;
}

export function validateFormularioVerificacion(f: FormularioNuevoState): string | null {
  const sup = Number.parseFloat(f.superficie);
  if (!Number.isFinite(sup) || sup <= 0) return "Indica una superficie válida (m²)";
  if (f.procedente === null) return "Seleccione Procedente o No procedente";
  if (!f.padron && !f.bebidas_alcoholicas) {
    return "Marque al menos una opción: Padrón o Bebidas alcohólicas";
  }
  return null;
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
  const text = formularioTextFieldsForDb(f);
  return {
    contribuyente_id: f.contribuyente_id,
    ...text,
    zona: f.zona,
    superficie: Number.parseFloat(f.superficie),
    latitud: f.latitud,
    longitud: f.longitud,
    procedente: f.procedente ?? true,
    padron: f.padron,
    bebidas_alcoholicas: f.bebidas_alcoholicas,
  };
}

export function formularioRowToState(row: FormRow): FormularioNuevoState {
  const verificacionSinCompletar =
    row.estado === "pendiente_verificacion" && row.superficie == null;
  return {
    contribuyente_id: row.contribuyente_id,
    razon_social: row.razon_social,
    nit: row.nit ?? "",
    zona: row.zona,
    superficie: row.superficie != null ? String(row.superficie) : "",
    direccion: row.direccion,
    celular: row.celular,
    referencia: row.referencia,
    latitud: row.latitud,
    longitud: row.longitud,
    mapa_zoom: row.mapa_zoom ?? null,
    procedente: verificacionSinCompletar ? null : row.procedente,
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

function notificacionStateToRowFields(n: NotificacionNuevaState) {
  return {
    contribuyente_id: n.contribuyente_id,
    nombre_actividad: trimUpperOrNull(n.nombre_actividad),
    numero_identificacion: trimUpperOrNull(n.numero_identificacion),
    direccion: trimUpper(n.direccion),
    fecha_limite: n.fecha_limite,
    padron_municipal: n.padron_municipal,
    permiso_bebidas_alcoholicas: n.permiso_bebidas_alcoholicas,
    impuestos_patente: n.impuestos_patente,
    bienes_inmuebles: n.bienes_inmuebles,
    vehiculos: n.vehiculos,
    gestiones_adeudadas: trimUpperOrNull(n.gestiones_adeudadas),
  };
}

export function contribuyenteFormToInsert(
  form: ContribuyenteNuevoForm,
  createdBy: string | null | undefined,
): ContribuyenteInsertPayload {
  return {
    ci: form.ci.trim(),
    nombre_completo: trimUpper(form.nombre_completo),
    telefono: form.telefono.trim() || null,
    created_by: createdBy ?? null,
  };
}

export function contribuyenteToUpdatePayload(c: {
  ci: string;
  nombre_completo: string;
  telefono: string | null;
}): Pick<ContribRow, "ci" | "nombre_completo" | "telefono"> {
  return {
    ci: c.ci.trim(),
    nombre_completo: trimUpper(c.nombre_completo),
    telefono: c.telefono?.trim() || null,
  };
}

export function notificacionStateToInsert(
  n: NotificacionNuevaState,
  createdBy: string | null | undefined,
): NotificacionInsertPayload {
  return { ...notificacionStateToRowFields(n), created_by: createdBy ?? null };
}

/** Payload hacia `notificaciones.update` */
export type NotificacionUpdatePayload = Pick<
  Db["notificaciones"]["Update"],
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
>;

export function notificacionStateToUpdate(n: NotificacionNuevaState): NotificacionUpdatePayload {
  return notificacionStateToRowFields(n);
}

export function notificacionRowToState(row: NotifRow): NotificacionNuevaState {
  return {
    contribuyente_id: row.contribuyente_id,
    nombre_actividad: row.nombre_actividad ?? "",
    numero_identificacion: row.numero_identificacion ?? "",
    direccion: row.direccion,
    fecha_limite: row.fecha_limite,
    padron_municipal: row.padron_municipal,
    permiso_bebidas_alcoholicas: row.permiso_bebidas_alcoholicas,
    impuestos_patente: row.impuestos_patente,
    bienes_inmuebles: row.bienes_inmuebles,
    vehiculos: row.vehiculos,
    gestiones_adeudadas: row.gestiones_adeudadas ?? "",
  };
}

/** Tipado útil al leer la fila creada */
export type FormularioCreadoRow = Pick<FormRow, "id">;
export type NotificacionCreadaRow = Pick<NotifRow, "id">;
