import pkg from "../../package.json";

/** Leyenda institucional (login, shell, etc.) */
export const SIRAT_TAGLINE =
  "Sistema Integrado de Registro y Administración Tributaria";

/** Versión de la aplicación (sincronizada con package.json; el hook pre-commit la incrementa en cada commit). */
export const SIRAT_APP_VERSION = pkg.version;

/** Nombre del documento / formulario de actividades económicas */
export const FORMULARIO_VERIFICACION_NOMBRE =
  "Formulario de verificación para las actividades económicas";

export const FORMULARIO_VERIFICACION_TITULO_NUEVO =
  "Nuevo formulario de verificación para las actividades económicas";

export const FORMULARIO_VERIFICACION_TITULO_EDITAR =
  "Editar formulario de verificación para las actividades económicas";

/** Encabezado de sección y menú (lista de formularios) */
export const FORMULARIO_VERIFICACION_SECCION = "Formularios de verificación";

/** Título en PDF impreso */
export const FORMULARIO_VERIFICACION_PDF_TITULO =
  "FORMULARIO DE VERIFICACIÓN PARA LAS ACTIVIDADES ECONÓMICAS";
