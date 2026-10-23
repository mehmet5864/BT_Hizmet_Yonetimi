import Link from "next/link";

import { AssetTypeIcon } from "@/components/asset-type-icon";
import { AssetVulnBadge, CriticalityBadge, LifecycleBadge, SupportEndCell } from "@/components/ui-bits";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASSET_TYPE_DEFS } from "@/lib/inventory/asset-types";
import type { AssetTypeKey } from "@/lib/inventory/constants";
import { assetDisplayName, brandModel, formatLocation } from "@/lib/inventory/format";
import { cn } from "@/lib/utils";

export type AssetRow = {
  id: string;
  assetType: string;
  name: string | null;
  stockNo: string | null;
  serialNo?: string | null;
  brand: string | null;
  model: string | null;
  ipAddress: string | null;
  criticality: string;
  status: string;
  supportEndDate: Date | null;
  locRoom: number | null;
  locCorridor: number | null;
  locCabinet: number | null;
  locShelf: number | null;
  owner: { id: string; fullName: string };
  department: { id: string; name: string } | null;
  vulnerabilities?: { id: string; severity: string; vulnNo: string }[];
};

export function AssetTable({ assets }: { assets: AssetRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="min-w-56">Envanter</TableHead>
              <TableHead className="min-w-28">Tür</TableHead>
              <TableHead className="min-w-32">Marka / Model</TableHead>
              <TableHead className="min-w-32">IP adresi</TableHead>
              <TableHead className="min-w-40">Sahibi / Birim</TableHead>
              <TableHead className="min-w-28">Konum</TableHead>
              <TableHead className="min-w-24">Kritiklik</TableHead>
              <TableHead className="min-w-36">Zafiyet</TableHead>
              <TableHead className="min-w-28">Durum</TableHead>
              <TableHead className="min-w-40">Bakım bitişi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => {
              const typeDef = ASSET_TYPE_DEFS[asset.assetType as AssetTypeKey];
              return (
                <TableRow key={asset.id} className="hover:bg-muted/40">
                  <TableCell>
                    <Link href={`/envanter/${asset.id}`} className="font-medium hover:underline">
                      {assetDisplayName(asset)}
                    </Link>
                    {asset.stockNo ? (
                      <p className="text-muted-foreground font-mono text-xs">{asset.stockNo}</p>
                    ) : null}
                    {asset.serialNo ? (
                      <p className="text-muted-foreground font-mono text-xs">S/N {asset.serialNo}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm">
                      <AssetTypeIcon
                        name={typeDef?.icon ?? "Package"}
                        className={cn("size-4", typeDef?.accent)}
                      />
                      {typeDef?.label ?? asset.assetType}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{brandModel(asset)}</TableCell>
                  <TableCell className="font-mono text-sm">{asset.ipAddress ?? "—"}</TableCell>
                  <TableCell>
                    <p className="text-sm">{asset.owner.fullName}</p>
                    <p className="text-muted-foreground text-xs">{asset.department?.name ?? "—"}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatLocation(asset) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <CriticalityBadge value={asset.criticality} />
                  </TableCell>
                  <TableCell>
                    <AssetVulnBadge vulnerabilities={asset.vulnerabilities} />
                  </TableCell>
                  <TableCell>
                    <LifecycleBadge value={asset.status} />
                  </TableCell>
                  <TableCell>
                    <SupportEndCell value={asset.supportEndDate} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
