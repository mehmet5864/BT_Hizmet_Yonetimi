import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { canUseTopology } from "@/lib/topology/access";
import { ASSET_TYPE_TR } from "@/lib/topology/labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 15;

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (!canUseTopology(viewer.role)) return NextResponse.json({ error: "Yetkiniz yok." }, { status: 403 });

  const search = new URL(request.url).searchParams;
  const tip = search.get("tip");
  const type = tip === "kisi" ? "kisi" : tip === "hizmet" ? "hizmet" : "varlik";
  const q = (search.get("q") ?? "").trim().slice(0, 80);
  const id = (search.get("id") ?? "").trim();
  const assetType = (search.get("tur") ?? "").trim();

  if (type === "kisi") {
    const rows = await prisma.person.findMany({
      where: id
        ? { id }
        : q
          ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { sicilNo: { contains: q, mode: "insensitive" } }, { adUsername: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
          : {},
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, title: true, department: { select: { name: true } } },
      take: LIMIT,
    });
    return NextResponse.json({
      items: rows.map((p) => ({ id: p.id, label: p.fullName, sub: [p.title, p.department?.name].filter(Boolean).join(" · ") })),
    });
  }

  if (type === "hizmet") {
    const rows = await prisma.catalogService.findMany({
      where: id
        ? { id }
        : q
          ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { serviceNo: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }] }
          : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true, serviceNo: true, status: true, asset: { select: { name: true } } },
      take: LIMIT,
    });
    return NextResponse.json({
      items: rows.map((s) => ({ id: s.id, label: s.name, sub: [s.serviceNo, s.asset?.name].filter(Boolean).join(" · ") })),
    });
  }

  const rows = await prisma.asset.findMany({
    where: {
      ...(assetType ? { assetType } : {}),
      ...(id
        ? { id }
        : q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { stockNo: { contains: q, mode: "insensitive" } },
                { ipAddress: { contains: q, mode: "insensitive" } },
                { serialNo: { contains: q, mode: "insensitive" } },
                { brand: { contains: q, mode: "insensitive" } },
                { model: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, stockNo: true, assetType: true, ipAddress: true, brand: true, model: true },
    take: LIMIT,
  });
  return NextResponse.json({
    items: rows.map((a) => ({
      id: a.id,
      label: a.name?.trim() || [a.brand, a.model].filter(Boolean).join(" ") || a.stockNo || (ASSET_TYPE_TR[a.assetType] ?? a.assetType),
      sub: [ASSET_TYPE_TR[a.assetType] ?? a.assetType, a.ipAddress].filter(Boolean).join(" · "),
    })),
  });
}
