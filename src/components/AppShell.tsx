import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Bell,
  Map as MapIcon,
  FileBarChart,
  UserCog,
  LogOut,
  Menu,
  Shield,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, roles: ["admin", "operador"] },
  { to: "/contribuyentes", label: "Contribuyentes", icon: Users, roles: ["admin", "operador"] },
  { to: "/formularios", label: "Formularios", icon: ClipboardList, roles: ["admin", "operador"] },
  { to: "/notificaciones", label: "Notificaciones", icon: Bell, roles: ["admin", "operador"] },
  { to: "/mapa", label: "Mapa", icon: MapIcon, roles: ["admin", "operador"] },
  { to: "/reportes", label: "Reportes", icon: FileBarChart, roles: ["admin"] },
  { to: "/usuarios", label: "Usuarios", icon: UserCog, roles: ["admin"] },
] as const;

const MOBILE_NAV = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/contribuyentes", label: "Contrib.", icon: Users },
  { to: "/formularios", label: "Formul.", icon: ClipboardList },
  { to: "/notificaciones", label: "Notif.", icon: Bell },
  { to: "/mapa", label: "Mapa", icon: MapIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, role, signOut } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const visible = NAV.filter((n) => role && n.roles.includes(role));

  const SidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
          <Shield className="h-6 w-6 text-gold-foreground" />
        </div>
        <div>
          <div className="font-display text-xl font-bold leading-none">SIRAT</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70 mt-1">
            Sistema Tributario
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visible.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-gold"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div>
          <div className="text-sm font-medium truncate">{profile?.full_name}</div>
          <div className="text-xs text-sidebar-foreground/70 truncate">{profile?.email}</div>
          <div className="mt-1 inline-block rounded-full bg-sidebar-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-primary">
            {role}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={async () => { await signOut(); nav({ to: "/login" }); }}
        >
          <LogOut className="h-4 w-4 mr-2" /> Salir
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 backdrop-blur px-4 h-14">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">{SidebarContent}</SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-gold">
            <Shield className="h-4 w-4 text-gold-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-primary">SIRAT</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col">{SidebarContent}</aside>

      {/* Main */}
      <main className="lg:pl-64 pb-20 lg:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-card safe-bottom">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
