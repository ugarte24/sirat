import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, User } from "lucide-react";

export const Route = createFileRoute("/_app/contribuyentes")({ component: ListaContribuyentes });

function ListaContribuyentes() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("contribuyentes").select("*").order("created_at", { ascending: false }).limit(200);
    setList(data ?? []); setLoading(false);
  };
  const filtered = list.filter(c =>
    !q || c.nombre_completo.toLowerCase().includes(q.toLowerCase()) || c.ci.includes(q));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Contribuyentes</h1>
        <Link to="/contribuyentes/nuevo"><Button size="sm" className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" />Nuevo</Button></Link>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o C.I." className="pl-9" />
      </div>
      <div className="space-y-2">
        {loading && <p className="text-center text-sm text-muted-foreground py-8">Cargando…</p>}
        {!loading && filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Sin contribuyentes</p>}
        {filtered.map(c => (
          <Link key={c.id} to="/contribuyentes/$id" params={{ id: c.id }}>
            <Card className="p-4 flex items-center gap-3 hover:shadow-soft transition-shadow">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.nombre_completo}</div>
                <div className="text-xs text-muted-foreground">C.I. {c.ci} {c.telefono && `• ${c.telefono}`}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
