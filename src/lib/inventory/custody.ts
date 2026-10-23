import { inventoryApproverIds } from "@/lib/auth/inventory";
import { prisma } from "@/lib/prisma";

export const CUSTODY_HELD = "HELD";
export const CUSTODY_FREE = "FREE";

export async function zimmetManagerIds() {
  const ids = await inventoryApproverIds();
  if (ids.length) return ids;
  const supers = await prisma.person.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  });
  return supers.map((person) => person.id);
}

export function custodyTransfer(input: {
  fromOwnerId: string;
  toOwnerId: string;
  custody: string | null | undefined;
  managerIds: Iterable<string>;
  fromName?: string | null;
}): { ok: true; custody: string } | { ok: false; message: string } {
  const managers = new Set(input.managerIds);
  const custody = input.custody === CUSTODY_FREE ? CUSTODY_FREE : CUSTODY_HELD;
  if (input.fromOwnerId === input.toOwnerId) return { ok: true, custody };
  if (custody === CUSTODY_FREE) return { ok: true, custody: CUSTODY_HELD };
  if (managers.has(input.toOwnerId) || managers.has(input.fromOwnerId)) {
    return { ok: true, custody: CUSTODY_HELD };
  }
  const who = input.fromName?.trim() || "başka bir personel";
  return {
    ok: false,
    message: `Bu cihaz şu an ${who} zimmetinde. Doğrudan başkasına verilemez. Önce zimmeti boşa çıkarın ya da zimmet yöneticisinin üzerine alın, sonra yeni kişiye zimmetleyin.`,
  };
}
