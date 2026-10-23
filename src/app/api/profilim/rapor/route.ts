import { NextResponse } from "next/server";

import { hasModuleLevel } from "@/lib/auth/acl";
import { getSession } from "@/lib/auth/session";
import { getViewerAcl } from "@/lib/auth/viewer";
import { buildPersonWorkloadReport } from "@/lib/person-workload-report";
import { exportReport } from "@/lib/reports/export";
import type { ReportFormat } from "@/lib/reports/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isFormat(value: string | null): value is ReportFormat {
  return value === "csv" || value === "pdf" || value === "docx";
}

/** Giriş yapan herkes kendi çalışma özetini indirir; başkasınınkini yalnızca personel modülünü görebilenler. */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { viewer, grants } = await getViewerAcl();
  if (!viewer) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const search = new URL(request.url).searchParams;
  const format = search.get("format");
  if (!isFormat(format)) return NextResponse.json({ error: "format=csv|pdf|docx olmalı." }, { status: 400 });

  const requested = search.get("personId")?.trim() || viewer.id;
  if (requested !== viewer.id && !(viewer.role === "SUPER_ADMIN" || hasModuleLevel(grants, viewer.groups ?? [], "personel", "VIEW", viewer.role))) {
    return NextResponse.json({ error: "Bu rapora yetkiniz yok." }, { status: 403 });
  }

  const report = await buildPersonWorkloadReport(requested);
  if (!report) return NextResponse.json({ error: "Kişi bulunamadı." }, { status: 404 });
  const file = await exportReport(report, format);
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="calisma-ozeti.${file.ext}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
