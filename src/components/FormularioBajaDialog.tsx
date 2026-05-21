import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Images, X } from "lucide-react";
import {
  FORMULARIO_BAJA_FOTOS_MAX,
  prepareFormularioBajaFotoFile,
} from "@/lib/formulario-baja-fotos";
import { FORMULARIO_FOTO_MAX_LABEL, formatFileSize } from "@/lib/formulario-fotos";

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

  const canAdd = photos.length < FORMULARIO_BAJA_FOTOS_MAX;

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
            Registre el motivo. Se generará el PDF «Baja de actividad económica».
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

          <Card className="p-5 space-y-3 border shadow-sm">
            <div>
              <Label>Fotografías de la baja (máximo {FORMULARIO_BAJA_FOTOS_MAX})</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Opcional. Máximo {FORMULARIO_BAJA_FOTOS_MAX} fotos; si superan {FORMULARIO_FOTO_MAX_LABEL}{" "}
                se comprimen automáticamente.
                {photoBusy ? " Comprimiendo…" : ""}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {photos.map((p, i) => (
                <div
                  key={`${p.previewUrl}-${i}`}
                  className="relative h-24 w-24 rounded-lg overflow-hidden border"
                >
                  <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    disabled={busy || photoBusy}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center disabled:opacity-50"
                    aria-label="Quitar foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {canAdd ? (
                <>
                  <label className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted shrink-0">
                    <Camera className="h-5 w-5" aria-hidden />
                    <span className="text-[10px] mt-1 text-center px-0.5 leading-tight">Cámara</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={busy || photoBusy}
                      onChange={(e) => void addPhotos(e)}
                    />
                  </label>
                  <label className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted shrink-0">
                    <Images className="h-5 w-5" aria-hidden />
                    <span className="text-[10px] mt-1 text-center px-0.5 leading-tight">Galería</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={busy || photoBusy}
                      onChange={(e) => void addPhotos(e)}
                    />
                  </label>
                </>
              ) : null}
            </div>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy || photoBusy}
              className="sm:min-w-[8rem] bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              {busy ? "Guardando…" : "Guardar baja"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
