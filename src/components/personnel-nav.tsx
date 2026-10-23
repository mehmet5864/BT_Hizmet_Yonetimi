"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function PersonnelNav({
  onNavigate,
  canManage,
}: {
  onNavigate?: () => void;
  canManage: boolean;
}) {
  const pathname = usePathname();
  const t = useT();
  const home = canManage ? "/personel" : "/personel/hareketler";
  const active = pathname.startsWith("/personel");

  return (
    <Link
      href={home}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
      )}
    >
      <Users className="size-4 shrink-0" />
      {t("nav.personnel")}
    </Link>
  );
}
