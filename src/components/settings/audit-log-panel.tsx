import Link from "next/link";

import { EmptyState } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ASSET_TYPE_DEFS } from "@/lib/inventory/asset-types";
import type { AssetTypeKey } from "@/lib/inventory/constants";
import { formatDateTime } from "@/lib/inventory/format";
import { parseActivityChanges } from "@/lib/safe-json";

export const ACTION_LABELS: Record<string, string> = {
  CREATE: "Oluşturuldu",
  UPDATE: "Güncellendi",
  DELETE: "Silindi",
  RELEASE: "Zimmet boşa çıktı",
  APPROVE: "Onaylandı",
  REJECT: "Reddedildi",
};

const ACTION_STYLES: Record<string, string> = {
  CREATE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  UPDATE: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  DELETE: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

export const ENTITY_LABELS: Record<string, string> = {
  Asset: "Envanter",
  ServiceRequest: "Talep",
  ChangeRecord: "Değişiklik",
  PatchRecord: "Yama",
  AppConfig: "Konfigürasyon",
  Vulnerability: "Zafiyet",
  SlaTicket: "SLA",
  Incident: "Olay",
  Problem: "Problem",
  Person: "Personel",
};

export type AuditLogItem = {
  id: string;
  action: string;
  note: string | null;
  actor: string;
  createdAt: string;
  changes: string | null;
  entityType?: string | null;
  asset: { id: string; name: string | null; stockNo: string | null; assetType: string } | null;
};

export function AuditLogPanel({
  logs,
  totals,
}: {
  logs: AuditLogItem[];
  totals: { total: number; created: number; updated: number; deleted: number };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit log</CardTitle>
        <CardDescription>
          Oluşturma, güncelleme ve silme işlemlerinin denetim izi. {totals.total} kayıt
          {totals.created || totals.updated || totals.deleted
            ? ` · ${totals.created} yeni, ${totals.updated} güncelleme, ${totals.deleted} silme`
            : ""}
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length ? (
          <div className="divide-y rounded-lg border">
            {logs.map((log) => {
              const changes = parseActivityChanges(log.changes);
              const typeDef = log.asset
                ? ASSET_TYPE_DEFS[log.asset.assetType as AssetTypeKey]
                : undefined;
              const entity = log.entityType ? ENTITY_LABELS[log.entityType] : undefined;

              return (
                <div key={log.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:gap-4">
                  <Badge variant="outline" className={`shrink-0 ${ACTION_STYLES[log.action] ?? ""}`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </Badge>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm">
                      {log.asset ? (
                        <Link href={`/envanter/${log.asset.id}`} className="font-medium hover:underline">
                          {log.asset.name ?? log.asset.stockNo ?? "Kayıt"}
                        </Link>
                      ) : (
                        <span className="font-medium">{entity ?? "Kayıt"}</span>
                      )}
                      {typeDef ? <span className="text-muted-foreground"> · {typeDef.label}</span> : null}
                    </p>
                    {log.note ? <p className="text-muted-foreground text-xs">{log.note}</p> : null}
                    {changes.length ? (
                      <ul className="text-muted-foreground space-y-0.5 text-xs">
                        {changes.map((change) => (
                          <li key={change.label}>
                            {change.label}: <span className="line-through">{change.from ?? "boş"}</span> →{" "}
                            <span className="text-foreground">{change.to ?? "boş"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatDateTime(log.createdAt)} · {log.actor}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Henüz audit kaydı yok"
            description="Kayıt eklendikçe ve güncellendikçe işlemler burada listelenir."
          />
        )}
      </CardContent>
    </Card>
  );
}
