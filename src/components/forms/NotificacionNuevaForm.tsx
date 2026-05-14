import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { ContribuyenteCatalogRow, NotificacionNuevaState, NotificacionTipo } from "@/lib/sirat-forms";
import { defaultNotificacionNueva, notificacionStateToInsert } from "@/lib/sirat-forms";

const CONCEPT_OPTS: Array<{
  key: keyof Pick<
    NotificacionNuevaState,
    "padron_municipal" | "impuestos_patente" | "bienes_inmuebles" | "vehiculos"
  >;
  label: string;
}> = [
  { key: "padron_municipal", label: "Padrón municipal" },
  { key: "impuestos_patente", label: "Impuestos de patente" },
  { key: "bienes_inmuebles", label: "Bienes inmuebles" },
  { key: "vehiculos", label: "Vehículos" },
];

export type NotificacionNuevaFormProps = {
  onSuccess: () => void;
};

export function NotificacionNuevaForm({ onSuccess }: NotificacionNuevaFormProps) {
  const [contribs, setContribs] = useState<ContribuyenteCatalogRow[]>([]);
  const [n, setN] = useState<NotificacionNuevaState>(defaultNotificacionNueva());

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("contribuyentes")
        .select("id,ci,nombre_completo")
        .order("nombre_completo");
      if (error) toast.error(`Contribuyentes: ${error.message}`);
      setContribs(data ?? []);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!n.contribuyente_id) return toast.error("Selecciona contribuyente");
    const { data: u } = await supabase.auth.getUser();
    const payload = notificacionStateToInsert(n, u.user?.id);
    const { data, error } = await supabase.from("notificaciones").insert(payload).select().single();
    if (error) return toast.error(error.message);
    toast.success(`Notificación N° ${data.codigo} creada`);
    setN(defaultNotificacionNueva());
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="p-5 space-y-4 border-0 shadow-none sm:border sm:shadow-sm">
        <div>
          <Label>Contribuyente *</Label>
          <Select
            value={n.contribuyente_id || undefined}
            onValueChange={(v) => {
              const c = contribs.find((x) => x.id === v);
              setN({ ...n, contribuyente_id: v, nombre_notificado: c?.nombre_completo ?? "" });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {contribs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nombre del notificado *</Label>
          <Input
            value={n.nombre_notificado}
            onChange={(e) => setN({ ...n, nombre_notificado: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Dirección *</Label>
          <Input value={n.direccion} onChange={(e) => setN({ ...n, direccion: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha límite *</Label>
            <Input
              type="date"
              value={n.fecha_limite}
              onChange={(e) => setN({ ...n, fecha_limite: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={n.tipo} onValueChange={(v) => setN({ ...n, tipo: v as NotificacionTipo })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aviso">Aviso</SelectItem>
                <SelectItem value="advertencia">Advertencia</SelectItem>
                <SelectItem value="multa">Multa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Conceptos</Label>
          {CONCEPT_OPTS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                checked={n[key]}
                onCheckedChange={(v) => setN((prev) => ({ ...prev, [key]: !!v }))}
              />
              <Label className="cursor-pointer">{label}</Label>
            </div>
          ))}
        </div>
      </Card>
      <Button type="submit" className="w-full h-11 bg-gradient-gold text-gold-foreground">
        Emitir notificación
      </Button>
    </form>
  );
}
