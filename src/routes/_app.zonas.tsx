import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ZonaLimitesEditor } from "@/components/ZonaLimitesEditor";

export const Route = createFileRoute("/_app/zonas")({
  component: ZonasPage,
});

function ZonasPage() {
  const { role } = useAuth();

  if (role !== "admin") {
    return <p className="py-8 text-center text-muted-foreground">Solo administradores.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Líneas de zonas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dibuje líneas que separan dos zonas tributarias (A–E). Cada línea compartida evita brechas entre zonas
          vecinas.
        </p>
      </div>
      <ZonaLimitesEditor />
    </div>
  );
}
