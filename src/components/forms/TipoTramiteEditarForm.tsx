import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { TipoTramiteCatalogRow, TipoTramiteNuevoForm } from "@/lib/sirat-forms";
import { tipoTramiteToUpdatePayload } from "@/lib/sirat-forms";
import { TipoTramiteFormFields } from "@/components/forms/TipoTramiteFormFields";

export type TipoTramiteEditarFormProps = {
  tipoTramiteId: string;
  initial: TipoTramiteNuevoForm;
  onSuccess: (tipo: TipoTramiteCatalogRow) => void;
  submitLabel?: string;
  showCard?: boolean;
};

export function TipoTramiteEditarForm({
  tipoTramiteId,
  initial,
  onSuccess,
  submitLabel = "Guardar cambios",
  showCard = true,
}: TipoTramiteEditarFormProps) {
  const [form, setForm] = useState<TipoTramiteNuevoForm>(initial);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.nombre.trim()) return toast.error("Indique el nombre del tipo de trámite");
    setBusy(true);
    try {
      const { data: updated, error } = await supabase
        .from("tipos_tramite")
        .update(tipoTramiteToUpdatePayload(form))
        .eq("id", tipoTramiteId)
        .select("id,nombre")
        .single();
      if (error) return toast.error(error.message);
      if (!updated) return toast.error("No se obtuvo el tipo de trámite actualizado.");
      toast.success("Tipo de trámite actualizado");
      onSuccess(updated);
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
};
