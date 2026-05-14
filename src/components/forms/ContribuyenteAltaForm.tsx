import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ContribuyenteInsertPayload, ContribuyenteNuevoForm } from "@/lib/sirat-forms";

export type ContribuyenteAltaFormProps = {
  onSuccess: () => void;
  submitLabel?: string;
};

export function ContribuyenteAltaForm({ onSuccess, submitLabel = "Registrar" }: ContribuyenteAltaFormProps) {
  const [form, setForm] = useState<ContribuyenteNuevoForm>({ ci: "", nombre_completo: "", telefono: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const payload: ContribuyenteInsertPayload = {
      ci: form.ci.trim(),
      nombre_completo: form.nombre_completo.trim(),
      telefono: form.telefono.trim() || null,
      created_by: u.user?.id ?? null,
    };
    const { error } = await supabase.from("contribuyentes").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contribuyente registrado");
    setForm({ ci: "", nombre_completo: "", telefono: "" });
    onSuccess();
  };

  return (
    <Card className="p-5 border-0 shadow-none sm:border sm:shadow-sm">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>C.I. *</Label>
          <Input
            value={form.ci}
            onChange={(e) => setForm((p) => ({ ...p, ci: e.target.value }))}
            required
          />
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
          <Label>Teléfono</Label>
          <Input
            value={form.telefono}
            onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">
          {busy ? "Guardando…" : submitLabel}
        </Button>
      </form>
    </Card>
  );
}
