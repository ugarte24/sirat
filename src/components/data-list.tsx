import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const LIST_PAGE_SIZE = 20;

/** Orden de listas: último registrado primero. */
export const ORDER_CREATED_DESC = { ascending: false } as const;

/** Patrón seguro para ilike: sin % _ \ que rompan el filtro */
export function ilikePattern(raw: string): string | null {
  const t = raw.trim().slice(0, 80).replace(/[%_\\,]/g, "");
  if (!t) return null;
  return `%${t}%`;
}

export function DataListCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-card p-0 shadow-sm",
        className,
      )}
    >
      {children}
    </Card>
  );
}

export function DataListTableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function DataListTheadRow({ children }: { children: React.ReactNode }) {
  return (
    <TableHeader>
      <TableRow className="border-b border-border/80 hover:bg-transparent">
        {children}
      </TableRow>
    </TableHeader>
  );
}

export function DataListTh({
  children,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <TableHead
      className={cn(
        "h-11 bg-muted/40 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

export function DataListTd({
  children,
  className,
  align = "left",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  colSpan?: number;
}) {
  return (
    <TableCell
      colSpan={colSpan}
      className={cn(
        "border-b border-border/60 px-4 py-3.5 align-middle text-sm",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

export function DataListTable({ children }: { children: React.ReactNode }) {
  return <Table className="min-w-[640px]">{children}</Table>;
}

export function DataListTbody({ children }: { children: React.ReactNode }) {
  return <TableBody className="[&_tr:last-child_td]:border-b-0">{children}</TableBody>;
}

export function TablePaginationFooter({
  page,
  pageSize,
  total,
  loading,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number | null;
  loading?: boolean;
  onPageChange: (nextPage: number) => void;
}) {
  const totalSafe = total ?? 0;
  const pages = Math.max(1, Math.ceil(totalSafe / pageSize));
  const from = totalSafe === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalSafe);

  return (
    <div className="flex flex-col gap-3 border-t border-border/80 bg-muted/25 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {totalSafe === 0
          ? "Sin registros"
          : `Mostrando ${from}–${to} de ${totalSafe}${loading ? "…" : ""}`}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <span className="min-w-[8rem] text-center text-foreground tabular-nums">
          Página {page + 1} / {pages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page >= pages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

export function pillSuccess(className?: string) {
  return cn(
    "inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300",
    className,
  );
}

export function pillWarning(className?: string) {
  return cn(
    "inline-flex items-center rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-200",
    className,
  );
}

export function pillMuted(className?: string) {
  return cn(
    "inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
    className,
  );
}
