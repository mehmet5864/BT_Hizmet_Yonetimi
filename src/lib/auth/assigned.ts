import { cache } from "react";

import { ASSIGNABLE_MODULES, assignedGrantName } from "@/lib/auth/assigned-defs";
import { prisma } from "@/lib/prisma";

type Counter = { count: (args: { where: Record<string, unknown> }) => Promise<number> };

const SOURCES: { module: (typeof ASSIGNABLE_MODULES)[number]; model: string; fields: string[] }[] = [
  { module: "olay", model: "incident", fields: ["l1AnalystId", "l2AnalystId"] },
  { module: "problem", model: "problem", fields: ["assigneeId", "proposedAssigneeId"] },
  { module: "degisiklik", model: "changeRecord", fields: ["targetMgr1Id", "targetMgr2Id", "targetMgr3Id"] },
  { module: "yama", model: "patchRecord", fields: ["assetOwnerId"] },
  { module: "zafiyet", model: "vulnerability", fields: ["ownerId", "managerId"] },
  { module: "firma-sla", model: "slaTicket", fields: ["ownerId"] },
  { module: "konfigurasyon", model: "appConfig", fields: ["ownerId", "managerId"] },
  { module: "cevik", model: "agileItem", fields: ["assigneeId"] },
  { module: "surec", model: "itilProcessRecord", fields: ["ownerId"] },
];

/** Kişiye en az bir kayıt atanmış modüller için "assigned:<modül>" grup adları. */
export const assignedGroupsFor = cache(async (personId: string): Promise<string[]> => {
  const db = prisma as unknown as Record<string, Counter>;
  const hits = await Promise.all(
    SOURCES.map(async (source) => {
      try {
        const n = await db[source.model].count({ where: { OR: source.fields.map((field) => ({ [field]: personId })) } });
        return n > 0 ? assignedGrantName(source.module) : null;
      } catch {
        return null;
      }
    }),
  );
  return hits.filter((name): name is string => Boolean(name));
});
