import { prisma } from "@/lib/prisma";

export type WorkItem = {
  key: string;
  href: string;
  code: string;
  title: string;
  statusLabel: string;
  tone?: "danger" | "warning" | "default";
};

export type SprintLoad = {
  id: string;
  name: string;
  product: string;
  endDate: Date | null;
  items: number;
  done: number;
  points: number;
  donePoints: number;
};

export type PersonWorkload = {
  approvals: WorkItem[];
  assigned: WorkItem[];
  agileTasks: WorkItem[];
  /** Diğer yapılacaklar: zafiyet, süresi yaklaşan zimmet, sonuç bekleyen istekler, toplantı, bilgi makalesi taslağı */
  todos: WorkItem[];
  sprints: SprintLoad[];
  myRequests: number;
  counts: { approvals: number; assigned: number; agileTasks: number; todos: number; sprints: number };
};

const OPEN_TICKET = ["OPEN", "IN_PROGRESS", "WAITING"];
const CLOSED_INCIDENT = ["RESOLVED", "CLOSED"];
const CLOSED_PROBLEM = ["RESOLVED", "CLOSED"];
export const EXPIRY_DAYS = 60;

const INCIDENT_LABEL: Record<string, string> = { OPEN: "Açık", INVESTIGATING: "İnceleniyor", CONTAINED: "Kontrol altında" };
const PROBLEM_LABEL: Record<string, string> = { OPEN: "Açık", INVESTIGATING: "İnceleniyor", KNOWN_ERROR: "Bilinen hata" };
const TICKET_LABEL: Record<string, string> = { OPEN: "Açık", IN_PROGRESS: "İşlemde", WAITING: "Beklemede" };
const AGILE_LABEL: Record<string, string> = { BACKLOG: "Bekleyen", TODO: "Yapılacak", IN_PROGRESS: "Devam ediyor", REVIEW: "İncelemede", DONE: "Tamam" };

