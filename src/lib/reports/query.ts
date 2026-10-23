import { ASSET_TYPE_DEFS } from "@/lib/inventory/asset-types";
import { CRITICALITY_LABELS, EXPIRY_WARNING_DAYS, LIFECYCLE_STATUS_LABELS } from "@/lib/inventory/constants";
import { assetDisplayName, formatDate, formatDateTime, formatLocation } from "@/lib/inventory/format";
import {
  CHANGE_STATUS_LABELS,
  INCIDENT_STATUS_LABELS,
  PERSONNEL_ROLE_LABELS,
  PROBLEM_STATUS_LABELS,
  REQUEST_SEVERITY_LABELS,
  TICKET_STATUS_LABELS,
  VULN_SEVERITY_LABELS,
} from "@/lib/itil/constants";
import { officeLabel } from "@/lib/itil/office-names";
import { getRequestType } from "@/lib/itil/request-types";
import { visibleAssetWhere } from "@/lib/auth/acl";
import { isRequesterOnly, visibleRequestWhere, type RequestViewer } from "@/lib/itil/request-scope";
import { getSystemSettings } from "@/lib/settings-store";
import { getPersonStats } from "@/lib/person-stats";
import { AGILE_MEETING_KIND_LABELS, AGILE_PRIORITY_LABELS, AGILE_SOURCE_LABELS, AGILE_SPRINT_STATUS_LABELS, AGILE_STATUS_LABELS, AGILE_TYPE_LABELS } from "@/lib/agile/constants";
import { SCORE_MODULE_LABELS } from "@/lib/scoring-defs";
import { prisma } from "@/lib/prisma";
import { buildWorkloadDetailRows, buildWorkloadSummaryRows } from "@/lib/person-workload-report";
import { getReportDef } from "./catalog";
import { buildKpiReport, KPI_REPORT_IDS } from "./kpi";
import { dateWhere, dayEnd, dayStart, summarizeFilters } from "./filters";
import type { ReportFilters, ReportTable } from "./types";
import { scopedDbForViewer } from "@/lib/auth/data-scope";

function nowLabel() {
  return formatDateTime(new Date());
}

function searchOr(q: string | undefined, fields: string[]) {
  if (!q) return {};
  return { OR: fields.map((field) => ({ [field]: { contains: q, mode: "insensitive" as const } })) };
}

async function describe(def: NonNullable<ReturnType<typeof getReportDef>>, filters: ReportFilters) {
  const labels: Record<string, string> = {};
  if (filters.departmentId) {
    const department = await prisma.department.findUnique({ where: { id: filters.departmentId } });
    if (department) labels[`departmentId:${department.id}`] = department.name;
  }
  if (filters.vendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { id: filters.vendorId } });
    if (vendor) labels[`vendorId:${vendor.id}`] = vendor.name;
  }
  return summarizeFilters(def, filters, labels);
}

export async function buildReport(
  id: string,
  filters: ReportFilters = {},
  viewer?: RequestViewer | null,
): Promise<ReportTable | null> {
  const table = await buildReportInner(id, filters, viewer);
  if (!table) return null;
  const generatedBy = viewer?.id
    ? (await prisma.person.findUnique({ where: { id: viewer.id }, select: { fullName: true } }).catch(() => null))?.fullName
    : undefined;
  return { ...table, scope: table.scope ?? table.description, generatedBy };
}

