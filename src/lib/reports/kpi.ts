import type { RequestViewer } from "@/lib/itil/request-scope";
import { visibleRequestWhere } from "@/lib/itil/request-scope";
import { PERSONNEL_ROLE_LABELS, REQUEST_SEVERITY_LABELS, VULN_SEVERITY_LABELS } from "@/lib/itil/constants";
import { getLicenseState } from "@/lib/license";
import { prisma } from "@/lib/prisma";
import { scopedDbForViewer } from "@/lib/auth/data-scope";
import { getSystemSettings } from "@/lib/settings-store";
import { MODULE_LABELS } from "@/lib/auth/rbac";
import { MODULE_LEVEL_LABELS, MODULE_SCOPE_LABELS } from "@/lib/auth/acl";
import { formatDateTime } from "@/lib/inventory/format";

import { getReportDef } from "./catalog";
import { dayEnd, dayStart } from "./filters";
import type { ReportFilters, ReportTable } from "./types";

export const KPI_REPORT_IDS = [
  "yonetici-ozeti",
  "sla-uyum",
  "cozum-suresi",
  "acik-yaslandirma",
  "degisiklik-basari",
  "zafiyet-termin",
  "onay-sureleri",
  "erisim-denetimi",
  "yetki-matrisi",
] as const;

const DAY = 86_400_000;
const HOUR = 3_600_000;
const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const FINAL_CHANGE = ["COMPLETED", "REJECTED", "CANCELLED"];

const pct = (part: number, whole: number) => (whole > 0 ? `%${Math.round((part / whole) * 100)}` : "—");
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const fix = (value: number | null, digits = 1) => (value === null ? "—" : value.toFixed(digits));
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const sevLabel = (value: string) =>
  (REQUEST_SEVERITY_LABELS as Record<string, string>)[value] ?? (VULN_SEVERITY_LABELS as Record<string, string>)[value] ?? value;

function period(filters: ReportFilters) {
  const gte = dayStart(filters.dateFrom);
  const lte = dayEnd(filters.dateTo);
  return { gte, lte, any: Boolean(gte || lte) };
}

function between(field: string, filters: ReportFilters) {
  const p = period(filters);
  if (!p.any) return {};
  return { [field]: { ...(p.gte ? { gte: p.gte } : {}), ...(p.lte ? { lte: p.lte } : {}) } };
}

function periodText(filters: ReportFilters) {
  if (!filters.dateFrom && !filters.dateTo) return "Tüm zamanlar";
  return `${filters.dateFrom ?? "…"} – ${filters.dateTo ?? "…"}`;
}

type Base = { description: string; generatedAt: string; viewer?: RequestViewer | null };

