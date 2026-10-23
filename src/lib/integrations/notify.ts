import { approvalMailUrls, type ApprovalKind } from "@/lib/approval-token";
import { prisma } from "@/lib/prisma";
import { sendSiemEvent } from "@/lib/integrations/cef";
import { sendMail } from "@/lib/integrations/mail";
import { getSystemSettings } from "@/lib/settings-store";
import { getInstance } from "@/lib/workflow/engine";

export type IntegrationEvent = {
  kind: ApprovalKind;
  recordId: string;
  ticketNo: string;
  title: string;
  status: string;
  requesterId?: string | null;
  managerIds?: Array<string | null | undefined>;
  office?: string;
};

async function sendApprovalMails(event: IntegrationEvent) {
  const settings = await getSystemSettings();
  if (!settings.mail.enabled || !settings.approval.notifyMail) return;
  const waiting = event.status === "WAITING" || event.status === "PENDING";
  if (!waiting) return;
  // Onay zinciri (iş akışı) varsa e-postayı zincir adım adım gönderir; herkese birden gitmesin.
  if (event.kind === "request" || event.kind === "change" || event.kind === "patch") {
    const instance = await getInstance(event.kind, event.recordId).catch(() => null);
    if (instance && instance.status === "RUNNING") return;
  }

  const managers = [...new Set((event.managerIds ?? []).filter((id): id is string => Boolean(id)))];
  if (!managers.length) return;

  const people = await prisma.person.findMany({
    where: { id: { in: [...managers, event.requesterId].filter((id): id is string => Boolean(id)) } },
    select: { id: true, fullName: true, email: true },
  });
  const approvers = people.filter((person) => managers.includes(person.id) && person.email);
  if (!approvers.length) return;

  const requester = people.find((person) => person.id === event.requesterId);
  for (const approver of approvers) {
    if (!approver.email) continue;
    const links = approvalMailUrls({ kind: event.kind, id: event.recordId, personId: approver.id });
    const text = [
      `${event.ticketNo} kaydı onayınızı bekliyor.`,
      `Tür: ${event.title}`,
      requester ? `Talep eden: ${requester.fullName}` : "",
      settings.approval.slaHours ? `Onay süresi: ${settings.approval.slaHours} saat.` : "",
      "",
      `Onayla: ${links.approveUrl}`,
      `Reddet: ${links.rejectUrl}`,
      `Kaydı aç: ${links.viewUrl}`,
      "",
      "BT Hizmet Yönetimi",
    ]
      .filter(Boolean)
      .join("\n");
    const html = `<p><strong>${event.ticketNo}</strong> kaydı onayınızı bekliyor.</p>
<p>Tür: ${event.title}${requester ? `<br/>Talep eden: ${requester.fullName}` : ""}</p>
<p><a href="${links.approveUrl}">Onayla — işlem açıkta devam eder</a></p>
<p><a href="${links.rejectUrl}">Reddet</a></p>
<p><a href="${links.viewUrl}">Kaydı incele</a></p>`;
    try {
      await sendMail(settings.mail, {
        to: [approver.email],
        subject: `[Onay] ${event.ticketNo} ${event.title}`,
        text,
        html,
      });
    } catch (error) {
      await prisma.activityLog.create({
        data: {
          entityType: "SystemConfig",
          entityId: "default",
          action: "MAIL_ERROR",
          note: error instanceof Error ? error.message : "E-posta gönderimi başarısız",
        },
      });
    }
  }
}

export async function notifyIntegrations(event: IntegrationEvent) {
  try {
    await notifyIntegrationsUnsafe(event);
  } catch (error) {
    console.warn("[entegrasyon]", error instanceof Error ? error.message : error);
  }
}

async function notifyIntegrationsUnsafe(event: IntegrationEvent) {
  const settings = await getSystemSettings();

  try {
    await sendSiemEvent(settings.siem, {
      signatureId: `${event.kind.toUpperCase()}_CREATE`,
      name: `${event.title} oluşturuldu`,
      severity: event.status === "WAITING" || event.status === "PENDING" ? 5 : 3,
      extensions: {
        msg: `${event.ticketNo} ${event.title}`,
        cs1: event.ticketNo,
        cs1Label: "Ticket",
        cs2: event.status,
        cs2Label: "Status",
        cs3: event.office ?? event.kind,
        cs3Label: "Office",
        act: "created",
      },
    });
  } catch (error) {
    await prisma.activityLog.create({
      data: {
        entityType: "SystemConfig",
        entityId: "default",
        action: "SIEM_ERROR",
        note: error instanceof Error ? error.message : "SIEM gönderimi başarısız",
      },
    });
  }

  await sendApprovalMails(event);
}

