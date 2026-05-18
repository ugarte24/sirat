import L from "leaflet";
import "leaflet/dist/leaflet.css";
import html2canvas from "html2canvas";
import { createSiratMapMarkerIcon, mapMarkerPinSvg } from "@/components/MapPicker";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "© OpenStreetMap";
const TILE_SIZE = 256;

function projectLatLng(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;
  return { x, y };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar imagen"));
    img.src = url;
  });
}

/** Evita insertar un JPEG vacío/blanco en el PDF. */
function isUsableMapDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/") && dataUrl.length > 12_000;
}

function waitForMapTiles(map: L.Map, timeoutMs = 6000): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(), timeoutMs);
    map.whenReady(() => {
      let layer: L.TileLayer | undefined;
      map.eachLayer((l) => {
        if (l instanceof L.TileLayer) layer = l;
      });
      if (!layer) {
        window.clearTimeout(timer);
        window.setTimeout(resolve, 1200);
        return;
      }
      layer.once("load", () => {
        window.clearTimeout(timer);
        window.setTimeout(resolve, 600);
      });
      window.setTimeout(() => {
        window.clearTimeout(timer);
        resolve();
      }, timeoutMs);
    });
  });
}

async function captureElementToJpeg(el: HTMLElement): Promise<string> {
  const canvas = await html2canvas(el, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#dddddd",
    scale: 2,
    logging: false,
    imageTimeout: 15000,
  });
  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Composición de tiles OSM + pin (siempre funciona sin html2canvas). */
async function captureOsmTileComposite(
  lat: number,
  lng: number,
  zoom: number,
  widthPx = 560,
  heightPx = 300,
): Promise<string> {
  const z = Math.min(19, Math.max(12, Math.round(zoom)));
  const center = projectLatLng(lat, lng, z);
  const originX = center.x - widthPx / 2;
  const originY = center.y - heightPx / 2;

  const x0 = Math.floor(originX / TILE_SIZE);
  const y0 = Math.floor(originY / TILE_SIZE);
  const x1 = Math.floor((originX + widthPx) / TILE_SIZE);
  const y1 = Math.floor((originY + heightPx) / TILE_SIZE);

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  ctx.fillStyle = "#ebe6db";
  ctx.fillRect(0, 0, widthPx, heightPx);

  const subs = ["a", "b", "c"];
  const tileLoads: Promise<void>[] = [];
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      tileLoads.push(
        (async () => {
          const url = TILE_URL.replace("{s}", subs[(tx + ty) % subs.length]!)
            .replace("{z}", String(z))
            .replace("{x}", String(tx))
            .replace("{y}", String(ty));
          const tile = await loadImage(url);
          ctx.drawImage(tile, tx * TILE_SIZE - originX, ty * TILE_SIZE - originY, TILE_SIZE, TILE_SIZE);
        })(),
      );
    }
  }
  await Promise.all(tileLoads);

  const pinW = 40;
  const pinH = Math.round((pinW * 44) / 32);
  const pinX = center.x - originX;
  const pinY = center.y - originY;
  const pinImg = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mapMarkerPinSvg("verificado", pinW))}`,
  );
  ctx.drawImage(pinImg, pinX - pinW / 2, pinY - pinH, pinW, pinH);

  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Captura el mapa visible en pantalla. */
export async function captureMapElement(el: HTMLElement): Promise<string> {
  const target =
    el.querySelector<HTMLElement>(".leaflet-container") ??
    (el.classList.contains("leaflet-container") ? el : el);
  await new Promise((r) => setTimeout(r, 400));
  return captureElementToJpeg(target);
}

/** Mapa Leaflet temporal (mismo estilo que MapPicker). */
export async function captureLeafletMapSnapshot(
  lat: number,
  lng: number,
  zoom: number,
  widthPx = 560,
  heightPx = 300,
): Promise<string> {
  const z = Math.min(19, Math.max(12, Math.round(zoom)));

  const host = document.createElement(String.fromCharCode(100, 105, 118));
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${widthPx}px`,
    `height:${heightPx}px`,
    "overflow:hidden",
    "opacity:0",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(host);

  const map = L.map(host, {
    zoomControl: true,
    attributionControl: true,
    preferCanvas: false,
  }).setView([lat, lng], z);

  L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
  L.marker([lat, lng], { icon: createSiratMapMarkerIcon("verificado") }).addTo(map);

  try {
    map.invalidateSize();
    await waitForMapTiles(map);
    const dataUrl = await captureElementToJpeg(host);
    if (!isUsableMapDataUrl(dataUrl)) {
      throw new Error("Captura Leaflet vacía");
    }
    return dataUrl;
  } finally {
    map.remove();
    host.remove();
  }
}

/** Mapa para PDF: intenta pantalla → Leaflet → tiles OSM. */
export async function captureFormularioMapForPdf(
  lat: number,
  lng: number,
  zoom: number,
  mapElement?: HTMLElement | null,
): Promise<string> {
  const errors: unknown[] = [];

  if (mapElement) {
    try {
      const url = await captureMapElement(mapElement);
      if (isUsableMapDataUrl(url)) return url;
      errors.push(new Error("Captura en pantalla vacía"));
    } catch (e) {
      errors.push(e);
    }
  }

  try {
    const url = await captureLeafletMapSnapshot(lat, lng, zoom);
    if (isUsableMapDataUrl(url)) return url;
    errors.push(new Error("Captura Leaflet vacía"));
  } catch (e) {
    errors.push(e);
  }

  try {
    const url = await captureOsmTileComposite(lat, lng, zoom);
    if (isUsableMapDataUrl(url)) return url;
    errors.push(new Error("Composición OSM vacía"));
  } catch (e) {
    errors.push(e);
  }

  console.warn("No se pudo generar mapa para PDF:", errors);
  throw new Error("No se pudo generar la imagen del mapa");
}
