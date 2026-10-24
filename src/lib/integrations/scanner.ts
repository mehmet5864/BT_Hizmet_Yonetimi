import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

import type { ScannerVendor, SystemSettings } from "@/lib/settings";

export type ScannerFinding = {
  externalId: string;
  deviceName?: string;
  deviceIp?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  cve?: string;
  pluginId?: string;
  title: string;
  description?: string;
  status: "OPEN" | "CLOSED";
  detectedAt?: Date;
};

export type ScannerPullResult = {
  findings: ScannerFinding[];
  source: "demo" | "device";
  message: string;
};

type ScannerSettings = SystemSettings["scanner"];

const SEVERITY_RANK: Record<ScannerFinding["severity"], number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export function normalizeIp(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeHost(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function mapSeverity(raw: unknown): ScannerFinding["severity"] {
  if (typeof raw === "number") {
    if (raw >= 9 || raw === 4 || raw === 5) return "CRITICAL";
    if (raw >= 7 || raw === 3) return "HIGH";
    if (raw >= 4 || raw === 2) return "MEDIUM";
    return "LOW";
  }
  const text = String(raw ?? "").trim().toLowerCase();
  if (["critical", "kritik", "4", "5"].includes(text)) return "CRITICAL";
  if (["high", "yüksek", "yuksek", "3"].includes(text)) return "HIGH";
  if (["medium", "orta", "2"].includes(text)) return "MEDIUM";
  if (["info", "informational", "none", "0"].includes(text)) return "LOW";
  return "LOW";
}

export function dueDateForSeverity(severity: ScannerFinding["severity"], settings: ScannerSettings) {
  const days =
    severity === "CRITICAL"
      ? settings.dueDaysCritical
      : severity === "HIGH"
        ? settings.dueDaysHigh
        : severity === "MEDIUM"
          ? 30
          : 90;
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + Math.max(1, days));
  return date;
}

export function demoFindings(): ScannerFinding[] {
  return [
    {
      externalId: "nessus:10.10.1.1:CVE-2024-20353",
      deviceName: "SW-CORE-01",
      deviceIp: "10.10.1.1",
      severity: "HIGH",
      cve: "CVE-2024-20353",
      pluginId: "198234",
      title: "Cisco IOS XE HTTP sunucu yetkisiz erişim",
      description: "Tarayıcı: IOS XE sürümünde bilinen CVE. Yama veya ACL kısıtı planlanmalı.",
      status: "OPEN",
    },
    {
      externalId: "nessus:10.10.20.11:CVE-2024-10979",
      deviceName: "SRV-DB-01",
      deviceIp: "10.10.20.11",
      severity: "CRITICAL",
      cve: "CVE-2024-10979",
      pluginId: "201188",
      title: "PostgreSQL PL/Perl ortam değişkeni enjeksiyonu",
      description: "Tarayıcı: Veritabanı sunucusunda kritik CVE. Acil yama gerekir.",
      status: "OPEN",
    },
    {
      externalId: "nessus:10.10.20.21:CVE-2023-44487",
      deviceName: "SRV-APP-02",
      deviceIp: "10.10.20.21",
      severity: "MEDIUM",
      cve: "CVE-2023-44487",
      pluginId: "177961",
      title: "HTTP/2 Rapid Reset (DoS)",
      description: "Tarayıcı: Uygulama sunucusu HTTP/2 üzerinden Rapid Reset'e açık.",
      status: "OPEN",
    },
    {
      externalId: "nessus:10.20.14.14:SSL-WEAK",
      deviceName: "PC-MUH-014",
      deviceIp: "10.20.14.14",
      severity: "LOW",
      pluginId: "51192",
      title: "Zayıf TLS şifre takımı",
      description: "Tarayıcı: İstemci TLS yapılandırması zayıf şifreler içeriyor.",
      status: "OPEN",
    },
  ];
}

function scannerBaseUrl(settings: ScannerSettings) {
  const port = settings.port || (settings.protocol === "HTTP" ? 80 : 443);
  const host = settings.host.trim();
  return `${settings.protocol.toLowerCase()}://${host}:${port}`;
}

function authHeaders(settings: ScannerSettings): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json, application/xml, text/xml, */*" };
  if (settings.accessKey && settings.secretKey) {
    headers["X-ApiKeys"] = `accessKey=${settings.accessKey}; secretKey=${settings.secretKey}`;
  }
  if (settings.username || settings.password) {
    const token = Buffer.from(`${settings.username}:${settings.password}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
  } else if (settings.accessKey && !settings.secretKey) {
    headers.Authorization = `Bearer ${settings.accessKey}`;
  }
  if (settings.vendor === "QUALYS") headers["X-Requested-With"] = "BT Hizmet Yonetimi";
  return headers;
}

function requestText(url: string, settings: ScannerSettings, extraHeaders?: Record<string, string>) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;
    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: { ...authHeaders(settings), ...extraHeaders },
        timeout: 12000,
        ...(isHttps ? { rejectUnauthorized: settings.verifyTls } : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Zafiyet tarayıcısı zaman aşımına uğradı."));
    });
    req.on("error", (error) => reject(error));
    req.end();
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function findingFromUnknown(raw: unknown, vendor: ScannerVendor, index: number): ScannerFinding | null {
  const record = asRecord(raw);
  if (!record) return null;
  const plugin = asRecord(record.plugin);
  const host = asRecord(record.host) ?? asRecord(record.asset);
  const deviceIp = String(
    pick(record, ["ip", "ipAddress", "ipv4", "host_ip", "deviceIp"]) ??
      (host ? pick(host, ["ip", "ipv4", "hostname"]) : "") ??
      "",
  ).trim();
  const deviceName = String(
    pick(record, ["hostname", "host", "deviceName", "name", "assetName"]) ??
      (host ? pick(host, ["hostname", "name", "fqdn"]) : "") ??
      deviceIp,
  ).trim();
  const title = String(
    pick(record, ["title", "name", "pluginName", "vulnerability", "qid_title"]) ??
      (plugin ? pick(plugin, ["name", "title"]) : "") ??
      "",
  ).trim();
  if (!title && !deviceIp) return null;
  const cve = String(pick(record, ["cve", "cveId", "CVE"]) ?? "").trim() || undefined;
  const pluginId = String(
    pick(record, ["pluginId", "plugin_id", "qid", "id"]) ?? (plugin ? pick(plugin, ["id"]) : "") ?? "",
  ).trim();
  const external =
    String(pick(record, ["externalId", "findingId", "uuid"]) ?? "").trim() ||
    `${vendor.toLowerCase()}:${deviceIp || deviceName}:${cve || pluginId || title || index}`;
  const statusRaw = String(pick(record, ["status", "state"]) ?? "OPEN").toLowerCase();
  const closed = ["closed", "fixed", "resolved", "kapatıldı", "kapatildi"].includes(statusRaw);
  return {
    externalId: external.slice(0, 180),
    deviceName: deviceName || undefined,
    deviceIp: deviceIp || undefined,
    severity: mapSeverity(pick(record, ["severity", "risk", "cvss", "cvss3", "cvss_base"]) ?? (plugin ? pick(plugin, ["risk_factor"]) : "MEDIUM")),
    cve,
    pluginId: pluginId || undefined,
    title: title || cve || "Adsız zafiyet",
    description: String(pick(record, ["description", "synopsis", "solution", "output"]) ?? title).slice(0, 2000),
    status: closed ? "CLOSED" : "OPEN",
  };
}

function collectArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of ["findings", "vulnerabilities", "hosts", "scans", "resources", "data", "items"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  const nested = asRecord(record.scans) ?? asRecord(record.response);
  if (nested) return collectArray(nested);
  return [];
}

function parseQualysXml(xml: string): ScannerFinding[] {
  const findings: ScannerFinding[] = [];
  const hostBlocks = xml.split(/<HOST\b/i).slice(1);
  hostBlocks.forEach((block, hostIndex) => {
    const ip = block.match(/<IP>([^<]+)<\/IP>/i)?.[1]?.trim();
    const name = block.match(/<(?:DNS|HOSTNAME)>([^<]+)<\//i)?.[1]?.trim() ?? ip;
    const detections = block.split(/<DETECTION\b/i).slice(1);
    detections.forEach((detection, index) => {
      const qid = detection.match(/<QID>([^<]+)<\/QID>/i)?.[1]?.trim();
      const severity = detection.match(/<SEVERITY>([^<]+)<\/SEVERITY>/i)?.[1];
      const title = detection.match(/<(?:TITLE|RESULTS)>([^<]+)<\//i)?.[1]?.trim();
      const cve = detection.match(/CVE-\d{4}-\d+/i)?.[0];
      if (!qid && !title) return;
      findings.push({
        externalId: `qualys:${ip ?? name}:${qid ?? index}`,
        deviceName: name,
        deviceIp: ip,
        severity: mapSeverity(severity),
        cve,
        pluginId: qid,
        title: title || `Qualys QID ${qid}`,
        description: title,
        status: "OPEN",
      });
    });
    if (!detections.length && ip) {
      findings.push({
        externalId: `qualys:${ip}:host-${hostIndex}`,
        deviceName: name,
        deviceIp: ip,
        severity: "LOW",
        title: "Qualys konak kaydı",
        status: "OPEN",
      });
    }
  });
  return findings;
}

function parseNessusScans(payload: unknown, vendor: ScannerVendor): ScannerFinding[] {
  const findings: ScannerFinding[] = [];
  const scans = collectArray(payload);
  scans.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) return;
    const hosts = Array.isArray(record.hosts) ? record.hosts : Array.isArray(record.vulnerabilities) ? record.vulnerabilities : [record];
    hosts.forEach((host, hostIndex) => {
      const parsed = findingFromUnknown(host, vendor, index * 1000 + hostIndex);
      if (parsed) findings.push(parsed);
    });
  });
  return findings;
}

export async function probeScanner(settings: ScannerSettings) {
  if (settings.useDemoFeed) {
    return "Örnek tarama kaynağı açık. Gerçek cihaza bağlanılmadan demo bulgular kullanılacak.";
  }
  if (!settings.host) throw new Error("Tarama cihazı adresi boş.");
  const path = settings.apiPath?.startsWith("/") ? settings.apiPath : `/${settings.apiPath || ""}`;
  const url = `${scannerBaseUrl(settings)}${path}`;
  const { status, body } = await requestText(url, settings);
  if (status >= 200 && status < 400) {
    return `Tarama cihazı yanıt verdi (HTTP ${status}, ${body.length} bayt).`;
  }
  throw new Error(`Tarama cihazı HTTP ${status} döndürdü.`);
}

export async function pullScannerFindings(settings: ScannerSettings): Promise<ScannerPullResult> {
  if (settings.useDemoFeed) {
    return {
      findings: demoFindings(),
      source: "demo",
      message: "Örnek tarama kaynağından 4 bulgu alındı. Gerçek cihaz için Ayarlar’da demo kaynağı kapatın.",
    };
  }
  if (!settings.enabled) throw new Error("Zafiyet tarama bağlantısı kapalı. Ayarlar’dan açın.");
  if (!settings.host) throw new Error("Tarama cihazı adresi boş.");

  const path = settings.apiPath?.startsWith("/") ? settings.apiPath : `/${settings.apiPath || ""}`;
  const url = `${scannerBaseUrl(settings)}${path}`;
  const { status, body } = await requestText(url, settings);
  if (status < 200 || status >= 400) {
    throw new Error(`Tarama cihazı HTTP ${status} döndürdü.`);
  }

  let findings: ScannerFinding[] = [];
  const trimmed = body.trim();
  if (trimmed.startsWith("<") || settings.vendor === "QUALYS") {
    findings = parseQualysXml(trimmed);
  } else {
    let payload: unknown = trimmed;
    try {
      payload = JSON.parse(trimmed);
    } catch {
      throw new Error("Tarama cihazı JSON veya Qualys XML döndürmedi.");
    }
    const generic = collectArray(payload)
      .map((item, index) => findingFromUnknown(item, settings.vendor, index))
      .filter((item): item is ScannerFinding => Boolean(item));
    findings = generic.length ? generic : parseNessusScans(payload, settings.vendor);
  }

  const unique = new Map<string, ScannerFinding>();
  for (const finding of findings) {
    const prev = unique.get(finding.externalId);
    if (!prev || SEVERITY_RANK[finding.severity] > SEVERITY_RANK[prev.severity]) {
      unique.set(finding.externalId, finding);
    }
  }

  return {
    findings: [...unique.values()],
    source: "device",
    message: `${settings.vendor} cihazından ${unique.size} bulgu alındı.`,
  };
}
