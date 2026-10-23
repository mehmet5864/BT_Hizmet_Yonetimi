export const LOCALES = ["tr", "en", "ar", "es", "az"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_COOKIE = "bt_lang";

export const LOCALE_META: Record<
  Locale,
  { name: string; nativeName: string; dir: "ltr" | "rtl"; flag: string; country: string }
> = {
  tr: { name: "Turkish", nativeName: "Türkçe", dir: "ltr", flag: "/flags/tr.svg", country: "Türkiye" },
  en: { name: "English", nativeName: "English", dir: "ltr", flag: "/flags/gb.svg", country: "United Kingdom" },
  ar: { name: "Arabic", nativeName: "العربية", dir: "rtl", flag: "/flags/sa.svg", country: "السعودية" },
  es: { name: "Spanish", nativeName: "Español", dir: "ltr", flag: "/flags/es.svg", country: "España" },
  az: { name: "Azerbaijani", nativeName: "Azərbaycan", dir: "ltr", flag: "/flags/az.svg", country: "Azərbaycan" },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && (LOCALES as readonly string[]).includes(value));
}

export function parseLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
