import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/contribuyentes")({ component: ListaContribuyentes });

function ListaContribuyentes() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("contribuyentes").select("*").order("created_at", { ascending: false }).limit(200);
    setList(data ?? []); setLoading(false);
  };
  const filtered = list.filter(c =>
    !q || c.nombre_completo.toLowerCase().includes(q.toLowerCase()) || c.ci.includes(q));

  const resetForm = () => {
    setNombre("");
    setDocumento("");
  };

  const onDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const submitNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombreTrim = nombre.trim();
    const docTrim = documento.trim();
    if (!nombreTrim || !docTrim) {
      toast.error("Completa nombre y documento de identidad");
      return;
    }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("contribuyentes").insert({
      ci: docTrim,
      nombre_completo: nombreTrim,
      telefono: null,
      created_by: u.user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contribuyente registrado");
    resetForm();
    setDialogOpen(false);
    await load();
  };

  return (
    <div className="space-y-4">
      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-2xl font-bold">Contribuyentes</h1>
          <Button
            type="button"
            size="sm"
            className="bg-gradient-primary"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </div>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitNuevo}>
            <DialogHeader>
              <DialogTitle>Nuevo contribuyente</DialogTitle>
              <DialogDescription>
                Ingresa el nombre completo y el documento de identidad (C.I.).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="contrib-nombre">Nombre completo</Label>
                <Input
                  id="contrib-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre y apellidos"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contrib-doc">Documento de identidad</Label>
                <Input
                  id="contrib-doc"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  placeholder="C.I. o documento"
                  autoComplete="off"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onDialogOpenChange(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy} className="bg-gradient-primary">
                {busy ? "Guardando…" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
