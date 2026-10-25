import { CRITICALITY_LABELS, LIFECYCLE_STATUS_LABELS } from "@/lib/inventory/constants";
import { prisma } from "@/lib/prisma";
import { ASSET_TYPE_TR, formatPorts, relationEdgeLabel } from "./labels";
import {
  AUDIENCE_KIND_COLORS,
  isAudienceKind,
  type TopoEdge,
  type TopoGraph,
  type TopoNode,
  type TopoShape,
} from "./types";

const FIREWALL_RE = /firewall|fortigate|fortinet|palo ?alto|check ?point|\basa\b|pfsense|sophos|\bfw\b|güvenlik duvar|guvenlik duvar|waf/i;
const DB_RE = /\bsql\b|mssql|oracle|postgres|mysql|mariadb|mongo|veritaban|database/i;
const STORAGE_RE = /\bsan\b|storage|depolama|\bnas\b|netapp|dell ?emc|powerstore|powervault|3par|nimble|synology|qnap/i;
const LB_RE = /load ?balanc|yük deng|yuk deng|\bf5\b|big-?ip|netscaler|haproxy|\blb\b|\badc\b/i;
const EDGE_RE = /kenar|edge|access|erişim anahtar|metro|\bwan\b|router|yönlendirici|yonlendirici|internet/i;
const AV_RE = /antiv|endpoint|defender|kaspersky|\beset\b|symantec|trend ?micro|sentinel ?one|crowdstrike|mcafee|bitdefender|\bedr\b/i;

type AssetRow = {
  id: string;
  name: string | null;
  stockNo: string | null;
  assetType: string;
  brand: string | null;
  model: string | null;
  ipAddress: string | null;
  operatingSystem: string | null;
  version: string | null;
  appTechnology: string | null;
  servedApplication: string | null;
  criticality: string;
  status: string;
  department?: { name: string } | null;
  _count?: { vulnerabilities: number };
};

const ASSET_SELECT = {
  id: true,
  name: true,
  stockNo: true,
  assetType: true,
  brand: true,
  model: true,
  ipAddress: true,
  operatingSystem: true,
  version: true,
  appTechnology: true,
  servedApplication: true,
  criticality: true,
  status: true,
  department: { select: { name: true } },
  _count: { select: { vulnerabilities: { where: { status: "OPEN" } } } },
} as const;

export function assetShape(a: Pick<AssetRow, "assetType" | "name" | "brand" | "model" | "appTechnology" | "servedApplication">): TopoShape {
  const text = [a.name, a.brand, a.model, a.appTechnology, a.servedApplication].filter(Boolean).join(" ");
  switch (a.assetType) {
    case "NETWORK_DEVICE":
      return FIREWALL_RE.test(text) ? "firewall" : STORAGE_RE.test(text) && !/switch|anahtar/i.test(text) ? "storage" : "network";
    case "SERVER":
      return DB_RE.test(text) ? "database" : "server";
    case "APPLICATION":
      return DB_RE.test(text) ? "database" : "application";
    case "SOFTWARE":
      return AV_RE.test(text) ? "antivirus" : "software";
    case "COMPUTER":
      return "computer";
    case "FIXTURE":
    case "PERIPHERAL":
      return STORAGE_RE.test(text) ? "storage" : a.assetType === "FIXTURE" ? "fixture" : "peripheral";
    case "PRINTER":
      return "printer";
    case "TABLET":
      return "tablet";
    case "MOBILE_PHONE":
      return "phone";
    case "IP_PHONE":
      return "ipphone";
    default:
      return "fixture";
  }
}

export function assetLabel(a: Pick<AssetRow, "name" | "brand" | "model" | "stockNo" | "assetType">) {
  return a.name?.trim() || [a.brand, a.model].filter(Boolean).join(" ") || a.stockNo || ASSET_TYPE_TR[a.assetType] || a.assetType;
}

function osText(a: AssetRow) {
  return [a.operatingSystem, a.version].filter(Boolean).join(" ");
}

