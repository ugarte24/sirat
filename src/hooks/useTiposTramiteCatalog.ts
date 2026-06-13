import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TipoTramiteCatalogRow } from "@/lib/sirat-forms";

function sortByOrden(rows: TipoTramiteCatalogRow[]): TipoTramiteCatalogRow[] {
  return [...rows].sort((a, b) => a.orden - b.orden);
}

export function useTiposTramiteCatalog(catalogRefreshKey = 0) {
  const [tiposTramite, setTiposTramite] = useState<TipoTramiteCatalogRow[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    setCatalogLoaded(false);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("tipos_tramite")
          .select("id,nombre,orden")
          .order("orden", { ascending: true });
        if (error) toast.error(`Tipos de trámite: ${error.message}`);
        setTiposTramite(data ?? []);
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar los tipos de trámite.");
      } finally {
        setCatalogLoaded(true);
      }
    })();
  }, [catalogRefreshKey]);

  const mergeTipoTramite = (row: TipoTramiteCatalogRow) => {
    setTiposTramite((prev) => {
      if (prev.some((t) => t.id === row.id)) return prev;
      return sortByOrden([...prev, row]);
    });
  };

  const replaceTipoTramite = (row: TipoTramiteCatalogRow) => {
    setTiposTramite((prev) => sortByOrden(prev.map((t) => (t.id === row.id ? row : t))));
  };

  return { tiposTramite, setTiposTramite, catalogLoaded, mergeTipoTramite, replaceTipoTramite };
}
