import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { AttachmentUploader } from "@/components/agile/attachment-uploader";
import { PriorityBadge, TypeBadge } from "@/components/agile/agile-bits";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addAgileComment, deleteAgileAttachment, deleteAgileComment, deleteAgileItem, moveAgileItemForm, setAgileItemEpic } from "@/lib/actions/agile";
import { getSession } from "@/lib/auth/session";
import { AGILE_SOURCE_HREF, AGILE_SOURCE_LABELS, AGILE_STATUSES, AGILE_STATUS_LABELS } from "@/lib/agile/constants";
import { formatDateTime } from "@/lib/inventory/format";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function AgileItemPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const item = await db.agileItem.findUnique({
    where: { id },
    include: {
      product: true,
      sprint: true,
      assignee: true,
      reporter: true,
      epic: { select: { id: true, itemNo: true, title: true } },
      parent: { select: { id: true, itemNo: true, title: true } },
      subtasks: { select: { id: true, itemNo: true, title: true, status: true, points: true }, orderBy: { rank: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
      children: { select: { id: true, itemNo: true, title: true, status: true, points: true }, orderBy: { rank: "asc" } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { fullName: true } } } },
    },
  });
  if (!item) notFound();
  const user = await getSession();
  const epics = item.type === "EPIC" ? [] : await db.agileItem.findMany({ where: { productId: item.productId, type: "EPIC" }, select: { id: true, itemNo: true, title: true }, orderBy: { itemNo: "asc" } });
  const childDone = item.children.filter((c) => c.status === "DONE").length;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={`${item.itemNo} — ${item.title}`}
        description={`${item.product.name}${item.sprint ? ` · ${item.sprint.name}` : " · Backlog"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/cevik/is/${item.id}/duzenle`}>
                <Pencil className="size-4" />
                Düzenle
              </Link>
            </Button>
            <form action={deleteAgileItem}>
              <input type="hidden" name="id" value={item.id} />
              <Button type="submit" variant="outline" className="text-destructive">
                <Trash2 className="size-4" />
                Sil
              </Button>
            </form>
            <Button asChild variant="ghost">
              <Link href={item.sprintId ? `/cevik/sprint/${item.sprintId}` : `/cevik/urun/${item.productId}`}>Geri</Link>
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge value={item.type} />
            <PriorityBadge value={item.priority} />
            <span className="text-sm font-medium">{AGILE_STATUS_LABELS[item.status]}</span>
            {item.blockedReason ? (
              <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-700 dark:text-red-300">Engelli: {item.blockedReason}</span>
            ) : null}
            {item.labels ? item.labels.split(",").map((l) => (
              <span key={l} className="bg-muted rounded-full px-2 py-0.5 text-xs">{l.trim()}</span>
            )) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AGILE_STATUSES.filter((s) => s !== item.status && (s !== "BACKLOG" || !item.sprintId)).map((s) => (
              <form key={s} action={moveAgileItemForm}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="status" value={s} />
                <Button type="submit" size="sm" variant="outline">
                  → {AGILE_STATUS_LABELS[s]}
                </Button>
              </form>
            ))}
          </div>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Sorumlu">{item.assignee?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Açan">{item.reporter?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Hikâye puanı">{item.points ?? "—"}</DetailRow>
            <DetailRow label="Sprint">
              {item.sprint ? (
                <Link href={`/cevik/sprint/${item.sprint.id}`} className="hover:underline">
                  {item.sprint.name}
                </Link>
              ) : (
                "Backlog"
              )}
            </DetailRow>
            <DetailRow label="Başladı">{item.startedAt ? formatDateTime(item.startedAt) : "—"}</DetailRow>
            <DetailRow label="Tamamlandı">{item.completedAt ? formatDateTime(item.completedAt) : "—"}</DetailRow>
            {item.sourceType ? (
              <DetailRow label="ITIL kaynağı">
                <Link href={`${AGILE_SOURCE_HREF[item.sourceType]}/${item.sourceId}`} className="hover:underline">
                  {AGILE_SOURCE_LABELS[item.sourceType]} {item.sourceNo}
                </Link>
              </DetailRow>
            ) : null}
          </dl>
          {item.parent ? (
            <p className="text-sm">
              Üst iş: <Link href={`/cevik/is/${item.parent.id}`} className="underline">{item.parent.itemNo} — {item.parent.title}</Link>
            </p>
          ) : null}
          {item.description ? <p className="text-sm whitespace-pre-line">{item.description}</p> : null}
          {item.acceptance ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Kabul ölçütleri</p>
              <p className="text-sm whitespace-pre-line">{item.acceptance}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {item.type !== "EPIC" && !item.parent ? (
        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Alt görevler ({item.subtasks.filter((c) => c.status === "DONE").length}/{item.subtasks.length} bitti)
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/cevik/is/yeni?urun=${item.productId}&ust=${item.id}&tur=TASK${item.sprintId ? `&sprint=${item.sprintId}` : ""}`}>Alt görev ekle</Link>
              </Button>
            </div>
            {item.subtasks.length ? (
              <ul className="divide-y">
                {item.subtasks.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                    <Link href={`/cevik/is/${c.id}`} className="hover:underline">
                      <span className="text-muted-foreground font-mono text-xs">{c.itemNo}</span> {c.title}
                    </Link>
                    <span className="text-muted-foreground text-xs">{AGILE_STATUS_LABELS[c.status]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Alt görev yok.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium">Dosya ekleri ({item.attachments.length})</p>
          {item.attachments.length ? (
            <ul className="divide-y">
              {item.attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <a href={a.url} target="_blank" rel="noreferrer" className="truncate underline">{a.name}</a>
                  <form action={deleteAgileAttachment}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="text-muted-foreground hover:text-destructive text-xs">Kaldır</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}
          <AttachmentUploader itemId={item.id} />
        </CardContent>
      </Card>

      {item.type === "EPIC" ? (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">
              Epiğe bağlı işler ({childDone}/{item.children.length} bitti)
            </p>
            {item.children.length ? (
              <ul className="divide-y">
                {item.children.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                    <Link href={`/cevik/is/${c.id}`} className="hover:underline">
                      <span className="text-muted-foreground font-mono text-xs">{c.itemNo}</span> {c.title}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {AGILE_STATUS_LABELS[c.status]}
                      {c.points != null ? ` · ${c.points} puan` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Henüz bağlı iş yok. Bir işin sayfasından bu epiği seçebilirsiniz.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">Epik</p>
            {item.epic ? (
              <p className="text-sm">
                <Link href={`/cevik/is/${item.epic.id}`} className="hover:underline">
                  {item.epic.itemNo} — {item.epic.title}
                </Link>
              </p>
            ) : null}
            {epics.length ? (
              <form action={setAgileItemEpic} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={item.id} />
                <select name="epicId" defaultValue={item.epicId ?? ""} aria-label="Epik" className="bg-background h-9 rounded-md border px-2 text-sm">
                  <option value="">Epik yok</option>
                  {epics.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.itemNo} — {e.title}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="outline">
                  Kaydet
                </Button>
              </form>
            ) : (
              <p className="text-muted-foreground text-sm">Bu üründe epik yok. Tür olarak "Epik" seçerek bir epik iş oluşturabilirsiniz.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">Yorumlar ({item.comments.length})</p>
          {item.comments.length ? (
            <ul className="space-y-3">
              {item.comments.map((c) => (
                <li key={c.id} className="bg-muted/30 rounded-md border p-3 text-sm">
                  <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                    <span>
                      {c.author?.fullName ?? "—"} · {formatDateTime(c.createdAt)}
                    </span>
                    {c.authorId === user?.id ? (
                      <form action={deleteAgileComment}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="hover:text-destructive" title="Yorumu sil">
                          Sil
                        </button>
                      </form>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-line">{c.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Henüz yorum yok.</p>
          )}
          <form action={addAgileComment} className="space-y-2">
            <input type="hidden" name="itemId" value={item.id} />
            <textarea name="body" required rows={3} maxLength={4000} placeholder="Yorum yazın…" aria-label="Yorum" className="bg-background w-full rounded-md border px-3 py-2 text-sm" />
            <Button type="submit" size="sm">
              Yorum ekle
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
