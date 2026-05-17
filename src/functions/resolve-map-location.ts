import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  extractMapUrlFromText,
  isAllowedMapResolveUrl,
  parseMapLocationInput,
} from "@/lib/parse-map-location";

const inputSchema = z.object({
  text: z.string().trim().min(1).max(2048),
});

async function followMapRedirects(startUrl: string): Promise<string> {
  const res = await fetch(startUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(12_000),
  });
  return res.url || startUrl;
}

/** Resuelve enlaces cortos de WhatsApp / Google Maps y devuelve coordenadas. */
export const resolveMapLocationFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const text = data.text.trim();

    const direct = parseMapLocationInput(text);
    if (direct) return { ok: true as const, lat: direct.lat, lng: direct.lng };

    const url = extractMapUrlFromText(text);
    if (!url || !isAllowedMapResolveUrl(url)) {
      return { ok: false as const, code: "invalid" as const };
    }

    try {
      const expanded = await followMapRedirects(url);
      const fromUrl = parseMapLocationInput(expanded);
      if (fromUrl) return { ok: true as const, lat: fromUrl.lat, lng: fromUrl.lng };

      return { ok: false as const, code: "no_coords" as const };
    } catch (e) {
      console.error("[resolveMapLocationFn]", e);
      return { ok: false as const, code: "fetch_failed" as const };
    }
  });
