"use server";

import { revalidatePath } from "next/cache";

import { requireModule } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { parseGraph, validateGraph, WORKFLOW_ENTITIES, type WorkflowEntity } from "@/lib/workflow/graph";
import { saved, type ActionState } from "./shared";

async function superOnly() {
  const access = await requireModule("/ayarlar");
  if (access.error) return { error: access.error, viewer: null };
  if (access.viewer.role !== "SUPER_ADMIN") {
    return { error: { ok: false, message: "İş akışlarını yalnızca süper yönetici düzenleyebilir." } as ActionState, viewer: null };
  }
  return { error: null, viewer: access.viewer };
}

function isEntity(value: string): value is WorkflowEntity {
  return (WORKFLOW_ENTITIES as readonly string[]).includes(value);
}

export async function saveWorkflow(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = await superOnly();
  if (guard.error) return guard.error;

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const entity = String(formData.get("entityType") ?? "");
  const enabled = formData.get("enabled") === "on";
  const rawGraph = String(formData.get("graph") ?? "");

  if (name.length < 3 || name.length > 80) return { ok: false, message: "Ad 3–80 karakter olmalı." };
  if (!isEntity(entity)) return { ok: false, message: "Kayıt türü geçersiz." };
  if (rawGraph.length > 200_000) return { ok: false, message: "Akış çok büyük." };

  const graph = parseGraph(rawGraph);
  if (graph.nodes.length > 60) return { ok: false, message: "En çok 60 düğüm kullanılabilir." };
  const errors = validateGraph(graph);
  if (enabled && errors.length) {
    return { ok: false, message: `Etkinleştirmek için akış geçerli olmalı: ${errors[0]}` };
  }

  const data = { name, entityType: entity, enabled, graph: JSON.stringify(graph) };
  let savedId = id;
  if (id) {
    await prisma.workflowDefinition.update({ where: { id }, data });
  } else {
    const created = await prisma.workflowDefinition.create({ data });
    savedId = created.id;
  }
  if (enabled) {
    // Aynı türde tek etkin akış
    await prisma.workflowDefinition.updateMany({
      where: { entityType: entity, enabled: true, NOT: { id: savedId } },
      data: { enabled: false },
    });
  }
  revalidatePath("/ayarlar/is-akislari");
  return saved(`/ayarlar/is-akislari?id=${savedId}`, errors.length ? `Taslak kaydedildi (${errors.length} eksik var, etkinleştirilemez).` : "Akış kaydedildi.");
}

export async function deleteWorkflow(formData: FormData) {
  const guard = await superOnly();
  if (guard.error) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.workflowDefinition.delete({ where: { id } }).catch(() => null);
  revalidatePath("/ayarlar/is-akislari");
}
