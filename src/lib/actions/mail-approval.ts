"use server";

import { applyRecordApproval } from "@/lib/actions/apply-approval";
import type { ApprovalDecision } from "@/lib/approval-token";
import { readApprovalToken } from "@/lib/approval-token";
import { prisma } from "@/lib/prisma";

export async function decideByMailToken(token: string, decision: ApprovalDecision) {
  const payload = readApprovalToken(token);
  if (!payload) return { ok: false, message: "Onay bağlantısı geçersiz veya süresi dolmuş." };
  const person = await prisma.person.findUnique({
    where: { id: payload.personId },
    select: { id: true, role: true, fullName: true },
  });
  if (!person) return { ok: false, message: "Onaycı personel bulunamadı." };
  return applyRecordApproval({
    kind: payload.kind,
    id: payload.id,
    decision,
    actor: { id: person.id, role: person.role },
  });
}
