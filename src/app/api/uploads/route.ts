import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { sniffUpload } from "@/lib/security/image";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
  }
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Dosya boyutu en fazla 15 MB olabilir." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffUpload(buffer);
  if (!sniffed) {
    return NextResponse.json({ error: "Yalnızca PDF, PNG, JPEG, WEBP veya GIF yükleyebilirsiniz." }, { status: 415 });
  }

  const fileName = `${randomUUID()}.${sniffed.ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);

  return NextResponse.json({ url: `/uploads/${fileName}` });
}
