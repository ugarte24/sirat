import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ContribuyenteCombobox } from "@/components/ContribuyenteCombobox";
import { DatePickerField } from "@/components/DatePickerField";
import { toast } from "sonner";
import { Search } from "lucide-react";
import type { ContribuyenteCatalogRow, NotificacionNuevaState } from "@/lib/sirat-forms";
import {
  defaultNotificacionNueva,
  NOTIFICACION_CONCEPTO_OPTS,
  notificacionStateToInsert,
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

export type NotificacionNuevaFormProps = {
  onSuccess: () => void;
  onPedirAltaContribuyente?: () => void;
  /** Incrementar desde el padre para recargar el catálogo de contribuyentes */
  catalogRefreshKey?: number;
  /** Tras registrar contribuyente en el mismo diálogo, preseleccionarlo aquí */
  contribuyenteRecienRegistrado?: ContribuyenteCatalogRow | null;
  onContribuyentePreseleccionado?: () => void;
};

export function NotificacionNuevaForm({
  onSuccess,
  onPedirAltaContribuyente,
  catalogRefreshKey = 0,
  contribuyenteRecienRegistrado = null,
  onContribuyentePreseleccionado,
}: NotificacionNuevaFormProps) {
  const [contribs, setContribs] = useState<ContribuyenteCatalogRow[]>([]);
  const [n, setN] = useState<NotificacionNuevaState>(defaultNotificacionNueva());
  const [naHits, setNaHits] = useState<RazonSocialFormHit[]>([]);
  const [naBuscando, setNaBuscando] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("contribuyentes")
        .select("id,ci,nombre_completo")
        .order("nombre_completo");
      if (error) toast.error(`Contribuyentes: ${error.message}`);
      setContribs(data ?? []);
    })();
  }, [catalogRefreshKey]);

  useEffect(() => {
    if (!contribuyenteRecienRegistrado) return;
    setN((prev) => ({ ...prev, contribuyente_id: contribuyenteRecienRegistrado.id }));
    setContribs((prev) => {
      if (prev.some((c) => c.id === contribuyenteRecienRegistrado.id)) return prev;
      return [...prev, contribuyenteRecienRegistrado].sort((a, b) =>
        a.nombre_completo.localeCompare(b.nombre_completo, "es"),
      );
    });
    onContribuyentePreseleccionado?.();
  }, [contribuyenteRecienRegistrado, onContribuyentePreseleccionado]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!n.fecha_limite.trim()) return toast.error("Indique la fecha límite");
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
    const { data: u } = await supabase.auth.getUser();
    const payload = notificacionStateToInsert(n, u.user?.id);
    const { data, error } = await supabase.from("notificaciones").insert(payload).select().single();
    if (error) return toast.error(error.message);
    toast.success("Notificación registrada");
    setN(defaultNotificacionNueva());
    setNaHits([]);
    onSuccess();
  };

  const buscarRazonSocialFormularios = async () => {
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
          {onPedirAltaContribuyente ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0 h-auto mt-1"
              onClick={onPedirAltaContribuyente}
            >
              + Registrar nuevo contribuyente
            </Button>
          ) : null}
        </div>
        <div>
          <Label htmlFor="notif-nombre-actividad">Nombre de la actividad (opcional)</Label>
          <div className="relative">
            <Input
              id="notif-nombre-actividad"
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
                      setN((prev) => ({ ...prev, nombre_actividad: h.razon_social }));
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
          <Label htmlFor="notif-num-id">N.º de licencia, placa o inmueble (opcional)</Label>
          <Input
            id="notif-num-id"
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
          <Label htmlFor="notif-fecha-limite">Fecha límite *</Label>
          <DatePickerField
            id="notif-fecha-limite"
            value={n.fecha_limite}
            onChange={(fecha_limite) => setN({ ...n, fecha_limite })}
            required
          />
        </div>
        <fieldset className="space-y-2 min-w-0">
          <legend className="text-sm font-medium leading-none">Conceptos *</legend>
          <p className="text-xs text-muted-foreground">Debe marcar al menos una de las opciones.</p>
          {NOTIFICACION_CONCEPTO_OPTS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`notif-concept-${key}`}
                checked={n[key]}
                onCheckedChange={(v) => setN((prev) => ({ ...prev, [key]: !!v }))}
              />
              <Label htmlFor={`notif-concept-${key}`} className="cursor-pointer font-normal">
                {label}
              </Label>
            </div>
          ))}
        </fieldset>
        <div>
          <Label htmlFor="notif-gestiones">
            {NOTIFICACION_GESTIONES_ADEUDADAS_LABEL}, si corresponde
          </Label>
          <Textarea
            id="notif-gestiones"
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
          onChange={(patch) => setN((prev) => ({ ...prev, ...patch }))}
        />
      </Card>
      <Button type="submit" className="w-full h-11 bg-gradient-gold text-gold-foreground">
        Emitir notificación
      </Button>
    </form>
  );
}
