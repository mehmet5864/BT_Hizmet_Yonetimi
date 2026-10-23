"use server";

import { applyRecordApproval } from "@/lib/actions/apply-approval";
import { fail, type ActionState } from "@/lib/actions/shared";
import type { ApprovalDecision, ApprovalKind } from "@/lib/approval-token";
import { getViewerAcl } from "@/lib/auth/viewer";
import { isInboxApproveKind } from "@/lib/inbox";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export async function approveInboxItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { viewer } = await getViewerAcl();
  if (!viewer) return { ok: false, message: "Oturum gerekli." };

  const id = text(formData, "id");
  const kind = text(formData, "kind") as ApprovalKind | null;
  const decision = (text(formData, "decision") ?? "APPROVED") as ApprovalDecision;
  if (!id || !kind || !isInboxApproveKind(kind)) return { ok: false, message: "Onay kaydı seçilmedi." };
  if (decision !== "APPROVED" && decision !== "REJECTED") return { ok: false, message: "Karar geçersiz." };

  const reason = text(formData, "reason");
  if (decision === "REJECTED" && !reason) return { ok: false, message: "Reddetme gerekçesi zorunludur." };

  try {
    return await applyRecordApproval({
      kind,
      id,
      decision,
      reason,
      actor: { id: viewer.id, role: viewer.role },
    });
  } catch (error) {
    return fail(error, "Onay işlenemedi.");
  }
}
