"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteServiceAccessRule, saveServiceAccessRule } from "@/lib/actions/service-access";
import { EMPTY_STATE, type ActionState } from "@/lib/actions/shared";
import { AUDIENCE_SUGGESTIONS, formatPorts } from "@/lib/topology/labels";
import { AUDIENCE_KINDS, AUDIENCE_KIND_COLORS, AUDIENCE_KIND_LABELS } from "@/lib/topology/types";

export type RuleRow = { id: string; audience: string; kind: string; ports: string; note: string | null };

function Status({ state }: { state: ActionState }) {
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);
  if (!state.message || state.ok) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

const selectClass = "border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function AccessRulePanel({ serviceId, serviceName, rows }: { serviceId: string; serviceName: string; rows: RuleRow[] }) {
  const [saveState, saveAction, savePending] = useActionState(saveServiceAccessRule, EMPTY_STATE);
  const [delState, delAction, delPending] = useActionState(deleteServiceAccessRule, EMPTY_STATE);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Erişim kuralları: {serviceName}</CardTitle>
        <CardDescription>
          Hizmete hangi kullanıcı grubunun hangi port ve protokolle eriştiğini yazın. Örn. “Tüm istemciler” → 443; “Administrator” → HTTPS 443, SSH 22, RDP 3389. Aynı grup ve türle tekrar kaydederseniz kural güncellenir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={saveAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input type="hidden" name="serviceId" value={serviceId} />
          <div className="space-y-1 lg:col-span-2">
            <label htmlFor="ar-aud" className="text-xs font-medium">Kullanıcı grubu</label>
            <Input id="ar-aud" name="audience" list="ar-aud-list" maxLength={80} placeholder="Tüm istemciler" />
            <datalist id="ar-aud-list">
              {AUDIENCE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <label htmlFor="ar-kind" className="text-xs font-medium">Grup türü</label>
            <select id="ar-kind" name="kind" defaultValue="CLIENT" className={selectClass}>
              {AUDIENCE_KINDS.map((k) => (
                <option key={k} value={k}>{AUDIENCE_KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 lg:col-span-2">
            <label htmlFor="ar-ports" className="text-xs font-medium">Portlar ve protokoller</label>
            <Input id="ar-ports" name="ports" maxLength={120} placeholder="443  veya  HTTPS 443, SSH 22, RDP 3389" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={savePending} className="w-full">
              {savePending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Kaydet
            </Button>
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-6">
            <label htmlFor="ar-note" className="text-xs font-medium">Not</label>
            <Input id="ar-note" name="note" maxLength={200} placeholder="İsteğe bağlı: VPN üzerinden, yalnızca mesai saatinde…" />
          </div>
        </form>
        <Status state={saveState} />
        {rows.length ? (
          <ul className="divide-y rounded-md border text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: AUDIENCE_KIND_COLORS[r.kind as keyof typeof AUDIENCE_KIND_COLORS] ?? "#64748b" }} />
                  <span className="font-medium">{r.audience}</span>
                  <span className="text-muted-foreground"> → {formatPorts(r.ports)}{r.note ? ` · ${r.note}` : ""}</span>
                </span>
                <form action={delAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" size="sm" variant="ghost" disabled={delPending} aria-label="Kuralı kaldır">
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Bu hizmet için erişim kuralı yok.</p>
        )}
        <Status state={delState} />
      </CardContent>
    </Card>
  );
}
