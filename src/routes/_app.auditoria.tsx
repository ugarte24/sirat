import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/auditoria")({ component: Auditoria });

type AuditRow = Database["public"]["Tables"]["auditoria"]["Row"];

function Auditoria() {
  const { role } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== "admin") return;
    void (async () => {
      const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) toast.error(error.message);
      else setRows(data ?? []);
      setLoading(false);
    })();
  }, [role]);

  if (role !== "admin") {
    return <p className="text-center py-8 text-muted-foreground">Solo administradores.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Auditoría</h1>
      <p className="text-sm text-muted-foreground max-w-2xl">
        Registro de accesos y acciones administrativas recientes (inicio de sesión, creación de usuarios,
        restablecimiento de contraseña, etc.).
      </p>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No hay registros aún.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead className="hidden md:table-cell">Usuario</TableHead>
                <TableHead className="hidden lg:table-cell max-w-[240px]">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{r.accion}</TableCell>
                  <TableCell className="text-xs">{r.entidad}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs font-mono truncate max-w-[120px]">
                    {r.user_id ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[280px] truncate">
                    {r.detalle ? JSON.stringify(r.detalle) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
