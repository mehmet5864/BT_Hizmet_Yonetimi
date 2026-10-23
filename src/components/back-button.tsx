"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

const MODULE_HOME: { prefix: string; href: string }[] = [
  { prefix: "/envanter", href: "/envanter" },
  { prefix: "/personel/hareketler", href: "/personel" },
  { prefix: "/personel", href: "/personel" },
  { prefix: "/talepler", href: "/talepler" },
  { prefix: "/degisiklik", href: "/degisiklik" },
  { prefix: "/yama", href: "/yama" },
  { prefix: "/konfigurasyon", href: "/konfigurasyon" },
  { prefix: "/zafiyet", href: "/zafiyet" },
  { prefix: "/firma-sla", href: "/firma-sla" },
  { prefix: "/olay", href: "/olay" },
  { prefix: "/problem", href: "/problem" },
  { prefix: "/raporlar", href: "/raporlar" },
  { prefix: "/ayarlar", href: "/ayarlar" },
];

function fallbackHref(pathname: string) {
  const match = MODULE_HOME.find((item) => pathname.startsWith(item.prefix) && pathname !== item.href);
  return match?.href ?? "/";
}

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  if (!pathname || pathname === "/" || pathname === "/giris") return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground -ms-1 shrink-0"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref(pathname));
      }}
      aria-label={t("header.back")}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      <span className="hidden sm:inline">{t("header.back")}</span>
    </Button>
  );
}
