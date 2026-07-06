/**
 * Vacía el bucket obsoleto `formulario-visita-fotos` vía Storage API.
 * Luego borre el bucket en SQL Editor (con set_config) o en Storage → Delete bucket.
 *
 * Uso: node scripts/remove-visita-fotos-bucket.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BUCKET = "formulario-visita-fotos";
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
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function listPaths(prefix = "") {
  const paths = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) {
    if (error.message?.toLowerCase().includes("not found")) return paths;
    throw error;
  }
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) paths.push(path);
    else paths.push(...(await listPaths(path)));
  }
  return paths;
}

try {
  const paths = await listPaths();
  console.log(`Objetos en ${BUCKET}: ${paths.length}`);

  if (paths.length) {
    for (let i = 0; i < paths.length; i += 1000) {
      const batch = paths.slice(i, i + 1000);
      const { error } = await supabase.storage.from(BUCKET).remove(batch);
      if (error) throw error;
      console.log(`Eliminados ${batch.length} objeto(s)`);
    }
  }

  console.log(`
Listo. Para quitar el bucket vacío, ejecute en SQL Editor:

  SELECT set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.buckets WHERE id = 'formulario-visita-fotos';

O en Supabase → Storage → ${BUCKET} → Delete bucket.
`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
