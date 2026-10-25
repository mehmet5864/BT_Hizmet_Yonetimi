import { parsePersonGroups, scopesFor, viewerGrantNames } from "@/lib/auth/acl";
import { getViewerAcl } from "@/lib/auth/viewer";
import { isPersonnelRole } from "@/lib/auth/rbac";
import { handledTypesFor } from "@/lib/itil/request-groups";
import { isRequestOffice, type RequestViewer } from "@/lib/itil/request-scope";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security/http";
import { getSystemSettings } from "@/lib/settings-store";

import { API_FAIL_LIMIT, API_READ_LIMIT, API_WINDOW_MS, API_WRITE_LIMIT, clientIp, ipAllowed, parseAllowlist, sameOriginWrite } from "./guard";
import { apiError } from "./http";
import { parsePresentedToken, readApiToken, tokenMatches } from "./keys";
import { getLicensedModules } from "@/lib/license";
import { hasScope, parseScopeJson, scopeModule, scopesFromAcl, type ApiScope } from "./scopes";

async function licenseDenied(scope: ApiScope) {
  const licensed = await getLicensedModules();
  if (licensed && !licensed.has(scopeModule(scope))) {
    return apiError("Bu modül lisansınızda etkin değil.", 403);
  }
  return null;
}

export type ApiActor = {
  kind: "key" | "session";
  viewer: RequestViewer;
  scopes: ApiScope[];
  bound: boolean;
  service: boolean;
  keyId?: string;
  keyName?: string;
};

const INVALID_KEY = "API anahtarı geçersiz.";

async function viewerFromPersonId(id: string): Promise<RequestViewer | null> {
  const person = await prisma.person.findUnique({
    where: { id },
    select: { id: true, role: true, requestOffice: true, departmentId: true, adGroups: true },
  });
  if (!person) return null;
  const role = isPersonnelRole(person.role) ? person.role : "USER";
  const requestOffice = isRequestOffice(person.requestOffice) ? person.requestOffice : null;
  const settings = await getSystemSettings();
  return {
    id: person.id,
    role,
    requestOffice,
    departmentId: person.departmentId,
    handledTypes: handledTypesFor(parsePersonGroups(person.adGroups), settings.requestGroups),
    groups: viewerGrantNames({ role, requestOffice, adGroups: person.adGroups }),
    requestScopes: scopesFor(settings.acl.grants, viewerGrantNames({ role, requestOffice, adGroups: person.adGroups }), "talepler"),
  };
}

function serviceViewer(): RequestViewer {
  return {
    id: "api-service",
    role: "USER",
    requestOffice: null,
    departmentId: null,
    groups: ["role:USER"],
  };
}

function failKey(request: Request) {
  return `api-fail:${clientIp(request)}`;
}

function denyAuth(request: Request, message = INVALID_KEY, status = 401) {
  const failed = rateLimit(failKey(request), API_FAIL_LIMIT, API_WINDOW_MS);
  if (!failed.ok) {
    return { actor: null, error: apiError("İstek sınırı aşıldı. Bir dakika sonra deneyin.", 429, undefined, failed) };
  }
  return { actor: null, error: apiError(message, status) };
}

export function isServiceActor(actor: ApiActor) {
  return actor.service;
}

export async function authenticateApi(request: Request): Promise<
  { actor: ApiActor; error: null } | { actor: null; error: Response }
