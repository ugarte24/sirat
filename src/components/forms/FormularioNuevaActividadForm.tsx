import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";
import type { ContribuyenteCatalogRow, FormularioNuevoState, TipoActividadCatalogRow } from "@/lib/sirat-forms";
import { emptyFormularioNuevo, formularioStateToInsert } from "@/lib/sirat-forms";

const MapPicker = lazy(() => import("@/components/MapPicker").then((m) => ({ default: m.MapPicker })));

export type FormularioNuevaActividadFormProps = {
  onSuccess: () => void;
  /** Abre el flujo de alta de contribuyente (p. ej. segundo paso en el mismo diálogo) */
  onPedirAltaContribuyente?: () => void;
  /** Incrementar desde el padre para forzar recarga de catálogo de contribuyentes */
  catalogRefreshKey?: number;
};

function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <div
        className="h-[300px] rounded-lg border bg-muted/30 text-sm text-muted-foreground flex items-center justify-center px-4 text-center"
        aria-busy="true"
      >
        Preparando mapa…
      </div>
    );
  }
  return <>{children}</>;
}

export function FormularioNuevaActividadForm({
  onSuccess,
  onPedirAltaContribuyente,
  catalogRefreshKey = 0,
}: FormularioNuevaActividadFormProps) {
  const [contribs, setContribs] = useState<ContribuyenteCatalogRow[]>([]);
  const [tipos, setTipos] = useState<TipoActividadCatalogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [f, setF] = useState<FormularioNuevoState>(() => emptyFormularioNuevo());
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    setCatalogLoaded(false);
    void (async () => {
      try {
        const [cr, tr] = await Promise.all([
          supabase.from("contribuyentes").select("id,ci,nombre_completo").order("nombre_completo"),
          supabase.from("tipos_actividad").select("id,nombre").order("nombre"),
        ]);
        if (cr.error) toast.error(`Contribuyentes: ${cr.error.message}`);
        if (tr.error) toast.error(`Tipos de actividad: ${tr.error.message}`);
        setContribs(cr.data ?? []);
        setTipos(tr.data ?? []);
        if (!(cr.data?.length) && !cr.error) {
          toast.message("No hay contribuyentes. Registre uno antes o use el enlace de abajo.");
        }
        if (!(tr.data?.length) && !tr.error) {
          toast.message("No hay tipos de actividad en la base. Ejecute las migraciones en Supabase.");
        }
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar los catálogos. Revise la conexión y las variables de Supabase.");
      } finally {
        setCatalogLoaded(true);
      }
    })();
  }, [catalogRefreshKey]);

  const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPhotos((p) => [...p, ...files].slice(0, 2));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.contribuyente_id) return toast.error("Selecciona un contribuyente");
    if (!f.tipo_actividad_id) return toast.error("Selecciona el tipo de actividad");
    const sup = Number.parseFloat(f.superficie);
    if (!Number.isFinite(sup) || sup <= 0) {
      return toast.error("Indica una superficie válida (m²).");
    }
    if (!f.padron && !f.bebidas_alcoholicas) {
      return toast.error("Marque al menos una opción: Padrón o Bebidas alcohólicas.");
    }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const row = formularioStateToInsert(f, u.user?.id);
    const { data: created, error } = await supabase.from("formularios").insert(row).select().single();
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    for (const file of photos) {
      const path = `${created.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("formulario-fotos").upload(path, file);
      if (!upErr) await supabase.from("formulario_fotos").insert({ formulario_id: created.id, storage_path: path });
    }
    toast.success(`Formulario N° ${created.numero} creado`);
    setPhotos([]);
    setF(emptyFormularioNuevo());
    setBusy(false);
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {!catalogLoaded && (
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-md px-3 py-2">
          Cargando listas de contribuyentes y tipos de actividad… Puede completar el resto del formulario mientras tanto.
        </p>
      )}
      <Card className="p-5 space-y-4 border-0 shadow-none sm:border sm:shadow-sm">
        <div>
          <Label>Contribuyente *</Label>
          <Select
            value={f.contribuyente_id || undefined}
            onValueChange={(v) => {
              const c = contribs.find((x) => x.id === v);
              setF({ ...f, contribuyente_id: v, razon_social: f.razon_social || c?.nombre_completo || "" });
            }}
            disabled={!catalogLoaded}
          >
            <SelectTrigger>
              <SelectValue placeholder={catalogLoaded ? "Seleccionar contribuyente" : "Cargando…"} />
            </SelectTrigger>
            <SelectContent>
              {contribs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre_completo} — {c.ci}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Razón social *</Label>
            <Input
              value={f.razon_social}
              onChange={(e) => setF({ ...f, razon_social: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>NIT (opcional)</Label>
            <Input value={f.nit} onChange={(e) => setF({ ...f, nit: e.target.value })} />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Zona *</Label>
            <Select value={f.zona} onValueChange={(v) => setF({ ...f, zona: v as FormularioNuevoState["zona"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["A", "B", "C", "D", "E"].map((z) => (
                  <SelectItem key={z} value={z}>
                    Zona {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Superficie (m²) *</Label>
            <Input
              type="number"
              step="0.01"
              value={f.superficie}
              onChange={(e) => setF({ ...f, superficie: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Celular *</Label>
            <Input value={f.celular} onChange={(e) => setF({ ...f, celular: e.target.value })} required />
          </div>
        </div>
        <div>
          <Label>Tipo de actividad *</Label>
          <Select
            value={f.tipo_actividad_id || undefined}
            onValueChange={(v) => setF({ ...f, tipo_actividad_id: v })}
            disabled={!catalogLoaded}
          >
            <SelectTrigger>
              <SelectValue placeholder={catalogLoaded ? "Seleccionar tipo" : "Cargando…"} />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Dirección (barrio y avenida) *</Label>
          <Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} required />
        </div>
        <div>
          <Label>Referencia *</Label>
          <Input value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} required />
        </div>
      </Card>

      <Card className="p-5 space-y-3 border-0 shadow-none sm:border sm:shadow-sm">
        <Label>Ubicación geográfica (toca el mapa)</Label>
        <ClientOnly>
          <Suspense
            fallback={
              <div className="h-[300px] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                Cargando mapa…
              </div>
            }
          >
            <MapPicker lat={f.latitud} lng={f.longitud} onChange={(la, ln) => setF({ ...f, latitud: la, longitud: ln })} />
          </Suspense>
        </ClientOnly>
        {f.latitud != null && f.longitud != null && (
          <p className="text-xs text-muted-foreground">
            Lat: {f.latitud.toFixed(6)} • Lng: {f.longitud.toFixed(6)}
          </p>
        )}
      </Card>

      <Card className="p-5 space-y-4 border-0 shadow-none sm:border sm:shadow-sm">
        <fieldset className="space-y-2 min-w-0">
          <legend className="text-sm font-medium text-foreground">Procedencia</legend>
          <RadioGroup
            value={f.procedente ? "procedente" : "no_procedente"}
            onValueChange={(v) => setF({ ...f, procedente: v === "procedente" })}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="procedente" id="form-proc-si" />
              <Label htmlFor="form-proc-si" className="cursor-pointer font-normal leading-none">
                Procedente
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no_procedente" id="form-proc-no" />
              <Label htmlFor="form-proc-no" className="cursor-pointer font-normal leading-none">
                No procedente
              </Label>
            </div>
          </RadioGroup>
        </fieldset>

        <fieldset className="space-y-2 min-w-0">
          <legend className="text-sm font-medium text-foreground">Padrón y bebidas *</legend>
          <p className="text-xs text-muted-foreground">Debe marcar al menos una de las dos opciones.</p>
          <div className="flex items-center gap-2">
            <Checkbox
              id="form-padron"
              checked={f.padron}
              onCheckedChange={(v) => setF({ ...f, padron: !!v })}
            />
            <Label htmlFor="form-padron" className="cursor-pointer font-normal leading-none">
              Padrón
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="form-bebidas"
              checked={f.bebidas_alcoholicas}
              onCheckedChange={(v) => setF({ ...f, bebidas_alcoholicas: !!v })}
            />
            <Label htmlFor="form-bebidas" className="cursor-pointer font-normal leading-none">
              Bebidas alcohólicas
            </Label>
          </div>
        </fieldset>

        <div>
          <Label>Observación</Label>
          <Textarea value={f.observacion} onChange={(e) => setF({ ...f, observacion: e.target.value })} />
        </div>
      </Card>

      <Card className="p-5 space-y-3 border-0 shadow-none sm:border sm:shadow-sm">
        <Label>Fotografías (máximo 2)</Label>
        <div className="flex gap-2 flex-wrap">
          {photos.map((p, i) => (
            <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border">
              <img src={URL.createObjectURL(p)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((ph) => ph.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < 2 && (
            <label className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted">
              <Camera className="h-5 w-5" />
              <span className="text-[10px] mt-1">Agregar</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={addPhoto} />
            </label>
          )}
        </div>
      </Card>

      <Button type="submit" disabled={busy} className="w-full h-11 bg-gradient-primary">
        Registrar formulario
      </Button>
    </form>
  );
}
