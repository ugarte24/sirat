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
import { FormularioRegistroCreateForm } from "@/components/forms/FormularioRegistroCreateForm";
import { FormularioGestionForm } from "@/components/forms/FormularioGestionForm";
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
import { ChevronRight, ClipboardCheck, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import {
  FORMULARIO_ETAPA_REGISTRO_TITULO,
  FORMULARIO_ETAPA_VERIFICACION_TITULO,
  FORMULARIO_VERIFICACION_NOMBRE,
  FORMULARIO_VERIFICACION_SECCION,
  FORMULARIO_VERIFICACION_TITULO_NUEVO,
} from "@/lib/sirat-brand";
import type { ContribuyenteCatalogRow } from "@/lib/sirat-forms";
import { formatDateEsBo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { REOPEN_VERIFICAR_STORAGE_KEY } from "@/lib/formulario-navigation";

type FormSearch = { nuevo?: boolean; editar?: string; verificar?: string; filtro?: ListFiltro };
type ListFiltro = "todos" | "pendientes" | "activos" | "baja" | "anulado";

function parseListFiltro(raw: unknown): ListFiltro | undefined {
  if (
    raw === "todos" ||
    raw === "pendientes" ||
    raw === "activos" ||
    raw === "baja" ||
    raw === "anulado"
  ) {
    return raw;
  }
  return undefined;
}

type FormRow = Pick<
  Database["public"]["Tables"]["formularios"]["Row"],
  "id" | "fecha" | "zona" | "estado" | "razon_social" | "contribuyente_id"
> & {
  contribuyente: { nombre_completo: string; ci: string } | null;
};

export const Route = createFileRoute("/_app/formularios/")({
  validateSearch: (raw: Record<string, unknown>): FormSearch => ({
    nuevo:
      raw.nuevo === true ||
      raw.nuevo === 1 ||
      raw.nuevo === "1" ||
      raw.nuevo === "true",
    editar: typeof raw.editar === "string" && raw.editar.length > 0 ? raw.editar : undefined,
    verificar:
      typeof raw.verificar === "string" && raw.verificar.length > 0 ? raw.verificar : undefined,
    filtro: parseListFiltro(raw.filtro),
  }),
  component: Lista,
});

function FormularioListaAcciones({
  f,
  onEdit,
  className,
}: {
  f: FormRow;
  onEdit: (id: string, tab: "registro" | "verificacion") => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-end gap-0.5", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {f.estado === "pendiente_verificacion" && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Completar verificación"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(f.id, "verificacion");
          }}
        >
          <ClipboardCheck className="h-4 w-4" />
        </Button>
      )}
      {(f.estado === "activo" || f.estado === "pendiente_verificacion") && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Editar ${FORMULARIO_VERIFICACION_NOMBRE.toLowerCase()}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(f.id, "registro");
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link to="/formularios/$id" params={{ id: f.id }} aria-label={`Ver ${FORMULARIO_VERIFICACION_NOMBRE.toLowerCase()}`}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function FormEstadoPill({
  estado,
  compact,
}: {
  estado: Database["public"]["Enums"]["formulario_estado"];
  compact?: boolean;
}) {
  if (estado === "activo") return <span className={pillSuccess()}>Verificado</span>;
  if (estado === "pendiente_verificacion") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
        {compact ? "Pendiente" : "Pendiente verificación"}
      </span>
    );
  }
  if (estado === "baja") return <span className={pillMuted()}>Baja</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-destructive/15 px-3 py-0.5 text-xs font-medium text-destructive">
      Anulado
    </span>
  );
}

