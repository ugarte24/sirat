import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  blob: Blob;
  className?: string;
};

/** Visor PDF en canvas (compatible con Android; los iframe con blob: suelen fallar). */
export function PdfBlobViewer({ blob, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const openInNewTab = () => {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    container.replaceChildren();
    setStatus("loading");

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        const data = await blob.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        const containerWidth = Math.max(container.clientWidth, 280);
        const dpr = window.devicePixelRatio || 1;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = (containerWidth / baseViewport.width) * dpr;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "mx-auto block w-full max-w-full bg-white";
          canvas.style.height = `${viewport.height / dpr}px`;

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas no disponible");

          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled) return;

          const wrapper = document.createElement("div");
          wrapper.className = pageNum < pdf.numPages ? "mb-2 block shadow-sm" : "block shadow-sm";
          wrapper.appendChild(canvas);
          container.appendChild(wrapper);
        }

        if (!cancelled) setStatus("ready");
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blob]);

  return (
    <div className={cn("relative", className)}>
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {status === "error" && (
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No se pudo mostrar la vista previa en este dispositivo.</p>
          <Button type="button" onClick={openInNewTab}>
            Abrir PDF
          </Button>
        </div>
      )}
      <div
        ref={containerRef}
        className={cn("min-h-[50vh] space-y-2 bg-neutral-100 p-2", status === "error" && "hidden")}
      />
    </div>
  );
}
