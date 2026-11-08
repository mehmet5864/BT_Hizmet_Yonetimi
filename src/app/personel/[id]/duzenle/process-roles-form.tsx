"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActionFeedback } from "@/lib/action-feedback";
import { savePersonProcessRoles } from "@/lib/actions/process-roles";
import { EMPTY_STATE } from "@/lib/actions/shared";
import { PROCESS_ROLE_LABELS, PROCESS_ROLES, type ProcessRole } from "@/lib/itil/process-roles";

export function ProcessRolesForm({
  personId,
  manual,
  fromAd,
}: {
  personId: string;
  /** Kişiye elle atanmış görevler. */
  manual: ProcessRole[];
  /** AD grup eşlemesinden gelen görevler (salt okunur). */
  fromAd: ProcessRole[];
}) {
  const [state, action, pending] = useActionState(savePersonProcessRoles, EMPTY_STATE);
  useActionFeedback(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ITIL süreç görevleri</CardTitle>
        <CardDescription>
          Elle atanan görevler burada işaretlenir. AD grubundan gelen görevler (kilitli) AD eşlemesine göre kendiliğinden eklenir ve kaldırılır. Görevin yetkisi Ayarlar → Yetki ve roller → Yetki matrisinde belirlenir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={personId} />
          {state.message && !state.ok ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {PROCESS_ROLES.map((role) => {
              const ad = fromAd.includes(role);
              return (
                <label key={role} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <input type="checkbox" name="processRole" value={role} defaultChecked={manual.includes(role)} className="size-4" />
                  <span className="flex-1">{PROCESS_ROLE_LABELS[role]}</span>
                  {ad ? <span className="rounded-full border bg-emerald-500/10 px-2 py-0.5 text-[10px]">AD grubundan</span> : null}
                </label>
              );
            })}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Görevleri kaydet
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
