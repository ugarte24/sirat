import { Card } from "@/components/ui/card";
import { formatDateEsBo } from "@/lib/date";
import type { NotificacionQrPayload } from "@/lib/notificacion-qr";
import {
  GAM_RIBERALTA_NOMBRE,
  JEFATURA_RECAUDACIONES,
  NOTIFICACION_GESTIONES_ADEUDADAS_LABEL,
  NOTIFICACION_TRIBUTARIA_PDF_TITULO,
  SIRAT_TAGLINE,
} from "@/lib/sirat-brand";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-border/80 py-2.5 last:border-0 sm:grid-cols-[14rem_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

/** Vista de verificación (contenido del PDF sin firmas). */
export function NotificacionVerificacionView({ data }: { data: NotificacionQrPayload }) {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <header className="space-y-1 text-center">
        <p className="text-xs font-bold tracking-wide text-primary">SIRAT</p>
        <p className="text-[0.65rem] leading-snug text-muted-foreground">{SIRAT_TAGLINE}</p>
        <p className="text-[0.7rem] font-semibold text-foreground">{GAM_RIBERALTA_NOMBRE}</p>
        <p className="text-[0.65rem] text-muted-foreground">{JEFATURA_RECAUDACIONES}</p>
        <h1 className="pt-6 font-display text-2xl font-bold text-primary sm:pt-8 sm:text-3xl">
          {NOTIFICACION_TRIBUTARIA_PDF_TITULO}
        </h1>
      </header>

      <Card className="overflow-hidden p-0">
        <div className="border-b bg-muted/40 px-4 py-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Datos de la notificación
          </h2>
        </div>
        <dl className="px-4 py-1">
          <Field label="Fecha emisión" value={formatDateEsBo(data.fecha_emision)} />
          <Field label="Contribuyente" value={data.contribuyente_nombre} />
          <Field label="Nombre de la actividad" value={data.nombre_actividad} />
          <Field label="Dirección" value={data.direccion} />
          <Field label="Conceptos" value={data.conceptos.join(", ") || "—"} />
          <Field label={NOTIFICACION_GESTIONES_ADEUDADAS_LABEL} value={data.gestiones_adeudadas} />
          <Field label="Fecha límite" value={formatDateEsBo(data.fecha_limite)} />
          <Field label="C.I." value={data.contribuyente_ci} />
          <Field label="Licencia / placa / inmueble" value={data.numero_identificacion} />
        </dl>
      </Card>

      <p className="px-2 text-center text-[0.65rem] italic text-muted-foreground">
        La información registrada tiene carácter de declaración jurada y está sujeta a su
        verificación.
      </p>
    </div>
  );
}
