import Link from "next/link";
import { notFound } from "next/navigation";

import { CHANGE_TYPE_LABELS, RISK_LABELS } from "@/lib/itil/guards";
import { StatusBadge } from "@/components/itil/status-badge";
import { agileTypeFor } from "@/lib/agile/access";
import { LinkedRecords } from "@/components/itil/linked-records";
import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { CHANGE_STATUS_LABELS } from "@/lib/itil/constants";
import { formatDate } from "@/lib/inventory/format";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function ChangeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const row = await db.changeRecord.findUnique({
    where: { id },
    include: {
      requester: true,
      requestingDept: true,
      requestingManager: true,
      infosecManager: true,
      approvalUnits: {
        orderBy: { sortOrder: "asc" },
        include: { department: true, manager: true },
      },
      targetDept1: true,
      targetMgr1: true,
      targetDept2: true,
      targetMgr2: true,
      targetDept3: true,
      targetMgr3: true,
    },
  });
  if (!row) notFound();
  const [relInc, relPrb] = await Promise.all([
    row.incidentId ? db.incident.findUnique({ where: { id: row.incidentId }, select: { id: true, incidentNo: true } }) : null,
    row.problemId ? db.problem.findUnique({ where: { id: row.problemId }, select: { id: true, problemNo: true } }) : null,
  ]);
  const units = row.approvalUnits.length
    ? row.approvalUnits.map((item) => ({
        name: item.department.name,
        manager: item.manager.fullName,
      }))
    : [
        { name: row.targetDept1?.name, manager: row.targetMgr1?.fullName },
        { name: row.targetDept2?.name, manager: row.targetMgr2?.fullName },
        { name: row.targetDept3?.name, manager: row.targetMgr3?.fullName },
      ].filter((item) => item.name || item.manager);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={row.changeNo}
        description="Değişiklik kaydı"
        actions={
          <DetailActions
            editHref={`/degisiklik/${row.id}/duzenle`}
            canDelete={await viewerCanDelete()}
            kind="change"
            agileType={await agileTypeFor("CHANGE")}
            id={row.id}
            label={row.changeNo}
          />
        }
      />
      <Card>
        <CardContent>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Talep eden">{row.requester.fullName}</DetailRow>
            <DetailRow label="Talep eden birim amiri">{row.requestingManager?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Talep eden birim">{row.requestingDept?.name ?? "—"}</DetailRow>
            <DetailRow label="Onay birim sayısı">{row.approvalUnitCount || units.length || "—"}</DetailRow>
            <DetailRow label="BG yöneticisi">{row.infosecManager?.fullName ?? "—"}</DetailRow>
            <DetailRow label="IP">{row.changeIp ?? "—"}</DetailRow>
            <DetailRow label="Tür / makine / etki">{[row.changeKind, row.machineType, row.impact].filter(Boolean).join(" · ") || "—"}</DetailRow>
            <DetailRow label="Çalışma">{formatDate(row.workStartDate)} → {formatDate(row.expectedEndDate)}</DetailRow>
            <DetailRow label="Talep / onay">{formatDate(row.requestDate)} / {formatDate(row.approvalDate)}</DetailRow>
            <DetailRow label="Durum">
              <StatusBadge value={row.status} label={CHANGE_STATUS_LABELS[row.status as keyof typeof CHANGE_STATUS_LABELS] ?? row.status} />
            </DetailRow>
            <DetailRow label="Sınıf / risk">
              {CHANGE_TYPE_LABELS[row.changeType as keyof typeof CHANGE_TYPE_LABELS] ?? row.changeType} / {RISK_LABELS[row.risk as keyof typeof RISK_LABELS] ?? row.risk}
            </DetailRow>
            <DetailRow label="İlişkili olay / problem">
              {relInc ? <Link href={`/olay/${relInc.id}`} className="me-2 underline">{relInc.incidentNo}</Link> : null}
              {relPrb ? <Link href={`/problem/${relPrb.id}`} className="underline">{relPrb.problemNo}</Link> : null}
              {!relInc && !relPrb ? "—" : null}
            </DetailRow>
            <DetailRow label="Geri dönüş planı">{row.rollbackPlan ?? "—"}</DetailRow>
            <DetailRow label="Test planı">{row.testPlan ?? "—"}</DetailRow>
            <DetailRow label="CAB notu">{row.cabNote ?? "—"}</DetailRow>
            <DetailRow label="Uygulama sonrası inceleme">{row.reviewNote ?? "—"}</DetailRow>
            <DetailRow label="Açıklama">{row.description ?? "—"}</DetailRow>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onay birimleri</CardTitle>
        </CardHeader>
        <CardContent>
          {units.length ? (
            <ol className="space-y-2 text-sm">
              {units.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex flex-wrap justify-between gap-2 rounded-md border px-3 py-2">
                  <span>
                    {index + 1}. {item.name ?? "—"}
                  </span>
                  <span className="text-muted-foreground">{item.manager ?? "—"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground text-sm">Onay birimi yok.</p>
          )}
        </CardContent>
      </Card>
      <LinkedRecords sourceType="CHANGE" id={row.id} no={row.changeNo} />
    </div>
  );
}
