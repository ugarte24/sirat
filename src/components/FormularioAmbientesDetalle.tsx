import type { FormularioAmbienteRecord } from "@/lib/formulario-ambientes";
import { formatAmbienteSuperficieM2 } from "@/lib/sirat-forms";

function calcRowSuperficie(largo: number | string, ancho: number | string) {
  return Math.round(Number(largo) * Number(ancho) * 100) / 100;
}

export function FormularioAmbientesDetalle({ rows }: { rows: FormularioAmbienteRecord[] }) {
  if (!rows.length) return null;

  const total = rows.reduce((sum, r) => sum + calcRowSuperficie(r.largo, r.ancho), 0);

  return (
    <>
      {/* Escritorio: tabla */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
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
              const sup = calcRowSuperficie(r.largo, r.ancho);
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">{r.orden}</td>
                  <td className="px-3 py-2">{r.ambiente}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.largo}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.ancho}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatAmbienteSuperficieM2(sup)} m²
                  </td>
                </tr>
              );
            })}
            <tr className="bg-muted/20 font-medium">
              <td className="px-3 py-2" colSpan={4}>
                TOTAL
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatAmbienteSuperficieM2(total)} m²
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas apiladas */}
      <div className="sm:hidden space-y-3">
        {rows.map((r) => {
          const sup = calcRowSuperficie(r.largo, r.ancho);
          return (
            <div key={r.id} className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground shrink-0">
                  N° {r.orden}
                </span>
                <p className="min-w-0 flex-1 text-right text-sm font-medium leading-snug">
                  {r.ambiente}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-background/80 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Largo (m)</p>
                  <p className="text-sm font-medium tabular-nums">{r.largo}</p>
                </div>
                <div className="rounded-md bg-background/80 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Ancho (m)</p>
                  <p className="text-sm font-medium tabular-nums">{r.ancho}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md bg-background/80 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">Superficie</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatAmbienteSuperficieM2(sup)} m²
                </span>
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
          <span className="text-sm font-semibold">TOTAL</span>
          <span className="text-sm font-bold tabular-nums">{formatAmbienteSuperficieM2(total)} m²</span>
        </div>
      </div>
    </>
  );
}
