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
import { NotificacionEditarForm } from "@/components/forms/NotificacionEditarForm";
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
  ORDER_CREATED_DESC,
  pillMuted,
  pillSuccess,
  TablePaginationFooter,
} from "@/components/data-list";
import { TableRow } from "@/components/ui/table";
import { ChevronRight, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import type { ContribuyenteCatalogRow } from "@/lib/sirat-forms";
import { formatDateEsBo, formatDateTimeEsBo } from "@/lib/date";
import { cn } from "@/lib/utils";
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

function NotificacionListaAcciones({
  n,
  onEdit,
  className,
}: {
  n: NotifRow;
  onEdit: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-end gap-0.5", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {n.estado === "pendiente" && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Editar notificación"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(n.id);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link to="/notificaciones/$id" params={{ id: n.id }} aria-label="Ver notificación">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function NotifEstadoPill({
  estado,
  compact,
}: {
  estado: Database["public"]["Enums"]["notificacion_estado"];
  compact?: boolean;
}) {
  if (estado === "cumplido") return <span className={pillSuccess()}>Cumplido</span>;
  if (estado === "anulado") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-destructive/15 px-3 py-0.5 text-xs font-medium text-destructive",
          compact && "px-2.5",
        )}
      >
        Anulado
      </span>
    );
  }
  return <span className={pillMuted()}>Pendiente</span>;
}

function notifTitulo(n: NotifRow): string {
  return n.nombre_actividad?.trim() || n.contribuyente?.nombre_completo || "—";
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
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [subvista, setSubvista] = useState<"notificacion" | "contrib">("notificacion");
  const [formKey, setFormKey] = useState(0);
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const [contribRecien, setContribRecien] = useState<ContribuyenteCatalogRow | null>(null);

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
      .order("created_at", ORDER_CREATED_DESC)
      .order("id", ORDER_CREATED_DESC);

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

  const openCreate = () => {
    setSubvista("notificacion");
    setContribRecien(null);
    setFormKey((k) => k + 1);
    setEditId(null);
    setDialogMode("create");
  };

  const openEdit = (id: string) => {
    setSubvista("notificacion");
    setEditId(id);
    setDialogMode("edit");
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditId(null);
    setSubvista("notificacion");
    setContribRecien(null);
  };

  useEffect(() => {
    if (nueva) {
      openCreate();
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
          onClick={openCreate}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva
        </Button>
      </div>

      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open && dialogMode === "create" && subvista === "contrib") {
            setSubvista("notificacion");
            return;
          }
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit"
                ? "Editar notificación"
                : subvista === "contrib"
                  ? "Nuevo contribuyente"
                  : "Nueva notificación"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Modifique los datos de la notificación pendiente."
                : subvista === "contrib"
                  ? "Registre el contribuyente y continúe con la notificación."
                  : "Complete los datos y emita la notificación."}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === "edit" && editId ? (
            <NotificacionEditarForm
              key={editId}
              notificacionId={editId}
              onSuccess={() => {
                closeDialog();
                void load();
              }}
              onCancel={closeDialog}
            />
          ) : subvista === "contrib" ? (
            <ContribuyenteAltaForm
              onSuccess={(contribuyente) => {
                setContribRecien(contribuyente);
                setCatalogRefreshKey((k) => k + 1);
                setSubvista("notificacion");
              }}
            />
          ) : (
            <NotificacionNuevaForm
              key={formKey}
              catalogRefreshKey={catalogRefreshKey}
              contribuyenteRecienRegistrado={contribRecien}
              onContribuyentePreseleccionado={() => setContribRecien(null)}
              onSuccess={() => {
                closeDialog();
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
        <div className="md:hidden divide-y divide-border/60">
          {loading && (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
          )}
          {!loading && list.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin notificaciones</p>
          )}
          {!loading &&
            list.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className="w-full cursor-pointer px-4 py-3.5 text-left hover:bg-muted/40 active:bg-muted/60"
                onClick={() => navigate({ to: "/notificaciones/$id", params: { id: n.id } })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate({ to: "/notificaciones/$id", params: { id: n.id } });
                  }
                }}
              >
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDateEsBo(n.created_at.slice(0, 10))}
                  </span>
                  <div className="justify-self-end">
                    <NotifEstadoPill estado={n.estado} compact />
                  </div>
                  <p className="col-span-2 mt-0.5 font-semibold text-foreground leading-snug">
                    {notifTitulo(n)}
                  </p>
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Límite: {formatDateEsBo(n.fecha_limite)}
                  </p>
                  <p className="min-w-0 text-xs text-muted-foreground leading-snug">
                    {n.contribuyente?.nombre_completo ?? "—"}
                  </p>
                  <div className="justify-self-end self-center">
                    <NotificacionListaAcciones n={n} onEdit={openEdit} />
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="hidden md:block">
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
                      {formatDateTimeEsBo(n.created_at)}
                    </DataListTd>
                    <DataListTd>
                      <div className="font-semibold text-foreground">{notifTitulo(n)}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {n.contribuyente?.nombre_completo ?? "—"}
                      </div>
                    </DataListTd>
                    <DataListTd className="whitespace-nowrap text-muted-foreground">{formatDateEsBo(n.fecha_limite)}</DataListTd>
                    <DataListTd>
                      <NotifEstadoPill estado={n.estado} />
                    </DataListTd>
                    <DataListTd align="center" onClick={(e) => e.stopPropagation()}>
                      <NotificacionListaAcciones n={n} onEdit={openEdit} className="justify-center" />
                    </DataListTd>
                  </TableRow>
                ))}
            </DataListTbody>
          </DataListTable>
          </DataListTableWrap>
        </div>
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
