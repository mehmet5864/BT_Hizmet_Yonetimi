import { createPublicKey, verify } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { prisma } from "@/lib/prisma";

/**
 * Çevrimdışı doğrulanan imzalı lisans (Ed25519).
 * Biçim:  BTHY1.<yük (base64url JSON)>.<imza (base64url)>
 * Lisansı yalnızca özel anahtarın sahibi üretir (scripts/license-gen.mjs, uygulama paketinde özel anahtar YOKTUR).
 */
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEACoOxBOEk4GUdCgHxnkAcnjPpTh2RRi7GBbX89DLLoK0=
-----END PUBLIC KEY-----`;

/** Her zaman açık modüller (lisanssız da; Ayarlar'dan lisans yüklenebilsin diye). */
export const ALWAYS_MODULES = ["dashboard", "kilavuzlar", "ayarlar"] as const;
/** Lisansla açılıp kapatılabilen modüller. */
export const LICENSABLE_MODULES = [
  "personel",
  "envanter",
  "talepler",
  "degisiklik",
  "yama",
  "konfigurasyon",
  "zafiyet",
  "firma-sla",
  "olay",
  "problem",
  "cevik",
  "katalog",
  "surec",
  "hareketler",
  "raporlar",
  "api",
] as const;
/** Kısıtlı mod (lisans yok / geçersiz / süresi ve ek süresi bitmiş): yalnızca çekirdek modüller. */
export const RESTRICTED_MODULES = ["personel", "envanter", "talepler", "olay", "hareketler"] as const;

export const TRIAL_MAX_USERS = 25;
export const GRACE_DAYS = 30;
const PREFIX = "BTHY1";

export type LicensePayload = {
  v: 1;
  licenseId: string;
  customer: string;
  maxUsers: number;
  issued: string;
  /** ISO tarih; null = süresiz */
  expires: string | null;
  /** Açık modüller; yoksa (eski lisans) tüm modüller açık. */
  modules?: string[];
  note?: string;
};

export type LicenseStatus = "valid" | "expiring" | "grace" | "expired" | "invalid" | "trial";

export type LicenseState = {
  status: LicenseStatus;
  customer: string;
  licenseId: string;
  maxUsers: number;
  expires: string | null;
  daysLeft: number | null;
  used: number;
  remaining: number;
  overLimit: boolean;
  /** null = tüm modüller açık */
  modules: string[] | null;
  /** Kısıtlı mod: yalnızca çekirdek modüller açık */
  restricted: boolean;
  message: string;
};

function licensePath() {
  return process.env.LICENSE_FILE || join(process.env.DATA_DIR || "/data", "license.key");
}

function fromB64u(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function verifyLicenseText(
  raw: string,
): { ok: true; payload: LicensePayload; text: string } | { ok: false; message: string } {
  const text = raw.replace(/\s+/g, "");
  const parts = text.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, message: "Lisans biçimi geçersiz." };
  try {
    const key = createPublicKey(PUBLIC_KEY_PEM);
    const good = verify(null, Buffer.from(parts[1], "ascii"), key, fromB64u(parts[2]));
    if (!good) return { ok: false, message: "Lisans imzası doğrulanamadı." };
    const payload = JSON.parse(fromB64u(parts[1]).toString("utf8")) as LicensePayload;
    if (payload.v !== 1 || !Number.isFinite(payload.maxUsers) || payload.maxUsers < 1 || !payload.customer) {
      return { ok: false, message: "Lisans içeriği geçersiz." };
    }
    if (payload.modules !== undefined && (!Array.isArray(payload.modules) || payload.modules.some((m) => typeof m !== "string"))) {
      return { ok: false, message: "Lisans modül listesi geçersiz." };
    }
    return { ok: true, payload, text };
  } catch {
    return { ok: false, message: "Lisans okunamadı." };
  }
}

let cache: { at: number; text: string | null } | null = null;

async function readLicenseText(): Promise<string | null> {
  if (process.env.LICENSE_KEY) return process.env.LICENSE_KEY;
  if (cache && Date.now() - cache.at < 15_000) return cache.text;
  let text: string | null = null;
  try {
    text = (await readFile(licensePath(), "utf8")).trim() || null;
  } catch {
    text = null;
  }
  cache = { at: Date.now(), text };
  return text;
}

export async function saveLicenseText(raw: string): Promise<{ ok: true; payload: LicensePayload } | { ok: false; message: string }> {
  const checked = verifyLicenseText(raw);
  if (!checked.ok) return checked;
  const path = licensePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, checked.text + "\n", "utf8");
  cache = null;
  return { ok: true, payload: checked.payload };
}

type Evaluated = {
  status: LicenseStatus;
  payload: LicensePayload | null;
  daysLeft: number | null;
  modules: string[] | null;
  restricted: boolean;
  error?: string;
};

function evaluate(text: string | null): Evaluated {
  if (!text) return { status: "trial", payload: null, daysLeft: null, modules: [...RESTRICTED_MODULES], restricted: true };
  const checked = verifyLicenseText(text);
  if (!checked.ok) {
    return { status: "invalid", payload: null, daysLeft: null, modules: [...RESTRICTED_MODULES], restricted: true, error: checked.message };
  }
  const p = checked.payload;
  let daysLeft: number | null = null;
  let status: LicenseStatus = "valid";
  if (p.expires) {
    daysLeft = Math.ceil((new Date(p.expires).getTime() - Date.now()) / 86_400_000);
    if (daysLeft < 0) status = daysLeft >= -GRACE_DAYS ? "grace" : "expired";
    else if (daysLeft <= 30) status = "expiring";
  }
  if (status === "expired") {
    return { status, payload: p, daysLeft, modules: [...RESTRICTED_MODULES], restricted: true };
  }
  return { status, payload: p, daysLeft, modules: p.modules ? [...p.modules] : null, restricted: false };
}

/** Açık modül kümesi; null = hepsi. Veritabanına gitmez (her istekte çağrılabilir). */
export async function getLicensedModules(): Promise<Set<string> | null> {
  try {
    const ev = evaluate(await readLicenseText());
    if (!ev.modules) return null;
    return new Set<string>([...ALWAYS_MODULES, ...ev.modules]);
  } catch {
    return null;
  }
}

export async function getLicenseState(): Promise<LicenseState> {
  const used = await prisma.person.count();
  const ev = evaluate(await readLicenseText());
  const base = { used, overLimit: false, remaining: 0, daysLeft: ev.daysLeft };
  if (ev.status === "trial") {
    return {
      ...base,
      status: "trial",
      customer: "Deneme (lisanssız)",
      licenseId: "-",
      maxUsers: TRIAL_MAX_USERS,
      expires: null,
      remaining: Math.max(0, TRIAL_MAX_USERS - used),
      overLimit: used > TRIAL_MAX_USERS,
      modules: ev.modules,
      restricted: true,
      message: `Lisans anahtarı yüklenmemiş: kısıtlı mod. En çok ${TRIAL_MAX_USERS} kullanıcı ve yalnızca çekirdek modüller (personel, envanter, talep, olay, audit log) açıktır.`,
    };
  }
  if (ev.status === "invalid" || !ev.payload) {
    return {
      ...base,
      status: "invalid",
      customer: "-",
      licenseId: "-",
      maxUsers: TRIAL_MAX_USERS,
      expires: null,
      remaining: Math.max(0, TRIAL_MAX_USERS - used),
      overLimit: used > TRIAL_MAX_USERS,
      modules: ev.modules,
      restricted: true,
      message: `${ev.error ?? "Lisans geçersiz."} Kısıtlı mod (${TRIAL_MAX_USERS} kullanıcı, çekirdek modüller) geçerlidir.`,
    };
  }
  const p = ev.payload;
  const status = ev.status;
  const daysLeft = ev.daysLeft;
  const remaining = Math.max(0, p.maxUsers - used);
  const message =
    status === "expired"
      ? "Lisans süresi doldu: kısıtlı mod. Yeni kullanıcı eklenemez ve yalnızca çekirdek modüller açıktır."
      : status === "grace"
        ? `Lisans süresi doldu; ${GRACE_DAYS} günlük ek süre içindesiniz (${GRACE_DAYS + (daysLeft ?? 0)} gün kaldı).`
        : status === "expiring"
          ? `Lisans ${daysLeft} gün içinde sona erecek.`
          : "Lisans geçerli.";
  return {
    status,
    customer: p.customer,
    licenseId: p.licenseId,
    maxUsers: p.maxUsers,
    expires: p.expires,
    daysLeft,
    used,
    remaining,
    overLimit: used > p.maxUsers,
    modules: ev.modules,
    restricted: ev.restricted,
    message,
  };
}

/** Yeni kullanıcı/kişi eklemeden önce çağrılır. Engel varsa kullanıcıya gösterilecek mesajı döndürür. */
export async function licenseSeatError(adding = 1): Promise<string | null> {
  try {
    const state = await getLicenseState();
    if (state.status === "expired") return "Lisans süresi doldu; yeni kullanıcı eklenemez. Ayarlar → Lisans bölümünden yeni anahtar yükleyin.";
    if (state.used + adding > state.maxUsers) {
      return `Lisans kullanıcı sınırına ulaşıldı (${state.used}/${state.maxUsers}). Ayarlar → Lisans bölümünden lisansı yükseltin.`;
    }
    return null;
  } catch {
    return null;
  }
}
