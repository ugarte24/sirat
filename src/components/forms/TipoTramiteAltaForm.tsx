import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { TipoTramiteCatalogRow, TipoTramiteNuevoForm } from "@/lib/sirat-forms";
import { tipoTramiteFormToInsert } from "@/lib/sirat-forms";
import { fetchNextTipoTramiteOrden } from "@/lib/tipos-tramite-orden";
import { TipoTramiteFormFields } from "@/components/forms/TipoTramiteFormFields";

export type TipoTramiteAltaFormProps = {
  onSuccess: (tipo: TipoTramiteCatalogRow) => void;
  submitLabel?: string;
  showCard?: boolean;
};

export function TipoTramiteAltaForm({
  onSuccess,
  submitLabel = "Registrar",
  showCard = true,
}: TipoTramiteAltaFormProps) {
  const [form, setForm] = useState<TipoTramiteNuevoForm>({ nombre: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.nombre.trim()) return toast.error("Indique el nombre del tipo de trámite");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const orden = await fetchNextTipoTramiteOrden(supabase);
      const payload = tipoTramiteFormToInsert(form, u.user?.id, orden);
      const { data: created, error } = await supabase
        .from("tipos_tramite")
        .insert(payload)
        .select("id,nombre,orden")
        .single();
      if (error) return toast.error(error.message);
      if (!created) return toast.error("No se obtuvo el tipo de trámite creado.");
      toast.success("Tipo de trámite registrado");
      setForm({ nombre: "" });
      onSuccess(created);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "No se pudo registrar el tipo de trámite.");
    } finally {
      setBusy(false);
    }
  };

  const formEl = (
    <form onSubmit={submit} className="space-y-4">
      <TipoTramiteFormFields form={form} setForm={setForm} />
      <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">
        {busy ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );

  if (!showCard) return formEl;

  return <Card className="p-5 border-0 shadow-none sm:border sm:shadow-sm">{formEl}</Card>;
}
