import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urls: string[];
  index: number;
  onIndexChange: (index: number) => void;
  title?: string;
};

/** Visor a pantalla casi completa para fotos del detalle. */
export function PhotoLightboxDialog({
  open,
  onOpenChange,
  urls,
  index,
  onIndexChange,
  title = "Foto",
}: Props) {
  const safeIndex = urls.length ? Math.min(Math.max(0, index), urls.length - 1) : 0;
  const url = urls[safeIndex];
  const hasMany = urls.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-3 overflow-hidden p-3 sm:p-4">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>
            {title} {urls.length ? `${safeIndex + 1} de ${urls.length}` : ""}
          </DialogTitle>
          <DialogDescription className="sr-only">Vista ampliada de la fotografía</DialogDescription>
        </DialogHeader>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-neutral-950/95">
          {url ? (
            <img
              src={url}
              alt={`${title} ${safeIndex + 1}`}
              className="max-h-[min(75dvh,720px)] w-full object-contain"
            />
          ) : null}

          {hasMany ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 shadow-md"
                disabled={safeIndex <= 0}
                onClick={() => onIndexChange(safeIndex - 1)}
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 shadow-md"
                disabled={safeIndex >= urls.length - 1}
                onClick={() => onIndexChange(safeIndex + 1)}
                aria-label="Foto siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
