"use client";

import { useState } from "react";

import { useT } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { formatLocation } from "@/lib/inventory/format";

type LocationValue = {
  locRoom?: number | null;
  locCorridor?: number | null;
  locCabinet?: number | null;
  locShelf?: number | null;
};

const PARTS = [
  { key: "locRoom", i18n: "form.locRoom", suffix: "O" },
  { key: "locCorridor", i18n: "form.locCorridor", suffix: "K" },
  { key: "locCabinet", i18n: "form.locCabinet", suffix: "Ka" },
  { key: "locShelf", i18n: "form.locShelf", suffix: "" },
] as const;

export function LocationInput({ defaultValue }: { defaultValue?: LocationValue }) {
  const t = useT();
  const [value, setValue] = useState<Record<string, string>>({
    locRoom: defaultValue?.locRoom?.toString() ?? "",
    locCorridor: defaultValue?.locCorridor?.toString() ?? "",
    locCabinet: defaultValue?.locCabinet?.toString() ?? "",
    locShelf: defaultValue?.locShelf?.toString() ?? "",
  });

  const preview = formatLocation({
    locRoom: value.locRoom ? Number(value.locRoom) : null,
    locCorridor: value.locCorridor ? Number(value.locCorridor) : null,
    locCabinet: value.locCabinet ? Number(value.locCabinet) : null,
    locShelf: value.locShelf ? Number(value.locShelf) : null,
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PARTS.map((part) => (
          <div key={part.key} className="flex flex-col gap-1">
            <Input
              id={part.key}
              name={part.key}
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={t(part.i18n)}
              value={value[part.key]}
              onChange={(event) =>
                setValue((prev) => ({ ...prev, [part.key]: event.target.value }))
              }
            />
            <span className="text-muted-foreground text-[11px]">{t(part.i18n)}</span>
          </div>
        ))}
      </div>
      <div className="bg-muted/50 text-muted-foreground rounded-md border px-3 py-2 text-xs">
        {t("form.locationCode")}:{" "}
        <span className="text-foreground font-mono font-medium">{preview ?? "—"}</span>
      </div>
    </div>
  );
}
