import { appBaseUrl } from "@/lib/approval-token";
import { sendMail } from "@/lib/integrations/mail";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings-store";

/**
 * Bir kişiye iş/kayıt atandığında e-posta (SMTP açıksa) gönderir ve etkinlik günlüğüne yazar.
 * Asıl işlemi asla bozmaz; kendi kendine atamada bildirim göndermez.
 */
export async function notifyAssignment(input: {
  personId: string | null | undefined;
  actorId?: string | null;
  ticketNo: string;
  title: string;
  kindLabel: string;
  path: string;
  entityType: string;
  entityId: string;
}) {
  try {
    if (!input.personId || input.personId === input.actorId) return;
    const person = await prisma.person.findUnique({
      where: { id: input.personId },
      select: { fullName: true, email: true },
    });
    if (!person) return;
    await prisma.activityLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: "ASSIGN_NOTIFY",
        note: `${input.ticketNo} ${input.kindLabel} ${person.fullName} kişisine atandı.`,
      },
    });
    const settings = await getSystemSettings();
    if (!settings.mail.enabled || !person.email) return;
    const url = `${appBaseUrl()}${input.path}`;
    await sendMail(settings.mail, {
      to: [person.email],
      subject: `[Atama] ${input.ticketNo} ${input.title}`.slice(0, 200),
      text: `${input.ticketNo} (${input.kindLabel}) size atandı.\n${input.title}\n\nKaydı aç: ${url}\n\nBT Hizmet Yönetimi`,
      html: `<p><strong>${input.ticketNo}</strong> (${input.kindLabel}) size atandı.</p><p>${input.title.replace(/</g, "&lt;")}</p><p><a href="${url}">Kaydı aç</a></p>`,
    });
  } catch (error) {
    console.error("notifyAssignment", error);
  }
}
