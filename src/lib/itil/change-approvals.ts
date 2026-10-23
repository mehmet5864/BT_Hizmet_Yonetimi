export const MAX_CHANGE_APPROVAL_UNITS = 10;

export type ChangeApprovalDraft = {
  departmentId: string;
  managerId: string;
};

export function approvalUnitsFromLegacy(row: {
  approvalUnits?: ChangeApprovalDraft[];
  targetDept1Id?: string | null;
  targetMgr1Id?: string | null;
  targetDept2Id?: string | null;
  targetMgr2Id?: string | null;
  targetDept3Id?: string | null;
  targetMgr3Id?: string | null;
  approvalUnitCount?: number | null;
}): { count: number; units: ChangeApprovalDraft[] } {
  if (row.approvalUnits?.length) {
    return {
      count: Math.min(MAX_CHANGE_APPROVAL_UNITS, Math.max(row.approvalUnitCount ?? row.approvalUnits.length, 1)),
      units: row.approvalUnits.slice(0, MAX_CHANGE_APPROVAL_UNITS),
    };
  }
  const units = [
    { departmentId: row.targetDept1Id ?? "", managerId: row.targetMgr1Id ?? "" },
    { departmentId: row.targetDept2Id ?? "", managerId: row.targetMgr2Id ?? "" },
    { departmentId: row.targetDept3Id ?? "", managerId: row.targetMgr3Id ?? "" },
  ].filter((item) => item.departmentId || item.managerId);
  const count = Math.min(MAX_CHANGE_APPROVAL_UNITS, Math.max(row.approvalUnitCount ?? units.length, units.length || 0));
  return { count, units };
}
