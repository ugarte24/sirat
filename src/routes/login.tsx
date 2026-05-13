import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && session) nav({ to: "/" }); }, [session, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido");
        nav({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Inicia sesión.");
        setMode("login");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-primary-foreground">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-gold shadow-gold">
            <Shield className="h-8 w-8 text-gold-foreground" />
          </div>
          <h1 className="font-display text-4xl font-bold">SIRAT</h1>
          <p className="text-sm opacity-90 mt-1">Sistema Integral de Registro y Administración Tributaria</p>
        </div>
        <Card className="p-6 shadow-elegant">
          <div className="flex gap-2 mb-5 p-1 bg-muted rounded-lg">
            <button type="button" onClick={() => setMode("login")} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === "login" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}>Iniciar sesión</button>
            <button type="button" onClick={() => setMode("signup")} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === "signup" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}>Crear cuenta</button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div><Label>Nombre completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
            )}
            <div><Label>Correo electrónico</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
            <div><Label>Contraseña</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
            <Button type="submit" disabled={busy} className="w-full h-11 bg-gradient-primary shadow-elegant">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "login" ? "Ingresar" : "Crear cuenta"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">El primer usuario registrado será administrador.</p>
        </Card>
      </div>
    </div>
  );
}
