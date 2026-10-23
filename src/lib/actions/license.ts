"use server";

import { revalidatePath } from "next/cache";

import { requireModule } from "@/lib/auth/viewer";
import { saveLicenseText } from "@/lib/license";
import { saved, type ActionState } from "./shared";

export async function saveLicense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  if (access.viewer.role !== "SUPER_ADMIN") return { ok: false, message: "Lisansı yalnızca süper yönetici yükleyebilir." };

  let text = String(formData.get("license") ?? "").trim();
  const file = formData.get("file");
  if (!text && file instanceof File && file.size > 0) {
    if (file.size > 20_000) return { ok: false, message: "Lisans dosyası çok büyük." };
    text = (await file.text()).trim();
  }
  if (!text) return { ok: false, message: "Lisans anahtarını yapıştırın veya dosyayı seçin." };

  const result = await saveLicenseText(text);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/lisans");
  revalidatePath("/");
  return saved(undefined, `Lisans yüklendi: ${result.payload.customer} · ${result.payload.maxUsers.toLocaleString("tr-TR")} kullanıcı.`);
}
