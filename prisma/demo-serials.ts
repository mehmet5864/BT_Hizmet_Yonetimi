// @ts-nocheck
/**
 * Örnek (BIM-…) envanter kayıtları için tutarlı seri numarası üretir.
 * Aynı stok no her zaman aynı seri no'yu verir; yazılım kayıtları atlanır.
 */
const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function demoSerial(stockNo: string, brand?: string | null): string {
  let h = 2166136261;
  for (const ch of stockNo) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let body = "";
  for (let i = 0; i < 8; i++) {
    body += ALPHABET[h % ALPHABET.length];
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  }
  const prefix = (brand ?? "SN").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "SN";
  return `${prefix}${body}`;
}

/** Seri no'su boş olan örnek donanım kayıtlarını doldurur (idempotent). */
export async function fillDemoSerials(prisma): Promise<number> {
  const rows = await prisma.asset.findMany({
    where: { serialNo: null, assetType: { notIn: ["SOFTWARE", "APPLICATION"] }, stockNo: { startsWith: "BIM-" } },
    select: { id: true, stockNo: true, brand: true, deviceId: true },
  });
  for (const row of rows) {
    await prisma.asset.update({
      where: { id: row.id },
      data: { serialNo: row.deviceId ?? demoSerial(row.stockNo, row.brand) },
    });
  }
  return rows.length;
}
