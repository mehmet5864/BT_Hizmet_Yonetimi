"use server";

import { startWorkflowIfAny } from "@/lib/workflow/engine";
import { licenseSeatError } from "@/lib/license";
import { revalidatePath } from "next/cache";

import { canAssignRole, canManagePerson, isPersonnelRole, ROLE_SOURCES } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/password";
import { passwordPolicyError } from "@/lib/security/policy";
import { isSafeUploadUrl } from "@/lib/security/http";
import { getViewer, requireModule } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { approvalStatus, notifyIntegrations, notifyProblemAssignment, notifySlaOpened } from "@/lib/integrations/notify";
import { viewerCanApproveProblemAssignment } from "@/lib/itil/catalog";
import { MAX_CHANGE_APPROVAL_UNITS } from "@/lib/itil/change-approvals";
import {
  CHANGE_STATUSES,
  CONTRACT_SLA_LEVELS,
  INCIDENT_STATUSES,
  PROBLEM_STATUSES,
  TICKET_STATUSES,
  VULN_STATUSES,
  nextTicketNo,
  slaLevelToSeverity,
  VENDOR_CONTACT_KINDS,
  VENDOR_LICENSE_TYPES,
  VENDOR_SPEC_KINDS,
} from "@/lib/itil/constants";
import { collectVendorEmails, isEmail, parseEmailList, slaWindowLabel } from "@/lib/itil/vendor-sla";
import { departmentOrgDefaults, firstFilled, personOrgDefaults } from "@/lib/forms/person-defaults";
import { resolveModuleManager, resolveOfficeApprover } from "@/lib/itil/office-officers";
import { getRequestType, type RequestTypeKey } from "@/lib/itil/request-types";
import { canEditRequest, canProcessRequest, isRequestOffice, isRequesterOnly } from "@/lib/itil/request-scope";
import { autoEscalationReason, isRequestSeverity, shouldAutoEscalate } from "@/lib/itil/escalation";
import { recordScore } from "@/lib/scoring";
import { CHANGE_TYPES, checkStatus, INVALID_STATUS, isIn, RISK_LEVELS } from "@/lib/itil/guards";
import { derivePriority, incidentDueDates, isLevel, requestDueDate } from "@/lib/itil/sla";
import { findRecord } from "@/lib/process-flow";
import { notifyAssignment } from "@/lib/integrations/assignment";
import { fail, saved, type ActionState } from "./shared";
import { canSeeRecord } from "@/lib/auth/data-scope";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function dateVal(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function log(entityType: string, entityId: string, action: string, note: string) {
  await prisma.activityLog.create({ data: { entityType, entityId, action, note } });
}

/** Yeni kayıtta durumu formdan almayız; başlangıç durumunu süreç akışı belirler. */
function dropCreateStatus(formData: FormData) {
  if (!String(formData.get("id") ?? "").trim()) formData.delete("status");
}

export async function savePerson(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/personel");
  if (access.error) return access.error;

  const id = text(formData, "id");
  if (id && !(await canSeeRecord("person", id))) return { ok: false, message: "Bu personele erişim yetkiniz yok." };
  const fullName = text(formData, "fullName");
  if (!fullName) return { ok: false, message: "Ad soyad zorunludur." };

  const role = text(formData, "role") ?? "USER";
  if (!isPersonnelRole(role) || !canAssignRole(access.viewer.role, role)) {
    return { ok: false, message: "Bu rolü atama yetkiniz yok." };
  }
  if (id) {
    const existing = await prisma.person.findUnique({ where: { id }, select: { role: true } });
    if (!existing) return { ok: false, message: "Personel bulunamadı." };
    if (!canManagePerson(access.viewer.role, existing.role)) {
      return { ok: false, message: "Bu personeli düzenleme yetkiniz yok." };
    }
  }

  const photoUrl = text(formData, "photoUrl");
  if (!isSafeUploadUrl(photoUrl)) return { ok: false, message: "Fotoğraf adresi geçersiz." };
  const roleSource = text(formData, "roleSource") ?? "MANUAL";
  if (!(ROLE_SOURCES as readonly string[]).includes(roleSource)) {
    return { ok: false, message: "Yetki kaynağı geçersiz." };
  }

  const data = {
    fullName,
    tcNo: text(formData, "tcNo"),
    sicilNo: text(formData, "sicilNo"),
    title: text(formData, "title"),
    duty: text(formData, "duty"),
    workplace: text(formData, "workplace"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    photoUrl,
    role,
    roleSource,
    adUsername: text(formData, "adUsername"),
    departmentId: text(formData, "departmentId"),
    parentDepartmentId: text(formData, "parentDepartmentId"),
    unitManagerId: text(formData, "unitManagerId"),
    parentManagerId: text(formData, "parentManagerId"),
    requestOffice: isRequesterOnly(role) ? null : text(formData, "requestOffice"),
  };
  if (data.departmentId && (!data.unitManagerId || !data.parentDepartmentId || !data.parentManagerId)) {
    const dept = await departmentOrgDefaults(data.departmentId);
    data.unitManagerId = data.unitManagerId ?? dept.managerId ?? null;
    data.parentDepartmentId = data.parentDepartmentId ?? dept.parentId ?? null;
    data.parentManagerId = data.parentManagerId ?? dept.parentManagerId ?? null;
  }

  const password = text(formData, "password");
  if (password) {
    const policy = await passwordPolicyError(password);
    if (policy) return { ok: false, message: policy };
  }
  const payload = password ? { ...data, passwordHash: hashPassword(password) } : data;

  if (!id) {
    const seatError = await licenseSeatError();
    if (seatError) return { ok: false, message: seatError };
  }

  try {
    const person = id
      ? await prisma.person.update({ where: { id }, data: payload })
      : await prisma.person.create({ data: payload });
    revalidatePath("/personel");
    return saved(`/personel/${person.id}`);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    if (raw.includes("Unique")) return { ok: false, message: "TC, sicil veya ad soyad başka kayıtta var." };
    return fail(error);
  }
}

export async function deletePerson(formData: FormData) {
  formData.set("kind", "person");
  const { deleteRecord } = await import("./delete-record");
  return deleteRecord({ ok: false }, formData);
}

function sessionTicketOwner(viewerId: string, existingRequesterId?: string | null) {
  return existingRequesterId || viewerId;
}

export async function saveRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dropCreateStatus(formData);
  const requestType = String(formData.get("requestType") ?? "") as RequestTypeKey;
  const typeDef = getRequestType(requestType);
  if (!typeDef) return { ok: false, message: "Geçersiz talep türü." };

  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Oturum gerekli." };

  const extras: Record<string, string> = {};
  for (const field of typeDef.extraFields) {
    const value = text(formData, field.id);
    if (field.required && !value) return { ok: false, message: `${field.label} zorunludur.` };
    if (value) extras[field.id] = value;
  }

  const id = text(formData, "id");
  const existing = id ? await prisma.serviceRequest.findUnique({ where: { id } }) : null;
  if (id && !existing) return { ok: false, message: "Talep bulunamadı." };
  if (existing && !canEditRequest(viewer, existing)) return { ok: false, message: "Bu talebi düzenleme yetkiniz yok." };

  const requesterId = sessionTicketOwner(viewer.id, existing?.requesterId);
  if (!requesterId) return { ok: false, message: "Talep sahibi zorunludur." };
  {
    const raw = text(formData, "status");
    if (raw && !checkStatus(TICKET_STATUSES, raw, "OPEN")) return { ok: false, message: INVALID_STATUS };
  }

  const severityRaw = text(formData, "severity") ?? "MEDIUM";
  const severity = isRequestSeverity(severityRaw) ? severityRaw : "MEDIUM";
  const officeApprover = await resolveOfficeApprover(typeDef.office, requesterId);
  const requesterOrg = await personOrgDefaults(requesterId);
  const approverDept = officeApprover
    ? (await prisma.person.findUnique({ where: { id: officeApprover }, select: { departmentId: true } }))?.departmentId ?? null
    : null;
  const payload = {
    requestType,
    office: typeDef.office,
    requesterId,
    requestDate: dateVal(formData, "requestDate") ?? new Date(),
    requestingDeptId: existing?.requestingDeptId ?? requesterOrg.departmentId ?? null,
    requestingManagerId: firstFilled(text(formData, "requestingManagerId"), officeApprover, requesterOrg.unitManagerId),
    handlingDeptId: approverDept,
    handlingManagerId: officeApprover ?? null,
    status: isRequesterOnly(viewer.role) ? "OPEN" : (text(formData, "status") ?? "OPEN"),
    severity,
    reason: text(formData, "reason"),
    description: text(formData, "description"),
    details: Object.keys(extras).length ? JSON.stringify(extras) : null,
  };

  try {
    if (id && existing) {
      if (!canProcessRequest(viewer, existing)) {
        payload.status = existing.status;
        payload.office = isRequestOffice(existing.office) ? existing.office : typeDef.office;
      }
      await prisma.serviceRequest.update({
        where: { id },
        data: {
          ...payload,
          resolvedAt: ["DONE", "REJECTED", "CANCELLED"].includes(payload.status) ? (existing.resolvedAt ?? new Date()) : null,
          ...(existing.resolveDueAt ? {} : { resolveDueAt: requestDueDate(existing.createdAt, payload.severity) }),
        },
      });
      await log("ServiceRequest", id, "UPDATE", `${typeDef.label} güncellendi`);
      await recordScore({ module: "request", created: false, entityId: id, entityNo: existing.requestNo, severity: payload.severity, prevStatus: existing.status, status: payload.status, actorId: viewer.id });
      revalidatePath("/talepler");
      revalidatePath(`/talepler/${id}`);
      revalidatePath("/", "layout");
      return saved(`/talepler/${id}`);
    }
    payload.status = (await approvalStatus("request", typeDef.office, payload.status)) ?? payload.status;
    const last = await prisma.serviceRequest.findFirst({ orderBy: { requestNo: "desc" }, select: { requestNo: true } });
    let autoEscalate: Record<string, unknown> = {};
    if (shouldAutoEscalate(severity)) {
      const parent = payload.requestingDeptId
        ? await prisma.department.findUnique({
            where: { id: payload.requestingDeptId },
            select: { parentId: true, parentManagerId: true },
          })
        : null;
      autoEscalate = {
        escalationKind: "UPPER_UNIT",
        escalationStatus: "PENDING",
        escalatedDeptId: parent?.parentId ?? payload.requestingDeptId,
        escalationReason: autoEscalationReason(severity),
        escalatedAt: new Date(),
      };
      if (severity === "CRITICAL" && payload.status === "OPEN") payload.status = "WAITING";
    }
    const created = await prisma.serviceRequest.create({
      data: { ...payload, ...autoEscalate, resolveDueAt: requestDueDate(new Date(), severity), requestNo: nextTicketNo("TAL", last?.requestNo) },
    });
    await log("ServiceRequest", created.id, "CREATE", `${typeDef.label} oluşturuldu`);
    await startWorkflowIfAny("request", created.id).catch(() => null);
    await recordScore({ module: "request", created: true, entityId: created.id, entityNo: created.requestNo, severity: created.severity, status: created.status, actorId: viewer.id });
    await notifyIntegrations({
      kind: "request",
      recordId: created.id,
      ticketNo: created.requestNo,
      title: typeDef.label,
      status: created.status,
      requesterId,
      managerIds: [payload.requestingManagerId, payload.handlingManagerId, officeApprover],
      office: typeDef.office,
    });
    revalidatePath("/talepler");
    revalidatePath(`/talepler/${created.id}`);
    revalidatePath("/", "layout");
    return saved(`/talepler/${created.id}`);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteRequest(formData: FormData) {
  formData.set("kind", "request");
  const { deleteRecord } = await import("./delete-record");
  return deleteRecord({ ok: false }, formData);
}

export async function saveChange(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dropCreateStatus(formData);
  const access = await requireModule("/degisiklik");
  if (access.error) return access.error;
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("changeRecord", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const existing = id
    ? await prisma.changeRecord.findUnique({
        where: { id },
        select: {
          requesterId: true,
          requestingDeptId: true,
          status: true,
          requestingManagerId: true,
          infosecManagerId: true,
          approvalUnits: { select: { managerId: true } },
        },
      })
    : null;
  if (id && !existing) return { ok: false, message: "Değişiklik bulunamadı." };
  const statusChecked = checkStatus(CHANGE_STATUSES, text(formData, "status"), (existing?.status as (typeof CHANGE_STATUSES)[number] | undefined) ?? "PENDING");
  if (!statusChecked) return { ok: false, message: INVALID_STATUS };
  const changeTypeRaw = text(formData, "changeType");
  const changeType = isIn(CHANGE_TYPES, changeTypeRaw) ? changeTypeRaw : "NORMAL";
  const riskRaw = text(formData, "risk");
  const risk = isIn(RISK_LEVELS, riskRaw) ? riskRaw : "MEDIUM";
  const rollbackPlan = text(formData, "rollbackPlan");
  const testPlan = text(formData, "testPlan");
  const cabNote = text(formData, "cabNote");
  const reviewNote = text(formData, "reviewNote");
  if (changeType !== "STANDARD" && !rollbackPlan) {
    return { ok: false, message: "Standart olmayan değişikliklerde geri dönüş planı zorunludur." };
  }
  const strict = changeType === "EMERGENCY" || risk === "HIGH" || risk === "CRITICAL";
  if (strict && ["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(statusChecked) && !cabNote) {
    return { ok: false, message: "Yüksek riskli veya acil değişiklikte CAB notu girilmeden onay/uygulama durumuna geçilemez." };
  }
  if (strict && statusChecked === "COMPLETED" && !reviewNote) {
    return { ok: false, message: "Yüksek riskli veya acil değişiklik tamamlanırken uygulama sonrası inceleme notu zorunludur." };
  }
  if (existing && existing.status !== statusChecked) {
    const isSuper = access.viewer.role === "SUPER_ADMIN";
    if (existing.status === "REJECTED" && ["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(statusChecked) && !isSuper) {
      return { ok: false, message: "Reddedilen değişiklik önce yeniden onaya (Beklemede) alınmalıdır." };
    }
    if (existing.status === "PENDING" && ["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(statusChecked)) {
      const policy = await approvalStatus("change", undefined, "APPROVED");
      const approvers = [existing.requestingManagerId, existing.infosecManagerId, ...existing.approvalUnits.map((u) => u.managerId)];
      if (policy === "PENDING" && !isSuper && !approvers.includes(access.viewer.id)) {
        return { ok: false, message: "Onay bekleyen değişikliği yalnızca onaycılar (onay menüsü/bağlantısı) veya süper yönetici ilerletebilir." };
      }
    }
  }
  const relIncidentNo = text(formData, "relatedIncidentNo");
  const relProblemNo = text(formData, "relatedProblemNo");
  const relIncident = relIncidentNo ? await findRecord("INCIDENT", relIncidentNo) : null;
  if (relIncidentNo && !relIncident) return { ok: false, message: `${relIncidentNo} numaralı olay bulunamadı.` };
  const relProblem = relProblemNo ? await findRecord("PROBLEM", relProblemNo) : null;
  if (relProblemNo && !relProblem) return { ok: false, message: `${relProblemNo} numaralı problem bulunamadı.` };
  const requesterId = sessionTicketOwner(access.viewer.id, existing?.requesterId);
  if (!requesterId) return { ok: false, message: "Talep eden kişi zorunludur." };
  const countRaw = Number(text(formData, "approvalUnitCount"));
  if (!Number.isInteger(countRaw) || countRaw < 1 || countRaw > MAX_CHANGE_APPROVAL_UNITS) {
    return { ok: false, message: `Onay alınacak birim sayısı 1–${MAX_CHANGE_APPROVAL_UNITS} arasında seçilmelidir.` };
  }
  const deptIds = list(formData, "targetDeptId");
  const mgrIds = list(formData, "targetMgrId");
  const units = Array.from({ length: countRaw }, (_, index) => ({
    departmentId: deptIds[index] ?? "",
    managerId: mgrIds[index] ?? "",
  }));
  if (units.some((row) => !row.departmentId || !row.managerId)) {
    return { ok: false, message: "Seçilen her onay birimi için birim ve birim amiri zorunludur." };
  }
  const [departments, managers] = await Promise.all([
    prisma.department.findMany({ where: { id: { in: units.map((row) => row.departmentId) } }, select: { id: true } }),
    prisma.person.findMany({ where: { id: { in: units.map((row) => row.managerId) } }, select: { id: true } }),
  ]);
  const deptSet = new Set(departments.map((row) => row.id));
  const mgrSet = new Set(managers.map((row) => row.id));
  if (units.some((row) => !deptSet.has(row.departmentId) || !mgrSet.has(row.managerId))) {
    return { ok: false, message: "Seçilen birim veya amir bulunamadı." };
  }

  const requesterOrg = await personOrgDefaults(requesterId);
  const data = {
    requesterId,
    requestingDeptId: existing?.requestingDeptId ?? requesterOrg.departmentId ?? null,
    requestingManagerId:
      text(formData, "requestingManagerId") ??
      (await resolveModuleManager("degisiklik", requesterId)) ??
      requesterOrg.unitManagerId ??
      null,
    approvalUnitCount: countRaw,
    targetDept1Id: units[0]?.departmentId ?? null,
    targetMgr1Id: units[0]?.managerId ?? null,
    targetDept2Id: units[1]?.departmentId ?? null,
    targetMgr2Id: units[1]?.managerId ?? null,
    targetDept3Id: units[2]?.departmentId ?? null,
    targetMgr3Id: units[2]?.managerId ?? null,
    infosecManagerId: text(formData, "infosecManagerId") ?? (await resolveModuleManager("infosec", requesterId)) ?? null,
    changeIp: text(formData, "changeIp"),
    changeKind: text(formData, "changeKind"),
    machineType: text(formData, "machineType"),
    impact: text(formData, "impact"),
    workStartDate: dateVal(formData, "workStartDate"),
    expectedEndDate: dateVal(formData, "expectedEndDate"),
    requestDate: dateVal(formData, "requestDate") ?? new Date(),
    approvalDate: dateVal(formData, "approvalDate"),
    status: statusChecked as string,
    description: text(formData, "description"),
    ...(formData.has("assetId") || !id ? { assetId: text(formData, "assetId") } : {}),
    changeType,
    risk,
    rollbackPlan,
    testPlan,
    cabNote,
    reviewNote,
    incidentId: relIncident?.id ?? null,
    problemId: relProblem?.id ?? null,
  };
  try {
    const persistUnits = async (changeId: string) => {
      await prisma.changeApprovalUnit.deleteMany({ where: { changeId } });
      await prisma.changeApprovalUnit.createMany({
        data: units.map((row, index) => ({
          changeId,
          sortOrder: index + 1,
          departmentId: row.departmentId,
          managerId: row.managerId,
        })),
      });
    };

    if (id) {
      const prevChange = await prisma.changeRecord.findUnique({ where: { id }, select: { status: true, changeNo: true } });
      await prisma.changeRecord.update({ where: { id }, data });
      await persistUnits(id);
      await recordScore({ module: "change", created: false, entityId: id, entityNo: prevChange?.changeNo, severity: data.risk, prevStatus: prevChange?.status, status: data.status });
      revalidatePath("/degisiklik");
      return saved(`/degisiklik/${id}`);
    }
    data.status = (await approvalStatus("change", undefined, data.status)) ?? data.status;
    const last = await prisma.changeRecord.findFirst({ orderBy: { changeNo: "desc" }, select: { changeNo: true } });
    const created = await prisma.changeRecord.create({ data: { ...data, changeNo: nextTicketNo("CHG", last?.changeNo) } });
    await persistUnits(created.id);
    await startWorkflowIfAny("change", created.id).catch(() => null);
    await recordScore({ module: "change", created: true, entityId: created.id, entityNo: created.changeNo, severity: data.risk, status: created.status });
    await notifyIntegrations({
      kind: "change",
      recordId: created.id,
      ticketNo: created.changeNo,
      title: "Değişiklik",
      status: created.status,
      requesterId,
      managerIds: [data.requestingManagerId, data.infosecManagerId, ...units.map((row) => row.managerId)],
    });
    revalidatePath("/degisiklik");
    return saved(`/degisiklik/${created.id}`);
  } catch (error) {
    return fail(error);
  }
}

export async function savePatch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dropCreateStatus(formData);
  const access = await requireModule("/yama");
  if (access.error) return access.error;
  {
    const raw = text(formData, "status");
    if (raw && !checkStatus(CHANGE_STATUSES, raw, CHANGE_STATUSES[0])) return { ok: false, message: INVALID_STATUS };
  }
  const title = text(formData, "title");
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("patchRecord", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const existing = id ? await prisma.patchRecord.findUnique({ where: { id }, select: { requesterId: true } }) : null;
  if (id && !existing) return { ok: false, message: "Yama kaydı bulunamadı." };
  const requesterId = sessionTicketOwner(access.viewer.id, existing?.requesterId);
  if (!requesterId || !title) return { ok: false, message: "Talep eden ve yama tanımı zorunludur." };
  const data = {
    requesterId,
    requestingManagerId: text(formData, "requestingManagerId") ?? (await resolveModuleManager("yama", requesterId)) ?? null,
    title,
    scope: text(formData, "scope"),
    systemType: text(formData, "systemType"),
    systemKind: text(formData, "systemKind"),
    ipRange: text(formData, "ipRange"),
    impact: text(formData, "impact"),
    assetOwnerId: text(formData, "assetOwnerId"),
    risks: text(formData, "risks"),
    distribution: text(formData, "distribution"),
    requestDate: dateVal(formData, "requestDate") ?? new Date(),
    approvalDate: dateVal(formData, "approvalDate"),
    workStartDate: dateVal(formData, "workStartDate"),
    expectedEndDate: dateVal(formData, "expectedEndDate"),
    status: text(formData, "status") ?? "PENDING",
    description: text(formData, "description"),
    ...(formData.has("assetId") || !id ? { assetId: text(formData, "assetId") } : {}),
  };
  try {
    if (id) {
      const prevPatch = await prisma.patchRecord.findUnique({ where: { id }, select: { status: true, patchNo: true } });
      await prisma.patchRecord.update({ where: { id }, data });
      await recordScore({ module: "patch", created: false, entityId: id, entityNo: prevPatch?.patchNo, prevStatus: prevPatch?.status, status: data.status });
      revalidatePath("/yama");
      return saved(`/yama/${id}`);
    }
    data.status = (await approvalStatus("patch", undefined, data.status)) ?? data.status;
    const last = await prisma.patchRecord.findFirst({ orderBy: { patchNo: "desc" }, select: { patchNo: true } });
    const created = await prisma.patchRecord.create({ data: { ...data, patchNo: nextTicketNo("YAM", last?.patchNo) } });
    await startWorkflowIfAny("patch", created.id).catch(() => null);
    await recordScore({ module: "patch", created: true, entityId: created.id, entityNo: created.patchNo, status: created.status });
    await notifyIntegrations({
      kind: "patch",
      recordId: created.id,
      ticketNo: created.patchNo,
      title,
      status: created.status,
      requesterId,
      managerIds: [data.requestingManagerId],
    });
    revalidatePath("/yama");
    return saved(`/yama/${created.id}`);
  } catch (error) {
    return fail(error);
  }
}

export async function saveConfig(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/konfigurasyon");
  if (access.error) return access.error;
  const appName = text(formData, "appName");
  const ownerId = text(formData, "ownerId");
  if (!appName || !ownerId) return { ok: false, message: "Uygulama adı ve sahibi zorunludur." };
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("appConfig", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const ownerOrg = await personOrgDefaults(ownerId);
  const data = {
    appName,
    version: text(formData, "version"),
    ownerId,
    departmentId: firstFilled(text(formData, "departmentId"), ownerOrg.departmentId),
    managerId: text(formData, "managerId") ?? (await resolveModuleManager("konfigurasyon", ownerId)) ?? ownerOrg.unitManagerId ?? null,
    backupDate: dateVal(formData, "backupDate"),
    description: text(formData, "description"),
    ...(formData.has("assetId") || !id ? { assetId: text(formData, "assetId") } : {}),
  };
  try {
    const record = id
      ? await prisma.appConfig.update({ where: { id }, data })
      : await prisma.appConfig.create({ data });
    await recordScore({ module: "config", created: !id, entityId: record.id });
    revalidatePath("/konfigurasyon");
    return saved(`/konfigurasyon/${record.id}`);
  } catch (error) {
    return fail(error);
  }
}

export async function saveVulnerability(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dropCreateStatus(formData);
  const access = await requireModule("/zafiyet");
  if (access.error) return access.error;
  {
    const raw = text(formData, "status");
    if (raw && !checkStatus(VULN_STATUSES, raw, VULN_STATUSES[0])) return { ok: false, message: INVALID_STATUS };
  }
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("vulnerability", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const ownerId = text(formData, "ownerId");
  const ownerOrg = await personOrgDefaults(ownerId);
  const closeRaw = text(formData, "closeDays");
  const closeDays = closeRaw && Number.isFinite(Number(closeRaw)) ? Number(closeRaw) : null;
  const data = {
    deviceName: text(formData, "deviceName"),
    deviceIp: text(formData, "deviceIp"),
    ownerId,
    departmentId: firstFilled(text(formData, "departmentId"), ownerOrg.departmentId),
    managerId: text(formData, "managerId") ?? (await resolveModuleManager("zafiyet", ownerId)) ?? ownerOrg.unitManagerId ?? null,
    detectedAt: dateVal(formData, "detectedAt") ?? new Date(),
    dueDate: dateVal(formData, "dueDate"),
    severity: text(formData, "severity") ?? "MEDIUM",
    status: text(formData, "status") ?? "OPEN",
    closeDays,
    notFixedReason: text(formData, "notFixedReason"),
    description: text(formData, "description"),
    ...(formData.has("assetId") || !id ? { assetId: text(formData, "assetId") } : {}),
    cve: text(formData, "cve"),
  };
  try {
    if (id) {
      const prevVuln = await prisma.vulnerability.findUnique({ where: { id }, select: { status: true, vulnNo: true } });
      await prisma.vulnerability.update({ where: { id }, data });
      await recordScore({ module: "vuln", created: false, entityId: id, entityNo: prevVuln?.vulnNo, severity: data.severity, prevStatus: prevVuln?.status, status: data.status });
      revalidatePath("/zafiyet");
      return saved(`/zafiyet/${id}`);
    }
    const last = await prisma.vulnerability.findFirst({ orderBy: { vulnNo: "desc" }, select: { vulnNo: true } });
    const created = await prisma.vulnerability.create({ data: { ...data, vulnNo: nextTicketNo("ZAF", last?.vulnNo) } });
    await recordScore({ module: "vuln", created: true, entityId: created.id, entityNo: created.vulnNo, severity: created.severity, status: created.status });
    revalidatePath("/zafiyet");
    return saved(`/zafiyet/${created.id}`);
  } catch (error) {
    return fail(error);
  }
}

function list(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => String(value).trim());
}

function hoursField(raw: string, label: string) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1 || value > 720) {
    return { error: `${label} 1–720 saat olmalıdır.` as const, value: 0 };
  }
  return { error: null, value: Math.floor(value) };
}

export async function saveVendorFull(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/firma-sla");
  if (access.error) return access.error;
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Firma adı zorunludur." };
  const id = text(formData, "id");
  const supportEmail = text(formData, "supportEmail");
  if (supportEmail && !parseEmailList(supportEmail).length) {
    return { ok: false, message: "Resmi support adresi geçerli e-posta olmalıdır." };
  }
  const specFileUrl = text(formData, "specFileUrl");
  if (specFileUrl && !isSafeUploadUrl(specFileUrl)) {
    return { ok: false, message: "Şartname dosyası geçersiz." };
  }
  const specKindRaw = text(formData, "specKind") ?? "TEKNIK";
  const specKind = VENDOR_SPEC_KINDS.includes(specKindRaw as (typeof VENDOR_SPEC_KINDS)[number]) ? specKindRaw : "TEKNIK";

  const names = list(formData, "contactName");
  const emails = list(formData, "contactEmail");
  const phones = list(formData, "contactPhone");
  const kinds = list(formData, "contactKind");
  const contacts = names
    .map((contactName, index) => ({
      name: contactName,
      email: emails[index] || null,
      phone: phones[index] || null,
      kind: VENDOR_CONTACT_KINDS.includes(kinds[index] as (typeof VENDOR_CONTACT_KINDS)[number])
        ? kinds[index]
        : "SORUMLU",
      sortOrder: index,
    }))
    .filter((row) => row.name || row.email || row.phone);
  for (const row of contacts) {
    if (row.email && !isEmail(row.email)) return { ok: false, message: `Geçersiz sorumlu e-postası: ${row.email}` };
  }
  if (!contacts.some((row) => row.name)) {
    return { ok: false, message: "En az bir firma sorumlusu adı girin." };
  }

  const productNames = list(formData, "productName");
  const licenses = list(formData, "productLicenseType");
  const quantities = list(formData, "productQuantity");
  const versions = list(formData, "productVersion");
  const serials = list(formData, "productSerial");
  const notes = list(formData, "productNotes");
  const products = productNames
    .map((productName, index) => ({
      name: productName,
      licenseType: VENDOR_LICENSE_TYPES.includes(licenses[index] as (typeof VENDOR_LICENSE_TYPES)[number])
        ? licenses[index]
        : "OTHER",
      quantity: Math.max(1, Math.floor(Number(quantities[index]) || 1)),
      version: versions[index] || null,
      serialNo: serials[index] || null,
      notes: notes[index] || null,
    }))
    .filter((row) => row.name);
  if (!products.length) return { ok: false, message: "En az bir ürün adı girin." };

  const slaNames = list(formData, "slaName");
  const slaResponses = list(formData, "slaResponseHours");
  const slaResolves = list(formData, "slaResolveHours");
  const slaDescriptions = list(formData, "slaDescription");
  const slaLevels = CONTRACT_SLA_LEVELS.map((level, index) => {
    const response = hoursField(slaResponses[index] ?? "", `Seviye ${level} müdahale`);
    const resolve = hoursField(slaResolves[index] ?? "", `Seviye ${level} çözüm`);
    return {
      level,
      name: slaNames[index] || `Seviye ${level}`,
      response,
      resolve,
      description: slaDescriptions[index] || null,
    };
  });
  const slaError = slaLevels.find((row) => row.response.error || row.resolve.error);
  if (slaError) return { ok: false, message: slaError.response.error ?? slaError.resolve.error ?? "SLA süreleri zorunludur." };
  if (slaLevels.some((row) => !row.name.trim())) return { ok: false, message: "Üç SLA seviyesinin adı zorunludur." };

  const notifyEmails = collectVendorEmails({ supportEmail, contacts });
  if (!notifyEmails.length) {
    return { ok: false, message: "Arıza bildirimi için en az bir firma e-postası (sorumlu veya support) girin." };
  }

  const first = contacts[0];
  const data = {
    name,
    supportEmail,
    specFileUrl,
    specFileName: text(formData, "specFileName"),
    specKind,
    contractFileUrl: specFileUrl,
    description: text(formData, "description"),
    contactPerson: first?.name ?? null,
    email: first?.email ?? notifyEmails[0] ?? null,
    phone: first?.phone ?? null,
    contact1Phone: contacts[0]?.phone ?? null,
    contact1Email: contacts[0]?.email ?? null,
    contact2Phone: contacts[1]?.phone ?? null,
    contact2Email: contacts[1]?.email ?? null,
    contact3Phone: contacts[2]?.phone ?? null,
    contact3Email: contacts[2]?.email ?? null,
  };

  try {
    const vendor = await prisma.$transaction(async (tx) => {
      const savedVendor = id
        ? await tx.vendor.update({ where: { id }, data })
        : await tx.vendor.create({ data });
      await tx.vendorContact.deleteMany({ where: { vendorId: savedVendor.id } });
      if (contacts.length) {
        await tx.vendorContact.createMany({
          data: contacts.map((row) => ({ ...row, vendorId: savedVendor.id })),
        });
      }
      const existingProducts = await tx.vendorProduct.findMany({
        where: { vendorId: savedVendor.id },
        select: { id: true },
      });
      const keepIds: string[] = [];
      for (const [index, row] of products.entries()) {
        const existing = existingProducts[index];
        if (existing) {
          await tx.vendorProduct.update({ where: { id: existing.id }, data: row });
          keepIds.push(existing.id);
        } else {
          const created = await tx.vendorProduct.create({ data: { ...row, vendorId: savedVendor.id } });
          keepIds.push(created.id);
        }
      }
      await tx.vendorProduct.deleteMany({
        where: { vendorId: savedVendor.id, id: { notIn: keepIds } },
      });
      await tx.vendorSlaLevel.deleteMany({ where: { vendorId: savedVendor.id } });
      await tx.vendorSlaLevel.createMany({
        data: slaLevels.map((row) => ({
          vendorId: savedVendor.id,
          level: row.level,
          name: row.name,
          responseHours: row.response.value,
          resolveHours: row.resolve.value,
          description: row.description,
        })),
      });
      return savedVendor;
    });
    await log("Vendor", vendor.id, id ? "UPDATE" : "CREATE", `Firma kaydı: ${vendor.name}`);
    revalidatePath("/firma-sla");
    return saved(`/firma-sla/firma/${vendor.id}`, "Firma kaydedildi.");
  } catch (error) {
    const result = fail(error);
    if (result.message?.includes("Unique") || result.message?.includes("kayıt")) {
      return { ok: false, message: "Bu firma adı zaten kayıtlı." };
    }
    return result;
  }
}

export async function saveSla(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dropCreateStatus(formData);
  const access = await requireModule("/firma-sla");
  if (access.error) return access.error;
  {
    const raw = text(formData, "status");
    if (raw && !checkStatus(TICKET_STATUSES, raw, TICKET_STATUSES[0])) return { ok: false, message: INVALID_STATUS };
  }
  const title = text(formData, "title");
  if (!title) return { ok: false, message: "Arıza tanımı zorunludur." };
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("slaTicket", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const existingTicket = id ? await prisma.slaTicket.findUnique({ where: { id }, select: { requesterId: true } }) : null;
  if (id && !existingTicket) return { ok: false, message: "Arıza kaydı bulunamadı." };
  const requesterId = sessionTicketOwner(access.viewer.id, existingTicket?.requesterId);
  if (!requesterId) return { ok: false, message: "Bildiren kişi zorunludur." };
  const requestingManagerId =
    text(formData, "requestingManagerId") ?? (await resolveModuleManager("firmaSla", requesterId)) ?? null;
  if (!requestingManagerId) return { ok: false, message: "Birim amiri zorunludur." };
  const productId = text(formData, "productId");
  if (!productId) return { ok: false, message: "Ürün seçimi zorunludur." };
  const slaLevel = Number(text(formData, "slaLevel"));
  if (!CONTRACT_SLA_LEVELS.includes(slaLevel as (typeof CONTRACT_SLA_LEVELS)[number])) {
    return { ok: false, message: "SLA seviyesi zorunludur." };
  }

  const product = await prisma.vendorProduct.findUnique({
    where: { id: productId },
    include: {
      vendor: { include: { contacts: true, slaLevels: true } },
    },
  });
  if (!product) return { ok: false, message: "Seçilen ürün bulunamadı." };
  const level = product.vendor.slaLevels.find((row) => row.level === slaLevel);
  if (!level) return { ok: false, message: "Bu ürünün firmasında seçilen SLA seviyesi tanımlı değil." };

  const [requester, manager] = await Promise.all([
    prisma.person.findUnique({ where: { id: requesterId }, select: { id: true, fullName: true, email: true, departmentId: true } }),
    prisma.person.findUnique({ where: { id: requestingManagerId }, select: { id: true, fullName: true, email: true } }),
  ]);
  if (!requester) return { ok: false, message: "Bildiren personel bulunamadı." };
  if (!manager) return { ok: false, message: "Birim amiri bulunamadı." };

  const vendorEmails = collectVendorEmails(product.vendor);
  if (!vendorEmails.length) {
    return { ok: false, message: "Firmada bildirim e-postası yok. Önce firma kaydını tamamlayın." };
  }
  const recipients = [...new Set([...vendorEmails, ...(manager.email ? [manager.email.toLowerCase()] : [])])];

  const now = new Date();
  const data = {
    title,
    application: product.name,
    requesterId,
    requestingManagerId,
    ownerId: requesterId,
    departmentId: requester.departmentId,
    vendorId: product.vendorId,
    productId: product.id,
    slaLevel,
    severity: slaLevelToSeverity(slaLevel),
    status: text(formData, "status") ?? "OPEN",
    description: text(formData, "description"),
  };

  try {
    if (id) {
      const prevSla = await prisma.slaTicket.findUnique({ where: { id }, select: { status: true, ticketNo: true } });
      await prisma.slaTicket.update({
        where: { id },
        data,
      });
      await log("SlaTicket", id, "UPDATE", title);
      await recordScore({ module: "sla", created: false, entityId: id, entityNo: prevSla?.ticketNo, severity: data.severity, prevStatus: prevSla?.status, status: data.status });
      revalidatePath("/firma-sla");
      return saved(`/firma-sla/sla/${id}`, "Arıza kaydı güncellendi.");
    }
    const last = await prisma.slaTicket.findFirst({ orderBy: { ticketNo: "desc" }, select: { ticketNo: true } });
    const startedAt = now;
    const created = await prisma.slaTicket.create({
      data: {
        ...data,
        ticketNo: nextTicketNo("SLA", last?.ticketNo),
        openedAt: startedAt,
        slaStartedAt: startedAt,
        slaResponseDueAt: new Date(startedAt.getTime() + level.responseHours * 3_600_000),
        slaDueAt: new Date(startedAt.getTime() + level.resolveHours * 3_600_000),
      },
    });
    const notify = await notifySlaOpened({
      ticketNo: created.ticketNo,
      title,
      vendorName: product.vendor.name,
      productName: product.name,
      slaName: level.name,
      slaWindow: slaWindowLabel(level.responseHours, level.resolveHours),
      dueAt: created.slaDueAt ?? startedAt,
      description: data.description,
      requesterName: requester.fullName,
      managerName: manager.fullName,
      recipients,
    });
    await prisma.slaTicket.update({
      where: { id: created.id },
      data: {
        notifiedAt: notify.sent ? new Date() : null,
        notifyNote: notify.note,
      },
    });
    await log("SlaTicket", created.id, "CREATE", `${created.ticketNo} ${title}. ${notify.note}`);
    await recordScore({ module: "sla", created: true, entityId: created.id, entityNo: created.ticketNo, severity: data.severity, status: data.status });
    revalidatePath("/firma-sla");
    return saved(`/firma-sla/sla/${created.id}`, notify.note);
  } catch (error) {
    return fail(error);
  }
}

export async function saveIncident(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dropCreateStatus(formData);
  const access = await requireModule("/olay");
  if (access.error) return access.error;
  const title = text(formData, "title");
  if (!title) return { ok: false, message: "Olay tanımı zorunludur." };
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("incident", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const existing = id ? await prisma.incident.findUnique({ where: { id } }) : null;
  if (id && !existing) return { ok: false, message: "Olay bulunamadı." };
  const requesterId = sessionTicketOwner(access.viewer.id, existing?.requesterId);
  if (!requesterId) return { ok: false, message: "Talep eden kişi zorunludur." };
  const l1AnalystId = text(formData, "l1AnalystId");
  if (!l1AnalystId) return { ok: false, message: "Seviye 1 analist zorunludur." };
  const severityRaw = text(formData, "severity") ?? "MEDIUM";
  const severity = isRequestSeverity(severityRaw) ? severityRaw : "MEDIUM";
  const alreadyLayer2 = existing?.layer === "L2" && existing.escalationStatus === "TRANSFERRED";
  const escalationStatus = alreadyLayer2
    ? existing.escalationStatus
    : shouldAutoEscalate(severity)
      ? "PENDING"
      : existing?.escalationStatus === "TRANSFERRED"
        ? existing.escalationStatus
        : "NONE";
  const incidentStatus = checkStatus(INCIDENT_STATUSES, text(formData, "status"), (existing?.status as (typeof INCIDENT_STATUSES)[number] | undefined) ?? "OPEN");
  if (!incidentStatus) return { ok: false, message: INVALID_STATUS };
  const impactRaw = text(formData, "impact");
  const urgencyRaw = text(formData, "urgency");
  const impact = isLevel(impactRaw) ? impactRaw : null;
  const urgency = isLevel(urgencyRaw) ? urgencyRaw : null;
  const isMajor = text(formData, "isMajor") === "YES";
  const priority = derivePriority({ impact, urgency, severity, isMajor });
  const relChangeNo = text(formData, "relatedChangeNo");
  const relChange = relChangeNo ? await findRecord("CHANGE", relChangeNo) : null;
  if (relChangeNo && !relChange) return { ok: false, message: `${relChangeNo} numaralı değişiklik bulunamadı.` };
  const nowTs = new Date();
  const startedAtVal = dateVal(formData, "startedAt") ?? existing?.startedAt ?? nowTs;
  const wasFinal = existing ? existing.status === "RESOLVED" || existing.status === "CLOSED" : false;
  const isFinal = incidentStatus === "RESOLVED" || incidentStatus === "CLOSED";
  const dueChanged = !existing || existing.priority !== priority || !existing.resolveDueAt || existing.startedAt.getTime() !== startedAtVal.getTime();
  const slaFields = {
    ...(dueChanged ? incidentDueDates(startedAtVal, priority) : {}),
    respondedAt: existing?.respondedAt ?? (incidentStatus !== "OPEN" ? nowTs : null),
    resolvedAt: isFinal ? (existing?.resolvedAt ?? nowTs) : wasFinal ? null : (existing?.resolvedAt ?? null),
  };
  const requesterOrg = await personOrgDefaults(requesterId);
  const sandboxReportUrl = text(formData, "sandboxReportUrl");
  if (sandboxReportUrl && !isSafeUploadUrl(sandboxReportUrl)) {
    return { ok: false, message: "Sandbox rapor adresi geçersiz." };
  }
  const data = {
    title,
    startedAt: startedAtVal,
    endedAt: dateVal(formData, "endedAt") ?? (isFinal ? (existing?.endedAt ?? nowTs) : null),
    requesterId,
    requestingManagerId: text(formData, "requestingManagerId") ?? (await resolveModuleManager("olay", requesterId)) ?? requesterOrg.unitManagerId ?? null,
    l1AnalystId,
    departmentId: firstFilled(text(formData, "departmentId"), requesterOrg.departmentId),
    ioc: text(formData, "ioc"),
    sandboxReportUrl,
    sandboxReportName: sandboxReportUrl ? text(formData, "sandboxReportName") : null,
    description: text(formData, "description"),
    severity,
    layer: alreadyLayer2 ? "L2" : "L1",
    escalationStatus,
    status: incidentStatus as string,
    ...(formData.has("assetId") || !id ? { assetId: text(formData, "assetId") } : {}),
    impact,
    urgency,
    priority,
    isMajor,
    serviceId: text(formData, "serviceId"),
    changeId: relChange?.id ?? null,
    ...slaFields,
  };
  try {
    if (id) {
      const prevInc = await prisma.incident.findUnique({ where: { id }, select: { status: true, incidentNo: true } });
      await prisma.incident.update({ where: { id }, data });
      await recordScore({ module: "incident", created: false, entityId: id, entityNo: prevInc?.incidentNo, severity: data.severity, prevStatus: prevInc?.status, status: data.status });
      if (existing && existing.l1AnalystId !== l1AnalystId) {
        await notifyAssignment({ personId: l1AnalystId, actorId: access.viewer.id, ticketNo: prevInc?.incidentNo ?? id, title, kindLabel: "olayı", path: `/olay/${id}`, entityType: "Incident", entityId: id });
      }
      revalidatePath("/olay");
      revalidatePath(`/olay/${id}`);
      return saved(`/olay/${id}`);
    }
    const last = await prisma.incident.findFirst({ orderBy: { incidentNo: "desc" }, select: { incidentNo: true } });
    const created = await prisma.incident.create({ data: { ...data, incidentNo: nextTicketNo("OLY", last?.incidentNo) } });
    await recordScore({ module: "incident", created: true, entityId: created.id, entityNo: created.incidentNo, severity: data.severity, status: data.status });
    await notifyAssignment({ personId: l1AnalystId, actorId: access.viewer.id, ticketNo: created.incidentNo, title, kindLabel: "olayı", path: `/olay/${created.id}`, entityType: "Incident", entityId: created.id });
    revalidatePath("/olay");
    return saved(`/olay/${created.id}`);
  } catch (error) {
    return fail(error);
  }
}

export async function escalateIncident(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/olay");
  if (access.error) return access.error;
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("incident", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const l2AnalystId = text(formData, "l2AnalystId");
  const reason = text(formData, "reason");
  const targetOffice = text(formData, "targetOffice");
  if (!id) return { ok: false, message: "Olay seçilmedi." };
  if (!l2AnalystId) return { ok: false, message: "Seviye 2 analist zorunludur." };
  if (!reason) return { ok: false, message: "Eskalasyon gerekçesi zorunludur." };
  if (targetOffice && !isRequestOffice(targetOffice)) {
    return { ok: false, message: "Uzman birim geçersiz." };
  }
  const row = await prisma.incident.findUnique({ where: { id } });
  if (!row) return { ok: false, message: "Olay bulunamadı." };
  const analyst = await prisma.person.findUnique({ where: { id: l2AnalystId }, select: { id: true, fullName: true } });
  if (!analyst) return { ok: false, message: "Seviye 2 analist bulunamadı." };
  await prisma.incident.update({
    where: { id },
    data: {
      layer: "L2",
      l2AnalystId,
      escalationStatus: "TRANSFERRED",
      escalatedOffice: targetOffice,
      escalationReason: reason,
      escalatedAt: new Date(),
      escalatedById: access.viewer.id,
      status: row.status === "OPEN" ? "INVESTIGATING" : row.status,
      ...(row.status === "OPEN" && !row.respondedAt ? { respondedAt: new Date() } : {}),
    },
  });
  await notifyAssignment({ personId: l2AnalystId, actorId: access.viewer.id, ticketNo: row.incidentNo, title: row.title, kindLabel: "olayı (Seviye 2)", path: `/olay/${id}`, entityType: "Incident", entityId: id });
  await log("Incident", id, "ESCALATE", `${row.incidentNo} Seviye 2’ye aktarıldı → ${analyst.fullName}. ${reason}`);
  revalidatePath("/olay");
  revalidatePath(`/olay/${id}`);
  return saved(`/olay/${id}`, `${row.incidentNo} Seviye 2 analiste gönderildi.`);
}

async function peopleByIds(ids: Array<string | null | undefined>) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!unique.length) return [];
  return prisma.person.findMany({
    where: { id: { in: unique } },
    select: { id: true, fullName: true, email: true, role: true },
  });
}

export async function saveProblem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dropCreateStatus(formData);
  const access = await requireModule("/problem");
  if (access.error) return access.error;
  const title = text(formData, "title");
  if (!title) return { ok: false, message: "Problem tanımı zorunludur." };
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("problem", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const existing = id ? await prisma.problem.findUnique({ where: { id } }) : null;
  if (id && !existing) return { ok: false, message: "Problem bulunamadı." };
  const requesterId = sessionTicketOwner(access.viewer.id, existing?.requesterId);
  if (!requesterId) return { ok: false, message: "Talep eden kişi zorunludur." };
  const problemStatus = checkStatus(PROBLEM_STATUSES, text(formData, "status"), (existing?.status as (typeof PROBLEM_STATUSES)[number] | undefined) ?? "OPEN");
  if (!problemStatus) return { ok: false, message: INVALID_STATUS };
  const rootCauseVal = text(formData, "rootCause");
  const workaroundVal = text(formData, "workaround");
  if ((problemStatus === "RESOLVED" || problemStatus === "CLOSED") && !rootCauseVal) {
    return { ok: false, message: "Problem çözüldü/kapatıldı olarak işaretlenmeden önce kök neden yazılmalıdır." };
  }
  if (problemStatus === "KNOWN_ERROR" && !workaroundVal) {
    return { ok: false, message: "Bilinen hata kaydı için geçici çözüm (workaround) yazılmalıdır." };
  }
  const probSevRaw = text(formData, "severity");
  const probSeverity = isRequestSeverity(probSevRaw) ? probSevRaw : "MEDIUM";
  const probChangeNo = text(formData, "relatedChangeNo");
  const probChange = probChangeNo ? await findRecord("CHANGE", probChangeNo) : null;
  if (probChangeNo && !probChange) return { ok: false, message: `${probChangeNo} numaralı değişiklik bulunamadı.` };
  const proposedAssigneeId = text(formData, "proposedAssigneeId");
  const infosecManagerId = text(formData, "infosecManagerId");
  if (!proposedAssigneeId) return { ok: false, message: "Atanacak personel zorunludur." };
  if (!infosecManagerId) return { ok: false, message: "Bilgi güvenliği yöneticisi zorunludur." };

  const people = await peopleByIds([proposedAssigneeId, infosecManagerId, requesterId]);
  const proposed = people.find((row) => row.id === proposedAssigneeId);
  const infosec = people.find((row) => row.id === infosecManagerId);
  if (!proposed) return { ok: false, message: "Atanacak personel bulunamadı." };
  if (!infosec) return { ok: false, message: "Bilgi güvenliği yöneticisi bulunamadı." };

  const sameApproved =
    existing?.assignmentStatus === "APPROVED" &&
    existing.assigneeId === proposedAssigneeId &&
    existing.proposedAssigneeId === proposedAssigneeId;
  const assignmentStatus = sameApproved ? "APPROVED" : "PENDING";

  const data = {
    title,
    requesterId,
    requestingManagerId: text(formData, "requestingManagerId") ?? (await resolveModuleManager("problem", requesterId)) ?? null,
    description: text(formData, "description"),
    rootCause: rootCauseVal,
    workaround: workaroundVal,
    status: problemStatus as string,
    severity: probSeverity,
    permanentFix: text(formData, "permanentFix"),
    changeId: probChange?.id ?? null,
    serviceId: text(formData, "serviceId"),
    ...(formData.has("incidentId") || !id ? { incidentId: text(formData, "incidentId") } : {}),
    ...(formData.has("assetId") || !id ? { assetId: text(formData, "assetId") } : {}),
    proposedAssigneeId,
    infosecManagerId,
    assignmentStatus,
    assigneeId: sameApproved ? proposedAssigneeId : null,
    assignedAt: sameApproved ? existing?.assignedAt ?? null : null,
    assignmentNote: sameApproved ? existing?.assignmentNote ?? null : null,
  };
  try {
    if (id) {
      await prisma.problem.update({ where: { id }, data });
      await recordScore({ module: "problem", created: false, entityId: id, entityNo: existing?.problemNo, severity: data.severity, prevStatus: existing?.status, status: data.status });
      if (!sameApproved) {
        await notifyProblemAssignment({
          ticketNo: existing?.problemNo ?? id,
          title,
          kind: "propose",
          assigneeName: proposed.fullName,
          infosecName: infosec.fullName,
          recipients: [infosec.email].filter((email): email is string => Boolean(email)),
          recordId: id,
          approverIds: [infosecManagerId],
          requesterId,
        });
        await log("Problem", id, "ASSIGN_PROPOSE", `${proposed.fullName} için BG onayı istendi.`);
      }
      revalidatePath("/problem");
      return saved(`/problem/${id}`, sameApproved ? "Problem güncellendi." : "Atama bilgi güvenliği onayına gönderildi.");
    }
    const last = await prisma.problem.findFirst({ orderBy: { problemNo: "desc" }, select: { problemNo: true } });
    const created = await prisma.problem.create({
      data: { ...data, problemNo: nextTicketNo("PRB", last?.problemNo) },
    });
    await notifyProblemAssignment({
      ticketNo: created.problemNo,
      title,
      kind: "propose",
      assigneeName: proposed.fullName,
      infosecName: infosec.fullName,
      recipients: [infosec.email].filter((email): email is string => Boolean(email)),
      recordId: created.id,
      approverIds: [infosecManagerId],
      requesterId,
    });
    await log("Problem", created.id, "ASSIGN_PROPOSE", `${created.problemNo}: ${proposed.fullName} BG onayına düştü.`);
    await recordScore({ module: "problem", created: true, entityId: created.id, entityNo: created.problemNo, severity: data.severity, status: created.status });
    revalidatePath("/problem");
    return saved(`/problem/${created.id}`, "Problem kaydedildi. Atama bilgi güvenliği onayını bekliyor.");
  } catch (error) {
    return fail(error);
  }
}

export async function applyProblemAssignmentDecision(input: {
  id: string;
  decision: "APPROVED" | "REJECTED";
  actorId: string;
  actorRole?: string | null;
  note?: string | null;
}): Promise<ActionState> {
  const { id, decision, actorId, actorRole, note } = input;
  const row = await prisma.problem.findUnique({
    where: { id },
    include: {
      proposedAssignee: { select: { id: true, fullName: true, email: true } },
      infosecManager: { select: { id: true, fullName: true, email: true } },
    },
  });
  if (!row) return { ok: false, message: "Problem bulunamadı." };
  if (!(await viewerCanApproveProblemAssignment(actorRole, actorId, row.infosecManagerId))) {
    return { ok: false, message: "Atamayı bilgi güvenliği veya problem yöneticisi onaylayabilir." };
  }
  if (row.assignmentStatus !== "PENDING") return { ok: false, message: "Bu atama zaten sonuçlandırılmış." };
  if (!row.proposedAssignee) return { ok: false, message: "Onaylanacak personel yok." };

  const approved = decision === "APPROVED";
  await prisma.problem.update({
    where: { id },
    data: {
      assignmentStatus: decision,
      assigneeId: approved ? row.proposedAssigneeId : null,
      assignedAt: approved ? new Date() : null,
      assignmentDecidedById: actorId,
      assignmentNote: note,
      status: approved && row.status === "OPEN" ? "INVESTIGATING" : row.status,
    },
  });
  const recipients = approved
    ? [row.proposedAssignee.email, row.infosecManager?.email]
    : [row.infosecManager?.email];
  await notifyProblemAssignment({
    ticketNo: row.problemNo,
    title: row.title,
    kind: approved ? "approve" : "reject",
    assigneeName: row.proposedAssignee.fullName,
    infosecName: row.infosecManager?.fullName,
    note,
    recipients: recipients.filter((email): email is string => Boolean(email)),
  });
  await log(
    "Problem",
    id,
    approved ? "ASSIGN" : "ASSIGN_REJECT",
    approved
      ? `${row.problemNo} görevi ${row.proposedAssignee.fullName} adlı personele atandı.`
      : `${row.problemNo} ataması reddedildi.`,
  );
  revalidatePath("/problem");
  revalidatePath(`/problem/${id}`);
  return saved(
    `/problem/${id}`,
    approved ? "Onaylandı. Görev atandı." : "Atama reddedildi.",
  );
}

export async function decideProblemAssignment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/problem");
  if (access.error) return access.error;
  const id = text(formData, "id");
  const decision = text(formData, "decision");
  const note = text(formData, "note");
  if (!id || (decision !== "APPROVED" && decision !== "REJECTED")) {
    return { ok: false, message: "Karar seçilmedi." };
  }
  if (decision === "REJECTED" && !note) return { ok: false, message: "Reddetme gerekçesi zorunludur." };
  return applyProblemAssignmentDecision({
    id,
    decision,
    actorId: access.viewer.id,
    actorRole: access.viewer.role,
    note,
  });
}

export async function saveDepartmentFull(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/personel");
  if (access.error) return access.error;
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Birim adı zorunludur." };
  const id = text(formData, "id");
  const data = {
    name,
    code: text(formData, "code"),
    parentId: text(formData, "parentId"),
    managerId: text(formData, "managerId"),
    parentManagerId: text(formData, "parentManagerId"),
  };
  try {
    if (id) await prisma.department.update({ where: { id }, data });
    else await prisma.department.create({ data });
    revalidatePath("/personel");
    return saved(undefined, "Birim kaydedildi.");
  } catch {
    return { ok: false, message: "Bu birim adı zaten kayıtlı." };
  }
}
