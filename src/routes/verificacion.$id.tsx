import { createFileRoute, Link } from "@tanstack/react-router";
import { NotificacionVerificacionView } from "@/components/NotificacionVerificacionView";
import { getNotificacionPublicaFn } from "@/functions/get-notificacion-publica";
import { SiratLoginBrand } from "@/components/SiratLoginBrand";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/verificacion/$id")({
  loader: async ({ params }) => getNotificacionPublicaFn({ data: { id: params.id } }),
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
            No se encontró la notificación o el enlace no es válido. Si acaba de crearla, vuelva a generar el
            código QR desde SIRAT.
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
