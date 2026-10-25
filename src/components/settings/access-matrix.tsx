"use client";

import { useActionState, useEffect, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { toast } from "sonner";

import { OfficersForm } from "@/components/settings/org-forms";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveModuleAclSettings } from "@/lib/actions/settings";
import { EMPTY_STATE } from "@/lib/actions/shared";
import {
  ACL_MODULES,
  defaultScopes,
  MODULE_SCOPE_HINTS,
  MODULE_SCOPE_LABELS,
  MODULE_SCOPES,
  OFFICER_MODULE,
  officerGrantName,
  recommendedRoleGrants,
  SCOPED_MODULES,
  type ModuleGrant,
  type ModuleLevel,
  type ModuleScope,
} from "@/lib/auth/acl";
import { MODULE_LABELS, type AppModule } from "@/lib/auth/rbac";
import { PERSONNEL_ROLE_LABELS, PERSONNEL_ROLES } from "@/lib/itil/constants";
import type { SystemSettings } from "@/lib/settings";

type Level = ModuleLevel | "NONE";
const LEVELS: Level[] = ["NONE", "VIEW", "HANDLE", "ADMIN"];
const LEVEL_NAME: Record<Level, string> = { NONE: "Yetkisiz", VIEW: "Gör", HANDLE: "İşle", ADMIN: "Yönet" };
const TONE: Record<Level, string> = {
  NONE: "bg-muted/40 text-muted-foreground/70 hover:bg-muted",
  VIEW: "bg-sky-500/15 text-sky-700 hover:bg-sky-500/25 dark:text-sky-300",
  HANDLE: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300",
  ADMIN: "bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 dark:text-amber-300",
};
const SCOPE_SHORT: Record<ModuleScope, string> = { OWN: "Kendi", UNIT: "Alt çalışan", OFFICE: "Talep birimi", ALL: "Tümü" };
const OFFICER_COL = "OFFICER";
const OFFICER_MODULES = new Set<string>(Object.values(OFFICER_MODULE));
/** Sütun → yetki grubu adı: rol sütunu role:X, süreç yöneticisi sütunu officer:<modül>. */
const groupOf = (mod: AppModule, col: string) => (col === OFFICER_COL ? officerGrantName(mod) : `role:${col}`);
const same = (a: string, b: string) => a.trim().toLocaleLowerCase("tr-TR") === b.trim().toLocaleLowerCase("tr-TR");

