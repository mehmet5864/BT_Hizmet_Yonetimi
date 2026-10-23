import { prisma } from "@/lib/prisma";

export type PersonOrgDefaults = {
  departmentId?: string;
  unitManagerId?: string;
  parentDepartmentId?: string;
  parentManagerId?: string;
  requestOffice?: string;
};

export async function personOrgDefaults(personId?: string | null): Promise<PersonOrgDefaults> {
  if (!personId) return {};
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      departmentId: true,
      unitManagerId: true,
      parentDepartmentId: true,
      parentManagerId: true,
      requestOffice: true,
      department: { select: { managerId: true, parentId: true, parentManagerId: true } },
    },
  });
  if (!person) return {};
  return {
    departmentId: person.departmentId ?? undefined,
    unitManagerId: person.unitManagerId ?? person.department?.managerId ?? undefined,
    parentDepartmentId: person.parentDepartmentId ?? person.department?.parentId ?? undefined,
    parentManagerId: person.parentManagerId ?? person.department?.parentManagerId ?? undefined,
    requestOffice: person.requestOffice ?? undefined,
  };
}

export async function departmentOrgDefaults(departmentId?: string | null) {
  if (!departmentId) return {};
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { managerId: true, parentId: true, parentManagerId: true },
  });
  if (!dept) return {};
  return {
    managerId: dept.managerId ?? undefined,
    parentId: dept.parentId ?? undefined,
    parentManagerId: dept.parentManagerId ?? undefined,
  };
}

export function firstFilled(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (value?.trim()) return value;
  }
  return null;
}