> {
  const presented = readApiToken(request);
  if (presented) {
    const blocked = rateLimit(failKey(request), API_FAIL_LIMIT, API_WINDOW_MS, false);
    if (!blocked.ok) {
      return { actor: null, error: apiError("İstek sınırı aşıldı. Bir dakika sonra deneyin.", 429, undefined, blocked) };
    }
    const parsed = parsePresentedToken(presented);
    if (!parsed) return denyAuth(request);

    const traffic = rateLimit(`api-key:${parsed.prefix}`, API_READ_LIMIT, API_WINDOW_MS);
    if (!traffic.ok) {
      return { actor: null, error: apiError("İstek sınırı aşıldı. Bir dakika sonra deneyin.", 429, undefined, traffic) };
    }

    const row = await prisma.apiKey.findUnique({ where: { prefix: parsed.prefix } });
    if (!row || row.revokedAt || (row.expiresAt && row.expiresAt.getTime() < Date.now())) {
      return denyAuth(request);
    }
    if (!tokenMatches(parsed.token, row.secretHash)) {
      return denyAuth(request);
    }
    const allow = parseAllowlist(row.allowedCidrs);
    if (!ipAllowed(clientIp(request), allow)) {
      return denyAuth(request, "Bu anahtar bu adresten kullanılamaz.", 403);
    }

    const keyScopes = parseScopeJson(row.scopes);
    const bound = Boolean(row.ownerId);
    let viewer: RequestViewer | null;
    let scopes = keyScopes;
    if (bound && row.ownerId) {
      viewer = await viewerFromPersonId(row.ownerId);
      if (!viewer) return denyAuth(request);
      const settings = await getSystemSettings();
      const aclScopes = scopesFromAcl(viewer, settings.acl.grants);
      scopes = keyScopes.filter((scope) => hasScope(aclScopes, scope));
    } else {
      viewer = serviceViewer();
      scopes = keyScopes.filter((scope) => scope.endsWith(":read"));
    }

    void prisma.apiKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return {
      actor: {
        kind: "key",
        viewer,
        scopes,
        bound,
        service: !bound,
        keyId: row.id,
        keyName: row.name,
      },
      error: null,
    };
  }

  const { viewer, grants } = await getViewerAcl();
  if (!viewer) {
    return {
      actor: null,
      error: apiError("Oturum veya API anahtarı gerekli. Authorization: Bearer bth_…", 401),
    };
  }
  const limited = rateLimit(`api-session:${viewer.id}`, API_READ_LIMIT, API_WINDOW_MS);
  if (!limited.ok) return { actor: null, error: apiError("İstek sınırı aşıldı. Bir dakika sonra deneyin.", 429, undefined, limited) };
  return {
    actor: { kind: "session", viewer, scopes: scopesFromAcl(viewer, grants), bound: true, service: false },
    error: null,
  };
}

export async function requireApiScope(request: Request, scope: ApiScope) {
  const auth = await authenticateApi(request);
  if (auth.error) return auth;
  if (!hasScope(auth.actor.scopes, scope)) {
    return { actor: null, error: apiError("Bu işlem için yetkiniz yok.", 403) };
  }
  const denied = await licenseDenied(scope);
  if (denied) return { actor: null, error: denied };
  return auth;
}

export async function requireApiWrite(request: Request, scope: ApiScope) {
  if (!scope.endsWith(":write")) {
    return { actor: null, error: apiError("Bu işlem için yetkiniz yok.", 403) };
  }
  const writeLimit = rateLimit(`api-write:${clientIp(request)}`, API_WRITE_LIMIT, API_WINDOW_MS);
  if (!writeLimit.ok) {
    return { actor: null, error: apiError("Yazma isteği sınırı aşıldı. Bir dakika sonra deneyin.", 429, undefined, writeLimit) };
  }
  const auth = await authenticateApi(request);
  if (auth.error) return auth;
  if (auth.actor.service || !auth.actor.bound) {
    return {
      actor: null,
      error: apiError("Yazma işlemleri için anahtar bir personele bağlı olmalıdır.", 403),
    };
  }
  if (!hasScope(auth.actor.scopes, scope)) {
    return { actor: null, error: apiError("Bu işlem için yetkiniz yok.", 403) };
  }
  if (auth.actor.kind === "session" && !sameOriginWrite(request)) {
    return {
      actor: null,
      error: apiError("Oturum ile yazma yalnızca aynı kaynaktan (uygulama) kabul edilir.", 403),
    };
  }
  const denied = await licenseDenied(scope);
  if (denied) return { actor: null, error: denied };
  return auth;
}
