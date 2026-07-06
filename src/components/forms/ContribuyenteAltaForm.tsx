import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ContribuyenteCatalogRow, ContribuyenteNuevoForm } from "@/lib/sirat-forms";
import { contribuyenteFormToInsert } from "@/lib/sirat-forms";
import { ContribuyenteFormFields } from "@/components/forms/ContribuyenteFormFields";

export type ContribuyenteAltaFormProps = {
  onSuccess: (contribuyente: ContribuyenteCatalogRow) => void;
  submitLabel?: string;
  /** false dentro de Dialog (el Card ya lo aporta el contenedor) */
  showCard?: boolean;
};

export function ContribuyenteAltaForm({
  onSuccess,
  submitLabel = "Registrar",
  showCard = true,
}: ContribuyenteAltaFormProps) {
  const [form, setForm] = useState<ContribuyenteNuevoForm>({ ci: "", nombre_completo: "", telefono: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const payload = contribuyenteFormToInsert(form, u.user?.id);
      const { data: created, error } = await supabase
        .from("contribuyentes")
        .insert(payload)
        .select("id,ci,nombre_completo")
        .single();
      if (error) return toast.error(error.message);
      if (!created) return toast.error("No se obtuvo el contribuyente creado.");
      toast.success("Contribuyente registrado");
      setForm({ ci: "", nombre_completo: "", telefono: "" });
      onSuccess(created);
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
