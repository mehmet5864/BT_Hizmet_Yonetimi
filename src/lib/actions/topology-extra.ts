"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { canUseTopology } from "@/lib/topology/access";

type Result<T = undefined> = { ok: boolean; message?: string; data?: T };

async function guard() {
  const viewer = await getViewer();
  if (!viewer || !canUseTopology(viewer.role)) return null;
  return viewer;
}

const DENIED = { ok: false as const, message: "Bu işlem için yetkiniz yok." };

export async function saveTopologyLayout(serviceId: string, items: { key: string; x: number; y: number }[]): Promise<Result> {
  try {
    if (!(await guard())) return DENIED;
    const clean = items
      .filter((i) => i && typeof i.key === "string" && i.key.length <= 200 && Number.isFinite(i.x) && Number.isFinite(i.y))
      .slice(0, 300);
    if (!serviceId || !clean.length) return { ok: false, message: "Kaydedilecek konum yok." };
    await prisma.$transaction(
      clean.map((i) =>
        prisma.topologyLayout.upsert({
          where: { serviceId_nodeKey: { serviceId, nodeKey: i.key } },
          update: { x: i.x, y: i.y },
          create: { serviceId, nodeKey: i.key, x: i.x, y: i.y },
        }),
      ),
    );
    return { ok: true };
  } catch {
    return { ok: false, message: "Konum kaydedilemedi." };
  }
}

export async function resetTopologyLayout(serviceId: string): Promise<Result> {
  try {
    if (!(await guard())) return DENIED;
    await prisma.topologyLayout.deleteMany({ where: { serviceId } });
    return { ok: true };
  } catch {
    return { ok: false, message: "Düzen sıfırlanamadı." };
  }
}

export type NoteRow = { id: string; nodeKey: string; text: string; author: string | null; createdAt: string };

export async function addTopologyNote(serviceId: string, nodeKey: string, nodeLabel: string, text: string): Promise<Result<NoteRow>> {
  try {
    const viewer = await guard();
    if (!viewer) return DENIED;
    const body = text.trim().slice(0, 1000);
    if (!serviceId || !nodeKey || !body) return { ok: false, message: "Not metnini yazın." };
    const session = await getSession();
    const row = await prisma.topologyNote.create({
      data: { serviceId, nodeKey: nodeKey.slice(0, 200), nodeLabel: nodeLabel.slice(0, 200), text: body, author: session?.fullName ?? null },
    });
    return { ok: true, data: { id: row.id, nodeKey: row.nodeKey, text: row.text, author: row.author, createdAt: row.createdAt.toISOString() } };
  } catch {
    return { ok: false, message: "Not kaydedilemedi." };
  }
}

export async function deleteTopologyNote(id: string): Promise<Result> {
  try {
    if (!(await guard())) return DENIED;
    await prisma.topologyNote.delete({ where: { id } });
    return { ok: true };
  } catch {
    return { ok: false, message: "Not silinemedi." };
  }
}

export async function addTopologyReference(title: string, url: string, fileName: string, note: string): Promise<Result> {
  try {
    if (!(await guard())) return DENIED;
    if (!/^\/uploads\/[A-Za-z0-9._-]+$/.test(url)) return { ok: false, message: "Geçersiz dosya." };
    const kind = /\.pdf$/i.test(url) ? "PDF" : "IMAGE";
    const session = await getSession();
    await prisma.topologyReference.create({
      data: { title: title.trim().slice(0, 120) || fileName.slice(0, 120) || "Genel topoloji", url, fileName: fileName.slice(0, 200) || null, kind, note: note.trim().slice(0, 500) || null, uploadedBy: session?.fullName ?? null },
    });
    revalidatePath("/hizmetler/topoloji");
    return { ok: true };
  } catch {
    return { ok: false, message: "Referans kaydedilemedi." };
  }
}

export async function deleteTopologyReference(id: string): Promise<Result> {
  try {
    if (!(await guard())) return DENIED;
    await prisma.topologyReference.delete({ where: { id } });
    revalidatePath("/hizmetler/topoloji");
    return { ok: true };
  } catch {
    return { ok: false, message: "Referans silinemedi." };
  }
}
