import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormularioNuevaActividadForm } from "@/components/forms/FormularioNuevaActividadForm";
import { ContribuyenteAltaForm } from "@/components/forms/ContribuyenteAltaForm";
import { Plus, Search, ClipboardList } from "lucide-react";

type FormSearch = { nuevo?: boolean };

export const Route = createFileRoute("/_app/formularios/")({
  validateSearch: (raw: Record<string, unknown>): FormSearch => ({
    nuevo:
      raw.nuevo === true ||
      raw.nuevo === 1 ||
      raw.nuevo === "1" ||
      raw.nuevo === "true",
  }),
  component: Lista,
});

function Lista() {
  const navigate = useNavigate({ from: Route.id });
  const { nuevo } = Route.useSearch();
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subvista, setSubvista] = useState<"formulario" | "contrib">("formulario");
  const [formKey, setFormKey] = useState(0);
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("formularios")
      .select("*, contribuyente:contribuyentes(nombre_completo,ci)")
      .order("numero", { ascending: false })
      .limit(200);
    setList(data ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (nuevo) {
      setSubvista("formulario");
      setFormKey((k) => k + 1);
      setDialogOpen(true);
      void navigate({ search: { nuevo: undefined }, replace: true });
    }
  }, [nuevo, navigate]);

  const filtered = list.filter(
    (f) =>
      !q ||
      f.razon_social.toLowerCase().includes(q.toLowerCase()) ||
      f.contribuyente?.nombre_completo?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Formularios</h1>
        <Button
          type="button"
          size="sm"
          className="bg-gradient-primary"
          onClick={() => {
            setSubvista("formulario");
            setFormKey((k) => k + 1);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
        </Button>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSubvista("formulario");
        }}
      >
        <DialogContent className="max-w-[min(100%,40rem)] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {subvista === "contrib" ? "Nuevo contribuyente" : "Nuevo formulario de verificación"}
            </DialogTitle>
            <DialogDescription>
              {subvista === "contrib"
                ? "Registre el contribuyente y continúe con el formulario de actividad."
                : "Complete los datos, ubicación en mapa y fotos si aplica."}
            </DialogDescription>
          </DialogHeader>

          {subvista === "contrib" ? (
            <div className="space-y-3">
              <ContribuyenteAltaForm
                onSuccess={() => {
                  setCatalogRefreshKey((k) => k + 1);
                  setSubvista("formulario");
                }}
              />
              <Button type="button" variant="outline" className="w-full" onClick={() => setSubvista("formulario")}>
                Seguir con el formulario de verificación
              </Button>
            </div>
          ) : (
            <FormularioNuevaActividadForm
              key={formKey}
              catalogRefreshKey={catalogRefreshKey}
              onSuccess={() => {
                setDialogOpen(false);
                void load();
              }}
              onPedirAltaContribuyente={() => setSubvista("contrib")}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por razón social o contribuyente"
          className="pl-9"
        />
      </div>
      <div className="space-y-2">
        {filtered.map((f) => (
          <Link key={f.id} to="/formularios/$id" params={{ id: f.id }}>
            <Card className="p-4 hover:shadow-soft transition-shadow">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">N° {f.numero}</span>
                    <Badge
                      variant={
                        f.estado === "activo"
                          ? "default"
                          : f.estado === "baja"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {f.estado}
                    </Badge>
                    <Badge variant="outline">Zona {f.zona}</Badge>
                  </div>
                  <div className="font-medium truncate mt-1">{f.razon_social}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {f.contribuyente?.nombre_completo} • {f.direccion}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Sin formularios</p>
        )}
      </div>
    </div>
  );
}