function Lista() {
  const navigate = useNavigate();
  const { nuevo, editar, verificar, filtro: filtroSearch } = Route.useSearch();
  const [list, setList] = useState<FormRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [qInput, setQInput] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [loading, setLoading] = useState(true);
  const activeFiltro: ListFiltro = filtroSearch ?? "todos";
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [gestionTab, setGestionTab] = useState<"registro" | "verificacion">("registro");
  const [subvista, setSubvista] = useState<"formulario" | "contrib">("formulario");
  const [formKey, setFormKey] = useState(0);
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const [contribRecien, setContribRecien] = useState<ContribuyenteCatalogRow | null>(null);
  const dialogModeRef = useRef(dialogMode);
  const editIdRef = useRef(editId);
  const gestionTabRef = useRef(gestionTab);
  dialogModeRef.current = dialogMode;
  editIdRef.current = editId;
  gestionTabRef.current = gestionTab;

  const clearSearchParam = useCallback(
    (key: keyof FormSearch) => {
      void navigate({
        search: (prev) => {
          const next = { ...(prev as Record<string, unknown>) };
          delete next[key];
          return next as FormSearch;
        },
        replace: true,
      });
    },
    [navigate],
  );

  const setFiltro = useCallback(
    (key: ListFiltro) => {
      void navigate({
        search: (prev) => {
          const next = { ...(prev as FormSearch) };
          if (key === "todos") delete next.filtro;
          else next.filtro = key;
          return next;
        },
        replace: true,
      });
    },
    [navigate],
  );

  useEffect(() => {
    const t = setTimeout(() => setQDeb(qInput), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(0);
  }, [qDeb, activeFiltro]);

  const load = useCallback(async () => {
    setLoading(true);
    const from = page * LIST_PAGE_SIZE;
    const to = from + LIST_PAGE_SIZE - 1;
    const pat = ilikePattern(qDeb);

    let qb = supabase
      .from("formularios")
      .select(
        "id, fecha, zona, estado, razon_social, contribuyente_id, contribuyente:contribuyentes(nombre_completo, ci)",
        { count: "exact" },
      )
      .order("created_at", ORDER_CREATED_DESC)
      .order("id", ORDER_CREATED_DESC);

    if (activeFiltro === "pendientes") {
      qb = qb.eq("estado", "pendiente_verificacion");
    } else if (activeFiltro === "activos") {
      qb = qb.eq("estado", "activo");
    } else if (activeFiltro === "baja") {
      qb = qb.eq("estado", "baja");
    } else if (activeFiltro === "anulado") {
      qb = qb.eq("estado", "anulado");
    }

    if (pat) {
      const { data: cm } = await supabase
        .from("contribuyentes")
        .select("id")
        .or(`nombre_completo.ilike.${pat},ci.ilike.${pat}`)
        .limit(400);
      const cids = (cm ?? []).map((r) => r.id);
      if (cids.length > 0) {
        qb = qb.or(`razon_social.ilike.${pat},contribuyente_id.in.(${cids.join(",")})`);
      } else {
        qb = qb.ilike("razon_social", pat);
      }
    }

    const { data, error, count } = await qb.range(from, to);
    if (error) {
      toast.error(error.message);
      setList([]);
      setTotal(null);
    } else {
      setList((data ?? []) as FormRow[]);
      setTotal(count);
    }
    setLoading(false);
  }, [page, qDeb, activeFiltro]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const pending = sessionStorage.getItem(REOPEN_VERIFICAR_STORAGE_KEY);
    if (!pending) return;
    sessionStorage.removeItem(REOPEN_VERIFICAR_STORAGE_KEY);
    openEdit(pending, "verificacion");
  }, []);

  const openCreate = () => {
    setSubvista("formulario");
    setContribRecien(null);
    setFormKey((k) => k + 1);
    setEditId(null);
    setGestionTab("registro");
    setDialogMode("create");
  };

  const openEdit = (id: string, tab: "registro" | "verificacion" = "registro") => {
    setSubvista("formulario");
    setEditId(id);
    setGestionTab(tab);
    setDialogMode("edit");
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditId(null);
    setSubvista("formulario");
    setContribRecien(null);
    setGestionTab("registro");
  };

  useEffect(() => {
    if (!nuevo) return;
    if (dialogModeRef.current !== "create") openCreate();
    clearSearchParam("nuevo");
  }, [nuevo, clearSearchParam]);

  useEffect(() => {
    if (!editar) return;
    const needsOpen =
      dialogModeRef.current !== "edit" ||
      editIdRef.current !== editar ||
      gestionTabRef.current !== "registro";
    if (needsOpen) openEdit(editar, "registro");
    clearSearchParam("editar");
  }, [editar, clearSearchParam]);

  useEffect(() => {
    if (!verificar) return;
    const needsOpen =
      dialogModeRef.current !== "edit" ||
      editIdRef.current !== verificar ||
      gestionTabRef.current !== "verificacion";
    if (needsOpen) openEdit(verificar, "verificacion");
    clearSearchParam("verificar");
  }, [verificar, clearSearchParam]);

  const dialogTitle =
    dialogMode === "edit"
      ? gestionTab === "verificacion"
        ? FORMULARIO_ETAPA_VERIFICACION_TITULO
        : FORMULARIO_ETAPA_REGISTRO_TITULO
      : subvista === "contrib"
        ? "Nuevo contribuyente"
        : FORMULARIO_VERIFICACION_TITULO_NUEVO;

  const dialogDescription =
    dialogMode === "edit"
      ? "Puede editar el registro y la verificación en cualquier momento; los cambios se guardan por etapa."
      : subvista === "contrib"
        ? `Registre el contribuyente y continúe con el ${FORMULARIO_VERIFICACION_NOMBRE.toLowerCase()}.`
        : "Complete la etapa 1 (registro). Otro usuario o usted mismo podrá completar la verificación después.";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-display text-2xl font-bold">{FORMULARIO_VERIFICACION_SECCION}</h1>
        <Button type="button" size="sm" className="bg-gradient-primary" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo registro
        </Button>
      </div>

      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open && dialogMode === "create" && subvista === "contrib") {
            setSubvista("formulario");
            return;
          }
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-[min(100%,40rem)] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          {dialogMode === "edit" && editId ? (
            <>
              <div className={subvista === "contrib" ? "hidden" : undefined}>
                <FormularioGestionForm
                  key={editId}
                  formularioId={editId}
                  initialTab={gestionTab}
                  catalogRefreshKey={catalogRefreshKey}
                  contribuyenteRecienRegistrado={contribRecien}
                  onContribuyentePreseleccionado={() => setContribRecien(null)}
                  onPedirAltaContribuyente={() => setSubvista("contrib")}
                  onSuccess={() => {
                    closeDialog();
                    void load();
                  }}
                  onCancel={closeDialog}
                />
              </div>
              <div className={subvista !== "contrib" ? "hidden" : undefined}>
                <ContribuyenteAltaForm
                  onSuccess={(contribuyente) => {
                    setContribRecien(contribuyente);
                    setCatalogRefreshKey((k) => k + 1);
                    setSubvista("formulario");
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className={subvista === "contrib" ? "hidden" : undefined}>
                <FormularioRegistroCreateForm
                  key={formKey}
                  catalogRefreshKey={catalogRefreshKey}
                  contribuyenteRecienRegistrado={contribRecien}
                  onContribuyentePreseleccionado={() => setContribRecien(null)}
                  onPedirAltaContribuyente={() => setSubvista("contrib")}
                  onSuccess={() => {
                    closeDialog();
                    void load();
                  }}
                />
              </div>
              <div className={subvista !== "contrib" ? "hidden" : undefined}>
                <ContribuyenteAltaForm
                  onSuccess={(contribuyente) => {
                    setContribRecien(contribuyente);
                    setCatalogRefreshKey((k) => k + 1);
                    setSubvista("formulario");
                  }}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="-mx-4 flex gap-2 overflow-x-auto flex-nowrap px-4 pb-0.5 sm:mx-0 sm:px-0 md:flex-wrap md:overflow-visible">
        {(
          [
            ["todos", "Todos"],
            ["pendientes", "Pendientes"],
            ["activos", "Verificados"],
            ["baja", "Baja"],
            ["anulado", "Anulados"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            className="shrink-0"
            variant={activeFiltro === key ? "default" : "outline"}
            onClick={() => setFiltro(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Buscar por razón social o contribuyente"
          className="pl-9"
        />
      </div>

      <DataListCard>
        <div className="md:hidden divide-y divide-border/60">
          {loading && (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
          )}
          {!loading && list.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin registros</p>
          )}
          {!loading &&
            list.map((f) => (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                className="w-full cursor-pointer px-4 py-3.5 text-left hover:bg-muted/40 active:bg-muted/60"
                onClick={() => navigate({ to: "/formularios/$id", params: { id: f.id } })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate({ to: "/formularios/$id", params: { id: f.id } });
                  }
                }}
              >
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDateEsBo(f.fecha)}
                  </span>
                  <div className="justify-self-end">
                    <FormEstadoPill estado={f.estado} compact />
                  </div>
                  <p className="col-span-2 mt-0.5 font-semibold text-foreground leading-snug">
                    {f.razon_social}
                  </p>
                  <p className="min-w-0 text-xs text-muted-foreground leading-snug">
                    {f.contribuyente?.nombre_completo ?? "—"}
                  </p>
                  <div className="justify-self-end self-center">
                    <FormularioListaAcciones f={f} onEdit={openEdit} />
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
              <DataListTh>Actividad</DataListTh>
              <DataListTh>Estado</DataListTh>
              <DataListTh align="center">Acciones</DataListTh>
            </DataListTheadRow>
            <DataListTbody>
              {loading && (
                <TableRow>
                  <DataListTd className="py-10 text-center text-muted-foreground" colSpan={4}>
                    Cargando…
                  </DataListTd>
                </TableRow>
              )}
              {!loading && list.length === 0 && (
                <TableRow>
                  <DataListTd className="py-10 text-center text-muted-foreground" colSpan={4}>
                    Sin registros
                  </DataListTd>
                </TableRow>
              )}
              {!loading &&
                list.map((f) => (
                  <TableRow
                    key={f.id}
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                    onClick={() => navigate({ to: "/formularios/$id", params: { id: f.id } })}
                  >
                    <DataListTd className="whitespace-nowrap text-muted-foreground">
                      {formatDateEsBo(f.fecha)}
                    </DataListTd>
                    <DataListTd>
                      <div className="font-semibold text-foreground">{f.razon_social}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {f.contribuyente?.nombre_completo ?? "—"}
                      </div>
                    </DataListTd>
                    <DataListTd>
                      <FormEstadoPill estado={f.estado} />
                    </DataListTd>
                    <DataListTd align="center" onClick={(e) => e.stopPropagation()}>
                      <FormularioListaAcciones
                        f={f}
                        onEdit={openEdit}
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