export async function notifySlaOpened(input: {
  ticketNo: string;
  title: string;
  vendorName: string;
  productName: string;
  slaName: string;
  slaWindow: string;
  dueAt: Date;
  description?: string | null;
  requesterName?: string | null;
  managerName?: string | null;
  recipients: string[];
}) {
  const recipients = [...new Set(input.recipients.filter(Boolean))];
  const settings = await getSystemSettings();
  const text = [
    `${input.ticketNo} arıza bildirimi açıldı. SLA süresi bu bildirimle başlamıştır.`,
    `Firma: ${input.vendorName}`,
    `Ürün: ${input.productName}`,
    `SLA: ${input.slaName} (${input.slaWindow})`,
    `Çözüm sonu: ${input.dueAt.toLocaleString("tr-TR")}`,
    input.requesterName ? `Bildiren: ${input.requesterName}` : "",
    input.managerName ? `Birim amiri: ${input.managerName}` : "",
    input.description ? `Açıklama: ${input.description}` : "",
    "",
    "BT Hizmet Yönetimi",
  ]
    .filter(Boolean)
    .join("\n");

  if (!recipients.length) {
    return { sent: false, note: "Bildirim adresi yok." };
  }

  if (!settings.mail.enabled) {
    await prisma.activityLog.create({
      data: {
        entityType: "SlaTicket",
        entityId: input.ticketNo,
        action: "MAIL_SKIPPED",
        note: `SMTP kapalı. SLA başladı. Adresler: ${recipients.join(", ")}`,
      },
    });
    return {
      sent: false,
      note: `SMTP kapalı; bildirim kuyruğa yazıldı (${recipients.length} adres). SLA süresi başladı.`,
    };
  }

  try {
    await sendMail(settings.mail, {
      to: recipients,
      subject: `[SLA] ${input.ticketNo} ${input.productName} — ${input.slaName}`,
      text,
    });
    return { sent: true, note: `Bildirim ${recipients.length} adrese gönderildi. SLA süresi başladı.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "E-posta gönderimi başarısız";
    await prisma.activityLog.create({
      data: {
        entityType: "SlaTicket",
        entityId: input.ticketNo,
        action: "MAIL_ERROR",
        note: message,
      },
    });
    return { sent: false, note: `SLA başladı. E-posta gönderilemedi: ${message}` };
  }
}

export async function notifyProblemAssignment(input: {
  ticketNo: string;
  title: string;
  kind: "propose" | "approve" | "reject";
  assigneeName: string;
  infosecName?: string | null;
  note?: string | null;
  recipients: string[];
  recordId?: string;
  approverIds?: Array<string | null | undefined>;
  requesterId?: string | null;
}) {
  const recipients = [...new Set(input.recipients.filter(Boolean))];
  const settings = await getSystemSettings();
  const subject =
    input.kind === "propose"
      ? `[Problem] ${input.ticketNo} atama onayı`
      : input.kind === "approve"
        ? `[Problem] ${input.ticketNo} görev atandı`
        : `[Problem] ${input.ticketNo} atama reddedildi`;
  const text = [
    input.kind === "propose"
      ? `${input.ticketNo} için ${input.assigneeName} önerildi. Bilgi güvenliği yöneticisi onaylarsa görev atanır.`
      : input.kind === "approve"
        ? `${input.ticketNo} görevi ${input.assigneeName} adlı personele atandı.`
        : `${input.ticketNo} için ${input.assigneeName} ataması reddedildi.`,
    `Problem: ${input.title}`,
    input.infosecName ? `BG yöneticisi: ${input.infosecName}` : "",
    input.note ? `Not: ${input.note}` : "",
    "",
    "BT Hizmet Yönetimi",
  ]
    .filter(Boolean)
    .join("\n");

  if (input.kind === "propose" && input.recordId) {
    await sendApprovalMails({
      kind: "problem",
      recordId: input.recordId,
      ticketNo: input.ticketNo,
      title: input.title,
      status: "PENDING",
      requesterId: input.requesterId,
      managerIds: input.approverIds,
    });
  }

  if (!recipients.length) return { sent: false, note: "Bildirim adresi yok." };
  if (!settings.mail.enabled) {
    await prisma.activityLog.create({
      data: {
        entityType: "Problem",
        entityId: input.ticketNo,
        action: "MAIL_SKIPPED",
        note: `${subject}. SMTP kapalı. ${recipients.join(", ")}`,
      },
    });
    return { sent: false, note: "SMTP kapalı; bildirim kuyruğa yazıldı." };
  }
  try {
    await sendMail(settings.mail, { to: recipients, subject, text });
    return { sent: true, note: `Bildirim ${recipients.length} adrese gönderildi.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "E-posta gönderilemedi";
    await prisma.activityLog.create({
      data: {
        entityType: "Problem",
        entityId: input.ticketNo,
        action: "MAIL_ERROR",
        note: message,
      },
    });
    return { sent: false, note: message };
  }
}

export function approvalStatus(
  kind: IntegrationEvent["kind"],
  office: string | undefined,
  requestedStatus: string | null,
) {
  return getSystemSettings().then((settings) => {
    const apply =
      (kind === "request" && settings.approval.applyToRequests) ||
      (kind === "change" && settings.approval.applyToChanges) ||
      (kind === "patch" && settings.approval.applyToPatches);
    if (!apply) return requestedStatus;

    const needsUnit = settings.approval.unitManager;
    const needsSenior = settings.approval.seniorManager;
    const needsInfosec = settings.approval.infosec && (kind === "change" || office === "SIBER");
    if (!needsUnit && !needsSenior && !needsInfosec) return requestedStatus;

    if (kind === "request") return "WAITING";
    return "PENDING";
  });
}
