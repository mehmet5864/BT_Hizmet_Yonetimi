import { prisma } from "@/lib/prisma";

/** Verilen birimlerin tüm alt birimleri (çok düzeyli: genel müdürlük → daire → şube → servis). */
async function withDescendants(rootIds: string[]) {
  const all = new Set(rootIds);
  let frontier = [...rootIds];
  // Döngüye karşı en fazla 12 düzey.
  for (let depth = 0; depth < 12 && frontier.length; depth += 1) {
    const children = await prisma.department.findMany({ where: { parentId: { in: frontier } }, select: { id: true } });
    frontier = children.map((row) => row.id).filter((id) => !all.has(id));
    frontier.forEach((id) => all.add(id));
  }
  return [...all];
}

/**
 * Birim personeli: kendi birimi, yönettiği birimler ve bunların tüm alt birimleri ile doğrudan bağlı çalışanlar (kendisi dahil).
 * Üst birimin amiri, altındaki şube ve servislerin personelini de kapsar.
 */
export async function unitPersonIds(viewer: { id: string; departmentId?: string | null }) {
  const managed = await prisma.department.findMany({ where: { managerId: viewer.id }, select: { id: true } });
  // Kendi birimi yalnızca kendi düzeyinde sayılır; alt birimler yalnızca yönettiği birimlerden genişler.
  const tree = await withDescendants(managed.map((row) => row.id));
  const deptIds = [...new Set([viewer.departmentId, ...tree].filter((id): id is string => Boolean(id)))];
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
