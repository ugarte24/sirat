import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PdfBlobViewer } from "@/components/PdfBlobViewer";
import { downloadPdfBlob } from "@/lib/download-file";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blob: Blob | null;
  filename: string;
  title?: string;
};

/** Vista previa del PDF dentro de la app, con descarga para compartir (p. ej. WhatsApp). */
export function PdfPreviewDialog({
  open,
  onOpenChange,
  blob,
  filename,
  title = "Vista previa del PDF",
}: Props) {
  const download = () => {
    if (!blob) return;
    downloadPdfBlob(blob, filename);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,920px)] w-[calc(100%-1rem)] max-w-3xl flex-col gap-3 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="truncate">{filename}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-white">
          {blob ? (
            <PdfBlobViewer blob={blob} className="h-full overflow-y-auto" />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
              No hay documento para mostrar.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-stretch">
          <Button
            type="button"
            size="lg"
            className="w-full gap-2 bg-gradient-primary sm:flex-1"
            disabled={!blob}
            onClick={download}
          >
            <FileDown className="h-4 w-4" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
