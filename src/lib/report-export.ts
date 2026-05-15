import { formatDateEsBo } from "@/lib/date";
import { notificacionConceptosMarcados } from "@/lib/sirat-forms";

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
    { key: "razon_social", header: "Razón social" },
    { key: "nit", header: "NIT" },
    { key: "zona", header: "Zona" },
    { key: "superficie", header: "Superficie (m²)" },
    { key: "direccion", header: "Dirección" },
    { key: "celular", header: "Celular" },
    { key: "referencia", header: "Referencia" },
    { key: "coordenadas", header: "Coordenadas" },
    { key: "procedente", header: "Procedente" },
    { key: "padron", header: "Padrón" },
    { key: "bebidas_alcoholicas", header: "Bebidas alcohólicas" },
    { key: "observacion", header: "Observación" },
  ],
  notificaciones: [
    { key: "fecha_emision", header: "Fecha emisión" },
    { key: "contribuyente_nombre", header: "Contribuyente" },
    { key: "contribuyente_ci", header: "C.I." },
    { key: "nombre_actividad", header: "Nombre de la actividad" },
    { key: "numero_identificacion", header: "Licencia / placa / inmueble" },
    { key: "direccion", header: "Dirección" },
    { key: "fecha_limite", header: "Fecha límite" },
    { key: "conceptos", header: "Conceptos" },
    { key: "gestiones_adeudadas", header: "Gestiones adeudadas" },
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
  superficie: number;
  direccion: string;
  celular: string;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  procedente: boolean;
  padron: boolean;
  bebidas_alcoholicas: boolean;
  observacion: string | null;
  contribuyente: { nombre_completo: string; ci: string } | null;
};

type NotificacionRow = {
  created_at: string;
  nombre_actividad: string | null;
  numero_identificacion: string | null;
  direccion: string;
  fecha_limite: string;
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

function mapFormulario(row: FormularioRow): ReporteFila {
  const coords =
    row.latitud != null && row.longitud != null ? `${row.latitud}, ${row.longitud}` : "";
  return {
    fecha_emision: formatDateEsBo(row.fecha),
    contribuyente_nombre: row.contribuyente?.nombre_completo ?? "",
    contribuyente_ci: row.contribuyente?.ci ?? "",
    razon_social: row.razon_social,
    nit: row.nit ?? "",
    zona: row.zona,
    superficie: String(row.superficie),
    direccion: row.direccion,
    celular: row.celular,
    referencia: row.referencia,
    coordenadas: coords,
    procedente: siNo(row.procedente),
    padron: siNo(row.padron),
    bebidas_alcoholicas: siNo(row.bebidas_alcoholicas),
    observacion: row.observacion ?? "",
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
    latitud, longitud, procedente, padron, bebidas_alcoholicas, observacion, created_at,
    contribuyente:contribuyentes(nombre_completo, ci)
  `,
  notificaciones: `
    created_at, nombre_actividad, numero_identificacion, direccion, fecha_limite,
    gestiones_adeudadas, padron_municipal, permiso_bebidas_alcoholicas, impuestos_patente,
    bienes_inmuebles, vehiculos,
    contribuyente:contribuyentes(nombre_completo, ci)
  `,
  contribuyentes: "created_at, ci, nombre_completo, telefono",
};
