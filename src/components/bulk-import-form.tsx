"use client";

import { useActionState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/lib/action-feedback";
import { importInventoryExcel, type BulkImportState } from "@/lib/actions/bulk-import";

const EMPTY: BulkImportState = { ok: false };

export function BulkImportForm() {
  const [state, action, pending] = useActionState(importInventoryExcel, EMPTY);
  useActionFeedback(state);

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FieldShell
          id="bulk-file"
          label="Doldurulmuş Excel"
          required
          className="flex-1"
          tooltip="İndirilen şablonu doldurup yükleyin. İlk satır başlık olmalıdır. Stok numarası benzersiz olmalı."
        >
          <input
            id="bulk-file"
            type="file"
            name="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="border-input bg-background file:bg-muted hover:file:bg-muted/80 h-10 w-full rounded-md border px-3 text-sm file:mr-3 file:h-full file:border-0 file:px-3 file:text-sm file:font-medium"
          />
        </FieldShell>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Toplu yükle
        </Button>
      </div>

      {state.created != null && state.ok ? (
        <Alert>
          <FileSpreadsheet className="size-4" />
          <AlertTitle>Yükleme tamamlandı</AlertTitle>
          <AlertDescription>{state.created} kayıt eklendi.</AlertDescription>
        </Alert>
      ) : null}

      {state.rowErrors?.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Satır</th>
                <th className="px-3 py-2">Hata</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.rowErrors.map((error) => (
                <tr key={`${error.row}-${error.message}`}>
                  <td className="px-3 py-2 font-mono text-xs">{error.row}</td>
                  <td className="px-3 py-2">{error.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </form>
  );
}
