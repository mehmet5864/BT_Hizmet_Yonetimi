import { notFound } from "next/navigation";

import { ChangeForm } from "@/components/itil/change-form";
import { PageHeader } from "@/components/ui-bits";
import { getTranslator } from "@/lib/i18n";
import { getItilCatalog } from "@/lib/itil/catalog";
import { approvalUnitsFromLegacy } from "@/lib/itil/change-approvals";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function EditChangePage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const [{ t }, row, catalog] = await Promise.all([
    getTranslator(),
    db.changeRecord.findUnique({
      where: { id },
      include: { approvalUnits: { orderBy: { sortOrder: "asc" } } },
    }),
    getItilCatalog(),
  ]);
  if (!row) notFound();
  const [relInc, relPrb] = await Promise.all([
    row.incidentId ? db.incident.findUnique({ where: { id: row.incidentId }, select: { incidentNo: true } }) : null,
    row.problemId ? db.problem.findUnique({ where: { id: row.problemId }, select: { problemNo: true } }) : null,
  ]);
  const { count, units } = approvalUnitsFromLegacy({
    approvalUnitCount: row.approvalUnitCount,
    approvalUnits: row.approvalUnits.map((item) => ({
      departmentId: item.departmentId,
      managerId: item.managerId,
    })),
    targetDept1Id: row.targetDept1Id,
    targetMgr1Id: row.targetMgr1Id,
    targetDept2Id: row.targetDept2Id,
    targetMgr2Id: row.targetMgr2Id,
    targetDept3Id: row.targetDept3Id,
    targetMgr3Id: row.targetMgr3Id,
  });
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.editShort", { name: row.changeNo })} />
      <ChangeForm
        catalog={catalog}
        cancelHref={`/degisiklik/${row.id}`}
        values={{
          id: row.id,
          requesterId: row.requesterId,
          requestingDeptId: row.requestingDeptId,
          requestingManagerId: row.requestingManagerId,
          infosecManagerId: row.infosecManagerId,
          changeIp: row.changeIp,
          changeKind: row.changeKind,
          machineType: row.machineType,
          impact: row.impact,
          workStartDate: row.workStartDate,
          expectedEndDate: row.expectedEndDate,
          requestDate: row.requestDate,
          approvalDate: row.approvalDate,
          status: row.status,
          description: row.description,
          changeType: row.changeType,
          risk: row.risk,
          rollbackPlan: row.rollbackPlan,
          testPlan: row.testPlan,
          cabNote: row.cabNote,
          reviewNote: row.reviewNote,
          relatedIncidentNo: relInc?.incidentNo ?? null,
          relatedProblemNo: relPrb?.problemNo ?? null,
          approvalUnitCount: count,
          approvalUnits: units,
        }}
      />
    </div>
  );
}