function assetNode(a: AssetRow, col: number, serviceId: string, extra: Partial<TopoNode> = {}): TopoNode {
  const typeTr = ASSET_TYPE_TR[a.assetType] ?? a.assetType;
  const os = osText(a);
  const meta: [string, string][] = [["Tür", typeTr]];
  if (os) meta.push(["İşletim sistemi", os]);
  if (a.ipAddress) meta.push(["IP", a.ipAddress]);
  if (a.appTechnology) meta.push(["Teknoloji", a.appTechnology]);
  meta.push(["Kritiklik", CRITICALITY_LABELS[a.criticality as keyof typeof CRITICALITY_LABELS] ?? a.criticality]);
  meta.push(["Durum", LIFECYCLE_STATUS_LABELS[a.status as keyof typeof LIFECYCLE_STATUS_LABELS] ?? a.status]);
  if (a.department?.name) meta.push(["Birim", a.department.name]);
  return {
    id: `a:${a.id}`,
    shape: assetShape(a),
    label: assetLabel(a),
    sub: os || a.ipAddress || typeTr,
    col,
    order: assetLabel(a),
    criticality: a.criticality,
    dimmed: a.status === "RETIRED" || a.status === "IN_STOCK",
    vulnCount: a._count?.vulnerabilities ?? 0,
    meta,
    href: `/envanter/${a.id}`,
    editHref: `/hizmetler/topoloji?hizmet=${serviceId}&duzenle=${a.id}`,
    ...extra,
  };
}

function hay(a: AssetRow) {
  return [a.name, a.brand, a.model, a.appTechnology].filter(Boolean).join(" ");
}

/** Altyapı cihazının sütunu ve etiketi: 1 kenar, 2 güvenlik duvarı, 3 omurga/yük dengeleyici/DMZ, 6 depolama. */
function infraTier(a: AssetRow): { col: number; sub: string } {
  const text = hay(a);
  const shape = assetShape(a);
  if (/\bwaf\b|web application firewall/i.test(text)) return { col: 3, sub: "WAF" };
  if (shape === "firewall") return { col: 2, sub: "Güvenlik duvarı" };
  if (shape === "storage") return { col: 6, sub: "Depolama" };
  if (/\bsan\b/i.test(text)) return { col: 6, sub: "SAN anahtar" };
  if (LB_RE.test(text)) return { col: 3, sub: "Yük dengeleyici" };
  if (/dmz/i.test(text)) return { col: 3, sub: "DMZ anahtar" };
  if (/omurga|core|backbone|dağıtım|distribution/i.test(text)) return { col: 3, sub: "Omurga anahtar" };
  if (EDGE_RE.test(text)) return { col: 1, sub: /router|yönlendirici|yonlendirici/i.test(text) ? "Yönlendirici" : "Kenar anahtar" };
  return { col: 3, sub: "Ağ anahtarı" };
}

function isInfra(a: AssetRow) {
  return a.assetType === "NETWORK_DEVICE" || assetShape(a) === "storage";
}

function appPorts(app: AssetRow | null, appUrl: string | null | undefined) {
  const url = (appUrl ?? "").trim();
  const m = /^(https?):\/\/[^/:]+(?::(\d+))?/i.exec(url);
  if (m) return m[2] ?? (m[1].toLowerCase() === "http" ? "80" : "443");
  void app;
  return "443";
}

function adminPorts(servers: AssetRow[]) {
  const win = servers.some((s) => /windows/i.test(s.operatingSystem ?? ""));
  const nix = servers.some((s) => s.operatingSystem && !/windows/i.test(s.operatingSystem));
  const ports = new Set<string>(["443"]);
  if (win || !servers.length) { ports.add("3389"); ports.add("5985"); }
  if (nix || !servers.length) ports.add("22");
  return ["443", "22", "3389", "5985"].filter((p) => ports.has(p)).join(", ");
}

const AUDIENCE_SHAPE: Record<string, TopoShape> = { CLIENT: "group", ADMIN: "role", PARTNER: "vendor", OTHER: "group" };
const INFRA_COLOR = "#0891b2";

