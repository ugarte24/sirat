import { createFileRoute, Link } from "@tanstack/react-router";
import { FormularioVerificacionPdfView } from "@/components/FormularioVerificacionPdfView";
import { loadVerificacionFormulario } from "@/lib/verificacion-formulario";
import { SiratLoginBrand } from "@/components/SiratLoginBrand";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/verificacion-formulario/$id")({
  loader: async ({ params }) => loadVerificacionFormulario(params.id),
  component: VerificacionFormularioPage,
  pendingComponent: VerificacionPending,
});

function VerificacionPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function VerificacionFormularioPage() {
  const result = Route.useLoaderData();
  const payload = result.ok ? result.payload : null;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-3xl justify-center">
        <SiratLoginBrand />
      </div>

      {!payload ? (
        <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="font-display text-lg font-bold text-foreground">Formulario no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No se encontró el formulario o el enlace no es válido. Genere un código QR nuevo desde el detalle
            del formulario en SIRAT.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Ir a SIRAT
          </Link>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl">
          <FormularioVerificacionPdfView payload={payload} />
        </div>
      )}
    </div>
  );
}
