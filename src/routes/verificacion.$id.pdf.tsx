import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiratLoginBrand } from "@/components/SiratLoginBrand";
import {
  loadVerificacionNotificacion,
  parseVerificacionSearch,
} from "@/lib/verificacion-notificacion";
import { notificacionQrPayloadToPdfData } from "@/lib/pdf";
import { Loader2, FileDown } from "lucide-react";

export const Route = createFileRoute("/verificacion/$id/pdf")({
  validateSearch: (search) => parseVerificacionSearch(search),
  loader: async ({ params, location }) => {
    const { d } = location.search as ReturnType<typeof parseVerificacionSearch>;
    return loadVerificacionNotificacion(params.id, d);
  },
  component: VerificacionNotificacionPdfPage,
  pendingComponent: VerificacionPdfPending,
});

function VerificacionPdfPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function VerificacionNotificacionPdfPage() {
  const result = Route.useLoaderData();
  const { d } = Route.useSearch();
  const started = useRef(false);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    if (!result.ok || !result.payload) {
      setStatus("error");
      return;
    }
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const { generateNotificacionPDF } = await import("@/lib/pdf");
        await generateNotificacionPDF(notificacionQrPayloadToPdfData(result.payload));
        setStatus("done");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    })();
  }, [result]);

  const retryDownload = () => {
    if (!result.ok || !result.payload) return;
    setStatus("loading");
    void import("@/lib/pdf").then(({ generateNotificacionPDF }) =>
      generateNotificacionPDF(notificacionQrPayloadToPdfData(result.payload!)).then(() =>
        setStatus("done"),
      ),
    );
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-lg justify-center">
        <SiratLoginBrand />
      </div>

      <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 font-display text-lg font-bold">Preparando PDF…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Se descargará la notificación tributaria en unos segundos.
            </p>
          </>
        )}

        {status === "done" && result.ok && (
          <>
            <FileDown className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-4 font-display text-lg font-bold">PDF listo</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Si no se descargó solo, use el botón inferior o revise la carpeta de descargas.
            </p>
            <button
              type="button"
              onClick={retryDownload}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Descargar de nuevo
            </button>
            <Link
              to="/verificacion/$id"
              params={{ id: result.payload.id }}
              search={d ? { d } : {}}
              className="mt-3 block text-sm font-medium text-primary hover:underline"
            >
              Ver datos en pantalla
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="font-display text-lg font-bold">No se pudo generar el PDF</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              El enlace no es válido o los datos no están disponibles. Genere un código QR nuevo
              desde SIRAT.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Ir a SIRAT
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
