"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/** Topoloji sayfası: hizmet topolojisi ve genel topoloji arasında seçim. */
export function TopologyViews({ hasService, service, general }: { hasService: boolean; service: ReactNode; general: ReactNode }) {
  const [tab, setTab] = useState<"hizmet" | "genel">(hasService ? "hizmet" : "genel");
  return (
    <div className="space-y-3">
      <div className="flex gap-2" role="tablist">
        <Button type="button" size="sm" variant={tab === "hizmet" ? "default" : "outline"} role="tab" aria-selected={tab === "hizmet"} onClick={() => setTab("hizmet")}>
          Hizmet topolojisi
        </Button>
        <Button type="button" size="sm" variant={tab === "genel" ? "default" : "outline"} role="tab" aria-selected={tab === "genel"} onClick={() => setTab("genel")}>
          Genel topoloji
        </Button>
      </div>
      <div hidden={tab !== "hizmet"}>{service}</div>
      <div hidden={tab !== "genel"}>{general}</div>
    </div>
  );
}
