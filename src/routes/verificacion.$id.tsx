import { createFileRoute, Link } from "@tanstack/react-router";
import { NotificacionVerificacionView } from "@/components/NotificacionVerificacionView";
import {
  loadVerificacionNotificacion,
  parseVerificacionSearch,
} from "@/lib/verificacion-notificacion";
import { useAutoNotificacionPdfDownload } from "@/hooks/use-auto-notificacion-pdf";
import { SiratLoginBrand } from "@/components/SiratLoginBrand";
import { Loader2, FileDown } from "lucide-react";

export const Route = createFileRoute("/verificacion/$id")({
  validateSearch: (search) => parseVerificacionSearch(search),
  loader: async ({ params, location }) => {
    const { d } = location.search as ReturnType<typeof parseVerificacionSearch>;
    return loadVerificacionNotificacion(params.id, d);
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
  const payload = result.ok ? result.payload : null;
  const { status: pdfStatus, retry } = useAutoNotificacionPdfDownload(payload);

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-lg justify-center">
        <SiratLoginBrand />
      </div>

      {!payload ? (
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
        <div className="mx-auto max-w-lg space-y-4">
          <NotificacionVerificacionView data={payload} />

          {pdfStatus === "downloading" && (
            <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Descargando PDF…
            </p>
          )}

          {pdfStatus === "done" && (
            <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-center text-sm">
              <p className="flex items-center justify-center gap-2 font-medium text-foreground">
                <FileDown className="h-4 w-4 text-primary" />
                PDF descargado
              </p>
              <p className="mt-1 text-muted-foreground">
                Si no lo ve, revise la carpeta de descargas del dispositivo.
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Descargar de nuevo
              </button>
            </div>
          )}

          {pdfStatus === "error" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-center text-sm">
              <p className="text-destructive">No se pudo generar el PDF.</p>
              <button
                type="button"
                onClick={retry}
                className="mt-2 font-medium text-primary hover:underline"
              >
                Reintentar descarga
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
