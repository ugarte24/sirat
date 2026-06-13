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
import { TipoTramiteAltaForm } from "@/components/forms/TipoTramiteAltaForm";
import { TipoTramiteEditarForm } from "@/components/forms/TipoTramiteEditarForm";
import {
  DataListCard,
  DataListTable,
  DataListTableWrap,
  DataListTbody,
  DataListTd,
  DataListTheadRow,
  DataListTh,
  ilikePattern,
  pillMuted,
  pillSuccess,
} from "@/components/data-list";
import { TableRow } from "@/components/ui/table";
import { Pencil, Plus, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { formatDateEsBo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { moveTipoTramiteOrden } from "@/lib/tipos-tramite-orden";

type TipoTramiteSearch = { nuevo?: boolean };

type TipoTramiteRow = Pick<Tables<"tipos_tramite">, "id" | "nombre" | "created_at" | "orden">;

type TipoTramiteListItem = TipoTramiteRow & {
  formulariosCount: number;
};

export const Route = createFileRoute("/_app/tipos-tramite/")({
  validateSearch: (raw: Record<string, unknown>): TipoTramiteSearch => ({
    nuevo:
      raw.nuevo === true ||
      raw.nuevo === 1 ||
      raw.nuevo === "1" ||
      raw.nuevo === "true",
  }),
  component: ListaTiposTramite,
});

function TipoTramiteUsoPill({ count, compact }: { count: number; compact?: boolean }) {
  if (count === 0) {
    return <span className={pillMuted(compact ? "px-2.5" : undefined)}>Sin uso</span>;
  }
  return (
    <span className={pillSuccess(compact ? "px-2.5" : undefined)}>
      {compact ? `${count} form.` : `${count} formulario${count === 1 ? "" : "s"}`}
    </span>
  );
}

function TipoTramiteOrdenAcciones({
  index,
  total,
  busy,
  onMove,
}: {
  index: number;
  total: number;
  busy: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={busy || index === 0}
        aria-label="Subir en el listado"
        onClick={() => onMove("up")}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={busy || index === total - 1}
        aria-label="Bajar en el listado"
        onClick={() => onMove("down")}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

function TipoTramiteListaAcciones({
  item,
  onEdit,
  className,
}: {
  item: TipoTramiteListItem;
  onEdit: (item: TipoTramiteListItem) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-0.5", className)} onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={`Editar ${item.nombre}`}
        onClick={() => onEdit(item)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}

function countByTipoTramite(rows: { tipo_tramite_id: string }[] | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows ?? []) {
    m.set(r.tipo_tramite_id, (m.get(r.tipo_tramite_id) ?? 0) + 1);
  }
  return m;
}

function ListaTiposTramite() {
  const navigate = useNavigate();
  const { nuevo } = Route.useSearch();
  const [list, setList] = useState<TipoTramiteListItem[]>([]);
  const [qInput, setQInput] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [loading, setLoading] = useState(true);
  const [reorderBusyId, setReorderBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [altaKey, setAltaKey] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TipoTramiteListItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDeb(qInput), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const buscando = qDeb.trim().length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    const pat = ilikePattern(qDeb);

    let qb = supabase
      .from("tipos_tramite")
      .select("id, nombre, created_at, orden")
      .order("orden", { ascending: true });
    if (pat) {
      qb = qb.ilike("nombre", pat);
    }
    const { data: tipos, error } = await qb;

    if (error) {
      toast.error(error.message);
      setList([]);
      setLoading(false);
      return;
    }
    const base = (tipos ?? []) as TipoTramiteRow[];
    if (base.length === 0) {
      setList([]);
      setLoading(false);
      return;
    }
    const ids = base.map((t) => t.id);
    const { data: formRows } = await supabase
      .from("formularios")
      .select("tipo_tramite_id")
      .in("tipo_tramite_id", ids);
    const nForm = countByTipoTramite(formRows);
    setList(
      base.map((t) => ({
        ...t,
        formulariosCount: nForm.get(t.id) ?? 0,
      })),
    );
    setLoading(false);
  }, [qDeb]);

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
          return next as TipoTramiteSearch;
        },
        replace: true,
      });
    }
  }, [nuevo, navigate]);

  const openEditDialog = (item: TipoTramiteListItem) => {
    setEditTarget(item);
    window.setTimeout(() => setEditDialogOpen(true), 0);
  };

  const mover = async (id: string, direction: "up" | "down") => {
    setReorderBusyId(id);
    try {
      const result = await moveTipoTramiteOrden(supabase, id, direction);
      if (result === "moved") {
        await load();
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el orden.");
    } finally {
      setReorderBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-display text-2xl font-bold">Tipos de trámite</h1>
        <Button
          type="button"
          size="sm"
          className="bg-gradient-primary shrink-0"
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
            <DialogTitle>Nuevo tipo de trámite</DialogTitle>
            <DialogDescription>Indique el nombre del trámite (p. ej. Inscripción, Renovación).</DialogDescription>
          </DialogHeader>
          <TipoTramiteAltaForm
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
            <DialogTitle>Editar tipo de trámite</DialogTitle>
            <DialogDescription>
              Modifique el nombre. Los formularios vinculados mostrarán el nombre actualizado.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <TipoTramiteEditarForm
              key={editTarget.id}
              showCard={false}
              tipoTramiteId={editTarget.id}
              initial={{ nombre: editTarget.nombre }}
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
          placeholder="Buscar por nombre"
          className="pl-9"
        />
      </div>

      {buscando ? (
        <p className="text-xs text-muted-foreground">
          Borre la búsqueda para reordenar el catálogo completo.
        </p>
      ) : null}

      <DataListCard>
        <div className="md:hidden divide-y divide-border/60">
          {loading && <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>}
          {!loading && list.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin tipos de trámite</p>
          )}
          {!loading &&
            list.map((t, index) => (
              <div key={t.id} className="px-4 py-3.5">
                <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1.5 items-start">
                  {!buscando ? (
                    <TipoTramiteOrdenAcciones
                      index={index}
                      total={list.length}
                      busy={reorderBusyId === t.id}
                      onMove={(dir) => void mover(t.id, dir)}
                    />
                  ) : (
                    <span className="w-7" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground leading-snug">{t.nombre}</p>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDateEsBo(t.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <TipoTramiteUsoPill count={t.formulariosCount} compact />
                    <TipoTramiteListaAcciones item={t} onEdit={openEditDialog} />
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="hidden md:block">
          <DataListTableWrap>
            <DataListTable>
              <DataListTheadRow>
                {!buscando ? <DataListTh className="w-12">Orden</DataListTh> : null}
                <DataListTh>Nombre</DataListTh>
                <DataListTh>Fecha alta</DataListTh>
                <DataListTh>Uso</DataListTh>
                <DataListTh align="center">Acciones</DataListTh>
              </DataListTheadRow>
              <DataListTbody>
                {loading && (
                  <TableRow>
                    <DataListTd
                      className="py-10 text-center text-muted-foreground"
                      colSpan={buscando ? 4 : 5}
                    >
                      Cargando…
                    </DataListTd>
                  </TableRow>
                )}
                {!loading && list.length === 0 && (
                  <TableRow>
                    <DataListTd
                      className="py-10 text-center text-muted-foreground"
                      colSpan={buscando ? 4 : 5}
                    >
                      Sin tipos de trámite
                    </DataListTd>
                  </TableRow>
                )}
                {!loading &&
                  list.map((t, index) => (
                    <TableRow key={t.id} className="border-b border-border/60 hover:bg-muted/40">
                      {!buscando ? (
                        <DataListTd className="w-12">
                          <TipoTramiteOrdenAcciones
                            index={index}
                            total={list.length}
                            busy={reorderBusyId === t.id}
                            onMove={(dir) => void mover(t.id, dir)}
                          />
                        </DataListTd>
                      ) : null}
                      <DataListTd className="font-semibold">{t.nombre}</DataListTd>
                      <DataListTd className="whitespace-nowrap text-muted-foreground">
                        {formatDateEsBo(t.created_at)}
                      </DataListTd>
                      <DataListTd>
                        <TipoTramiteUsoPill count={t.formulariosCount} />
                      </DataListTd>
                      <DataListTd align="center">
                        <TipoTramiteListaAcciones
                          item={t}
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
      </DataListCard>
    </div>
  );
}
