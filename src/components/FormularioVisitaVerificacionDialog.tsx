import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/components/DatePickerField";
import { toast } from "sonner";
import {
  FORMULARIO_VISITA_RESULTADO_OPCIONES,
  type FormularioVisitaResultado,
  validateFormularioVisitaInput,
} from "@/lib/formulario-visita-verificacion";

export type FormularioVisitaVerificacionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    fechaVisita: string;
    resultado: FormularioVisitaResultado;
    observacion: string;
  }) => Promise<void>;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FormularioVisitaVerificacionDialog({
  open,
  onOpenChange,
  onConfirm,
}: FormularioVisitaVerificacionDialogProps) {
  const [fecha, setFecha] = useState(todayIsoDate());
  const [resultado, setResultado] = useState<FormularioVisitaResultado | "">("");
  const [observacion, setObservacion] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFecha(todayIsoDate());
    setResultado("");
    setObservacion("");
    setBusy(false);
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const err = validateFormularioVisitaInput({ resultado, fechaVisita: fecha, observacion });
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await onConfirm({
        fechaVisita: fecha.trim(),
        resultado: resultado as FormularioVisitaResultado,
        observacion: observacion.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la visita");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar visita sin verificar</DialogTitle>
          <DialogDescription>
            Documente que se acudió al local pero no fue posible completar la verificación. El
            formulario seguirá pendiente hasta completar la etapa 2.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div>
            <Label htmlFor="visita-fecha">Fecha de visita *</Label>
            <DatePickerField
              id="visita-fecha"
              value={fecha}
              onChange={setFecha}
              required
              className="mt-1.5"
              disabled={busy}
            />
          </div>
          <div>
            <Label htmlFor="visita-resultado">Motivo *</Label>
            <Select
              value={resultado}
              onValueChange={(v) => setResultado(v as FormularioVisitaResultado)}
              disabled={busy}
            >
              <SelectTrigger id="visita-resultado" className="mt-1.5">
                <SelectValue placeholder="Seleccione el motivo" />
              </SelectTrigger>
              <SelectContent>
                {FORMULARIO_VISITA_RESULTADO_OPCIONES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="visita-obs">
              Observación {resultado === "otro" ? "*" : "(opcional)"}
            </Label>
            <Textarea
              id="visita-obs"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Detalle de la visita"
              className="mt-1.5 min-h-[80px]"
              disabled={busy}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="sm:min-w-[8rem]">
              {busy ? "Guardando…" : "Registrar visita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
