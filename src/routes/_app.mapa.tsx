import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/components/MapPicker";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_app/mapa")({ component: Mapa });

type FormularioMapaRow = {
  latitud: number | null;
  longitud: number | null;
  razon_social: string;
  numero: number;
  contribuyente: { nombre_completo: string } | null;
};

function escHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function googleMapsDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function Mapa() {
  const [rows, setRows] = useState<FormularioMapaRow[]>([]);
  const [search, setSearch] = useState("");
  const deferredQ = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("formularios")
        .select("latitud,longitud,razon_social,numero,contribuyente:contribuyentes(nombre_completo)")
        .not("latitud", "is", null)
        .eq("estado", "activo")
        .limit(500);
      setRows((data ?? []) as FormularioMapaRow[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!deferredQ) return rows;
    return rows.filter((f) => {
      const rs = (f.razon_social ?? "").toLowerCase();
      const nombre = (f.contribuyente?.nombre_completo ?? "").toLowerCase();
      return rs.includes(deferredQ) || nombre.includes(deferredQ);
    });
  }, [rows, deferredQ]);

  const markers = useMemo(
    () =>
      filtered.map((f) => {
        const la = Number(f.latitud);
        const ln = Number(f.longitud);
        const gmaps = googleMapsDirectionsUrl(la, ln);
        return {
          lat: la,
          lng: ln,
          popup: [
            `<strong>N° ${f.numero}</strong>`,
            f.razon_social ? escHtml(String(f.razon_social)) : "",
            f.contribuyente?.nombre_completo ? `Contribuyente: ${escHtml(f.contribuyente.nombre_completo)}` : "",
            `<p style="margin:8px 0 0"><a href="${gmaps}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps — cómo llegar</a></p>`,
          ]
            .filter(Boolean)
            .join("<br/>"),
        };
      }),
    [filtered],
  );

  const total = rows.length;
  const visible = filtered.length;
  const hayFiltro = Boolean(search.trim());

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Mapa de actividades</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden />
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
      <Card className="p-2">
        <div className="h-[60vh]">
          <MapPicker readOnly markers={markers} height="100%" />
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">
        {hayFiltro
          ? visible === total
            ? `${visible} ${visible === 1 ? "actividad" : "actividades"} con ubicación (coinciden todas con la búsqueda).`
            : `${visible} de ${total} ${total === 1 ? "actividad" : "actividades"} con ubicación coinciden con la búsqueda.`
          : `${total} ${total === 1 ? "actividad registrada" : "actividades registradas"} con ubicación.`}
      </p>
    </div>
  );
}
