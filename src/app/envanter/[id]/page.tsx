import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardSignature } from "lucide-react";

import { AssetActions } from "@/components/asset-actions";
import { AssetTypeIcon } from "@/components/asset-type-icon";
import { StatusBadge } from "@/components/itil/status-badge";
import {
  AssetVulnBadge,
  CriticalityBadge,
  DetailRow,
  LifecycleBadge,
  PageHeader,
  SupportEndCell,
} from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VULN_SEVERITY_LABELS, VULN_STATUS_LABELS } from "@/lib/itil/constants";
import { ASSET_TYPE_DEFS, getResolvedGroups } from "@/lib/inventory/asset-types";
import { RELATION_TYPE_LABELS, type AssetTypeKey, type RelationType } from "@/lib/inventory/constants";
import {
  assetDisplayName,
  describeLocation,
  formatDate,
  formatDateTime,
  formatLocation,
} from "@/lib/inventory/format";
import { parseActivityChanges } from "@/lib/safe-json";
import type { FieldDef } from "@/lib/inventory/fields";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { getInventoryAccess, viewerCanSeeAsset } from "@/lib/auth/inventory";
import { getAssetDetail } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Detail = NonNullable<Awaited<ReturnType<typeof getAssetDetail>>>;

function renderValue(field: FieldDef, asset: Detail) {
  const record = asset as unknown as Record<string, unknown>;

  switch (field.kind) {
    case "select": {
      const value = record[field.id];
      const option = field.options?.find((item) => item.value === value);
      if (field.id === "criticality") return <CriticalityBadge value={asset.criticality} />;
      if (field.id === "status") return <LifecycleBadge value={asset.status} />;
      return option ? option.label : <span className="text-muted-foreground">—</span>;
    }
    case "person":
      return (
        <Link href={`/envanter?q=${encodeURIComponent(asset.owner.fullName)}`} className="hover:underline">
          {asset.owner.fullName}
          {asset.owner.title ? (
            <span className="text-muted-foreground"> · {asset.owner.title}</span>
          ) : null}
        </Link>
      );
    case "department":
      return asset.department ? (
        <Link href={`/envanter?birim=${asset.department.id}`} className="hover:underline">
          {asset.department.name}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    case "vendor": {
      const vendor = field.id === "contractorVendor" ? asset.contractorVendor : asset.supportVendor;
      return vendor ? vendor.name : <span className="text-muted-foreground">—</span>;
    }
    case "date": {
      if (field.id === "supportEndDate") return <SupportEndCell value={asset.supportEndDate} />;
      return formatDate(record[field.id] as Date | null);
    }
    case "location": {
      const code = formatLocation(asset);
      if (!code) return <span className="text-muted-foreground">—</span>;
      return (
        <span>
          <span className="font-mono font-medium">{code}</span>
          <span className="text-muted-foreground"> · {describeLocation(asset)}</span>
        </span>
      );
    }
    case "image":
      return asset.imageUrl ? (
        <span className="text-muted-foreground">Kart görselinde gösteriliyor</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    case "serviceRefs": {
      if (!asset.catalogServices.length) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="flex flex-wrap gap-1.5">
          {asset.catalogServices.map((service) => (
            <Link key={service.id} href={`/katalog/${service.id}`}>
              <Badge variant="secondary" className="hover:bg-secondary/70">
                {service.serviceNo} · {service.name}
              </Badge>
            </Link>
          ))}
        </span>
      );
    }
    case "assetRefs": {
      const targets = asset.outgoingRelations.filter((relation) => relation.relationType === "HOSTED_ON");
      if (!targets.length) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="flex flex-wrap gap-1.5">
          {targets.map((relation) => (
            <Link key={relation.id} href={`/envanter/${relation.target.id}`}>
              <Badge variant="secondary" className="hover:bg-secondary/70">
                {relation.target.name ?? relation.target.id}
              </Badge>
            </Link>
          ))}
        </span>
      );
    }
    default: {
      const value = record[field.id];
      if (value === null || value === undefined || value === "")
        return <span className="text-muted-foreground">—</span>;
      const isMono = ["ipAddress", "macAddress", "stockNo", "serialNo", "deviceId"].includes(field.id);
      return <span className={cn(isMono && "font-mono")}>{String(value)}</span>;
    }
  }
}

