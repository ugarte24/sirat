import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { MapPicker } from "@/components/MapPicker";

export const Route = createFileRoute("/_app/mapa")({ component: Mapa });

function Mapa() {
  const [markers, setMarkers] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("formularios").select("latitud,longitud,razon_social,numero").not("latitud", "is", null).eq("estado", "activo").limit(500);
    setMarkers((data ?? []).map((f: any) => ({ lat: Number(f.latitud), lng: Number(f.longitud), popup: `N° ${f.numero} — ${f.razon_social}` })));
  })(); }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Mapa de actividades</h1>
      <Card className="p-2"><div className="h-[60vh]"><MapPicker readOnly markers={markers} height="100%" /></div></Card>
      <p className="text-xs text-muted-foreground">{markers.length} actividades registradas con ubicación.</p>
    </div>
  );
}
