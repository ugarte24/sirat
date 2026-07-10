import {
  parseListPage,
  readListSearchFromStorage,
  saveListSearchToStorage,
} from "@/lib/list-search";

export type FormListFiltro = "todos" | "pendientes" | "activos" | "baja" | "anulado";

export type FormListSearch = { filtro?: FormListFiltro; page?: number };

export const FORM_LIST_SEARCH_KEY = "sirat:formularios:listSearch";

export function parseFormListFiltro(raw: unknown): FormListFiltro | undefined {
  if (
    raw === "todos" ||
    raw === "pendientes" ||
    raw === "activos" ||
    raw === "baja" ||
    raw === "anulado"
  ) {
    return raw;
  }
  return undefined;
}

export function parseFormListPage(raw: unknown): number | undefined {
  return parseListPage(raw);
}

function parseFormListSearch(raw: Record<string, unknown>): FormListSearch {
  const out: FormListSearch = {};
  const filtro = parseFormListFiltro(raw.filtro);
  if (filtro && filtro !== "todos") out.filtro = filtro;
  const page = parseListPage(raw.page);
  if (page && page > 1) out.page = page;
  return out;
}

export function formListSearchFromStorage(): FormListSearch {
  return readListSearchFromStorage(FORM_LIST_SEARCH_KEY, parseFormListSearch);
}

export function saveFormListSearch(search: FormListSearch): void {
  saveListSearchToStorage(FORM_LIST_SEARCH_KEY, {
    filtro: search.filtro && search.filtro !== "todos" ? search.filtro : undefined,
    page: search.page,
  });
}
