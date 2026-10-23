import { cache } from "react";

import { getViewer } from "@/lib/auth/viewer";
import { isRequestOffice, type RequestViewer } from "@/lib/itil/request-scope";
import { unitPersonIds } from "@/lib/auth/unit-people";
import { prisma } from "@/lib/prisma";

/**
 * Kayıt kapsamı (satır düzeyi yetki).
 *
 * - USER: yalnızca kendine atanan veya kendisinin açtığı kayıtlar; personelde yalnızca kendisi.
 * - UNIT_MANAGER: kendisi + biriminde çalışanların atandığı / açtığı kayıtlar; personelde kendisi + birim personeli.
 * - SYSTEM_ADMIN: birim kapsamına ek olarak kendi ofisinin (requestOffice, yoksa Sistem) kayıtları ve
 *   sahibi kendisi / birim personeli olan envantere bağlı kayıtlar.
 * - Diğer roller (SUPER_ADMIN, SENIOR_MANAGER, INFOSEC_MANAGER): önceki davranış, kapsam filtresi yok.
 */
export type DataScope =
  | { all: true }
  | { all: false; role: string; personIds: string[]; offices: string[]; assetOwnerIds: string[] };

const SCOPED_ROLES = ["USER", "UNIT_MANAGER", "SYSTEM_ADMIN"] as const;

export function isScopedRole(role?: string | null) {
  return Boolean(role && (SCOPED_ROLES as readonly string[]).includes(role));
}

export async function resolveDataScope(viewer: RequestViewer): Promise<DataScope> {
  const role = String(viewer.role ?? "USER");
  if (!isScopedRole(role)) return { all: true };
  if (role === "USER") return { all: false, role, personIds: [viewer.id], offices: [], assetOwnerIds: [] };
  const personIds = await unitPersonIds(viewer);
  if (role === "UNIT_MANAGER") return { all: false, role, personIds, offices: [], assetOwnerIds: [] };
  const office = isRequestOffice(viewer.requestOffice) ? viewer.requestOffice : "SISTEM";
  return { all: false, role, personIds, offices: [office], assetOwnerIds: personIds };
}

export const getDataScope = cache(async (): Promise<DataScope | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  return resolveDataScope(viewer);
});

const PERSON_FIELDS: Record<string, string[]> = {
  incident: ["requesterId", "requestingManagerId", "l1AnalystId", "l2AnalystId"],
  problem: ["requesterId", "requestingManagerId", "proposedAssigneeId", "assigneeId"],
  changeRecord: ["requesterId", "requestingManagerId", "targetMgr1Id", "targetMgr2Id", "targetMgr3Id"],
  patchRecord: ["requesterId", "requestingManagerId", "assetOwnerId"],
  vulnerability: ["ownerId", "managerId"],
  slaTicket: ["ownerId", "requesterId", "requestingManagerId"],
  appConfig: ["ownerId", "managerId"],
  itilProcessRecord: ["requesterId", "requestingManagerId", "ownerId"],
  agileItem: ["assigneeId", "reporterId"],
  agileMeeting: ["createdById"],
};

const HAS_ASSET = new Set(["incident", "problem", "changeRecord", "patchRecord", "vulnerability", "slaTicket", "appConfig", "itilProcessRecord"]);
const OFFICE_FIELDS: Record<string, string[]> = { incident: ["escalatedOffice"] };

function lowerFirst(name: string) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** Modele eklenecek kapsam koşulu. null: bu modelde kapsam uygulanmaz. */
export function scopeWhereFor(model: string, scope: DataScope): Record<string, unknown> | null {
  if (scope.all) return null;
  const key = lowerFirst(model);
  if (key === "person") return { id: { in: scope.personIds } };
  // Düz kullanıcı yalnızca kendisine görev düştüğü (atanan / açan) veya sahibi olduğu ürün ve sprintleri görür.
  if (key === "agileProduct" || key === "agileSprint") {
    if (scope.role !== "USER") return null;
    const mine = {
      OR: [
        { ownerId: { in: scope.personIds } },
        { items: { some: { OR: [{ assigneeId: { in: scope.personIds } }, { reporterId: { in: scope.personIds } }] } } },
      ],
    };
    return key === "agileProduct" ? mine : { product: mine };
  }
  const fields = PERSON_FIELDS[key];
  if (!fields) return null;
  const or: Record<string, unknown>[] = fields.map((field) => ({ [field]: { in: scope.personIds } }));
  if (scope.role === "SYSTEM_ADMIN") {
    for (const field of OFFICE_FIELDS[key] ?? []) or.push({ [field]: { in: scope.offices } });
    if (HAS_ASSET.has(key)) or.push({ asset: { ownerId: { in: scope.assetOwnerIds } } });
  }
  return { OR: or };
}

const SCOPED_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

const UNIQUE_OPERATIONS = new Set(["findUnique", "findUniqueOrThrow", "update", "delete"]);

function buildScopedClient(scope: DataScope): typeof prisma {
  if (scope.all) return prisma;
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const extra = scopeWhereFor(model, scope);
          if (!extra || !SCOPED_OPERATIONS.has(operation)) return query(args);
          const next = args as { where?: Record<string, unknown> };
          if (UNIQUE_OPERATIONS.has(operation) && next.where) {
            // Tekil sorgularda benzersiz alan üst düzeyde kalmalı; kapsam AND içine eklenir.
            const existing = next.where.AND;
            const list = Array.isArray(existing) ? existing : existing ? [existing] : [];
            next.where = { ...next.where, AND: [...list, extra] };
          } else {
            next.where = next.where ? { AND: [next.where, extra] } : extra;
          }
          return query(next as never);
        },
      },
    },
  }) as unknown as typeof prisma;
}

/**
 * Oturumdaki kullanıcının kapsamına göre süzen Prisma istemcisi.
 * Liste, detay, düzenleme sayfalarında ve panel sayaçlarında `prisma` yerine kullanılır.
 * Kapsamsız roller için doğrudan `prisma` döner. Giriş yoksa da `prisma` döner (sayfa yetkisi ayrıca denetlenir).
 */
export const getScopedDb = cache(async (): Promise<typeof prisma> => {
  const scope = await getDataScope();
  if (!scope) return prisma;
  return buildScopedClient(scope);
});

/** Oturum dışı bağlamlar (rapor üretimi, API) için: verilen kullanıcıya göre süzen istemci. */
export async function scopedDbForViewer(viewer: RequestViewer): Promise<typeof prisma> {
  return buildScopedClient(await resolveDataScope(viewer));
}

/** Tek kayıt eylemleri için: kayıt kullanıcının kapsamında mı? */
export async function canSeeRecord(model: keyof typeof prisma & string, id: string) {
  const db = await getScopedDb();
  const delegate = (db as unknown as Record<string, { count: (args: unknown) => Promise<number> }>)[model];
  if (!delegate) return true;
  return (await delegate.count({ where: { id } })) > 0;
}
