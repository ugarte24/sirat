import { useEffect, useRef, useState } from "react";
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
import { Camera, X } from "lucide-react";
import {
  FORMULARIO_BAJA_FOTOS_MAX,
  FORMULARIO_FOTO_MAX_LABEL,
  prepareFormularioBajaFotoFile,
} from "@/lib/formulario-baja-fotos";
import { formatFileSize } from "@/lib/formulario-fotos";

type LocalPhoto = { file: File; previewUrl: string };

function revokeLocals(items: LocalPhoto[]) {
  items.forEach((p) => URL.revokeObjectURL(p.previewUrl));
}

export type FormularioBajaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (observacion: string, fotoFiles: File[]) => Promise<void>;
};

export function FormularioBajaDialog({ open, onOpenChange, onConfirm }: FormularioBajaDialogProps) {
  const [observacion, setObservacion] = useState("");
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const photosRef = useRef<LocalPhoto[]>([]);
  photosRef.current = photos;
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setObservacion("");
      revokeLocals(photosRef.current);
      setPhotos([]);
      setPhotoBusy(false);
      setBusy(false);
    }
  }, [open]);

  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    const remaining = FORMULARIO_BAJA_FOTOS_MAX - photos.length;
    if (remaining <= 0) {
      toast.error(`Máximo ${FORMULARIO_BAJA_FOTOS_MAX} fotos de baja.`);
      return;
    }
    setPhotoBusy(true);
    const pending: LocalPhoto[] = [];
    for (const raw of Array.from(list).slice(0, remaining)) {
      try {
        const { file, compressed } = await prepareFormularioBajaFotoFile(raw);
        if (compressed) {
          toast.message(`Foto comprimida a ${formatFileSize(file.size)} (era ${formatFileSize(raw.size)}).`);
        }
        pending.push({ file, previewUrl: URL.createObjectURL(file) });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo procesar la foto.");
      }
    }
    if (pending.length) setPhotos((prev) => [...prev, ...pending].slice(0, FORMULARIO_BAJA_FOTOS_MAX));
    setPhotoBusy(false);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const texto = observacion.trim();
    if (!texto) {
      toast.error("Ingrese la observación antes de guardar.");
      return;
    }
    setBusy(true);
    try {
      await onConfirm(
        texto,
        photos.map((p) => p.file),
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la baja.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dar de baja</DialogTitle>
          <DialogDescription>
            Registre el motivo. Se generará el PDF «Baja de actividad económica» (sin descarga
            automática). Fotos opcionales (máx. {FORMULARIO_BAJA_FOTOS_MAX}, {FORMULARIO_FOTO_MAX_LABEL}{" "}
            c/u).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div>
            <Label htmlFor="observacion-baja">Observación *</Label>
            <Textarea
              id="observacion-baja"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Motivo de la baja"
              className="mt-1.5 min-h-[100px]"
              required
              disabled={busy || photoBusy}
            />
          </div>

          <div className="space-y-2">
            <Label>Fotos de la baja (opcional)</Label>
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img
                      src={p.previewUrl}
                      alt={`Foto baja ${i + 1}`}
                      className="rounded-md object-cover h-28 w-full border"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7"
                      disabled={busy || photoBusy}
                      onClick={() => removePhoto(i)}
                      aria-label="Quitar foto"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < FORMULARIO_BAJA_FOTOS_MAX && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary hover:underline">
                <Camera className="h-4 w-4" />
                {photoBusy ? "Procesando…" : "Agregar foto"}
                <input
                  type="file"
                  accept="image/*"
                  multiple={FORMULARIO_BAJA_FOTOS_MAX - photos.length > 1}
                  className="hidden"
                  disabled={busy || photoBusy}
                  onChange={(e) => void addPhotos(e)}
                />
              </label>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="outline" disabled={busy || photoBusy} className="sm:min-w-[8rem]">
              {busy ? "Guardando…" : "Guardar baja"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
