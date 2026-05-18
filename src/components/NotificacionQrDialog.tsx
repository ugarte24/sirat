import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NotificacionQrPayload } from "@/lib/notificacion-qr";
import { buildNotificacionQrUrl } from "@/lib/notificacion-qr";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: NotificacionQrPayload;
};

export function NotificacionQrDialog({ open, onOpenChange, payload }: Props) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQrSrc(null);
      setError(null);
      return;
    }
    const url = buildNotificacionQrUrl(payload);
    void QRCode.toDataURL(url, {
      width: 512,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setQrSrc)
      .catch(() => setError("No se pudo generar el código QR."));
  }, [open, payload.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Código QR de verificación</DialogTitle>
          <DialogDescription>
            Al escanearlo se muestra el PDF de la notificación; desde ahí puede descargarlo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {qrSrc && (
            <img
              src={qrSrc}
              alt="Código QR de la notificación tributaria"
              className="h-auto w-full max-w-[min(100%,20rem)] rounded-md border bg-white p-3"
            />
          )}
          {!qrSrc && !error && (
            <p className="text-sm text-muted-foreground">Generando código QR…</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
