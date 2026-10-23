export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
};

export function applySecurityHeaders(headers: Headers) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return headers;
}

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 8, windowMs = 15 * 60 * 1000, increment = true) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    if (!increment) return { ok: true, remaining: limit, retryAfterSec: 0, limit };
    const resetAt = now + windowMs;
    attempts.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0, limit };
  }
  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      limit,
    };
  }
  if (increment) current.count += 1;
  return { ok: true, remaining: limit - current.count, retryAfterSec: 0, limit };
}

export function isSafeUploadUrl(value: string | null | undefined) {
  if (!value) return true;
  return /^\/uploads\/[a-f0-9-]{36}\.(png|jpe?g|webp|gif|pdf)$/i.test(value.trim());
}

export function safeApiPath(raw: string, fallback: string) {
  const trimmed = raw.trim() || fallback;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (path.includes("..") || /[\\]|:\/\//.test(path) || path.length > 240) return fallback;
  return path;
}

export function isSafeHostname(value: string) {
  const host = value.trim();
  if (!host || host.length > 253) return false;
  if (host.includes("/") || host.includes("\\") || host.includes(" ")) return false;
  if (/^https?:/i.test(host)) return false;
  return /^[A-Za-z0-9._:-]+$/.test(host);
}

export function isSafeUsername(value: string) {
  return /^[A-Za-z0-9._@\\-]{1,64}$/.test(value.trim());
}

export function clampText(value: string, max: number) {
  return value.length <= max ? value : value.slice(0, max);
}
