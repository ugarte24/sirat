import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotificacionQrPayload } from "@/lib/notificacion-qr";
import { notificacionQrPayloadToPdfData } from "@/lib/pdf";
import { downloadBlob } from "@/lib/download-file";

type Props = {
  payload: NotificacionQrPayload;
};

export function NotificacionVerificacionPdfView({ payload }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("notificacion.pdf");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    setStatus("loading");
    setPreviewUrl(null);

    void (async () => {
      try {
        const { buildNotificacionPdfBlob } = await import("@/lib/pdf");
        const result = await buildNotificacionPdfBlob(notificacionQrPayloadToPdfData(payload));
        blobRef.current = result.blob;
        objectUrl = URL.createObjectURL(result.blob);
        setFilename(result.filename);
        setPreviewUrl(objectUrl);
        setStatus("ready");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    })();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [payload.id]);

  const download = useCallback(() => {
    if (!blobRef.current) return;
    downloadBlob(blobRef.current, filename, "pdf");
  }, [filename]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-card px-6 py-16 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Generando documento…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center shadow-sm">
        <p className="text-sm text-destructive">No se pudo generar el PDF.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {previewUrl && (
          <iframe
            src={previewUrl}
            title="Notificación tributaria"
            className="h-[min(75vh,820px)] w-full border-0"
          />
        )}
      </div>
      <div className="flex justify-center">
        <Button type="button" size="lg" onClick={download} className="gap-2">
          <FileDown className="h-4 w-4" />
          Descargar PDF
        </Button>
      </div>
    </div>
  );
}
