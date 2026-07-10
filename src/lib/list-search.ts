/** Página 1-based en la URL (`?page=2`); omitida o inválida → undefined. */
export function parseListPage(raw: unknown): number | undefined {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.floor(n);
}

/** Lee un objeto de búsqueda de lista desde sessionStorage. */
export function readListSearchFromStorage<T extends Record<string, unknown>>(
  key: string,
  parse: (raw: Record<string, unknown>) => T,
): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return parse({});
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parse(parsed && typeof parsed === "object" ? parsed : {});
  } catch {
    return parse({});
  }
}

/** Guarda el estado de lista (omite claves vacías / page=1). */
export function saveListSearchToStorage(
  key: string,
  search: Record<string, unknown>,
): void {
  try {
    const toStore: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(search)) {
      if (v === undefined || v === null || v === "") continue;
      if (k === "page" && (typeof v !== "number" || v <= 1)) continue;
      toStore[k] = v;
    }
    sessionStorage.setItem(key, JSON.stringify(toStore));
  } catch {
    /* ignore */
  }
}

/** Actualiza `page` en el search de TanStack Router (1-based; omite page=1). */
export function withListPage<T extends { page?: number }>(
  prev: T,
  pageIndex0: number,
): T {
  const next = { ...prev };
  const page1 = pageIndex0 + 1;
  if (page1 <= 1) delete next.page;
  else next.page = page1;
  return next;
}
