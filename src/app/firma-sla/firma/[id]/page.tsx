import { notFound } from "next/navigation";

import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { VENDOR_CONTACT_KIND_LABELS, VENDOR_SPEC_KIND_LABELS, type VendorContactKind, type VendorSpecKind } from "@/lib/itil/constants";
import { licenseLabel, slaWindowLabel } from "@/lib/itil/vendor-sla";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { sortOrder: "asc" } },
      products: { orderBy: { name: "asc" } },
      slaLevels: { orderBy: { level: "asc" } },
      _count: { select: { slaTickets: true } },
    },
  });
  if (!vendor) notFound();
  const specUrl = vendor.specFileUrl ?? vendor.contractFileUrl;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={vendor.name}
        description={`${vendor.products.length} ürün · ${vendor._count.slaTickets} arıza kaydı`}
        actions={
          <DetailActions
            editHref={`/firma-sla/firma/${vendor.id}/duzenle`}
            canDelete={await viewerCanDelete()}
            kind="vendor"
            id={vendor.id}
            label={vendor.name}
          />
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">İletişim ve şartname</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Resmi support">{vendor.supportEmail ?? "—"}</DetailRow>
            <DetailRow label="Şartname türü">
              {vendor.specKind ? VENDOR_SPEC_KIND_LABELS[vendor.specKind as VendorSpecKind] ?? vendor.specKind : "—"}
            </DetailRow>
            <DetailRow label="Şartname">
              {specUrl ? (
                <a href={specUrl} className="underline" target="_blank" rel="noreferrer">
                  {vendor.specFileName || "Dosyayı aç"}
                </a>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Açıklama">{vendor.description ?? "—"}</DetailRow>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sorumlular</CardTitle>
        </CardHeader>
        <CardContent>
          {vendor.contacts.length ? (
            <ul className="divide-y text-sm">
              {vendor.contacts.map((row) => (
                <li key={row.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {row.name}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {VENDOR_CONTACT_KIND_LABELS[row.kind as VendorContactKind] ?? row.kind}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {row.email ?? "—"} · {row.phone ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Sorumlu yok.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ürünler</CardTitle>
        </CardHeader>
        <CardContent>
          {vendor.products.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide">
                    <th className="px-2 py-2 font-medium">Ürün</th>
                    <th className="px-2 py-2 font-medium">Lisans</th>
                    <th className="px-2 py-2 font-medium">Adet</th>
                    <th className="px-2 py-2 font-medium">Sürüm</th>
                  </tr>
                </thead>
                <tbody>
                  {vendor.products.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{row.name}</td>
                      <td className="px-2 py-2">{licenseLabel(row.licenseType)}</td>
                      <td className="px-2 py-2">{row.quantity}</td>
                      <td className="px-2 py-2">{row.version ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Ürün yok.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SLA seviyeleri</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {vendor.slaLevels.map((row) => (
            <div key={row.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{row.name}</p>
              <p className="text-muted-foreground text-xs">{slaWindowLabel(row.responseHours, row.resolveHours)}</p>
              {row.description ? <p className="mt-2 text-xs">{row.description}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
