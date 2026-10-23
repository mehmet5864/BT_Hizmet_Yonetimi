"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

export type AssetOption = { id: string; label: string; meta?: string };

export function AssetRefSelect({
  name,
  options,
  defaultValue = [],
  placeholder,
  unit = "sunucu",
  searchPlaceholder = "Sunucu ara…",
  emptyText = "Kayıtlı sunucu bulunamadı. Önce sunucu envanteri ekleyin.",
}: {
  unit?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  name: string;
  options: AssetOption[];
  defaultValue?: string[];
  placeholder: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [open, setOpen] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  return (
    <div className="flex flex-col gap-2">
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className={cn(!selected.length && "text-muted-foreground")}>
              {selected.length ? `${selected.length} ${unit} seçildi` : placeholder}
            </span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty className="py-4 text-center text-sm">
                {emptyText}
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem key={option.id} value={option.label} onSelect={() => toggle(option.id)}>
                    <Check className={cn("size-4", selected.includes(option.id) ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1">{option.label}</span>
                    {option.meta ? <span className="text-muted-foreground text-xs">{option.meta}</span> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const option = options.find((item) => item.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                {option?.label ?? id}
                <button
                  type="button"
                  aria-label={`${option?.label ?? id} bağlantısını kaldır`}
                  onClick={() => toggle(id)}
                  className="hover:bg-background/60 rounded-sm p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
