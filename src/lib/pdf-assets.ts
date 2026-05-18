/** Relación ancho/alto del logo SIRAT (public/logo-sirat.png). */
export const SIRAT_LOGO_ASPECT = 389 / 436;

async function fetchPublicImageDataUrl(path: string): Promise<string> {
  const res = await fetch(`${window.location.origin}${path}`, { credentials: "omit" });
  if (!res.ok) throw new Error(`No se pudo cargar ${path}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Imagen ilegible"));
    reader.readAsDataURL(blob);
  });
}

let logoCache: string | null | undefined;
let escudoCache: string | null | undefined;

export async function loadSiratLogoDataUrl(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    logoCache = await fetchPublicImageDataUrl("/logo-sirat.png");
  } catch (e) {
    console.warn("Logo SIRAT no cargado para PDF:", e);
    logoCache = null;
  }
  return logoCache;
}

export async function loadEscudoRiberaltaDataUrl(): Promise<string | null> {
  if (escudoCache !== undefined) return escudoCache;
  try {
    escudoCache = await fetchPublicImageDataUrl("/escudo-riberalta.png");
  } catch (e) {
    console.warn("Escudo Riberalta no cargado para PDF:", e);
    escudoCache = null;
  }
  return escudoCache;
}
