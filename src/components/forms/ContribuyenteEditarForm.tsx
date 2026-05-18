import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ContribuyenteNuevoForm } from "@/lib/sirat-forms";
import { contribuyenteToUpdatePayload } from "@/lib/sirat-forms";

export type ContribuyenteEditarFormProps = {
  contribuyenteId: string;
  initial: ContribuyenteNuevoForm;
  onSuccess: () => void;
};

export function ContribuyenteEditarForm({
  contribuyenteId,
  initial,
  onSuccess,
}: ContribuyenteEditarFormProps) {
  const [form, setForm] = useState<ContribuyenteNuevoForm>(initial);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
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
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contribuyente actualizado");
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label>C.I. *</Label>
        <Input value={form.ci} onChange={(e) => setForm((p) => ({ ...p, ci: e.target.value }))} required />
      </div>
      <div>
        <Label>Nombre completo *</Label>
        <Input
          value={form.nombre_completo}
          onChange={(e) => setForm((p) => ({ ...p, nombre_completo: e.target.value }))}
          required
        />
      </div>
      <div>
        <Label>Celular (opcional)</Label>
        <Input value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} />
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">
        {busy ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
