import {
  parseListPage,
  readListSearchFromStorage,
  saveListSearchToStorage,
} from "@/lib/list-search";

export type ContribListSearch = { page?: number };

export const CONTRIB_LIST_SEARCH_KEY = "sirat:contribuyentes:listSearch";

export function parseContribListPage(raw: unknown): number | undefined {
  return parseListPage(raw);
}

function parseContribListSearch(raw: Record<string, unknown>): ContribListSearch {
  const out: ContribListSearch = {};
  const page = parseListPage(raw.page);
  if (page && page > 1) out.page = page;
  return out;
}

export function contribListSearchFromStorage(): ContribListSearch {
  return readListSearchFromStorage(CONTRIB_LIST_SEARCH_KEY, parseContribListSearch);
}

export function saveContribListSearch(search: ContribListSearch): void {
  saveListSearchToStorage(CONTRIB_LIST_SEARCH_KEY, search);
}
