import { prisma } from "@/lib/prisma";

/** Birim personeli: kendi birimi, yönettiği birimler ve doğrudan bağlı çalışanlar (kendisi dahil). */
export async function unitPersonIds(viewer: { id: string; departmentId?: string | null }) {
  const managed = await prisma.department.findMany({ where: { managerId: viewer.id }, select: { id: true } });
  const deptIds = [viewer.departmentId, ...managed.map((row) => row.id)].filter((id): id is string => Boolean(id));
  const people = await prisma.person.findMany({
    where: {
      OR: [
        ...(deptIds.length ? [{ departmentId: { in: deptIds } }] : []),
        { unitManagerId: viewer.id },
        { parentManagerId: viewer.id },
      ],
    },
    select: { id: true },
  });
  return [...new Set([viewer.id, ...people.map((row) => row.id)])];
}
