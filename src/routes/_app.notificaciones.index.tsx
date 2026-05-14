import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificacionNuevaForm } from "@/components/forms/NotificacionNuevaForm";
import { Plus, Bell } from "lucide-react";

type NotifSearch = { nueva?: boolean };

export const Route = createFileRoute("/_app/notificaciones/")({
  validateSearch: (raw: Record<string, unknown>): NotifSearch => ({
    nueva:
      raw.nueva === true ||
      raw.nueva === 1 ||
      raw.nueva === "1" ||
      raw.nueva === "true",
  }),
  component: Lista,
});

function Lista() {
  const navigate = useNavigate({ from: Route.id });
  const { nueva } = Route.useSearch();
  const [list, setList] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("notificaciones")
      .select("*, contribuyente:contribuyentes(nombre_completo,ci)")
      .order("codigo", { ascending: false })
      .limit(200);
    setList(data ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (nueva) {
      setFormKey((k) => k + 1);
      setDialogOpen(true);
      void navigate({ search: { nueva: undefined }, replace: true });
    }
  }, [nueva, navigate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Notificaciones</h1>
        <Button
          type="button"
          size="sm"
          className="bg-gradient-gold text-gold-foreground"
          onClick={() => {
            setFormKey((k) => k + 1);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva notificación</DialogTitle>
            <DialogDescription>Complete los datos y emita la notificación.</DialogDescription>
          </DialogHeader>
          <NotificacionNuevaForm
            key={formKey}
            onSuccess={() => {
              setDialogOpen(false);
              void load();
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {list.map((n) => (
          <Link key={n.id} to="/notificaciones/$id" params={{ id: n.id }}>
            <Card className="p-4 flex items-center gap-3 hover:shadow-soft transition-shadow">
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  n.tipo === "multa"
                    ? "bg-destructive/10 text-destructive"
                    : n.tipo === "advertencia"
                      ? "bg-warning/20 text-warning"
                      : "bg-primary/10 text-primary"
                }`}
              >
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">N° {n.codigo}</span>
                  <Badge variant="outline">{n.tipo}</Badge>
                  <Badge
                    variant={
                      n.estado === "cumplido"
                        ? "default"
                        : n.estado === "anulado"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {n.estado}
                  </Badge>
                </div>
                <div className="font-medium truncate mt-0.5">{n.nombre_notificado}</div>
                <div className="text-xs text-muted-foreground">Hasta: {n.fecha_limite}</div>
              </div>
            </Card>
          </Link>
        ))}
        {list.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Sin notificaciones</p>
        )}
      </div>
    </div>
  );
}