const TITLES = [
  "Kullanıcılar",
  "Yönlendirici / kenar anahtar",
  "Güvenlik duvarı",
  "Omurga / yük dengeleyici / DMZ",
  "Sunucular (işletim sistemi)",
  "Hizmet",
  "Depolama / SAN",
  "Veritabanı / eriştiği sistemler",
];

/**
 * Seçilen hizmetin ağ topolojisi, kayıtlardan kendiliğinden çıkarılır:
 * kullanıcılar → kenar anahtar → güvenlik duvarı → omurga/yük dengeleyici/DMZ → sunucular → hizmet → depolama/SAN ve eriştiği sistemler.
 */
export async function buildServiceTopology(serviceId: string): Promise<TopoGraph> {
  if (!serviceId) return { nodes: [], edges: [], note: "Bir hizmet seçin." };
  const service = await prisma.catalogService.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      serviceNo: true,
      name: true,
      summary: true,
      criticality: true,
      status: true,
      audience: true,
      asset: { select: { ...ASSET_SELECT, appUrl: true } },
      owner: { select: { fullName: true } },
      department: { select: { name: true } },
      requestingDept: { select: { name: true } },
      accessRules: { orderBy: { createdAt: "asc" }, select: { id: true, audience: true, kind: true, ports: true, note: true } },
    },
  });
  if (!service) return { nodes: [], edges: [], note: "Hizmet bulunamadı." };

  const nodes: TopoNode[] = [];
  const edges: TopoEdge[] = [];
  const notes: string[] = [];
  const app = service.asset as unknown as AssetRow | null;
  const appUrl = (service.asset as { appUrl?: string | null } | null)?.appUrl ?? null;

  // 1) Sunucular
  const servers = new Map<string, AssetRow>();
  const appHosts: { serverId: string; port: string | null; protocol: string | null }[] = [];
  if (!app) {
    notes.push("Bu hizmet bir varlığa (uygulama veya sunucu) bağlı değil. Hizmet kataloğu kaydını düzenleyip varlık seçin.");
  } else if (app.assetType === "SERVER") {
    servers.set(app.id, app);
  } else {
    const rels = await prisma.assetRelation.findMany({
      where: { sourceId: app.id, relationType: "HOSTED_ON" },
      select: { targetId: true, port: true, protocol: true, target: { select: ASSET_SELECT } },
    });
    for (const r of rels) {
      servers.set(r.targetId, r.target as unknown as AssetRow);
      appHosts.push({ serverId: r.targetId, port: r.port, protocol: r.protocol });
    }
    if (!rels.length) notes.push("Uygulamanın çalıştığı sunucu tanımlı değil (varlığa “üzerinde çalışır” bağlantısı ekleyin).");
  }
  const serverIds = [...servers.keys()];
  for (const server of servers.values()) nodes.push(assetNode(server, 4, service.id));

  // 2) Ağ altyapısı: sunuculardan başlayıp ağ cihazı / depolama olan komşuları 3 adım boyunca bul
  const infra = new Map<string, AssetRow>();
  const links = new Map<string, { a: string; b: string; port: string | null; protocol: string | null }>();
  let frontier = [...serverIds];
  const seen = new Set<string>(serverIds);
  for (let depth = 0; depth < 3 && frontier.length; depth++) {
    const rels = await prisma.assetRelation.findMany({
      where: {
        relationType: { in: ["CONNECTED_TO", "PART_OF", "DEPENDS_ON"] },
        OR: [{ sourceId: { in: frontier } }, { targetId: { in: frontier } }],
      },
      select: {
        sourceId: true,
        targetId: true,
        port: true,
        protocol: true,
        source: { select: ASSET_SELECT },
        target: { select: ASSET_SELECT },
      },
      take: 400,
    });
    const next: string[] = [];
    for (const r of rels) {
      const src = r.source as unknown as AssetRow;
      const tgt = r.target as unknown as AssetRow;
      const fromFront = frontier.includes(r.sourceId);
      const other = fromFront ? tgt : src;
      const otherId = fromFront ? r.targetId : r.sourceId;
      const frontId = fromFront ? r.sourceId : r.targetId;
      if (!isInfra(other) || serverIds.includes(otherId) === true) continue;
      infra.set(otherId, other);
      const key = [frontId, otherId].sort().join("|");
      if (!links.has(key)) links.set(key, { a: frontId, b: otherId, port: r.port, protocol: r.protocol });
      if (!seen.has(otherId)) {
        seen.add(otherId);
        next.push(otherId);
      }
    }
    frontier = next;
  }
  const tierOf = new Map<string, { col: number; sub: string }>();
  for (const a of infra.values()) {
    const t = infraTier(a);
    tierOf.set(a.id, t);
    nodes.push(assetNode(a, t.col, service.id, { sub: t.sub }));
  }
  const colOf = (id: string) => (servers.has(id) ? 4 : tierOf.get(id)?.col ?? 3);
  for (const l of links.values()) {
    let from = l.a;
    let to = l.b;
    if (colOf(from) > colOf(to)) [from, to] = [to, from];
    const conn = [l.protocol, l.port].filter((x) => x && String(x).trim()).join("/");
    edges.push({ id: `e:net:${l.a}:${l.b}`, from: `a:${from}`, to: `a:${to}`, label: conn || undefined, color: INFRA_COLOR });
  }


  // 2b) Hizmet masası talepleri: güvenlik duvarı (FW_INTRANET/FW_INTERNET), WAF ve yük dengeleyici talepleri topolojiye işlenir
  type ReqAudience = { id: string; label: string; sub: string; kind: "CLIENT" | "ADMIN"; ports: Set<string>; done: boolean; meta: [string, string][] };
  const reqAudiences = new Map<string, ReqAudience>();
  const reqNotes: string[] = [];
  const pendingAssets: { id: string; col: number; sub: string }[] = [];
  const isId = (v: string | undefined) => !!v && /^c[a-z0-9]{20,}$/.test(v);
  const hasInfraSub = (sub: string) => [...tierOf.values()].some((t) => t.sub === sub);
  {
    const ips = [app?.ipAddress, ...[...servers.values()].map((x) => x.ipAddress)].filter((x): x is string => !!x);
    let host = "";
    try { host = appUrl ? new URL(/^https?:\/\//i.test(appUrl) ? appUrl : `https://${appUrl}`).hostname : ""; } catch { host = ""; }
    const ownIds = new Set([...serverIds, ...(app ? [app.id] : [])]);
    const reqs = await prisma.serviceRequest.findMany({
      where: { requestType: { in: ["FW_INTRANET", "FW_INTERNET", "WAF", "LOAD_BALANCER"] }, status: { notIn: ["REJECTED", "CANCELLED"] } },
      orderBy: { requestDate: "desc" },
      take: 500,
      select: { id: true, requestNo: true, requestType: true, status: true, assetId: true, details: true, requester: { select: { fullName: true } }, requestingDept: { select: { name: true } } },
    });
    const VENDOR: Record<string, string> = { PALO: "Palo Alto", FORTINET: "FortiGate", CHECKPOINT: "Check Point", CISCO: "Cisco ASA/FTD", OTHER: "Güvenlik duvarı" };
    const WAFP: Record<string, string> = { F5: "F5 Advanced WAF", IMPERVA: "Imperva WAF", CLOUDFLARE: "Cloudflare WAF", AZURE: "Azure WAF", OTHER: "WAF" };
    const LBP: Record<string, string> = { F5: "F5 BIG-IP", CITRIX: "Citrix ADC", NGINX: "NGINX Plus", HAPROXY: "HAProxy", OTHER: "Yük dengeleyici" };
    const portList = (text: string) => {
      const found = text.match(/\d{1,5}(?:-\d{1,5})?/g);
      return found?.length ? found : text.trim() ? [text.trim()] : [];
    };
    for (const r of reqs) {
      let ex: Record<string, string> = {};
      try { ex = Object.fromEntries(Object.entries(JSON.parse(r.details ?? "{}") as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")])); } catch { ex = {}; }
      const blob = r.details ?? "";
      const mine = (r.assetId && ownIds.has(r.assetId)) || ips.some((ip) => blob.includes(ip)) || (host.length > 3 && blob.toLowerCase().includes(host.toLowerCase()));
      if (!mine) continue;
      const done = r.status === "DONE";
      const meta: [string, string][] = [["Talep", r.requestNo], ["Talep eden", r.requester.fullName], ["Durum", r.status]];
      if (r.requestType === "FW_INTRANET" || r.requestType === "FW_INTERNET") {
        if (ex.actionKind === "DENY") { reqNotes.push(`${r.requestNo} (engelle)`); continue; }
        if (isId(ex.fwVendor)) {
          pendingAssets.push({ id: ex.fwVendor, col: 2, sub: "Güvenlik duvarı" });
        } else if (!tierOf.size || ![...tierOf.values()].some((t) => t.col === 2)) {
          if (!nodes.some((n) => n.id === "v:fw")) nodes.push({ id: "v:fw", shape: "firewall", label: VENDOR[ex.fwVendor] ?? "Güvenlik duvarı", sub: "Talep kayıtlarından", col: 2, order: "0", meta: [["Kaynak", "Hizmet masası talebi"], ["Talep", r.requestNo]] });
        }
        const src = (ex.sourceIp || r.requestingDept?.name || "Kaynak").trim();
        const ports = portList(ex.portProtocol ?? "");
        const kind: "CLIENT" | "ADMIN" = ports.some((p) => ["22", "3389", "5985", "5986"].includes(p)) ? "ADMIN" : "CLIENT";
        const key = `${src}|${kind}`;
        const cur: ReqAudience = reqAudiences.get(key) ?? { id: `u:q:${key}`, label: src, sub: r.requestingDept?.name ?? "Talep kaydı", kind, ports: new Set<string>(), done: true, meta: [] };
        ports.forEach((x) => cur.ports.add(x));
        cur.done = cur.done && done;
        cur.meta.push(...meta);
        reqAudiences.set(key, cur);
      } else if (r.requestType === "WAF") {
        if (isId(ex.wafProduct)) {
          pendingAssets.push({ id: ex.wafProduct, col: 3, sub: "WAF" });
        } else if (!nodes.some((n) => n.id === "v:waf") && !hasInfraSub("WAF")) {
          nodes.push({ id: "v:waf", shape: "firewall", label: WAFP[ex.wafProduct] ?? "WAF", sub: "WAF", col: 3, order: "0", meta: [["Kaynak", "Hizmet masası talebi"], ["Talep", r.requestNo], ["Uygulama", ex.appUrl ?? ""]] });
        }
      } else if (r.requestType === "LOAD_BALANCER") {
        if (isId(ex.lbProduct)) {
          pendingAssets.push({ id: ex.lbProduct, col: 3, sub: "Yük dengeleyici" });
        } else if (!nodes.some((n) => n.id === "v:lb") && !hasInfraSub("Yük dengeleyici")) {
          nodes.push({ id: "v:lb", shape: "network", label: LBP[ex.lbProduct] ?? "Yük dengeleyici", sub: "Yük dengeleyici", col: 3, order: "1", meta: [["Kaynak", "Hizmet masası talebi"], ["Talep", r.requestNo], ["VIP", [ex.virtualIp, ex.virtualPort].filter(Boolean).join(" ")]] });
        }
      }
    }
  }
  if (pendingAssets.length) {
    const ids = [...new Set(pendingAssets.map((p) => p.id))];
    const rows = (await prisma.asset.findMany({ where: { id: { in: ids } }, select: ASSET_SELECT })) as unknown as AssetRow[];
    for (const p of pendingAssets) {
      const a = rows.find((r) => r.id === p.id);
      if (!a || nodes.some((n) => n.id === `a:${a.id}`)) continue;
      infra.set(a.id, a);
      tierOf.set(a.id, { col: p.col, sub: p.sub });
      nodes.push(assetNode(a, p.col, service.id, { sub: p.sub }));
    }
  }
  const hasWaf = nodes.some((n) => n.sub === "WAF");
  const isWeb = /^https?:\/\//i.test((appUrl ?? "").trim());

  // 3) Hizmet düğümü
  nodes.push({
    id: `s:${service.id}`,
    shape: "application",
    label: service.name,
    sub: app ? assetLabel(app) : service.serviceNo,
    col: 5,
    order: "0",
    focus: true,
    criticality: service.criticality,
    meta: [
      ["Hizmet no", service.serviceNo],
      ["Durum", service.status],
      ...(app ? ([["Bağlı varlık", assetLabel(app)]] as [string, string][]) : []),
      ...(service.owner?.fullName ? ([["Sahibi", service.owner.fullName]] as [string, string][]) : []),
      ...(service.department?.name ? ([["Birim", service.department.name]] as [string, string][]) : []),
      ...(service.summary ? ([["Özet", service.summary.slice(0, 120)]] as [string, string][]) : []),
    ],
    href: `/katalog/${service.id}`,
    editHref: app ? `/hizmetler/topoloji?hizmet=${service.id}&duzenle=${app.id}` : undefined,
  });
  for (const h of appHosts) {
    edges.push({ id: `e:host:${h.serverId}`, from: `s:${service.id}`, to: `a:${h.serverId}`, label: relationEdgeLabel("HOSTED_ON", h.port, h.protocol), color: "#0f766e", dashed: true });
  }
  if (app && app.assetType === "SERVER") {
    edges.push({ id: "e:host:self", from: `s:${service.id}`, to: `a:${app.id}`, label: "üzerinde çalışır", color: "#0f766e", dashed: true });
  }
  if (service.owner?.fullName) {
    nodes.push({ id: "o:owner", shape: "person", label: service.owner.fullName, sub: "Hizmet sahibi", col: 5, order: "9", meta: [["Rol", "Hizmet sahibi"]] });
    edges.push({ id: "e:owner", from: "o:owner", to: `s:${service.id}`, label: "sorumlu", color: "#64748b", dashed: true });
  }

  // 4) Kullanıcılar: kayıtlı kurallar varsa onlar; yoksa talep/olay kayıtlarından ve işletim sisteminden tahmin
  const entryCol = nodes.some((n) => n.col === 1) ? 1 : nodes.some((n) => n.col === 2) ? 2 : nodes.some((n) => n.col === 3) ? 3 : 4;
  const entries = nodes.filter((n) => n.col === entryCol && /^[av]:/.test(n.id));
  const allPorts = new Set<string>();
  const adminSet = new Set<string>();
  const clientSet = new Set<string>();
  const addAudience = (id: string, label: string, sub: string, kind: "CLIENT" | "ADMIN" | "PARTNER" | "OTHER", shape: TopoShape, ports: string, dashed: boolean, meta: [string, string][]) => {
    const color = AUDIENCE_KIND_COLORS[kind];
    const text = formatPorts(ports);
    nodes.push({ id, shape, label, sub, col: 0, order: `${kind === "CLIENT" ? "1" : kind === "ADMIN" ? "2" : "3"}|${label}`, meta: [...meta, ["Portlar", text]] });
    ports.split(",").map((p) => p.trim()).filter(Boolean).forEach((p) => {
      allPorts.add(p);
      (kind === "ADMIN" ? adminSet : clientSet).add(p);
    });
    const targets = entries.length ? entries.map((n) => n.id) : [`s:${service.id}`];
    for (const t of targets) edges.push({ id: `e:u:${id}>${t}`, from: id, to: t, label: text, color, dashed });
  };

  const explicit = service.accessRules;
  const hasKind = (k: string) => explicit.some((r) => r.kind === k) || [...reqAudiences.values()].some((a) => a.kind === k);
  explicit.forEach((rule, i) => {
    const kind = isAudienceKind(rule.kind) ? rule.kind : "CLIENT";
    addAudience(`u:r${i}`, rule.audience, kind === "ADMIN" ? "Yönetici erişimi" : kind === "PARTNER" ? "Dış erişim" : "Erişim grubu", kind, AUDIENCE_SHAPE[kind] ?? "group", rule.ports, false, [["Grup", rule.audience], ...(rule.note ? ([["Not", rule.note]] as [string, string][]) : [])]);
  });

  const clientPorts = explicit.find((r) => r.kind === "CLIENT")?.ports ?? appPorts(app, appUrl);
  for (const a of reqAudiences.values()) {
    addAudience(a.id, a.label, a.sub, a.kind, a.kind === "ADMIN" ? "role" : "group", [...a.ports].join(", "), !a.done, [["Kaynak", "Hizmet masası talebi"], ...a.meta.slice(0, 6)]);
  }
  if (!hasKind("CLIENT")) {
    addAudience("u:auto-client", "Kullanıcı ağı (istemciler)", service.audience === "INTERNAL" ? "İç kullanıcılar (tahmini)" : "Son kullanıcılar (tahmini)", "CLIENT", "group", clientPorts, true, [["Kaynak", "Varsayılan: uygulama adresine göre"]]);
  }
  if (!hasKind("ADMIN")) {
    addAudience("u:auto-admin", "Sistem yöneticileri ağı", "Yönetim erişimi (tahmini)", "ADMIN", "role", adminPorts([...servers.values()]), true, [["Kaynak", "Varsayılan: sunucu işletim sistemine göre"]]);
  }

  // Talep eden birimler (olay + süreç kayıtlarından)
  const [inc, proc] = await Promise.all([
    prisma.incident.groupBy({ by: ["departmentId"], where: { serviceId: service.id, departmentId: { not: null } }, _count: { _all: true } }),
    prisma.itilProcessRecord.groupBy({ by: ["requestingDeptId"], where: { serviceId: service.id, requestingDeptId: { not: null } }, _count: { _all: true } }),
  ]);
  const deptCount = new Map<string, number>();
  for (const g of inc) if (g.departmentId) deptCount.set(g.departmentId, (deptCount.get(g.departmentId) ?? 0) + g._count._all);
  for (const g of proc) if (g.requestingDeptId) deptCount.set(g.requestingDeptId, (deptCount.get(g.requestingDeptId) ?? 0) + g._count._all);
  const top = [...deptCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length) {
    const depts = await prisma.department.findMany({ where: { id: { in: top.map(([id]) => id) } }, select: { id: true, name: true } });
    const names = new Map(depts.map((d) => [d.id, d.name]));
    for (const [id, n] of top) {
      const name = names.get(id) as string | undefined;
      if (name) addAudience(`u:dept:${id}`, name, `${n} talep / olay`, "CLIENT", "department", clientPorts, true, [["Kaynak", "Hizmete açılan talep ve olay kayıtları"]]);
    }
  }

  // Katmanlar arası eksik bağlar: kenar → güvenlik duvarı → WAF/yük dengeleyici/omurga → sunucular
  const portText = formatPorts([...allPorts].join(", "));
  const clientText = formatPorts([...clientSet].join(", ")) || portText;
  const adminText = formatPorts([...adminSet].join(", "));
  const colById = new Map(nodes.map((n) => [n.id, n.col]));
  const layers = [1, 2, 3].map((c) => nodes.filter((n) => n.col === c && /^[av]:/.test(n.id))).filter((l) => l.length);
  const serverLayer = nodes.filter((n) => n.col === 4 && n.id.startsWith("a:"));
  const seq = serverLayer.length ? [...layers, serverLayer] : layers;
  const pairs = new Set(edges.map((e) => `${e.from}|${e.to}`));
  for (let i = 0; i < seq.length - 1; i++) {
    for (const from of seq[i]) {
      if (edges.some((e) => e.from === from.id && (colById.get(e.to) ?? 0) > from.col)) continue;
      for (const to of seq[i + 1]) {
        if (pairs.has(`${from.id}|${to.id}`) || pairs.has(`${to.id}|${from.id}`)) continue;
        const waf = from.sub === "WAF" || to.sub === "WAF";
        const label = (waf ? clientText : portText) || undefined;
        edges.push({ id: `e:chain:${from.id}>${to.id}`, from: from.id, to: to.id, label, color: INFRA_COLOR, dashed: from.id.startsWith("v:") || to.id.startsWith("v:") });
        pairs.add(`${from.id}|${to.id}`);
      }
    }
  }
  // WAF varsa yönetim portları WAF'tan geçmez: güvenlik duvarından doğrudan sunucuya
  if (hasWaf && adminText) {
    for (const fw of nodes.filter((n) => n.col === 2 && /^[av]:/.test(n.id))) {
      for (const sv of serverLayer) {
        if (!pairs.has(`${fw.id}|${sv.id}`)) edges.push({ id: `e:adm:${fw.id}>${sv.id}`, from: fw.id, to: sv.id, label: adminText, color: AUDIENCE_KIND_COLORS.ADMIN });
      }
    }
  }
  {
    const lastCol = Math.max(-1, ...nodes.filter((n) => /^[av]:/.test(n.id) && n.col >= 1 && n.col <= 3).map((n) => n.col));
    for (const e of edges) {
      const f = nodes.find((n) => n.id === e.from);
      const t = nodes.find((n) => n.id === e.to);
      if (f && t && !e.label && f.col === lastCol && t.col === 4 && portText) e.label = portText;
    }
  }

  // 5) Depolama ve eriştiği sistemler (veritabanı vb.)
  const sources = [...serverIds, ...(app && app.assetType !== "SERVER" ? [app.id] : [])];
  if (sources.length) {
    const rels = await prisma.assetRelation.findMany({
      where: { sourceId: { in: sources }, relationType: { in: ["CONNECTED_TO", "DEPENDS_ON"] } },
      select: { id: true, sourceId: true, targetId: true, relationType: true, port: true, protocol: true, target: { select: ASSET_SELECT } },
      take: 200,
    });
    for (const r of rels) {
      const t = r.target as unknown as AssetRow;
      if (servers.has(t.id) || infra.has(t.id)) continue;
      if (!nodes.some((n) => n.id === `a:${t.id}`)) nodes.push(assetNode(t, 7, service.id));
      const from = app && r.sourceId === app.id && app.assetType !== "SERVER" ? `s:${service.id}` : `a:${r.sourceId}`;
      edges.push({ id: `e:dep:${r.id}`, from, to: `a:${t.id}`, label: relationEdgeLabel(r.relationType, r.port, r.protocol), color: "#7c3aed" });
    }
  }

  if (serverIds.length && !infra.size) notes.push("Sunucuların ağ cihazı (güvenlik duvarı, anahtar, SAN) bağlantısı kayıtlı değil; ağ katmanları bu yüzden çizilmedi. Sunucu varlığından cihaza “bağlanır” ilişkisi ekleyince kendiliğinden gelir.");
  if (reqAudiences.size) notes.push(`Güvenlik duvarı ve erişim izinleri Hizmet masası talepleri üzerinden okundu (${[...reqAudiences.values()].reduce((n, a) => n + a.meta.filter(([k]) => k === "Talep eden").length, 0)} talep).`);
  if (reqNotes.length) notes.push(`Engelleme talepleri çizilmedi: ${reqNotes.join(", ")}.`);
  if (isWeb && !hasWaf) notes.push("Bu bir web uygulaması ama WAF kaydı veya WAF talebi bulunamadı.");
  notes.push("Kesikli oklar tahmindir veya henüz tamamlanmamış talebi gösterir (uygulama adresi ve işletim sisteminden); “Erişim kuralları” ile kesinleştirilir.");

  return { nodes, edges: dedupe(edges), note: notes.join(" "), columnTitles: TITLES };
}

function dedupe(edges: TopoEdge[]) {
  const seen = new Set<string>();
  return edges.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}
