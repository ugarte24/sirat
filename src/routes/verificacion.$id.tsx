import { createFileRoute, Link } from "@tanstack/react-router";
import { NotificacionVerificacionView } from "@/components/NotificacionVerificacionView";
import { getNotificacionPublicaFn } from "@/functions/get-notificacion-publica";
import { decodeNotificacionQrPayload } from "@/lib/notificacion-qr";
import { SiratLoginBrand } from "@/components/SiratLoginBrand";
import { Loader2 } from "lucide-react";

type VerificacionSearch = {
  d?: string;
};

export type VerificacionLoaderResult =
  | { ok: true; payload: NonNullable<ReturnType<typeof decodeNotificacionQrPayload>> }
  | { ok: false };

function payloadFromSearch(id: string, d?: string) {
  if (!d) return null;
  const decoded = decodeNotificacionQrPayload(d);
  if (!decoded || decoded.id !== id) return null;
  return decoded;
}

export const Route = createFileRoute("/verificacion/$id")({
  validateSearch: (search: Record<string, unknown>): VerificacionSearch => ({
    d: typeof search.d === "string" ? search.d : undefined,
  }),
  loader: async ({ params, location }): Promise<VerificacionLoaderResult> => {
    const d = (location.search as VerificacionSearch).d;
    const fromQr = payloadFromSearch(params.id, d);

    try {
      const result = await getNotificacionPublicaFn({ data: { id: params.id } });
      if (result.ok && result.payload) {
        return { ok: true, payload: result.payload };
      }
    } catch (e) {
      console.warn("[verificacion] lectura en servidor falló, se usa respaldo del QR:", e);
    }

    if (fromQr) return { ok: true, payload: fromQr };
    return { ok: false };
  },
  component: VerificacionNotificacionPage,
  pendingComponent: VerificacionPending,
});

function VerificacionPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function VerificacionNotificacionPage() {
  const result = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-lg justify-center">
        <SiratLoginBrand />
      </div>

      {!result.ok || !result.payload ? (
        <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="font-display text-lg font-bold text-foreground">Notificación no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No se encontró la notificación o el enlace no es válido. Genere un código QR nuevo desde el detalle
            de la notificación en SIRAT.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Ir a SIRAT
          </Link>
        </div>
      ) : (
        <NotificacionVerificacionView data={result.payload} />
      )}
    </div>
  );
}
