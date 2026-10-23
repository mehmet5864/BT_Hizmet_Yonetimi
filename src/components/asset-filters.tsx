"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_TYPE_LIST } from "@/lib/inventory/asset-types";
import {
  CRITICALITY_LABELS,
  CRITICALITY_LEVELS,
  LIFECYCLE_STATUSES,
  LIFECYCLE_STATUS_LABELS,
} from "@/lib/inventory/constants";

const ALL = "__all__";

export function AssetFilters({
  departments,
  osOptions = [],
  versionOptions = [],
}: {
  departments: { id: string; label: string }[];
  osOptions?: string[];
  versionOptions?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const query = searchParams.get("q") ?? "";

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  const activeCount = ["tur", "kritiklik", "durum", "birim", "isletim", "surum", "bitis", "zafiyet", "q"].filter((key) =>
    searchParams.get(key),
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          key={query}
          initial={query}
          onSubmit={(value) => update("q", value)}
        />

        <Select
          value={searchParams.get("tur") ?? ALL}
          onValueChange={(value) => update("tur", value)}
        >
          <SelectTrigger className="w-44" aria-label="Envanter türü">
            <SelectValue placeholder="Tür" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm türler</SelectItem>
            {ASSET_TYPE_LIST.map((type) => (
              <SelectItem key={type.key} value={type.slug}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("kritiklik") ?? ALL}
          onValueChange={(value) => update("kritiklik", value)}
        >
          <SelectTrigger className="w-40" aria-label="Kritiklik">
            <SelectValue placeholder="Kritiklik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm kritiklikler</SelectItem>
            {CRITICALITY_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {CRITICALITY_LABELS[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("durum") ?? ALL}
          onValueChange={(value) => update("durum", value)}
        >
          <SelectTrigger className="w-40" aria-label="Durum">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm durumlar</SelectItem>
            {LIFECYCLE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {LIFECYCLE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("birim") ?? ALL}
          onValueChange={(value) => update("birim", value)}
        >
          <SelectTrigger className="w-48" aria-label="Birim">
            <SelectValue placeholder="Birim" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm birimler</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {osOptions.length ? (
          <Select
            value={searchParams.get("isletim") ?? ALL}
            onValueChange={(value) => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("surum"); // işletim sistemi değişince sürüm seçimi sıfırlanır
              if (value === ALL) params.delete("isletim");
              else params.set("isletim", value);
              startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
            }}
          >
            <SelectTrigger className="w-52" aria-label="İşletim sistemi">
              <SelectValue placeholder="İşletim sistemi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm işletim sistemleri</SelectItem>
              {osOptions.map((os) => (
                <SelectItem key={os} value={os}>
                  {os}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {versionOptions.length ? (
          <Select
            value={searchParams.get("surum") ?? ALL}
            onValueChange={(value) => update("surum", value)}
          >
            <SelectTrigger className="w-40" aria-label="Sürüm">
              <SelectValue placeholder="Sürüm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm sürümler</SelectItem>
              {versionOptions.map((version) => (
                <SelectItem key={version} value={version}>
                  {version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Button
          type="button"
          variant={searchParams.get("bitis") === "yaklasan" ? "secondary" : "outline"}
          onClick={() =>
            update("bitis", searchParams.get("bitis") === "yaklasan" ? null : "yaklasan")
          }
        >
          Süresi yaklaşanlar
        </Button>

        <Button
          type="button"
          variant={searchParams.get("zafiyet") === "acik" ? "secondary" : "outline"}
          onClick={() =>
            update("zafiyet", searchParams.get("zafiyet") === "acik" ? null : "acik")
          }
        >
          Açık zafiyeti olanlar
        </Button>

        {activeCount ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
          >
            <X className="size-4" />
            Filtreleri temizle
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SearchField({ initial, onSubmit }: { initial: string; onSubmit: (value: string) => void }) {
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
        placeholder="Ad, stok no, IP, MAC, sahip veya birim ara…"
        className="pl-9"
        aria-label="Envanter ara"
      />
    </form>
  );
}
