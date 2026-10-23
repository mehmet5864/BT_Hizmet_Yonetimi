"use server";

import { revalidatePath } from "next/cache";

import { requireModule } from "@/lib/auth/viewer";
import { normalizePolicy, saveSecurityPolicy } from "@/lib/security/policy";
import { saved, type ActionState } from "./shared";

export async function saveSecurity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  if (access.viewer.role !== "SUPER_ADMIN") return { ok: false, message: "Güvenlik politikasını yalnızca süper yönetici değiştirebilir." };

  const policy = normalizePolicy({
    minLength: formData.get("minLength"),
    requireMix: formData.get("requireMix") === "on",
    maxFailed: formData.get("maxFailed"),
    lockMinutes: formData.get("lockMinutes"),
    sessionHours: formData.get("sessionHours"),
  });
  await saveSecurityPolicy(policy);
  revalidatePath("/ayarlar/guvenlik");
  return saved(undefined, "Güvenlik politikası kaydedildi. Yeni girişlerde geçerli olur.");
}
