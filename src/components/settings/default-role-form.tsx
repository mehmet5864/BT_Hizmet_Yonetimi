"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { saveDefaultRole } from "@/lib/actions/access";
import { EMPTY_STATE } from "@/lib/actions/shared";
import { PERSONNEL_ROLE_LABELS, type PersonnelRole } from "@/lib/itil/constants";

const CHOICES = ["USER", "UNIT_MANAGER", "SYSTEM_ADMIN"] as const;

export function DefaultRoleForm({ value }: { value: string }) {
  const [state, action, pending] = useActionState(saveDefaultRole, EMPTY_STATE);
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);
  return (
    <form action={action} className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm">
      <select name="defaultRole" defaultValue={CHOICES.includes(value as (typeof CHOICES)[number]) ? value : "USER"} className="bg-background rounded border px-2 py-1.5">
        {CHOICES.map((r) => (
          <option key={r} value={r}>{PERSONNEL_ROLE_LABELS[r as PersonnelRole]}</option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={pending}>Kaydet</Button>
      <span className="text-muted-foreground text-xs">AD ile ilk girişte hiçbir yetki kaydına uymayan kişi bu rolü alır.</span>
    </form>
  );
}
