import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TipoTramiteCatalogRow } from "@/lib/sirat-forms";

export function useTiposTramiteCatalog(catalogRefreshKey = 0) {
  const [tiposTramite, setTiposTramite] = useState<TipoTramiteCatalogRow[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    setCatalogLoaded(false);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("tipos_tramite")
          .select("id,nombre")
          .order("nombre");
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
      return [...prev, row].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    });
  };

  return { tiposTramite, setTiposTramite, catalogLoaded, mergeTipoTramite };
}
