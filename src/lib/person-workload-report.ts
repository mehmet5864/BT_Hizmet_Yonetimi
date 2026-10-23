import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/inventory/format";
import type { ReportTable } from "@/lib/reports/types";
import { getPersonWorkload, type PersonWorkload } from "./person-workload";

const DETAIL_LIMIT = 500;

function detailRows(data: PersonWorkload) {
  const groups: [string, PersonWorkload["approvals"]][] = [
    ["Bekleyen onay", data.approvals],
    ["Üzerindeki iş", data.assigned],
    ["Çevik görev", data.agileTasks],
    ["Diğer yapılacak", data.todos],
  ];
  const rows = groups.flatMap(([tur, items]) =>
    items.map((item) => ({ tur, kod: item.code, baslik: item.title, durum: item.statusLabel })),
  );
  for (const sprint of data.sprints) {
    rows.push({
      tur: "Aktif sprint",
      kod: sprint.product,
      baslik: sprint.name,
      durum: `${sprint.done}/${sprint.items} iş · ${sprint.donePoints}/${sprint.points} puan`,
    });
  }
  return rows;
}

/** Tek kişinin çalışma özeti raporu (kişi kartı ve /profilim için). */
export async function buildPersonWorkloadReport(personId: string): Promise<ReportTable | null> {
  const person = await prisma.person.findUnique({ where: { id: personId }, select: { fullName: true, department: { select: { name: true } } } });
  if (!person) return null;
  const data = await getPersonWorkload(personId, DETAIL_LIMIT);
  const c = data.counts;
  return {
    id: "kisi-calisma-ozeti",
    title: `Çalışma özeti · ${person.fullName}`,
    description: `${person.department?.name ?? "Birim yok"} · bekleyen onay ${c.approvals}, üzerindeki iş ${c.assigned}, Çevik görev ${c.agileTasks}, diğer yapılacak ${c.todos}, aktif sprint ${c.sprints}, açık taleplerim ${data.myRequests}`,
    generatedAt: formatDateTime(new Date()),
    columns: [
      { key: "tur", label: "Tür" },
      { key: "kod", label: "Kayıt no / ürün" },
      { key: "baslik", label: "Başlık" },
      { key: "durum", label: "Durum" },
    ],
    rows: detailRows(data),
  };
}

/** Tüm personelin özet sayıları (yönetici raporu). */
export async function buildWorkloadSummaryRows(people: { id: string; fullName: string; department: { name: string } | null }[]) {
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < people.length; i += 8) {
    const chunk = people.slice(i, i + 8);
    const loads = await Promise.all(chunk.map((p) => getPersonWorkload(p.id, 1)));
    chunk.forEach((p, idx) => {
      const c = loads[idx].counts;
      rows.push({
        ad: p.fullName,
        birim: p.department?.name ?? "",
        onay: String(c.approvals),
        is: String(c.assigned),
        cevik: String(c.agileTasks),
        diger: String(c.todos),
        sprint: String(c.sprints),
        talep: String(loads[idx].myRequests),
        toplam: String(c.approvals + c.assigned + c.agileTasks + c.todos),
      });
    });
  }
  return rows.sort((a, b) => Number(b.toplam) - Number(a.toplam));
}

export async function buildWorkloadDetailRows(people: { id: string; fullName: string; department: { name: string } | null }[]) {
  const out: Record<string, string>[] = [];
  for (let i = 0; i < people.length; i += 8) {
    const chunk = people.slice(i, i + 8);
    const loads = await Promise.all(chunk.map((p) => getPersonWorkload(p.id, 200)));
    chunk.forEach((p, idx) => {
      for (const row of detailRows(loads[idx])) out.push({ ad: p.fullName, birim: p.department?.name ?? "", ...row });
    });
  }
  return out;
}
