import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ContribuyenteCatalogRow } from "@/lib/sirat-forms";

export type ContribuyenteComboboxProps = {
  contribs: ContribuyenteCatalogRow[];
  value: string;
  onValueChange: (contribuyenteId: string) => void;
  disabled?: boolean;
  /** Texto del botón cuando no hay selección */
  placeholder?: string;
};

export function ContribuyenteCombobox({
  contribs,
  value,
  onValueChange,
  disabled,
  placeholder = "Buscar y seleccionar contribuyente…",
}: ContribuyenteComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [cmdKey, setCmdKey] = React.useState(0);

  const selected = contribs.find((c) => c.id === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setCmdKey((k) => k + 1);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal shadow-sm ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">
            {selected ? selected.nombre_completo : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command key={cmdKey} shouldFilter>
          <CommandInput placeholder="Buscar por nombre o C.I…" />
          <CommandList>
            <CommandEmpty>No hay resultados.</CommandEmpty>
            <CommandGroup>
              {contribs.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.nombre_completo} ${c.ci}`}
                  onSelect={() => {
                    onValueChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4 shrink-0", value === c.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5 text-left">
                    <span className="truncate font-medium leading-tight">{c.nombre_completo}</span>
                    <span className="truncate text-xs text-muted-foreground">C.I. {c.ci}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
