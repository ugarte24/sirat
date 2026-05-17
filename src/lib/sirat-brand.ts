import pkg from "../../package.json";

/** Leyenda institucional (login, shell, etc.) */
export const SIRAT_TAGLINE =
  "Sistema Integrado de Registro y Administración Tributaria";

/** Colores institucionales para reportes PDF/Excel (alineados con la UI). */
export const SIRAT_REPORT_COLORS = {
  /** Azul primario — encabezados y cabecera de tabla */
  primary: { r: 45, g: 55, b: 120, hex: "2D3778" },
  /** Dorado — línea de acento y título principal */
  gold: { r: 201, g: 162, b: 59, hex: "C9A23B" },
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

/** Título en PDF de notificación tributaria */
export const NOTIFICACION_TRIBUTARIA_PDF_TITULO = "NOTIFICACIÓN TRIBUTARIA";
