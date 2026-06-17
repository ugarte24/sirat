import { toast } from "sonner";
import type jsPDF from "jspdf";
import * as XLSX from "xlsx-js-style";

export type DownloadKind = "pdf" | "excel";

const SUCCESS: Record<DownloadKind, string> = {
  pdf: "PDF abierto en el navegador",
  excel: "Excel descargado correctamente",
};

function ensurePdfBlob(blob: Blob): Blob {
  if (blob.type === "application/pdf") return blob;
  return new Blob([blob], { type: "application/pdf" });
}

/** Abre el PDF en una nueva pestaña (sin atributo download). */
export function openPdfBlob(blob: Blob, _filename?: string): void {
  const pdf = ensurePdfBlob(blob);
  const url = URL.createObjectURL(pdf);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.message("Permita ventanas emergentes para ver el PDF en el navegador.");
  } else {
    toast.success(SUCCESS.pdf);
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

/** Descarga el PDF al disco (botones explícitos «Descargar PDF»). */
export function downloadPdfBlob(blob: Blob, filename: string): void {
  if (!filename.toLowerCase().endsWith(".pdf")) filename += ".pdf";
  const pdf = ensurePdfBlob(blob);
  const url = URL.createObjectURL(pdf);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  toast.success("PDF descargado correctamente", { description: filename });
}

/** Abre el PDF en el navegador o descarga Excel. */
export function downloadBlob(blob: Blob, filename: string, kind: DownloadKind): void {
  if (kind === "pdf") {
    openPdfBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
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
  openPdfBlob(doc.output("blob"), filename);
}

export function downloadExcelWorkbook(wb: XLSX.WorkBook, filename: string): void {
  if (!filename.toLowerCase().endsWith(".xlsx")) filename += ".xlsx";
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, filename, "excel");
}
