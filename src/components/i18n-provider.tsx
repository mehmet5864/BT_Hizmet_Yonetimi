"use client";

import { createContext, useContext } from "react";

import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { messagesFor, translate, type Messages } from "@/lib/i18n/translate";

type I18nContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  messages: Messages;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  dir: "ltr",
  messages: messagesFor(DEFAULT_LOCALE),
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
});

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const messages = messagesFor(locale);
  const value: I18nContextValue = {
    locale,
    dir: LOCALE_META[locale].dir,
    messages,
    t: (key, vars) => translate(locale, key, vars),
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useI18n().t;
}
