import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { NotificacionVerificacionView } from "@/components/NotificacionVerificacionView";
import { decodeNotificacionQrPayload } from "@/lib/notificacion-qr";
import { SiratLoginBrand } from "@/components/SiratLoginBrand";

type VerificacionSearch = {
  d?: string;
};

export const Route = createFileRoute("/v/notificacion")({
  validateSearch: (search: Record<string, unknown>): VerificacionSearch => ({
    d: typeof search.d === "string" ? search.d : undefined,
  }),
  beforeLoad: ({ search }) => {
    const data = search.d ? decodeNotificacionQrPayload(search.d) : null;
    if (data?.id) {
      throw redirect({
        to: "/verificacion/$id",
        params: { id: data.id },
        search: { d: search.d },
      });
    }
  },
  component: VerificacionNotificacionLegacyPage,
});

/** Compatibilidad con QRs antiguos que embebían datos en ?d= */
function VerificacionNotificacionLegacyPage() {
  const { d } = Route.useSearch();
  const data = d ? decodeNotificacionQrPayload(d) : null;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-lg justify-center">
        <SiratLoginBrand />
      </div>

      {!data ? (
        <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="font-display text-lg font-bold text-foreground">Enlace no válido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El código QR no contiene datos de notificación válidos o el enlace está incompleto.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Ir a SIRAT
          </Link>
        </div>
      ) : (
        <NotificacionVerificacionView data={data} />
      )}
    </div>
  );
}