async function buildReportInner(
  id: string,
  filters: ReportFilters = {},
  viewer?: RequestViewer | null,
): Promise<ReportTable | null> {
  const def = getReportDef(id);
  if (!def) return null;
  const generatedAt = nowLabel();
  const description = await describe(def, filters);
  const settings = viewer ? await getSystemSettings() : null;
  const grants = settings?.acl.grants ?? [];
  const officeNames = settings?.officeNames;
  const db = viewer ? await scopedDbForViewer(viewer) : prisma;
  const assetScope = viewer ? visibleAssetWhere(viewer, grants) : {};
  const requestScope = viewer ? visibleRequestWhere(viewer) : {};
  const personScope = viewer && isRequesterOnly(viewer.role) ? { id: viewer.id } : {};

  if ((KPI_REPORT_IDS as readonly string[]).includes(id)) {
    return buildKpiReport(id, filters, { description, generatedAt, viewer });
  }

  if (id === "envanter-tum") {
    const rows = await prisma.asset.findMany({
      where: {
        ...assetScope,
        ...(filters.assetType ? { assetType: filters.assetType } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.criticality ? { criticality: filters.criticality } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...searchOr(filters.q, ["name", "stockNo", "serialNo", "ipAddress", "brand", "model"]),
        ...dateWhere("createdAt", filters),
      },
      include: { owner: true, department: true },
      orderBy: [{ assetType: "asc" }, { name: "asc" }],
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "tur", label: "Tür" },
        { key: "ad", label: "Ad" },
        { key: "stok", label: "Stok no" },
        { key: "seri", label: "Seri no" },
        { key: "ip", label: "IP" },
        { key: "sahip", label: "Sahibi" },
        { key: "birim", label: "Birim" },
        { key: "kritiklik", label: "Kritiklik" },
        { key: "durum", label: "Durum" },
        { key: "konum", label: "Konum" },
        { key: "bakim", label: "Bakım bitişi" },
      ],
      rows: rows.map((row) => ({
        tur: ASSET_TYPE_DEFS[row.assetType as keyof typeof ASSET_TYPE_DEFS]?.label ?? row.assetType,
        ad: assetDisplayName(row),
        stok: row.stockNo ?? "",
        seri: row.serialNo ?? "",
        ip: row.ipAddress ?? "",
        sahip: row.owner.fullName,
        birim: row.department?.name ?? "",
        kritiklik: CRITICALITY_LABELS[row.criticality as keyof typeof CRITICALITY_LABELS] ?? row.criticality,
        durum: LIFECYCLE_STATUS_LABELS[row.status as keyof typeof LIFECYCLE_STATUS_LABELS] ?? row.status,
        konum: formatLocation(row) ?? "",
        bakim: formatDate(row.supportEndDate),
      })),
    };
  }

  if (id === "envanter-tur") {
    const types = Object.values(ASSET_TYPE_DEFS).filter((type) => !filters.assetType || type.key === filters.assetType);
    const rows = await Promise.all(
      types.map(async (type) => {
        const [total, high, vulns] = await Promise.all([
          prisma.asset.count({ where: { ...assetScope, assetType: type.key } }),
          prisma.asset.count({ where: { ...assetScope, assetType: type.key, criticality: "HIGH" } }),
          prisma.asset.count({
            where: { ...assetScope, assetType: type.key, vulnerabilities: { some: { status: "OPEN" } } },
          }),
        ]);
        return {
          tur: type.label,
          toplam: String(total),
          yuksek: String(high),
          zafiyetli: String(vulns),
        };
      }),
    );
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "tur", label: "Tür" },
        { key: "toplam", label: "Toplam" },
        { key: "yuksek", label: "Yüksek kritiklik" },
        { key: "zafiyetli", label: "Açık zafiyetli" },
      ],
      rows,
    };
  }

  if (id === "envanter-bakim") {
    const limit = new Date();
    limit.setDate(limit.getDate() + EXPIRY_WARNING_DAYS);
    const dateFilter = filters.dateFrom || filters.dateTo ? dateWhere("supportEndDate", filters) : { supportEndDate: { lte: limit } };
    const rows = await prisma.asset.findMany({
      where: {
        ...assetScope,
        ...dateFilter,
        ...(filters.assetType ? { assetType: filters.assetType } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
      include: { owner: true, department: true },
      orderBy: { supportEndDate: "asc" },
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "ad", label: "Ad" },
        { key: "tur", label: "Tür" },
        { key: "sahip", label: "Sahibi" },
        { key: "birim", label: "Birim" },
        { key: "bitis", label: "Bitiş" },
        { key: "durum", label: "Yaşam döngüsü" },
      ],
      rows: rows.map((row) => ({
        ad: assetDisplayName(row),
        tur: ASSET_TYPE_DEFS[row.assetType as keyof typeof ASSET_TYPE_DEFS]?.label ?? row.assetType,
        sahip: row.owner.fullName,
        birim: row.department?.name ?? "",
        bitis: formatDate(row.supportEndDate),
        durum: LIFECYCLE_STATUS_LABELS[row.status as keyof typeof LIFECYCLE_STATUS_LABELS] ?? row.status,
      })),
    };
  }

  if (id === "envanter-zafiyetli") {
    const rows = await prisma.asset.findMany({
      where: {
        ...assetScope,
        vulnerabilities: { some: { status: "OPEN" } },
        ...(filters.assetType ? { assetType: filters.assetType } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...searchOr(filters.q, ["name", "stockNo", "ipAddress"]),
      },
      include: {
        owner: true,
        department: true,
        vulnerabilities: { where: { status: "OPEN" }, select: { severity: true } },
      },
      orderBy: { name: "asc" },
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "ad", label: "Ad" },
        { key: "ip", label: "IP" },
        { key: "sahip", label: "Sahibi" },
        { key: "acik", label: "Açık zafiyet" },
        { key: "kritik", label: "Kritik" },
        { key: "yuksek", label: "Yüksek" },
      ],
      rows: rows.map((row) => ({
        ad: assetDisplayName(row),
        ip: row.ipAddress ?? "",
        sahip: row.owner.fullName,
        acik: String(row.vulnerabilities.length),
        kritik: String(row.vulnerabilities.filter((item) => item.severity === "CRITICAL").length),
        yuksek: String(row.vulnerabilities.filter((item) => item.severity === "HIGH").length),
      })),
    };
  }

  if (id === "personel-zimmet") {
    const rows = await db.person.findMany({
      where: {
        ...personScope,
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.role ? { role: filters.role } : {}),
        ...searchOr(filters.q, ["fullName", "sicilNo", "email", "adUsername"]),
      },
      include: { department: true, _count: { select: { assets: true } } },
      orderBy: { fullName: "asc" },
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "ad", label: "Ad soyad" },
        { key: "unvan", label: "Unvan" },
        { key: "rol", label: "Rol" },
        { key: "birim", label: "Birim" },
        { key: "zimmet", label: "Zimmet" },
        { key: "eposta", label: "E-posta" },
      ],
      rows: rows.map((row) => ({
        ad: row.fullName,
        unvan: row.title ?? "",
        rol: PERSONNEL_ROLE_LABELS[row.role as keyof typeof PERSONNEL_ROLE_LABELS] ?? row.role,
        birim: row.department?.name ?? "",
        zimmet: String(row._count.assets),
        eposta: row.email ?? "",
      })),
    };
  }

  if (id === "talepler-acik") {
    const rows = await prisma.serviceRequest.findMany({
      where: {
        ...requestScope,
        status: filters.status ? filters.status : { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
        ...(filters.office ? { office: filters.office } : {}),
        ...(filters.departmentId ? { requestingDeptId: filters.departmentId } : {}),
        ...(filters.severity ? { severity: filters.severity } : {}),
        ...searchOr(filters.q, ["requestNo", "reason", "description"]),
        ...dateWhere("requestDate", filters),
      },
      include: { requester: true, requestingDept: true },
      orderBy: { requestDate: "desc" },
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "no", label: "No" },
        { key: "tur", label: "Tür" },
        { key: "ofis", label: "Şube" },
        { key: "sahip", label: "Talep eden" },
        { key: "birim", label: "Birim" },
        { key: "siddet", label: "Önem" },
        { key: "durum", label: "Durum" },
        { key: "tarih", label: "Tarih" },
      ],
      rows: rows.map((row) => ({
        no: row.requestNo,
        tur: getRequestType(row.requestType as never)?.label ?? row.requestType,
        ofis: officeLabel(row.office, officeNames),
        sahip: row.requester.fullName,
        birim: row.requestingDept?.name ?? "",
        siddet: REQUEST_SEVERITY_LABELS[row.severity as keyof typeof REQUEST_SEVERITY_LABELS] ?? row.severity,
        durum: TICKET_STATUS_LABELS[row.status as keyof typeof TICKET_STATUS_LABELS] ?? row.status,
        tarih: formatDate(row.requestDate),
      })),
    };
  }

  if (id === "degisiklik-yama") {
    const includeChanges = !filters.kind || filters.kind === "CHANGE";
    const includePatches = !filters.kind || filters.kind === "PATCH";
    const [changes, patches] = await Promise.all([
      includeChanges
        ? db.changeRecord.findMany({
            where: {
              ...(viewer && isRequesterOnly(viewer.role) ? { requesterId: viewer.id } : {}),
              ...(filters.status ? { status: filters.status } : {}),
              ...searchOr(filters.q, ["changeNo", "changeIp", "description"]),
              ...dateWhere("requestDate", filters),
            },
            include: { requester: true },
            orderBy: { requestDate: "desc" },
            take: 400,
          })
        : [],
      includePatches
        ? db.patchRecord.findMany({
            where: {
              ...(viewer && isRequesterOnly(viewer.role) ? { requesterId: viewer.id } : {}),
              ...(filters.status ? { status: filters.status } : {}),
              ...searchOr(filters.q, ["patchNo", "title", "description"]),
              ...dateWhere("requestDate", filters),
            },
            include: { requester: true },
            orderBy: { requestDate: "desc" },
            take: 400,
          })
        : [],
    ]);
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "kaynak", label: "Kayıt" },
        { key: "no", label: "No" },
        { key: "baslik", label: "Başlık" },
        { key: "sahip", label: "Talep eden" },
        { key: "durum", label: "Durum" },
        { key: "tarih", label: "Tarih" },
      ],
      rows: [
        ...changes.map((row) => ({
          kaynak: "Değişiklik",
          no: row.changeNo,
          baslik: row.changeKind ?? row.changeIp ?? "",
          sahip: row.requester.fullName,
          durum: CHANGE_STATUS_LABELS[row.status as keyof typeof CHANGE_STATUS_LABELS] ?? row.status,
          tarih: formatDate(row.requestDate),
        })),
        ...patches.map((row) => ({
          kaynak: "Yama",
          no: row.patchNo,
          baslik: row.title,
          sahip: row.requester.fullName,
          durum: CHANGE_STATUS_LABELS[row.status as keyof typeof CHANGE_STATUS_LABELS] ?? row.status,
          tarih: formatDate(row.requestDate),
        })),
      ],
    };
  }

  if (id === "zafiyet-acik") {
    const rows = await db.vulnerability.findMany({
      where: {
        ...(viewer && isRequesterOnly(viewer.role) ? { ownerId: viewer.id } : {}),
        status: filters.status ?? "OPEN",
        ...(filters.severity ? { severity: filters.severity } : {}),
        ...(filters.source ? { source: filters.source } : {}),
        ...searchOr(filters.q, ["vulnNo", "cve", "deviceName", "deviceIp", "description"]),
        ...dateWhere("detectedAt", filters),
      },
      include: { owner: true, asset: { select: { name: true, stockNo: true } } },
      orderBy: [{ severity: "asc" }, { dueDate: "asc" }],
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "no", label: "No" },
        { key: "cve", label: "CVE" },
        { key: "cihaz", label: "Cihaz" },
        { key: "ip", label: "IP" },
        { key: "envanter", label: "Envanter" },
        { key: "seviye", label: "Seviye" },
        { key: "termin", label: "Termin" },
        { key: "kaynak", label: "Kaynak" },
      ],
      rows: rows.map((row) => ({
        no: row.vulnNo,
        cve: row.cve ?? "",
        cihaz: row.deviceName ?? "",
        ip: row.deviceIp ?? "",
        envanter: row.asset?.name ?? row.asset?.stockNo ?? "",
        seviye: VULN_SEVERITY_LABELS[row.severity as keyof typeof VULN_SEVERITY_LABELS] ?? row.severity,
        termin: formatDate(row.dueDate),
        kaynak: row.source === "SCANNER" ? "Tarayıcı" : "Manuel",
      })),
    };
  }

  if (id === "olay-problem") {
    const includeIncidents = !filters.kind || filters.kind === "INCIDENT";
    const includeProblems = !filters.kind || filters.kind === "PROBLEM";
    const [incidents, problems] = await Promise.all([
      includeIncidents
        ? db.incident.findMany({
            where: {
              ...(viewer && isRequesterOnly(viewer.role) ? { requesterId: viewer.id } : {}),
              ...(filters.status ? { status: filters.status } : {}),
              ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
              ...searchOr(filters.q, ["incidentNo", "title", "description", "ioc"]),
              ...dateWhere("startedAt", filters),
            },
            include: { department: true, l1Analyst: true, l2Analyst: true },
            orderBy: { startedAt: "desc" },
            take: 400,
          })
        : [],
      includeProblems
        ? db.problem.findMany({
            where: {
              ...(viewer && isRequesterOnly(viewer.role) ? { requesterId: viewer.id } : {}),
              ...(filters.status ? { status: filters.status } : {}),
              ...searchOr(filters.q, ["problemNo", "title", "description", "rootCause"]),
              ...dateWhere("createdAt", filters),
            },
            include: { incident: true, assignee: true, proposedAssignee: true },
            orderBy: { createdAt: "desc" },
            take: 400,
          })
        : [],
    ]);
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "kaynak", label: "Kayıt" },
        { key: "no", label: "No" },
        { key: "baslik", label: "Başlık" },
        { key: "durum", label: "Durum" },
        { key: "onem", label: "Önem" },
        { key: "katman", label: "Seviye" },
        { key: "analist", label: "Analist" },
        { key: "tarih", label: "Tarih" },
      ],
      rows: [
        ...incidents.map((row) => ({
          kaynak: "Olay",
          no: row.incidentNo,
          baslik: row.title,
          durum: INCIDENT_STATUS_LABELS[row.status as keyof typeof INCIDENT_STATUS_LABELS] ?? row.status,
          onem: REQUEST_SEVERITY_LABELS[row.severity as keyof typeof REQUEST_SEVERITY_LABELS] ?? row.severity,
          katman: row.layer === "L2" ? "Seviye 2" : "Seviye 1",
          analist: row.l2Analyst?.fullName ?? row.l1Analyst?.fullName ?? "—",
          tarih: formatDate(row.startedAt),
        })),
        ...problems.map((row) => ({
          kaynak: "Problem",
          no: row.problemNo,
          baslik: `${row.title}${row.assignee ? ` · ${row.assignee.fullName}` : row.proposedAssignee ? ` · önerilen ${row.proposedAssignee.fullName}` : ""}`,
          durum: PROBLEM_STATUS_LABELS[row.status as keyof typeof PROBLEM_STATUS_LABELS] ?? row.status,
          onem: "—",
          katman: "—",
          analist: row.assignee?.fullName ?? row.proposedAssignee?.fullName ?? "—",
          tarih: formatDate(row.createdAt),
        })),
      ],
    };
  }

  if (id === "firma-sla") {
    const includeVendors = !filters.kind || filters.kind === "VENDOR";
    const includeTickets = !filters.kind || filters.kind === "SLA";
    const [vendors, tickets] = await Promise.all([
      includeVendors
        ? prisma.vendor.findMany({
            where: searchOr(filters.q, ["name", "contact1Phone", "contact1Email", "phone", "email"]),
            orderBy: { name: "asc" },
          })
        : [],
      includeTickets
        ? db.slaTicket.findMany({
            where: {
              ...(viewer && isRequesterOnly(viewer.role) ? { requesterId: viewer.id } : {}),
              ...(filters.status ? { status: filters.status } : {}),
              ...(filters.severity ? { severity: filters.severity } : {}),
              ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
              ...searchOr(filters.q, ["ticketNo", "title", "application", "description"]),
            },
            include: { vendor: true, product: true },
            orderBy: { openedAt: "desc" },
          })
        : [],
    ]);
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "kaynak", label: "Kayıt" },
        { key: "ad", label: "Ad / No" },
        { key: "detay", label: "Detay" },
        { key: "durum", label: "Durum" },
      ],
      rows: [
        ...vendors.map((row) => ({
          kaynak: "Firma",
          ad: row.name,
          detay: row.contact1Phone ?? row.phone ?? row.contact1Email ?? "",
          durum: "",
        })),
        ...tickets.map((row) => ({
          kaynak: "SLA",
          ad: row.ticketNo,
          detay: `${row.title}${row.vendor ? ` · ${row.vendor.name}` : ""}${row.product ? ` · ${row.product.name}` : ""}${row.slaLevel ? ` · Seviye ${row.slaLevel}` : ""}`,
          durum: TICKET_STATUS_LABELS[row.status as keyof typeof TICKET_STATUS_LABELS] ?? row.status,
        })),
      ],
    };
  }

  if (id === "personel-performans" || id === "personel-performans-detay") {
    const people = await db.person.findMany({
      where: {
        ...personScope,
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...searchOr(filters.q, ["fullName", "sicilNo", "title"]),
      },
      include: { department: true },
      orderBy: { fullName: "asc" },
    });
    const stats = await getPersonStats(
      people.map((person) => person.id),
      { from: dayStart(filters.dateFrom), to: dayEnd(filters.dateTo) },
    );
    if (id === "personel-performans") {
      const list = people
        .map((person) => ({ person, stat: stats.get(person.id) }))
        .sort((a, b) => (b.stat?.points ?? 0) - (a.stat?.points ?? 0));
      return {
        id,
        title: def.title,
        description,
        generatedAt,
        columns: [
          { key: "sira", label: "Sıra" },
          { key: "ad", label: "Ad soyad" },
          { key: "birim", label: "Birim" },
          { key: "acilan", label: "Açtığı çağrı" },
          { key: "kapatilan", label: "Kapattığı çağrı" },
          { key: "giris", label: "Diğer süreç girişi" },
          { key: "guncelleme", label: "Diğer süreç güncelleme" },
          { key: "tamamlama", label: "Diğer süreç tamamlama" },
          { key: "puan", label: "Toplam puan" },
        ],
        rows: list.map(({ person, stat }, index) => ({
          sira: String(index + 1),
          ad: person.fullName,
          birim: person.department?.name ?? "",
          acilan: String(stat?.opened ?? 0),
          kapatilan: String(stat?.closed ?? 0),
          giris: String(stat?.otherCreated ?? 0),
          guncelleme: String(stat?.otherUpdated ?? 0),
          tamamlama: String(stat?.otherCompleted ?? 0),
          puan: String(stat?.points ?? 0),
        })),
      };
    }
    const rows: Record<string, string>[] = [];
    for (const person of people) {
      const stat = stats.get(person.id);
      for (const m of [...(stat?.byModule ?? [])].sort((a, b) => b.points - a.points)) {
        rows.push({
          ad: person.fullName,
          birim: person.department?.name ?? "",
          surec: SCORE_MODULE_LABELS[m.module] ?? m.module,
          giris: String(m.created),
          guncelleme: String(m.updated),
          tamamlama: String(m.completed),
          puan: String(m.points),
        });
      }
    }
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "ad", label: "Ad soyad" },
        { key: "birim", label: "Birim" },
        { key: "surec", label: "Süreç" },
        { key: "giris", label: "Giriş" },
        { key: "guncelleme", label: "Güncelleme" },
        { key: "tamamlama", label: "Tamamlama" },
        { key: "puan", label: "Puan" },
      ],
      rows,
    };
  }

  if (id === "personel-is-yuku" || id === "personel-is-yuku-detay") {
    const people = await db.person.findMany({
      where: {
        ...personScope,
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...searchOr(filters.q, ["fullName", "sicilNo", "title"]),
      },
      select: { id: true, fullName: true, department: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    });
    if (id === "personel-is-yuku") {
      return {
        id,
        title: def.title,
        description,
        generatedAt,
        columns: [
          { key: "ad", label: "Ad soyad" },
          { key: "birim", label: "Birim" },
          { key: "onay", label: "Bekleyen onay" },
          { key: "is", label: "Üzerindeki iş" },
          { key: "cevik", label: "Çevik görev" },
          { key: "diger", label: "Diğer yapılacak" },
          { key: "sprint", label: "Aktif sprint" },
          { key: "talep", label: "Açık taleplerim" },
          { key: "toplam", label: "Toplam yük" },
        ],
        rows: await buildWorkloadSummaryRows(people),
      };
    }
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "ad", label: "Ad soyad" },
        { key: "birim", label: "Birim" },
        { key: "tur", label: "Tür" },
        { key: "kod", label: "Kayıt no / ürün" },
        { key: "baslik", label: "Başlık" },
        { key: "durum", label: "Durum" },
      ],
      rows: await buildWorkloadDetailRows(people),
    };
  }

  if (id === "agile-sprint") {
    const rows = await prisma.agileSprint.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...searchOr(filters.q, ["name", "product.name"]),
        ...dateWhere("createdAt", filters),
      },
      include: { product: { select: { name: true } }, items: { select: { points: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "urun", label: "Ürün" },
        { key: "sprint", label: "Sprint" },
        { key: "durum", label: "Durum" },
        { key: "baslangic", label: "Başlangıç" },
        { key: "bitis", label: "Bitiş" },
        { key: "kapasite", label: "Kapasite" },
        { key: "planlanan", label: "Planlanan puan" },
        { key: "biten", label: "Biten puan (velocity)" },
        { key: "is", label: "İş sayısı" },
      ],
      rows: rows.map((row) => ({
        urun: row.product.name,
        sprint: row.name,
        durum: AGILE_SPRINT_STATUS_LABELS[row.status] ?? row.status,
        baslangic: row.startDate ? formatDate(row.startDate) : "",
        bitis: row.endDate ? formatDate(row.endDate) : "",
        kapasite: row.capacity != null ? String(row.capacity) : "",
        planlanan: String(row.items.reduce((s, i) => s + (i.points ?? 0), 0)),
        biten: String(row.items.filter((i) => i.status === "DONE").reduce((s, i) => s + (i.points ?? 0), 0)),
        is: String(row.items.length),
      })),
    };
  }

  if (id === "agile-is-yuku") {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const people = await db.person.findMany({
      where: {
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...searchOr(filters.q, ["fullName", "sicilNo"]),
        agileItemsAssigned: { some: {} },
      },
      include: { department: true, agileItemsAssigned: { select: { status: true, points: true, completedAt: true } } },
      orderBy: { fullName: "asc" },
    });
    const list = people.map((person) => {
      const open = person.agileItemsAssigned.filter((i) => i.status !== "DONE");
      const recent = person.agileItemsAssigned.filter((i) => i.status === "DONE" && i.completedAt && i.completedAt >= since);
      const sum = (rows: { points: number | null }[]) => rows.reduce((s, i) => s + (i.points ?? 0), 0);
      return { person, open: open.length, openPts: sum(open), progress: open.filter((i) => i.status === "IN_PROGRESS" || i.status === "REVIEW").length, done: recent.length, donePts: sum(recent) };
    });
    list.sort((a, b) => b.openPts - a.openPts);
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "ad", label: "Ad soyad" },
        { key: "birim", label: "Birim" },
        { key: "acik", label: "Açık iş" },
        { key: "acikPuan", label: "Açık puan" },
        { key: "devam", label: "Devam eden / incelemede" },
        { key: "biten", label: "Son 30 gün biten iş" },
        { key: "bitenPuan", label: "Son 30 gün biten puan" },
      ],
      rows: list.map((r) => ({
        ad: r.person.fullName,
        birim: r.person.department?.name ?? "",
        acik: String(r.open),
        acikPuan: String(r.openPts),
        devam: String(r.progress),
        biten: String(r.done),
        bitenPuan: String(r.donePts),
      })),
    };
  }

  if (id === "agile-epik") {
    const epics = await db.agileItem.findMany({
      where: { type: "EPIC", ...searchOr(filters.q, ["title", "itemNo", "product.name"]) },
      include: { product: { select: { name: true } }, children: { select: { status: true, points: true } } },
      orderBy: [{ productId: "asc" }, { itemNo: "asc" }],
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "urun", label: "Ürün" },
        { key: "no", label: "No" },
        { key: "epik", label: "Epik" },
        { key: "oncelik", label: "Öncelik" },
        { key: "is", label: "Bağlı iş" },
        { key: "toplam", label: "Toplam puan" },
        { key: "biten", label: "Biten puan" },
        { key: "yuzde", label: "İlerleme %" },
      ],
      rows: epics.map((e) => {
        const total = e.children.reduce((s, c) => s + (c.points ?? 0), 0);
        const done = e.children.filter((c) => c.status === "DONE").reduce((s, c) => s + (c.points ?? 0), 0);
        return {
          urun: e.product.name,
          no: e.itemNo,
          epik: e.title,
          oncelik: AGILE_PRIORITY_LABELS[e.priority] ?? e.priority,
          is: String(e.children.length),
          toplam: String(total),
          biten: String(done),
          yuzde: String(total ? Math.round((done / total) * 100) : e.status === "DONE" ? 100 : 0),
        };
      }),
    };
  }

  if (id === "agile-toplanti") {
    const rows = await db.agileMeeting.findMany({
      where: {
        ...(filters.kind ? { kind: filters.kind } : {}),
        ...searchOr(filters.q, ["title", "notes", "decisions", "attendees"]),
        ...dateWhere("meetingDate", filters),
      },
      include: { product: { select: { name: true } }, sprint: { select: { name: true } } },
      orderBy: { meetingDate: "desc" },
      take: 500,
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "tarih", label: "Tarih" },
        { key: "tur", label: "Tür" },
        { key: "baslik", label: "Başlık" },
        { key: "urun", label: "Ürün" },
        { key: "sprint", label: "Sprint" },
        { key: "katilimci", label: "Katılımcılar" },
        { key: "notlar", label: "Notlar" },
        { key: "kararlar", label: "Kararlar / aksiyonlar" },
      ],
      rows: rows.map((m) => ({
        tarih: formatDate(m.meetingDate),
        tur: AGILE_MEETING_KIND_LABELS[m.kind] ?? m.kind,
        baslik: m.title,
        urun: m.product.name,
        sprint: m.sprint?.name ?? "",
        katilimci: m.attendees ?? "",
        notlar: m.notes ?? "",
        kararlar: m.decisions ?? "",
      })),
    };
  }

  if (id === "agile-isler") {
    const rows = await db.agileItem.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...searchOr(filters.q, ["itemNo", "title", "sourceNo"]),
        ...dateWhere("createdAt", filters),
      },
      include: { product: { select: { name: true } }, sprint: { select: { name: true } }, assignee: { select: { fullName: true } } },
      orderBy: [{ productId: "asc" }, { itemNo: "asc" }],
      take: 1000,
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "no", label: "No" },
        { key: "urun", label: "Ürün" },
        { key: "baslik", label: "Başlık" },
        { key: "tur", label: "Tür" },
        { key: "oncelik", label: "Öncelik" },
        { key: "durum", label: "Durum" },
        { key: "puan", label: "Puan" },
        { key: "sprint", label: "Sprint" },
        { key: "sorumlu", label: "Sorumlu" },
        { key: "kaynak", label: "ITIL kaynağı" },
      ],
      rows: rows.map((row) => ({
        no: row.itemNo,
        urun: row.product.name,
        baslik: row.title,
        tur: AGILE_TYPE_LABELS[row.type] ?? row.type,
        oncelik: AGILE_PRIORITY_LABELS[row.priority] ?? row.priority,
        durum: AGILE_STATUS_LABELS[row.status] ?? row.status,
        puan: row.points != null ? String(row.points) : "",
        sprint: row.sprint?.name ?? "",
        sorumlu: row.assignee?.fullName ?? "",
        kaynak: row.sourceType ? `${AGILE_SOURCE_LABELS[row.sourceType] ?? row.sourceType} ${row.sourceNo ?? ""}`.trim() : "",
      })),
    };
  }

  if (id === "hareketler") {
    const rows = await prisma.activityLog.findMany({
      where: {
        ...(Object.keys(assetScope).length ? { asset: assetScope } : {}),
        ...searchOr(filters.q, ["action", "note", "actor", "entityType"]),
        ...dateWhere("createdAt", filters),
      },
      include: { asset: { select: { name: true, stockNo: true } } },
      orderBy: { createdAt: "desc" },
      take: 400,
    });
    return {
      id,
      title: def.title,
      description,
      generatedAt,
      columns: [
        { key: "tarih", label: "Tarih" },
        { key: "eylem", label: "Eylem" },
        { key: "varlik", label: "Varlık" },
        { key: "not", label: "Not" },
        { key: "aktor", label: "Aktör" },
      ],
      rows: rows.map((row) => ({
        tarih: formatDateTime(row.createdAt),
        eylem: row.action,
        varlik: row.asset?.name ?? row.asset?.stockNo ?? row.entityType ?? "",
        not: row.note ?? "",
        aktor: row.actor ?? "",
      })),
    };
  }

  return null;
}
