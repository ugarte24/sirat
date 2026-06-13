import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TipoTramiteNuevoForm } from "@/lib/sirat-forms";

type Props = {
  form: TipoTramiteNuevoForm;
  setForm: React.Dispatch<React.SetStateAction<TipoTramiteNuevoForm>>;
};

export function TipoTramiteFormFields({ form, setForm }: Props) {
  return (
    <div>
      <Label>Nombre del tipo de trámite *</Label>
      <Input
        value={form.nombre}
        onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
        required
        placeholder="Ej. Inscripción, Renovación…"
      />
    </div>
  );
}
