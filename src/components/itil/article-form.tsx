import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveArticle } from "@/lib/actions/knowledge";

export type ArticleValues = {
  id?: string;
  title?: string;
  category?: string | null;
  tags?: string | null;
  body?: string;
  status?: string;
};

export function ArticleForm({
  values = {},
  hidden = {},
  cancelHref,
  error,
}: {
  values?: ArticleValues;
  hidden?: Record<string, string>;
  cancelHref: string;
  error?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        {error ? <p className="text-destructive mb-4 rounded-md border border-destructive/30 px-3 py-2 text-sm">{error}</p> : null}
        <form action={saveArticle} className="flex flex-col gap-4">
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label className="flex flex-col gap-1 text-sm">
            Başlık
            <Input name="title" required maxLength={200} defaultValue={values.title ?? ""} />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Kategori
              <Input name="category" maxLength={80} defaultValue={values.category ?? ""} placeholder="Ağ, Sunucu, Güvenlik…" />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-1">
              Etiketler
              <Input name="tags" maxLength={200} defaultValue={values.tags ?? ""} placeholder="vpn, parola, yedek" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Durum
              <select
                name="status"
                defaultValue={values.status ?? "DRAFT"}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="DRAFT">Taslak (yalnızca personel görür)</option>
                <option value="PUBLISHED">Yayında (herkes görür)</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            İçerik
            <Textarea name="body" required rows={14} defaultValue={values.body ?? ""} placeholder="Belirti, neden, çözüm adımları…" />
          </label>
          <div className="flex gap-2">
            <Button type="submit">Kaydet</Button>
            <Button asChild variant="outline">
              <Link href={cancelHref}>Vazgeç</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
