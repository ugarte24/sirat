import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SIRAT_REPORT_COLORS } from "@/lib/sirat-brand";
import { cn } from "@/lib/utils";

const BRAND_GREEN = SIRAT_REPORT_COLORS.green.hex;

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
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: BRAND_GREEN }}
            aria-hidden
          />
          <span className="flex-1">{title}</span>
          <span
            className="h-px flex-1 max-w-[4rem] sm:max-w-[6rem]"
            style={{ backgroundColor: BRAND_GREEN }}
            aria-hidden
          />
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
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/40",
        className,
      )}
    >
      <dt className="w-[8.5rem] shrink-0 text-xs font-medium text-muted-foreground sm:w-40">{label}:</dt>
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
      className="font-normal border-[#2D7A31]/45 bg-[#2D7A31]/12 text-[#1e5621] dark:text-[#7cb87f]"
    >
      Sí
    </Badge>
  ) : (
    <Badge variant="secondary" className="font-normal">
      No
    </Badge>
  );
}
