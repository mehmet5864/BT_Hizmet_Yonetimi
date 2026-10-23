"use client";

import { Box } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#276dd9] text-white shadow-sm">
        <Box className="size-5" />
      </div>
      {compact ? null : (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-white">{t("appShort")}</p>
          <p className="text-sidebar-foreground/55 text-[11px]">{t("tagline")}</p>
        </div>
      )}
    </div>
  );
}
