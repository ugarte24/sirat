import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificacionQrPayload } from "@/lib/notificacion-qr";
import { notificacionQrPayloadToPdfData } from "@/lib/pdf";

export type AutoNotificacionPdfStatus = "idle" | "downloading" | "done" | "error";

/** Tras mostrar la notificación, descarga el PDF una vez (p. ej. al escanear el QR). */
export function useAutoNotificacionPdfDownload(
  payload: NotificacionQrPayload | null,
  delayMs = 800,
) {
  const scheduled = useRef(false);
  const [status, setStatus] = useState<AutoNotificacionPdfStatus>("idle");

  const runDownload = useCallback(async () => {
    if (!payload) return;
    setStatus("downloading");
    try {
      const { generateNotificacionPDF } = await import("@/lib/pdf");
      await generateNotificacionPDF(notificacionQrPayloadToPdfData(payload));
      setStatus("done");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, [payload]);

  useEffect(() => {
    if (!payload || scheduled.current) return;
    scheduled.current = true;
    const timer = window.setTimeout(() => {
      void runDownload();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [payload, delayMs, runDownload]);

  const retry = useCallback(() => {
    void runDownload();
  }, [runDownload]);

  return { status, retry };
}
