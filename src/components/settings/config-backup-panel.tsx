"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Download, Loader2, Upload } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exportSystemConfig, importSystemConfig } from "@/lib/actions/settings";
import { EMPTY_STATE, type ActionState } from "@/lib/actions/shared";
import { toast } from "sonner";

function downloadJson(filename: string, payload: string) {
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ConfigBackupPanel() {
  const [exporting, startExport] = useTransition();
  const [exportState, setExportState] = useState<ActionState>(EMPTY_STATE);
  const [importState, importAction, importPending] = useActionState(importSystemConfig, EMPTY_STATE);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!exportState.message) return;
    if (exportState.ok) toast.success(exportState.message);
    else toast.error(exportState.message);
  }, [exportState.message, exportState.ok, exportState.stamp]);

  useEffect(() => {
    if (!importState.message) return;
    if (importState.ok) {
      toast.success(importState.message);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } else toast.error(importState.message);
  }, [importState.message, importState.ok, importState.stamp]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export config</CardTitle>
          <CardDescription>
            Süreç yöneticileri, Active Directory, SIEM, zafiyet tarama, onaylar, SMTP, yetkiler ve temayı JSON
            olarak indirir. Dosyada parolalar da vardır; güvenli saklayın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exportState.message ? (
            <Alert variant={exportState.ok ? "default" : "destructive"}>
              <AlertDescription>{exportState.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="button"
            disabled={exporting}
            onClick={() =>
              startExport(async () => {
                const result = await exportSystemConfig();
                setExportState(result);
                if (result.ok && result.payload && result.filename) {
                  downloadJson(result.filename, result.payload);
                }
              })
            }
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export config
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import config</CardTitle>
          <CardDescription>
            Daha önce alınan yedeği yükler. Envanter ve talepler değişmez; yalnızca Ayarlar yazılır. İçe aktarmadan
            önce mevcut ayarlar `yedek/config` altına kopyalanır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={importAction} className="space-y-4">
            {importState.message ? (
              <Alert variant={importState.ok ? "default" : "destructive"}>
                <AlertDescription>{importState.message}</AlertDescription>
              </Alert>
            ) : null}
            <label className="border-input flex cursor-pointer flex-col gap-2 rounded-lg border border-dashed px-4 py-6 text-sm">
              <input
                ref={fileRef}
                type="file"
                name="file"
                accept="application/json,.json"
                required
                className="sr-only"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
              />
              <span className="font-medium">{fileName || "JSON yedek seçin"}</span>
              <span className="text-muted-foreground text-xs">
                {fileName ? "Değiştirmek için tekrar tıklayın." : "bt-ayarlar-….json"}
              </span>
            </label>
            <div className="flex justify-end">
              <Button type="submit" variant="outline" disabled={importPending || !fileName}>
                {importPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Import config
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
