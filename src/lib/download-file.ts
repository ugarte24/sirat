import { toast } from "sonner";
import type jsPDF from "jspdf";
import * as XLSX from "xlsx";

export type DownloadKind = "pdf" | "excel";

const SUCCESS: Record<DownloadKind, string> = {
  pdf: "PDF descargado correctamente",
  excel: "Excel descargado correctamente",
};

/** Descarga un archivo, intenta abrirlo y muestra confirmación. */
export function downloadBlob(blob: Blob, filename: string, kind: DownloadKind): void {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    toast.message("Si el documento no se abrió, búsquelo en la carpeta de descargas.");
  }

  setTimeout(() => URL.revokeObjectURL(url), 120_000);

  toast.success(SUCCESS[kind], { description: filename });
}

export function downloadJsPdf(doc: jsPDF, filename: string): void {
  if (!filename.toLowerCase().endsWith(".pdf")) filename += ".pdf";
  downloadBlob(doc.output("blob"), filename, "pdf");
}

export function downloadExcelWorkbook(wb: XLSX.WorkBook, filename: string): void {
  if (!filename.toLowerCase().endsWith(".xlsx")) filename += ".xlsx";
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, filename, "excel");
}
