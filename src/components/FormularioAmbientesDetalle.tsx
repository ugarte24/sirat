import type { FormularioAmbienteRecord } from "@/lib/formulario-ambientes";
import { formatAmbienteSuperficieM2 } from "@/lib/sirat-forms";

export function FormularioAmbientesDetalle({ rows }: { rows: FormularioAmbienteRecord[] }) {
  if (!rows.length) return null;

  const total = rows.reduce(
    (sum, r) => sum + Math.round(Number(r.largo) * Number(r.ancho) * 100) / 100,
    0,
  );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 text-left font-medium w-10">N°</th>
            <th className="px-3 py-2 text-left font-medium">Ambiente</th>
            <th className="px-3 py-2 text-right font-medium">Largo</th>
            <th className="px-3 py-2 text-right font-medium">Ancho</th>
            <th className="px-3 py-2 text-right font-medium">Superficie</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sup = Math.round(Number(r.largo) * Number(r.ancho) * 100) / 100;
            return (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2 text-muted-foreground">{r.orden}</td>
                <td className="px-3 py-2">{r.ambiente}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.largo}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.ancho}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmbienteSuperficieM2(sup)} m²</td>
              </tr>
            );
          })}
          <tr className="bg-muted/20 font-medium">
            <td className="px-3 py-2" colSpan={4}>
              TOTAL
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{formatAmbienteSuperficieM2(total)} m²</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
