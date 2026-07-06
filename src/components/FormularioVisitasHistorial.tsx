import { formatDateEsBo } from "@/lib/date";
import { formularioVisitaResultadoLabel, type FormularioVisitaRow } from "@/lib/formulario-visita-verificacion";

export type FormularioVisitasHistorialProps = {
  visitas: FormularioVisitaRow[];
  compact?: boolean;
};

export function FormularioVisitasHistorial({ visitas, compact = false }: FormularioVisitasHistorialProps) {
  if (!visitas.length) return null;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact ? (
        <p className="text-sm font-medium text-foreground">Historial de visitas sin verificar</p>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Motivo</th>
              <th className="px-3 py-2">Observación</th>
              <th className="px-3 py-2">Operador</th>
            </tr>
          </thead>
          <tbody>
            {visitas.map((v) => (
              <tr key={v.id} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2 whitespace-nowrap">{formatDateEsBo(v.fecha_visita)}</td>
                <td className="px-3 py-2">{formularioVisitaResultadoLabel(v.resultado)}</td>
                <td className="px-3 py-2 text-muted-foreground max-w-[12rem]">
                  <span className="whitespace-pre-wrap">{v.observacion?.trim() || "—"}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                  {v.operador?.full_name?.trim() || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
