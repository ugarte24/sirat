import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ZonaTipo = Database["public"]["Enums"]["zona_tipo"];

export type ZonaDivisionRow = {
  id: string;
  coordenadas: [number, number][];
  zona_lado_a: ZonaTipo;
  zona_lado_b: ZonaTipo;
};

export const ZONAS_ORDEN: ZonaTipo[] = ["A", "B", "C", "D", "E"];

export const ZONA_LINE_COLORS: Record<ZonaTipo, string> = {
  A: "#dc2626",
  B: "#2563eb",
  C: "#16a34a",
  D: "#ea580c",
  E: "#9333ea",
};

const CACHE_TTL_MS = 60_000;
let cache: { rows: ZonaDivisionRow[]; at: number } | null = null;

function parseLineCoords(raw: unknown): [number, number][] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const pts: [number, number][] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 2) return null;
    const lat = Number(item[0]);
    const lng = Number(item[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    pts.push([lat, lng]);
  }
  return pts;
}

export function coordsToLatLngs(coords: [number, number][]): L.LatLngExpression[] {
  return coords.map(([la, ln]) => [la, ln] as L.LatLngExpression);
}

export async function fetchZonaDivisiones(force = false): Promise<ZonaDivisionRow[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.rows;
  }
  const { data, error } = await supabase
    .from("zona_divisiones")
    .select("id, coordenadas, zona_lado_a, zona_lado_b")
    .order("updated_at", { ascending: true });
  if (error) throw error;
  const rows: ZonaDivisionRow[] = [];
  for (const row of data ?? []) {
    const coords = parseLineCoords(row.coordenadas);
    if (!coords) continue;
    rows.push({
      id: row.id,
      coordenadas: coords,
      zona_lado_a: row.zona_lado_a,
      zona_lado_b: row.zona_lado_b,
    });
  }
  cache = { rows, at: Date.now() };
  return rows;
}

/** @deprecated usar fetchZonaDivisiones */
export const fetchZonaLimites = fetchZonaDivisiones;

export function invalidateZonaDivisionesCache() {
  cache = null;
}

export const invalidateZonaLimitesCache = invalidateZonaDivisionesCache;

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function closestPointOnSegment(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): [number, number] {
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  if (dx === 0 && dy === 0) return [lat1, lng1];
  const t = Math.max(0, Math.min(1, ((lng - lng1) * dx + (lat - lat1) * dy) / (dx * dx + dy * dy)));
  return [lat1 + t * dy, lng1 + t * dx];
}

type NearestSegment = {
  i: number;
  dist: number;
  closest: [number, number];
};

function nearestSegment(lat: number, lng: number, coords: [number, number][]): NearestSegment | null {
  if (coords.length < 2) return null;
  let best: NearestSegment | null = null;
  for (let i = 0; i < coords.length - 1; i++) {
    const [la1, ln1] = coords[i];
    const [la2, ln2] = coords[i + 1];
    const closest = closestPointOnSegment(lat, lng, la1, ln1, la2, ln2);
    const d = haversineMeters(lat, lng, closest[0], closest[1]);
    if (!best || d < best.dist) {
      best = { i, dist: d, closest };
    }
  }
  return best;
}

/**
 * Lado respecto al sentido de la línea (primer punto → último).
 * `a` = izquierda del recorrido; `b` = derecha.
 */
export function ladoDePunto(
  lat: number,
  lng: number,
  coords: [number, number][],
): "a" | "b" | null {
  const near = nearestSegment(lat, lng, coords);
  if (!near) return null;
  const [la1, ln1] = coords[near.i];
  const [la2, ln2] = coords[near.i + 1];
  const cross = (lng - ln1) * (la2 - la1) - (lat - la1) * (ln2 - ln1);
  if (Math.abs(cross) < 1e-12) return null;
  return cross > 0 ? "a" : "b";
}

/**
 * Zona del punto eliminando candidatos según cada línea divisoria.
 * Si queda una sola zona, la devuelve; si hay ambigüedad o ninguna, null.
 */
