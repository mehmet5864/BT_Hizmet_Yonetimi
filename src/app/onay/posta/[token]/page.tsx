import { decideByMailToken } from "@/lib/actions/mail-approval";
import { readApprovalToken } from "@/lib/approval-token";
import { getRequestType } from "@/lib/itil/request-types";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function label(kind: string) {
  if (kind === "request") return "Servis talebi";
  if (kind === "change") return "Değişiklik";
  if (kind === "patch") return "Yama";
  if (kind === "problem") return "Problem ataması";
  return "Kayıt";
}

async function summary(kind: string, id: string) {
  if (kind === "request") {
    const row = await prisma.serviceRequest.findUnique({
      where: { id },
      select: { requestNo: true, requestType: true, status: true, reason: true, requester: { select: { fullName: true } } },
    });
    if (!row) return null;
    return {
      no: row.requestNo,
      title: getRequestType(row.requestType)?.label ?? row.requestType,
      status: row.status,
      extra: row.requester.fullName,
      waiting: row.status === "WAITING",
    };
  }
  if (kind === "change") {
    const row = await prisma.changeRecord.findUnique({
      where: { id },
      select: { changeNo: true, status: true, changeKind: true, requester: { select: { fullName: true } } },
    });
    if (!row) return null;
    return { no: row.changeNo, title: row.changeKind ?? "Değişiklik", status: row.status, extra: row.requester.fullName, waiting: row.status === "PENDING" };
  }
  if (kind === "patch") {
    const row = await prisma.patchRecord.findUnique({
      where: { id },
      select: { patchNo: true, title: true, status: true, requester: { select: { fullName: true } } },
    });
    if (!row) return null;
    return { no: row.patchNo, title: row.title, status: row.status, extra: row.requester.fullName, waiting: row.status === "PENDING" };
  }
  if (kind === "problem") {
    const row = await prisma.problem.findUnique({
      where: { id },
      select: { problemNo: true, title: true, assignmentStatus: true, requester: { select: { fullName: true } } },
    });
    if (!row) return null;
    return {
      no: row.problemNo,
      title: row.title,
      status: row.assignmentStatus,
      extra: row.requester?.fullName ?? "",
      waiting: row.assignmentStatus === "PENDING",
    };
  }
  if (kind === "inventory") {
    const row = await prisma.inventoryApproval.findUnique({
      where: { id },
      select: { action: true, status: true, requestedBy: { select: { fullName: true } } },
    });
    if (!row) return null;
    return {
      no: row.action === "CREATE" ? "ENV-EKLE" : "ENV-SIL",
      title: row.action === "CREATE" ? "Envanter ekleme" : "Envanter silme",
      status: row.status,
      extra: row.requestedBy.fullName,
      waiting: row.status === "PENDING",
    };
  }
  return null;
}

export default async function MailApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token: raw } = await params;
  const query = await searchParams;
  const token = decodeURIComponent(raw);
  const payload = readApprovalToken(token);
  const karar = typeof query.karar === "string" ? query.karar : "";

  if (!payload) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-lg font-semibold">Onay bağlantısı geçersiz</h1>
        <p className="text-muted-foreground mt-2 text-sm">Süre dolmuş veya bağlantı bozulmuş olabilir. Uygulamadan giriş yaparak onaylayın.</p>
      </main>
    );
  }

  if (karar === "onay" || karar === "red") {
    const result = await decideByMailToken(token, karar === "onay" ? "APPROVED" : "REJECTED");
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-lg font-semibold">{result.ok ? "Karar kaydedildi" : "İşlem yapılamadı"}</h1>
        <p className="mt-2 text-sm">{result.message}</p>
      </main>
    );
  }

  const info = await summary(payload.kind, payload.id);
  return (
    <main className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-lg font-semibold">E-posta onayı</h1>
      <p className="text-muted-foreground text-sm">{label(payload.kind)}</p>
      {info ? (
        <div className="rounded-xl border p-4 text-sm">
          <p className="font-medium">{info.no} · {info.title}</p>
          <p className="text-muted-foreground mt-1">Talep eden: {info.extra}</p>
          <p className="text-muted-foreground">Durum: {info.status}</p>
        </div>
      ) : (
        <p className="text-sm">Kayıt bulunamadı.</p>
      )}
      {info?.waiting ? (
        <div className="flex gap-3">
          <a className="bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white" href={`/onay/posta/${encodeURIComponent(token)}?karar=onay`}>
            Onayla
          </a>
          <a className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700" href={`/onay/posta/${encodeURIComponent(token)}?karar=red`}>
            Reddet
          </a>
        </div>
      ) : (
        <p className="text-sm">Bu kayıt artık onay beklemiyor.</p>
      )}
    </main>
  );
}
