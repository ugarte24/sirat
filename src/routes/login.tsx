import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SiratLoginBrand } from "@/components/SiratLoginBrand";
import { SIRAT_APP_VERSION } from "@/lib/sirat-brand";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { checkLoginAllowedFn, recordLoginOutcomeFn } from "@/functions/login-security";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && session) nav({ to: "/" });
  }, [session, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const em = email.trim();
    try {
      let pre: Awaited<ReturnType<typeof checkLoginAllowedFn>>;
      try {
        pre = await checkLoginAllowedFn({ data: { email: em } });
      } catch {
        pre = { allowed: true as const };
      }
      if (!pre.allowed) {
        const msg =
          pre.code === "inactive"
            ? "Su cuenta está desactivada. Contacte al administrador."
            : pre.code === "blocked"
              ? "Su cuenta está bloqueada. Contacte al administrador."
              : "Demasiados intentos fallidos. Espere o solicite al administrador que reinicie el contador de intentos.";
        toast.error(msg);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: em, password });
      if (error) {
        try {
          await recordLoginOutcomeFn({ data: { email: em, success: false } });
        } catch {
          /* sin service role o fallo de red: el login no debe bloquearse */
        }
        toast.error("Usuario o contraseña incorrectos.");
        return;
      }

      try {
        await recordLoginOutcomeFn({ data: { email: em, success: true } });
      } catch {
        /* igual: sesión ya válida */
      }
      toast.success("Bienvenido");
      nav({ to: "/" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-4 py-10">
      <div className="mb-8 w-full max-w-lg px-2">
        <SiratLoginBrand />
      </div>

      <Card className="w-full max-w-lg border border-slate-200/80 bg-white p-8 shadow-[0_8px_30px_-12px_rgba(0,45,86,0.12)]">
        <h2 className="text-center text-xl font-bold text-primary">Iniciar sesión</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Ingrese sus credenciales para acceder al sistema
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-sm font-medium text-foreground">
              Usuario
            </Label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="Ingrese su correo"
                className="h-11 border-slate-200 bg-white pl-10 pr-3 shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Contraseña
            </Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
                placeholder="Ingrese su contraseña"
                className="h-11 border-slate-200 bg-white pl-10 pr-11 shadow-sm placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="mt-2 h-12 w-full gap-2 bg-gradient-primary text-base font-semibold text-primary-foreground shadow-md hover:opacity-95"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
            Iniciar sesión
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Si olvidó su contraseña, contáctese con el administrador.
        </p>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/80 tabular-nums">
          Versión {SIRAT_APP_VERSION}
        </p>
      </Card>
    </div>
  );
}
