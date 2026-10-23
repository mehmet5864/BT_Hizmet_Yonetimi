import { prisma } from "@/lib/prisma";

export const FLOW_KINDS = ["INCIDENT", "PROBLEM", "CHANGE", "PATCH", "VULNERABILITY", "AGILE"] as const;
export type FlowKind = (typeof FLOW_KINDS)[number];

export const FLOW_KIND_LABELS: Record<FlowKind, string> = {
  INCIDENT: "Olay",
  PROBLEM: "Problem",
  CHANGE: "Değişiklik",
  PATCH: "Yama",
  VULNERABILITY: "Zafiyet",
  AGILE: "Çevik iş",
};

export const FLOW_KIND_NEW: Record<FlowKind, string> = {
  INCIDENT: "/olay/yeni",
  PROBLEM: "/problem/yeni",
  CHANGE: "/degisiklik/yeni",
  PATCH: "/yama/yeni",
  VULNERABILITY: "/zafiyet/yeni",
  AGILE: "/cevik",
};

export const FLOW_KIND_HREF: Record<FlowKind, string> = {
  INCIDENT: "/olay",
  PROBLEM: "/problem",
  CHANGE: "/degisiklik",
  PATCH: "/yama",
  VULNERABILITY: "/zafiyet",
  AGILE: "/cevik/is",
};

export type TemplateStep = { kind: FlowKind; title: string };

export const BUILTIN_TEMPLATES: { key: string; name: string; description: string; steps: TemplateStep[] }[] = [
  {
    key: "builtin:guvenlik-olayi",
    name: "Güvenlik olayı yönetimi",
    description: "Olaydan kalıcı çözüme: olay, kök neden, değişiklik, yama ve takip işi.",
    steps: [
      { kind: "INCIDENT", title: "Olayı kaydet ve sınırla" },
      { kind: "PROBLEM", title: "Kök neden analizi" },
      { kind: "CHANGE", title: "Düzeltici değişiklik" },
      { kind: "PATCH", title: "Yama uygulaması" },
      { kind: "AGILE", title: "Kalıcı iyileştirme işi" },
    ],
  },
  {
    key: "builtin:zafiyet-kapatma",
    name: "Zafiyet kapatma",
    description: "Tarama bulgusundan kapatmaya: zafiyet, değişiklik ve yama.",
    steps: [
      { kind: "VULNERABILITY", title: "Zafiyeti değerlendir" },
      { kind: "CHANGE", title: "Değişiklik onayı" },
      { kind: "PATCH", title: "Yamayı uygula" },
    ],
  },
  {
    key: "builtin:devsecops-yayin",
    name: "DevSecOps — uygulama geliştirme ve güvenli yayın",
    description: "Gereksinimden üretim izlemeye: güvenlik hikâyeleri, geliştirme, tarama bulguları, onaylı yayın, yama ve geri bildirim döngüsü.",
    steps: [
      { kind: "AGILE", title: "Planla: gereksinim ve güvenlik hikâyeleri (backlog, tehdit modelleme)" },
      { kind: "AGILE", title: "Geliştir: kodlama ve eş incelemesi (sprint)" },
      { kind: "VULNERABILITY", title: "Doğrula: SAST / SCA / DAST bulgularını değerlendir ve termin ver" },
      { kind: "CHANGE", title: "Yayın onayı: değişiklik kaydı, CAB ve güvenlik kapısı" },
      { kind: "PATCH", title: "Dağıt: yama / sürüm uygulaması" },
      { kind: "INCIDENT", title: "İzle: üretimde olay yönetimi (SIEM)" },
      { kind: "PROBLEM", title: "Öğren: kök neden ve kalıcı iyileştirme" },
      { kind: "AGILE", title: "İyileştirmeyi sonraki sprint backlog'una al" },
    ],
  },
  {
    key: "builtin:acil-hotfix",
    name: "Acil güvenlik düzeltmesi (hotfix)",
    description: "Kritik zafiyet veya olay için hızlı yol: acil değişiklik, yama ve sonrasında kök neden.",
    steps: [
      { kind: "VULNERABILITY", title: "Kritik bulguyu doğrula" },
      { kind: "CHANGE", title: "Acil değişiklik (geri dönüş planı + CAB notu)" },
      { kind: "PATCH", title: "Hotfix dağıtımı" },
      { kind: "PROBLEM", title: "Uygulama sonrası kök neden analizi" },
    ],
  },
];

