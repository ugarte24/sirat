/**
 * Busca notificaciones duplicadas (mismo contribuyente, actividad, dirección,
 * fecha límite y minuto de creación) y opcionalmente elimina el más reciente de cada grupo.
 *
 * Uso:
 *   node scripts/find-duplicate-notificaciones.mjs
 *   node scripts/find-duplicate-notificaciones.mjs --delete
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i).trim(), v];
    }),
);

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Faltan VITE_SUPABASE_URL y clave en .env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const shouldDelete = process.argv.includes("--delete");

const { data: rows, error } = await supabase
  .from("notificaciones")
  .select(
    "id, contribuyente_id, nombre_actividad, direccion, fecha_limite, created_at, estado, veces_notificado, contribuyente:contribuyentes(nombre_completo, ci)",
  )
  .order("created_at", { ascending: true });

if (error) {
  console.error(error.message);
  process.exit(1);
}

function groupKey(n) {
  const minute = n.created_at?.slice(0, 16) ?? "";
  return [
    n.contribuyente_id ?? "",
    (n.nombre_actividad ?? "").trim().toUpperCase(),
    (n.direccion ?? "").trim().toUpperCase(),
    n.fecha_limite ?? "",
    minute,
  ].join("|");
}

const groups = new Map();
for (const row of rows ?? []) {
  const k = groupKey(row);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(row);
}

const duplicates = [...groups.values()].filter((g) => g.length > 1);

if (!duplicates.length) {
  console.log("No se encontraron notificaciones duplicadas.");
  process.exit(0);
}

console.log(`Grupos duplicados: ${duplicates.length}\n`);

const toDelete = [];

for (const group of duplicates) {
  const sorted = [...group].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const keep = sorted[0];
  const remove = sorted.slice(1);
  const co = keep.contribuyente;
  console.log("---");
  console.log(`Actividad: ${keep.nombre_actividad ?? "(sin nombre)"}`);
  console.log(`Contribuyente: ${co?.nombre_completo ?? "—"} (${co?.ci ?? "—"})`);
  console.log(`Dirección: ${keep.direccion}`);
  console.log(`Fecha límite: ${keep.fecha_limite}`);
  console.log(`Creadas en el mismo minuto: ${keep.created_at.slice(0, 16)}`);
  console.log(`MANTENER: ${keep.id} (${keep.created_at})`);
  for (const r of remove) {
    console.log(`ELIMINAR: ${r.id} (${r.created_at})`);
    toDelete.push(r.id);
  }
}

console.log(`\nTotal a eliminar: ${toDelete.length}`);

if (!shouldDelete) {
  console.log("\nEjecute con --delete para eliminar los duplicados (se conserva el más antiguo de cada grupo).");
  process.exit(0);
}

for (const id of toDelete) {
  const { error: delErr } = await supabase.from("notificaciones").delete().eq("id", id);
  if (delErr) {
    console.error(`Error al eliminar ${id}:`, delErr.message);
    process.exit(1);
  }
  console.log(`Eliminada: ${id}`);
}

console.log("\nListo.");
