import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/_app/perfil")({ component: Perfil });

function Perfil() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = user?.email;
    if (!email) {
      toast.error("No se encontró el correo de la sesión.");
      return;
    }
    if (next.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (next !== confirm) {
      toast.error("La confirmación no coincide.");
      return;
    }
    setBusy(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signErr) {
        toast.error("La contraseña actual no es correcta.");
        return;
      }
      const { error: upErr } = await supabase.auth.updateUser({ password: next });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      toast.success("Contraseña actualizada.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="font-display text-2xl font-bold">Mi cuenta</h1>
      <p className="text-sm text-muted-foreground">
        El restablecimiento por olvido lo gestiona un administrador desde Usuarios. Aquí puede cambiar su
        contraseña si conoce la actual.
      </p>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lock className="h-4 w-4 text-primary" aria-hidden />
          Cambiar contraseña
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="pf-current">Contraseña actual</Label>
            <Input
              id="pf-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label htmlFor="pf-new">Nueva contraseña</Label>
            <Input
              id="pf-new"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="pf-confirm">Confirmar nueva contraseña</Label>
            <Input
              id="pf-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar contraseña"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
