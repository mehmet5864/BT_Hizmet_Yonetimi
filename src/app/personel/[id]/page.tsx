import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardSignature } from "lucide-react";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { PERSONNEL_ROLE_LABELS, type PersonnelRole } from "@/lib/itil/constants";
import { officeLabel } from "@/lib/itil/office-names";
import { PersonWorkloadCard } from "@/components/personel/person-workload";
import { getPersonWorkload } from "@/lib/person-workload";
import { PersonPerformance } from "@/components/personel/person-performance";
import { emptyStat, getPersonStats } from "@/lib/person-stats";
import { getOfficeNames } from "@/lib/settings-store";
import { getScopedDb } from "@/lib/auth/data-scope";
import { canHandleModule } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const [person, officeNames] = await Promise.all([
    db.person.findUnique({
      where: { id },
      include: {
        department: true,
        parentDepartment: true,
        unitManager: true,
        parentManager: true,
        assets: { take: 8, orderBy: { updatedAt: "desc" } },
        _count: { select: { assets: true } },
      },
    }),
    getOfficeNames(),
  ]);
  if (!person) notFound();
  const stat = (await getPersonStats([person.id])).get(person.id) ?? emptyStat();
  const workload = await getPersonWorkload(person.id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={person.fullName}
        description={person.title ?? person.duty ?? "Personel kaydı"}
        actions={
          <div className="flex flex-wrap gap-2">
            {person._count.assets ? (
              <Button variant="outline" asChild>
                <Link href={`/envanter/zimmet?personId=${person.id}`}>
                  <ClipboardSignature className="size-4" />
                  Zimmet formu
                </Link>
              </Button>
            ) : null}
            <DetailActions
              editHref={(await canHandleModule("/personel")) ? `/personel/${person.id}/duzenle` : undefined}
              canDelete={await viewerCanDelete()}
              kind="person"
              id={person.id}
              label={person.fullName}
            />
          </div>
        }
      />
      <Card>
        <CardContent className="flex flex-wrap gap-6">
          <div className="bg-muted relative size-24 overflow-hidden rounded-lg border">
            {person.photoUrl ? (
              <Image src={person.photoUrl} alt={person.fullName} fill className="object-cover" />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-xs">Fotoğraf yok</div>
            )}
          </div>
          <dl className="grid flex-1 gap-x-8 sm:grid-cols-2">
            <DetailRow label="TC kimlik no">{person.tcNo ?? "—"}</DetailRow>
            <DetailRow label="Sicil no">{person.sicilNo ?? "—"}</DetailRow>
            <DetailRow label="Telefon">{person.phone ?? "—"}</DetailRow>
            <DetailRow label="E-posta">{person.email ?? "—"}</DetailRow>
            <DetailRow label="Görevi">{person.duty ?? "—"}</DetailRow>
            <DetailRow label="Görev yeri">{person.workplace ?? "—"}</DetailRow>
            <DetailRow label="Birim">{person.department?.name ?? "—"}</DetailRow>
            <DetailRow label="Birim amiri">{person.unitManager?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Üst birim">{person.parentDepartment?.name ?? "—"}</DetailRow>
            <DetailRow label="Üst birim amiri">{person.parentManager?.fullName ?? "—"}</DetailRow>
            <DetailRow label="AD kullanıcı adı">{person.adUsername ?? "—"}</DetailRow>
            <DetailRow label="Yetki kaynağı">{person.roleSource === "AD" ? "Active Directory" : person.roleSource === "BOTH" ? "AD + manuel" : "Manuel"}</DetailRow>
            <DetailRow label="Manuel rol">
              <Badge variant="secondary">{PERSONNEL_ROLE_LABELS[person.role as PersonnelRole] ?? person.role}</Badge>
            </DetailRow>
            <DetailRow label="Talep ofisi">
              {person.requestOffice ? officeLabel(person.requestOffice, officeNames) : "—"}
            </DetailRow>
            <DetailRow label="AD grupları">{person.adGroups ?? "—"}</DetailRow>
          </dl>
        </CardContent>
      </Card>
      <PersonWorkloadCard data={workload} reportPersonId={person.id} />
      <PersonPerformance stat={stat} />
      {person.assets.length ? (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">Zimmetli envanter</p>
            {person.assets.map((asset) => (
              <Link key={asset.id} href={`/envanter/${asset.id}`} className="hover:bg-muted/50 block rounded-md border px-3 py-2 text-sm">
                {asset.name ?? asset.stockNo ?? asset.id}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
