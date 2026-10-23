import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteAgileMeeting } from "@/lib/actions/agile";
import { AGILE_MEETING_KIND_LABELS } from "@/lib/agile/constants";
import { formatDate } from "@/lib/inventory/format";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const m = await db.agileMeeting.findUnique({
    where: { id },
    include: { product: true, sprint: true, createdBy: { select: { fullName: true } } },
  });
  if (!m) notFound();
  const back = m.sprintId ? `/cevik/sprint/${m.sprintId}` : `/cevik/urun/${m.productId}`;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={m.title}
        description={`${m.product.name}${m.sprint ? ` · ${m.sprint.name}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/cevik/toplanti/${m.id}/duzenle`}>
                <Pencil className="size-4" />
                Düzenle
              </Link>
            </Button>
            <form action={deleteAgileMeeting}>
              <input type="hidden" name="id" value={m.id} />
              <Button type="submit" variant="outline" className="text-destructive">
                <Trash2 className="size-4" />
                Sil
              </Button>
            </form>
            <Button asChild variant="ghost">
              <Link href={back}>Geri</Link>
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="space-y-4">
          <Badge variant="secondary">{AGILE_MEETING_KIND_LABELS[m.kind] ?? m.kind}</Badge>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Tarih">{formatDate(m.meetingDate)}</DetailRow>
            <DetailRow label="Kaydeden">{m.createdBy?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Katılımcılar">{m.attendees ?? "—"}</DetailRow>
          </dl>
          <div>
            <p className="text-sm font-medium">Notlar</p>
            <p className="text-sm whitespace-pre-line">{m.notes ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Kararlar / aksiyonlar</p>
            <p className="text-sm whitespace-pre-line">{m.decisions ?? "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
