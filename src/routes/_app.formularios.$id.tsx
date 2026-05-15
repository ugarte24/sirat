import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ban, FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { MapPicker } from "@/components/MapPicker";
import { generateFormularioPDF, generateFormularioFotosPDF } from "@/lib/pdf";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/formularios/$id")({ component: Detalle });

function Detalle() {
  const { id } = Route.useParams();
  const { role } = useAuth();
  const [f, setF] = useState<any>(null);
  const [photos, setPhotos] = useState<{ url: string }[]>([]);
  const [fotosPdfBusy, setFotosPdfBusy] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("formularios").select(
      "*, contribuyente:contribuyentes(nombre_completo,ci), tipo:tipos_actividad(nombre)"
    ).eq("id", id).maybeSingle();
    setF(data);
    const { data: fotos } = await supabase.from("formulario_fotos").select("storage_path").eq("formulario_id", id);
    if (fotos) {
      const urls = await Promise.all(fotos.map(async p => {
        const { data: signed } = await supabase.storage.from("formulario-fotos").createSignedUrl(p.storage_path, 3600);
        return { url: signed?.signedUrl ?? "" };
      }));
      setPhotos(urls);
    }
  })(); }, [id]);

  if (!f) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground" asChild>
          <Link to="/formularios">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Volver a formularios
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  const pdf = () => generateFormularioPDF({
    numero: f.numero, codigo_actividad: f.codigo_actividad, fecha: f.fecha,
    razon_social: f.razon_social, contribuyente_nombre: f.contribuyente.nombre_completo,
    contribuyente_ci: f.contribuyente.ci, nit: f.nit, zona: f.zona, superficie: f.superficie,
    tipo_actividad: f.tipo.nombre, direccion: f.direccion, celular: f.celular, referencia: f.referencia,
    latitud: f.latitud,
    longitud: f.longitud,
    procedente: f.procedente,
    padron: f.padron,
    bebidas_alcoholicas: f.bebidas_alcoholicas,
    observacion: f.observacion, estado: f.estado,
  });

  const pdfFotos = async () => {
    const urls = photos.map((p) => p.url).filter(Boolean);
    if (!urls.length) {
      toast.error("No hay fotos para exportar.");
      return;
    }
    setFotosPdfBusy(true);
    try {
      await generateFormularioFotosPDF({
        numero: f.numero,
        codigo_actividad: f.codigo_actividad,
        razon_social: f.razon_social,
        imageUrls: urls,
      });
      toast.success("PDF de fotos generado. Puede abrirlo e imprimir desde el visor.");
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "No se pudo generar el PDF de fotos. Compruebe la conexión.",
      );
    } finally {
      setFotosPdfBusy(false);
    }
  };

  const cambiarEstado = async (estado: any) => {
    const { error } = await supabase.from("formularios").update({ estado }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Estado: ${estado}`); setF({ ...f, estado }); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground" asChild>
        <Link to="/formularios">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Volver a formularios
        </Link>
      </Button>

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-muted-foreground font-mono">N° {f.numero} • {f.codigo_actividad}</p>
          <h1 className="font-display text-2xl font-bold">{f.razon_social}</h1>
        </div>
        <Badge variant={f.estado === "activo" ? "default" : f.estado === "baja" ? "secondary" : "destructive"}>{f.estado}</Badge>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={pdf} className="bg-gradient-primary"><FileDown className="h-4 w-4 mr-1" />PDF</Button>
        {role === "admin" && f.estado === "activo" && <>
          <Button variant="outline" onClick={() => cambiarEstado("baja")}>Dar de baja</Button>
          <Button variant="destructive" onClick={() => cambiarEstado("anulado")}><Ban className="h-4 w-4 mr-1" />Anular</Button>
        </>}
      </div>

      <Card className="p-5 grid sm:grid-cols-2 gap-3 text-sm">
        <Info l="Contribuyente" v={`${f.contribuyente.nombre_completo} (${f.contribuyente.ci})`} />
        <Info l="Tipo actividad" v={f.tipo.nombre} />
        <Info l="Zona" v={f.zona} /><Info l="Superficie" v={`${f.superficie} m²`} />
        <Info l="NIT" v={f.nit ?? "—"} /><Info l="Celular" v={f.celular} />
        <Info l="Dirección" v={f.direccion} /><Info l="Referencia" v={f.referencia} />
        <Info l="Procedente" v={f.procedente ? "Sí" : "No"} />
        <Info l="Padrón" v={f.padron ? "Sí" : "No"} />
        <Info l="Bebidas alcohólicas" v={f.bebidas_alcoholicas ? "Sí" : "No"} />
        {f.observacion && <div className="sm:col-span-2"><Info l="Observación" v={f.observacion} /></div>}
      </Card>

      {f.latitud && (
        <Card className="p-3"><MapPicker lat={f.latitud} lng={f.longitud} readOnly /></Card>
      )}

      {photos.length > 0 && (
        <Card className="p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Fotos del formulario</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fotosPdfBusy}
              onClick={() => void pdfFotos()}
            >
              <Printer className="h-4 w-4 mr-1.5" />
              {fotosPdfBusy ? "Generando…" : "PDF para imprimir"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((p, i) => (
              <img key={i} src={p.url} className="rounded-md object-cover h-40 w-full" alt={`Foto ${i + 1}`} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Info({ l, v }: { l: string; v: string }) {
  return <div><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{l}</div><div className="font-medium">{v}</div></div>;
}
