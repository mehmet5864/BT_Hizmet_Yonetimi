import { visibleAssetWhere } from "@/lib/auth/acl";
import { nextTicketNo } from "@/lib/itil/constants";
import { autoEscalationReason, isRequestSeverity, shouldAutoEscalate } from "@/lib/itil/escalation";
import { canProcessRequest, canViewRequest, visibleRequestWhere } from "@/lib/itil/request-scope";
import { derivePriority, incidentDueDates, requestDueDate } from "@/lib/itil/sla";
import { resolveModuleManager, resolveOfficeApprover } from "@/lib/itil/office-officers";
import { officeLabel } from "@/lib/itil/office-names";
import { getRequestType, REQUEST_OFFICES, REQUEST_TYPE_LIST } from "@/lib/itil/request-types";
import { approvalStatus, notifyIntegrations } from "@/lib/integrations/notify";
import { prisma } from "@/lib/prisma";
import { getLicenseState } from "@/lib/license";
import { getInstance, listPendingFor, startWorkflowIfAny } from "@/lib/workflow/engine";
import { getSystemSettings } from "@/lib/settings-store";
import { authenticateApi, isServiceActor, requireApiScope, requireApiWrite, type ApiActor } from "./auth";
import { API_ENDPOINTS, openApiDocument } from "./catalog";
import { isRecordId } from "./guard";
import { apiError, apiOk, listLimit, readApiJson } from "./http";
import { changeCreateSchema, incidentCreateSchema, requestCreateSchema, vulnCreateSchema, requestPatchSchema, zodErrorMessage } from "./validate";
import {
  serializeAsset,
  serializeChange,
  serializeIncident,
  serializePatch,
  serializePerson,
  serializeProblem,
  serializeRequest,
  serializeVuln,
} from "./serialize";
import { API_SCOPE_LABELS, API_SCOPES } from "./scopes";

function parts(path: string[]) {
  return path.filter(Boolean);
}

function search(url: URL) {
  return url.searchParams;
}

export async function dispatchApi(request: Request, method: string, path: string[], origin: string) {
  const segs = parts(path);
  const url = new URL(request.url);

  if (method === "GET" && segs.length === 0) {
    const auth = await authenticateApi(request);
    if (auth.error) {
      return apiOk({
        name: "BT Hizmet Yönetimi API",
        version: "1.0",
        auth: ["Authorization: Bearer bth_…", "X-Api-Key: bth_…", "Oturum çerezi (yalnızca aynı kaynak)"],
        health: `${origin}/api/v1/health`,
      });
    }
    return apiOk({
      name: "BT Hizmet Yönetimi API",
      version: "1.0",
      auth: ["Authorization: Bearer bth_…", "X-Api-Key: bth_…", "Oturum çerezi (yalnızca aynı kaynak)"],
      scopes: API_SCOPES.map((scope) => ({ scope, label: API_SCOPE_LABELS[scope] })),
      endpoints: API_ENDPOINTS,
      docs: `${origin}/api-arayuzu`,
      openapi: `${origin}/api/v1/openapi.json`,
      actor: { kind: auth.actor.kind, bound: auth.actor.bound, service: auth.actor.service },
    });
  }

  if (method === "GET" && segs[0] === "health") {
    return apiOk({ status: "ok" });
  }

  if (method === "GET" && segs[0] === "openapi.json") {
    const auth = await authenticateApi(request);
    if (auth.error) return auth.error;
    return apiOk(openApiDocument(origin));
  }

  if (method === "GET" && segs[0] === "me") {
    const auth = await authenticateApi(request);
    if (auth.error) return auth.error;
    return apiOk({
      kind: auth.actor.kind,
      keyName: auth.actor.keyName ?? null,
      viewer: {
        id: auth.actor.viewer.id === "api-service" ? null : auth.actor.viewer.id,
        role: auth.actor.viewer.role,
        requestOffice: auth.actor.viewer.requestOffice ?? null,
        departmentId: auth.actor.viewer.departmentId ?? null,
      },
      scopes: auth.actor.scopes,
    });
  }

  if (method === "GET" && segs[0] === "katalog") {
    const auth = await requireApiScope(request, "talepler:read");
    if (auth.error) return auth.error;
    const names = (await getSystemSettings()).officeNames;
    return apiOk({
      offices: REQUEST_OFFICES.map((office) => ({ id: office, label: officeLabel(office, names) })),
      types: REQUEST_TYPE_LIST.map((item) => ({
        key: item.key,
        slug: item.slug,
        label: item.label,
        office: item.office,
        layer: item.key.startsWith("SD_") ? "L1" : "L2",
      })),
    });
  }

  if (method === "GET" && segs[0] === "is-akisi" && segs[1] === "bekleyen") return handlePendingApprovals(request);
  if (method === "GET" && segs[0] === "lisans") return handleLicense(request);
  if (segs[0] === "envanter") return handleInventory(request, method, segs, url);
  if (segs[0] === "talepler") return handleRequests(request, method, segs, url);
  if (segs[0] === "personel" && method === "GET") return handlePeople(request, url);
  if (segs[0] === "zafiyet") return handleVulns(request, method, url);
  if (segs[0] === "olay") return handleIncidents(request, method, url);
  if (segs[0] === "problem" && method === "GET") return handleProblems(request, url);
  if (segs[0] === "degisiklik") return handleChanges(request, method, url);
  if (segs[0] === "yama" && method === "GET") return handlePatches(request, url);

  return apiError("Uç bulunamadı.", 404);
}

