import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell } from "lucide-react";

export const Route = createFileRoute("/_app/notificaciones")({ component: Lista });

function Lista() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("notificaciones").select("*, contribuyente:contribuyentes(nombre_completo,ci)").order("codigo", { ascending: false }).limit(200);
    setList(data ?? []);
  })(); }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="font-display text-2xl font-bold">Notificaciones</h1>
        <Link to="/notificaciones/nuevo"><Button size="sm" className="bg-gradient-gold text-gold-foreground"><Plus className="h-4 w-4 mr-1" />Nueva</Button></Link></div>
      <div className="space-y-2">
        {list.map(n => (
          <Link key={n.id} to="/notificaciones/$id" params={{ id: n.id }}>
            <Card className="p-4 flex items-center gap-3 hover:shadow-soft transition-shadow">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${n.tipo === "multa" ? "bg-destructive/10 text-destructive" : n.tipo === "advertencia" ? "bg-warning/20 text-warning" : "bg-primary/10 text-primary"}`}><Bell className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-center flex-wrap"><span className="font-mono text-xs text-muted-foreground">N° {n.codigo}</span>
                  <Badge variant="outline">{n.tipo}</Badge>
                  <Badge variant={n.estado === "cumplido" ? "default" : n.estado === "anulado" ? "destructive" : "secondary"}>{n.estado}</Badge></div>
                <div className="font-medium truncate mt-0.5">{n.nombre_notificado}</div>
                <div className="text-xs text-muted-foreground">Hasta: {n.fecha_limite}</div>
              </div>
            </Card>
          </Link>
        ))}
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Sin notificaciones</p>}
      </div>
    </div>
  );
}
