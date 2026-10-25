import type { AppModule } from "@/lib/auth/rbac";

/** ITIL süreç modülleri: düz kullanıcı bunları yalnızca kendisine görev atandığında görür. */
export const ASSIGNABLE_MODULES = [
  "degisiklik",
  "yama",
  "konfigurasyon",
  "zafiyet",
  "firma-sla",
  "olay",
  "problem",
  "cevik",
  "surec",
] as const satisfies readonly AppModule[];

export function assignedGrantName(module: string) {
  return `assigned:${module}`;
}

