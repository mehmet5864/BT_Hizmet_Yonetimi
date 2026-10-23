"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireModule } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { BUILTIN_TEMPLATES, FLOW_KINDS, findRecord, parseStepLines, parseSteps, type FlowKind } from "@/lib/process-flow";

const BASE = "/hizmetler/akis";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function back(path: string, error: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}hata=${encodeURIComponent(error)}`);
}

export async function saveProcessTemplate(formData: FormData): Promise<void> {
  const access = await requireModule("/hizmetler");
  if (access.error) back(`${BASE}/sablon/yeni`, access.error.message ?? "Yetki yok.");
  const name = text(formData, "name");
  if (!name) back(`${BASE}/sablon/yeni`, "Şablon adı zorunludur.");
  const parsed = parseStepLines(String(formData.get("steps") ?? ""));
  if (parsed.error) back(`${BASE}/sablon/yeni`, parsed.error);
  await prisma.processTemplate.create({
    data: { name: name!, description: text(formData, "description"), steps: JSON.stringify(parsed.steps), createdById: access.viewer!.id },
  });
  revalidatePath(BASE);
  redirect(BASE);
}

export async function deleteProcessTemplate(formData: FormData): Promise<void> {
  const access = await requireModule("/hizmetler");
  if (access.error) return;
  const id = text(formData, "id");
  if (!id) return;
  await prisma.processTemplate.deleteMany({ where: { id } });
  revalidatePath(BASE);
}

export async function startProcessFlow(formData: FormData): Promise<void> {
  const access = await requireModule("/hizmetler");
  if (access.error) back(BASE, access.error.message ?? "Yetki yok.");
  const key = text(formData, "template");
  if (!key) back(BASE, "Şablon seçin.");
  let steps;
  let defaultName = "";
  if (key!.startsWith("builtin:")) {
    const t = BUILTIN_TEMPLATES.find((x) => x.key === key);
    if (!t) back(BASE, "Şablon bulunamadı.");
    steps = t!.steps;
    defaultName = t!.name;
  } else {
    const t = await prisma.processTemplate.findUnique({ where: { id: key! } });
    if (!t) back(BASE, "Şablon bulunamadı.");
    steps = parseSteps(t!.steps);
    defaultName = t!.name;
  }
  if (!steps.length) back(BASE, "Şablonda adım yok.");
  const name = text(formData, "name") ?? defaultName;
  const year = new Date().getFullYear();
  const count = await prisma.processFlow.count({ where: { flowNo: { startsWith: `AKS-${year}-` } } });
  const flowNo = `AKS-${year}-${String(count + 1).padStart(4, "0")}`;
  const flow = await prisma.processFlow.create({
    data: {
      flowNo,
      name,
      note: text(formData, "note"),
      createdById: access.viewer!.id,
      steps: { create: steps.map((s, i) => ({ position: i + 1, kind: s.kind, title: s.title })) },
    },
  });
  revalidatePath(BASE);
  redirect(`${BASE}/${flow.id}`);
}

export async function linkFlowStep(formData: FormData): Promise<void> {
  const flowId = text(formData, "flowId") ?? "";
  const path = `${BASE}/${flowId}`;
  const access = await requireModule("/hizmetler");
  if (access.error) back(path, access.error.message ?? "Yetki yok.");
  const stepId = text(formData, "stepId");
  const no = text(formData, "recordNo");
  if (!stepId || !no) back(path, "Kayıt numarasını girin.");
  const step = await prisma.processFlowStep.findUnique({ where: { id: stepId! } });
  if (!step || step.flowId !== flowId) back(path, "Adım bulunamadı.");
  if (!(FLOW_KINDS as readonly string[]).includes(step!.kind)) back(path, "Geçersiz adım türü.");
  const rec = await findRecord(step!.kind as FlowKind, no!);
  if (!rec) back(path, `${no} numaralı kayıt bulunamadı (tür: ${step!.kind}).`);
  await prisma.processFlowStep.update({ where: { id: step!.id }, data: { recordId: rec!.id, recordNo: rec!.no } });
  revalidatePath(path);
  redirect(path);
}

export async function unlinkFlowStep(formData: FormData): Promise<void> {
  const access = await requireModule("/hizmetler");
  if (access.error) return;
  const stepId = text(formData, "stepId");
  const flowId = text(formData, "flowId");
  if (!stepId) return;
  await prisma.processFlowStep.updateMany({ where: { id: stepId }, data: { recordId: null, recordNo: null } });
  if (flowId) revalidatePath(`${BASE}/${flowId}`);
}

export async function deleteProcessFlow(formData: FormData): Promise<void> {
  const access = await requireModule("/hizmetler");
  if (access.error) return;
  const id = text(formData, "id");
  if (!id) return;
  await prisma.processFlow.deleteMany({ where: { id } });
  revalidatePath(BASE);
  redirect(BASE);
}
