"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTopologyReference, deleteTopologyReference } from "@/lib/actions/topology-extra";

export type ReferenceRow = { id: string; title: string; url: string; kind: string; note: string | null; uploadedBy: string | null; createdAt: string };

export function ReferencePanel({ rows }: { rows: ReferenceRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState<string | null>(rows[0]?.id ?? null);

  function upload() {
    if (!file) {
      setMessage("Önce bir resim veya PDF seçin.");
      return;
    }
    start(async () => {
      setMessage("Yükleniyor…");
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setMessage(data.error ?? "Yüklenemedi.");
          return;
        }
        const r = await addTopologyReference(title, data.url, file.name, note);
        setMessage(r.ok ? "Kaydedildi." : (r.message ?? "Kaydedilemedi."));
        if (r.ok) {
          setFile(null);
          setTitle("");
          setNote("");
          router.refresh();
        }
      } catch {
        setMessage("Yüklenemedi.");
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      const r = await deleteTopologyReference(id);
      setMessage(r.ok ? "Silindi." : (r.message ?? "Silinemedi."));
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-semibold">Genel topoloji (referans)</h2>
        <p className="text-muted-foreground text-xs">Kurumun genel ağ / sistem topolojisini resim veya PDF olarak yükleyin (en çok 15 MB). Burada saklanır ve herkes görebilir.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık (örn. Genel ağ şeması 2026)" maxLength={120} />
        <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="button" onClick={upload} disabled={pending}>
          Yükle
        </Button>
      </div>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (isteğe bağlı)" maxLength={500} />
      {message ? <p className="text-muted-foreground text-xs">{message}</p> : null}
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-md border p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" className="text-left text-sm font-medium underline-offset-2 hover:underline" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  {r.title} <span className="text-muted-foreground text-xs">({r.kind === "PDF" ? "PDF" : "Resim"}{r.uploadedBy ? ` · ${r.uploadedBy}` : ""})</span>
                </button>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={r.url} target="_blank" rel="noreferrer">
                      Aç
                    </a>
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => remove(r.id)}>
                    Sil
                  </Button>
                </div>
              </div>
              {r.note ? <p className="text-muted-foreground mt-1 text-xs">{r.note}</p> : null}
              {open === r.id ? (
                r.kind === "PDF" ? (
                  <iframe src={r.url} title={r.title} className="mt-2 h-[520px] w-full rounded border" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.url} alt={r.title} className="mt-2 max-h-[600px] w-full rounded border bg-white object-contain" />
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">Henüz referans yüklenmedi.</p>
      )}
    </section>
  );
}
