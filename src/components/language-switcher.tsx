"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { FlagMark } from "@/components/flag-mark";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, LOCALE_COOKIE, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/components/i18n-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = LOCALE_META[locale];

  function select(next: string) {
    if (!next || next === locale) return;
    const code = next as Locale;
    start(async () => {
      document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      document.documentElement.lang = code;
      document.documentElement.dir = LOCALE_META[code].dir;
      await setLocale(code);
      router.refresh();
    });
  }

  return (
    <Select value={locale} onValueChange={select} disabled={pending}>
      <SelectTrigger
        size="sm"
        aria-label={t("language")}
        className={cn("h-8 min-w-[9.75rem] gap-2 bg-background shadow-sm", className)}
      >
        <FlagMark code={locale} />
        <span className="max-w-28 truncate">{current.nativeName}</span>
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="min-w-[12rem]">
        {LOCALES.map((code) => {
          const meta = LOCALE_META[code];
          return (
            <SelectItem key={code} value={code} className="gap-2">
              <FlagMark code={code} className="h-5 w-8" />
              <span>{meta.nativeName}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
