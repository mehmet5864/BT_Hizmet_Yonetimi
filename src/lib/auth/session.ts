import { cookies } from "next/headers";

import { isPersonnelRole, type RoleSource } from "@/lib/auth/rbac";
import type { PersonnelRole } from "@/lib/itil/constants";
import type { RequestOffice } from "@/lib/itil/request-types";
import { isRequestOffice } from "@/lib/itil/request-scope";

export const SESSION_COOKIE = "bt_session";
const SESSION_MS = 60 * 60 * 12 * 1000;

export type SessionUser = {
  id: string;
  fullName: string;
  email: string | null;
  role: PersonnelRole;
  roleSource: RoleSource;
  title: string | null;
  adUsername: string | null;
  requestOffice?: RequestOffice | null;
};

let productionFallbackSecret = "";

function secret() {
  const value = process.env.SESSION_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    if (!productionFallbackSecret) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      productionFallbackSecret = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    return productionFallbackSecret;
  }
  return "bt-hizmet-yonetimi-dev-secret";
}

function b64url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromB64url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function hmac(input: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return Buffer.from(sig).toString("base64url");
}

function sanitizeUser(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || !value.id || value.id.length > 64) return null;
  if (typeof value.fullName !== "string" || !value.fullName) return null;
  const role = typeof value.role === "string" && isPersonnelRole(value.role) ? value.role : null;
  if (!role) return null;
  const roleSource =
    value.roleSource === "AD" || value.roleSource === "BOTH" || value.roleSource === "MANUAL"
      ? value.roleSource
      : "MANUAL";
  return {
    id: value.id,
    fullName: value.fullName.slice(0, 160),
    email: typeof value.email === "string" ? value.email.slice(0, 180) : null,
    role,
    roleSource,
    title: typeof value.title === "string" ? value.title.slice(0, 120) : null,
    adUsername: typeof value.adUsername === "string" ? value.adUsername.slice(0, 80) : null,
    requestOffice: (() => {
      const office = typeof value.requestOffice === "string" ? value.requestOffice : null;
      return isRequestOffice(office) ? office : null;
    })(),
  };
}

export async function encodeSession(user: SessionUser, ttlMs: number = SESSION_MS) {
  const body = b64url(JSON.stringify({ user, exp: Date.now() + ttlMs }));
  return `${body}.${await hmac(body)}`;
}

export async function decodeSession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (sig.length !== expected.length) return null;
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  let same = 0;
  for (let i = 0; i < left.length; i += 1) same |= left[i] ^ right[i];
  if (same !== 0) return null;
  try {
    const parsed = JSON.parse(fromB64url(body)) as { user?: unknown; exp?: unknown };
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return sanitizeUser(parsed.user);
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

function cookieSecure() {
  const raw = process.env.SESSION_SECURE?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  return false;
}

export async function setSessionCookie(user: SessionUser, hours?: number) {
  const ttlMs = hours && hours > 0 ? hours * 3600 * 1000 : SESSION_MS;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await encodeSession(user, ttlMs), {
    httpOnly: true,
    sameSite: "lax",
    // Yerel kurulum HTTP (127.0.0.1) kullanır. Secure=true olursa tarayıcı çerezi atar, giriş düşer.
    secure: cookieSecure(),
    path: "/",
    maxAge: ttlMs / 1000,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
