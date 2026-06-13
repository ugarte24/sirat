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
import type { TipoTramiteCatalogRow } from "@/lib/sirat-forms";

export type TipoTramiteComboboxProps = {
  tipos: TipoTramiteCatalogRow[];
  value: string;
  onValueChange: (tipoTramiteId: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function TipoTramiteCombobox({
  tipos,
  value,
  onValueChange,
  disabled,
  placeholder = "Seleccionar tipo de trámite…",
}: TipoTramiteComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [cmdKey, setCmdKey] = React.useState(0);

  const selected = tipos.find((t) => t.id === value);

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
          <span className="truncate text-left">{selected ? selected.nombre : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command key={cmdKey} shouldFilter>
          <CommandInput placeholder="Buscar tipo de trámite…" />
          <CommandList>
            <CommandEmpty>No hay resultados.</CommandEmpty>
            <CommandGroup>
              {tipos.map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.nombre}
                  onSelect={() => {
                    onValueChange(t.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4 shrink-0", value === t.id ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate font-medium leading-tight">{t.nombre}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
