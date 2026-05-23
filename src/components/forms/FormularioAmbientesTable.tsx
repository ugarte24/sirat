import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import {
  calcAmbienteSuperficie,
  calcAmbientesTotal,
  emptyAmbienteRow,
  formatAmbienteSuperficieM2,
  type FormularioAmbienteRow,
} from "@/lib/sirat-forms";

export type FormularioAmbientesTableProps = {
  rows: FormularioAmbienteRow[];
  onChange: (rows: FormularioAmbienteRow[]) => void;
  disabled?: boolean;
};

export function FormularioAmbientesTable({ rows, onChange, disabled }: FormularioAmbientesTableProps) {
  const total = calcAmbientesTotal(rows);

  const updateRow = (index: number, patch: Partial<FormularioAmbienteRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...rows, emptyAmbienteRow()]);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Medición de ambientes *</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Registre cada ambiente con largo y ancho en metros. La superficie y el total se calculan
          automáticamente.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-2 py-2 text-left font-medium w-10">N°</th>
              <th className="px-2 py-2 text-left font-medium">Ambiente</th>
              <th className="px-2 py-2 text-left font-medium w-24">Largo</th>
              <th className="px-2 py-2 text-left font-medium w-24">Ancho</th>
              <th className="px-2 py-2 text-right font-medium w-28">Superficie</th>
              <th className="px-2 py-2 w-10" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const sup = calcAmbienteSuperficie(row.largo, row.ancho);
              return (
                <tr key={row.id ?? `row-${index}`} className="border-b last:border-0">
                  <td className="px-2 py-2 text-muted-foreground align-middle">{index + 1}</td>
                  <td className="px-2 py-2 align-middle">
                    <Input
                      value={row.ambiente}
                      onChange={(e) => updateRow(index, { ambiente: e.target.value })}
                      placeholder="Ej. Oficina"
                      disabled={disabled}
                      className="h-9"
                    />
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={row.largo}
                      onChange={(e) => updateRow(index, { largo: e.target.value })}
                      placeholder="m"
                      disabled={disabled}
                      className="h-9"
                    />
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={row.ancho}
                      onChange={(e) => updateRow(index, { ancho: e.target.value })}
                      placeholder="m"
                      disabled={disabled}
                      className="h-9"
                    />
                  </td>
                  <td className="px-2 py-2 text-right align-middle tabular-nums text-muted-foreground">
                    {sup != null ? `${formatAmbienteSuperficieM2(sup)} m²` : "—"}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={disabled || rows.length <= 1}
                      onClick={() => removeRow(index)}
                      aria-label={`Quitar ambiente ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-muted/20 font-medium">
              <td className="px-2 py-2" colSpan={4}>
                TOTAL
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {total > 0 ? `${formatAmbienteSuperficieM2(total)} m²` : "—"}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={disabled}
        onClick={addRow}
      >
        <Plus className="h-4 w-4" />
        Agregar ambiente
      </Button>
    </div>
  );
}
