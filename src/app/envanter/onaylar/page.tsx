import Link from "next/link";
import { redirect } from "next/navigation";

import { InventoryApprovalActions } from "@/components/inventory-approval-actions";
import { ListFilters } from "@/components/list-filters";
import { StatusBadge } from "@/components/itil/status-badge";
import { CheckCircle2, Clock, Layers, XCircle } from "lucide-react";

import { ModuleHero, WidgetRow } from "@/components/dashboard/module-widgets";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { EmptyState } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { getInventoryAccess } from "@/lib/auth/inventory";
import { ASSET_TYPE_DEFS } from "@/lib/inventory/asset-types";
import { assetDisplayName, formatDateTime } from "@/lib/inventory/format";
import type { AssetTypeKey } from "@/lib/inventory/constants";
import { prisma } from "@/lib/prisma";
import { mergeWhere, param, searchOr } from "@/lib/search-params";

export const dynamic = "force-dynamic";

const ACTION_LABELS = { CREATE: "Ekleme", DELETE: "Silme" } as const;
const STATUS_LABELS = { PENDING: "Onay bekliyor", APPROVED: "Onaylandı", REJECTED: "Reddedildi" } as const;

export default async function InventoryApprovalsPage({ searchParams }: PageProps<"/envanter/onaylar">) {
  const access = await getInventoryAccess();
  if (!access?.canPropose) redirect("/yetkisiz");
  const params = await searchParams;
  const query = param(params, "q");
  const status = param(params, "durum");
  const action = param(params, "islem");

  const rows = await prisma.inventoryApproval.findMany({
    where: mergeWhere(
      access.canApprove ? {} : { requestedById: access.viewer.id },
      status ? { status } : {},
      action ? { action } : {},
      searchOr(query, ["reason", "reviewNote", "assetType", "requestedBy.fullName", "asset.name", "asset.stockNo"]),
    ) as never,
    include: {
      requestedBy: { select: { fullName: true } },
      reviewedBy: { select: { fullName: true } },
      asset: { select: { id: true, name: true, stockNo: true, assetType: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const scope = access.canApprove ? {} : { requestedById: access.viewer.id };
  const statusRows = await prisma.inventoryApproval.groupBy({ by: ["status"], where: scope as never, _count: { _all: true } });
  const countOf = (value: string) => statusRows.find((item) => item.status === value)?._count._all ?? 0;
  const totalAll = statusRows.reduce((sum, item) => sum + item._count._all, 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Envanter onayları"
        description={
          access.canApprove
            ? "Ekleme ve silme isteklerini onaylayın veya reddedin. Onaylanan işlem hemen uygulanır."
            : "Gönderdiğiniz ekleme ve silme isteklerinin durumu."
        }
      />
      <WidgetRow>
        <StatWidget icon={<Layers className="size-4" />} label="Toplam istek" value={totalAll} hint={access.canApprove ? "Tüm ekleme / silme istekleri" : "Gönderdiğim istekler"} href="/envanter/onaylar" tone="info" />
        <StatWidget icon={<Clock className="size-4" />} label="Onay bekleyen" value={countOf("PENDING")} hint="Karar bekliyor" href="/envanter/onaylar?durum=PENDING" tone={countOf("PENDING") > 0 ? "warning" : "ok"} />
        <StatWidget icon={<CheckCircle2 className="size-4" />} label="Onaylanan" value={countOf("APPROVED")} hint="Uygulanmış işlemler" href="/envanter/onaylar?durum=APPROVED" tone="ok" bar={totalAll ? Math.round((countOf("APPROVED") / totalAll) * 100) : 0} />
        <StatWidget icon={<XCircle className="size-4" />} label="Reddedilen" value={countOf("REJECTED")} hint="Gerekçeyle geri çevrilen" href="/envanter/onaylar?durum=REJECTED" tone={countOf("REJECTED") > 0 ? "danger" : "default"} />
      </WidgetRow>

      <ListFilters
        searchPlaceholder="İsteyen, varlık veya gerekçe ara…"
        searchAriaLabel="Onay ara"
        selects={[
          {
            key: "durum",
            label: "Durum",
            allLabel: "Tüm durumlar",
            options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            key: "islem",
            label: "İşlem",
            allLabel: "Tüm işlemler",
            className: "w-40",
            options: Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
          },
        ]}
      />
      <p className="text-muted-foreground text-sm">{rows.length} kayıt listeleniyor</p>

      {rows.length ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">İşlem</th>
                  <th className="px-4 py-3 font-medium">Kayıt</th>
                  <th className="px-4 py-3 font-medium">İsteyen</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  {access.canApprove ? <th className="px-4 py-3 font-medium">Karar</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const typeLabel = row.assetType
                    ? ASSET_TYPE_DEFS[row.assetType as AssetTypeKey]?.label ?? row.assetType
                    : "Envanter";
                  const target = row.asset
                    ? assetDisplayName(row.asset)
                    : row.action === "CREATE"
                      ? `Yeni ${typeLabel}`
                      : typeLabel;
                  return (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{ACTION_LABELS[row.action as keyof typeof ACTION_LABELS] ?? row.action}</td>
                      <td className="px-4 py-3">
                        {row.assetId ? (
                          <Link href={`/envanter/${row.assetId}`} className="hover:underline">
                            {target}
                          </Link>
                        ) : (
                          target
                        )}
                      </td>
                      <td className="px-4 py-3">{row.requestedBy.fullName}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          value={row.status}
                          label={STATUS_LABELS[row.status as keyof typeof STATUS_LABELS] ?? row.status}
                        />
                        {row.reviewedBy ? (
                          <p className="text-muted-foreground mt-1 text-xs">{row.reviewedBy.fullName}</p>
                        ) : null}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">{formatDateTime(row.createdAt)}</td>
                      {access.canApprove ? (
                        <td className="px-4 py-3">
                          {row.status === "PENDING" ? <InventoryApprovalActions id={row.id} /> : row.reviewNote ?? "—"}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="Bekleyen onay yok"
          description={
            access.canApprove
              ? "Kullanıcılar ekleme veya silme istediğinde burada listelenir."
              : "Henüz bir ekleme veya silme isteğiniz yok."
          }
        />
      )}
    </div>
  );
}
