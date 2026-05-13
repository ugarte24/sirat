import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/notificaciones/nuevo")({ component: Nuevo });

function Nuevo() {
  const nav = useNavigate();
  const [contribs, setContribs] = useState<any[]>([]);
  const [n, setN] = useState<any>({
    contribuyente_id: "", nombre_notificado: "", direccion: "",
    fecha_limite: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    tipo: "aviso", padron_municipal: false, impuestos_patente: false,
    bienes_inmuebles: false, vehiculos: false,
  });
  useEffect(() => { (async () => {
    const { data } = await supabase.from("contribuyentes").select("id,ci,nombre_completo").order("nombre_completo");
    setContribs(data ?? []);
  })(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!n.contribuyente_id) return toast.error("Selecciona contribuyente");
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("notificaciones").insert({ ...n, numero_correlativo: 0, created_by: u.user?.id }).select().single();
    if (error) return toast.error(error.message);
    toast.success(`Notificación N° ${data.codigo} creada`); nav({ to: "/notificaciones" });
  };

  return (
    <div className="space-y-4 max-w-xl">
      <Button variant="ghost" size="sm" onClick={() => nav({ to: "/notificaciones" })}><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>
      <h1 className="font-display text-2xl font-bold">Nueva notificación</h1>
      <form onSubmit={submit} className="space-y-4">
        <Card className="p-5 space-y-4">
          <div><Label>Contribuyente *</Label>
            <Select value={n.contribuyente_id} onValueChange={v => {
              const c = contribs.find(c => c.id === v);
              setN({ ...n, contribuyente_id: v, nombre_notificado: c?.nombre_completo ?? "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{contribs.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre_completo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Nombre del notificado *</Label><Input value={n.nombre_notificado} onChange={e => setN({ ...n, nombre_notificado: e.target.value })} required /></div>
          <div><Label>Dirección *</Label><Input value={n.direccion} onChange={e => setN({ ...n, direccion: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha límite *</Label><Input type="date" value={n.fecha_limite} onChange={e => setN({ ...n, fecha_limite: e.target.value })} required /></div>
            <div><Label>Tipo *</Label>
              <Select value={n.tipo} onValueChange={v => setN({ ...n, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            {[
              ["padron_municipal", "Padrón municipal"],
              ["impuestos_patente", "Impuestos de patente"],
              ["bienes_inmuebles", "Bienes inmuebles"],
              ["vehiculos", "Vehículos"],
            ].map(([k, l]) => (
              <div key={k} className="flex items-center gap-2">
                <Checkbox checked={n[k]} onCheckedChange={v => setN({ ...n, [k]: !!v })} />
                <Label className="cursor-pointer">{l}</Label>
              </div>
            ))}
          </div>
        </Card>
        <Button type="submit" className="w-full h-11 bg-gradient-gold text-gold-foreground">Emitir notificación</Button>
      </form>
    </div>
  );
}
