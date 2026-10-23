"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export type ListFilterSelect = {
  key: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  className?: string;
};

export type ListFilterToggle = {
  key: string;
  value: string;
  label: string;
};

export type ListFiltersProps = {
  searchPlaceholder: string;
  searchAriaLabel?: string;
  searchKey?: string;
  selects?: ListFilterSelect[];
  toggles?: ListFilterToggle[];
};

export function ListFilters(props: ListFiltersProps) {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <ListFiltersInner {...props} />
    </Suspense>
  );
}

function ListFiltersInner({
  searchPlaceholder,
  searchAriaLabel,
  searchKey = "q",
  selects = [],
  toggles = [],
}: ListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const query = searchParams.get(searchKey) ?? "";
  const filterKeys = [searchKey, ...selects.map((item) => item.key), ...toggles.map((item) => item.key)];

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  const activeCount = filterKeys.filter((key) => searchParams.get(key)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          key={`${searchKey}:${query}`}
          initial={query}
          placeholder={searchPlaceholder}
          ariaLabel={searchAriaLabel ?? "Ara"}
          onSubmit={(value) => update(searchKey, value)}
        />

        {selects.map((select) => (
          <Select
            key={select.key}
            value={searchParams.get(select.key) ?? ALL}
            onValueChange={(value) => update(select.key, value)}
          >
            <SelectTrigger className={select.className ?? "w-44"} aria-label={select.label}>
              <SelectValue placeholder={select.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{select.allLabel}</SelectItem>
              {select.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {toggles.map((toggle) => (
          <Button
            key={`${toggle.key}:${toggle.value}`}
            type="button"
            variant={searchParams.get(toggle.key) === toggle.value ? "secondary" : "outline"}
            onClick={() =>
              update(toggle.key, searchParams.get(toggle.key) === toggle.value ? null : toggle.value)
            }
          >
            {toggle.label}
          </Button>
        ))}

        {activeCount ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              for (const key of filterKeys) params.delete(key);
              const next = params.toString();
              startTransition(() => router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false }));
            }}
          >
            <X className="size-4" />
            Filtreleri temizle
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SearchField({
  initial,
  placeholder,
  ariaLabel,
  onSubmit,
}: {
  initial: string;
  placeholder: string;
  ariaLabel: string;
  onSubmit: (value: string) => void;
}) {
  const [term, setTerm] = useState(initial);
  return (
    <form
      className="relative min-w-56 flex-1"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(term);
      }}
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={ariaLabel}
      />
    </form>
  );
}
