import { approvalMailUrls } from "@/lib/approval-token";
import { sendMail } from "@/lib/integrations/mail";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings-store";
import { ENTITY_LABELS, type WorkflowEntity } from "@/lib/workflow/graph";

export type RecordInfo = { no: string; title: string; requesterId: string | null; href: string };

export async function describeRecord(entity: WorkflowEntity, id: string): Promise<RecordInfo | null> {
  if (entity === "request") {
    const r = await prisma.serviceRequest.findUnique({ where: { id }, select: { requestNo: true, requestType: true, requesterId: true } });
    return r ? { no: r.requestNo, title: r.requestType, requesterId: r.requesterId, href: `/talepler/${id}` } : null;
  }
  if (entity === "change") {
    const r = await prisma.changeRecord.findUnique({ where: { id }, select: { changeNo: true, description: true, requesterId: true } });
    return r ? { no: r.changeNo, title: (r.description ?? "").slice(0, 90), requesterId: r.requesterId, href: `/degisiklik/${id}` } : null;
  }
  const r = await prisma.patchRecord.findUnique({ where: { id }, select: { patchNo: true, title: true, requesterId: true } });
  return r ? { no: r.patchNo, title: r.title, requesterId: r.requesterId, href: `/yama/${id}` } : null;
}

async function mailSettings() {
  const settings = await getSystemSettings();
  if (!settings.mail.enabled || !settings.approval.notifyMail) return null;
  return settings;
}

async function logMailError(error: unknown) {
  await prisma.activityLog
    .create({
      data: {
        entityType: "SystemConfig",
        entityId: "default",
        action: "MAIL_ERROR",
        note: error instanceof Error ? error.message : "E-posta gönderimi başarısız",
      },
    })
    .catch(() => null);
}

/** Sırası gelen onaycılara Onayla/Reddet bağlantılı e-posta gönderir. Onaycı yoksa süper yöneticilere gider. */
export async function mailStepApprovers(input: {
  entity: WorkflowEntity;
  entityId: string;
  stepLabel: string;
  approverIds: string[];
}) {
  const settings = await mailSettings();
  if (!settings) return;
  const info = await describeRecord(input.entity, input.entityId);
  if (!info) return;

  let ids = input.approverIds;
  let fallback = false;
  if (!ids.length) {
    const supers = await prisma.person.findMany({ where: { role: "SUPER_ADMIN" }, select: { id: true }, take: 5 });
    ids = supers.map((p) => p.id);
    fallback = true;
  }
  const people = await prisma.person.findMany({
    where: { id: { in: [...ids, ...(info.requesterId ? [info.requesterId] : [])] } },
    select: { id: true, fullName: true, email: true },
  });
  const requester = people.find((p) => p.id === info.requesterId);
  for (const person of people.filter((p) => ids.includes(p.id) && p.email)) {
    const links = approvalMailUrls({ kind: input.entity, id: input.entityId, personId: person.id });
    const lines = [
      `${info.no} kaydı onayınızı bekliyor (adım: ${input.stepLabel}).`,
      `Tür: ${ENTITY_LABELS[input.entity]} · ${info.title}`,
      requester ? `Talep eden: ${requester.fullName}` : "",
      fallback ? "Not: Bu adım için onaycı tanımlı olmadığından süper yöneticilere gönderildi." : "",
      "",
      `Onayla: ${links.approveUrl}`,
      `Reddet: ${links.rejectUrl}`,
      `Kaydı aç: ${links.viewUrl}`,
      "",
      "BT Hizmet Yönetimi",
    ];
    const html = `<p><strong>${info.no}</strong> kaydı onayınızı bekliyor (adım: ${input.stepLabel}).</p>
<p>${ENTITY_LABELS[input.entity]} · ${info.title}${requester ? `<br/>Talep eden: ${requester.fullName}` : ""}</p>
<p><a href="${links.approveUrl}">Onayla</a> · <a href="${links.rejectUrl}">Reddet</a> · <a href="${links.viewUrl}">Kaydı incele</a></p>`;
    try {
      await sendMail(settings.mail, {
        to: [person.email!],
        subject: `[Onay] ${info.no} ${input.stepLabel}`,
        text: lines.join("\n"),
        html,
      });
    } catch (error) {
      await logMailError(error);
    }
  }
}

/** Talep edene sonuç bildirimi (onay/red). */
export async function mailDecisionToRequester(input: {
  entity: WorkflowEntity;
  entityId: string;
  approved: boolean;
  reason?: string | null;
  extra?: string | null;
}) {
  const settings = await mailSettings();
  if (!settings) return;
  const info = await describeRecord(input.entity, input.entityId);
  if (!info?.requesterId) return;
  const requester = await prisma.person.findUnique({ where: { id: info.requesterId }, select: { email: true, fullName: true } });
  if (!requester?.email) return;
  const lines = [
    `${info.no} kaydınız ${input.approved ? "onaylandı" : "reddedildi"}.`,
    `Tür: ${ENTITY_LABELS[input.entity]} · ${info.title}`,
    !input.approved && input.reason ? `Gerekçe: ${input.reason}` : "",
    input.extra ?? "",
    "",
    "BT Hizmet Yönetimi",
  ].filter(Boolean);
  try {
    await sendMail(settings.mail, {
      to: [requester.email],
      subject: `[${input.approved ? "Onaylandı" : "Reddedildi"}] ${info.no}`,
      text: lines.join("\n"),
    });
  } catch (error) {
    await logMailError(error);
  }
}

/** Gerçekleştirecek birimdeki kişiye ve birim amirine atama bildirimi. */
export async function mailAssignment(input: {
  requestId: string;
  assigneeId: string;
  managerId?: string | null;
}) {
  const settings = await mailSettings();
  if (!settings) return;
  const info = await describeRecord("request", input.requestId);
  if (!info) return;
  const people = await prisma.person.findMany({
    where: { id: { in: [input.assigneeId, ...(input.managerId ? [input.managerId] : [])] } },
    select: { id: true, fullName: true, email: true },
  });
  const assignee = people.find((p) => p.id === input.assigneeId);
  const to = people.map((p) => p.email).filter((e): e is string => Boolean(e));
  if (!to.length) return;
  try {
    await sendMail(settings.mail, {
      to,
      subject: `[Atama] ${info.no} ${assignee?.fullName ?? ""}`.trim(),
      text: [
        `${info.no} talebi onaylandı ve ${assignee?.fullName ?? "-"} kişisine atandı.`,
        `Tür: ${info.title}`,
        "",
        "BT Hizmet Yönetimi",
      ].join("\n"),
    });
  } catch (error) {
    await logMailError(error);
  }
}
