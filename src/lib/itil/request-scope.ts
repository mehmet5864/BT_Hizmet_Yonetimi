import type { PersonnelRole } from "@/lib/itil/constants";
import { requestScopeFilter } from "@/lib/itil/escalation";
import { REQUEST_OFFICES, type RequestOffice } from "@/lib/itil/request-types";

export const OFFICE_HANDLER_ROLES = [
  "SYSTEM_ADMIN",
  "UNIT_MANAGER",
  "SENIOR_MANAGER",
  "INFOSEC_MANAGER",
  "SUPER_ADMIN",
] as const;

export function isRequestOffice(value: string | null | undefined): value is RequestOffice {
  return Boolean(value && (REQUEST_OFFICES as readonly string[]).includes(value));
}

export function isOfficeHandlerRole(role?: string | null) {
  return Boolean(role && (OFFICE_HANDLER_ROLES as readonly string[]).includes(role));
}

export function isRequesterOnly(role?: string | null) {
  return !role || role === "USER";
}

/** Rolün varsayılan gelen kuyruğu. Düz kullanıcıya ofis atanmış olsa bile kuyruk açılmaz. */
export function handlerOffices(input: {
  role?: string | null;
  requestOffice?: string | null;
}): RequestOffice[] | "ALL" {
  if (input.role === "SUPER_ADMIN" || input.role === "SENIOR_MANAGER") return "ALL";
  if (isRequesterOnly(input.role)) return [];

  const offices = new Set<RequestOffice>();
  // Sistem yöneticisi yalnızca çalıştığı ofisin kuyruğunu görür (ofis tanımsızsa Sistem); örn. Siber'deki biri Network'ü görmez.
  if (input.role === "SYSTEM_ADMIN") offices.add(isRequestOffice(input.requestOffice) ? input.requestOffice : "SISTEM");
  if (input.role === "INFOSEC_MANAGER") offices.add("SIBER");
  if (input.role !== "SYSTEM_ADMIN" && isRequestOffice(input.requestOffice)) offices.add(input.requestOffice);
  return [...offices];
}

export function seesAllRequestOffices(role?: string | null) {
  return handlerOffices({ role }) === "ALL";
}

export function scopedRequestOffices(input: {
  role?: string | null;
  requestOffice?: string | null;
}): RequestOffice[] | "ALL" {
  return handlerOffices(input);
}

export function canViewOffice(scope: RequestOffice[] | "ALL", office: string) {
  return scope === "ALL" || (isRequestOffice(office) && scope.includes(office));
}

export type RequestViewer = {
  id: string;
  role?: PersonnelRole | string | null;
  requestOffice?: string | null;
  departmentId?: string | null;
  groups?: string[];
  /** Kendisi + birim personeli (yalnızca birim amiri / sistem yöneticisi için doludur). */
  unitPersonIds?: string[];
};

function ownRequesters(user: RequestViewer) {
  return user.unitPersonIds?.length ? user.unitPersonIds : [user.id];
}

export function visibleRequestWhere(user: RequestViewer) {
  const offices = handlerOffices(user);
  if (offices === "ALL") return {};
  const own = { requesterId: { in: ownRequesters(user) } };
  if (!offices.length) return own;

  const inbox: Record<string, unknown>[] = [];
  for (const office of offices) {
    if (office === "SERVIS") {
      inbox.push({
        AND: [{ office: "SERVIS" }, { OR: [{ escalatedOffice: null }, { escalatedOffice: "" }] }],
      });
    } else {
      inbox.push({ office });
      inbox.push({ escalatedOffice: office });
    }
  }

  return { OR: [own, ...inbox] };
}

export function canViewRequest(
  user: RequestViewer,
  request: {
    requesterId: string;
    office: string;
    originalOffice?: string | null;
    escalatedOffice?: string | null;
  },
) {
  if (ownRequesters(user).includes(request.requesterId)) return true;
  const scope = handlerOffices(user);
  if (scope === "ALL") return true;
  if (canViewOffice(scope, request.office)) {
    if (request.office === "SERVIS" && request.escalatedOffice && request.escalatedOffice !== "SERVIS") {
      return canViewOffice(scope, request.escalatedOffice);
    }
    return true;
  }
  return request.escalatedOffice ? canViewOffice(scope, request.escalatedOffice) : false;
}

/** Gelen kuyrukta işlem / durum / yükseltme. */
export function canProcessRequest(
  user: RequestViewer,
  request: { office: string; escalatedOffice?: string | null },
) {
  const scope = handlerOffices(user);
  if (scope === "ALL") return true;
  if (request.office === "SERVIS" && request.escalatedOffice && request.escalatedOffice !== "SERVIS") {
    return canViewOffice(scope, request.escalatedOffice);
  }
  return (
    canViewOffice(scope, request.office) ||
    (request.escalatedOffice ? canViewOffice(scope, request.escalatedOffice) : false)
  );
}

const OWNER_EDITABLE = new Set(["OPEN", "WAITING"]);

/** Sahip açık talebini düzeltebilir; kuyruk yetkilisi her durumda işler. */
export function canEditRequest(
  user: RequestViewer,
  request: {
    requesterId: string;
    office: string;
    status: string;
    escalatedOffice?: string | null;
  },
) {
  if (canProcessRequest(user, request)) return true;
  return request.requesterId === user.id && OWNER_EDITABLE.has(request.status);
}

/** Liste / pano: kendi talepleri + gelen kuyruk. Ofis filtresi kuyruk yoksa yalnızca kendi kayıtlarını döner. */
export function listRequestWhere(
  user: RequestViewer,
  filters: {
    office?: string;
    type?: string;
    types?: string[];
    status?: string;
    severity?: string;
    query?: string;
  } = {},
) {
  const typeWhere = filters.type
    ? { requestType: filters.type }
    : filters.types?.length
      ? { requestType: { in: filters.types } }
      : {};
  const extra: Record<string, unknown>[] = [];
  if (filters.status) extra.push({ status: filters.status });
  if (filters.severity) extra.push({ severity: filters.severity });
  const term = filters.query?.trim();
  if (term) {
    extra.push({
      OR: [
        { requestNo: { contains: term, mode: "insensitive" as const } },
        { reason: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { requester: { fullName: { contains: term, mode: "insensitive" as const } } },
        { requestingDept: { name: { contains: term, mode: "insensitive" as const } } },
      ],
    });
  }
  const inbox = handlerOffices(user);
  const own = { requesterId: { in: ownRequesters(user) } };

  if (filters.office && canViewOffice(inbox, filters.office)) {
    return {
      AND: [visibleRequestWhere(user), requestScopeFilter([filters.office]), typeWhere, ...extra],
    };
  }
  if (filters.office) {
    return { AND: [own, { office: filters.office }, typeWhere, ...extra] };
  }
  if (filters.type || filters.types?.length || extra.length) {
    return { AND: [visibleRequestWhere(user), typeWhere, ...extra] };
  }
  return visibleRequestWhere(user);
}
