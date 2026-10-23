"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { getViewer } from "@/lib/auth/viewer";
import {
  ESCALATION_KIND_LABELS,
  type EscalationKind,
} from "@/lib/itil/constants";
import { nextEscalationStatus } from "@/lib/itil/escalation";
import { canProcessRequest, canViewRequest } from "@/lib/itil/request-scope";
import { REQUEST_OFFICES, type RequestOffice } from "@/lib/itil/request-types";
import { prisma } from "@/lib/prisma";
import { fail, saved, type ActionState } from "./shared";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

async function actorCanView(request: { requesterId: string; office: string; originalOffice?: string | null; escalatedOffice?: string | null }) {
  const viewer = await getViewer();
  const session = await getSession();
  if (!viewer || !session) return { user: null, allowed: false };
  return {
    user: { ...viewer, fullName: session.fullName, adUsername: session.adUsername },
    allowed: canViewRequest(viewer, request),
  };
}

export async function escalateRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const kind = text(formData, "kind") as EscalationKind | null;
  const reason = text(formData, "reason");
  if (!id || !kind || !reason) return { ok: false, message: "Yükseltme türü ve gerekçe zorunludur." };
  if (kind !== "MISROUTED" && kind !== "UPPER_UNIT" && kind !== "LAYER2") {
    return { ok: false, message: "Geçersiz yükseltme türü." };
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: { requestingDept: true },
  });
  if (!request) return { ok: false, message: "Talep bulunamadı." };

  const { user, allowed } = await actorCanView(request);
  if (!user || !allowed) return { ok: false, message: "Bu talep için yetkiniz yok." };
  if ((kind === "MISROUTED" || kind === "LAYER2") && !canProcessRequest(user, request)) {
    return { ok: false, message: "Aktarımı yalnızca ilgili birimin yetkilisi yapabilir." };
  }
  if (kind === "LAYER2" && request.office !== "SERVIS") {
    return { ok: false, message: "Katman 2 aktarımı yalnızca servis masası kuyruğundaki talepler için geçerlidir." };
  }

  const targetOffice = text(formData, "targetOffice") as RequestOffice | null;
  const escalatedDeptId = text(formData, "escalatedDeptId");

  try {
    if (kind === "MISROUTED" || kind === "LAYER2") {
      if (!targetOffice || !(REQUEST_OFFICES as readonly string[]).includes(targetOffice)) {
        return { ok: false, message: "Hedef şubeyi seçin." };
      }
      if (kind === "LAYER2" && targetOffice === "SERVIS") {
        return { ok: false, message: "Katman 2 hedefi uzman birim olmalıdır." };
      }
      if (targetOffice === request.office) {
        return { ok: false, message: "Talep zaten bu şubede." };
      }
      await prisma.serviceRequest.update({
        where: { id },
        data: {
          originalOffice: request.originalOffice ?? request.office,
          office: targetOffice,
          escalatedOffice: targetOffice,
          escalationKind: kind,
          escalationStatus: nextEscalationStatus(kind),
          escalationReason: reason,
          escalatedAt: new Date(),
          escalatedById: user.id,
          status: request.status === "DONE" ? request.status : "OPEN",
        },
      });
      await prisma.activityLog.create({
        data: {
          entityType: "ServiceRequest",
          entityId: id,
          action: "ESCALATE",
          actor: user.adUsername ?? user.fullName,
          note:
            kind === "LAYER2"
              ? `Katman 2: ${request.office} → ${targetOffice}. ${reason}`
              : `Yanlış birim: ${request.office} → ${targetOffice}. ${reason}`,
        },
      });
    } else {
      const parentId =
        escalatedDeptId ??
        request.requestingDept?.parentId ??
        request.requestingDeptId;
      await prisma.serviceRequest.update({
        where: { id },
        data: {
          escalationKind: kind,
          escalationStatus: nextEscalationStatus(kind),
          escalatedDeptId: parentId,
          escalationReason: reason,
          escalatedAt: new Date(),
          escalatedById: user.id,
          status: request.status === "DONE" || request.status === "REJECTED" ? request.status : "WAITING",
        },
      });
      await prisma.activityLog.create({
        data: {
          entityType: "ServiceRequest",
          entityId: id,
          action: "ESCALATE",
          actor: user.adUsername ?? user.fullName,
          note: `Üst birime yükseltildi. ${reason}`,
        },
      });
    }
    revalidatePath("/talepler");
    revalidatePath(`/talepler/${id}`);
    revalidatePath("/", "layout");
    return saved(`/talepler/${id}`, `${ESCALATION_KIND_LABELS[kind]} işlemi yapıldı.`);
  } catch (error) {
    return fail(error);
  }
}

export async function resolveEscalation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const decision = text(formData, "decision");
  const note = text(formData, "note");
  if (!id || (decision !== "ACCEPTED" && decision !== "REJECTED")) {
    return { ok: false, message: "Karar seçilmedi." };
  }

  const request = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!request) return { ok: false, message: "Talep bulunamadı." };
  const { user, allowed } = await actorCanView(request);
  if (!user || !allowed) return { ok: false, message: "Bu talep için yetkiniz yok." };
  if (!canProcessRequest(user, request)) {
    return { ok: false, message: "Yükseltmeyi yalnızca ilgili birimin yetkilisi sonuçlandırabilir." };
  }

  try {
    await prisma.serviceRequest.update({
      where: { id },
      data: {
        escalationStatus: decision,
        status: decision === "ACCEPTED" ? "IN_PROGRESS" : request.status,
        escalationReason: note ? `${request.escalationReason ?? ""}\nKarar: ${note}`.trim() : request.escalationReason,
      },
    });
    await prisma.activityLog.create({
      data: {
        entityType: "ServiceRequest",
        entityId: id,
        action: decision === "ACCEPTED" ? "ESCALATION_ACCEPT" : "ESCALATION_REJECT",
        actor: user.adUsername ?? user.fullName,
        note: note ?? (decision === "ACCEPTED" ? "Üst birim talebi devraldı." : "Yükseltme reddedildi."),
      },
    });
    revalidatePath("/talepler");
    revalidatePath(`/talepler/${id}`);
    revalidatePath("/", "layout");
    return saved(`/talepler/${id}`, decision === "ACCEPTED" ? "Üst birim talebi aldı." : "Yükseltme reddedildi.");
  } catch (error) {
    return fail(error);
  }
}
