import type { FieldDef } from "@/lib/inventory/fields";
import { prisma } from "@/lib/prisma";
import { assetLabel, assetShape } from "@/lib/topology/build";
import { ASSET_TYPE_TR } from "@/lib/topology/labels";
import { serviceKindOf } from "@/lib/inventory/service-kinds";

/** Ürün / platform seçimi yapılan talep alanları: seçenekler yalnızca envanterde kayıtlı varlıklardan gelir. */
export const INVENTORY_FIELD_IDS = new Set([
  "fwVendor", "routeDevice", "switchDevice", "mailGateway", "sftpServer", "wgProduct", "sandboxProduct",
  "nacProduct", "backupProduct", "lbProduct", "wlanProduct", "siemPlatform", "forensicTool", "scanProduct", "dnsProduct",
  "vpnProduct", "scanEngine", "avProduct", "dlpProduct", "wafProduct", "pamProduct", "almTool", "scmProduct", "cicdProduct",
  "releaseTool", "apimProduct", "qualityTool", "dbEngine", "migrationTool", "sdProduct",
]);

const STOP = new Set([
  "microsoft", "windows", "server", "servers", "platform", "platformu", "enterprise", "networks", "network", "security", "manager",
  "cloud", "application", "services", "gateway", "group", "data", "diğer", "other", "azure", "secret", "client", "secure",
]);

const ASSET_TYPES = ["NETWORK_DEVICE", "SERVER", "APPLICATION", "SOFTWARE"];

type Candidate = {
  id: string;
  name: string | null;
  stockNo: string | null;
  assetType: string;
  brand: string | null;
  model: string | null;
  appTechnology: string | null;
  servedApplication: string | null;
  ipAddress: string | null;
  serviceKind?: string | null;
};

function tokensOf(field: FieldDef) {
  const out = new Set<string>();
  for (const o of field.options ?? []) {
    if (o.value === "OTHER") continue;
    for (const word of o.label.toLocaleLowerCase("tr").split(/[^a-z0-9ğüşöçı]+/i)) {
      if (word.length >= 4 && !STOP.has(word)) out.add(word.slice(0, 5));
      else if (/^(f5|ibm)$/.test(word)) out.add(word);
    }
  }
  return [...out];
}

function hay(a: Candidate) {
  return [a.name, a.brand, a.model, a.appTechnology, a.servedApplication].filter(Boolean).join(" ").toLocaleLowerCase("tr");
}

const MAIL_RE = /mail|mimecast|proofpoint|ironport|barracuda|spam|posta/i;

function matches(field: FieldDef, a: Candidate) {
  // Envanterde hizmet / sunucu türü açıkça girildiyse yalnızca ona bakılır (tahmin yapılmaz).
  const kind = serviceKindOf(a.serviceKind);
  if (kind) return kind.fields.includes(field.id);
  switch (field.id) {
    case "fwVendor":
      return a.assetType === "NETWORK_DEVICE" && assetShape(a) === "firewall";
    case "routeDevice":
    case "switchDevice":
      return a.assetType === "NETWORK_DEVICE" && assetShape(a) !== "storage";
    case "sftpServer":
      return a.assetType === "SERVER";
    case "wgProduct":
      return /proxy|web ?gateway|\bswg\b|zscaler|squid|forcepoint|websense|iboss|bluecoat|url ?filter/i.test(hay(a));
    case "sandboxProduct":
      return /sandbox|fireeye|wildfire|cuckoo|lastline|any\.?run|detonat/i.test(hay(a));
    case "mailGateway":
      return MAIL_RE.test(hay(a));
    default: {
      const tokens = tokensOf(field);
      if (!tokens.length) return false;
      const text = hay(a);
      return tokens.some((t) => text.includes(t));
    }
  }
}

function optionLabel(a: Candidate) {
  const extra = a.ipAddress || ASSET_TYPE_TR[a.assetType] || a.assetType;
  return `${assetLabel(a)} · ${extra}`;
}

/** Ürün alanlarının seçeneklerini envanterden doldurur; envanterde yoksa liste boş kalır ve alan zorunlu olmaktan çıkar. */
export async function withInventoryOptions<T extends FieldDef>(fields: T[]): Promise<T[]> {
  if (!fields.some((f) => INVENTORY_FIELD_IDS.has(f.id))) return fields;
  const rows = (await prisma.asset.findMany({
    where: { assetType: { in: ASSET_TYPES }, status: { not: "RETIRED" } },
    orderBy: { name: "asc" },
    take: 3000,
    select: { id: true, name: true, stockNo: true, assetType: true, brand: true, model: true, appTechnology: true, servedApplication: true, ipAddress: true, serviceKind: true },
  })) as Candidate[];
  return fields.map((field) => {
    if (!INVENTORY_FIELD_IDS.has(field.id)) return field;
    const found = rows.filter((a) => matches(field, a));
    return {
      ...field,
      options: found.map((a) => ({ value: a.id, label: optionLabel(a) })),
      required: found.length ? field.required : false,
      hint: found.length ? "Yalnızca envanterde kayıtlı varlıklar listelenir." : "Envanterde uygun kayıt yok. Önce envantere ekleyin; liste boş kaldığında bu alan zorunlu değildir.",
    };
  });
}

/** Detay ekranı: talepte saklanan varlık kimliklerini okunur ada çevirir. */
export async function inventoryDisplayValues(fields: FieldDef[], extras: Record<string, string | undefined>) {
  const ids = fields.filter((f) => INVENTORY_FIELD_IDS.has(f.id)).map((f) => extras[f.id]).filter((v): v is string => !!v);
  if (!ids.length) return {} as Record<string, string>;
  const rows = (await prisma.asset.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, stockNo: true, assetType: true, brand: true, model: true, appTechnology: true, servedApplication: true, ipAddress: true, serviceKind: true },
  })) as Candidate[];
  const byId = new Map(rows.map((a) => [a.id, optionLabel(a)]));
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = extras[f.id];
    if (INVENTORY_FIELD_IDS.has(f.id) && v) out[f.id] = byId.get(v) ?? v;
  }
  return out;
}
