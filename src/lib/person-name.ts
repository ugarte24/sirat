/**
 * Formato para firma PDF: abreviar el segundo nombre.
 * Ej.: «JUAN PEDRO PEREZ GUTIERREZ» → «JUAN P. PEREZ GUTIERREZ»
 * Con menos de 3 palabras no se abrevia (falta segundo nombre).
 */
export function formatNombreInspectorPdf(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "";
  const parts = fullName
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase()
    .split(" ")
    .filter(Boolean);
  if (parts.length < 3) return parts.join(" ");
  const segundo = parts[1];
  const inicial = `${segundo.charAt(0)}.`;
  return [parts[0], inicial, ...parts.slice(2)].join(" ");
}