export async function buildKpiReport(id: string, filters: ReportFilters, base: Base): Promise<ReportTable | null> {
  const def = getReportDef(id);
  if (!def) return null;
  const db = base.viewer ? await scopedDbForViewer(base.viewer) : prisma;
  const requestScope = base.viewer ? visibleRequestWhere(base.viewer) : {};
  const now = new Date();
  const head = { id, title: def.title, description: base.description, generatedAt: base.generatedAt };

  if (id === "sla-uyum") {
    const [requests, incidents] = await Promise.all([
      db.serviceRequest.findMany({
        where: { ...requestScope, ...between("requestDate", filters) },
        select: { severity: true, status: true, resolveDueAt: true, resolvedAt: true, updatedAt: true },
      }),
      db.incident.findMany({
        where: between("startedAt", filters),
        select: { severity: true, status: true, resolveDueAt: true, resolvedAt: true, endedAt: true },
      }),
    ]);
    type Item = { severity: string; due: Date | null; done: Date | null; open: boolean };
    const toItems = {
      Talep: requests.map((r): Item => ({
        severity: r.severity,
        due: r.resolveDueAt,
        done: r.resolvedAt ?? (r.status === "DONE" ? r.updatedAt : null),
        open: ["OPEN", "IN_PROGRESS", "WAITING"].includes(r.status),
      })),
      Olay: incidents.map((r): Item => ({
        severity: r.severity,
        due: r.resolveDueAt,
        done: r.resolvedAt ?? r.endedAt,
        open: !["RESOLVED", "CLOSED"].includes(r.status),
      })),
    };
    const rows: Record<string, string>[] = [];
    let met = 0;
    let breached = 0;
    for (const [source, items] of Object.entries(toItems)) {
      for (const severity of SEVERITIES) {
        const list = items.filter((i) => i.severity === severity);
        if (!list.length) continue;
        let ok = 0;
        let late = 0;
        let running = 0;
        for (const item of list) {
          if (!item.due) {
            if (item.open) running += 1;
            continue;
          }
          if (item.done) {
            if (item.done.getTime() <= item.due.getTime()) ok += 1;
            else late += 1;
          } else if (item.due.getTime() < now.getTime()) late += 1;
          else running += 1;
        }
        met += ok;
        breached += late;
        rows.push({
          kaynak: source,
          onem: sevLabel(severity),
          toplam: String(list.length),
          zamaninda: String(ok),
          gecikmis: String(late),
          surede: String(running),
          uyum: pct(ok, ok + late),
        });
      }
    }
    return {
      ...head,
      columns: [
        { key: "kaynak", label: "Kaynak" },
        { key: "onem", label: "Önem" },
        { key: "toplam", label: "Toplam" },
        { key: "zamaninda", label: "Süresinde çözülen" },
        { key: "gecikmis", label: "SLA aşımı" },
        { key: "surede", label: "Süresi dolmamış açık" },
        { key: "uyum", label: "SLA uyum oranı" },
      ],
      rows,
      summary: [
        { label: "Dönem", value: periodText(filters) },
        { label: "Genel SLA uyumu", value: pct(met, met + breached) },
        { label: "SLA aşımı", value: String(breached) },
      ],
      notes: ["SLA uyumu = süresinde çözülen / (süresinde çözülen + aşım). Hedef süresi tanımsız kayıtlar oran dışıdır."],
    };
  }

  if (id === "cozum-suresi") {
    const [requests, incidents] = await Promise.all([
      db.serviceRequest.findMany({
        where: { ...requestScope, ...between("requestDate", filters), resolvedAt: { not: null } },
        select: { severity: true, requestDate: true, resolvedAt: true },
      }),
      db.incident.findMany({
        where: { ...between("startedAt", filters), resolvedAt: { not: null } },
        select: { severity: true, startedAt: true, resolvedAt: true, respondedAt: true },
      }),
    ]);
    const rows: Record<string, string>[] = [];
    const all: number[] = [];
    const add = (source: string, severity: string, hours: number[], respond: number[]) => {
      if (!hours.length) return;
      all.push(...hours);
      rows.push({
        kaynak: source,
        onem: sevLabel(severity),
        adet: String(hours.length),
        ortalama: fix(avg(hours)),
        medyan: fix(median(hours)),
        enuzun: fix(Math.max(...hours)),
        yanit: respond.length ? fix(avg(respond)) : "—",
      });
    };
    for (const severity of SEVERITIES) {
      add(
        "Talep",
        severity,
        requests
          .filter((r) => r.severity === severity && r.resolvedAt)
          .map((r) => (r.resolvedAt!.getTime() - r.requestDate.getTime()) / HOUR),
        [],
      );
    }
    for (const severity of SEVERITIES) {
      const list = incidents.filter((r) => r.severity === severity && r.resolvedAt);
      add(
        "Olay",
        severity,
        list.map((r) => (r.resolvedAt!.getTime() - r.startedAt.getTime()) / HOUR),
        list.filter((r) => r.respondedAt).map((r) => (r.respondedAt!.getTime() - r.startedAt.getTime()) / HOUR),
      );
    }
    return {
      ...head,
      columns: [
        { key: "kaynak", label: "Kaynak" },
        { key: "onem", label: "Önem" },
        { key: "adet", label: "Çözülen kayıt" },
        { key: "ortalama", label: "Ort. çözüm (saat) — MTTR" },
        { key: "medyan", label: "Medyan (saat)" },
        { key: "enuzun", label: "En uzun (saat)" },
        { key: "yanit", label: "Ort. ilk yanıt (saat) — MTTA" },
      ],
      rows,
      summary: [
        { label: "Dönem", value: periodText(filters) },
        { label: "Çözülen kayıt", value: String(all.length) },
        { label: "Genel ort. çözüm", value: all.length ? `${fix(avg(all))} saat` : "—" },
      ],
      notes: ["Süreler kayıt açılışından çözüm zamanına kadardır (takvim saati). MTTA yalnızca olay kayıtları için hesaplanır."],
    };
  }

  if (id === "acik-yaslandirma") {
    const [requests, incidents, problems, changes, patches, vulns] = await Promise.all([
      db.serviceRequest.findMany({ where: { ...requestScope, status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } }, select: { requestDate: true } }),
      db.incident.findMany({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } }, select: { startedAt: true } }),
      db.problem.findMany({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } }, select: { createdAt: true } }),
      db.changeRecord.findMany({ where: { status: { notIn: FINAL_CHANGE } }, select: { requestDate: true } }),
      db.patchRecord.findMany({ where: { status: { notIn: FINAL_CHANGE } }, select: { requestDate: true } }),
      db.vulnerability.findMany({ where: { status: "OPEN" }, select: { detectedAt: true } }),
    ]);
    const sets: Array<[string, Date[]]> = [
      ["Talep", requests.map((r) => r.requestDate)],
      ["Olay", incidents.map((r) => r.startedAt)],
      ["Problem", problems.map((r) => r.createdAt)],
      ["Değişiklik", changes.map((r) => r.requestDate)],
      ["Yama", patches.map((r) => r.requestDate)],
      ["Zafiyet", vulns.map((r) => r.detectedAt)],
    ];
    let total = 0;
    let old = 0;
    const rows = sets.map(([name, dates]) => {
      const ages = dates.map((d) => Math.max(0, (now.getTime() - d.getTime()) / DAY));
      const bucket = (min: number, max: number) => String(ages.filter((a) => a >= min && a < max).length);
      total += ages.length;
      old += ages.filter((a) => a >= 30).length;
      return {
        kaynak: name,
        toplam: String(ages.length),
        b0: bucket(0, 4),
        b1: bucket(4, 8),
        b2: bucket(8, 31),
        b3: bucket(31, 91),
        b4: bucket(91, Number.POSITIVE_INFINITY),
        ortalama: fix(avg(ages)),
        enyasli: ages.length ? fix(Math.max(...ages), 0) : "—",
      };
    });
    return {
      ...head,
      columns: [
        { key: "kaynak", label: "Kaynak" },
        { key: "toplam", label: "Açık kayıt" },
        { key: "b0", label: "0–3 gün" },
        { key: "b1", label: "4–7 gün" },
        { key: "b2", label: "8–30 gün" },
        { key: "b3", label: "31–90 gün" },
        { key: "b4", label: "90+ gün" },
        { key: "ortalama", label: "Ort. yaş (gün)" },
        { key: "enyasli", label: "En eski (gün)" },
      ],
      rows,
      summary: [
        { label: "Toplam açık kayıt", value: String(total) },
        { label: "30 günden eski", value: `${old} (${pct(old, total)})` },
      ],
      notes: ["Yaşlandırma anlık durumu gösterir; tarih filtresi uygulanmaz."],
    };
  }

  if (id === "degisiklik-basari") {
    const [changes, patches] = await Promise.all([
      db.changeRecord.findMany({ where: between("requestDate", filters), select: { changeType: true, status: true, requestDate: true, approvalDate: true } }),
      db.patchRecord.findMany({ where: between("requestDate", filters), select: { status: true, requestDate: true, approvalDate: true } }),
    ]);
    type Row = { status: string; requestDate: Date; approvalDate: Date | null };
    const groups: Array<[string, Row[]]> = [];
    const types = [...new Set(changes.map((c) => c.changeType))].sort();
    for (const type of types) groups.push([`Değişiklik · ${type}`, changes.filter((c) => c.changeType === type)]);
    groups.push(["Yama", patches]);
    let done = 0;
    let closed = 0;
    const rows = groups
      .filter(([, list]) => list.length)
      .map(([name, list]) => {
        const ok = list.filter((r) => r.status === "COMPLETED").length;
        const rej = list.filter((r) => r.status === "REJECTED").length;
        const can = list.filter((r) => r.status === "CANCELLED").length;
        const run = list.length - ok - rej - can;
        done += ok;
        closed += ok + rej + can;
        const waits = list.filter((r) => r.approvalDate).map((r) => (r.approvalDate!.getTime() - r.requestDate.getTime()) / DAY);
        return {
          tur: name,
          toplam: String(list.length),
          tamam: String(ok),
          red: String(rej),
          iptal: String(can),
          surec: String(run),
          basari: pct(ok, ok + rej + can),
          onay: fix(avg(waits)),
        };
      });
    return {
      ...head,
      columns: [
        { key: "tur", label: "Tür" },
        { key: "toplam", label: "Toplam" },
        { key: "tamam", label: "Tamamlanan" },
        { key: "red", label: "Reddedilen" },
        { key: "iptal", label: "İptal" },
        { key: "surec", label: "Devam eden" },
        { key: "basari", label: "Tamamlanma oranı" },
        { key: "onay", label: "Ort. onay süresi (gün)" },
      ],
      rows,
      summary: [
        { label: "Dönem", value: periodText(filters) },
        { label: "Genel tamamlanma oranı", value: pct(done, closed) },
      ],
      notes: ["Oran = tamamlanan / (tamamlanan + reddedilen + iptal). Devam eden kayıtlar orana dahil değildir."],
    };
  }

  if (id === "zafiyet-termin") {
    const list = await db.vulnerability.findMany({
      where: between("detectedAt", filters),
      select: { severity: true, status: true, detectedAt: true, dueDate: true, closeDays: true },
    });
    let open = 0;
    let overdue = 0;
    const rows = SEVERITIES.map((severity) => {
      const items = list.filter((v) => v.severity === severity);
      const opens = items.filter((v) => v.status === "OPEN");
      const late = opens.filter((v) => v.dueDate && v.dueDate.getTime() < now.getTime());
      const closed = items.filter((v) => v.status === "CLOSED");
      const closeDays = closed.map((v) => v.closeDays).filter((v): v is number => typeof v === "number");
      open += opens.length;
      overdue += late.length;
      return {
        seviye: sevLabel(severity),
        toplam: String(items.length),
        acik: String(opens.length),
        asim: String(late.length),
        uyum: pct(opens.length - late.length, opens.length),
        kapanan: String(closed.length),
        kapanis: fix(avg(closeDays)),
        yas: fix(avg(opens.map((v) => (now.getTime() - v.detectedAt.getTime()) / DAY))),
      };
    }).filter((row) => row.toplam !== "0");
    return {
      ...head,
      columns: [
        { key: "seviye", label: "Seviye" },
        { key: "toplam", label: "Toplam" },
        { key: "acik", label: "Açık" },
        { key: "asim", label: "Termin aşımı" },
        { key: "uyum", label: "Termin uyumu (açık)" },
        { key: "kapanan", label: "Kapatılan" },
        { key: "kapanis", label: "Ort. kapanış (gün)" },
        { key: "yas", label: "Açıkların ort. yaşı (gün)" },
      ],
      rows,
      summary: [
        { label: "Dönem (tespit)", value: periodText(filters) },
        { label: "Açık zafiyet", value: String(open) },
        { label: "Termin aşımı", value: String(overdue) },
      ],
    };
  }

  if (id === "onay-sureleri") {
    const instances = await prisma.workflowInstance.findMany({
      where: between("createdAt", filters),
      select: { entityType: true, status: true, createdAt: true, updatedAt: true },
    });
    const names: Record<string, string> = { request: "Talep", change: "Değişiklik", patch: "Yama" };
    const rows = Object.keys(names)
      .map((entity) => {
        const list = instances.filter((i) => i.entityType === entity);
        const finished = list.filter((i) => i.status !== "RUNNING");
        const hours = finished.map((i) => (i.updatedAt.getTime() - i.createdAt.getTime()) / HOUR);
        const running = list.filter((i) => i.status === "RUNNING");
        const wait = running.map((i) => (now.getTime() - i.updatedAt.getTime()) / HOUR);
        const approved = list.filter((i) => i.status === "APPROVED").length;
        const rejected = list.filter((i) => i.status === "REJECTED").length;
        return {
          tur: names[entity],
          toplam: String(list.length),
          bekleyen: String(running.length),
          onay: String(approved),
          red: String(rejected),
          oran: pct(approved, approved + rejected),
          sure: fix(avg(hours)),
          bekleme: wait.length ? fix(Math.max(...wait)) : "—",
        };
      })
      .filter((row) => row.toplam !== "0");
    return {
      ...head,
      columns: [
        { key: "tur", label: "Kayıt türü" },
        { key: "toplam", label: "Başlatılan zincir" },
        { key: "bekleyen", label: "Onay bekleyen" },
        { key: "onay", label: "Onaylanan" },
        { key: "red", label: "Reddedilen" },
        { key: "oran", label: "Onay oranı" },
        { key: "sure", label: "Ort. tamamlanma (saat)" },
        { key: "bekleme", label: "En uzun bekleyen adım (saat)" },
      ],
      rows,
      summary: [
        { label: "Dönem", value: periodText(filters) },
        { label: "Onay bekleyen zincir", value: String(instances.filter((i) => i.status === "RUNNING").length) },
      ],
      notes: ["Süre, zincirin başlangıcından son kararına kadardır."],
    };
  }

  if (id === "erisim-denetimi") {
    const [people, license] = await Promise.all([
      prisma.person.findMany({ select: { role: true, adUsername: true, lockedUntil: true, failedLogins: true } }),
      getLicenseState(),
    ]);
    const rows: Record<string, string>[] = [];
    const add = (alan: string, gosterge: string, deger: string, aciklama = "") => rows.push({ alan, gosterge, deger, aciklama });
    add("Lisans", "Kullanılan / izin verilen kullanıcı", `${license.used} / ${license.maxUsers}`, license.message);
    add("Lisans", "Lisans bitişi", license.expires ?? "Süresiz / deneme", license.daysLeft === null ? "" : `${license.daysLeft} gün kaldı`);
    add("Hesap", "Toplam hesap", String(people.length));
    add("Hesap", "Active Directory hesabı", String(people.filter((p) => p.adUsername).length));
    const locked = people.filter((p) => p.lockedUntil && p.lockedUntil.getTime() > now.getTime()).length;
    add("Hesap", "Şu an kilitli hesap", String(locked), "Hatalı giriş sınırı aşıldı");
    add("Hesap", "Hatalı giriş sayacı > 0", String(people.filter((p) => p.failedLogins > 0).length));
    for (const [role, label] of Object.entries(PERSONNEL_ROLE_LABELS)) {
      const n = people.filter((p) => p.role === role).length;
      if (n) add("Rol dağılımı", label, String(n));
    }
    return {
      ...head,
      columns: [
        { key: "alan", label: "Alan" },
        { key: "gosterge", label: "Gösterge" },
        { key: "deger", label: "Değer" },
        { key: "aciklama", label: "Açıklama" },
      ],
      rows,
      summary: [
        { label: "Toplam hesap", value: String(people.length) },
        { label: "Kilitli hesap", value: String(locked) },
        { label: "Lisans doluluğu", value: pct(license.used, license.maxUsers) },
      ],
      notes: ["Yetki ve erişim incelemesi için denetim kanıtı olarak kullanılabilir."],
    };
  }

  if (id === "yetki-matrisi") {
    const settings = await getSystemSettings();
    const q = (filters.q ?? "").toLocaleLowerCase("tr-TR");
    const rows: Record<string, string>[] = [];
    const add = (tur: string, kaynak: string, hedef: string, duzey = "", kapsam = "") => rows.push({ tur, kaynak, hedef, duzey, kapsam });
    for (const g of settings.acl.grants)
      add("Modül yetkisi", g.group, MODULE_LABELS[g.module] ?? g.module, MODULE_LEVEL_LABELS[g.level], g.scopes?.length ? g.scopes.map((s) => MODULE_SCOPE_LABELS[s]).join(", ") : "Varsayılan kural");
    for (const m of settings.ad.roleMaps) add("AD grubu → rol", m.group, PERSONNEL_ROLE_LABELS[m.role] ?? m.role);
    add("AD grubu → rol", "(eşleşme yok)", PERSONNEL_ROLE_LABELS[settings.ad.defaultRole] ?? settings.ad.defaultRole, "varsayılan");
    for (const [type, group] of Object.entries(settings.requestGroups)) if (group) add("Talep türü → AD grubu", group, type);
    const shown = q ? rows.filter((r) => Object.values(r).some((v) => v.toLocaleLowerCase("tr-TR").includes(q))) : rows;
    return {
      ...head,
      columns: [
        { key: "tur", label: "Tür" },
        { key: "kaynak", label: "Grup / kaynak" },
        { key: "hedef", label: "Modül / rol / talep türü" },
        { key: "duzey", label: "Düzey" },
        { key: "kapsam", label: "Kapsam" },
      ],
      rows: shown,
      summary: [
        { label: "Modül yetkisi satırı", value: String(settings.acl.grants.length) },
        { label: "AD grubu → rol satırı", value: String(settings.ad.roleMaps.length) },
        { label: "Eşlenmiş talep türü", value: String(Object.values(settings.requestGroups).filter(Boolean).length) },
      ],
      notes: ["Ayarlar → Yetki ve roller sayfasındaki mevcut yapılandırmanın dökümüdür; yetki inceleme kanıtı olarak kullanılabilir."],
    };
  }

  if (id === "yonetici-ozeti") {
    const p = period(filters);
    const from = p.gte ?? new Date(now.getTime() - 30 * DAY);
    const to = p.lte ?? now;
    const range = { gte: from, lte: to };
    const [
      openReq, lateReq, newReq, doneReq,
      openInc, majorInc, newInc,
      openProb, pendingChg, openPatch,
      openVuln, critVuln, lateVuln, pendingWf,
    ] = await Promise.all([
      db.serviceRequest.count({ where: { ...requestScope, status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } } }),
      db.serviceRequest.count({ where: { ...requestScope, status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] }, resolveDueAt: { lt: now } } }),
      db.serviceRequest.count({ where: { ...requestScope, requestDate: range } }),
      db.serviceRequest.count({ where: { ...requestScope, status: "DONE", updatedAt: range } }),
      db.incident.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      db.incident.count({ where: { isMajor: true, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      db.incident.count({ where: { startedAt: range } }),
      db.problem.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      db.changeRecord.count({ where: { status: "PENDING" } }),
      db.patchRecord.count({ where: { status: { notIn: FINAL_CHANGE } } }),
      db.vulnerability.count({ where: { status: "OPEN" } }),
      db.vulnerability.count({ where: { status: "OPEN", severity: { in: ["CRITICAL", "HIGH"] } } }),
      db.vulnerability.count({ where: { status: "OPEN", dueDate: { lt: now } } }),
      prisma.workflowInstance.count({ where: { status: "RUNNING" } }),
    ]);
    const rows: Record<string, string>[] = [];
    const add = (alan: string, gosterge: string, deger: number, durum = "") => rows.push({ alan, gosterge, deger: String(deger), durum });
    const flag = (n: number) => (n > 0 ? "Dikkat" : "Normal");
    add("Hizmet masası", "Açık talep", openReq);
    add("Hizmet masası", "SLA süresi geçmiş açık talep", lateReq, flag(lateReq));
    add("Hizmet masası", "Dönemde açılan talep", newReq);
    add("Hizmet masası", "Dönemde tamamlanan talep", doneReq);
    add("Olay", "Açık olay", openInc);
    add("Olay", "Açık majör olay", majorInc, flag(majorInc));
    add("Olay", "Dönemde açılan olay", newInc);
    add("Problem", "Açık problem", openProb);
    add("Değişiklik / yama", "Onay bekleyen değişiklik", pendingChg);
    add("Değişiklik / yama", "Devam eden yama", openPatch);
    add("Güvenlik", "Açık zafiyet", openVuln);
    add("Güvenlik", "Açık kritik/yüksek zafiyet", critVuln, flag(critVuln));
    add("Güvenlik", "Termin aşımı zafiyet", lateVuln, flag(lateVuln));
    add("Onay", "Onay bekleyen iş akışı", pendingWf);
    return {
      ...head,
      columns: [
        { key: "alan", label: "Alan" },
        { key: "gosterge", label: "Gösterge" },
        { key: "deger", label: "Değer" },
        { key: "durum", label: "Durum" },
      ],
      rows,
      summary: [
        { label: "Dönem", value: `${formatDateTime(from).slice(0, 10)} – ${formatDateTime(to).slice(0, 10)}` },
        { label: "SLA aşımı (talep)", value: String(lateReq) },
        { label: "Açık kritik/yüksek zafiyet", value: String(critVuln) },
      ],
      notes: ["Dönem filtresi yalnızca 'açılan/tamamlanan' göstergelerini etkiler; diğerleri anlık durumdur (varsayılan: son 30 gün)."],
    };
  }

  return null;
}
