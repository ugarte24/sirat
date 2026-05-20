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
import { DatePickerField } from "@/components/DatePickerField";
import { toast } from "sonner";

export type RenotificarDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fechaLimiteActual: string;
  onConfirm: (nuevaFechaLimite: string, observacion: string) => Promise<void>;
};

export function RenotificarDialog({
  open,
  onOpenChange,
  fechaLimiteActual,
  onConfirm,
}: RenotificarDialogProps) {
  const [fecha, setFecha] = useState(fechaLimiteActual);
  const [observacion, setObservacion] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setFecha(fechaLimiteActual);
      setObservacion("");
      setBusy(false);
    }
  }, [open, fechaLimiteActual]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha.trim()) {
      toast.error("Indique la nueva fecha límite");
      return;
    }
    setBusy(true);
    try {
      await onConfirm(fecha.trim(), observacion.trim());
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la renotificación");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Volver a notificar</DialogTitle>
          <DialogDescription>
            Registre la siguiente fecha límite. El contador de notificaciones aumentará y la fecha
            vigente se actualizará.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div>
            <Label htmlFor="renotif-fecha">Nueva fecha límite *</Label>
            <DatePickerField
              id="renotif-fecha"
              value={fecha}
              onChange={setFecha}
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="renotif-obs">Observación (opcional)</Label>
            <Textarea
              id="renotif-obs"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Motivo o detalle de la renotificación"
              className="mt-1.5 min-h-[80px]"
              disabled={busy}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="sm:min-w-[8rem]">
              {busy ? "Guardando…" : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
