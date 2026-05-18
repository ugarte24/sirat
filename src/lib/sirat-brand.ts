import pkg from "../../package.json";

/** Leyenda institucional (login, shell, etc.) */
export const SIRAT_TAGLINE =
  "Sistema Integrado de Registro y Administración Tributaria";

/** Colores institucionales para reportes PDF/Excel (alineados con la UI). */
export const SIRAT_REPORT_COLORS = {
  /** Azul primario — encabezados y cabecera de tabla */
  primary: { r: 45, g: 55, b: 120, hex: "2D3778" },
  /** Dorado — línea de acento (Excel y UI legacy) */
  gold: { r: 201, g: 162, b: 59, hex: "C9A23B" },
  /** Verde del logo SIRAT — barra superior, acentos y títulos en PDF */
  green: { r: 45, g: 122, b: 49, hex: "2D7A31" },
  /** Fila alterna de tabla */
  zebra: { r: 245, g: 247, b: 252, hex: "F5F7FC" },
  white: { r: 255, g: 255, b: 255, hex: "FFFFFF" },
  text: { r: 30, g: 35, b: 55, hex: "1E2337" },
} as const;

/** Versión de la aplicación (sincronizada con package.json; el hook pre-commit la incrementa en cada commit). */
export const SIRAT_APP_VERSION = pkg.version;

/** Nombre del documento / formulario de actividades económicas */
export const FORMULARIO_VERIFICACION_NOMBRE =
  "Formulario de registro y verificación de actividades económicas";

export const FORMULARIO_VERIFICACION_TITULO_NUEVO = FORMULARIO_VERIFICACION_NOMBRE;

export const FORMULARIO_VERIFICACION_TITULO_EDITAR =
  "Editar formulario de registro y verificación de actividades económicas";

export const FORMULARIO_ETAPA_REGISTRO_TITULO = "Etapa 1 — Registro";
export const FORMULARIO_ETAPA_VERIFICACION_TITULO = "Etapa 2 — Verificación";

/** Encabezado de sección y menú (lista de formularios) */
export const FORMULARIO_VERIFICACION_SECCION = "Formularios de registro y verificación";

/** Título en PDF impreso */
export const FORMULARIO_VERIFICACION_PDF_TITULO =
  "FORMULARIO DE REGISTRO Y VERIFICACIÓN DE ACTIVIDADES ECONÓMICAS";

/** Encabezado institucional en PDF del formulario de actividades económicas */
export const GAM_RIBERALTA_NOMBRE = "GOBIERNO AUTONOMO MUNICIPAL DE RIBERALTA";
export const JEFATURA_RECAUDACIONES = "JEFATURA DE RECAUDACIONES";

/** Etiqueta de firma en PDF del formulario (tercera columna) */
export const FORMULARIO_PDF_FIRMA_ENCARGADO_RUAT = "Encargado de Ruat";

/** Título en PDF de notificación */
export const NOTIFICACION_TRIBUTARIA_PDF_TITULO = "NOTIFICACIÓN";

/** Campo de texto libre en notificación (detalle, PDF, QR, reportes) */
export const NOTIFICACION_GESTIONES_ADEUDADAS_LABEL = "Observaciones y/o gestiones adeudadas";
