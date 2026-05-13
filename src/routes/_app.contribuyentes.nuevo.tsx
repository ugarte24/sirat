import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/contribuyentes/nuevo")({ component: Nuevo });

function Nuevo() {
  const nav = useNavigate();
  const [ci, setCi] = useState(""); const [nombre, setNombre] = useState(""); const [tel, setTel] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("contribuyentes").insert({ ci, nombre_completo: nombre, telefono: tel || null, created_by: u.user?.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contribuyente registrado"); nav({ to: "/contribuyentes" });
  };
  return (
    <div className="space-y-4 max-w-xl">
      <Button variant="ghost" size="sm" onClick={() => nav({ to: "/contribuyentes" })}><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>
      <h1 className="font-display text-2xl font-bold">Nuevo contribuyente</h1>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div><Label>C.I. *</Label><Input value={ci} onChange={(e) => setCi(e.target.value)} required /></div>
          <div><Label>Nombre completo *</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
          <div><Label>Teléfono</Label><Input value={tel} onChange={(e) => setTel(e.target.value)} /></div>
          <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">Registrar</Button>
        </form>
      </Card>
    </div>
  );
}