export function zonaDesdeCoordenadas(
  lat: number,
  lng: number,
  divisiones: ZonaDivisionRow[],
): ZonaTipo | null {
  if (!divisiones.length) return null;

  const candidates = new Set<ZonaTipo>(ZONAS_ORDEN);

  for (const div of divisiones) {
    const lado = ladoDePunto(lat, lng, div.coordenadas);
    if (lado === null) continue;
    if (lado === "a") {
      if (candidates.has(div.zona_lado_b)) candidates.delete(div.zona_lado_b);
    } else {
      if (candidates.has(div.zona_lado_a)) candidates.delete(div.zona_lado_a);
    }
  }

  if (candidates.size === 1) return [...candidates][0];
  return null;
}

/** Detecta zona en coordenadas usando las líneas divisorias guardadas (caché compartida). */
export async function detectZonaEnCoordenadas(lat: number, lng: number): Promise<ZonaTipo | null> {
  const divisiones = await fetchZonaDivisiones();
  return zonaDesdeCoordenadas(lat, lng, divisiones);
}

export type ZonaSnapResult = {
  lat: number;
  lng: number;
  snapped: boolean;
};

/** Magnetiza a vértices o trazado de líneas divisorias existentes. */
export function snapToDivisiones(
  lat: number,
  lng: number,
  divisiones: ZonaDivisionRow[],
  opts: { draftPoints?: [number, number][]; thresholdMeters?: number } = {},
): ZonaSnapResult {
  const threshold = opts.thresholdMeters ?? 40;
  let bestDist = threshold;
  let best: ZonaSnapResult = { lat, lng, snapped: false };

  const lines = [...divisiones.map((d) => d.coordenadas), ...(opts.draftPoints?.length ? [opts.draftPoints] : [])];

  for (const coords of lines) {
    for (const [vLat, vLng] of coords) {
      const d = haversineMeters(lat, lng, vLat, vLng);
      if (d < bestDist) {
        bestDist = d;
        best = { lat: vLat, lng: vLng, snapped: true };
      }
    }
    for (let i = 0; i < coords.length - 1; i++) {
      const [la1, ln1] = coords[i];
      const [la2, ln2] = coords[i + 1];
      const [cLat, cLng] = closestPointOnSegment(lat, lng, la1, ln1, la2, ln2);
      const d = haversineMeters(lat, lng, cLat, cLng);
      if (d < bestDist) {
        bestDist = d;
        best = { lat: cLat, lng: cLng, snapped: true };
      }
    }
  }
  return best;
}

export function divisionLabel(div: ZonaDivisionRow): string {
  return `Zona ${div.zona_lado_a} | Zona ${div.zona_lado_b}`;
}

export function divisionLineColor(div: ZonaDivisionRow): string {
  return ZONA_LINE_COLORS[div.zona_lado_a];
}

function zonaSideLabelIcon(zona: ZonaTipo): L.DivIcon {
  const color = ZONA_LINE_COLORS[zona];
  return L.divIcon({
    className: "sirat-zona-label",
    html: `<span style="color:${color};font-weight:700;font-size:12px;white-space:nowrap;text-shadow:0 0 4px #fff,0 0 4px #fff,0 1px 2px rgba(15,23,42,0.25)">Zona ${zona}</span>`,
    iconSize: [56, 20],
    iconAnchor: [0, 10],
  });
}

function divisionBounds(divisiones: ZonaDivisionRow[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const div of divisiones) {
    for (const [la, ln] of div.coordenadas) {
      minLat = Math.min(minLat, la);
      maxLat = Math.max(maxLat, la);
      minLng = Math.min(minLng, ln);
      maxLng = Math.max(maxLng, ln);
    }
  }
  const padLat = Math.max((maxLat - minLat) * 0.06, 0.004);
  const padLng = Math.max((maxLng - minLng) * 0.06, 0.004);
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
  };
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Percentil de latitud por zona (más bajo = etiqueta más al sur). */
const ZONA_LABEL_LAT_PERCENTILE: Record<ZonaTipo, number> = {
  A: 0.22,
  B: 0.5,
  C: 0.5,
  D: 0.5,
  E: 0.28,
};

