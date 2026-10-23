"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireModule } from "@/lib/auth/viewer";
import { nextTicketNo } from "@/lib/itil/constants";
import { prisma } from "@/lib/prisma";

const BASE = "/hizmetler/bilgi";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function back(path: string, error: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}hata=${encodeURIComponent(error)}`);
}

const SOURCES = ["INCIDENT", "PROBLEM", "CHANGE", "REQUEST", "VULNERABILITY", "PATCH"];

export async function saveArticle(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  const errPath = id ? `${BASE}/${id}/duzenle` : `${BASE}/yeni`;
  const access = await requireModule("/hizmetler");
  if (access.error) back(errPath, access.error.message ?? "Yetki yok.");
  if (access.viewer!.role === "USER") back(errPath, "Makale yazma yetkiniz yok.");
  const title = text(formData, "title");
  const body = text(formData, "body");
  if (!title) back(errPath, "Başlık zorunludur.");
  if (!body) back(errPath, "İçerik zorunludur.");
  const status = text(formData, "status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const data = {
    title: title!.slice(0, 200),
    body: body!.slice(0, 20000),
    category: text(formData, "category")?.slice(0, 80) ?? null,
    tags: text(formData, "tags")?.slice(0, 200) ?? null,
    status,
  };
  if (id) {
    const current = await prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!current) back(BASE, "Makale bulunamadı.");
    await prisma.knowledgeArticle.update({ where: { id }, data });
    revalidatePath(BASE);
    redirect(`${BASE}/${id}`);
  }
  const sourceType = text(formData, "sourceType");
  const last = await prisma.knowledgeArticle.findFirst({ orderBy: { articleNo: "desc" }, select: { articleNo: true } });
  const created = await prisma.knowledgeArticle.create({
    data: {
      ...data,
      articleNo: nextTicketNo("BIL", last?.articleNo),
      authorId: access.viewer!.id,
      sourceType: sourceType && SOURCES.includes(sourceType) ? sourceType : null,
      sourceId: sourceType && SOURCES.includes(sourceType) ? text(formData, "sourceId") : null,
      sourceNo: sourceType && SOURCES.includes(sourceType) ? text(formData, "sourceNo") : null,
    },
  });
  revalidatePath(BASE);
  redirect(`${BASE}/${created.id}`);
}

export async function deleteArticle(formData: FormData): Promise<void> {
  const access = await requireModule("/hizmetler");
  if (access.error || access.viewer.role === "USER") return;
  const id = text(formData, "id");
  if (!id) return;
  const art = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!art) return;
  const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(String(access.viewer.role));
  if (!isAdmin && art.authorId !== access.viewer.id) return;
  await prisma.knowledgeArticle.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { entityType: "KnowledgeArticle", entityId: id, action: "DELETE", note: `${art.articleNo} silindi` },
  });
  revalidatePath(BASE);
  redirect(BASE);
}
