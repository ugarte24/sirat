import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificacionNuevaForm } from "@/components/forms/NotificacionNuevaForm";
import { ContribuyenteAltaForm } from "@/components/forms/ContribuyenteAltaForm";
import {
  DataListCard,
  DataListTable,
  DataListTableWrap,
  DataListTbody,
  DataListTd,
  DataListTheadRow,
  DataListTh,
  ilikePattern,
  LIST_PAGE_SIZE,
  pillMuted,
  pillSuccess,
  TablePaginationFooter,
} from "@/components/data-list";
import { TableRow } from "@/components/ui/table";
import { ChevronRight, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type NotifSearch = { nueva?: boolean };

type NotifRow = Pick<
  Database["public"]["Tables"]["notificaciones"]["Row"],
  "id" | "fecha_limite" | "estado" | "nombre_actividad" | "created_at" | "contribuyente_id"
> & {
  contribuyente: { nombre_completo: string; ci: string } | null;
};

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

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

function fmtLimite(d: string) {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function NotifEstadoPill({ estado }: { estado: Database["public"]["Enums"]["notificacion_estado"] }) {
  if (estado === "cumplido") return <span className={pillSuccess()}>Cumplido</span>;
  if (estado === "anulado") {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/15 px-3 py-0.5 text-xs font-medium text-destructive">
        Anulado
      </span>
    );
  }
  return <span className={pillMuted()}>Pendiente</span>;
}

function Lista() {
  const navigate = useNavigate();
  const { nueva } = Route.useSearch();
  const [list, setList] = useState<NotifRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [qInput, setQInput] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subvista, setSubvista] = useState<"notificacion" | "contrib">("notificacion");
  const [formKey, setFormKey] = useState(0);
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setQDeb(qInput), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(0);
  }, [qDeb]);

  const load = useCallback(async () => {
    setLoading(true);
    const from = page * LIST_PAGE_SIZE;
    const to = from + LIST_PAGE_SIZE - 1;
    const pat = ilikePattern(qDeb);

    let qb = supabase
      .from("notificaciones")
      .select(
        "id, fecha_limite, estado, nombre_actividad, created_at, contribuyente_id, contribuyente:contribuyentes(nombre_completo, ci)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (pat) {
      const { data: cm } = await supabase
        .from("contribuyentes")
        .select("id")
        .or(`nombre_completo.ilike.${pat},ci.ilike.${pat}`)
        .limit(400);
      const cids = (cm ?? []).map((r) => r.id);
      if (cids.length > 0) {
        qb = qb.or(`nombre_actividad.ilike.${pat},contribuyente_id.in.(${cids.join(",")})`);
      } else {
        qb = qb.ilike("nombre_actividad", pat);
      }
    }

    const { data, error, count } = await qb.range(from, to);
    if (error) {
      toast.error(error.message);
      setList([]);
      setTotal(null);
    } else {
      setList((data ?? []) as NotifRow[]);
      setTotal(count);
    }
    setLoading(false);
  }, [page, qDeb]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (nueva) {
      setSubvista("notificacion");
      setFormKey((k) => k + 1);
      setDialogOpen(true);
      void navigate({
        search: (prev) => {
          const next = { ...(prev as Record<string, unknown>) };
          delete next.nueva;
          return next as NotifSearch;
        },
        replace: true,
      });
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
            setSubvista("notificacion");
            setFormKey((k) => k + 1);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva
        </Button>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && subvista === "contrib") {
            setSubvista("notificacion");
            return;
          }
          setDialogOpen(open);
          if (!open) setSubvista("notificacion");
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {subvista === "contrib" ? "Nuevo contribuyente" : "Nueva notificación"}
            </DialogTitle>
            <DialogDescription>
              {subvista === "contrib"
                ? "Registre el contribuyente y continúe con la notificación."
                : "Complete los datos y emita la notificación."}
            </DialogDescription>
          </DialogHeader>

          {subvista === "contrib" ? (
            <div className="space-y-3">
              <ContribuyenteAltaForm
                onSuccess={() => {
                  setCatalogRefreshKey((k) => k + 1);
                  setSubvista("notificacion");
                }}
              />
              <Button type="button" variant="ghost" className="w-full" onClick={() => setSubvista("notificacion")}>
                Volver a nueva notificación
              </Button>
            </div>
          ) : (
            <NotificacionNuevaForm
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
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Buscar por actividad o contribuyente"
          className="pl-9"
        />
      </div>

      <DataListCard>
        <DataListTableWrap>
          <DataListTable>
            <DataListTheadRow>
              <DataListTh>Emisión</DataListTh>
              <DataListTh>Notificación</DataListTh>
              <DataListTh>Límite</DataListTh>
              <DataListTh>Estado</DataListTh>
              <DataListTh align="center">Acciones</DataListTh>
            </DataListTheadRow>
            <DataListTbody>
              {loading && (
                <TableRow>
                  <DataListTd className="py-10 text-center text-muted-foreground" colSpan={5}>
                    Cargando…
                  </DataListTd>
                </TableRow>
              )}
              {!loading && list.length === 0 && (
                <TableRow>
                  <DataListTd className="py-10 text-center text-muted-foreground" colSpan={5}>
                    Sin notificaciones
                  </DataListTd>
                </TableRow>
              )}
              {!loading &&
                list.map((n) => (
                  <TableRow
                    key={n.id}
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                    onClick={() => navigate({ to: "/notificaciones/$id", params: { id: n.id } })}
                  >
                    <DataListTd className="whitespace-nowrap text-muted-foreground">
                      {fmtFecha(n.created_at)}
                    </DataListTd>
                    <DataListTd>
                      <div className="font-semibold text-foreground">
                        {n.nombre_actividad?.trim() || n.contribuyente?.nombre_completo || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {n.contribuyente?.nombre_completo ?? "—"} — C.I. {n.contribuyente?.ci ?? "—"}
                      </div>
                    </DataListTd>
                    <DataListTd className="whitespace-nowrap text-muted-foreground">{fmtLimite(n.fecha_limite)}</DataListTd>
                    <DataListTd>
                      <NotifEstadoPill estado={n.estado} />
                    </DataListTd>
                    <DataListTd align="center" onClick={(e) => e.stopPropagation()}>
                      <Button type="button" variant="ghost" size="icon" asChild aria-label="Ver notificación">
                        <Link to="/notificaciones/$id" params={{ id: n.id }}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </DataListTd>
                  </TableRow>
                ))}
            </DataListTbody>
          </DataListTable>
        </DataListTableWrap>
        <TablePaginationFooter
          page={page}
          pageSize={LIST_PAGE_SIZE}
          total={total}
          loading={loading}
          onPageChange={setPage}
        />
      </DataListCard>
    </div>
  );
}
