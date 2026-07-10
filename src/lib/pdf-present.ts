/**
 * Criterio para PDF en móvil: pantalla angosta o puntero táctil grueso.
 * En escritorio/laptop se abre en pestaña nueva; en móvil, visor in-app.
 */
export function prefersPdfInAppPreview(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    return narrow || coarse;
  } catch {
    return true;
  }
}