export function AccessMatrix({
  grants: initial,
  issues,
  settings,
  people,
}: {
  grants: ModuleGrant[];
  issues: string[];
  settings: SystemSettings;
  people: { id: string; label: string; meta?: string }[];
}) {
  const [state, action, pending] = useActionState(saveModuleAclSettings, EMPTY_STATE);
  const [grants, setGrants] = useState<ModuleGrant[]>(initial);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);

  const find = (mod: AppModule, col: string) => grants.find((g) => g.module === mod && same(g.group, groupOf(mod, col)));
  const hasCell = (mod: AppModule, col: string) => col !== OFFICER_COL || OFFICER_MODULES.has(mod);
  const levelOf = (mod: AppModule, col: string): Level =>
    find(mod, col)?.level ?? (col === OFFICER_COL && hasCell(mod, col) ? "ADMIN" : "NONE");
  const scopesOf = (mod: AppModule, col: string): ModuleScope[] =>
    find(mod, col)?.scopes ?? (col === OFFICER_COL ? ["ALL"] : defaultScopes(col, mod));

  const write = (mod: AppModule, role: string, level: Level, scopes?: ModuleScope[]) =>
    setGrants((prev) => {
      const group = groupOf(mod, role);
      const old = prev.find((g) => g.module === mod && same(g.group, group));
      const rest = prev.filter((g) => !(g.module === mod && same(g.group, group)));
      // Süreç yöneticisi en az "Gör" düzeyindedir (kaydı olmayan hücre otomatik Yön sayılır).
      if (level === "NONE" && role === OFFICER_COL) return prev;
      if (level === "NONE") return rest;
      const next: ModuleGrant = { module: mod, group, level };
      const sc = scopes ?? old?.scopes;
      if (sc?.length) next.scopes = sc;
      return [...rest, next];
    });

  const applyLevel = (mod: AppModule, role: string, level: Level) => write(mod, role, level);
  const toggleScope = (mod: AppModule, role: string, scope: ModuleScope, on: boolean) => {
    if (!SCOPED_MODULES.has(mod)) return;
    const level = levelOf(mod, role);
    const current = scopesOf(mod, role);
    let next: ModuleScope[];
    if (!on) next = current.filter((s) => s !== scope);
    else if (scope === "ALL") next = ["ALL"];
    else next = [...current.filter((s) => s !== "ALL" && s !== scope), scope];
    if (!next.length) next = ["OWN"];
    write(mod, role, level === "NONE" ? "VIEW" : level, next);
  };
  const dropOn = (mod: AppModule, role: string, payload: string) => {
    const [kind, value] = payload.split(":");
    if (kind === "level") applyLevel(mod, role, value as Level);
    if (kind === "scope" && (MODULE_SCOPES as readonly string[]).includes(value)) toggleScope(mod, role, value as ModuleScope, true);
    setPicked(null);
  };
  const cycle = (mod: AppModule, role: string) => {
    const order = role === OFFICER_COL ? LEVELS.filter((l) => l !== "NONE") : LEVELS;
    applyLevel(mod, role, order[(order.indexOf(levelOf(mod, role)) + 1) % order.length]);
  };

  const chipCls = (key: string, tone: string) =>
    `inline-flex cursor-grab items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${picked === key ? "bg-primary text-primary-foreground" : tone}`;

  return (
    <div className="space-y-5">
      {issues.length ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p className="font-medium">Dikkat edilmesi gerekenler</p>
            <ul className="mt-1 list-disc ps-5 text-xs">
              {issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <form action={action} className="space-y-5">
        {grants.map((g, i) => (
          <span key={`${g.module}-${g.group}-${i}`} hidden>
            <input type="hidden" name="grantModule" value={g.module} />
            <input type="hidden" name="grantGroup" value={g.group} />
            <input type="hidden" name="grantLevel" value={g.level} />
            <input type="hidden" name="grantScopes" value={g.scopes?.join(",") ?? ""} />
          </span>
        ))}

        <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
          <span>Başlangıç için önerilen rol yetkilerini yükleyebilirsiniz (kaydedene kadar uygulanmaz; grup satırlarına dokunmaz).</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setGrants((prev) => [...prev.filter((g) => !g.group.startsWith("role:")), ...recommendedRoleGrants(SCOPED_MODULES)])
            }
          >
            Önerilen yetkileri yükle
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yetki matrisi</CardTitle>
            <CardDescription>
              Etiketi sürükleyip bir hücreye bırakın (ya da etikete, sonra hücreye tıklayın). Düzey tek seçilir, kapsam birden fazla olabilir; × ile kapsamı kaldırın. Hücredeki düzeye tıklarsanız sırayla değişir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground me-1 w-14 text-[11px] font-semibold uppercase">Düzey</span>
                {LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", `level:${level}`)}
                    onClick={() => setPicked((p) => (p === `level:${level}` ? null : `level:${level}`))}
                    className={chipCls(`level:${level}`, TONE[level])}
                  >
                    <GripVertical className="size-3 opacity-50" />
                    {LEVEL_NAME[level]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground me-1 w-14 text-[11px] font-semibold uppercase">Kapsam</span>
                {MODULE_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    draggable
                    title={MODULE_SCOPE_HINTS[scope]}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", `scope:${scope}`)}
                    onClick={() => setPicked((p) => (p === `scope:${scope}` ? null : `scope:${scope}`))}
                    className={chipCls(`scope:${scope}`, "bg-card hover:bg-accent")}
                  >
                    <GripVertical className="size-3 opacity-50" />
                    {MODULE_SCOPE_LABELS[scope]}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pe-3 font-medium">Modül</th>
                    {PERSONNEL_ROLES.map((role) => (
                      <th key={role} className="px-1 py-2 text-center font-medium">
                        {PERSONNEL_ROLE_LABELS[role]}
                      </th>
                    ))}
                    <th className="px-1 py-2 text-center font-medium">Süreç yöneticisi</th>
                  </tr>
                </thead>
                <tbody>
                  {ACL_MODULES.map((mod) => (
                    <tr key={mod} className="border-b align-top last:border-0">
                      <td className="py-1.5 pe-3 pt-2.5">{MODULE_LABELS[mod]}</td>
                      {[...PERSONNEL_ROLES, OFFICER_COL].map((role) => {
                        if (!hasCell(mod, role)) return <td key={role} className="text-muted-foreground/40 px-1 py-1 text-center">—</td>;
                        const locked = role === "SUPER_ADMIN";
                        const level: Level = locked ? "ADMIN" : levelOf(mod, role);
                        const scoped = SCOPED_MODULES.has(mod) && level !== "NONE";
                        const scopes = locked ? (["ALL"] as ModuleScope[]) : scopesOf(mod, role);
                        return (
                          <td key={role} className="px-1 py-1">
                            <div
                              onDragOver={(e) => !locked && e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (!locked) dropOn(mod, role, e.dataTransfer.getData("text/plain"));
                              }}
                              className={`space-y-1 rounded-md p-1 ${picked && !locked ? "bg-primary/5 ring-primary/40 ring-1" : ""}`}
                            >
                              <button
                                type="button"
                                disabled={locked}
                                onClick={() => (picked ? dropOn(mod, role, picked) : cycle(mod, role))}
                                title={LEVEL_NAME[level]}
                                className={`w-full rounded-md px-2 py-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${TONE[level]}`}
                              >
                                {LEVEL_NAME[level]}
                              </button>
                              {scoped ? (
                                <div className="flex flex-wrap justify-center gap-0.5">
                                  {scopes.map((scope) => (
                                    <span key={scope} title={MODULE_SCOPE_HINTS[scope]} className="bg-background inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px]">
                                      {SCOPE_SHORT[scope]}
                                      {!locked ? (
                                        <button type="button" aria-label="Kaldır" onClick={() => toggleScope(mod, role, scope, false)} className="opacity-50 hover:opacity-100">
                                          <X className="size-2.5" />
                                        </button>
                                      ) : null}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-xs">
              Kapsam kayıt süzmesi olan modüllerde gösterilir. Talep yönetiminde kimin hangi talebi göreceği “AD grupları” sekmesi ve talep birimine göre ayrıca belirlenir. Kapsamı değiştirmediğiniz hücreler eski varsayılan kuralla çalışmaya devam eder.
            </p>
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-xs">
          Not: Talep birimi (office:*), görev ataması (assigned:*) ve envanter grubu (GG_Envanter) yetkileri otomatik çalışır; burada değiştirilmez.
        </p>

        <div className="flex items-center justify-end gap-3">
          {state.message && !state.ok ? <span className="text-destructive text-xs">{state.message}</span> : null}
          <Button type="submit" disabled={pending}>
            Yetkileri kaydet
          </Button>
        </div>
      </form>

      <details>
        <summary className="bg-card hover:bg-accent cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium">
          Süreç yöneticileri <span className="text-muted-foreground font-normal">(atanan kişi o modülün yöneticisi olur)</span>
        </summary>
        <div className="mt-3">
          <OfficersForm settings={settings} people={people} />
        </div>
      </details>
    </div>
  );
}
