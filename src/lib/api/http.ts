import { applySecurityHeaders } from "@/lib/security/http";

import { API_MAX_BODY_BYTES, corsHeaders, currentApiRequest } from "./guard";

export type RateMeta = {
  remaining?: number;
  retryAfterSec?: number;
  limit?: number;
};

export function apiHeaders(extra?: HeadersInit, rate?: RateMeta) {
  const headers = new Headers(extra);
  applySecurityHeaders(headers);
  const request = currentApiRequest();
  if (request) {
    for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value);
  }
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  if (rate?.limit !== undefined) headers.set("X-RateLimit-Limit", String(rate.limit));
  if (rate?.remaining !== undefined) headers.set("X-RateLimit-Remaining", String(rate.remaining));
  if (rate?.retryAfterSec) headers.set("Retry-After", String(rate.retryAfterSec));
  return headers;
}

export function apiJson(body: unknown, status = 200, rate?: RateMeta) {
  return new Response(JSON.stringify(body), {
    status,
    headers: apiHeaders({ "Content-Type": "application/json; charset=utf-8" }, rate),
  });
}

export function apiError(message: string, status = 400, extra?: Record<string, unknown>, rate?: RateMeta) {
  const headers = status === 401 ? { "WWW-Authenticate": 'Bearer realm="BT API"' } : undefined;
  const response = apiJson({ ok: false, error: message, ...extra }, status, rate);
  if (headers) {
    const next = new Headers(response.headers);
    next.set("WWW-Authenticate", headers["WWW-Authenticate"]);
    return new Response(response.body, { status: response.status, headers: next });
  }
  return response;
}

export function apiOk<T>(data: T, status = 200, extra?: Record<string, unknown>) {
  return apiJson({ ok: true, ...extra, data }, status);
}

export function apiOptions() {
  return new Response(null, { status: 204, headers: apiHeaders() });
}

export function listLimit(raw: string | null, fallback = 50, max = 50) {
  const value = Number(raw ?? "");
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(Math.floor(value), max);
}

export async function readApiJson(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > API_MAX_BODY_BYTES) {
    return { ok: false as const, error: apiError("İstek gövdesi çok büyük.", 413) };
  }
  const type = request.headers.get("content-type") ?? "";
  if (type && !type.toLowerCase().includes("application/json")) {
    return { ok: false as const, error: apiError("Content-Type application/json olmalıdır.", 415) };
  }
  const text = await request.text();
  if (text.length > API_MAX_BODY_BYTES) {
    return { ok: false as const, error: apiError("İstek gövdesi çok büyük.", 413) };
  }
  if (!text.trim()) return { ok: true as const, body: {} as Record<string, unknown> };
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false as const, error: apiError("JSON nesnesi bekleniyor.") };
    }
    return { ok: true as const, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false as const, error: apiError("JSON gövde okunamadı.") };
  }
}
