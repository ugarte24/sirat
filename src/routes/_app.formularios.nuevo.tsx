import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Camera, X } from "lucide-react";
import { MapPicker } from "@/components/MapPicker";
import type { ContribuyenteCatalogRow, FormularioNuevoState, TipoActividadCatalogRow } from "@/lib/sirat-forms";
import { emptyFormularioNuevo, formularioStateToInsert } from "@/lib/sirat-forms";

export const Route = createFileRoute("/_app/formularios/nuevo")({ component: Nuevo });

function Nuevo() {
  const nav = useNavigate();
  const [contribs, setContribs] = useState<ContribuyenteCatalogRow[]>([]);
  const [tipos, setTipos] = useState<TipoActividadCatalogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [f, setF] = useState<FormularioNuevoState>(emptyFormularioNuevo);

  useEffect(() => { (async () => {
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from("contribuyentes").select("id,ci,nombre_completo").order("nombre_completo"),
      supabase.from("tipos_actividad").select("id,nombre").order("nombre"),
    ]);
    setContribs(c ?? []); setTipos(t ?? []);
  })(); }, []);

  const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPhotos(p => [...p, ...files].slice(0, 2));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.contribuyente_id) return toast.error("Selecciona un contribuyente");
    if (!f.tipo_actividad_id) return toast.error("Selecciona el tipo de actividad");
    const sup = Number.parseFloat(f.superficie);
    if (!Number.isFinite(sup) || sup <= 0) {
      return toast.error("Indica una superficie válida (m²).");
    }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const row = formularioStateToInsert(f, u.user?.id);
    const { data: created, error } = await supabase.from("formularios").insert(row).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }
    // upload photos
    for (const file of photos) {
      const path = `${created.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("formulario-fotos").upload(path, file);
      if (!upErr) await supabase.from("formulario_fotos").insert({ formulario_id: created.id, storage_path: path });
    }
    toast.success(`Formulario N° ${created.numero} creado`); nav({ to: "/formularios" });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => nav({ to: "/formularios" })}><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>
      <h1 className="font-display text-2xl font-bold">Nuevo formulario de verificación</h1>
      <form onSubmit={submit} className="space-y-4">
        <Card className="p-5 space-y-4">
          <div>
            <Label>Contribuyente *</Label>
            <Select value={f.contribuyente_id} onValueChange={v => {
              const c = contribs.find(c => c.id === v);
              setF({ ...f, contribuyente_id: v, razon_social: f.razon_social || c?.nombre_completo || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{contribs.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre_completo} — {c.ci}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" variant="link" size="sm" className="px-0 h-auto mt-1" onClick={() => nav({ to: "/contribuyentes/nuevo" })}>+ Registrar nuevo contribuyente</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Razón social *</Label><Input value={f.razon_social} onChange={e => setF({ ...f, razon_social: e.target.value })} required /></div>
            <div><Label>NIT (opcional)</Label><Input value={f.nit} onChange={e => setF({ ...f, nit: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label>Zona *</Label>
              <Select value={f.zona} onValueChange={(v) => setF({ ...f, zona: v as FormularioNuevoState["zona"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["A","B","C","D","E"].map(z => <SelectItem key={z} value={z}>Zona {z}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Superficie (m²) *</Label><Input type="number" step="0.01" value={f.superficie} onChange={e => setF({ ...f, superficie: e.target.value })} required /></div>
            <div><Label>Celular *</Label><Input value={f.celular} onChange={e => setF({ ...f, celular: e.target.value })} required /></div>
          </div>
          <div><Label>Tipo de actividad *</Label>
            <Select value={f.tipo_actividad_id} onValueChange={v => setF({ ...f, tipo_actividad_id: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Dirección (barrio y avenida) *</Label><Input value={f.direccion} onChange={e => setF({ ...f, direccion: e.target.value })} required /></div>
          <div><Label>Referencia *</Label><Input value={f.referencia} onChange={e => setF({ ...f, referencia: e.target.value })} required /></div>
        </Card>

        <Card className="p-5 space-y-3">
          <Label>Ubicación geográfica (toca el mapa)</Label>
          <MapPicker lat={f.latitud} lng={f.longitud} onChange={(la, ln) => setF({ ...f, latitud: la, longitud: ln })} />
          {f.latitud != null && f.longitud != null && (
            <p className="text-xs text-muted-foreground">
              Lat: {f.latitud.toFixed(6)} • Lng: {f.longitud.toFixed(6)}
            </p>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={f.procedente} onCheckedChange={v => setF({ ...f, procedente: !!v })} /><Label className="cursor-pointer">Procedente</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={f.padron_bebidas} onCheckedChange={v => setF({ ...f, padron_bebidas: !!v })} /><Label className="cursor-pointer">Padrón / Bebidas alcohólicas</Label></div>
          <div><Label>Observación</Label><Textarea value={f.observacion} onChange={e => setF({ ...f, observacion: e.target.value })} /></div>
        </Card>

        <Card className="p-5 space-y-3">
          <Label>Fotografías (máximo 2)</Label>
          <div className="flex gap-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border">
                <img src={URL.createObjectURL(p)} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setPhotos(ph => ph.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X className="h-3 w-3" /></button>
              </div>
            ))}
            {photos.length < 2 && (
              <label className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted">
                <Camera className="h-5 w-5" /><span className="text-[10px] mt-1">Agregar</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={addPhoto} />
              </label>
            )}
          </div>
        </Card>

        <Button type="submit" disabled={busy} className="w-full h-11 bg-gradient-primary">Registrar formulario</Button>
      </form>
    </div>
  );
}
