import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function pepper() {
  return process.env.SESSION_SECRET?.trim() || "bt-hizmet-yonetimi-dev-secret";
}

export function hashApiSecret(token: string) {
  return createHmac("sha256", pepper()).update(token).digest("hex");
}

function legacyHashApiSecret(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiToken() {
  const prefix = `bth_${randomBytes(6).toString("hex")}`;
  const secret = randomBytes(32).toString("hex");
  const token = `${prefix}_${secret}`;
  return { prefix, token, secretHash: hashApiSecret(token) };
}

export function parsePresentedToken(raw: string | null | undefined) {
  const token = raw?.trim() ?? "";
  if (!token.startsWith("bth_") || token.length < 24 || token.length > 200) return null;
  if (!/^bth_[a-f0-9]+_[a-f0-9]+$/i.test(token)) return null;
  const prefix = token.split("_").slice(0, 2).join("_");
  if (prefix.length < 8 || prefix.length > 40) return null;
  return { token, prefix };
}

export function tokenMatches(token: string, secretHash: string) {
  const prev = Buffer.from(secretHash, "hex");
  if (prev.length !== 32) return false;
  const candidates = [hashApiSecret(token), legacyHashApiSecret(token)];
  let matched = false;
  for (const next of candidates) {
    const buf = Buffer.from(next, "hex");
    if (buf.length === prev.length && timingSafeEqual(buf, prev)) matched = true;
  }
  return matched;
}

export function readApiToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return request.headers.get("x-api-key")?.trim() ?? null;
}
