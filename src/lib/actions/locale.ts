"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { LOCALE_COOKIE, parseLocale } from "@/lib/i18n/config";

export async function setLocale(locale: string) {
  const value = parseLocale(locale);
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
