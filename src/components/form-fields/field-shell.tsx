"use client";

import { CircleHelp } from "lucide-react";

import { useT } from "@/components/i18n-provider";

import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function FieldShell({
  id,
  label,
  required,
  hint,
  tooltip,
  error,
  className,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  hint?: string;
  tooltip?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const help = (tooltip ?? hint)?.trim();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex min-h-6 items-center gap-1.5">
        <Label htmlFor={id} className="text-sm">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        {help ? (
          <Tooltip>
            <TooltipTrigger
              type="button"
              className="text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-full"
              aria-label={t("form.aboutField", { label })}
            >
              <CircleHelp className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
              {help}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
