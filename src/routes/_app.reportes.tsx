import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_app/reportes")({ component: Reportes });

const REPORTES = [
  { key: "formularios", label: "Formularios de verificación" },
  { key: "notificaciones", label: "Notificaciones" },
  { key: "contribuyentes", label: "Contribuyentes" },
];

function Reportes() {
  const [tipo, setTipo] = useState("formularios");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  const fetchData = async () => {
    let q: any = supabase.from(tipo as any).select("*").order("created_at", { ascending: false }).limit(1000);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to + "T23:59:59");
    const { data, error } = await q;
    if (error) { toast.error(error.message); return null; }
    return data ?? [];
  };

  const exportExcel = async () => {
    const data = await fetchData(); if (!data) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, tipo);
    XLSX.writeFile(wb, `reporte-${tipo}-${Date.now()}.xlsx`);
  };
  const exportPDF = async () => {
    const data = await fetchData(); if (!data || !data.length) return toast.error("Sin datos");
    const doc = new jsPDF("l");
    doc.setFontSize(14).text(`Reporte: ${tipo}`, 14, 14);
    const cols = Object.keys(data[0]).slice(0, 8);
    autoTable(doc, { head: [cols], body: data.map((r: any) => cols.map(c => String(r[c] ?? ""))), styles: { fontSize: 7 }, startY: 20 });
    doc.save(`reporte-${tipo}.pdf`);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="font-display text-2xl font-bold">Reportes</h1>
      <Card className="p-5 space-y-4">
        <div><Label>Tipo de reporte</Label>
          <div className="flex gap-2 flex-wrap mt-2">
            {REPORTES.map(r => (
              <Button key={r.key} variant={tipo === r.key ? "default" : "outline"} size="sm" onClick={() => setTipo(r.key)}>{r.label}</Button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Desde</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><Label>Hasta</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPDF} className="flex-1 bg-gradient-primary"><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button onClick={exportExcel} className="flex-1 bg-gradient-gold text-gold-foreground"><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
        </div>
      </Card>
    </div>
  );
}
