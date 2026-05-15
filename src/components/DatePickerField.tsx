import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseIsoDateLocal, toIsoDateLocal } from "@/lib/date";
import { cn } from "@/lib/utils";

type DatePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function DatePickerField({
  id,
  value,
  onChange,
  required,
  disabled,
  placeholder = "Seleccione día, mes y año",
  className,
}: DatePickerFieldProps) {
  const selected = value ? parseIsoDateLocal(value) : undefined;
  const label = selected
    ? format(selected, "dd/MM/yyyy", { locale: es })
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-required={required || undefined}
          className={cn(
            "h-9 w-full justify-start px-3 text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          <span className="tabular-nums">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          captionLayout="dropdown"
          fromYear={2020}
          toYear={2036}
          selected={selected}
          onSelect={(d) => onChange(d ? toIsoDateLocal(d) : "")}
          defaultMonth={selected}
        />
      </PopoverContent>
      {required ? <input type="hidden" value={value} required tabIndex={-1} className="sr-only" aria-hidden /> : null}
    </Popover>
  );
}
