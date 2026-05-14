import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContribuyenteAltaForm } from "@/components/forms/ContribuyenteAltaForm";
import { MoreVertical, Plus, Search, User } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type ContribSearch = { nuevo?: boolean };

type ContribRow = Pick<Tables<"contribuyentes">, "id" | "ci" | "nombre_completo" | "telefono" | "created_at">;

type ContribListItem = ContribRow & {
  puedeDarDeBaja: boolean;
};

export const Route = createFileRoute("/_app/contribuyentes/")({
  validateSearch: (raw: Record<string, unknown>): ContribSearch => ({
    nuevo:
      raw.nuevo === true ||
      raw.nuevo === 1 ||
      raw.nuevo === "1" ||
      raw.nuevo === "true",
  }),
  component: ListaContribuyentes,
});

function countByContribuyente(rows: { contribuyente_id: string }[] | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows ?? []) {
    m.set(r.contribuyente_id, (m.get(r.contribuyente_id) ?? 0) + 1);
  }
  return m;
}

function ListaContribuyentes() {
  const navigate = useNavigate();
  const { nuevo } = Route.useSearch();
  const [list, setList] = useState<ContribListItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [altaKey, setAltaKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: contribs, error } = await supabase
      .from("contribuyentes")
      .select("id, ci, nombre_completo, telefono, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
      setList([]);
      setLoading(false);
      return;
    }
    const base = (contribs ?? []) as ContribRow[];
    if (base.length === 0) {
      setList([]);
      setLoading(false);
      return;
    }
    const ids = base.map((c) => c.id);
    const [{ data: formRows }, { data: notifRows }] = await Promise.all([
      supabase.from("formularios").select("contribuyente_id").in("contribuyente_id", ids),
      supabase.from("notificaciones").select("contribuyente_id").in("contribuyente_id", ids),
    ]);
    const nForm = countByContribuyente(formRows);
    const nNotif = countByContribuyente(notifRows);
    setList(
      base.map((c) => ({
        ...c,
        puedeDarDeBaja: (nForm.get(c.id) ?? 0) === 0 && (nNotif.get(c.id) ?? 0) === 0,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (nuevo) {
      setAltaKey((k) => k + 1);
      setDialogOpen(true);
      void navigate({
        search: (prev) => {
          const next = { ...(prev as Record<string, unknown>) };
          delete next.nuevo;
          return next as ContribSearch;
        },
        replace: true,
      });
    }
  }, [nuevo, navigate]);

  const darDeBaja = async (item: ContribListItem) => {
    if (!item.puedeDarDeBaja) {
      toast.error("No se puede dar de baja: tiene formularios o notificaciones asociadas.");
      return;
    }
    if (!confirm(`¿Dar de baja a «${item.nombre_completo}»? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("contribuyentes").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Contribuyente dado de baja");
      void load();
    }
  };

  const filtered = list.filter(
    (c) =>
      !q ||
      c.nombre_completo.toLowerCase().includes(q.toLowerCase()) ||
      c.ci.includes(q),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Contribuyentes</h1>
        <Button
          type="button"
          size="sm"
          className="bg-gradient-primary"
          onClick={() => {
            setAltaKey((k) => k + 1);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo contribuyente</DialogTitle>
            <DialogDescription>Ingrese C.I., nombre completo y teléfono opcional.</DialogDescription>
          </DialogHeader>
          <ContribuyenteAltaForm
            key={altaKey}
            onSuccess={() => {
              setDialogOpen(false);
              void load();
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o C.I."
          className="pl-9"
        />
      </div>
      <div className="space-y-2">
        {loading && (
          <p className="text-center text-sm text-muted-foreground py-8">Cargando…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Sin contribuyentes</p>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="flex items-stretch gap-1">
            <Link to="/contribuyentes/$id" params={{ id: c.id }} className="min-w-0 flex-1">
              <Card className="p-4 flex items-center gap-3 hover:shadow-soft transition-shadow h-full">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.nombre_completo}</div>
                  <div className="text-xs text-muted-foreground">
                    C.I. {c.ci} {c.telefono && `• ${c.telefono}`}
                  </div>
                </div>
              </Card>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 self-center"
                  aria-label={`Acciones: ${c.nombre_completo}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/contribuyentes/$id" params={{ id: c.id }}>
                    Editar datos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={!c.puedeDarDeBaja}
                  title={
                    c.puedeDarDeBaja
                      ? undefined
                      : "Tiene formularios de actividad o notificaciones vinculadas"
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    void darDeBaja(c);
                  }}
                >
                  Dar de baja
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
