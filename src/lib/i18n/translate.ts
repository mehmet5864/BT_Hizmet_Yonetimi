import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "./config";
import { DICTIONARIES, TR, type Messages } from "./messages";

export type { Messages };

export function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (vars[key] == null ? `{${key}}` : String(vars[key])));
}

function lookup(messages: Messages, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>) {
  const raw = lookup(DICTIONARIES[locale] ?? TR, key) ?? lookup(TR, key) ?? key;
  return interpolate(raw, vars);
}

export function messagesFor(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? TR;
}

export function localeDir(locale: Locale) {
  return LOCALE_META[locale]?.dir ?? LOCALE_META[DEFAULT_LOCALE].dir;
}
