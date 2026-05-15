const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parsea `YYYY-MM-DD` en hora local (mediodía) para evitar desfases por zona horaria. */
export function parseIsoDateLocal(iso: string): Date | undefined {
  if (!DATE_ONLY.test(iso)) return undefined;
  return new Date(`${iso}T12:00:00`);
}

/** Convierte `Date` a `YYYY-MM-DD` en hora local. */
export function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const fmtDayMonthYear: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

/** Muestra fecha solo-día como `dd/mm/aaaa` (es-BO). Acepta `YYYY-MM-DD` o ISO con hora. */
export function formatDateEsBo(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const raw = value.trim();
  try {
    const d = DATE_ONLY.test(raw) ? parseIsoDateLocal(raw)! : new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("es-BO", fmtDayMonthYear);
  } catch {
    return raw;
  }
}

/** Fecha y hora de generación de reporte: `dd/mm/aaaa, hh:mm:ss`. */
export function formatReportDateTimeEsBo(value: Date = new Date()): string {
  return value.toLocaleString("es-BO", {
    ...fmtDayMonthYear,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Fecha y hora en es-BO: `dd/mm/aaaa, hh:mm`. */
export function formatDateTimeEsBo(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  try {
    const d = new Date(value.trim());
    if (Number.isNaN(d.getTime())) return value.trim();
    return d.toLocaleString("es-BO", {
      ...fmtDayMonthYear,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value.trim();
  }
}
