import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { ContribuyenteAltaForm } from "@/components/forms/ContribuyenteAltaForm";
import { ContribuyenteEditarForm } from "@/components/forms/ContribuyenteEditarForm";
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
  TablePaginationFooter,
  pillSuccess,
  pillWarning,
} from "@/components/data-list";
import { TableRow } from "@/components/ui/table";
import { ChevronRight, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { formatDateEsBo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { withListPage } from "@/lib/list-search";
import {
  parseContribListPage,
  saveContribListSearch,
} from "@/lib/contribuyente-list-search";

type ContribSearch = { nuevo?: boolean; page?: number };

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
    page: parseContribListPage(raw.page),
  }),
  component: ListaContribuyentes,
});

function ContribVinculosPill({
  puedeDarDeBaja,
  compact,
}: {
  puedeDarDeBaja: boolean;
  compact?: boolean;
}) {
  if (puedeDarDeBaja) {
    return <span className={pillSuccess(compact ? "px-2.5" : undefined)}>Sin actividades</span>;
  }
  return (
    <span className={pillWarning(compact ? "px-2.5" : undefined)}>
      {compact ? "Con vínculos" : "Con formularios o notif."}
    </span>
  );
}

function ContribuyenteListaAcciones({
  c,
  onEdit,
  className,
}: {
  c: ContribListItem;
  onEdit: (c: ContribListItem) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-end gap-0.5", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={`Editar ${c.nombre_completo}`}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(c);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link
          to="/contribuyentes/$id"
          params={{ id: c.id }}
          aria-label={`Ver detalle de ${c.nombre_completo}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function countByContribuyente(rows: { contribuyente_id: string }[] | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows ?? []) {
    m.set(r.contribuyente_id, (m.get(r.contribuyente_id) ?? 0) + 1);
  }
  return m;
}

function ListaContribuyentes() {
  const navigate = useNavigate();
  const { nuevo, page: pageSearch } = Route.useSearch();
  const [list, setList] = useState<ContribListItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const page = Math.max(0, (pageSearch ?? 1) - 1);
  const [qInput, setQInput] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [altaKey, setAltaKey] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContribListItem | null>(null);
  const prevQDebRef = useRef(qDeb);

  useEffect(() => {
    const t = setTimeout(() => setQDeb(qInput), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const setPage = useCallback(
    (nextPageIndex: number) => {
      void navigate({
        search: (prev) => withListPage(prev as ContribSearch, nextPageIndex),
        replace: true,
      });
    },
    [navigate],
  );

  useEffect(() => {
    if (prevQDebRef.current === qDeb) return;
    prevQDebRef.current = qDeb;
    if (pageSearch && pageSearch > 1) {
      void navigate({
        search: (prev) => {
          const next = { ...(prev as ContribSearch) };
          delete next.page;
          return next;
        },
        replace: true,
      });
    }
  }, [qDeb, pageSearch, navigate]);

  useEffect(() => {
    saveContribListSearch({ page: pageSearch });
  }, [pageSearch]);

  const goToDetalle = useCallback(
    (id: string) => {
      void navigate({ to: "/contribuyentes/$id", params: { id } });
    },
    [navigate],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const from = page * LIST_PAGE_SIZE;
    const to = from + LIST_PAGE_SIZE - 1;
    const pat = ilikePattern(qDeb);

    let qb = supabase
      .from("contribuyentes")
      .select("id, ci, nombre_completo, telefono, created_at", { count: "exact" })
      .order("created_at", ORDER_CREATED_DESC)
      .order("id", ORDER_CREATED_DESC);
    if (pat) {
      qb = qb.or(`nombre_completo.ilike.${pat},ci.ilike.${pat}`);
    }
    const { data: contribs, error, count } = await qb.range(from, to);

    if (error) {
      toast.error(error.message);
      setList([]);
      setTotal(null);
      setLoading(false);
      return;
    }
    setTotal(count);
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
  }, [page, qDeb]);

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

  const openEditDialog = (c: ContribListItem) => {
    setEditTarget(c);
    window.setTimeout(() => setEditDialogOpen(true), 0);
  };

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
            <DialogDescription>Ingrese C.I., nombre completo y celular opcional.</DialogDescription>
          </DialogHeader>
          <ContribuyenteAltaForm
            key={altaKey}
            showCard={false}
            onSuccess={() => {
              setDialogOpen(false);
              void load();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar contribuyente</DialogTitle>
            <DialogDescription>Modifique C.I., nombre completo o celular.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <ContribuyenteEditarForm
              key={editTarget.id}
              showCard={false}
              contribuyenteId={editTarget.id}
              initial={{
                ci: editTarget.ci,
                nombre_completo: editTarget.nombre_completo,
                telefono: editTarget.telefono ?? "",
              }}
              onSuccess={() => {
                setEditDialogOpen(false);
                setEditTarget(null);
                void load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Buscar por nombre o C.I."
          className="pl-9"
        />
      </div>

      <DataListCard>
        <div className="md:hidden divide-y divide-border/60">
          {loading && (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
          )}
          {!loading && list.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin contribuyentes</p>
          )}
          {!loading &&
            list.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className="w-full cursor-pointer px-4 py-3.5 text-left hover:bg-muted/40 active:bg-muted/60"
                onClick={() => goToDetalle(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToDetalle(c.id);
                  }
                }}
              >
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDateEsBo(c.created_at)}
                  </span>
                  <div className="justify-self-end">
                    <ContribVinculosPill puedeDarDeBaja={c.puedeDarDeBaja} compact />
                  </div>
                  <p className="col-span-2 mt-0.5 font-semibold text-foreground leading-snug">
                    {c.nombre_completo}
                  </p>
                  <p className="min-w-0 text-xs text-muted-foreground leading-snug">
                    C.I. {c.ci}
                    {c.telefono ? ` · ${c.telefono}` : ""}
                  </p>
                  <div className="justify-self-end self-center">
                    <ContribuyenteListaAcciones c={c} onEdit={openEditDialog} />
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="hidden md:block">
        <DataListTableWrap>
          <DataListTable>
            <DataListTheadRow>
              <DataListTh>Fecha</DataListTh>
              <DataListTh>Contribuyente</DataListTh>
              <DataListTh>Teléfono</DataListTh>
              <DataListTh>Vínculos</DataListTh>
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
                    Sin contribuyentes
                  </DataListTd>
                </TableRow>
              )}
              {!loading &&
                list.map((c) => (
                  <TableRow key={c.id} className="border-b border-border/60 hover:bg-muted/40">
                    <DataListTd className="whitespace-nowrap text-muted-foreground">{formatDateEsBo(c.created_at)}</DataListTd>
                    <DataListTd>
                      <Link
                        to="/contribuyentes/$id"
                        params={{ id: c.id }}
                        className="block font-semibold text-foreground hover:underline"
                      >
                        {c.nombre_completo}
                      </Link>
                      <p className="text-xs text-muted-foreground">C.I. {c.ci}</p>
                    </DataListTd>
                    <DataListTd className="text-muted-foreground">{c.telefono || "—"}</DataListTd>
                    <DataListTd>
                      <ContribVinculosPill puedeDarDeBaja={c.puedeDarDeBaja} />
                    </DataListTd>
                    <DataListTd align="center" onClick={(e) => e.stopPropagation()}>
                      <ContribuyenteListaAcciones
                        c={c}
                        onEdit={openEditDialog}
                        className="justify-center"
                      />
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
