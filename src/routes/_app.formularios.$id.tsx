import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ban, FileDown, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { MapPicker } from "@/components/MapPicker";
import { generateFormularioPDF, generateFormularioFotosPDF } from "@/lib/pdf";
import { useAuth } from "@/lib/auth";
import { FORMULARIO_VERIFICACION_NOMBRE, FORMULARIO_VERIFICACION_SECCION } from "@/lib/sirat-brand";
import { formatDateEsBo } from "@/lib/date";
import {
  DetailBoolean,
  DetailField,
  DetailGrid,
  DetailSection,
  DetailTemplate,
} from "@/components/DetailTemplate";

export const Route = createFileRoute("/_app/formularios/$id")({ component: Detalle });

function Detalle() {
  const { id } = Route.useParams();
  const { role } = useAuth();
  const [f, setF] = useState<any>(null);
  const [photos, setPhotos] = useState<{ url: string }[]>([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [fotosPdfBusy, setFotosPdfBusy] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("formularios").select(
      "*, contribuyente:contribuyentes(nombre_completo,ci)"
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
            Volver a {FORMULARIO_VERIFICACION_SECCION.toLowerCase()}
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  const pdf = async () => {
    setPdfBusy(true);
    try {
      await generateFormularioPDF({
        fecha: f.fecha,
        razon_social: f.razon_social,
        contribuyente_nombre: f.contribuyente.nombre_completo,
        contribuyente_ci: f.contribuyente.ci,
        nit: f.nit,
        zona: f.zona,
        superficie: f.superficie,
        direccion: f.direccion,
        celular: f.celular,
        referencia: f.referencia,
        latitud: f.latitud,
        longitud: f.longitud,
        procedente: f.procedente,
        padron: f.padron,
        bebidas_alcoholicas: f.bebidas_alcoholicas,
        observacion: f.observacion,
        estado: f.estado,
        imageUrls: photos.map((p) => p.url).filter(Boolean),
      });
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "No se pudo generar el PDF. Compruebe la conexión.",
      );
    } finally {
      setPdfBusy(false);
    }
  };

  const pdfFotos = async () => {
    const urls = photos.map((p) => p.url).filter(Boolean);
    if (!urls.length) {
      toast.error("No hay fotos para exportar.");
      return;
    }
    setFotosPdfBusy(true);
    try {
      await generateFormularioFotosPDF({
        razon_social: f.razon_social,
        imageUrls: urls,
      });
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
          Volver a {FORMULARIO_VERIFICACION_SECCION.toLowerCase()}
        </Link>
      </Button>

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">{f.razon_social}</h1>
        </div>
        <Badge
          variant={
            f.estado === "activo"
              ? "default"
              : f.estado === "pendiente_verificacion"
                ? "outline"
                : f.estado === "baja"
                  ? "secondary"
                  : "destructive"
          }
        >
          {f.estado === "pendiente_verificacion" ? "Pendiente verificación" : f.estado}
        </Badge>
      </div>

      <div className="flex gap-2 flex-wrap">
        {f.estado === "activo" && f.superficie != null && (
          <Button
            type="button"
            disabled={pdfBusy}
            onClick={() => void pdf()}
            className="bg-gradient-primary"
          >
            <FileDown className="h-4 w-4 mr-1" />
            {pdfBusy ? "Generando…" : "PDF"}
          </Button>
        )}
        {f.estado === "pendiente_verificacion" && (
          <Button variant="default" className="bg-gradient-primary" asChild>
            <Link to="/formularios" search={{ verificar: id }}>
              <Pencil className="h-4 w-4 mr-1" />
              Completar verificación
            </Link>
          </Button>
        )}
        {(f.estado === "activo" || f.estado === "pendiente_verificacion") && (
          <Button variant="outline" asChild>
            <Link to="/formularios" search={{ editar: id }}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Link>
          </Button>
        )}
        {role === "admin" && f.estado === "activo" && <>
          <Button variant="outline" onClick={() => cambiarEstado("baja")}>Dar de baja</Button>
          <Button variant="destructive" onClick={() => cambiarEstado("anulado")}><Ban className="h-4 w-4 mr-1" />Anular</Button>
        </>}
      </div>

      <DetailTemplate>
        <DetailSection title="Registro" showSeparator={false}>
          <DetailGrid>
            <DetailField label="Fecha" value={formatDateEsBo(f.fecha)} />
            <DetailField
              label="Contribuyente"
              value={`${f.contribuyente.nombre_completo} (${f.contribuyente.ci})`}
            />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Actividad económica">
          <DetailGrid>
            <DetailField label="Razón social" value={f.razon_social} />
            <DetailField label="Zona" value={f.zona} />
            <DetailField
              label="Superficie"
              value={
                f.superficie != null ? (
                  `${f.superficie} m²`
                ) : (
                  <span className="font-normal italic text-muted-foreground">
                    Pendiente de verificación
                  </span>
                )
              }
            />
            <DetailField label="NIT" value={f.nit?.trim() || "—"} />
            <DetailField label="Celular" value={f.celular || "—"} />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Ubicación">
          <DetailGrid>
            <DetailField label="Dirección" value={f.direccion} />
            <DetailField label="Referencia" value={f.referencia || "—"} />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Verificación">
          <DetailGrid>
            <DetailField label="Procedente" value={<DetailBoolean value={f.procedente} />} />
            <DetailField label="Padrón" value={<DetailBoolean value={f.padron} />} />
            <DetailField
              label="Bebidas alcohólicas"
              value={<DetailBoolean value={f.bebidas_alcoholicas} />}
            />
            {f.observacion ? (
              <DetailField label="Observación" value={f.observacion} />
            ) : null}
          </DetailGrid>
        </DetailSection>
      </DetailTemplate>

      {f.latitud && (
        <Card className="p-3">
          <MapPicker lat={f.latitud} lng={f.longitud} mapZoom={f.mapa_zoom} readOnly />
        </Card>
      )}

      {photos.length > 0 && (
        <Card className="p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Fotos de la verificación</p>
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
