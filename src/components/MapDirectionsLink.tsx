import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { googleMapsDirectionsUrl } from "@/lib/mapa-actividades";

interface Props {
  lat?: number | null;
  lng?: number | null;
  className?: string;
}

export function MapDirectionsLink({ lat, lng, className }: Props) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const url = googleMapsDirectionsUrl(lat, lng);
  return (
    <Button
      type="button"
      size="sm"
      className={cn(
        "w-full gap-2 bg-gradient-primary text-primary-foreground shadow-md hover:opacity-95",
        className,
      )}
      asChild
    >
      <a href={url} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        Cómo llegar en Google Maps
      </a>
    </Button>
  );
}