export default async function AssetDetailPage({ params }: PageProps<"/envanter/[id]">) {
  const { id } = await params;
  const [asset, access] = await Promise.all([getAssetDetail(id), getInventoryAccess()]);
  if (!asset) notFound();
  if (!access || !viewerCanSeeAsset(access, asset)) {
    redirect("/yetkisiz");
  }

  const typeDef = ASSET_TYPE_DEFS[asset.assetType as AssetTypeKey];
  const groups = getResolvedGroups(asset.assetType as AssetTypeKey);
  const title = assetDisplayName(asset);
  const dependents = asset.incomingRelations;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href={`/envanter?tur=${typeDef.slug}`}>
          <ArrowLeft className="size-4" />
          {typeDef.plural}
        </Link>
      </Button>

      <PageHeader
        title={title}
        description={`${typeDef.label}${asset.stockNo ? ` · Stok no ${asset.stockNo}` : ""}${asset.custody === "FREE" ? " · Zimmet boş" : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {asset.custody === "FREE" ? null : (
              <Button variant="outline" asChild>
                <Link href={`/envanter/zimmet?personId=${asset.ownerId}&assetId=${asset.id}`}>
                  <ClipboardSignature className="size-4" />
                  Zimmet formu
                </Link>
              </Button>
            )}
            <AssetActions
              id={asset.id}
              name={title}
              status={asset.status}
              editHref={`/envanter/${asset.id}/duzenle`}
              canDelete={await viewerCanDelete()}
              canMutate={access.canEdit}
              canDirectDelete={access.canDirectMutate}
              canRequestDelete={access.canPropose && !access.canDirectMutate}
            />
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="bg-muted/40 relative size-24 shrink-0 overflow-hidden rounded-lg border">
            {asset.imageUrl ? (
              <Image src={asset.imageUrl} alt={title} fill sizes="96px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <AssetTypeIcon name={typeDef.icon} className={cn("size-8", typeDef.accent)} />
              </div>
            )}
          </div>
          <dl className="grid flex-1 grid-cols-2 gap-x-8 sm:grid-cols-4">
            <DetailRow label="Kritiklik">
              <CriticalityBadge value={asset.criticality} />
            </DetailRow>
            <DetailRow label="Durum">
              <LifecycleBadge value={asset.status} />
            </DetailRow>
            <DetailRow label="Sahibi">{asset.owner.fullName}</DetailRow>
            <DetailRow label="Konum">
              <span className="font-mono">{formatLocation(asset) ?? "—"}</span>
            </DetailRow>
            <DetailRow label="Zafiyet">
              <AssetVulnBadge vulnerabilities={asset.vulnerabilities.filter((row) => row.status === "OPEN")} />
            </DetailRow>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {groups.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="text-base">{group.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-x-8 sm:grid-cols-2">
                  {group.fields.map((field) => (
                    <DetailRow key={field.id} label={field.label}>
                      {renderValue(field, asset)}
                    </DetailRow>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zafiyetler</CardTitle>
              <CardDescription>
                Bu varlık üzerinde kayıtlı taramalar ve tespitler. Açık kayıtlar envanter listesinde de görünür.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {asset.vulnerabilities.length ? (
                <ul className="divide-y">
                  {asset.vulnerabilities.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <Link href={`/zafiyet/${row.id}`} className="font-mono text-xs font-medium hover:underline">
                          {row.vulnNo}
                        </Link>
                        <p className="truncate text-sm">{row.cve ?? row.description ?? row.deviceName ?? "Zafiyet"}</p>
                        <p className="text-muted-foreground text-xs">
                          {VULN_SEVERITY_LABELS[row.severity as keyof typeof VULN_SEVERITY_LABELS] ?? row.severity}
                          {row.source === "SCANNER" ? " · tarayıcı" : " · manuel"}
                        </p>
                      </div>
                      <StatusBadge
                        value={row.status}
                        label={VULN_STATUS_LABELS[row.status as keyof typeof VULN_STATUS_LABELS] ?? row.status}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">Bu varlık için kayıtlı zafiyet yok.</p>
              )}
            </CardContent>
          </Card>

          {dependents.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bu kayda bağlı varlıklar</CardTitle>
                <CardDescription>
                  Değişiklik ve yama planlamasında etkilenecek yapılandırma öğeleri.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {dependents.map((relation) => (
                  <Link
                    key={relation.id}
                    href={`/envanter/${relation.source.id}`}
                    className="hover:bg-muted/50 flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{relation.source.name ?? relation.source.id}</span>
                    <span className="text-muted-foreground text-xs">
                      {RELATION_TYPE_LABELS[relation.relationType as RelationType]}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Değişiklik geçmişi</CardTitle>
              <CardDescription>Bu kayıt üzerinde yapılan tüm işlemler.</CardDescription>
            </CardHeader>
            <CardContent>
              {asset.activities.length ? (
                <ol className="space-y-4">
                  {asset.activities.map((log) => {
                    const changes = parseActivityChanges(log.changes);
                    return (
                      <li key={log.id} className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium">{log.note ?? log.action}</span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                        {changes.length ? (
                          <ul className="text-muted-foreground space-y-0.5 text-xs">
                            {changes.slice(0, 6).map((change) => (
                              <li key={change.label}>
                                {change.label}: <span className="line-through">{change.from ?? "boş"}</span>{" "}
                                → <span className="text-foreground">{change.to ?? "boş"}</span>
                              </li>
                            ))}
                            {changes.length > 6 ? <li>ve {changes.length - 6} alan daha…</li> : null}
                          </ul>
                        ) : null}
                        <Separator />
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm">Henüz kayıtlı işlem yok.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
