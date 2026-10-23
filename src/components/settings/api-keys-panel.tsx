"use client";

import { useActionState, useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, Plus } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { createApiKey, revokeApiKey, type ApiKeyRow } from "@/lib/actions/api-keys";
import { EMPTY_STATE, type ActionState } from "@/lib/actions/shared";
import { API_SCOPE_LABELS, API_SCOPES } from "@/lib/api/scopes";
import { toast } from "sonner";

function FormStatus({ state }: { state: ActionState }) {
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);
  if (!state.message) return null;
  return (
    <Alert variant={state.ok ? "default" : "destructive"}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

export function ApiKeysPanel({
  keys,
  people,
}: {
  keys: ApiKeyRow[];
  people: { id: string; label: string }[];
}) {
  const [createState, createAction, createPending] = useActionState(createApiKey, EMPTY_STATE);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeApiKey, EMPTY_STATE);
  const [ownerId, setOwnerId] = useState("");
  const [selected, setSelected] = useState<string[]>(["talepler:read", "envanter:read"]);

  function toggle(scope: string) {
    if (scope.endsWith(":write") && !ownerId) return;
    setSelected((prev) => (prev.includes(scope) ? prev.filter((item) => item !== scope) : [...prev, scope]));
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" />
            Yeni API anahtarı
          </CardTitle>
          <CardDescription>
            Dış sistemler Bearer veya X-Api-Key ile bağlanır. Servis anahtarı yalnızca okur. Yazma (talep açma,
            durum güncelleme) için personel bağlayın; kapsam o kişinin ACL’i ile kesişir. Anahtar bir kez gösterilir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="space-y-5">
            <FormStatus state={createState} />
            {createState.ok && createState.token ? (
              <Alert>
                <AlertDescription className="space-y-2">
                  <p className="font-medium">Anahtarı kopyalayın — tekrar gösterilmez.</p>
                  <code className="bg-muted block break-all rounded-md px-2 py-1.5 text-xs">{createState.token}</code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(createState.token ?? "");
                      toast.success("Anahtar panoya kopyalandı.");
                    }}
                  >
                    <Copy className="size-3.5" />
                    Kopyala
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldShell id="api-name" label="Ad" required hint="Örn. SIEM entegrasyonu, Servis masası botu.">
                <Input id="api-name" name="name" required placeholder="SIEM entegrasyonu" />
              </FieldShell>
              <FieldShell
                id="api-owner"
                label="Bağlı personel"
                hint="Boş: salt okunur servis anahtarı. Yazma için zorunlu; görünürlük ve işlem yetkisi o kişiye iner."
              >
                <select
                  id="api-owner"
                  name="ownerId"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={ownerId}
                  onChange={(event) => {
                    const next = event.target.value;
                    setOwnerId(next);
                    if (!next) {
                      setSelected((prev) => prev.filter((scope) => !scope.endsWith(":write")));
                    }
                  }}
                >
                  <option value="">Servis anahtarı (yalnızca okuma)</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.label}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell id="api-days" label="Geçerlilik (gün)" hint="Varsayılan 90. Yazma anahtarında en fazla 365. 0 yalnızca okuma için süresiz.">
                <Input id="api-days" name="expiresDays" type="number" min={0} max={730} placeholder="90" />
              </FieldShell>
              <FieldShell
                id="api-cidr"
                label="İzinli IP / CIDR"
                hint="Boş: her adres. Satır veya virgülle ayırın. Örn. 10.0.0.0/8"
              >
                <Input id="api-cidr" name="allowedCidrs" placeholder="10.0.0.0/8, 192.168.1.20" />
              </FieldShell>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Kapsamlar</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {API_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input type="hidden" name={selected.includes(scope) ? "scope" : undefined} value={scope} />
                    <Checkbox
                      checked={selected.includes(scope)}
                      disabled={scope.endsWith(":write") && !ownerId}
                      onCheckedChange={() => toggle(scope)}
                    />
                    <span>
                      {API_SCOPE_LABELS[scope]}
                      <span className="text-muted-foreground ml-1 font-mono text-xs">{scope}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={createPending}>
                {createPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Anahtar üret
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kayıtlı anahtarlar</CardTitle>
          <CardDescription>İptal edilen anahtarlar hemen geçersiz olur.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormStatus state={revokeState} />
          {keys.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide">
                    <th className="px-2 py-2 font-medium">Ad</th>
                    <th className="px-2 py-2 font-medium">Önek</th>
                    <th className="px-2 py-2 font-medium">Kapsam</th>
                    <th className="px-2 py-2 font-medium">Sahip</th>
                    <th className="px-2 py-2 font-medium">IP</th>
                    <th className="px-2 py-2 font-medium">Durum</th>
                    <th className="px-2 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {keys.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{row.name}</td>
                      <td className="px-2 py-2 font-mono text-xs">{row.prefix}</td>
                      <td className="text-muted-foreground px-2 py-2 text-xs">{row.scopes.join(", ") || "—"}</td>
                      <td className="px-2 py-2">{row.ownerName ?? "Servis (okuma)"}</td>
                      <td className="text-muted-foreground px-2 py-2 font-mono text-xs">
                        {row.allowedCidrs.length ? row.allowedCidrs.join(", ") : "—"}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {row.revokedAt ? "İptal" : "Aktif"}
                        {row.lastUsedAt ? (
                          <p className="text-muted-foreground">Son: {new Date(row.lastUsedAt).toLocaleString("tr-TR")}</p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {!row.revokedAt ? (
                          <form action={revokeAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <Button type="submit" variant="ghost" size="sm" disabled={revokePending}>
                              İptal et
                            </Button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Henüz API anahtarı yok.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
