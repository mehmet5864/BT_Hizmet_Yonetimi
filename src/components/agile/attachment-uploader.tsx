"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { addAgileAttachment } from "@/lib/actions/agile";

/** Dosyayı /api/uploads'a yükler (PDF/PNG/JPEG/WEBP/GIF, 15 MB), sonra işe bağlar. */
export function AttachmentUploader({ itemId }: { itemId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function upload() {
    const file = input.current?.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Yükleme başarısız.");
        return;
      }
      const form = new FormData();
      form.set("itemId", itemId);
      form.set("url", json.url);
      form.set("name", file.name);
      const result = await addAgileAttachment(form);
      if (!result.ok) {
        setError(result.message ?? "Eklenemedi.");
        return;
      }
      if (input.current) input.current.value = "";
      startTransition(() => router.refresh());
    } catch {
      setError("Yükleme sırasında hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" className="text-sm" aria-label="Dosya seç" />
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={upload}>
          {busy ? "Yükleniyor…" : "Dosya ekle"}
        </Button>
      </div>
      {error ? <p role="alert" className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
