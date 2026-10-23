import { revalidatePath } from "next/cache";

import { applyInventoryDecision } from "@/lib/actions/inventory-approval";
import { applyProblemAssignmentDecision } from "@/lib/actions/itil";
import type { ApprovalDecision, ApprovalKind } from "@/lib/approval-token";
import { personCanApproveInventory } from "@/lib/auth/inventory";
import { officesManagedBy } from "@/lib/itil/office-officers";
import { isRequestOffice } from "@/lib/itil/request-scope";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings-store";
import { assignRequestToUnit } from "@/lib/workflow/assign";
import { decideWorkflowFor, type WorkflowDecision } from "@/lib/workflow/engine";
import { mailDecisionToRequester } from "@/lib/workflow/notify";

export type ApprovalActor = {
  id: string;
  role?: string | null;
};

function stay(message: string) {
  return { ok: true as const, message };
}

function deny(message: string) {
  return { ok: false as const, message };
}

async function refresh() {
  revalidatePath("/");
  revalidatePath("/envanter/onaylar");
  revalidatePath("/degisiklik");
  revalidatePath("/yama");
  revalidatePath("/talepler");
  revalidatePath("/problem");
}

async function canApproveRequest(actor: ApprovalActor, row: { requestingManagerId: string | null; handlingManagerId: string | null; office: string }) {
  if (actor.role === "SUPER_ADMIN") return true;
  if (row.requestingManagerId === actor.id || row.handlingManagerId === actor.id) return true;
  if (!isRequestOffice(row.office)) return false;
  const offices = await officesManagedBy(actor.id);
  return offices.includes(row.office);
}

