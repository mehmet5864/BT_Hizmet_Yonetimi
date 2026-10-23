"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSecurity } from "@/lib/actions/security";
import { EMPTY_STATE } from "@/lib/actions/shared";
import type { SecurityPolicy } from "@/lib/security/policy";

export function SecurityForm({ policy }: { policy: SecurityPolicy }) {
  const [state, action, pending] = useActionState(saveSecurity, EMPTY_STATE);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Parola ve oturum politikası</CardTitle>
        <CardDescription>
          Parola kuralları yeni parolalarda, hesap kilidi ve oturum süresi yeni girişlerde geçerli olur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="minLength">En az parola uzunluğu</Label>
            <Input id="minLength" name="minLength" type="number" min={6} max={64} defaultValue={policy.minLength} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sessionHours">Oturum süresi (saat)</Label>
            <Input id="sessionHours" name="sessionHours" type="number" min={1} max={168} defaultValue={policy.sessionHours} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxFailed">Kilit için hatalı giriş sayısı (0 = kapalı)</Label>
            <Input id="maxFailed" name="maxFailed" type="number" min={0} max={20} defaultValue={policy.maxFailed} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lockMinutes">Kilit süresi (dakika)</Label>
            <Input id="lockMinutes" name="lockMinutes" type="number" min={1} max={1440} defaultValue={policy.lockMinutes} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="requireMix" defaultChecked={policy.requireMix} className="size-4" />
            Parolada büyük harf, küçük harf ve rakam zorunlu olsun
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Kaydet
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
