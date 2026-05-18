import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContribuyenteNuevoForm } from "@/lib/sirat-forms";

type Props = {
  form: ContribuyenteNuevoForm;
  setForm: React.Dispatch<React.SetStateAction<ContribuyenteNuevoForm>>;
};

export function ContribuyenteFormFields({ form, setForm }: Props) {
  return (
    <>
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
        <Label>Celular (opcional)</Label>
        <Input
          value={form.telefono}
          onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
        />
      </div>
    </>
  );
}
