"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useT } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";

export function HeaderSearch() {
  const router = useRouter();
  const t = useT();
  const [query, setQuery] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/envanter?q=${encodeURIComponent(value)}` : "/envanter");
  }

  return (
    <form onSubmit={onSubmit} className="relative hidden min-w-0 md:block">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("header.search")}
        className="bg-muted/70 h-9 w-56 rounded-full border-transparent ps-9 lg:w-72"
        aria-label={t("header.searchAria")}
      />
    </form>
  );
}
