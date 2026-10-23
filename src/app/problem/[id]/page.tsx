import Link from "next/link";
import { notFound } from "next/navigation";

import { ProblemAssignmentActions } from "@/components/itil/problem-assignment-actions";
import { REQUEST_SEVERITY_LABELS } from "@/lib/itil/constants";
import { StatusBadge } from "@/components/itil/status-badge";
import { agileTypeFor } from "@/lib/agile/access";
import { LinkedRecords } from "@/components/itil/linked-records";
import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { getViewer } from "@/lib/auth/viewer";
import { viewerCanApproveProblemAssignment } from "@/lib/itil/catalog";
import {
  PROBLEM_ASSIGNMENT_LABELS,
  PROBLEM_STATUS_LABELS,
  type ProblemAssignmentStatus,
} from "@/lib/itil/constants";
import { formatDateTime } from "@/lib/inventory/format";
import { prisma } from "@/lib/prisma";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const [row, viewer] = await Promise.all([
    db.problem.findUnique({
      where: { id },
      include: {
        incident: true,
        requester: true,
        requestingManager: true,
        proposedAssignee: true,
        assignee: true,
        infosecManager: true,
        assignmentDecidedBy: true,
      },
    }),
    getViewer(),
  ]);
  if (!row) notFound();
  const [svc, chg] = await Promise.all([
    row.serviceId ? prisma.catalogService.findUnique({ where: { id: row.serviceId }, select: { id: true, serviceNo: true } }) : null,
    row.changeId ? db.changeRecord.findUnique({ where: { id: row.changeId }, select: { id: true, changeNo: true } }) : null,
  ]);
  const linkedChanges = await db.changeRecord.findMany({ where: { problemId: row.id }, select: { id: true, changeNo: true } });
  const assignment = (row.assignmentStatus as ProblemAssignmentStatus) || "NONE";
  const canApprove =
    assignment === "PENDING" &&
    (await viewerCanApproveProblemAssignment(viewer?.role, viewer?.id, row.infosecManagerId));
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={row.problemNo}
        description={row.title}
        actions={
          <DetailActions
            editHref={`/problem/${row.id}/duzenle`}
            canDelete={await viewerCanDelete()}
            kind="problem"
            agileType={await agileTypeFor("PROBLEM")}
            id={row.id}
            label={row.problemNo}
          />
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Görev ataması</CardTitle>
          <CardDescription>
            Atanacak personeli bilgi güvenliği yöneticisi onaylar; onaydan sonra görev başlar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Atanacak personel">{row.proposedAssignee?.fullName ?? "—"}</DetailRow>
            <DetailRow label="BG yöneticisi">{row.infosecManager?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Atama durumu">
              <StatusBadge value={assignment} label={PROBLEM_ASSIGNMENT_LABELS[assignment]} />
            </DetailRow>
            <DetailRow label="Görevli">{row.assignee?.fullName ?? (assignment === "APPROVED" ? row.proposedAssignee?.fullName : "Henüz atanmadı")}</DetailRow>
            <DetailRow label="Atama tarihi">{formatDateTime(row.assignedAt)}</DetailRow>
            <DetailRow label="Karar veren">{row.assignmentDecidedBy?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Onay notu">{row.assignmentNote ?? "—"}</DetailRow>
          </dl>
          {canApprove ? <ProblemAssignmentActions id={row.id} /> : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Talep eden">{row.requester?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Talep eden birim amiri">{row.requestingManager?.fullName ?? "—"}</DetailRow>
            <DetailRow label="İlgili olay">
              {row.incident ? (
                <Link href={`/olay/${row.incident.id}`} className="hover:underline">
                  {row.incident.incidentNo}
                </Link>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Durum">
              <StatusBadge
                value={row.status}
                label={PROBLEM_STATUS_LABELS[row.status as keyof typeof PROBLEM_STATUS_LABELS] ?? row.status}
              />
            </DetailRow>
            <DetailRow label="Kök neden">{row.rootCause ?? "—"}</DetailRow>
            <DetailRow label="Geçici çözüm">{row.workaround ?? "—"}</DetailRow>
            <DetailRow label="Önem">{REQUEST_SEVERITY_LABELS[row.severity as keyof typeof REQUEST_SEVERITY_LABELS] ?? row.severity}</DetailRow>
            <DetailRow label="Kalıcı çözüm">{row.permanentFix ?? "—"}</DetailRow>
            <DetailRow label="Etkilenen hizmet">
              {svc ? <Link href={`/katalog/${svc.id}`} className="underline">{svc.serviceNo}</Link> : "—"}
            </DetailRow>
            <DetailRow label="Çözüm değişikliği">
              {[chg, ...linkedChanges].filter((c, i, arr) => c && arr.findIndex((x) => x?.id === c.id) === i).map((c) => (
                <Link key={c!.id} href={`/degisiklik/${c!.id}`} className="me-2 underline">{c!.changeNo}</Link>
              ))}
              {!chg && !linkedChanges.length ? "—" : null}
            </DetailRow>
            <DetailRow label="Açıklama">{row.description ?? "—"}</DetailRow>
          </dl>
        </CardContent>
      </Card>
      <LinkedRecords sourceType="PROBLEM" id={row.id} no={row.problemNo} />
    </div>
  );
}
