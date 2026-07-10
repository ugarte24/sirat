import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Bloquea la zona de fotos mientras se optimiza la imagen en el dispositivo
 * (compresión local; no usa internet).
 */
export function PhotoCompressBusy({ active, className, children }: Props) {
  return (
    <div className={cn("relative", className)} aria-busy={active || undefined}>
      {children}
      {active ? (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/80 px-4 text-center backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium text-foreground">Optimizando foto en el dispositivo…</p>
          <p className="text-xs text-muted-foreground max-w-[16rem]">
            No usa internet; puede tardar unos segundos.
          </p>
        </div>
      ) : null}
    </div>
  );
}
