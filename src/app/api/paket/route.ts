import { readFile } from "node:fs/promises";

import { findReleaseZip } from "@/lib/release-zip";

export const dynamic = "force-dynamic";

export async function GET() {
  const zip = findReleaseZip();
  if (!zip) {
    return new Response("Kurulum paketi henüz hazır değil.", { status: 404 });
  }
  const body = await readFile(zip.path);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `attachment; filename="${zip.name}"`,
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
