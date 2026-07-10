import {
  parseListPage,
  readListSearchFromStorage,
  saveListSearchToStorage,
} from "@/lib/list-search";

type NotifEstadoFiltro = "pendiente" | "cumplido" | "anulado";

export type NotifListSearch = { estado?: NotifEstadoFiltro; page?: number };

/** Conserva filtro/página al volver del detalle. */
export const NOTIF_LIST_SEARCH_KEY = "sirat:notificaciones:listSearch";

export function parseNotifPage(raw: unknown): number | undefined {
  return parseListPage(raw);
}

export function parseNotifEstadoFiltro(raw: unknown): NotifEstadoFiltro | undefined {
  if (raw === "pendiente" || raw === "cumplido" || raw === "anulado") return raw;
  return undefined;
}

function parseNotifListSearch(raw: Record<string, unknown>): NotifListSearch {
  const out: NotifListSearch = {};
  const estado = parseNotifEstadoFiltro(raw.estado);
  if (estado) out.estado = estado;
  const page = parseListPage(raw.page);
  if (page && page > 1) out.page = page;
  return out;
}

export function notifListSearchFromStorage(): NotifListSearch {
  return readListSearchFromStorage(NOTIF_LIST_SEARCH_KEY, parseNotifListSearch);
}

export function saveNotifListSearch(search: NotifListSearch): void {
  saveListSearchToStorage(NOTIF_LIST_SEARCH_KEY, search);
}
