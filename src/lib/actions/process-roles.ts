"use server";

import { revalidatePath } from "next/cache";

import { canManagePerson } from "@/lib/auth/rbac";
import { canSeeRecord } from "@/lib/auth/data-scope";
import { requireModule } from "@/lib/auth/viewer";
import { PROCESS_ROLE_LABELS, isProcessRole, parseProcessRoles, serializeProcessRoles } from "@/lib/itil/process-roles";
import { prisma } from "@/lib/prisma";
import { saved, type ActionState } from "./shared";

/** Kişiye ITIL süreç görevlerini elle atar (AD grubundan gelenler ayrıca hesaplanır, burada saklanmaz). */
export async function savePersonProcessRoles(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/personel");
  if (access.error) return access.error;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Personel belirtilmedi." };
  if (!(await canSeeRecord("person", id))) return { ok: false, message: "Bu personele erişim yetkiniz yok." };

  const person = await prisma.person.findUnique({ where: { id }, select: { role: true, processRoles: true, fullName: true } });
  if (!person) return { ok: false, message: "Personel bulunamadı." };
  if (id !== access.viewer.id && !canManagePerson(access.viewer.role, person.role)) {
    return { ok: false, message: "Bu personelin görevlerini düzenleme yetkiniz yok." };
  }

  const requested = formData.getAll("processRole").map((value) => String(value)).filter(isProcessRole);
  const next = serializeProcessRoles(requested);
  await prisma.person.update({ where: { id }, data: { processRoles: next } });

  const before = parseProcessRoles(person.processRoles).map((role) => PROCESS_ROLE_LABELS[role]).join(", ") || "yok";
  const after = parseProcessRoles(next).map((role) => PROCESS_ROLE_LABELS[role]).join(", ") || "yok";
  await prisma.activityLog.create({
    data: { entityType: "person", entityId: id, action: "PROCESS_ROLES", note: `Süreç görevleri: ${before} → ${after}` },
  });
  revalidatePath(`/personel/${id}`);
  revalidatePath(`/personel/${id}/duzenle`);
  return saved(undefined, "Süreç görevleri kaydedildi.");
}
