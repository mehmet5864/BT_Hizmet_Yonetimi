"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveRequestGroupSettings } from "@/lib/actions/settings";
import { EMPTY_STATE } from "@/lib/actions/shared";

export type GroupRow = { name: string; label: string; types: string[]; value: string };

export function RequestGroupsForm({ offices, adGroups, adNote }: { offices: { office: string; label: string; rows: GroupRow[] }[]; adGroups: string[]; adNote: string }) {
  const [state, action, pending] = useActionState(saveRequestGroupSettings, EMPTY_STATE);
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);

  return (
    <form action={action} className="space-y-6">
      <datalist id="ad-group-list">
        {adGroups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <p className="bg-muted/50 rounded-md border p-3 text-xs">
        {adNote} Kutuya tıklayınca liste açılır; yazdıkça süzülür. Seçilen grubun üyeleri o kategorideki talepleri görür ve işler.
      </p>
      {state.message ? (
        <Alert variant={state.ok ? "default" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      {offices.map((o) => (
        <section key={o.office} className="space-y-2">
          <h2 className="text-sm font-semibold">{o.label}</h2>
          <div className="divide-y rounded-lg border">
            {o.rows.map((r) => (
              <div key={r.name} className="grid items-center gap-2 p-3 sm:grid-cols-[1fr_260px]">
                <div>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-muted-foreground line-clamp-2 text-xs">{r.types.join(" · ")}</p>
                </div>
                <Input name={r.name} list="ad-group-list" defaultValue={r.value} maxLength={80} placeholder="AD grubu seçin veya yazın (boş = yalnızca birim kuyruğu)" autoComplete="off" />
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
