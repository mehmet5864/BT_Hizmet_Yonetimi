"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { quickCreate } from "@/lib/actions/catalog";
import { cn } from "@/lib/utils";

export type RefOption = {
  id: string;
  label: string;
  meta?: string;
  managerId?: string | null;
  departmentId?: string | null;
  unitManagerId?: string | null;
  parentDepartmentId?: string | null;
  parentManagerId?: string | null;
  parentId?: string | null;
  requestOffice?: string | null;
};

export function ReferenceSelect({
  name,
  entity,
  options,
  defaultValue,
  value: controlledValue,
  onValueChange,
  placeholder,
  emptyLabel,
  allowCreate = true,
}: {
  name: string;
  entity: "person" | "department" | "vendor";
  options: RefOption[];
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (id: string) => void;
  placeholder: string;
  emptyLabel: string;
  allowCreate?: boolean;
}) {
  const [items, setItems] = useState(options);
  useEffect(() => {
    setItems((prev) => {
      const known = new Set(options.map((item) => item.id));
      const extras = prev.filter((item) => item.id && !known.has(item.id));
      return extras.length ? [...options, ...extras] : options;
    });
  }, [options]);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolled;
  const setValue = (next: string) => {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
  };
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = items.find((item) => item.id === value);
  const canCreate =
    allowCreate &&
    query.trim().length >= 2 &&
    !items.some((item) => item.label.toLowerCase() === query.trim().toLowerCase());

  const handleCreate = () => {
    const label = query.trim();
    startTransition(async () => {
      const result = await quickCreate(entity, label);
      if (!result.ok || !result.id) {
        toast.error(result.message ?? "Kayıt eklenemedi.");
        return;
      }
      setItems((prev) => [...prev, { id: result.id!, label: result.label! }]);
      setValue(result.id);
      setQuery("");
      setOpen(false);
      toast.success(`${result.label} eklendi.`);
    });
  };

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn(!selected && "text-muted-foreground")}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter>
            <CommandInput placeholder={allowCreate ? "Ara veya yeni ekle…" : "Ara…"} value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty className="py-4 text-center text-sm">{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {value ? (
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      setValue("");
                      setOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    Seçimi temizle
                  </CommandItem>
                ) : null}
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.label}
                    onSelect={() => {
                      setValue(item.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("size-4", value === item.id ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1">{item.label}</span>
                    {item.meta ? <span className="text-muted-foreground text-xs">{item.meta}</span> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            {canCreate ? (
              <div className="border-t p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  disabled={pending}
                  onClick={handleCreate}
                >
                  <Plus className="size-4" />
                  &quot;{query.trim()}&quot; olarak ekle
                </Button>
              </div>
            ) : null}
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
