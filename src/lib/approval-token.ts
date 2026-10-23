import { createHmac, timingSafeEqual } from "node:crypto";

export type ApprovalKind = "request" | "change" | "patch" | "problem" | "inventory";
export type ApprovalDecision = "APPROVED" | "REJECTED";

export type ApprovalPayload = {
  kind: ApprovalKind;
  id: string;
  personId: string;
  exp: number;
};

function secret() {
  return process.env.SESSION_SECRET?.trim() || "bt-hizmet-yonetimi-dev-secret";
}

function b64url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromB64url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function appBaseUrl() {
  const raw = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://127.0.0.1:43130";
}

export function createApprovalToken(payload: Omit<ApprovalPayload, "exp">, days = 7) {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + days * 86400000 }));
  return `${body}.${sign(body)}`;
}

export function readApprovalToken(token: string | undefined | null): ApprovalPayload | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(fromB64url(body)) as ApprovalPayload;
    if (!parsed.kind || !parsed.id || !parsed.personId) return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function approvalMailUrls(payload: Omit<ApprovalPayload, "exp">) {
  const token = createApprovalToken(payload);
  const base = `${appBaseUrl()}/onay/posta/${encodeURIComponent(token)}`;
  return {
    token,
    viewUrl: base,
    approveUrl: `${base}?karar=onay`,
    rejectUrl: `${base}?karar=red`,
  };
}
