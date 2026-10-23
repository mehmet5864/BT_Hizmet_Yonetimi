"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckSquare, ChevronDown, ClipboardSignature, PackageSearch } from "lucide-react";
import { useState } from "react";

import { AssetTypeIcon } from "@/components/asset-type-icon";
import { useT } from "@/components/i18n-provider";
import { ASSET_TYPE_LIST } from "@/lib/inventory/asset-types";
import { cn } from "@/lib/utils";

function navLinkClass(active: boolean, extra?: string) {
  return cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
    active
      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
    extra,
  );
}

export function InventoryNav({
  onNavigate,
  showApprovals = false,
}: {
  onNavigate?: () => void;
  showApprovals?: boolean;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const t = useT();
  const onEnvanter = pathname.startsWith("/envanter");
  const tur = search.get("tur");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Link
          href="/envanter"
          onClick={onNavigate}
          className={navLinkClass(onEnvanter && !tur && pathname === "/envanter", "flex-1")}
        >
          <PackageSearch className="size-4 shrink-0" />
          {t("nav.inventory")}
        </Link>
        <button
          type="button"
          aria-label={open ? t("nav.collapse") : t("nav.expand")}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground me-1 rounded-md p-1"
        >
          <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90 rtl:rotate-90")} />
        </button>
      </div>

      {open ? (
        <div className="mt-0.5 ms-3 border-s ps-1">
          {ASSET_TYPE_LIST.map((type) => (
            <Link
              key={type.key}
              href={`/envanter?tur=${type.slug}`}
              onClick={onNavigate}
              className={navLinkClass(onEnvanter && tur === type.slug, "py-1.5 text-[13px]")}
            >
              <AssetTypeIcon name={type.icon} className={cn("size-4 shrink-0", type.accent)} />
              {t(`assets.${type.key}.label`)}
            </Link>
          ))}
          <Link
            href="/envanter/zimmet"
            onClick={onNavigate}
            className={navLinkClass(pathname.startsWith("/envanter/zimmet"), "py-1.5 text-[13px]")}
          >
            <ClipboardSignature className="size-4 shrink-0" />
            {t("nav.custody")}
          </Link>
          {showApprovals ? (
            <Link
              href="/envanter/onaylar"
              onClick={onNavigate}
              className={navLinkClass(pathname.startsWith("/envanter/onaylar"), "py-1.5 text-[13px]")}
            >
              <CheckSquare className="size-4 shrink-0" />
              {t("nav.approvals")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
