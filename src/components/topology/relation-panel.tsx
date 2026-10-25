"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SearchCombobox } from "@/components/topology/search-combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteAssetRelation, saveAssetRelation } from "@/lib/actions/asset-relations";
import { EMPTY_STATE, type ActionState } from "@/lib/actions/shared";
import { RELATION_PROTOCOLS, RELATION_SHORT } from "@/lib/topology/labels";

export type RelationRow = {
  id: string;
  direction: "out" | "in";
  otherLabel: string;
  type: string;
  port: string | null;
  protocol: string | null;
  note: string | null;
};

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

export function RelationPanel({ assetId, assetLabel, rows }: { assetId: string; assetLabel: string; rows: RelationRow[] }) {
  const [saveState, saveAction, savePending] = useActionState(saveAssetRelation, EMPTY_STATE);
  const [delState, delAction, delPending] = useActionState(deleteAssetRelation, EMPTY_STATE);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bağlantılar ve portlar: {assetLabel}</CardTitle>
        <CardDescription>
          Bu varlığın hangi uygulama/veritabanı/sunucuya hangi portla eriştiğini kaydedin. Topolojide okun üzerinde “bağlanır · TCP/1433” gibi görünür. Bir uygulamanın hangi sunucuda çalıştığı için “Üzerinde çalışır” türünü kullanın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={saveAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input type="hidden" name="assetId" value={assetId} />
          <div className="space-y-1">
            <label htmlFor="rl-dir" className="text-xs font-medium">Yön</label>
            <select id="rl-dir" name="direction" defaultValue="out" className={selectClass}>
              <option value="out">Bu varlık → hedef</option>
              <option value="in">Kaynak → bu varlık</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="rl-type" className="text-xs font-medium">Bağlantı türü</label>
            <select id="rl-type" name="relationType" defaultValue="CONNECTED_TO" className={selectClass}>
              {Object.entries(RELATION_SHORT).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 lg:col-span-2">
            <label htmlFor="rl-other" className="text-xs font-medium">Diğer varlık (arayın)</label>
            <SearchCombobox id="rl-other" name="otherId" kind="varlik" placeholder="Ad, IP veya seri no…" />
          </div>
          <div className="space-y-1">
            <label htmlFor="rl-port" className="text-xs font-medium">Port</label>
            <Input id="rl-port" name="port" placeholder="1433 veya 80,443" maxLength={40} />
          </div>
          <div className="space-y-1">
            <label htmlFor="rl-proto" className="text-xs font-medium">Protokol</label>
            <select id="rl-proto" name="protocol" defaultValue="" className={selectClass}>
              <option value="">—</option>
              {RELATION_PROTOCOLS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-5">
            <label htmlFor="rl-note" className="text-xs font-medium">Not</label>
            <Input id="rl-note" name="note" maxLength={300} placeholder="Örn. uygulama servis hesabı ile bağlanır" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={savePending} className="w-full">
              {savePending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Kaydet
            </Button>
          </div>
        </form>
        <Status state={saveState} />

        {rows.length ? (
          <ul className="divide-y rounded-md border text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span>
                  {r.direction === "out" ? "→ " : "← "}
                  <span className="font-medium">{r.otherLabel}</span>
                  <span className="text-muted-foreground">
                    {" "}· {RELATION_SHORT[r.type] ?? r.type}
                    {r.protocol || r.port ? ` · ${[r.protocol, r.port].filter(Boolean).join("/")}` : ""}
                    {r.note ? ` · ${r.note}` : ""}
                  </span>
                </span>
                <form action={delAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" size="sm" variant="ghost" disabled={delPending} aria-label="Bağlantıyı kaldır">
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Bu varlık için kayıtlı bağlantı yok.</p>
        )}
        <Status state={delState} />
      </CardContent>
    </Card>
  );
}
