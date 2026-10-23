import { NextResponse } from "next/server";

import { exportZimmetForm } from "@/lib/inventory/zimmet-export";
import { buildZimmetDocument, parseAssetIds } from "@/lib/inventory/zimmet-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isFormat(value: string | null): value is "pdf" | "docx" {
  return value === "pdf" || value === "docx";
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const format = search.get("format");
  if (!isFormat(format)) {
    return NextResponse.json({ error: "format=pdf veya format=docx olmalı." }, { status: 400 });
  }

  const built = await buildZimmetDocument({
    personId: search.get("personId") ?? undefined,
    assetIds: parseAssetIds(search.getAll("assetIds").concat(search.get("ids") ?? "")),
  });
  if (!built.ok) return NextResponse.json({ error: built.message }, { status: built.status });

  const file = await exportZimmetForm(built.document, format);
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${built.document.filenameBase}.${file.ext}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