/** Etiqueta al oeste de cada franja, centrada en el espacio de la zona. */
function computeZonaLabelPositions(divisiones: ZonaDivisionRow[]): Map<ZonaTipo, [number, number]> {
  const bounds = divisionBounds(divisiones);
  const grid = 50;
  const byZone = new Map<ZonaTipo, [number, number][]>();
  for (const z of ZONAS_ORDEN) byZone.set(z, []);

  for (let i = 0; i <= grid; i++) {
    for (let j = 0; j <= grid; j++) {
      const lat = bounds.minLat + ((bounds.maxLat - bounds.minLat) * i) / grid;
      const lng = bounds.minLng + ((bounds.maxLng - bounds.minLng) * j) / grid;
      const zona = zonaDesdeCoordenadas(lat, lng, divisiones);
      if (zona) byZone.get(zona)!.push([lat, lng]);
    }
  }

  const result = new Map<ZonaTipo, [number, number]>();
  for (const zona of ZONAS_ORDEN) {
    const pts = byZone.get(zona)!;
    if (!pts.length) continue;

    const minLng = Math.min(...pts.map((p) => p[1]));
    const maxLng = Math.max(...pts.map((p) => p[1]));
    const spanLng = maxLng - minLng || 0.001;
    const westBand = pts.filter((p) => p[1] <= minLng + spanLng * 0.22);
    const pool = westBand.length >= 4 ? westBand : pts;

    const labelLat = percentile(pool.map((p) => p[0]), ZONA_LABEL_LAT_PERCENTILE[zona]);
    const midLat = (-11 * Math.PI) / 180;
    const inwardM = 140;
    const inwardLng = inwardM / (111_320 * Math.cos(midLat));
    const labelLng = minLng + Math.min(inwardLng, spanLng * 0.35);

    result.set(zona, [labelLat, labelLng]);
  }
  return result;
}

function addUniqueZonaLabels(layer: L.LayerGroup, divisiones: ZonaDivisionRow[]) {
  const positions = computeZonaLabelPositions(divisiones);
  for (const zona of ZONAS_ORDEN) {
    const pos = positions.get(zona);
    if (!pos) continue;
    L.marker(pos, {
      interactive: false,
      icon: zonaSideLabelIcon(zona),
    }).addTo(layer);
  }
}

export function clearZonaDivisionesLayer(layer: L.LayerGroup) {
  layer.clearLayers();
}

export const clearZonaLimitesLayer = clearZonaDivisionesLayer;

export function renderZonaDivisionesOnMap(
  layer: L.LayerGroup,
  divisiones: ZonaDivisionRow[],
  opts?: { showLabels?: boolean },
) {
  clearZonaDivisionesLayer(layer);
  const showLabels = opts?.showLabels !== false;
  for (const div of divisiones) {
    const color = divisionLineColor(div);
    const line = L.polyline(coordsToLatLngs(div.coordenadas), {
      color,
      weight: 4,
      opacity: 0.92,
    });
    line.bindTooltip(divisionLabel(div), { direction: "center" });
    line.addTo(layer);
  }

  if (showLabels) {
    addUniqueZonaLabels(layer, divisiones);
  }
}

export const renderZonaLimitesOnMap = renderZonaDivisionesOnMap;

export async function insertZonaDivision(
  coordenadas: [number, number][],
  zona_lado_a: ZonaTipo,
  zona_lado_b: ZonaTipo,
  userId: string,
) {
  if (coordenadas.length < 2) throw new Error("La línea necesita al menos 2 puntos.");
  if (zona_lado_a === zona_lado_b) throw new Error("Las zonas de cada lado deben ser distintas.");
  const { error } = await supabase.from("zona_divisiones").insert({
    coordenadas,
    zona_lado_a,
    zona_lado_b,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  invalidateZonaDivisionesCache();
}

export async function updateZonaDivision(
  id: string,
  coordenadas: [number, number][],
  zona_lado_a: ZonaTipo,
  zona_lado_b: ZonaTipo,
  userId: string,
) {
  if (coordenadas.length < 2) throw new Error("La línea necesita al menos 2 puntos.");
  if (zona_lado_a === zona_lado_b) throw new Error("Las zonas de cada lado deben ser distintas.");
  const { error } = await supabase
    .from("zona_divisiones")
    .update({
      coordenadas,
      zona_lado_a,
      zona_lado_b,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  invalidateZonaDivisionesCache();
}

export async function deleteZonaDivision(id: string) {
  const { error } = await supabase.from("zona_divisiones").delete().eq("id", id);
  if (error) throw error;
  invalidateZonaDivisionesCache();
}
