import { toast } from "sonner";
import type jsPDF from "jspdf";
import * as XLSX from "xlsx-js-style";

export type DownloadKind = "pdf" | "excel";

const SUCCESS: Record<DownloadKind, string> = {
  pdf: "PDF descargado correctamente",
  excel: "Excel descargado correctamente",
};

/** Abre el documento en una nueva pestaña (PDF) o descarga directa (Excel). */
export function downloadBlob(blob: Blob, filename: string, kind: DownloadKind): void {
  const url = URL.createObjectURL(blob);

  if (kind === "pdf") {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.message("Si el documento no se abrió, búsquelo en la carpeta de descargas.");
    }
  } else {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  setTimeout(() => URL.revokeObjectURL(url), 120_000);

  toast.success(SUCCESS[kind], { description: filename });
}

/** Número de página en la esquina inferior derecha de cada hoja. */
export function applySiratPdfPageNumbers(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  if (total < 1) return;

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const x = w - 12;
  const y = h - 6;

  for (let n = 1; n <= total; n++) {
    doc.setPage(n);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 95, 105);
    const label = total === 1 ? `Pág. ${n}` : `Pág. ${n} de ${total}`;
    doc.text(label, x, y, { align: "right" });
  }
}

export function downloadJsPdf(doc: jsPDF, filename: string): void {
  if (!filename.toLowerCase().endsWith(".pdf")) filename += ".pdf";
  applySiratPdfPageNumbers(doc);
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
