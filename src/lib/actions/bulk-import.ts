"use server";

import { revalidatePath } from "next/cache";

import { getInventoryAccess } from "@/lib/auth/inventory";
import { importInventoryWorkbook } from "@/lib/inventory/bulk";
import { fail, saved, type ActionState } from "./shared";

export type BulkImportState = ActionState;

export async function importInventoryExcel(_prev: BulkImportState, formData: FormData): Promise<BulkImportState> {
  const access = await getInventoryAccess();
  if (!access?.canDirectMutate) {
    return { ok: false, message: "Toplu yükleme yalnızca envanter yöneticisine açıktır.", stamp: Date.now() };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Excel dosyası seçin.", stamp: Date.now() };
  }
  if (file.size > 6 * 1024 * 1024) {
    return { ok: false, message: "Dosya 6 MB’dan büyük olamaz.", stamp: Date.now() };
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return { ok: false, message: "Yalnızca .xlsx şablonunu yükleyin.", stamp: Date.now() };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importInventoryWorkbook(buffer);
    revalidatePath("/envanter");
    revalidatePath("/");
    if (!result.created && result.errors.length) {
      return {
        ok: false,
        message: `Hiç kayıt eklenmedi. ${result.errors.length} satırda hata var.`,
        rowErrors: result.errors.slice(0, 50),
        created: 0,
        stamp: Date.now(),
      };
    }
    const extra = result.errors.length ? ` ${result.errors.length} satır atlandı.` : "";
    return {
      ...saved("/envanter", `${result.created} envanter kaydı yüklendi.${extra}`),
      created: result.created,
      rowErrors: result.errors.slice(0, 50),
    };
  } catch (error) {
    return fail(error, "Excel okunamadı. Şablonu indirip yeniden deneyin.");
  }
}
