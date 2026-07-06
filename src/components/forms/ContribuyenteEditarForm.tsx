import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ContribuyenteNuevoForm } from "@/lib/sirat-forms";
import { contribuyenteToUpdatePayload } from "@/lib/sirat-forms";
import { ContribuyenteFormFields } from "@/components/forms/ContribuyenteFormFields";

export type ContribuyenteEditarFormProps = {
  contribuyenteId: string;
  initial: ContribuyenteNuevoForm;
  onSuccess: () => void;
  submitLabel?: string;
  showCard?: boolean;
};

export function ContribuyenteEditarForm({
  contribuyenteId,
  initial,
  onSuccess,
  submitLabel = "Guardar cambios",
  showCard = true,
}: ContribuyenteEditarFormProps) {
  const [form, setForm] = useState<ContribuyenteNuevoForm>(initial);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("contribuyentes")
        .update(
          contribuyenteToUpdatePayload({
            ci: form.ci,
            nombre_completo: form.nombre_completo,
            telefono: form.telefono.trim() || null,
          }),
        )
        .eq("id", contribuyenteId);
      if (error) return toast.error(error.message);
      toast.success("Contribuyente actualizado");
      onSuccess();
    } finally {
      setBusy(false);
    }
  };

  const formEl = (
    <form onSubmit={submit} className="space-y-4">
      <ContribuyenteFormFields form={form} setForm={setForm} />
      <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">
        {busy ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );

  if (!showCard) return formEl;

  return <Card className="p-5 border-0 shadow-none sm:border sm:shadow-sm">{formEl}</Card>;
}
