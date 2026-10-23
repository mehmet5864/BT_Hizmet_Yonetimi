"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { tx } from "@/lib/i18n/form";

export function ImageInput({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const t = useT();
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? tx(t, "form.uploadFailed", "Yükleme başarısız."));
      setUrl(payload.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tx(t, "form.uploadFailed", "Yükleme başarısız."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <input type="hidden" name={name} value={url} />
      <div className="bg-muted/40 relative flex size-28 items-center justify-center overflow-hidden rounded-lg border border-dashed">
        {url ? (
          <Image src={url} alt={tx(t, "form.imageAlt", "Kayıt görseli")} fill sizes="112px" className="object-cover" />
        ) : (
          <ImagePlus className="text-muted-foreground size-6" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {url ? tx(t, "form.replaceFile", "Değiştir") : tx(t, "form.uploadImage", "Görsel yükle")}
          </Button>
          {url ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setUrl("")}>
              <X className="size-4" />
              {tx(t, "form.removeFile", "Kaldır")}
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">{tx(t, "form.imageHint", "PNG, JPEG, WEBP veya GIF · en fazla 5 MB")}</p>
      </div>
    </div>
  );
}