/** Bir kişinin üzerindeki onaylar, atanmış işler, Çevik görevler ve aktif sprintler. */
export async function getPersonWorkload(personId: string, limit = 8): Promise<PersonWorkload> {
  const LIST_LIMIT = limit;
  const approverChange = {
    status: "PENDING",
    OR: [{ requestingManagerId: personId }, { infosecManagerId: personId }, { approvalUnits: { some: { managerId: personId } } }],
  };
  const [
    changes,
    patches,
    waiting,
    problemApprovals,
    incidents,
    problems,
    requests,
    slaTickets,
    agile,
    sprintItems,
    myRequests,
    vulns,
    expiring,
    myPendingChanges,
    myPendingPatches,
    myPendingInventory,
    meetings,
    drafts,
  ] = await Promise.all([
    prisma.changeRecord.findMany({ where: approverChange, orderBy: { updatedAt: "desc" }, take: LIST_LIMIT, select: { id: true, changeNo: true, description: true } }),
    prisma.patchRecord.findMany({ where: { status: "PENDING", requestingManagerId: personId }, orderBy: { updatedAt: "desc" }, take: LIST_LIMIT, select: { id: true, patchNo: true, title: true } }),
    prisma.serviceRequest.findMany({
      where: { status: "WAITING", OR: [{ requestingManagerId: personId }, { handlingManagerId: personId }] },
      orderBy: { updatedAt: "desc" },
      take: LIST_LIMIT,
      select: { id: true, requestNo: true, reason: true, requestType: true },
    }),
    prisma.problem.findMany({ where: { assignmentStatus: "PENDING", infosecManagerId: personId }, orderBy: { updatedAt: "desc" }, take: LIST_LIMIT, select: { id: true, problemNo: true, title: true } }),
    prisma.incident.findMany({
      where: { status: { notIn: CLOSED_INCIDENT }, OR: [{ l1AnalystId: personId }, { l2AnalystId: personId }] },
      orderBy: { updatedAt: "desc" },
      take: LIST_LIMIT,
      select: { id: true, incidentNo: true, title: true, status: true, resolveDueAt: true },
    }),
    prisma.problem.findMany({ where: { assigneeId: personId, status: { notIn: CLOSED_PROBLEM } }, orderBy: { updatedAt: "desc" }, take: LIST_LIMIT, select: { id: true, problemNo: true, title: true, status: true } }),
    prisma.serviceRequest.findMany({
      where: { handlingManagerId: personId, status: { in: OPEN_TICKET } },
      orderBy: { updatedAt: "desc" },
      take: LIST_LIMIT,
      select: { id: true, requestNo: true, reason: true, requestType: true, status: true, resolveDueAt: true },
    }),
    prisma.slaTicket.findMany({ where: { ownerId: personId, status: { in: OPEN_TICKET } }, orderBy: { updatedAt: "desc" }, take: LIST_LIMIT, select: { id: true, ticketNo: true, title: true, status: true } }),
    prisma.agileItem.findMany({
      where: { assigneeId: personId, status: { not: "DONE" } },
      orderBy: [{ updatedAt: "desc" }],
      take: LIST_LIMIT,
      select: { id: true, itemNo: true, title: true, status: true, blockedReason: true },
    }),
    prisma.agileItem.findMany({
      where: { assigneeId: personId, sprint: { status: "ACTIVE" } },
      select: { status: true, points: true, sprint: { select: { id: true, name: true, endDate: true, product: { select: { name: true } } } } },
    }),
    prisma.serviceRequest.count({ where: { requesterId: personId, status: { in: OPEN_TICKET } } }),
    prisma.vulnerability.findMany({ where: { ownerId: personId, status: "OPEN" }, orderBy: [{ dueDate: "asc" }], take: LIST_LIMIT, select: { id: true, vulnNo: true, deviceName: true, cve: true, description: true, severity: true, dueDate: true } }),
    prisma.asset.findMany({
      where: { ownerId: personId, custody: { not: "FREE" }, supportEndDate: { not: null, lte: new Date(Date.now() + EXPIRY_DAYS * 86400000) }, status: { not: "RETIRED" } },
      orderBy: { supportEndDate: "asc" },
      take: LIST_LIMIT,
      select: { id: true, name: true, stockNo: true, supportEndDate: true },
    }),
    prisma.changeRecord.findMany({ where: { requesterId: personId, status: "PENDING" }, orderBy: { updatedAt: "desc" }, take: LIST_LIMIT, select: { id: true, changeNo: true, description: true } }),
    prisma.patchRecord.findMany({ where: { requesterId: personId, status: "PENDING" }, orderBy: { updatedAt: "desc" }, take: LIST_LIMIT, select: { id: true, patchNo: true, title: true } }),
    prisma.inventoryApproval.findMany({ where: { requestedById: personId, status: "PENDING" }, orderBy: { createdAt: "desc" }, take: LIST_LIMIT, select: { id: true, action: true } }),
    prisma.agileMeeting.findMany({ where: { meetingDate: { gte: new Date() }, attendees: { contains: (await prisma.person.findUnique({ where: { id: personId }, select: { fullName: true } }))?.fullName ?? "\u0000" } }, orderBy: { meetingDate: "asc" }, take: LIST_LIMIT, select: { id: true, title: true, meetingDate: true, sprintId: true, productId: true } }),
    prisma.knowledgeArticle.findMany({ where: { authorId: personId, status: "DRAFT" }, orderBy: { updatedAt: "desc" }, take: LIST_LIMIT, select: { id: true, title: true } }),
  ]);

  const now = Date.now();
  const late = (due: Date | null | undefined) => (due && due.getTime() < now ? "danger" : "default") as "danger" | "default";

  const approvals: WorkItem[] = [
    ...changes.map((r) => ({ key: `chg:${r.id}`, href: `/degisiklik/${r.id}`, code: r.changeNo, title: r.description?.slice(0, 90) || "Değişiklik kaydı", statusLabel: "Onay bekliyor" })),
    ...patches.map((r) => ({ key: `pat:${r.id}`, href: `/yama/${r.id}`, code: r.patchNo, title: r.title, statusLabel: "Onay bekliyor" })),
    ...waiting.map((r) => ({ key: `req:${r.id}`, href: `/talepler/${r.id}`, code: r.requestNo, title: r.reason || r.requestType, statusLabel: "Talep onayı" })),
    ...problemApprovals.map((r) => ({ key: `prb:${r.id}`, href: `/problem/${r.id}`, code: r.problemNo, title: r.title, statusLabel: "Atama onayı" })),
  ];
  const assigned: WorkItem[] = [
    ...incidents.map((r) => ({ key: `inc:${r.id}`, href: `/olay/${r.id}`, code: r.incidentNo, title: r.title, statusLabel: INCIDENT_LABEL[r.status] ?? r.status, tone: late(r.resolveDueAt) })),
    ...problems.map((r) => ({ key: `prb:${r.id}`, href: `/problem/${r.id}`, code: r.problemNo, title: r.title, statusLabel: PROBLEM_LABEL[r.status] ?? r.status })),
    ...requests.map((r) => ({ key: `req:${r.id}`, href: `/talepler/${r.id}`, code: r.requestNo, title: r.reason || r.requestType, statusLabel: TICKET_LABEL[r.status] ?? r.status, tone: late(r.resolveDueAt) })),
    ...slaTickets.map((r) => ({ key: `sla:${r.id}`, href: `/firma-sla/sla/${r.id}`, code: r.ticketNo, title: r.title, statusLabel: TICKET_LABEL[r.status] ?? r.status })),
  ];
  const agileTasks: WorkItem[] = agile.map((r) => ({
    key: `agl:${r.id}`,
    href: `/cevik/is/${r.id}`,
    code: r.itemNo,
    title: r.title,
    statusLabel: r.blockedReason ? "Engelli" : (AGILE_LABEL[r.status] ?? r.status),
    tone: r.blockedReason ? ("warning" as const) : ("default" as const),
  }));

  const fmtDay = (d: Date) => d.toLocaleDateString("tr-TR");
  const todos: WorkItem[] = [
    ...vulns.map((r) => ({ key: `vul:${r.id}`, href: `/zafiyet/${r.id}`, code: r.vulnNo, title: [r.cve, r.deviceName].filter(Boolean).join(" · ") || r.description?.slice(0, 80) || "Açık zafiyet", statusLabel: r.dueDate ? `Zafiyet · son ${fmtDay(r.dueDate)}` : "Açık zafiyet", tone: late(r.dueDate) })),
    ...expiring.map((r) => ({ key: `ast:${r.id}`, href: `/envanter/${r.id}`, code: r.stockNo ?? "Envanter", title: r.name ?? r.stockNo ?? r.id, statusLabel: r.supportEndDate ? `Destek bitişi ${fmtDay(r.supportEndDate)}` : "Destek bitiyor", tone: late(r.supportEndDate) === "danger" ? ("danger" as const) : ("warning" as const) })),
    ...myPendingChanges.map((r) => ({ key: `mchg:${r.id}`, href: `/degisiklik/${r.id}`, code: r.changeNo, title: r.description?.slice(0, 90) || "Değişiklik kaydı", statusLabel: "Onay sonucu bekleniyor" })),
    ...myPendingPatches.map((r) => ({ key: `mpat:${r.id}`, href: `/yama/${r.id}`, code: r.patchNo, title: r.title, statusLabel: "Onay sonucu bekleniyor" })),
    ...myPendingInventory.map((r) => ({ key: `minv:${r.id}`, href: "/envanter/onaylar", code: r.action === "CREATE" ? "ENV-EKLE" : "ENV-SIL", title: r.action === "CREATE" ? "Envanter ekleme isteği" : "Envanter silme isteği", statusLabel: "Onay sonucu bekleniyor" })),
    ...meetings.map((r) => ({ key: `mtg:${r.id}`, href: r.sprintId ? `/cevik/sprint/${r.sprintId}` : `/cevik/urun/${r.productId}`, code: fmtDay(r.meetingDate), title: r.title, statusLabel: "Toplantı" })),
    ...drafts.map((r) => ({ key: `kb:${r.id}`, href: `/hizmetler/bilgi/${r.id}`, code: "Bilgi bankası", title: r.title, statusLabel: "Taslak, yayınlanmadı" })),
  ];

  const bySprint = new Map<string, SprintLoad>();
  for (const row of sprintItems) {
    if (!row.sprint) continue;
    const load = bySprint.get(row.sprint.id) ?? { id: row.sprint.id, name: row.sprint.name, product: row.sprint.product.name, endDate: row.sprint.endDate, items: 0, done: 0, points: 0, donePoints: 0 };
    load.items += 1;
    load.points += row.points ?? 0;
    if (row.status === "DONE") {
      load.done += 1;
      load.donePoints += row.points ?? 0;
    }
    bySprint.set(row.sprint.id, load);
  }
  const sprints = [...bySprint.values()];

  // Sayılar liste sınırından bağımsız, gerçek toplamlardır.
  const [chgN, patN, reqWaitN, prbApprN, incN, prbN, reqN, slaN, aglN, vulnN, expN, mchgN, mpatN, minvN, mtgN, kbN] = await Promise.all([
    prisma.changeRecord.count({ where: approverChange }),
    prisma.patchRecord.count({ where: { status: "PENDING", requestingManagerId: personId } }),
    prisma.serviceRequest.count({ where: { status: "WAITING", OR: [{ requestingManagerId: personId }, { handlingManagerId: personId }] } }),
    prisma.problem.count({ where: { assignmentStatus: "PENDING", infosecManagerId: personId } }),
    prisma.incident.count({ where: { status: { notIn: CLOSED_INCIDENT }, OR: [{ l1AnalystId: personId }, { l2AnalystId: personId }] } }),
    prisma.problem.count({ where: { assigneeId: personId, status: { notIn: CLOSED_PROBLEM } } }),
    prisma.serviceRequest.count({ where: { handlingManagerId: personId, status: { in: OPEN_TICKET } } }),
    prisma.slaTicket.count({ where: { ownerId: personId, status: { in: OPEN_TICKET } } }),
    prisma.agileItem.count({ where: { assigneeId: personId, status: { not: "DONE" } } }),
    prisma.vulnerability.count({ where: { ownerId: personId, status: "OPEN" } }),
    prisma.asset.count({ where: { ownerId: personId, custody: { not: "FREE" }, supportEndDate: { not: null, lte: new Date(Date.now() + EXPIRY_DAYS * 86400000) }, status: { not: "RETIRED" } } }),
    prisma.changeRecord.count({ where: { requesterId: personId, status: "PENDING" } }),
    prisma.patchRecord.count({ where: { requesterId: personId, status: "PENDING" } }),
    prisma.inventoryApproval.count({ where: { requestedById: personId, status: "PENDING" } }),
    meetings.length,
    prisma.knowledgeArticle.count({ where: { authorId: personId, status: "DRAFT" } }),
  ]);

  return {
    approvals: approvals.slice(0, LIST_LIMIT),
    assigned: assigned.slice(0, LIST_LIMIT),
    agileTasks,
    todos: todos.slice(0, LIST_LIMIT * 2),
    sprints,
    myRequests,
    counts: { approvals: chgN + patN + reqWaitN + prbApprN, assigned: incN + prbN + reqN + slaN, agileTasks: aglN, todos: vulnN + expN + mchgN + mpatN + minvN + mtgN + kbN, sprints: sprints.length },
  };
}
