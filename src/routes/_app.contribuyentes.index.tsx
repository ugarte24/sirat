import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreVertical, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { formatDateEsBo } from "@/lib/date";

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
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [qInput, setQInput] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [altaKey, setAltaKey] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContribListItem | null>(null);

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

  const darDeBaja = async (item: ContribListItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
                  <TableRow
                    key={c.id}
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                    onClick={() => navigate({ to: "/contribuyentes/$id", params: { id: c.id } })}
                  >
                    <DataListTd className="whitespace-nowrap text-muted-foreground">{formatDateEsBo(c.created_at)}</DataListTd>
                    <DataListTd>
                      <div className="font-semibold text-foreground">{c.nombre_completo}</div>
                      <div className="text-xs text-muted-foreground">C.I. {c.ci}</div>
                    </DataListTd>
                    <DataListTd className="text-muted-foreground">{c.telefono || "—"}</DataListTd>
                    <DataListTd>
                      {c.puedeDarDeBaja ? (
                        <span className={pillSuccess()}>Sin actividades</span>
                      ) : (
                        <span className={pillWarning()}>Con formularios o notif.</span>
                      )}
                    </DataListTd>
                    <DataListTd align="center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" aria-label={`Acciones: ${c.nombre_completo}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditTarget(c);
                              setEditDialogOpen(true);
                            }}
                          >
                            Editar datos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={!c.puedeDarDeBaja}
                            onClick={(e) => void darDeBaja(c, e)}
                          >
                            Dar de baja
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
