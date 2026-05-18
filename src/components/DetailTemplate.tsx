import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function DetailTemplate({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Card className={cn("overflow-hidden text-sm", className)}>{children}</Card>;
}

export function DetailSection({
  title,
  children,
  showSeparator = true,
}: {
  title: string;
  children: ReactNode;
  showSeparator?: boolean;
}) {
  return (
    <>
      {showSeparator && <Separator />}
      <section className="px-5 py-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {children}
      </section>
    </>
  );
}

export function DetailGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn("flex flex-col gap-3", className)}>{children}</dl>;
}

export function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <dt className="w-[8.5rem] shrink-0 text-xs text-muted-foreground sm:w-36">{label}:</dt>
      <dd className="min-w-0 flex-1 font-medium leading-snug text-foreground">{value}</dd>
    </div>
  );
}

export function DetailBoolean({ value }: { value: boolean | null | undefined }) {
  if (value == null) {
    return <span className="text-muted-foreground italic font-normal">Pendiente</span>;
  }
  return value ? (
    <Badge
      variant="outline"
      className="font-normal border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
    >
      Sí
    </Badge>
  ) : (
    <Badge variant="secondary" className="font-normal">
      No
    </Badge>
  );
}
