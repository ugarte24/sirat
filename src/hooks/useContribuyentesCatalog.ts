import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContribuyenteCatalogRow } from "@/lib/sirat-forms";

export function useContribuyentesCatalog(catalogRefreshKey = 0) {
  const [contribs, setContribs] = useState<ContribuyenteCatalogRow[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    setCatalogLoaded(false);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("contribuyentes")
          .select("id,ci,nombre_completo")
          .order("nombre_completo");
        if (error) toast.error(`Contribuyentes: ${error.message}`);
        setContribs(data ?? []);
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar los contribuyentes.");
      } finally {
        setCatalogLoaded(true);
      }
    })();
  }, [catalogRefreshKey]);

  const mergeContrib = (row: ContribuyenteCatalogRow) => {
    setContribs((prev) => {
      if (prev.some((c) => c.id === row.id)) return prev;
      return [...prev, row].sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo, "es"));
    });
  };

  return { contribs, setContribs, catalogLoaded, mergeContrib };
}
