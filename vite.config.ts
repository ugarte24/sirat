// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

/** Vercel define `VERCEL=1` en el build; ahí usamos Nitro y no el bundle de Cloudflare Workers. */
const deployVercel = process.env.VERCEL === "1";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  ...(deployVercel
    ? {
        cloudflare: false as const,
        plugins: [nitro()],
      }
    : {}),
  tanstackStart: {
    server: { entry: "server" },
  },
  // Puerto fijo para no chocar con otras apps en 8080 (p. ej. J-Cell).
  vite: {
    server: {
      // Puerto por defecto de SIRAT; si está ocupado, Vite prueba el siguiente.
      port: 5740,
      strictPort: false,
    },
  },
});
