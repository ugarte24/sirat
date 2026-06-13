import { formatDateEsBo } from "@/lib/date";
import {
  formularioSiNoExport,
  formularioSuperficieExport,
  formularioVerificacionSinCompletar,
  notificacionConceptosMarcados,
} from "@/lib/sirat-forms";
import { NOTIFICACION_GESTIONES_ADEUDADAS_LABEL } from "@/lib/sirat-brand";

export type ReporteTipo = "formularios" | "notificaciones" | "contribuyentes";

export interface ReportColumn {
  key: string;
  header: string;
}

const siNo = (v: boolean) => (v ? "Sí" : "No");

/** Columnas exportables: datos del formulario + fecha de emisión. */
export const REPORTE_COLUMNS: Record<ReporteTipo, ReportColumn[]> = {
  formularios: [
    { key: "fecha_emision", header: "Fecha emisión" },
    { key: "contribuyente_nombre", header: "Contribuyente" },
    { key: "contribuyente_ci", header: "C.I." },
    { key: "tipo_tramite", header: "Tipo de trámite" },
    { key: "razon_social", header: "Razón social" },
    { key: "nit", header: "NIT" },
    { key: "zona", header: "Zona" },
    { key: "superficie", header: "Superficie (m²)" },
    { key: "direccion", header: "Dirección" },
    { key: "celular", header: "Celular" },
    { key: "referencia", header: "Referencia" },
    { key: "procedente", header: "Procedente" },
    { key: "padron", header: "Padrón" },
    { key: "bebidas_alcoholicas", header: "Bebidas alcohólicas" },
    { key: "observacion", header: "Observación" },
    { key: "estado", header: "Estado" },
  ],
  notificaciones: [
    { key: "fecha_emision", header: "Fecha emisión" },
    { key: "contribuyente_nombre", header: "Contribuyente" },
    { key: "contribuyente_ci", header: "C.I." },
    { key: "nombre_actividad", header: "Nombre de la actividad" },
    { key: "numero_identificacion", header: "Licencia / placa / inmueble" },
    { key: "direccion", header: "Dirección" },
    { key: "fecha_limite", header: "Fecha límite" },
    { key: "veces_notificado", header: "N.º notificaciones" },
    { key: "conceptos", header: "Conceptos" },
    { key: "gestiones_adeudadas", header: NOTIFICACION_GESTIONES_ADEUDADAS_LABEL },
  ],
  contribuyentes: [
    { key: "fecha_emision", header: "Fecha emisión" },
    { key: "ci", header: "C.I." },
    { key: "nombre_completo", header: "Nombre completo" },
    { key: "telefono", header: "Teléfono" },
  ],
};

type FormularioRow = {
  fecha: string;
  razon_social: string;
  nit: string | null;
  zona: string;
  superficie: number | null;
  direccion: string;
  celular: string;
  referencia: string;
  procedente: boolean;
  padron: boolean;
  bebidas_alcoholicas: boolean;
  observacion: string | null;
  estado: string;
  contribuyente: { nombre_completo: string; ci: string } | null;
  tipo_tramite: { nombre: string } | null;
};

type NotificacionRow = {
  created_at: string;
  nombre_actividad: string | null;
  numero_identificacion: string | null;
  direccion: string;
  fecha_limite: string;
  veces_notificado: number;
  gestiones_adeudadas: string | null;
  padron_municipal: boolean;
  permiso_bebidas_alcoholicas: boolean;
  impuestos_patente: boolean;
  bienes_inmuebles: boolean;
  vehiculos: boolean;
  contribuyente: { nombre_completo: string; ci: string } | null;
};

type ContribuyenteRow = {
  created_at: string;
  ci: string;
  nombre_completo: string;
  telefono: string | null;
};

export type ReporteFila = Record<string, string>;

function formularioEstadoLabel(estado: string): string {
  if (estado === "pendiente_verificacion") return "Pendiente verificación";
  if (estado === "activo") return "Activo";
  if (estado === "baja") return "Baja";
  if (estado === "anulado") return "Anulado";
  return estado;
}

function mapFormulario(row: FormularioRow): ReporteFila {
  const sinVerificar = formularioVerificacionSinCompletar(row);
  return {
    fecha_emision: formatDateEsBo(row.fecha),
    contribuyente_nombre: row.contribuyente?.nombre_completo ?? "",
    contribuyente_ci: row.contribuyente?.ci ?? "",
    tipo_tramite: row.tipo_tramite?.nombre ?? "",
    razon_social: row.razon_social,
    nit: row.nit ?? "",
    zona: row.zona,
    superficie: formularioSuperficieExport(sinVerificar, row.superficie),
    direccion: row.direccion,
    celular: row.celular,
    referencia: row.referencia,
    procedente: formularioSiNoExport(sinVerificar, row.procedente),
    padron: formularioSiNoExport(sinVerificar, row.padron),
    bebidas_alcoholicas: formularioSiNoExport(sinVerificar, row.bebidas_alcoholicas),
    observacion: row.observacion ?? "",
    estado: formularioEstadoLabel(row.estado),
  };
}

function mapNotificacion(row: NotificacionRow): ReporteFila {
  const conceptos = notificacionConceptosMarcados(row).join(", ");
  return {
    fecha_emision: formatDateEsBo(row.created_at.slice(0, 10)),
    contribuyente_nombre: row.contribuyente?.nombre_completo ?? "",
    contribuyente_ci: row.contribuyente?.ci ?? "",
    nombre_actividad: row.nombre_actividad ?? "",
    numero_identificacion: row.numero_identificacion ?? "",
    direccion: row.direccion,
    fecha_limite: formatDateEsBo(row.fecha_limite),
    veces_notificado: String(row.veces_notificado ?? 1),
    conceptos,
    gestiones_adeudadas: row.gestiones_adeudadas ?? "",
  };
}

function mapContribuyente(row: ContribuyenteRow): ReporteFila {
  return {
    fecha_emision: formatDateEsBo(row.created_at.slice(0, 10)),
    ci: row.ci,
    nombre_completo: row.nombre_completo,
    telefono: row.telefono ?? "",
  };
}

export function mapReporteRows(tipo: ReporteTipo, rows: unknown[]): ReporteFila[] {
  switch (tipo) {
    case "formularios":
      return (rows as FormularioRow[]).map(mapFormulario);
    case "notificaciones":
      return (rows as NotificacionRow[]).map(mapNotificacion);
    case "contribuyentes":
      return (rows as ContribuyenteRow[]).map(mapContribuyente);
  }
}

export const REPORTE_SELECT: Record<ReporteTipo, string> = {
  formularios: `
    fecha, razon_social, nit, zona, superficie, direccion, celular, referencia,
    procedente, padron, bebidas_alcoholicas, observacion, estado, created_at,
    contribuyente:contribuyentes(nombre_completo, ci),
    tipo_tramite:tipos_tramite(nombre)
  `,
  notificaciones: `
    created_at, nombre_actividad, numero_identificacion, direccion, fecha_limite,
    veces_notificado, gestiones_adeudadas, padron_municipal, permiso_bebidas_alcoholicas, impuestos_patente,
    bienes_inmuebles, vehiculos,
    contribuyente:contribuyentes(nombre_completo, ci)
  `,
  contribuyentes: "created_at, ci, nombre_completo, telefono",
};
