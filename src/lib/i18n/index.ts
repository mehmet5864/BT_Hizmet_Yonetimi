import { cookies } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_META, parseLocale, type Locale } from "./config";
import { messagesFor, translate } from "./translate";

export type { Locale } from "./config";
export type { Messages } from "./messages";
export { LOCALES, LOCALE_META, LOCALE_COOKIE, DEFAULT_LOCALE, parseLocale, isLocale } from "./config";
export { translate, messagesFor, interpolate, localeDir } from "./translate";

export async function getLocale(): Promise<Locale> {
  try {
    const jar = await cookies();
    return parseLocale(jar.get(LOCALE_COOKIE)?.value);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function getTranslator() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);
  return { locale, dir: LOCALE_META[locale].dir, messages, t };
}