export function parseSteps(json: string): TemplateStep[] {
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((s) => s && (FLOW_KINDS as readonly string[]).includes(s.kind) && typeof s.title === "string")
      .map((s) => ({ kind: s.kind as FlowKind, title: s.title as string }));
  } catch {
    return [];
  }
}

/** "TÜR: başlık" satırlarını adımlara çevirir. */
export function parseStepLines(textValue: string): { steps: TemplateStep[]; error?: string } {
  const byLabel = new Map<string, FlowKind>();
  for (const k of FLOW_KINDS) {
    byLabel.set(FLOW_KIND_LABELS[k].toLocaleLowerCase("tr"), k);
    byLabel.set(k.toLowerCase(), k);
  }
  const steps: TemplateStep[] = [];
  for (const line of textValue.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    const i = l.indexOf(":");
    const label = (i > 0 ? l.slice(0, i) : l).trim().toLocaleLowerCase("tr");
    const kind = byLabel.get(label);
    if (!kind) return { steps: [], error: `Tanınmayan tür: "${l.slice(0, 30)}". Türler: ${FLOW_KINDS.map((k) => FLOW_KIND_LABELS[k]).join(", ")}.` };
    const title = (i > 0 ? l.slice(i + 1).trim() : "") || FLOW_KIND_LABELS[kind];
    steps.push({ kind, title });
  }
  if (!steps.length) return { steps: [], error: "En az bir adım girin." };
  if (steps.length > 12) return { steps: [], error: "En fazla 12 adım olabilir." };
  return { steps };
}

export async function findRecord(kind: FlowKind, no: string): Promise<{ id: string; no: string } | null> {
  const n = no.trim();
  if (!n) return null;
  switch (kind) {
    case "INCIDENT": {
      const r = await prisma.incident.findUnique({ where: { incidentNo: n }, select: { id: true, incidentNo: true } });
      return r ? { id: r.id, no: r.incidentNo } : null;
    }
    case "PROBLEM": {
      const r = await prisma.problem.findUnique({ where: { problemNo: n }, select: { id: true, problemNo: true } });
      return r ? { id: r.id, no: r.problemNo } : null;
    }
    case "CHANGE": {
      const r = await prisma.changeRecord.findUnique({ where: { changeNo: n }, select: { id: true, changeNo: true } });
      return r ? { id: r.id, no: r.changeNo } : null;
    }
    case "PATCH": {
      const r = await prisma.patchRecord.findUnique({ where: { patchNo: n }, select: { id: true, patchNo: true } });
      return r ? { id: r.id, no: r.patchNo } : null;
    }
    case "VULNERABILITY": {
      const r = await prisma.vulnerability.findUnique({ where: { vulnNo: n }, select: { id: true, vulnNo: true } });
      return r ? { id: r.id, no: r.vulnNo } : null;
    }
    case "AGILE": {
      const r = await prisma.agileItem.findUnique({ where: { itemNo: n }, select: { id: true, itemNo: true } });
      return r ? { id: r.id, no: r.itemNo } : null;
    }
  }
}

const DONE = new Set(["RESOLVED", "CLOSED", "COMPLETED", "DEPLOYED", "DONE", "CLEARED", "IMPLEMENTED"]);
export const isDoneStatus = (s: string | null | undefined) => !!s && DONE.has(s);

export async function recordStatuses(steps: { kind: string; recordId: string | null }[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await Promise.all(
    steps.map(async (s) => {
      if (!s.recordId) return;
      const where = { where: { id: s.recordId }, select: { status: true } } as const;
      let status: string | undefined;
      switch (s.kind) {
        case "INCIDENT": status = (await prisma.incident.findUnique(where))?.status; break;
        case "PROBLEM": status = (await prisma.problem.findUnique(where))?.status; break;
        case "CHANGE": status = (await prisma.changeRecord.findUnique(where))?.status; break;
        case "PATCH": status = (await prisma.patchRecord.findUnique(where))?.status; break;
        case "VULNERABILITY": status = (await prisma.vulnerability.findUnique(where))?.status; break;
        case "AGILE": status = (await prisma.agileItem.findUnique(where))?.status; break;
      }
      if (status) out.set(s.recordId, status);
    }),
  );
  return out;
}
