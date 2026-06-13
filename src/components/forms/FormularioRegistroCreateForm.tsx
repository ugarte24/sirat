import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ContribuyenteCatalogRow, TipoTramiteCatalogRow } from "@/lib/sirat-forms";
import {
  emptyFormularioNuevo,
  formularioRegistroToInsert,
  validateFormularioRegistro,
} from "@/lib/sirat-forms";
import { useContribuyentesCatalog } from "@/hooks/useContribuyentesCatalog";
import { useTiposTramiteCatalog } from "@/hooks/useTiposTramiteCatalog";
import { FormularioRegistroEtapaFields } from "@/components/forms/FormularioRegistroEtapaFields";

export type FormularioRegistroCreateFormProps = {
  onSuccess: (formularioId: string) => void;
  onPedirAltaContribuyente?: () => void;
  onPedirAltaTipoTramite?: () => void;
  catalogRefreshKey?: number;
  contribuyenteRecienRegistrado?: ContribuyenteCatalogRow | null;
  tipoTramiteRecienRegistrado?: TipoTramiteCatalogRow | null;
  onContribuyentePreseleccionado?: () => void;
  onTipoTramitePreseleccionado?: () => void;
};

export function FormularioRegistroCreateForm({
  onSuccess,
  onPedirAltaContribuyente,
  onPedirAltaTipoTramite,
  catalogRefreshKey = 0,
  contribuyenteRecienRegistrado = null,
  tipoTramiteRecienRegistrado = null,
  onContribuyentePreseleccionado,
  onTipoTramitePreseleccionado,
}: FormularioRegistroCreateFormProps) {
  const { contribs, catalogLoaded, mergeContrib } = useContribuyentesCatalog(catalogRefreshKey);
  const { tiposTramite, catalogLoaded: tiposTramiteLoaded, mergeTipoTramite } =
    useTiposTramiteCatalog(catalogRefreshKey);
  const [f, setF] = useState(() => emptyFormularioNuevo());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!contribuyenteRecienRegistrado) return;
    setF((prev) => ({ ...prev, contribuyente_id: contribuyenteRecienRegistrado.id }));
    mergeContrib(contribuyenteRecienRegistrado);
    onContribuyentePreseleccionado?.();
  }, [contribuyenteRecienRegistrado, mergeContrib, onContribuyentePreseleccionado]);

  useEffect(() => {
    if (!tipoTramiteRecienRegistrado) return;
    setF((prev) => ({ ...prev, tipo_tramite_id: tipoTramiteRecienRegistrado.id }));
    mergeTipoTramite(tipoTramiteRecienRegistrado);
    onTipoTramitePreseleccionado?.();
  }, [tipoTramiteRecienRegistrado, mergeTipoTramite, onTipoTramitePreseleccionado]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateFormularioRegistro(f);
    if (err) return toast.error(err);

    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const row = formularioRegistroToInsert(f, u.user?.id);
    const { data: created, error } = await supabase.from("formularios").insert(row).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);

    toast.success("Registro guardado. Queda pendiente de verificación.");
    setF(emptyFormularioNuevo());
    onSuccess(created.id);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormularioRegistroEtapaFields
        f={f}
        setF={setF}
        contribs={contribs}
        catalogLoaded={catalogLoaded}
        tiposTramite={tiposTramite}
        tiposTramiteLoaded={tiposTramiteLoaded}
        onPedirAltaContribuyente={onPedirAltaContribuyente}
        onPedirAltaTipoTramite={onPedirAltaTipoTramite}
        onLocateError={(msg) => toast.error(msg)}
      />
      <Button type="submit" disabled={busy} className="w-full h-11 bg-gradient-primary">
        {busy ? "Guardando…" : "Guardar registro (etapa 1)"}
      </Button>
    </form>
  );
}
