"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Download, Eraser, Eye, FileDown, FileSpreadsheet, FileText, Loader2, SlidersHorizontal } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldTooltip } from "@/lib/forms/field-tooltip";
import type { ReportDef, ReportFilterOption } from "@/lib/reports/types";
import { cn } from "@/lib/utils";

export type ReportCatalogOptions = {
  departments: ReportFilterOption[];
  vendors: ReportFilterOption[];
};

type Preview = {
  title: string;
  description: string;
  generatedAt: string;
  total: number;
  columns: { key: string; label: string }[];
  columnTotal: number;
  rows: Record<string, string>[];
  summary?: { label: string; value: string }[];
  notes?: string[];
};

const EMPTY: Record<string, string> = {};

function hrefFor(id: string, format: "csv" | "pdf" | "docx" | "json", values: Record<string, string>) {
  const params = new URLSearchParams({ format });
  for (const [key, value] of Object.entries(values)) {
    if (value && value !== "ALL") params.set(key, value);
  }
  return `/api/raporlar/${id}?${params.toString()}`;
}

/** Sayfa küçük resmi: A4 kâğıdı gibi çerçevelenmiş, ilk satırlar. */
function PaperThumb({ preview }: { preview: Preview }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="bg-card overflow-hidden rounded-lg border shadow-md">
        <div className="bg-primary/90 h-1.5" />
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-primary text-sm font-semibold">{preview.title}</p>
            <p className="text-muted-foreground text-[10px]">
              {preview.generatedAt} · {preview.total} satır
            </p>
          </div>
          {preview.summary?.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {preview.summary.map((item) => (
                <div key={item.label} className="rounded-md border border-teal-200 bg-teal-50/60 px-2 py-1.5 dark:border-teal-900 dark:bg-teal-950/30">
                  <p className="text-muted-foreground text-[9px]">{item.label}</p>
                  <p className="text-primary text-sm font-semibold tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}
          {preview.rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[10px] leading-tight">
                <thead>
                  <tr>
                    {preview.columns.map((c) => (
                      <th key={c.key} className="bg-muted/70 border-b px-2 py-1 text-left font-semibold whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className={i % 2 ? "bg-muted/30" : undefined}>
                      {preview.columns.map((c) => (
                        <td key={c.key} className="max-w-40 truncate border-b border-dashed px-2 py-1">
                          {row[c.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground py-6 text-center text-xs">Bu filtrelerle kayıt bulunamadı.</p>
          )}
          {preview.notes?.map((note) => (
            <p key={note} className="text-muted-foreground text-[10px] italic">Not: {note}</p>
          ))}
          {preview.total > preview.rows.length || preview.columnTotal > preview.columns.length ? (
            <p className="text-muted-foreground text-center text-[10px]">
              … ilk {preview.rows.length} satır ve {preview.columns.length}/{preview.columnTotal} sütun gösteriliyor
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ReportCard({ report, catalog }: { report: ReportDef; catalog: ReportCatalogOptions }) {
  const [values, setValues] = useState<Record<string, string>>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filters = report.filters ?? [];
  const active = useMemo(() => Object.values(values).filter((value) => value && value !== "ALL").length, [values]);

  async function loadPreview(next = values) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(hrefFor(report.id, "json", next), { cache: "no-store" });
      if (!res.ok) throw new Error();
      setPreview((await res.json()) as Preview);
    } catch {
      setError("Önizleme alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  function setValue(key: string, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (preview) void loadPreview(next);
  }

  return (
    <div className="bg-card rounded-xl border transition-shadow hover:shadow-sm">
      <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          <FileText className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{report.title}</p>
          <p className="text-muted-foreground line-clamp-1 text-xs">{report.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.length ? (
            <Button type="button" size="sm" variant={showFilters || active ? "secondary" : "ghost"} onClick={() => setShowFilters((v) => !v)}>
              <SlidersHorizontal className="size-4" />
              Filtre{active ? ` (${active})` : ""}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={() => (preview ? setPreview(null) : void loadPreview())} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
            {preview ? "Önizlemeyi kapat" : "Önizle"}
          </Button>
          <details className="relative">
            <summary className="border-input hover:bg-accent inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border px-3 text-sm [&::-webkit-details-marker]:hidden">
              <Download className="size-4" />
              İndir
              <ChevronDown className="size-3.5" />
            </summary>
            <div className="bg-popover absolute end-0 z-20 mt-1 flex w-36 flex-col rounded-lg border p-1 shadow-lg">
              <a className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm" href={hrefFor(report.id, "pdf", values)}>
                <FileDown className="size-4" /> PDF
              </a>
              <a className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm" href={hrefFor(report.id, "docx", values)}>
                <FileText className="size-4" /> Word
              </a>
              <a className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm" href={hrefFor(report.id, "csv", values)}>
                <FileSpreadsheet className="size-4" /> CSV
              </a>
            </div>
          </details>
        </div>
      </div>

      {showFilters && filters.length ? (
        <div className="bg-muted/30 space-y-3 border-t p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filters.map((field) => {
              const options =
                field.optionSource === "departments" ? catalog.departments : field.optionSource === "vendors" ? catalog.vendors : (field.options ?? []);
              return (
                <FieldShell
                  key={field.key}
                  id={`${report.id}-${field.key}`}
                  label={field.label}
                  tooltip={fieldTooltip({ key: field.key, label: field.label, kind: field.kind, placeholder: field.placeholder })}
                >
                  {field.kind === "select" ? (
                    <select
                      id={`${report.id}-${field.key}`}
                      value={values[field.key] ?? "ALL"}
                      onChange={(event) => setValue(field.key, event.target.value)}
                      className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                    >
                      <option value="ALL">Tümü</option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={`${report.id}-${field.key}`}
                      type={field.kind === "date" ? "date" : "text"}
                      placeholder={field.placeholder}
                      value={values[field.key] ?? ""}
                      onChange={(event) => setValue(field.key, event.target.value)}
                    />
                  )}
                </FieldShell>
              );
            })}
          </div>
          {active ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setValues(EMPTY);
                if (preview) void loadPreview(EMPTY);
              }}
            >
              <Eraser className="size-4" />
              Filtreleri temizle
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-destructive border-t px-4 py-2 text-xs">{error}</p> : null}
      {preview ? (
        <div className={cn("bg-muted/40 border-t p-3 sm:p-5", loading && "opacity-60")}>
          <PaperThumb preview={preview} />
        </div>
      ) : null}
    </div>
  );
}
