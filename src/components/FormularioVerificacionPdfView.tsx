import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, FileDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfBlobViewer } from "@/components/PdfBlobViewer";
import type { FormularioQrPayload } from "@/lib/formulario-qr";
import { formularioQrPayloadToPdfData } from "@/lib/pdf";
import { downloadBlob } from "@/lib/download-file";

type Props = {
  payload: FormularioQrPayload;
};

function ensurePdfBlob(blob: Blob): Blob {
  if (blob.type === "application/pdf") return blob;
  return new Blob([blob], { type: "application/pdf" });
}

export function FormularioVerificacionPdfView({ payload }: Props) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState("formulario.pdf");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    setStatus("loading");
    setPdfBlob(null);

    void (async () => {
      try {
        const { buildFormularioPdfBlob } = await import("@/lib/pdf");
        const result = await buildFormularioPdfBlob(formularioQrPayloadToPdfData(payload));
        const blob = ensurePdfBlob(result.blob);
        blobRef.current = blob;
        setFilename(result.filename);
        setPdfBlob(blob);
        setStatus("ready");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    })();
  }, [payload.id]);

  const download = useCallback(() => {
    if (!blobRef.current) return;
    downloadBlob(blobRef.current, filename, "pdf");
  }, [filename]);

  const openPdf = useCallback(() => {
    if (!blobRef.current) return;
    const url = URL.createObjectURL(blobRef.current);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-card px-6 py-16 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Generando documento…</p>
      </div>
    );
  }

  if (status === "error" || !pdfBlob) {
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
        <PdfBlobViewer blob={pdfBlob} className="h-[min(75vh,820px)] overflow-y-auto" />
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
        <Button type="button" variant="outline" size="lg" onClick={openPdf} className="gap-2 sm:min-w-[10rem]">
          <ExternalLink className="h-4 w-4" />
          Abrir PDF
        </Button>
        <Button type="button" size="lg" onClick={download} className="gap-2 sm:min-w-[10rem]">
          <FileDown className="h-4 w-4" />
          Descargar PDF
        </Button>
      </div>
    </div>
  );
}
