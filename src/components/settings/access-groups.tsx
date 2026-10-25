"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveAccessMappings } from "@/lib/actions/settings";
import { EMPTY_STATE } from "@/lib/actions/shared";
import type { AdRoleMap } from "@/lib/auth/rbac";
import { PERSONNEL_ROLE_LABELS, PERSONNEL_ROLES, type PersonnelRole } from "@/lib/itil/constants";

export type GroupRow = { name: string; label: string; types: string[]; value: string };

const same = (a: string, b: string) => a.trim().toLocaleLowerCase("tr-TR") === b.trim().toLocaleLowerCase("tr-TR");

function Chip({ group, onRemove, active }: { group: string; onRemove?: () => void; active?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${active ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      {group}
      {onRemove ? (
        <button type="button" aria-label="Kaldır" onClick={onRemove} className="opacity-60 hover:opacity-100">
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function AccessGroups({
  adGroups,
  adNote,
  roleMaps,
  defaultRole,
  offices,
}: {
  adGroups: string[];
  adNote: string;
  roleMaps: AdRoleMap[];
  defaultRole: string;
  offices: { office: string; label: string; rows: GroupRow[] }[];
}) {
  const [state, action, pending] = useActionState(saveAccessMappings, EMPTY_STATE);
  const [maps, setMaps] = useState<AdRoleMap[]>(roleMaps);
  const [cats, setCats] = useState<Record<string, string>>(
    () => Object.fromEntries(offices.flatMap((o) => o.rows.map((r): [string, string] => [r.name, r.value]))) as Record<string, string>,
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [custom, setCustom] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const [defRole, setDefRole] = useState(defaultRole);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);

  const all = useMemo(() => {
    const set = new Set<string>([...adGroups, ...custom, ...maps.map((m) => m.group), ...(Object.values(cats) as string[]).filter(Boolean)]);
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [adGroups, custom, maps, cats]);
  const shown = all.filter((g) => !filter || g.toLocaleLowerCase("tr-TR").includes(filter.toLocaleLowerCase("tr-TR")));
  const used = (g: string) => maps.some((m) => same(m.group, g)) || (Object.values(cats) as string[]).some((v) => same(v, g));

  const dropRole = (role: PersonnelRole, group: string) => {
    const g = group.trim();
    if (!g) return;
    setMaps((prev) => [...prev.filter((m) => !same(m.group, g)), { group: g, role }]);
    setPicked(null);
  };
  const dropCat = (name: string, group: string) => {
    if (!group.trim()) return;
    setCats((prev) => ({ ...prev, [name]: group.trim() }));
    setPicked(null);
  };
  const dragProps = (g: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => e.dataTransfer.setData("text/plain", g),
  });

  return (
    <form action={action} className="space-y-5">
      {maps.map((m, i) => (
        <span key={`${m.group}-${i}`} hidden>
          <input type="hidden" name="mapGroup" value={m.group} />
          <input type="hidden" name="mapRole" value={m.role} />
        </span>
      ))}
      <input type="hidden" name="defaultRole" value={defRole} />
      {Object.entries(cats).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AD güvenlik grupları</CardTitle>
          <CardDescription>
            {adNote} Talep grupları (ör. fw_admins) rol eşlemesine eklenmez: üyeler Kullanıcı rolüyle kendi taleplerini ve kategorisinin kuyruğunu görür. Grubu sürükleyip bir role veya talep kategorisine bırakın (ya da gruba, sonra hedefe tıklayın).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Gruplarda ara…" className="h-8 max-w-52" />
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Listede yoksa grup adı yazın" className="h-8 max-w-64" maxLength={80} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const g = text.trim();
                if (!g) return;
                if (!custom.some((c) => same(c, g))) setCustom((p) => [...p, g]);
                setPicked(g);
                setText("");
              }}
            >
              Ekle
            </Button>
          </div>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {shown.length === 0 ? <p className="text-muted-foreground text-xs">Grup bulunamadı; adı yazıp Ekle’ye basın.</p> : null}
            {shown.map((g) => (
              <button
                key={g}
                type="button"
                {...dragProps(g)}
                onClick={() => setPicked((p) => (p === g ? null : g))}
                className={`inline-flex cursor-grab items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${picked === g ? "bg-primary text-primary-foreground" : used(g) ? "bg-emerald-500/10 hover:bg-emerald-500/20" : "bg-card hover:bg-accent"}`}
              >
                <GripVertical className="size-3 opacity-50" />
                {g}
              </button>
            ))}
          </div>
          
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rol eşlemesi</CardTitle>
          <CardDescription>Giriş yapan kişinin rolünü belirler.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PERSONNEL_ROLES.map((role) => (
              <div
                key={role}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  dropRole(role, e.dataTransfer.getData("text/plain"));
                }}
                onClick={() => picked && dropRole(role, picked)}
                className={`min-h-20 space-y-2 rounded-lg border border-dashed p-3 ${picked ? "border-primary/60 bg-primary/5 cursor-copy" : ""}`}
              >
                <p className="text-sm font-semibold">{PERSONNEL_ROLE_LABELS[role]}</p>
                <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {maps.filter((m) => m.role === role).map((m) => (
                    <Chip key={m.group} group={m.group} onRemove={() => setMaps((p) => p.filter((x) => x !== m))} />
                  ))}
                  {!maps.some((m) => m.role === role) ? <span className="text-muted-foreground text-[11px]">Grup bırakın</span> : null}
                </div>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            Hiçbir gruba uymayan AD kullanıcısı:
            <select value={defRole} onChange={(e) => setDefRole(e.target.value)} className="border-input h-8 rounded-md border bg-transparent px-2 text-xs">
              {PERSONNEL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {PERSONNEL_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Talep kategorileri</CardTitle>
          <CardDescription>Gruba üye olanlar o kategorideki talepleri görür ve işler.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {offices.map((o) => (
            <details key={o.office} className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                {o.label} <span className="text-muted-foreground text-xs font-normal">({o.rows.filter((r) => cats[r.name]).length}/{o.rows.length} eşlendi)</span>
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {o.rows.map((r) => {
                  const value = cats[r.name] ?? "";
                  return (
                    <div
                      key={r.name}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        dropCat(r.name, e.dataTransfer.getData("text/plain"));
                      }}
                      onClick={() => picked && dropCat(r.name, picked)}
                      className={`flex items-center justify-between gap-2 rounded-lg border border-dashed p-2.5 ${picked ? "border-primary/60 bg-primary/5 cursor-copy" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.label}</p>
                        
                      </div>
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        {value ? (
                          <Chip group={value} onRemove={() => setCats((p) => ({ ...p, [r.name]: "" }))} />
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Grup bırakın</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      {state.message && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          Eşlemeleri kaydet
        </Button>
      </div>
    </form>
  );
}