export async function applyRecordApproval(input: {
  kind: ApprovalKind;
  id: string;
  decision: ApprovalDecision;
  actor: ApprovalActor;
  /** Reddetme gerekçesi (hızlı menüde zorunlu). */
  reason?: string | null;
}) {
  const { kind, id, actor } = input;
  let decision = input.decision;

  // Etkin bir onay zinciri (iş akışı) varsa karar önce zincire işlenir.
  let wf: Extract<WorkflowDecision, { ok: true; state: "APPROVED" | "REJECTED" }> | null = null;
  if (kind === "request" || kind === "change" || kind === "patch") {
    const step = await decideWorkflowFor(kind, id, actor, decision, input.reason);
    if (step) {
      if (!step.ok) return deny(step.message);
      if (step.state === "RUNNING") {
        await refresh();
        return stay(step.message);
      }
      wf = step;
      decision = step.state;
    }
  }
  const viaWorkflow = wf !== null;
  const approved = decision === "APPROVED";
  const reason = !approved ? input.reason?.trim() || (viaWorkflow ? "Onay zincirinde reddedildi." : null) : null;
  const reasonLine = reason ? `Reddetme gerekçesi: ${reason}` : null;
  const withReason = (description: string | null) =>
    reasonLine ? [description, reasonLine].filter(Boolean).join("\n\n") : description;

  if (kind === "inventory") {
    const settings = await getSystemSettings();
    const person = await prisma.person.findUnique({
      where: { id: actor.id },
      select: { id: true, role: true, requestOffice: true, adGroups: true },
    });
    if (!person || !personCanApproveInventory(settings.acl.grants, person)) {
      return deny("Envanter onayını yalnızca modül yöneticisi veya süper yönetici verebilir.");
    }
    const result = await applyInventoryDecision({ id, decision, reviewerId: actor.id, note: reason });
    if (!result.ok) return deny(result.message ?? "Envanter onayı işlenemedi.");
    await refresh();
    return stay(result.message ?? "Envanter isteği sonuçlandı.");
  }

  if (kind === "problem") {
    const result = await applyProblemAssignmentDecision({
      id,
      decision,
      actorId: actor.id,
      actorRole: actor.role,
      note: reason,
    });
    if (!result.ok) return deny(result.message ?? "Problem ataması işlenemedi.");
    await refresh();
    return stay(result.message ?? "Problem ataması sonuçlandı.");
  }

  if (kind === "change") {
    const row = await prisma.changeRecord.findUnique({
      where: { id },
      include: { approvalUnits: { select: { managerId: true } } },
    });
    if (!row) return deny("Değişiklik bulunamadı.");
    if (row.status !== "PENDING") {
      await wf?.undo();
      return deny("Bu kayıt zaten sonuçlandırılmış.");
    }
    const allowed =
      viaWorkflow ||
      actor.role === "SUPER_ADMIN" ||
      row.requestingManagerId === actor.id ||
      row.infosecManagerId === actor.id ||
      row.approvalUnits.some((unit) => unit.managerId === actor.id);
    if (!allowed) return deny("Bu değişikliği onaylama yetkiniz yok.");
    const strict = row.changeType === "EMERGENCY" || row.risk === "HIGH" || row.risk === "CRITICAL";
    if (approved && strict && !row.cabNote?.trim()) {
      await wf?.undo();
      return deny("Yüksek riskli veya acil değişiklik için önce CAB notu girilmelidir (değişikliği düzenleyin).");
    }
    if (approved && row.changeType !== "STANDARD" && !row.rollbackPlan?.trim()) {
      await wf?.undo();
      return deny("Geri dönüş planı girilmeden değişiklik onaylanamaz (değişikliği düzenleyin).");
    }
    await prisma.changeRecord.update({
      where: { id },
      data: approved
        ? { status: "IN_PROGRESS", approvalDate: new Date() }
        : { status: "REJECTED", description: withReason(row.description) },
    });
    await prisma.activityLog.create({
      data: {
        entityType: "ChangeRecord",
        entityId: id,
        action: approved ? "APPROVE" : "REJECT",
        note: `${row.changeNo} ${approved ? "onaylandı; işlem açıkta devam ediyor." : "reddedildi."}${reasonLine ? " " + reasonLine : ""}`,
      },
    });
    await mailDecisionToRequester({ entity: "change", entityId: id, approved, reason }).catch(() => null);
    revalidatePath(`/degisiklik/${id}`);
    await refresh();
    return stay(approved ? `${row.changeNo} onaylandı. İşlem açıkta devam ediyor.` : `${row.changeNo} reddedildi.`);
  }

  if (kind === "patch") {
    const row = await prisma.patchRecord.findUnique({ where: { id } });
    if (!row) return deny("Yama bulunamadı.");
    if (row.status !== "PENDING") return deny("Bu kayıt zaten sonuçlandırılmış.");
    if (!viaWorkflow && actor.role !== "SUPER_ADMIN" && row.requestingManagerId !== actor.id) {
      return deny("Bu yamayı onaylama yetkiniz yok.");
    }
    await prisma.patchRecord.update({
      where: { id },
      data: approved ? { status: "IN_PROGRESS", approvalDate: new Date() } : { status: "REJECTED", description: withReason(row.description) },
    });
    await prisma.activityLog.create({
      data: {
        entityType: "PatchRecord",
        entityId: id,
        action: approved ? "APPROVE" : "REJECT",
        note: `${row.patchNo} ${approved ? "onaylandı; işlem açıkta devam ediyor." : "reddedildi."}${reasonLine ? " " + reasonLine : ""}`,
      },
    });
    await mailDecisionToRequester({ entity: "patch", entityId: id, approved, reason }).catch(() => null);
    revalidatePath(`/yama/${id}`);
    await refresh();
    return stay(approved ? `${row.patchNo} onaylandı. İşlem açıkta devam ediyor.` : `${row.patchNo} reddedildi.`);
  }

  const row = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!row) return deny("Talep bulunamadı.");
  if (row.status !== "WAITING") return deny("Bu talep onay beklemiyor.");
  if (!viaWorkflow && !(await canApproveRequest(actor, row))) return deny("Bu talebi onaylama yetkiniz yok.");
  await prisma.serviceRequest.update({
    where: { id },
    data: approved ? { status: "IN_PROGRESS" } : { status: "REJECTED", description: withReason(row.description) },
  });
  await prisma.activityLog.create({
    data: {
      entityType: "ServiceRequest",
      entityId: id,
      action: approved ? "APPROVE" : "REJECT",
      note: `${row.requestNo} ${approved ? "onaylandı; işlem açıkta devam ediyor." : "reddedildi."}${reasonLine ? " " + reasonLine : ""}`,
    },
  });
  let assigned: { assigneeName: string | null } = { assigneeName: null };
  if (approved) assigned = await assignRequestToUnit(id).catch(() => ({ assigneeId: null, assigneeName: null }));
  await mailDecisionToRequester({
    entity: "request",
    entityId: id,
    approved,
    reason,
    extra: assigned.assigneeName ? `Gerçekleştirecek birimde ${assigned.assigneeName} kişisine atandı.` : null,
  }).catch(() => null);
  revalidatePath(`/talepler/${id}`);
  await refresh();
  return stay(
    approved
      ? `${row.requestNo} onaylandı${assigned.assigneeName ? `; ${assigned.assigneeName} kişisine atandı` : ""}. İşlem açıkta devam ediyor.`
      : `${row.requestNo} reddedildi.`,
  );
}
