import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPicker, mapMarkerPinSvg } from "@/components/MapPicker";
import {
  type FormularioMapaRow,
  formularioRowToMapMarker,
} from "@/lib/mapa-actividades";
import { REOPEN_VERIFICAR_STORAGE_KEY } from "@/lib/formulario-navigation";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

type MapaSearch = { actividad?: string };
type MapaFiltro = "todos" | "pendientes" | "verificados";

function mapaVacioMensaje(
  modoActividad: boolean,
  estadoFiltro: MapaFiltro,
  hayBusqueda: boolean,
): string {
  if (modoActividad) return "Actividad no encontrada.";
  if (hayBusqueda) {
    if (estadoFiltro === "pendientes") return "Ninguna actividad pendiente coincide con la búsqueda.";
    if (estadoFiltro === "verificados") return "Ninguna actividad verificada coincide con la búsqueda.";
    return "Ninguna actividad coincide con la búsqueda.";
  }
  if (estadoFiltro === "pendientes") return "Sin actividades pendientes.";
  if (estadoFiltro === "verificados") return "Sin actividades verificadas.";
  return "Sin actividades con ubicación.";
}

const MAPA_SELECT =
  "id,latitud,longitud,razon_social,direccion,referencia,estado,mapa_zoom,contribuyente:contribuyentes(nombre_completo)";

export const Route = createFileRoute("/_app/mapa")({
  validateSearch: (raw: Record<string, unknown>): MapaSearch => ({
    actividad:
      typeof raw.actividad === "string" && raw.actividad.length > 0 ? raw.actividad : undefined,
  }),
  component: Mapa,
});

function Mapa() {
  const navigate = useNavigate();
  const { actividad } = Route.useSearch();
  const modoActividad = Boolean(actividad);

  const [rows, setRows] = useState<FormularioMapaRow[]>([]);
  const [actividadRow, setActividadRow] = useState<FormularioMapaRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<MapaFiltro>("todos");
  const deferredQ = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    setLoading(true);
    void (async () => {
      if (modoActividad && actividad) {
        const { data, error } = await supabase
          .from("formularios")
          .select(MAPA_SELECT)
          .eq("id", actividad)
          .maybeSingle();
        if (error) {
          toast.error(error.message);
          setActividadRow(null);
        } else {
          setActividadRow((data as FormularioMapaRow | null) ?? null);
        }
        setRows([]);
        setLoading(false);
        return;
      }

      setActividadRow(null);
      const { data, error } = await supabase
        .from("formularios")
        .select(MAPA_SELECT)
        .not("latitud", "is", null)
        .in("estado", ["activo", "pendiente_verificacion"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) toast.error(error.message);
      setRows((data ?? []) as FormularioMapaRow[]);
      setLoading(false);
    })();
  }, [actividad, modoActividad]);

  const porEstado = useMemo(() => {
    if (modoActividad) return actividadRow ? [actividadRow] : [];
    if (estadoFiltro === "pendientes") {
      return rows.filter((f) => f.estado === "pendiente_verificacion");
    }
    if (estadoFiltro === "verificados") {
      return rows.filter((f) => f.estado === "activo");
    }
    return rows;
  }, [rows, estadoFiltro, modoActividad, actividadRow]);

  const filtered = useMemo(() => {
    if (modoActividad) return porEstado;
    if (!deferredQ) return porEstado;
    return porEstado.filter((f) => {
      const rs = (f.razon_social ?? "").toLowerCase();
      const nombre = (f.contribuyente?.nombre_completo ?? "").toLowerCase();
      return rs.includes(deferredQ) || nombre.includes(deferredQ);
    });
  }, [porEstado, deferredQ, modoActividad]);

  const markers = useMemo(() => {
    return filtered
      .filter((f) => f.latitud != null && f.longitud != null)
      .map((f) => formularioRowToMapMarker(f));
  }, [filtered]);

  const total = porEstado.length;
  const visible = filtered.length;
  const hayBusqueda = Boolean(search.trim());
  const hayFiltroEstado = estadoFiltro !== "todos";
  const sinUbicacionActividad =
    modoActividad && !loading && actividadRow && actividadRow.latitud == null;

  return (
    <div className="space-y-4">
      {modoActividad && actividad ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5"
          onClick={() => {
            sessionStorage.setItem(REOPEN_VERIFICAR_STORAGE_KEY, actividad);
            void navigate({ to: "/formularios", replace: true });
          }}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Volver a verificación
        </Button>
      ) : null}

      <div>
        <h1 className="font-display text-2xl font-bold">
          {modoActividad && actividadRow?.razon_social
            ? actividadRow.razon_social
            : "Mapa de actividades"}
        </h1>
        {modoActividad ? (
          <p className="text-sm text-muted-foreground mt-1">
            Ubicación registrada en etapa 1. Pulse el pin para ver datos y cómo llegar.
          </p>
        ) : null}
      </div>

      {modoActividad ? (
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/mapa">Ver todas las actividades</Link>
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["todos", "Todas"],
              ["pendientes", "Pendientes"],
              ["verificados", "Verificadas"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={estadoFiltro === key ? "default" : "outline"}
              onClick={() => setEstadoFiltro(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {!modoActividad ? (
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razón social o nombre del contribuyente…"
            className="pl-9"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-flex shrink-0 [&_svg]:block"
            dangerouslySetInnerHTML={{ __html: mapMarkerPinSvg("verificado", 18) }}
            aria-hidden
          />
          Verificada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-flex shrink-0 [&_svg]:block"
            dangerouslySetInnerHTML={{ __html: mapMarkerPinSvg("pendiente", 18) }}
            aria-hidden
          />
          Pendiente
        </span>
      </div>

      <Card className="p-2">
        <div className="h-[60vh]">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Cargando mapa…
            </div>
          ) : sinUbicacionActividad ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Esta actividad no tiene ubicación registrada en la etapa 1.
            </div>
          ) : markers.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {mapaVacioMensaje(modoActividad, estadoFiltro, hayBusqueda)}
            </div>
          ) : (
            <MapPicker
              readOnly
              markers={markers}
              height="100%"
              openPopupOnLoad={modoActividad && markers.length === 1}
            />
          )}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        {modoActividad
          ? markers.length === 1
            ? "1 actividad en el mapa. Toque el pin para abrir «Cómo llegar» en Google Maps."
            : ""
          : hayBusqueda
            ? visible === total
              ? `${visible} ${visible === 1 ? "actividad" : "actividades"} con ubicación (coinciden todas con la búsqueda).`
              : `${visible} de ${total} ${total === 1 ? "actividad" : "actividades"} con ubicación coinciden con la búsqueda.`
            : `${total} ${total === 1 ? "actividad" : "actividades"} con ubicación${
                hayFiltroEstado
                  ? estadoFiltro === "pendientes"
                    ? " pendientes de verificación"
                    : " verificadas"
                  : ""
              }.`}
      </p>
    </div>
  );
}
