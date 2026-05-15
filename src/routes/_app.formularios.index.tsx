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
import { FormularioNuevaActividadForm } from "@/components/forms/FormularioNuevaActividadForm";
import { FormularioEditarForm } from "@/components/forms/FormularioEditarForm";
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
import { ChevronRight, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import {
  FORMULARIO_VERIFICACION_NOMBRE,
  FORMULARIO_VERIFICACION_SECCION,
  FORMULARIO_VERIFICACION_TITULO_EDITAR,
  FORMULARIO_VERIFICACION_TITULO_NUEVO,
} from "@/lib/sirat-brand";

type FormSearch = { nuevo?: boolean; editar?: string };

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
  }),
  component: Lista,
});

function fmtFecha(iso: string) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function FormEstadoPill({ estado }: { estado: Database["public"]["Enums"]["formulario_estado"] }) {
  if (estado === "activo") return <span className={pillSuccess()}>Activo</span>;
  if (estado === "baja") return <span className={pillMuted()}>Baja</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-destructive/15 px-3 py-0.5 text-xs font-medium text-destructive">
      Anulado
    </span>
  );
}

function Lista() {
  const navigate = useNavigate();
  const { nuevo, editar } = Route.useSearch();
  const [list, setList] = useState<FormRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [qInput, setQInput] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [subvista, setSubvista] = useState<"formulario" | "contrib">("formulario");
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
      .from("formularios")
      .select(
        "id, fecha, zona, estado, razon_social, contribuyente_id, contribuyente:contribuyentes(nombre_completo, ci)",
        { count: "exact" },
      )
      .order("fecha", { ascending: false });

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
  }, [page, qDeb]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setSubvista("formulario");
    setFormKey((k) => k + 1);
    setEditId(null);
    setDialogMode("create");
  };

  const openEdit = (id: string) => {
    setSubvista("formulario");
    setEditId(id);
    setDialogMode("edit");
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditId(null);
    setSubvista("formulario");
  };

  useEffect(() => {
    if (nuevo) {
      openCreate();
      void navigate({
        search: (prev) => {
          const next = { ...(prev as Record<string, unknown>) };
          delete next.nuevo;
          return next as FormSearch;
        },
        replace: true,
      });
    }
  }, [nuevo, navigate]);

  useEffect(() => {
    if (editar) {
      openEdit(editar);
      void navigate({
        search: (prev) => {
          const next = { ...(prev as Record<string, unknown>) };
          delete next.editar;
          return next as FormSearch;
        },
        replace: true,
      });
    }
  }, [editar, navigate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{FORMULARIO_VERIFICACION_SECCION}</h1>
        <Button
          type="button"
          size="sm"
          className="bg-gradient-primary"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
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
            <DialogTitle>
              {dialogMode === "edit"
                ? FORMULARIO_VERIFICACION_TITULO_EDITAR
                : subvista === "contrib"
                  ? "Nuevo contribuyente"
                  : FORMULARIO_VERIFICACION_TITULO_NUEVO}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Modifique los datos, ubicación o fotos del registro activo."
                : subvista === "contrib"
                  ? `Registre el contribuyente y continúe con el ${FORMULARIO_VERIFICACION_NOMBRE.toLowerCase()}.`
                  : "Complete los datos, ubicación en mapa y fotos si aplica."}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === "edit" && editId ? (
            <FormularioEditarForm
              key={editId}
              formularioId={editId}
              onSuccess={() => {
                closeDialog();
                void load();
              }}
              onCancel={closeDialog}
            />
          ) : subvista === "contrib" ? (
            <ContribuyenteAltaForm
              onSuccess={() => {
                setCatalogRefreshKey((k) => k + 1);
                setSubvista("formulario");
              }}
            />
          ) : (
            <FormularioNuevaActividadForm
              key={formKey}
              catalogRefreshKey={catalogRefreshKey}
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
          placeholder="Buscar por razón social o contribuyente"
          className="pl-9"
        />
      </div>

      <DataListCard>
        <DataListTableWrap>
          <DataListTable>
            <DataListTheadRow>
              <DataListTh>Fecha</DataListTh>
              <DataListTh>Actividad</DataListTh>
              <DataListTh>Zona</DataListTh>
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
                    <DataListTd className="whitespace-nowrap text-muted-foreground">{fmtFecha(f.fecha)}</DataListTd>
                    <DataListTd>
                      <div className="font-semibold text-foreground">{f.razon_social}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {f.contribuyente?.nombre_completo ?? "—"} — C.I. {f.contribuyente?.ci ?? "—"}
                      </div>
                    </DataListTd>
                    <DataListTd>
                      <span className={pillMuted()}>Zona {f.zona}</span>
                    </DataListTd>
                    <DataListTd>
                      <FormEstadoPill estado={f.estado} />
                    </DataListTd>
                    <DataListTd align="center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        {f.estado === "activo" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${FORMULARIO_VERIFICACION_NOMBRE.toLowerCase()}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              openEdit(f.id);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon" asChild aria-label={`Ver ${FORMULARIO_VERIFICACION_NOMBRE.toLowerCase()}`}>
                          <Link to="/formularios/$id" params={{ id: f.id }}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
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