async function assetWhereFor(actor: ApiActor) {
  if (isServiceActor(actor) || actor.viewer.role === "SUPER_ADMIN") return {};
  const settings = await getSystemSettings();
  return visibleAssetWhere(actor.viewer, settings.acl.grants);
}

async function handleInventory(request: Request, method: string, segs: string[], url: URL) {
  const auth = await requireApiScope(request, "envanter:read");
  if (auth.error) return auth.error;
  if (method !== "GET") return apiError("Yöntem desteklenmiyor.", 405);

  const scope = await assetWhereFor(auth.actor);
  if (segs[1]) {
    if (!isRecordId(segs[1])) return apiError("Envanter bulunamadı.", 404);
    const row = await prisma.asset.findUnique({
      where: { id: segs[1] },
      include: { owner: { select: { id: true, fullName: true } }, department: { select: { id: true, name: true } } },
    });
    if (!row) return apiError("Envanter bulunamadı.", 404);
    if (Object.keys(scope).length) {
      const own = row.ownerId === auth.actor.viewer.id;
      const dept = Boolean(auth.actor.viewer.departmentId && row.departmentId === auth.actor.viewer.departmentId);
      if (!own && !dept) return apiError("Bu kaydı görme yetkiniz yok.", 403);
    }
    return apiOk(serializeAsset(row));
  }

  const q = search(url).get("q")?.trim();
  const type = search(url).get("type")?.trim();
  const status = search(url).get("status")?.trim();
  const filters: Record<string, unknown> = {};
  if (type) filters.assetType = type;
  if (status) filters.status = status;
  if (q) {
    filters.OR = [
      { name: { contains: q, mode: "insensitive" as const } },
      { stockNo: { contains: q, mode: "insensitive" as const } },
      { serialNo: { contains: q, mode: "insensitive" as const } },
      { ipAddress: { contains: q, mode: "insensitive" as const } },
      { brand: { contains: q, mode: "insensitive" as const } },
      { model: { contains: q, mode: "insensitive" as const } },
    ];
  }
  const where =
    Object.keys(scope).length || Object.keys(filters).length
      ? { AND: [scope, filters].filter((item) => Object.keys(item).length) }
      : {};
  const rows = await prisma.asset.findMany({
    where: where as never,
    include: { owner: { select: { id: true, fullName: true } }, department: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
    take: listLimit(search(url).get("limit")),
  });
  return apiOk(rows.map(serializeAsset), 200, { count: rows.length });
}

async function handleRequests(request: Request, method: string, segs: string[], url: URL) {
  const officeNames = (await getSystemSettings()).officeNames;
  if (method === "POST" && !segs[1]) {
    const auth = await requireApiWrite(request, "talepler:write");
    if (auth.error) return auth.error;
    const parsed = await readApiJson(request);
    if (!parsed.ok) return parsed.error;
    const bodyResult = requestCreateSchema.safeParse(parsed.body);
    if (!bodyResult.success) return apiError(zodErrorMessage(bodyResult.error));
    const body = bodyResult.data;
    const typeDef = getRequestType(body.requestType);
    if (!typeDef) return apiError("Geçersiz requestType. /api/v1/katalog listesine bakın.");
    const viewer = auth.actor.viewer;
    const requesterId = viewer.id;
    if (!requesterId) {
      return apiError("Talep sahibi belirlenemedi.");
    }
    const requester = await prisma.person.findUnique({ where: { id: requesterId }, select: { id: true, departmentId: true } });
    if (!requester) return apiError("Talep sahibi bulunamadı.", 404);

    const extras: Record<string, string> = {};
    const details = body.details ?? {};
    for (const field of typeDef.extraFields) {
      const value = String(details[field.id] ?? "").trim().slice(0, 500);
      if (field.required && !value) return apiError(`${field.label} zorunludur.`);
      if (value) extras[field.id] = value;
    }
    const severityRaw = body.severity ?? "MEDIUM";
    const severity = isRequestSeverity(severityRaw) ? severityRaw : "MEDIUM";
    let status = "OPEN";
    status = (await approvalStatus("request", typeDef.office, status)) ?? status;

    let autoEscalate: Record<string, unknown> = {};
    const requestingDeptId = requester.departmentId ?? null;
    if (shouldAutoEscalate(severity)) {
      const parent = requestingDeptId
        ? await prisma.department.findUnique({
            where: { id: requestingDeptId },
            select: { parentId: true },
          })
        : null;
      autoEscalate = {
        escalationKind: "UPPER_UNIT",
        escalationStatus: "PENDING",
        escalatedDeptId: parent?.parentId ?? requestingDeptId,
        escalationReason: autoEscalationReason(severity),
        escalatedAt: new Date(),
      };
      if (severity === "CRITICAL" && status === "OPEN") status = "WAITING";
    }

    const officeApprover = await resolveOfficeApprover(typeDef.office, requesterId);
    const last = await prisma.serviceRequest.findFirst({ orderBy: { requestNo: "desc" }, select: { requestNo: true } });
    const created = await prisma.serviceRequest.create({
      data: {
        requestType: typeDef.key,
        office: typeDef.office,
        requesterId,
        requestingDeptId,
        requestingManagerId: body.requestingManagerId ?? officeApprover ?? null,
        handlingManagerId: officeApprover ?? null,
        handlingDeptId: officeApprover
          ? (await prisma.person.findUnique({ where: { id: officeApprover }, select: { departmentId: true } }))?.departmentId ?? null
          : null,
        reason: body.reason?.trim() || null,
        description: body.description?.trim() || null,
        severity,
        status,
        resolveDueAt: requestDueDate(new Date(), severity),
        details: Object.keys(extras).length ? JSON.stringify(extras) : null,
        requestNo: nextTicketNo("TAL", last?.requestNo),
        ...autoEscalate,
      },
      include: {
        requester: { select: { id: true, fullName: true } },
        requestingDept: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    });
    await prisma.activityLog.create({
      data: {
        entityType: "ServiceRequest",
        entityId: created.id,
        action: "CREATE",
        actor: auth.actor.keyName ?? viewer.id,
        note: `API: ${typeDef.label} oluşturuldu`,
      },
    });
    await startWorkflowIfAny("request", created.id).catch(() => null);
    await notifyIntegrations({
      kind: "request",
      recordId: created.id,
      ticketNo: created.requestNo,
      title: typeDef.label,
      status: created.status,
      requesterId,
      managerIds: [created.requestingManagerId, officeApprover],
      office: typeDef.office,
    }).catch(() => undefined);
    return apiOk(serializeRequest(created, officeNames), 201);
  }

  const auth = await requireApiScope(request, "talepler:read");
  if (auth.error) return auth.error;

  if (method === "PATCH" && segs[1]) {
    const write = await requireApiWrite(request, "talepler:write");
    if (write.error) return write.error;
    if (!isRecordId(segs[1])) return apiError("Talep bulunamadı.", 404);
    const existing = await prisma.serviceRequest.findUnique({ where: { id: segs[1] } });
    if (!existing) return apiError("Talep bulunamadı.", 404);
    if (!canViewRequest(write.actor.viewer, existing)) return apiError("Bu talebi görme yetkiniz yok.", 403);
    if (!canProcessRequest(write.actor.viewer, existing)) {
      return apiError("Durumu yalnızca ilgili birim yetkilisi güncelleyebilir.", 403);
    }
    const parsed = await readApiJson(request);
    if (!parsed.ok) return parsed.error;
    const bodyResult = requestPatchSchema.safeParse(parsed.body);
    if (!bodyResult.success) return apiError(zodErrorMessage(bodyResult.error));
    const status = bodyResult.data.status;
    const running = await getInstance("request", existing.id).catch(() => null);
    if (running && running.status === "RUNNING" && status !== "CANCELLED") {
      return apiError("Onay zinciri sürüyor; kararı onay adımındaki yetkili verir (/api/v1/talepler/:id/onay).", 409);
    }
    const updated = await prisma.serviceRequest.update({
      where: { id: existing.id },
      data: { status },
      include: {
        requester: { select: { id: true, fullName: true } },
        requestingDept: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    });
    await prisma.activityLog.create({
      data: {
        entityType: "ServiceRequest",
        entityId: updated.id,
        action: "UPDATE",
        actor: write.actor.keyName ?? write.actor.viewer.id,
        note: `API: durum ${status}`,
      },
    });
    return apiOk(serializeRequest(updated, officeNames));
  }

  if (method === "GET" && segs[1] && segs[2] === "onay") {
    if (!isRecordId(segs[1])) return apiError("Talep bulunamadı.", 404);
    const row = await prisma.serviceRequest.findUnique({ where: { id: segs[1] } });
    if (!row) return apiError("Talep bulunamadı.", 404);
    if (!isServiceActor(auth.actor) && !canViewRequest(auth.actor.viewer, row)) {
      return apiError("Bu talebi görme yetkiniz yok.", 403);
    }
    const instance = await getInstance("request", row.id);
    let history: unknown = [];
    try {
      history = instance ? JSON.parse(instance.history) : [];
    } catch {
      history = [];
    }
    return apiOk({
      requestNo: row.requestNo,
      status: row.status,
      workflow: instance ? { status: instance.status, currentNodeId: instance.currentNodeId, history } : null,
      assignee: row.assigneeId,
    });
  }

  if (method === "GET" && segs[1]) {
    if (!isRecordId(segs[1])) return apiError("Talep bulunamadı.", 404);
    const row = await prisma.serviceRequest.findUnique({
      where: { id: segs[1] },
      include: {
        requester: { select: { id: true, fullName: true } },
        requestingDept: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    });
    if (!row) return apiError("Talep bulunamadı.", 404);
    if (!isServiceActor(auth.actor) && !canViewRequest(auth.actor.viewer, row)) {
      return apiError("Bu talebi görme yetkiniz yok.", 403);
    }
    return apiOk(serializeRequest(row, officeNames));
  }

  if (method !== "GET") return apiError("Yöntem desteklenmiyor.", 405);

  const office = search(url).get("office")?.trim();
  const status = search(url).get("status")?.trim();
  const type = search(url).get("type")?.trim();
  const q = search(url).get("q")?.trim();
  const where: Record<string, unknown> = {
    AND: [isServiceActor(auth.actor) ? {} : visibleRequestWhere(auth.actor.viewer)],
  };
  const and = where.AND as Record<string, unknown>[];
  if (office) and.push({ office });
  if (status) and.push({ status });
  if (type) and.push({ requestType: type });
  if (q) and.push({ OR: [{ requestNo: { contains: q, mode: "insensitive" as const } }, { reason: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] });

  const rows = await prisma.serviceRequest.findMany({
    where: where as never,
    include: {
      requester: { select: { id: true, fullName: true } },
      requestingDept: { select: { id: true, name: true } },
      assignee: { select: { id: true, fullName: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: listLimit(search(url).get("limit")),
  });
  return apiOk(rows.map((row) => serializeRequest(row, officeNames)), 200, { count: rows.length });
}

async function handlePeople(request: Request, url: URL) {
  const auth = await requireApiScope(request, "personel:read");
  if (auth.error) return auth.error;
  const q = search(url).get("q")?.trim();
  const rows = await prisma.person.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { sicilNo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {},
    include: { department: { select: { id: true, name: true } } },
    orderBy: { fullName: "asc" },
    take: listLimit(search(url).get("limit")),
  });
  return apiOk(rows.map(serializePerson), 200, { count: rows.length });
}

async function handleVulns(request: Request, method: string, url: URL) {
  if (method === "POST") {
    const write = await requireApiWrite(request, "zafiyet:write");
    if (write.error) return write.error;
    const parsed = await readApiJson(request);
    if (!parsed.ok) return parsed.error;
    const result = vulnCreateSchema.safeParse(parsed.body);
    if (!result.success) return apiError(zodErrorMessage(result.error));
    const body = result.data;
    if (body.externalId) {
      // Aynı dış kimlikle tekrar gelen bulgu (ör. pipeline yeniden çalıştı) yinelenmez.
      const existing = await prisma.vulnerability.findUnique({ where: { externalId: body.externalId } });
      if (existing) return apiOk(serializeVuln(existing), 200);
    }
    const due = body.dueDate ? new Date(body.dueDate) : null;
    if (due && Number.isNaN(due.getTime())) return apiError("dueDate geçerli bir tarih olmalı (YYYY-MM-DD).");
    const owner = body.ownerId ?? write.actor.viewer.id ?? null;
    const last = await prisma.vulnerability.findFirst({ orderBy: { vulnNo: "desc" }, select: { vulnNo: true } });
    const created = await prisma.vulnerability.create({
      data: {
        vulnNo: nextTicketNo("ZAF", last?.vulnNo),
        deviceName: body.deviceName || null,
        deviceIp: body.deviceIp || null,
        cve: body.cve || null,
        severity: body.severity ?? "MEDIUM",
        description: body.description || null,
        dueDate: due,
        ownerId: owner,
        departmentId: body.departmentId ?? null,
        source: body.source ?? "MANUAL",
        scannerVendor: body.scannerVendor || null,
        externalId: body.externalId || null,
      },
    });
    await prisma.activityLog.create({
      data: { entityType: "Vulnerability", entityId: created.id, action: "CREATE", actor: write.actor.keyName ?? write.actor.viewer.id, note: "API: zafiyet kaydı" },
    });
    return apiOk(serializeVuln(created), 201);
  }
  if (method !== "GET") return apiError("Yöntem desteklenmiyor.", 405);
  const auth = await requireApiScope(request, "zafiyet:read");
  if (auth.error) return auth.error;
  const status = search(url).get("status")?.trim();
  const rows = await prisma.vulnerability.findMany({
    where: status ? { status } : {},
    orderBy: { detectedAt: "desc" },
    take: listLimit(search(url).get("limit")),
  });
  return apiOk(rows.map(serializeVuln), 200, { count: rows.length });
}

async function handleIncidents(request: Request, method: string, url: URL) {
  if (method === "POST") {
    const auth = await requireApiWrite(request, "olay:write");
    if (auth.error) return auth.error;
    const parsed = await readApiJson(request);
    if (!parsed.ok) return parsed.error;
    const bodyResult = incidentCreateSchema.safeParse(parsed.body);
    if (!bodyResult.success) return apiError(zodErrorMessage(bodyResult.error));
    const body = bodyResult.data;
    const last = await prisma.incident.findFirst({ orderBy: { incidentNo: "desc" }, select: { incidentNo: true } });
    const severity = body.severity ?? "MEDIUM";
    const created = await prisma.incident.create({
      data: {
        title: body.title,
        description: body.description?.trim() || null,
        departmentId: body.departmentId ?? null,
        requesterId: auth.actor.viewer.id,
        l1AnalystId: body.l1AnalystId ?? auth.actor.viewer.id,
        severity,
        priority: derivePriority({ severity }),
        ...incidentDueDates(new Date(), derivePriority({ severity })),
        layer: "L1",
        escalationStatus: shouldAutoEscalate(severity) ? "PENDING" : "NONE",
        incidentNo: nextTicketNo("OLY", last?.incidentNo),
      },
    });
    return apiOk(serializeIncident(created), 201);
  }
  const auth = await requireApiScope(request, "olay:read");
  if (auth.error) return auth.error;
  if (method !== "GET") return apiError("Yöntem desteklenmiyor.", 405);
  const rows = await prisma.incident.findMany({
    orderBy: { startedAt: "desc" },
    take: listLimit(search(url).get("limit")),
  });
  return apiOk(rows.map(serializeIncident), 200, { count: rows.length });
}

async function handleProblems(request: Request, url: URL) {
  const auth = await requireApiScope(request, "problem:read");
  if (auth.error) return auth.error;
  const rows = await prisma.problem.findMany({
    orderBy: { createdAt: "desc" },
    take: listLimit(search(url).get("limit")),
  });
  return apiOk(rows.map(serializeProblem), 200, { count: rows.length });
}

async function handleChanges(request: Request, method: string, url: URL) {
  if (method === "POST") return createChange(request);
  if (method !== "GET") return apiError("Yöntem desteklenmiyor.", 405);
  const auth = await requireApiScope(request, "degisiklik:read");
  if (auth.error) return auth.error;
  const rows = await prisma.changeRecord.findMany({
    orderBy: { updatedAt: "desc" },
    take: listLimit(search(url).get("limit")),
  });
  return apiOk(rows.map(serializeChange), 200, { count: rows.length });
}

async function handlePatches(request: Request, url: URL) {
  const auth = await requireApiScope(request, "yama:read");
  if (auth.error) return auth.error;
  const rows = await prisma.patchRecord.findMany({
    orderBy: { updatedAt: "desc" },
    take: listLimit(search(url).get("limit")),
  });
  return apiOk(rows.map(serializePatch), 200, { count: rows.length });
}

async function handlePendingApprovals(request: Request) {
  const auth = await requireApiScope(request, "talepler:read");
  if (auth.error) return auth.error;
  if (isServiceActor(auth.actor) || !auth.actor.viewer.id) return apiError("Bu uç için personele bağlı anahtar veya oturum gerekir.", 403);
  const rows = await listPendingFor(auth.actor.viewer.id, auth.actor.viewer.role === "SUPER_ADMIN");
  return apiOk(rows, 200, { count: rows.length });
}

async function handleLicense(request: Request) {
  const auth = await requireApiScope(request, "talepler:read");
  if (auth.error) return auth.error;
  if (isServiceActor(auth.actor) || auth.actor.viewer.role !== "SUPER_ADMIN") {
    return apiError("Lisans bilgisini yalnızca süper yönetici görebilir.", 403);
  }
  return apiOk(await getLicenseState());
}

async function createChange(request: Request) {
  const write = await requireApiWrite(request, "degisiklik:write");
  if (write.error) return write.error;
  const parsed = await readApiJson(request);
  if (!parsed.ok) return parsed.error;
  const result = changeCreateSchema.safeParse(parsed.body);
  if (!result.success) return apiError(zodErrorMessage(result.error));
  const body = result.data;
  const requesterId = write.actor.viewer.id;
  if (!requesterId) return apiError("Talep sahibi belirlenemedi.");
  const changeType = body.changeType ?? "NORMAL";
  const risk = body.risk ?? "MEDIUM";
  if (changeType !== "STANDARD" && !body.rollbackPlan) {
    return apiError("Standart olmayan değişikliklerde rollbackPlan (geri dönüş planı) zorunludur.");
  }
  const toDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };
  const workStart = toDate(body.workStartDate);
  const expectedEnd = toDate(body.expectedEndDate);
  if (workStart === undefined || expectedEnd === undefined) return apiError("Tarihler YYYY-MM-DD biçiminde olmalı.");

  const requester = await prisma.person.findUnique({ where: { id: requesterId }, select: { departmentId: true } });
  const requestingManagerId =
    body.requestingManagerId ?? (await resolveModuleManager("degisiklik", requesterId)) ?? null;
  const units = body.approvalUnits?.length
    ? body.approvalUnits
    : requester?.departmentId && requestingManagerId
      ? [{ departmentId: requester.departmentId, managerId: requestingManagerId }]
      : [];
  if (!units.length) {
    return apiError("Onay birimi belirlenemedi: approvalUnits verin veya talep sahibine birim ve birim amiri atayın.");
  }
  const [departments, managers] = await Promise.all([
    prisma.department.findMany({ where: { id: { in: units.map((u) => u.departmentId) } }, select: { id: true } }),
    prisma.person.findMany({ where: { id: { in: units.map((u) => u.managerId) } }, select: { id: true } }),
  ]);
  const deptSet = new Set(departments.map((d) => d.id));
  const mgrSet = new Set(managers.map((m) => m.id));
  if (units.some((u) => !deptSet.has(u.departmentId) || !mgrSet.has(u.managerId))) {
    return apiError("approvalUnits içindeki birim veya amir bulunamadı.");
  }
  const incident = body.incidentNo ? await prisma.incident.findUnique({ where: { incidentNo: body.incidentNo }, select: { id: true } }) : null;
  if (body.incidentNo && !incident) return apiError(`${body.incidentNo} numaralı olay bulunamadı.`, 404);
  const problem = body.problemNo ? await prisma.problem.findUnique({ where: { problemNo: body.problemNo }, select: { id: true } }) : null;
  if (body.problemNo && !problem) return apiError(`${body.problemNo} numaralı problem bulunamadı.`, 404);

  const infosecManagerId = (await resolveModuleManager("infosec", requesterId)) ?? null;
  let status = "DRAFT";
  status = (await approvalStatus("change", undefined, status)) ?? status;
  const last = await prisma.changeRecord.findFirst({ orderBy: { changeNo: "desc" }, select: { changeNo: true } });
  const created = await prisma.changeRecord.create({
    data: {
      changeNo: nextTicketNo("CHG", last?.changeNo),
      requesterId,
      requestingDeptId: requester?.departmentId ?? null,
      requestingManagerId,
      infosecManagerId,
      approvalUnitCount: units.length,
      targetDept1Id: units[0]?.departmentId ?? null,
      targetMgr1Id: units[0]?.managerId ?? null,
      targetDept2Id: units[1]?.departmentId ?? null,
      targetMgr2Id: units[1]?.managerId ?? null,
      targetDept3Id: units[2]?.departmentId ?? null,
      targetMgr3Id: units[2]?.managerId ?? null,
      changeType,
      risk,
      rollbackPlan: body.rollbackPlan || null,
      testPlan: body.testPlan || null,
      changeIp: body.changeIp || null,
      impact: body.impact || null,
      workStartDate: workStart,
      expectedEndDate: expectedEnd,
      requestDate: new Date(),
      description: body.description,
      status,
      incidentId: incident?.id ?? null,
      problemId: problem?.id ?? null,
    },
  });
  await prisma.changeApprovalUnit.createMany({
    data: units.map((u, index) => ({ changeId: created.id, sortOrder: index + 1, departmentId: u.departmentId, managerId: u.managerId })),
  });
  await prisma.activityLog.create({
    data: { entityType: "ChangeRecord", entityId: created.id, action: "CREATE", actor: write.actor.keyName ?? requesterId, note: "API: değişiklik kaydı (yayın)" },
  });
  await startWorkflowIfAny("change", created.id).catch(() => null);
  await notifyIntegrations({
    kind: "change",
    recordId: created.id,
    ticketNo: created.changeNo,
    title: "Değişiklik",
    status: created.status,
    requesterId,
    managerIds: [requestingManagerId, infosecManagerId, ...units.map((u) => u.managerId)],
  }).catch(() => undefined);
  return apiOk(serializeChange(created), 201);
}
