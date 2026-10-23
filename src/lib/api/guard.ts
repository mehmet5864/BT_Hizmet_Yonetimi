import { AsyncLocalStorage } from "node:async_hooks";

export const API_MAX_BODY_BYTES = 32 * 1024;
export const API_READ_LIMIT = 60;
export const API_WRITE_LIMIT = 20;
export const API_FAIL_LIMIT = 20;
export const API_WINDOW_MS = 60 * 1000;

const store = new AsyncLocalStorage<Request>();

export function runWithApiRequest<T>(request: Request, fn: () => T): T {
  return store.run(request, fn);
}

export function currentApiRequest() {
  return store.getStore() ?? null;
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  return (request.headers.get("x-real-ip") ?? "unknown").slice(0, 80);
}

export function requestHost(request: Request) {
  return (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0]?.trim() ?? "";
}

export function allowedCorsOrigins(request: Request) {
  const host = requestHost(request);
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const origins = new Set<string>();
  if (host) origins.add(`${proto}://${host}`);
  origins.add(new URL(request.url).origin);
  const extra = process.env.API_CORS_ORIGINS?.split(",") ?? [];
  for (const item of extra) {
    const origin = item.trim();
    if (origin && /^https?:\/\/[A-Za-z0-9._:-]+$/.test(origin)) origins.add(origin);
  }
  return origins;
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin) return {};
  if (!allowedCorsOrigins(request).has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, X-Api-Key, Content-Type, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function sameOriginWrite(request: Request) {
  const host = requestHost(request);
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") return false;
  if (site === "same-origin" || site === "same-site") return true;
  const requested = request.headers.get("x-requested-with")?.trim();
  return Boolean(requested);
}

export function isRecordId(value: string) {
  return /^[a-z0-9]{8,64}$/i.test(value);
}

export function parseAllowlist(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(isAllowEntry);
    }
  } catch {
    /* satır listesi */
  }
  return raw
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(isAllowEntry);
}

export function isAllowEntry(value: string) {
  if (!value || value.length > 80) return false;
  if (value.includes("/")) {
    const [base, bitsRaw] = value.split("/");
    const bits = Number(bitsRaw);
    return Boolean(ipv4ToInt(base) !== null && Number.isInteger(bits) && bits >= 0 && bits <= 32);
  }
  return ipv4ToInt(value) !== null || /^[A-Fa-f0-9:]+$/.test(value);
}

export function ipAllowed(ip: string, allow: string[]) {
  if (!allow.length) return true;
  if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1") {
    return allow.some((rule) => matchIpRule(ip, rule) || rule === "127.0.0.1" || rule === "::1");
  }
  return allow.some((rule) => matchIpRule(ip, rule));
}

function matchIpRule(ip: string, rule: string) {
  if (rule.includes("/")) {
    const [base, bitsRaw] = rule.split("/");
    return ipv4Cidr(ip, base, Number(bitsRaw));
  }
  return ip === rule;
}

function ipv4ToInt(ip: string | undefined) {
  if (!ip) return null;
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value < 0 || value > 255) return null;
    n = (n << 8) + value;
  }
  return n >>> 0;
}

function ipv4Cidr(ip: string, base: string | undefined, bits: number) {
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const address = ipv4ToInt(ip);
  const network = ipv4ToInt(base);
  if (address === null || network === null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (address & mask) === (network & mask);
}
