import { NextResponse } from "next/server";

import { getInventoryAccess } from "@/lib/auth/inventory";
import { buildInventoryTemplate } from "@/lib/inventory/bulk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getInventoryAccess();
  if (!access) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (!access.canDirectMutate) {
    return NextResponse.json({ error: "Envanter şablonu için yetkiniz yok." }, { status: 403 });
  }

  const workbook = await buildInventoryTemplate();
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="envanter-toplu-sablon.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
