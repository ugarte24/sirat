import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ContribuyenteCombobox } from "@/components/ContribuyenteCombobox";
import { formatDateEsBo } from "@/lib/date";
import { toast } from "sonner";
import { Search } from "lucide-react";
import type { ContribuyenteCatalogRow, NotificacionNuevaState } from "@/lib/sirat-forms";
import {
  NOTIFICACION_CONCEPTO_OPTS,
  notificacionRowToState,
  notificacionStateToUpdate,
} from "@/lib/sirat-forms";
import {
  FORMULARIO_VERIFICACION_SECCION,
  NOTIFICACION_GESTIONES_ADEUDADAS_LABEL,
} from "@/lib/sirat-brand";
import { NotificacionMapaFields } from "@/components/forms/NotificacionMapaFields";

type RazonSocialFormHit = {
  razon_social: string;
  nombre_completo: string;
  ci: string;
};

export type NotificacionEditarFormProps = {
  notificacionId: string;
  onSuccess: () => void;
  onCancel?: () => void;
};

export function NotificacionEditarForm({ notificacionId, onSuccess, onCancel }: NotificacionEditarFormProps) {
  const [contribs, setContribs] = useState<ContribuyenteCatalogRow[]>([]);
  const [n, setN] = useState<NotificacionNuevaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [naHits, setNaHits] = useState<RazonSocialFormHit[]>([]);
  const [naBuscando, setNaBuscando] = useState(false);

  useEffect(() => {
    setLoading(true);
    setN(null);
    setNaHits([]);

    void (async () => {
      try {
        const [notifRes, cr] = await Promise.all([
          supabase.from("notificaciones").select("*").eq("id", notificacionId).maybeSingle(),
          supabase.from("contribuyentes").select("id,ci,nombre_completo").order("nombre_completo"),
        ]);
        if (cr.error) toast.error(`Contribuyentes: ${cr.error.message}`);
        setContribs(cr.data ?? []);

        if (notifRes.error) {
          toast.error(notifRes.error.message);
          return;
        }
        if (!notifRes.data) {
          toast.error("Notificación no encontrada");
          onCancel?.();
          return;
        }
        if (notifRes.data.estado !== "pendiente") {
          toast.error("Solo se pueden editar notificaciones pendientes");
          onCancel?.();
          return;
        }
        setN(notificacionRowToState(notifRes.data));
      } catch {
        toast.error("No se pudo cargar la notificación");
      } finally {
        setLoading(false);
      }
    })();
  }, [notificacionId, onCancel]);

  const buscarRazonSocialFormularios = async () => {
    if (!n) return;
    const q = n.nombre_actividad.trim();
    if (q.length < 2) {
      toast.message(`Escriba al menos 2 caracteres para buscar por razón social en ${FORMULARIO_VERIFICACION_SECCION.toLowerCase()}.`);
      setNaHits([]);
      return;
    }
    setNaBuscando(true);
    const { data, error } = await supabase
      .from("formularios")
      .select("razon_social, contribuyente:contribuyentes(nombre_completo, ci)")
      .ilike("razon_social", `%${q}%`)
      .order("fecha", { ascending: false })
      .limit(40);
    setNaBuscando(false);
    if (error) {
      toast.error(error.message);
      setNaHits([]);
      return;
    }
    const seen = new Set<string>();
    const hits: RazonSocialFormHit[] = [];
    for (const row of data ?? []) {
      const co = row.contribuyente as { nombre_completo: string; ci: string } | null;
      if (!co?.nombre_completo) continue;
      const rs = String(row.razon_social ?? "").trim();
      if (!rs) continue;
      const key = rs.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ razon_social: row.razon_social, nombre_completo: co.nombre_completo, ci: co.ci });
      if (hits.length >= 15) break;
    }
    setNaHits(hits);
    if (!hits.length) toast.message(`No hay registros en ${FORMULARIO_VERIFICACION_SECCION.toLowerCase()} con esa razón social.`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!n) return;
    const hasConcepto =
      n.padron_municipal ||
      n.permiso_bebidas_alcoholicas ||
      n.impuestos_patente ||
      n.bienes_inmuebles ||
      n.vehiculos;
    if (!hasConcepto) {
      return toast.error(
        `Marque al menos un concepto (${NOTIFICACION_CONCEPTO_OPTS.map((o) => o.label).join(", ")}).`,
      );
    }

    setBusy(true);
    const { error } = await supabase
      .from("notificaciones")
      .update(notificacionStateToUpdate(n))
      .eq("id", notificacionId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Notificación actualizada");
    onSuccess();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Cargando…</p>;
  }
  if (!n) return null;

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="p-5 space-y-4 border-0 shadow-none sm:border sm:shadow-sm">
        <div>
          <Label>Contribuyente (opcional)</Label>
          <ContribuyenteCombobox
            contribs={contribs}
            value={n.contribuyente_id}
            onValueChange={(v) => setN({ ...n, contribuyente_id: v })}
            placeholder="Seleccionar contribuyente"
            allowClear
          />
        </div>
        <div>
          <Label htmlFor="notif-edit-nombre-actividad">Nombre de la actividad (opcional)</Label>
          <div className="relative">
            <Input
              id="notif-edit-nombre-actividad"
              className="pr-10"
              value={n.nombre_actividad}
              onChange={(e) => {
                setN({ ...n, nombre_actividad: e.target.value });
                setNaHits([]);
              }}
              placeholder={`Escriba o pulse la lupa: busca razón social en ${FORMULARIO_VERIFICACION_SECCION.toLowerCase()}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={`Buscar por razón social en ${FORMULARIO_VERIFICACION_SECCION.toLowerCase()}`}
              disabled={naBuscando}
              onClick={() => void buscarRazonSocialFormularios()}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {naBuscando ? (
            <p className="text-xs text-muted-foreground mt-1.5">Buscando verificaciones…</p>
          ) : null}
          {naHits.length > 0 ? (
            <ul
              className="mt-1.5 rounded-md border bg-popover text-sm max-h-40 overflow-y-auto shadow-sm divide-y"
              role="listbox"
            >
              {naHits.map((h, i) => (
                <li key={`${h.razon_social}-${i}`}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/80 transition-colors"
                    onClick={() => {
                      setN((prev) => (prev ? { ...prev, nombre_actividad: h.razon_social } : prev));
                      setNaHits([]);
                    }}
                  >
                    <span className="font-medium">{h.razon_social}</span>
                    <span className="text-muted-foreground block text-xs">
                      {h.nombre_completo} — {h.ci}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div>
          <Label htmlFor="notif-edit-num-id">N.º de licencia, placa o inmueble (opcional)</Label>
          <Input
            id="notif-edit-num-id"
            value={n.numero_identificacion}
            onChange={(e) => setN({ ...n, numero_identificacion: e.target.value })}
            placeholder="N.º de licencia, placa o inmueble (opcional)"
            aria-required={false}
          />
        </div>
        <div>
          <Label>Dirección *</Label>
          <Input value={n.direccion} onChange={(e) => setN({ ...n, direccion: e.target.value })} required />
        </div>
        <div>
          <Label>Fecha límite vigente</Label>
          <p className="mt-1 text-sm font-medium">{n.fecha_limite ? formatDateEsBo(n.fecha_limite) : "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Para cambiar la fecha límite use «Volver a notificar» en el detalle de la notificación.
          </p>
        </div>
        <fieldset className="space-y-2 min-w-0">
          <legend className="text-sm font-medium leading-none">Conceptos *</legend>
          <p className="text-xs text-muted-foreground">Debe marcar al menos una de las opciones.</p>
          {NOTIFICACION_CONCEPTO_OPTS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`notif-edit-concept-${key}`}
                checked={n[key]}
                onCheckedChange={(v) => setN((prev) => (prev ? { ...prev, [key]: !!v } : prev))}
              />
              <Label htmlFor={`notif-edit-concept-${key}`} className="cursor-pointer font-normal">
                {label}
              </Label>
            </div>
          ))}
        </fieldset>
        <div>
          <Label htmlFor="notif-edit-gestiones">
            {NOTIFICACION_GESTIONES_ADEUDADAS_LABEL}, si corresponde
          </Label>
          <Textarea
            id="notif-edit-gestiones"
            rows={3}
            value={n.gestiones_adeudadas}
            onChange={(e) => setN({ ...n, gestiones_adeudadas: e.target.value })}
            className="resize-y min-h-[80px]"
          />
        </div>
        <NotificacionMapaFields
          latitud={n.latitud}
          longitud={n.longitud}
          mapa_zoom={n.mapa_zoom}
          onChange={(patch) => setN((prev) => (prev ? { ...prev, ...patch } : prev))}
        />
      </Card>
      <div className="flex gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        ) : null}
        <Button
          type="submit"
          className={`h-11 bg-gradient-gold text-gold-foreground ${onCancel ? "flex-1" : "w-full"}`}
          disabled={busy}
        >
          {busy ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
