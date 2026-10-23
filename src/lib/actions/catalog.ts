"use server";

import { licenseSeatError } from "@/lib/license";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canMutateInventory } from "@/lib/auth/rbac";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "./shared";

async function canEditCatalog() {
  const viewer = await getViewer();
  if (!viewer) return false;
  return canMutateInventory(viewer.role);
}

const nameSchema = z.string().trim().min(2, "En az 2 karakter giriniz.");
const optional = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

function revalidateCatalog() {
  revalidatePath("/personel");
  revalidatePath("/firma-sla");
  revalidatePath("/envanter");
  revalidatePath("/");
}

export async function createPerson(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await canEditCatalog())) return { ok: false, message: "Tanım ekleme yetkiniz yok." };
  const parsed = z
    .object({
      fullName: nameSchema,
      title: optional,
      email: optional,
      phone: optional,
      departmentId: optional,
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  const seatError = await licenseSeatError();
  if (seatError) return { ok: false, message: seatError };

  try {
    const person = await prisma.person.create({ data: parsed.data });
    revalidateCatalog();
    return { ok: true, message: `${person.fullName} eklendi.` };
  } catch {
    return { ok: false, message: "Bu isimde bir kişi zaten kayıtlı." };
  }
}

export async function createDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await canEditCatalog())) return { ok: false, message: "Tanım ekleme yetkiniz yok." };
  const parsed = z
    .object({ name: nameSchema, code: optional })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  try {
    const department = await prisma.department.create({ data: parsed.data });
    revalidateCatalog();
    return { ok: true, message: `${department.name} eklendi.` };
  } catch {
    return { ok: false, message: "Bu birim zaten kayıtlı." };
  }
}

export async function createVendor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await canEditCatalog())) return { ok: false, message: "Tanım ekleme yetkiniz yok." };
  const parsed = z
    .object({ name: nameSchema, contactPerson: optional, phone: optional, email: optional })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }

  try {
    const vendor = await prisma.vendor.create({ data: parsed.data });
    revalidateCatalog();
    return { ok: true, message: `${vendor.name} eklendi.` };
  } catch {
    return { ok: false, message: "Bu firma zaten kayıtlı." };
  }
}

type QuickCreateResult = { ok: boolean; id?: string; label?: string; message?: string };

/** Envanter formundan çıkmadan kişi/birim/firma eklemek için kullanılır. */
export async function quickCreate(
  entity: "person" | "department" | "vendor",
  name: string,
): Promise<QuickCreateResult> {
  if (!(await canEditCatalog())) return { ok: false, message: "Tanım ekleme yetkiniz yok." };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  try {
    if (entity === "person") {
      const seatError = await licenseSeatError();
      if (seatError) return { ok: false, message: seatError };
      const person = await prisma.person.create({ data: { fullName: parsed.data } });
      revalidateCatalog();
      return { ok: true, id: person.id, label: person.fullName };
    }
    if (entity === "department") {
      const department = await prisma.department.create({ data: { name: parsed.data } });
      revalidateCatalog();
      return { ok: true, id: department.id, label: department.name };
    }
    const vendor = await prisma.vendor.create({ data: { name: parsed.data } });
    revalidateCatalog();
    return { ok: true, id: vendor.id, label: vendor.name };
  } catch {
    return { ok: false, message: "Bu kayıt zaten mevcut." };
  }
}

export async function deleteCatalogEntry(formData: FormData) {
  const { canDeleteRecords } = await import("@/lib/auth/rbac");
  const { getViewer } = await import("@/lib/auth/viewer");
  const viewer = await getViewer();
  if (!canDeleteRecords(viewer?.role)) return;

  const entity = String(formData.get("entity") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    if (entity === "person") await prisma.person.delete({ where: { id } });
    if (entity === "department") await prisma.department.delete({ where: { id } });
    if (entity === "vendor") await prisma.vendor.delete({ where: { id } });
    revalidateCatalog();
  } catch {
    // Envanter kaydı bağlı olan tanım silinemez; sayfa mevcut haliyle kalır.
  }
}
