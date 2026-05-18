/** Errores típicos cuando el HTML en caché apunta a chunks de un deploy anterior. */
export function isStaleChunkLoadError(message: string): boolean {
  return /failed to fetch dynamically imported module|loading chunk|importing a module script failed|error loading dynamically imported module/i.test(
    message,
  );
}

const RELOAD_GUARD_KEY = "sirat-chunk-reload-at";

/** Recarga completa (una vez cada 10 s) para obtener el HTML y los JS del último deploy. */
export function reloadForStaleChunks(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || "0");
  if (last && now - last < 10_000) return;
  sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  window.location.reload();
}

export function registerStaleChunkRecovery(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", () => reloadForStaleChunks());

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";
    if (isStaleChunkLoadError(message)) {
      event.preventDefault();
      reloadForStaleChunks();
    }
  });
}
