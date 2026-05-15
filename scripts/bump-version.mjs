/**
 * Incrementa el patch de package.json (y package-lock.json).
 * Se ejecuta en pre-commit para reflejar cada cambio publicado.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const before = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;

execSync("npm version patch --no-git-tag-version", { cwd: root, stdio: "inherit" });

const after = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
if (before !== after) {
  console.log(`SIRAT: versión ${before} → ${after}`);
}
