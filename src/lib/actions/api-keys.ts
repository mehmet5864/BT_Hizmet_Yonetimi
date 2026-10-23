"use server";

import { revalidatePath } from "next/cache";

import { isAllowEntry, parseAllowlist } from "@/lib/api/guard";
import { generateApiToken } from "@/lib/api/keys";
import { isApiScope, normalizeScopes } from "@/lib/api/scopes";
import { requireModule } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/security/http";
import { saved, type ActionState } from "./shared";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createApiKey(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const name = clampText(text(formData, "name"), 80);
  if (!name) return { ok: false, message: "Anahtar adı zorunludur." };
  const ownerId = text(formData, "ownerId") || null;
  if (ownerId) {
    const person = await prisma.person.findUnique({ where: { id: ownerId }, select: { id: true } });
    if (!person) return { ok: false, message: "Bağlanacak personel bulunamadı." };
  }
  const scopes = normalizeScopes(formData.getAll("scope").map((value) => String(value)));
  if (!scopes.length) return { ok: false, message: "En az bir kapsam seçin." };
  const hasWrite = scopes.some((scope) => scope.endsWith(":write"));
  if (hasWrite && !ownerId) {
    return { ok: false, message: "Yazma kapsamı için anahtarı bir personele bağlayın." };
  }

  const daysRaw = Number(text(formData, "expiresDays"));
  let days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.floor(daysRaw) : 90;
  if (text(formData, "expiresDays") === "0" && !hasWrite) days = 0;
  if (hasWrite) days = Math.min(Math.max(days || 90, 1), 365);
  if (!hasWrite && days > 730) days = 730;
  const expiresAt = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

  const cidrRaw = text(formData, "allowedCidrs");
  const allowed = parseAllowlist(cidrRaw).filter(isAllowEntry).slice(0, 20);
  if (cidrRaw && !allowed.length) {
    return { ok: false, message: "İzinli adresler IPv4 veya CIDR olmalıdır (ör. 10.0.0.0/8)." };
  }

  const generated = generateApiToken();
  await prisma.apiKey.create({
    data: {
      name,
      prefix: generated.prefix,
      secretHash: generated.secretHash,
      scopes: JSON.stringify(scopes),
      ownerId,
      createdById: access.viewer.id,
      expiresAt,
      allowedCidrs: JSON.stringify(allowed),
    },
  });
  await prisma.activityLog.create({
    data: {
      entityType: "ApiKey",
      action: "CREATE",
      actor: access.viewer.id,
      note: `API anahtarı oluşturuldu: ${name} (${generated.prefix})`,
    },
  });
  revalidatePath("/api-arayuzu");
  return {
    ...saved(undefined, "API anahtarı oluşturuldu. Değeri bir kez kopyalayın; tekrar gösterilmez."),
    token: generated.token,
    prefix: generated.prefix,
  };
}

export async function revokeApiKey(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const id = text(formData, "id");
  if (!id) return { ok: false, message: "Anahtar belirtilmedi." };
  const row = await prisma.apiKey.findUnique({ where: { id } });
  if (!row) return { ok: false, message: "Anahtar bulunamadı." };
  if (row.revokedAt) return saved(undefined, "Anahtar zaten iptal.");
  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  await prisma.activityLog.create({
    data: {
      entityType: "ApiKey",
      entityId: id,
      action: "REVOKE",
      actor: access.viewer.id,
      note: `API anahtarı iptal edildi: ${row.name}`,
    },
  });
  revalidatePath("/api-arayuzu");
  return saved(undefined, "API anahtarı iptal edildi.");
}

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  ownerName: string | null;
  createdByName: string | null;
  allowedCidrs: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export async function listApiKeysForSettings(): Promise<ApiKeyRow[]> {
  const access = await requireModule("/ayarlar");
  if (access.error) return [];
  const rows = await prisma.apiKey.findMany({
    include: {
      owner: { select: { fullName: true } },
      createdBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scopes: (() => {
      try {
        return (JSON.parse(row.scopes) as unknown[]).map(String).filter(isApiScope);
      } catch {
        return [];
      }
    })(),
    ownerName: row.owner?.fullName ?? null,
    createdByName: row.createdBy?.fullName ?? null,
    allowedCidrs: parseAllowlist(row.allowedCidrs),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}
