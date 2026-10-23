import { getSession } from "@/lib/auth/session";
import { canApproveProblemAssignment } from "@/lib/itil/constants";
import { collectVendorEmails, type SlaProductOption } from "@/lib/itil/vendor-sla";
import { prisma } from "@/lib/prisma";
import { resolveModuleManager, requesterLineManager } from "@/lib/itil/office-officers";
import type { OfficerKey } from "@/lib/settings";
import { getSystemSettings } from "@/lib/settings-store";

export async function getItilCatalog() {
  const [people, departments, vendors, services] = await Promise.all([
    prisma.person.findMany({ orderBy: { fullName: "asc" }, include: { department: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.catalogService
      .findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, serviceNo: true, status: true } })
      .catch(() => []),
  ]);

  return {
    people: people.map((person) => ({
      id: person.id,
      label: person.fullName,
      meta: person.department?.name,
      departmentId: person.departmentId,
      unitManagerId: person.unitManagerId,
      parentDepartmentId: person.parentDepartmentId,
      parentManagerId: person.parentManagerId,
      requestOffice: person.requestOffice,
    })),
    departments: departments.map((department) => ({
      id: department.id,
      label: department.name,
      managerId: department.managerId,
      parentId: department.parentId,
      parentManagerId: department.parentManagerId,
    })),
    vendors: vendors.map((vendor) => ({ id: vendor.id, label: vendor.name })),
    services: services.map((service) => ({
      id: service.id,
      label: service.name,
      meta: service.serviceNo,
    })),
  };
}

export async function withRequesterDefaults(values: Record<string, unknown> = {}) {
  const user = await getSession();
  const lineManager = await requesterLineManager(user?.id);
  const person = user?.id
    ? await prisma.person.findUnique({
        where: { id: user.id },
        select: { departmentId: true },
      })
    : null;
  return {
    requesterId: user?.id,
    requestingManagerId: lineManager,
    requestingDeptId: person?.departmentId,
    departmentId: person?.departmentId,
    ...values,
  };
}

export async function getDesignatedOfficers() {
  const settings = await getSystemSettings();
  return settings.officers;
}

async function existingPersonId(id?: string | null) {
  if (!id) return undefined;
  const person = await prisma.person.findUnique({ where: { id }, select: { id: true } });
  return person?.id;
}

export async function defaultOfficerId(key: OfficerKey) {
  return resolveModuleManager(key);
}

export async function defaultInfosecManagerId() {
  const fromSettings = await defaultOfficerId("infosec");
  if (fromSettings) return fromSettings;
  const person = await prisma.person.findFirst({
    where: { role: "INFOSEC_MANAGER" },
    orderBy: { fullName: "asc" },
    select: { id: true },
  });
  return person?.id;
}

export async function defaultPatchManagerId() {
  return defaultOfficerId("yama");
}

export async function defaultProblemManagerId() {
  return defaultOfficerId("problem");
}

export async function withModuleManagerDefaults(key: OfficerKey, values: Record<string, unknown> = {}) {
  const user = await getSession();
  const managerId = await resolveModuleManager(key, user?.id);
  return withRequesterDefaults({
    ...values,
    ...(managerId ? { requestingManagerId: managerId, infosecManagerId: key === "infosec" || key === "problem" ? managerId : undefined, managerId } : {}),
  });
}

export async function viewerCanApproveProblemAssignment(
  role?: string | null,
  viewerId?: string | null,
  recordInfosecId?: string | null,
) {
  const officers = await getDesignatedOfficers();
  return canApproveProblemAssignment(role, viewerId, recordInfosecId, [
    officers.infosec,
    officers.problem,
    officers.zafiyet,
    officers.olay,
  ]);
}

export async function getSlaProductCatalog(): Promise<SlaProductOption[]> {
  const products = await prisma.vendorProduct.findMany({
    orderBy: [{ vendor: { name: "asc" } }, { name: "asc" }],
    include: {
      vendor: {
        include: {
          contacts: { orderBy: { sortOrder: "asc" } },
          slaLevels: { orderBy: { level: "asc" } },
        },
      },
    },
  });
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    licenseType: product.licenseType,
    quantity: product.quantity,
    version: product.version,
    vendorId: product.vendorId,
    vendorName: product.vendor.name,
    specFileUrl: product.vendor.specFileUrl ?? product.vendor.contractFileUrl,
    specFileName: product.vendor.specFileName,
    specKind: product.vendor.specKind,
    supportEmails: collectVendorEmails(product.vendor),
    contacts: product.vendor.contacts.map((row) => ({
      name: row.name,
      email: row.email,
      phone: row.phone,
      kind: row.kind,
    })),
    slaLevels: product.vendor.slaLevels.map((row) => ({
      level: row.level,
      name: row.name,
      responseHours: row.responseHours,
      resolveHours: row.resolveHours,
      description: row.description,
    })),
  }));
}
