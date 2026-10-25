import { NextResponse } from "next/server";

import { canAccessWithAcl, hasModuleLevel } from "@/lib/auth/acl";
import { getViewerAcl } from "@/lib/auth/viewer";
import { getSession } from "@/lib/auth/session";
import { canViewReport } from "@/lib/reports/catalog";
import { exportReport } from "@/lib/reports/export";
import { parseReportFilters } from "@/lib/reports/filters";
import { buildReport } from "@/lib/reports/query";
import type { ReportFormat } from "@/lib/reports/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isFormat(value: string | null): value is ReportFormat {
  return value === "csv" || value === "pdf" || value === "docx";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { viewer, grants } = await getViewerAcl();
  if (!viewer || !hasModuleLevel(grants, viewer.groups ?? [], "raporlar", "VIEW", viewer.role)) {
    return NextResponse.json({ error: "Bu rapora yetkiniz yok." }, { status: 403 });
  }

  const { id } = await params;
  if (!canViewReport((path) => canAccessWithAcl(grants, viewer.groups ?? [], path, viewer.role), id)) {
    return NextResponse.json({ error: "Bu rapora yetkiniz yok." }, { status: 403 });
  }
  const search = new URL(request.url).searchParams;
  const format = search.get("format");
  if (format === "json") {
    // Önizleme: ilk satırlar ve toplam sayı (dosya üretmez).
    const preview = await buildReport(id, parseReportFilters(search), viewer);
    if (!preview) return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
    return NextResponse.json(
      {
        title: preview.title,
        description: preview.description,
        generatedAt: preview.generatedAt,
        total: preview.rows.length,
        summary: preview.summary ?? [],
        notes: preview.notes ?? [],
        columns: preview.columns.slice(0, 6),
        columnTotal: preview.columns.length,
        rows: preview.rows.slice(0, 6).map((row) => Object.fromEntries(preview.columns.slice(0, 6).map((c) => [c.key, row[c.key] ?? ""]))),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isFormat(format)) {
    return NextResponse.json({ error: "format=csv|pdf|docx olmalı." }, { status: 400 });
  }

  const report = await buildReport(id, parseReportFilters(search), viewer);
  if (!report) return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });

  const file = await exportReport(report, format);
  const filename = `${id.replace(/[^a-z0-9_-]/gi, "")}.${file.ext}`;
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
