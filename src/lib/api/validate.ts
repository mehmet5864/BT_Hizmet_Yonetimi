import { z } from "zod";

const idField = z.string().regex(/^[a-z0-9]{8,64}$/i).optional();
const ticketStatuses = ["OPEN", "IN_PROGRESS", "WAITING", "DONE", "REJECTED", "CANCELLED"] as const;

export const requestCreateSchema = z
  .object({
    requestType: z.string().trim().min(1).max(80),
    reason: z.string().trim().max(500).optional(),
    description: z.string().trim().max(4000).optional(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    requesterId: idField,
    requestingDeptId: idField,
    requestingManagerId: idField,
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const requestPatchSchema = z
  .object({
    status: z.enum(ticketStatuses),
  })
  .strict();

export const incidentCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional(),
    departmentId: idField,
    l1AnalystId: idField,
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  })
  .strict();

export const changeCreateSchema = z
  .object({
    description: z.string().trim().min(3).max(4000),
    changeType: z.enum(["STANDARD", "NORMAL", "EMERGENCY"]).optional(),
    risk: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    rollbackPlan: z.string().trim().max(4000).optional(),
    testPlan: z.string().trim().max(4000).optional(),
    changeIp: z.string().trim().max(200).optional(),
    impact: z.string().trim().max(500).optional(),
    workStartDate: z.string().trim().max(40).optional(),
    expectedEndDate: z.string().trim().max(40).optional(),
    requestingManagerId: idField,
    incidentNo: z.string().trim().max(40).optional(),
    problemNo: z.string().trim().max(40).optional(),
    approvalUnits: z
      .array(z.object({ departmentId: z.string().regex(/^[a-z0-9]{8,64}$/i), managerId: z.string().regex(/^[a-z0-9]{8,64}$/i) }).strict())
      .max(10)
      .optional(),
  })
  .strict();

export const vulnCreateSchema = z
  .object({
    deviceName: z.string().trim().max(200).optional(),
    deviceIp: z.string().trim().max(100).optional(),
    cve: z.string().trim().max(60).optional(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    description: z.string().trim().max(4000).optional(),
    dueDate: z.string().trim().max(40).optional(),
    ownerId: idField,
    departmentId: idField,
    source: z.enum(["MANUAL", "SCANNER"]).optional(),
    scannerVendor: z.string().trim().max(60).optional(),
    externalId: z.string().trim().max(120).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.deviceName || value.deviceIp || value.cve), { message: "deviceName, deviceIp veya cve alanlarından biri zorunludur." });

export function zodErrorMessage(error: z.ZodError) {
  const first = error.issues[0];
  if (!first) return "Geçersiz istek gövdesi.";
  const path = first.path.length ? `${first.path.join(".")}: ` : "";
  return `${path}${first.message}`;
}
