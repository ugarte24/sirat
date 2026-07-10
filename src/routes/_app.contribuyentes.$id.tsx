import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DetailField,
  DetailGrid,
  DetailSection,
  DetailTemplate,
} from "@/components/DetailTemplate";
import { pillMuted, pillSuccess } from "@/components/data-list";
import { FORMULARIO_VERIFICACION_SECCION } from "@/lib/sirat-brand";
import { formatDateEsBo } from "@/lib/date";
import type { Database } from "@/integrations/supabase/types";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { contribListSearchFromStorage } from "@/lib/contribuyente-list-search";

type FormularioEstado = Database["public"]["Enums"]["formulario_estado"];

export const Route = createFileRoute("/_app/contribuyentes/$id")({ component: Detalle });

function FormEstadoPill({ estado }: { estado: FormularioEstado }) {
  if (estado === "activo") return <span className={pillSuccess()}>Verificado</span>;
  if (estado === "pendiente_verificacion") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
        Pendiente verificación
      </span>
    );
  }
  if (estado === "baja") return <span className={pillMuted()}>Baja</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-destructive/15 px-3 py-0.5 text-xs font-medium text-destructive">
      Anulado
    </span>
  );
}

function Detalle() {
  const { id } = Route.useParams();
  const [c, setC] = useState<{
    ci: string;
    nombre_completo: string;
    telefono: string | null;
    created_at: string;
  } | null>(null);
  const [forms, setForms] = useState<
    { id: string; razon_social: string; estado: FormularioEstado }[]
  >([]);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("contribuyentes")
        .select("ci,nombre_completo,telefono,created_at")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      setC(data);
      const [{ data: f }, { count }] = await Promise.all([
        supabase
          .from("formularios")
          .select("id,razon_social,estado")
          .eq("contribuyente_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("notificaciones")
          .select("id", { count: "exact", head: true })
          .eq("contribuyente_id", id),
      ]);
      if (cancelled) return;
      setForms((f ?? []) as typeof forms);
      setNotifCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!c) {
    return (
      <div className="space-y-4 max-w-2xl">
        <BackLink />
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <BackLink />

      <h1 className="font-display text-2xl font-bold">{c.nombre_completo}</h1>

      <DetailTemplate>
        <DetailSection title="Datos del contribuyente" showSeparator={false}>
          <DetailGrid>
            <DetailField label="C.I." value={c.ci} />
            <DetailField label="Nombre completo" value={c.nombre_completo} />
            <DetailField label="Celular" value={c.telefono?.trim() || "—"} />
            <DetailField label="Fecha de registro" value={formatDateEsBo(c.created_at)} />
          </DetailGrid>
        </DetailSection>

        <DetailSection title={`${FORMULARIO_VERIFICACION_SECCION} (${forms.length})`}>
          {forms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningún formulario vinculado.</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-md border border-border/60">
              {forms.map((f) => (
                <li key={f.id}>
                  <Link
                    to="/formularios/$id"
                    params={{ id: f.id }}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1 font-medium leading-snug">{f.razon_social}</span>
                    <FormEstadoPill estado={f.estado} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection title="Notificaciones">
          <p className="text-sm text-foreground">
            Notificaciones vinculadas:{" "}
            <span className="font-semibold tabular-nums">{notifCount}</span>
          </p>
        </DetailSection>
      </DetailTemplate>
    </div>
  );
}

function BackLink() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      asChild
    >
      <Link to="/contribuyentes" search={contribListSearchFromStorage()}>
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Volver a contribuyentes
      </Link>
    </Button>
  );
}
