"use client";

import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { tx } from "@/lib/i18n/form";

export function DocumentInput({
  urlName,
  fileNameName,
  defaultUrl,
  defaultFileName,
  openLabel,
}: {
  urlName: string;
  fileNameName: string;
  defaultUrl?: string | null;
  defaultFileName?: string | null;
  openLabel?: string;
}) {
  const t = useT();
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [fileName, setFileName] = useState(defaultFileName ?? "");
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
      setFileName(file.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tx(t, "form.uploadFailed", "Yükleme başarısız."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <input type="hidden" name={urlName} value={url} />
      <input type="hidden" name={fileNameName} value={fileName} />
      <div className="bg-muted/40 flex min-h-20 min-w-48 flex-1 items-center gap-3 rounded-lg border border-dashed px-3 py-2">
        <FileText className="text-muted-foreground size-5 shrink-0" />
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="truncate text-sm underline">
            {fileName || tx(t, "form.specOpen", openLabel ?? "Şartnameyi aç")}
          </a>
        ) : (
          <p className="text-muted-foreground text-sm">{tx(t, "form.documentEmpty", "PDF veya tarama yükleyin")}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
            {url ? tx(t, "form.replaceFile", "Değiştir") : tx(t, "form.uploadFile", "Dosya yükle")}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUrl("");
                setFileName("");
              }}
            >
              <X className="size-4" />
              {tx(t, "form.removeFile", "Kaldır")}
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">{tx(t, "form.documentHint", "PDF, PNG, JPEG · en fazla 15 MB")}</p>
      </div>
    </div>
  );
}
