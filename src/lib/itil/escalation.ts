import {
  REQUEST_SEVERITIES,
  type EscalationKind,
  type EscalationStatus,
  type RequestSeverity,
} from "@/lib/itil/constants";

export function isRequestSeverity(value: string | null | undefined): value is RequestSeverity {
  return Boolean(value && (REQUEST_SEVERITIES as readonly string[]).includes(value));
}

export function shouldAutoEscalate(severity: string | null | undefined) {
  return severity === "HIGH" || severity === "CRITICAL";
}

export function autoEscalationReason(severity: string) {
  if (severity === "CRITICAL") {
    return "Kritik seviye: işlemin üst birim tarafından yapılması gerekir.";
  }
  return "Yüksek seviye: üst birim bilgilendirildi, gerekirse devralabilir.";
}

export function requestScopeFilter(offices: string[] | "ALL") {
  if (offices === "ALL") return {};
  if (!offices.length) return { office: "__none__" };
  return {
    OR: [
      { office: { in: offices } },
      { originalOffice: { in: offices } },
      { escalatedOffice: { in: offices } },
    ],
  };
}

export function nextEscalationStatus(kind: EscalationKind): EscalationStatus {
  return kind === "MISROUTED" || kind === "LAYER2" ? "TRANSFERRED" : "PENDING";
}
