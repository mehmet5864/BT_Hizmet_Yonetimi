"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { saveLicense } from "@/lib/actions/license";
import { EMPTY_STATE } from "@/lib/actions/shared";

export function LicenseForm() {
  const [state, action, pending] = useActionState(saveLicense, EMPTY_STATE);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lisans anahtarı yükle</CardTitle>
        <CardDescription>
          Satıcıdan aldığınız anahtarı (BTHY1… ile başlar) yapıştırın veya .key / .txt dosyası seçin. İmza çevrimdışı doğrulanır; internet gerekmez.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          {state.message && !state.ok ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <Textarea name="license" rows={5} placeholder="BTHY1.eyJ2IjoxLC4uLg.…" className="font-mono text-xs" />
          <input type="file" name="file" accept=".key,.txt,.lic" className="block text-sm" />
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Lisansı kaydet
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
