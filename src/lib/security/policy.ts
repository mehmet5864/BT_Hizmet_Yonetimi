import { prisma } from "@/lib/prisma";

/** Parola, hesap kilidi ve oturum politikası. SystemConfig tablosunda "security" kaydı olarak tutulur. */
export type SecurityPolicy = {
  minLength: number;
  /** Büyük harf + küçük harf + rakam zorunlu */
  requireMix: boolean;
  /** Bu kadar hatalı girişten sonra hesap kilitlenir (0 = kapalı) */
  maxFailed: number;
  lockMinutes: number;
  /** Oturum süresi (saat) */
  sessionHours: number;
};

export const DEFAULT_POLICY: SecurityPolicy = {
  minLength: 8,
  requireMix: false,
  maxFailed: 5,
  lockMinutes: 15,
  sessionHours: 12,
};

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizePolicy(raw: Partial<Record<keyof SecurityPolicy, unknown>> | null | undefined): SecurityPolicy {
  return {
    minLength: clamp(raw?.minLength, 6, 64, DEFAULT_POLICY.minLength),
    requireMix: raw?.requireMix === true,
    maxFailed: clamp(raw?.maxFailed, 0, 20, DEFAULT_POLICY.maxFailed),
    lockMinutes: clamp(raw?.lockMinutes, 1, 1440, DEFAULT_POLICY.lockMinutes),
    sessionHours: clamp(raw?.sessionHours, 1, 168, DEFAULT_POLICY.sessionHours),
  };
}

export async function getSecurityPolicy(): Promise<SecurityPolicy> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { id: "security" } });
    return normalizePolicy(row ? (JSON.parse(row.payload) as Record<string, unknown>) : null);
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

export async function saveSecurityPolicy(policy: SecurityPolicy) {
  const payload = JSON.stringify(policy);
  await prisma.systemConfig.upsert({
    where: { id: "security" },
    create: { id: "security", payload },
    update: { payload },
  });
}

/** Parola politikaya uymuyorsa kullanıcıya gösterilecek mesajı döndürür. */
export async function passwordPolicyError(password: string): Promise<string | null> {
  const policy = await getSecurityPolicy();
  if (password.length > 128) return "Parola çok uzun.";
  if (password.length < policy.minLength) return `Parola en az ${policy.minLength} karakter olmalı.`;
  if (policy.requireMix && !(/[a-zçğıöşü]/.test(password) && /[A-ZÇĞİÖŞÜ]/.test(password) && /\d/.test(password))) {
    return "Parola büyük harf, küçük harf ve rakam içermeli.";
  }
  return null;
}
