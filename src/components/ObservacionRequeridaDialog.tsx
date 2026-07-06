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
import { toast } from "sonner";

export type ObservacionRequeridaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive" | "outline";
  onConfirm: (observacion: string) => Promise<void>;
};

export function ObservacionRequeridaDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
}: ObservacionRequeridaDialogProps) {
  const [observacion, setObservacion] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setObservacion("");
      setBusy(false);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const texto = observacion.trim();
    if (!texto) {
      toast.error("Ingrese la observación antes de guardar.");
      return;
    }
    setBusy(true);
    try {
      await onConfirm(texto);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div>
            <Label htmlFor="observacion-estado">Observación *</Label>
            <Textarea
              id="observacion-estado"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Motivo o detalle del cambio de estado"
              className="mt-1.5 min-h-[100px]"
              required
              disabled={busy}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant={confirmVariant} disabled={busy} className="sm:min-w-[8rem]">
              {busy ? "Guardando…" : confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
