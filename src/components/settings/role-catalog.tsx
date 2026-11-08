"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { saveRoleBindings, saveTeamRouting } from "@/lib/actions/access";
import { EMPTY_STATE } from "@/lib/actions/shared";

export type CatalogRole = {
  key: string;
  kind: "system" | "desk" | "team" | "process";
  label: string;
  category: string;
  description: string;
  adHint?: string;
  bindable: boolean;
  capabilities: string[];
};
export type RoleBinding = { groups: string[]; people: string[] };
export type TeamType = { key: string; label: string; group: string };

type Props = {
  roles: CatalogRole[];
  categories: string[];
  bindings: Record<string, RoleBinding>;
  people: { id: string; label: string; locked: boolean }[];
  adGroups: string[];
  adNote: string;
  routing: Record<string, string>;
  types: TeamType[];
  issues: string[];
};

function useToast(state: { ok: boolean; message?: string; stamp?: number }) {
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);
}

export function RoleCatalog({ roles, categories, bindings, people, adGroups, adNote, routing, types, issues }: Props) {
  const [selected, setSelected] = useState(roles[0]?.key ?? "");
  const role = roles.find((r) => r.key === selected) ?? roles[0];
  return (
    <div className="flex flex-col gap-3">
      {issues.length > 0 && (
        <ul className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          {issues.map((i) => (
            <li key={i}>• {i}</li>
          ))}
        </ul>
      )}
      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <nav className="bg-card flex max-h-[70vh] flex-col gap-3 overflow-auto rounded-xl border p-3">
          {categories.map((cat) => (
            <div key={cat}>
              <div className="text-muted-foreground mb-1 text-[11px] font-semibold uppercase tracking-wide">{cat}</div>
              <ul className="flex flex-col gap-0.5">
                {roles
                  .filter((r) => r.category === cat)
                  .map((r) => {
                    const b = bindings[r.key];
                    const n = r.kind === "team" ? Object.values(routing).filter(Boolean).length : (b?.groups.length ?? 0) + (b?.people.length ?? 0);
                    return (
                      <li key={r.key}>
                        <button
                          type="button"
                          onClick={() => setSelected(r.key)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${r.key === role?.key ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                        >
                          <span className="truncate">{r.label}</span>
                          {r.bindable && n > 0 ? <span className="rounded-full bg-black/10 px-1.5 text-[11px] dark:bg-white/15">{n}</span> : null}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>
        {role && (
          <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
            <header>
              <h2 className="text-lg font-semibold">{role.label}</h2>
              {role.description && <p className="text-muted-foreground mt-1 text-sm">{role.description}</p>}
              {role.capabilities.length > 0 && (
                <ul className="text-muted-foreground mt-2 list-disc pl-5 text-xs">
                  {role.capabilities.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </header>
            {role.kind === "team" ? (
              <TeamRouting key="team" types={types} routing={routing} adGroups={adGroups} />
            ) : role.bindable ? (
              <Bindings key={role.key} role={role} initial={bindings[role.key] ?? { groups: [], people: [] }} people={people} adGroups={adGroups} adNote={adNote} />
            ) : (
              <p className="text-muted-foreground text-sm">Bu rol gruba ya da kişiye bağlanmaz.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Bindings({ role, initial, people, adGroups, adNote }: { role: CatalogRole; initial: RoleBinding; people: Props["people"]; adGroups: string[]; adNote: string }) {
  const [groups, setGroups] = useState(initial.groups);
  const [ids, setIds] = useState(initial.people);
  const [groupText, setGroupText] = useState("");
  const [state, action, pending] = useActionState(saveRoleBindings, EMPTY_STATE);
  useToast(state);
  const labels = useMemo(() => new Map(people.map((p) => [p.id, p.label])), [people]);
  const addGroup = () => {
    const g = groupText.trim();
    if (g && !groups.some((x) => x.toLocaleLowerCase("tr") === g.toLocaleLowerCase("tr"))) setGroups([...groups, g]);
    setGroupText("");
  };
  const listId = `ad-${role.key}`;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="role" value={role.key} />
      <input type="hidden" name="groups" value={JSON.stringify(groups)} />
      <input type="hidden" name="people" value={JSON.stringify(ids)} />
      <div>
        <div className="mb-1 text-sm font-medium">AD grupları</div>
        <div className="flex flex-wrap gap-1.5">
          {groups.length === 0 && <span className="text-muted-foreground text-xs">Bağlı grup yok.</span>}
          {groups.map((g) => (
            <Chip key={g} text={g} onRemove={() => setGroups(groups.filter((x) => x !== g))} />
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            list={listId}
            value={groupText}
            onChange={(e) => setGroupText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGroup();
              }
            }}
            placeholder={role.adHint ? `ör. ${role.adHint}` : "AD grup adı"}
            className="bg-background min-w-0 flex-1 rounded border px-2 py-1.5 text-sm"
          />
          <datalist id={listId}>
            {adGroups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <Button type="button" size="sm" variant="outline" onClick={addGroup}>
            Ekle
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">{adNote}</p>
      </div>
      <div>
        <div className="mb-1 text-sm font-medium">Kişiler <span className="text-muted-foreground font-normal">(gruptan bağımsız, tek tek)</span></div>
        <div className="flex flex-wrap gap-1.5">
          {ids.length === 0 && <span className="text-muted-foreground text-xs">Elle eklenmiş kişi yok.</span>}
          {ids.map((id) => (
            <Chip key={id} text={labels.get(id) ?? id} onRemove={() => setIds(ids.filter((x) => x !== id))} />
          ))}
        </div>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value && !ids.includes(e.target.value)) setIds([...ids, e.target.value]);
          }}
          className="bg-background mt-2 w-full rounded border px-2 py-1.5 text-sm"
        >
          <option value="">Kişi ekle…</option>
          {people
            .filter((p) => !p.locked && !ids.includes(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
        </select>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

function TeamRouting({ types, routing, adGroups }: { types: TeamType[]; routing: Record<string, string>; adGroups: string[] }) {
  const [map, setMap] = useState<Record<string, string>>(routing);
  const [state, action, pending] = useActionState(saveTeamRouting, EMPTY_STATE);
  useToast(state);
  const groups = useMemo(() => [...new Set(types.map((t) => t.group))], [types]);
  const setCategory = (g: string, value: string) => {
    const next = { ...map };
    for (const t of types) if (t.group === g) next[t.key] = value;
    setMap(next);
  };
  const common = (g: string) => {
    const vals = new Set(types.filter((t) => t.group === g).map((t) => map[t.key] ?? ""));
    return vals.size === 1 ? [...vals][0] : "";
  };
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="routing" value={JSON.stringify(map)} />
      <datalist id="ad-team">
        {adGroups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <p className="text-muted-foreground text-xs">Her talep kategorisi için eskalasyonun gideceği AD grubunu yazın. Gerekirse kategoriyi açıp tek tek talep türünü farklı bir gruba yönlendirin (ör. NAC istisna).</p>
      {groups.map((g) => (
        <details key={g} className="rounded-lg border p-2">
          <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
            <span className="min-w-40 font-medium">{g}</span>
            <input
              list="ad-team"
              value={common(g)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setCategory(g, e.target.value)}
              placeholder="(türlere göre farklı)"
              className="bg-background min-w-0 flex-1 rounded border px-2 py-1 text-sm"
            />
          </summary>
          <div className="mt-2 flex flex-col gap-1.5 pl-2">
            {types
              .filter((t) => t.group === g)
              .map((t) => (
                <label key={t.key} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="min-w-48">{t.label}</span>
                  <input list="ad-team" value={map[t.key] ?? ""} onChange={(e) => setMap({ ...map, [t.key]: e.target.value })} className="bg-background min-w-0 flex-1 rounded border px-2 py-1" />
                </label>
              ))}
          </div>
        </details>
      ))}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

function Chip({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <span className="bg-secondary inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs">
      {text}
      <button type="button" onClick={onRemove} aria-label="Kaldır" className="hover:bg-destructive/20 rounded-full px-1.5">
        ×
      </button>
    </span>
  );
}
